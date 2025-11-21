const express = require('express');
const router = express.Router();

const {
    sendMessage,
    sendTextMessage,
    sendReplyButtons,
    sendMultiProductMessage,
    sendOrderConfirmationTemplate
} = require('../services/whatsapp');

const {
    getOrCreateUser,
    updateUserState,
    updateUserData,
    addToCart,
    getCart,
    clearCart,
    createOrder,
    getOrder
} = require('../db/firestore');

// --- IMPORT WIT SERVICE ---
const { detectIntent } = require('../services/wit');

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// (GET handler)
router.get('/', (req, res) => {
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];
    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// (POST handler)
router.post('/', async (req, res) => {
    let body = req.body;

    if (body.object === 'whatsapp_business_account' && body.entry) {
        body.entry.forEach((entry) => {
            entry.changes.forEach(async (change) => {
                if (change.field === 'messages' && change.value.messages) {
                    const msg = change.value.messages[0];
                    const from = msg.from;

                    const user = await getOrCreateUser(from);
                    const userState = user.state;

                    if (msg.type === 'text') {
                        const textBody = msg.text.body;
                        const lowerText = textBody.toLowerCase();
                        console.log(`Message from ${from} (state: ${userState}): ${textBody}`);

                        // 1. Admin Command
                        if (textBody.startsWith('!resume')) {
                            await updateUserState(from, 'default');
                            await sendTextMessage(from, "Bot is now active. Type 'Menu'.");
                            res.sendStatus(200); return;
                        }

                        // 2. Check States (Checkout, Tracking, Agent)
                        if (userState === 'awaiting_name') {
                            await updateUserData(from, { name: textBody });
                            await updateUserState(from, 'awaiting_address');
                            await sendTextMessage(from, `Thanks, ${textBody}. What is your delivery address?`);

                        } else if (userState === 'awaiting_address') {
                            const userName = user.name;
                            const userAddress = textBody;
                            const cart = await getCart(from);
                            const newOrderId = await createOrder(from, userName, userAddress, cart);

                            let cartSummary = '';
                            cart.forEach(item => { cartSummary += `${item.quantity} x ${item.sku}\n`; });
                            cartSummary = cartSummary.trim();

                            let textConfirmation = `*Order Placed!* 🎉\n\nYour Order ID: *${newOrderId}*\n(Save this to track your order)\n\nItems:\n${cartSummary}\n\nShipping to:\n${userAddress}`;
                            await sendTextMessage(from, textConfirmation);
                            await sendOrderConfirmationTemplate(from, userName, cartSummary, userAddress);
                            await clearCart(from);
                            await updateUserData(from, { address: userAddress });
                            await updateUserState(from, 'default');

                        } else if (userState === 'awaiting_order_id') {
                            if (lowerText === 'menu' || lowerText === 'hi' || lowerText === 'cancel') {
                                await updateUserState(from, 'default');
                                await sendMainMenu(from);
                                return;
                            }
                            const orderId = textBody.trim();
                            const order = await getOrder(orderId);

                            if (order) {
                                const trackMsg = `📦 *Order Status: ${order.status}*\n\nOrder ID: ${order.order_id}\nItems: ${order.items.length} item(s)\nShipping to: ${order.shipping_address}`;
                                await sendTextMessage(from, trackMsg);
                                await updateUserState(from, 'default');
                                setTimeout(() => sendMainMenu(from), 1000);
                            } else {
                                await sendTextMessage(from, `❌ We couldn't find order *${orderId}*.\n\nPlease check the ID and try again, or type 'Menu' to exit.`);
                            }

                        } else if (userState === 'awaiting_agent') {
                            console.log('User is waiting for agent...');

                        } else {
                            // --- 3. DEFAULT STATE HANDLER (UPDATED WITH NLP) ---

                            // A. Check exact keywords first (for speed)
                            if (lowerText === 'hi' || lowerText === 'hello' || lowerText === 'menu') {
                                await sendMainMenu(from);
                            }
                            else {
                                // B. Use Wit.ai NLP
                                const { intent, entities } = await detectIntent(textBody);
                                console.log(`NLP Result: Intent=${intent}`, JSON.stringify(entities));

                                // Get the product entity if it exists
                                // Wit.ai keys are often 'role:name'
                                const categoryEntity = entities['product_category:product_category'];
                                const categoryValue = categoryEntity ? categoryEntity[0].value : null;

                                // LOGIC UPDATE: Check for Intent OR if a Product Entity was found
                                if (intent === 'browse_category' || categoryValue) {

                                    if (categoryValue === 'coffee') {
                                        await handleCategorySelection(from, 'cat_coffee');
                                    } else if (categoryValue === 'cheese') {
                                        await handleCategorySelection(from, 'cat_cheese');
                                    } else if (categoryValue === 'bread') {
                                        await handleCategorySelection(from, 'cat_bread');
                                    } else {
                                        // We know they want a product, but we don't sell that specific one
                                        // OR Wit didn't normalize it to one of our keywords
                                        const catButtons = [
                                            { id: 'cat_cheese', title: '🧀 Cheese & Dairy' },
                                            { id: 'cat_bread', title: '🍞 Fresh Bread' },
                                            { id: 'cat_coffee', title: '☕ Coffee & Tea' }
                                        ];
                                        // Customize message based on what they asked for
                                        const replyText = categoryValue
                                            ? `We don't have "${categoryValue}" right now, but check out our other categories:`
                                            : "I can help with that! Which category?";

                                        await sendReplyButtons(from, replyText, catButtons);
                                    }
                                }
                                else {
                                    // C. Fallback if NLP fails
                                    await sendTextMessage(from, "Sorry, I didn't quite get that. Type 'Menu' to see options.");
                                }
                            }
                        }
                    }

                    // Handle Interactive and Order Messages
                    if (msg.type === 'interactive' && userState !== 'awaiting_agent') {
                        const reply = msg.interactive;
                        if (reply.type === 'list_reply') {
                            await handleMenuSelection(from, reply.list_reply.id);
                        } else if (reply.type === 'button_reply') {
                            const bid = reply.button_reply.id;
                            if (bid.startsWith('cat_')) await handleCategorySelection(from, bid);
                            else if (bid === 'checkout') {
                                await updateUserState(from, 'awaiting_name');
                                await sendTextMessage(from, "Great, let's check out. What is your full name?");
                            } else if (bid === 'menu') await sendMainMenu(from);
                        }
                    }

                    if (msg.type === 'order' && userState !== 'awaiting_agent') {
                        const order = msg.order;
                        const sku = order.product_items[0].product_retailer_id;
                        const quantity = parseInt(order.product_items[0].quantity, 10);
                        await addToCart(from, sku, quantity);
                        await sendTextMessage(from, `Added ${quantity} x "${sku}" to your cart! 🛒\n\nType 'Menu' to keep shopping.`);
                    }
                }
            });
        });
    }
    res.sendStatus(200);
});

// --- HANDLER FUNCTIONS ---
async function sendMainMenu(to) {
    const menuData = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'interactive',
        interactive: {
            type: 'list',
            header: { type: 'text', text: 'Welcome to The Local Pantry!' },
            body: { text: 'How can we help you today?' },
            footer: { text: 'Select an option' },
            action: {
                button: 'View Options',
                sections: [
                    {
                        title: '🛍️ Shop Products',
                        rows: [
                            { id: 'browse_categories', title: 'Browse by Category', description: 'See all our product categories' },
                            { id: 'weekly_specials', title: 'View Weekly Specials', description: "Check out this week's deals" },
                            { id: 'view_cart', title: 'View Cart 🛒', description: 'See items in your cart' }
                        ]
                    },
                    {
                        title: '📦 My Orders',
                        rows: [
                            { id: 'track_order', title: 'Track My Order' },
                            { id: 'order_history', title: 'See Order History' }
                        ]
                    },
                    {
                        title: '💬 Get Help',
                        rows: [
                            { id: 'talk_to_agent', title: 'Talk to an Agent' },
                            { id: 'faqs', title: 'FAQs' }
                        ]
                    }
                ]
            }
        }
    };
    await sendMessage(menuData);
}

