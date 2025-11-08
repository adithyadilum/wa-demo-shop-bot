// routes/webhook.js
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
    clearCart
} = require('../db/firestore');

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// --- 1. WEBHOOK VERIFICATION (GET) ---
router.get('/', (req, res) => {
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];
    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// --- 2. RECEIVE MESSAGES (POST) ---
router.post('/', async (req, res) => {
    let body = req.body;
    console.log('Incoming webhook:', JSON.stringify(body, null, 2));

    if (body.object === 'whatsapp_business_account' && body.entry) {
        body.entry.forEach((entry) => {
            entry.changes.forEach(async (change) => {
                if (change.field === 'messages' && change.value.messages) {
                    const msg = change.value.messages[0];
                    const from = msg.from;

                    // --- 1. Get User and State ---
                    const user = await getOrCreateUser(from);
                    const userState = user.state;

                    // --- HANDLE TEXT MESSAGES (Statefully) ---
                    if (msg.type === 'text') {
                        const textBody = msg.text.body; // No toLowerCase() yet
                        console.log(`Message from ${from} (state: ${userState}): ${textBody}`);

                        // --- STATE-BASED LOGIC ---
                        if (userState === 'awaiting_name') {
                            // User is replying with their name
                            await updateUserData(from, { name: textBody });
                            await updateUserState(from, 'awaiting_address');
                            await sendTextMessage(from, `Thanks, ${textBody}. What is your delivery address?`);

                        } else if (userState === 'awaiting_address') {
                            // User is replying with their address
                            const userName = user.name; // Get name from user object
                            const userAddress = textBody; // Get address from message

                            await updateUserData(from, { address: userAddress });
                            await updateUserState(from, 'default'); // Reset state

                            const cart = await getCart(from);

                            // --- 1. Create the cart summary for the template ---
                            let cartSummary = '';
                            cart.forEach(item => {
                                cartSummary += `${item.quantity} x ${item.sku}\n`;
                            });
                            // Remove trailing newline
                            cartSummary = cartSummary.trim();

                            // --- 2. Create the simple text confirmation ---
                            let textConfirmation = `*Order Confirmed!* (simulation)\n\n${cartSummary}\n\n*Delivering to:*\n${userName}\n${userAddress}`;

                            // --- 3. Send both messages ---
                            await sendTextMessage(from, textConfirmation);

                            // Send the formal template
                            await sendOrderConfirmationTemplate(
                                from,
                                userName,
                                cartSummary,
                                userAddress
                            );

                            // --- 4. Clear the cart ---
                            await clearCart(from);
                        } else {
                            // --- DEFAULT STATE LOGIC ---
                            const lowerText = textBody.toLowerCase();
                            if (lowerText === 'hi' || lowerText === 'hello' || lowerText === 'menu') {
                                await sendMainMenu(from);
                            } else {
                                await sendTextMessage(from, "Sorry, I don't understand. Type 'Menu' to see options.");
                            }
                        }
                    }

                    // --- HANDLE INTERACTIVE REPLIES ---
                    if (msg.type === 'interactive') {
                        const reply = msg.interactive;

                        // --- A) Handle List Menu Selections ---
                        if (reply.type === 'list_reply') {
                            const selectedOptionId = reply.list_reply.id;
                            console.log(`User ${from} selected menu option: ${selectedOptionId}`);
                            await handleMenuSelection(from, selectedOptionId);
                        }

                        // --- B) Handle Reply Button Selections ---
                        else if (reply.type === 'button_reply') {
                            const selectedButtonId = reply.button_reply.id;
                            console.log(`User ${from} selected button: ${selectedButtonId}`);

                            if (selectedButtonId.startsWith('cat_')) {
                                await handleCategorySelection(from, selectedButtonId);
                            } else if (selectedButtonId === 'checkout') {
                                // --- THIS IS THE CHECKOUT TRIGGER ---
                                await updateUserState(from, 'awaiting_name');
                                await sendTextMessage(from, "Great, let's check out. What is your full name?");
                            } else if (selectedButtonId === 'menu') {
                                await sendMainMenu(from);
                            }
                        }
                    }

                    // --- D) HANDLE PRODUCT "ADD TO CART" ---
                    if (msg.type === 'order') {
                        const order = msg.order;
                        const productItems = order.product_items;
                        const sku = productItems[0].product_retailer_id;
                        const quantity = parseInt(productItems[0].quantity, 10);

                        await addToCart(from, sku, quantity);

                        await sendTextMessage(
                            from,
                            `Added ${quantity} x "${sku}" to your cart! 🛒\n\nType 'Menu' to keep shopping.`
                        );
                    }
                }
            });
        });
    }

    res.sendStatus(200);
});


// --- 3. LOGIC FUNCTIONS ---

/**
 * Sends the main menu List Message
 */
async function sendMainMenu(to) {
    // (Same code as before)
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

/**
 * Handles the user's selection from the main menu
 */
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
            cart.forEach(item => {
                cartMessage += `${item.quantity} x ${item.sku}\n`;
            });
            cartMessage += "\nClick 'Checkout' to place your order.";

            const checkoutButtons = [
                { id: 'checkout', title: '✅ Checkout' },
                { id: 'menu', title: 'Keep Shopping' }
            ];
            await sendReplyButtons(from, cartMessage, checkoutButtons);
            return;

        case 'weekly_specials':
            replyText = "Here are the specials (coming soon).";
            break;
        case 'track_order':
            replyText = "Please enter your order number. (Coming soon).";
            break;
        case 'order_history':
            replyText = "Here is your order history... (Coming soon).";
            break;
        case 'talk_to_agent':
            replyText = "Connecting you to an agent... (Coming soon).";
            break;
        case 'faqs':
            replyText = "Here are our FAQs... (Coming soon).";
            break;
        default:
            replyText = `You selected an option we're still building! (${selectedOptionId})`;
    }

    await sendTextMessage(from, replyText);
}

/**
 * Handles the user's selection from the category buttons
 */
async function handleCategorySelection(from, selectedCategoryId) {
    switch (selectedCategoryId) {
        case 'cat_cheese':
            await sendTextMessage(from, "Sorry, I don't have cheese products set up yet.");
            break;
        case 'cat_bread':
            await sendTextMessage(from, "Sorry, I don't have bread products set up yet.");
            break;
        case 'cat_coffee':
            const skus = ['coffee_001'];
            await sendMultiProductMessage(
                from,
                'Coffee & Tea',
                'Here are our top picks. You can view details and add to your cart right here.',
                skus
            );
            break;
        default:
            await sendTextMessage(from, "You picked an unknown category.");
    }
}

module.exports = router;