async function handleMenuSelection(from, selectedOptionId) {
    let replyText;
    switch (selectedOptionId) {
        case 'browse_categories':
            const catButtons = [
                { id: 'cat_cheese', title: '🧀 Cheese & Dairy' },
                { id: 'cat_bread', title: '🍞 Fresh Bread' },
                { id: 'cat_coffee', title: '☕ Coffee & Tea' }
            ];
            await sendReplyButtons(from, "Great! What are you looking for?", catButtons);
            return;
        case 'view_cart':
            const cart = await getCart(from);
            if (cart.length === 0) {
                await sendTextMessage(from, "Your cart is currently empty. Type 'Menu' to start shopping!");
                return;
            }
            let cartMessage = '🛒 *Your Cart*\n\n';
            cart.forEach(item => { cartMessage += `${item.quantity} x ${item.sku}\n`; });
            cartMessage += "\nClick 'Checkout' to place your order.";
            const checkoutButtons = [{ id: 'checkout', title: '✅ Checkout' }, { id: 'menu', title: 'Keep Shopping' }];
            await sendReplyButtons(from, cartMessage, checkoutButtons);
            return;
        case 'track_order':
            await updateUserState(from, 'awaiting_order_id');
            replyText = "Please enter your *Order ID* to track your package.\n(Example: ORD-1234)";
            break;
        case 'talk_to_agent':
            await updateUserState(from, 'awaiting_agent');
            replyText = "I'm connecting you with a human agent. Type `!resume` to reactivate the bot.";
            break;
        case 'weekly_specials': replyText = "Here are the specials (coming soon)."; break;
        case 'order_history': replyText = "Here is your order history... (Coming soon)."; break;
        case 'faqs': replyText = "Here are our FAQs... (Coming soon)."; break;
        default: replyText = `You selected an option we're still building! (${selectedOptionId})`;
    }
    await sendTextMessage(from, replyText);
}

async function handleCategorySelection(from, selectedCategoryId) {
    switch (selectedCategoryId) {
        case 'cat_cheese': await sendTextMessage(from, "Sorry, I don't have cheese products set up yet."); break;
        case 'cat_bread': await sendTextMessage(from, "Sorry, I don't have bread products set up yet."); break;
        case 'cat_coffee':
            const skus = ['coffee_001'];
            await sendMultiProductMessage(from, 'Coffee & Tea', 'Here are our top picks.', skus);
            break;
        default: await sendTextMessage(from, "You picked an unknown category.");
    }
}

module.exports = router;