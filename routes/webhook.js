// routes/webhook.js
const express = require('express');
const router = express.Router();
// Import all our functions
const {
    sendMessage,
    sendTextMessage,
    sendReplyButtons,
    sendMultiProductMessage // Import the new function
} = require('../services/whatsapp');

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// --- 1. WEBHOOK VERIFICATION (GET) ---
router.get('/', (req, res) => {
    // (Same as before, no changes here)
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
                    const from = msg.from; // User's phone number

                    // --- HANDLE TEXT MESSAGES ---
                    if (msg.type === 'text') {
                        const textBody = msg.text.body.toLowerCase();
                        console.log(`Message from ${from}: ${textBody}`);

                        if (textBody === 'hi' || textBody === 'hello' || textBody === 'menu') {
                            await sendMainMenu(from);
                        } else {
                            await sendTextMessage(from, "Sorry, I don't understand. Type 'Menu' to see options.");
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

                            // --- B) Handle Reply Button Selections ---
                        } else if (reply.type === 'button_reply') {
                            const selectedButtonId = reply.button_reply.id;
                            console.log(`User ${from} selected button: ${selectedButtonId}`);
                            await handleCategorySelection(from, selectedButtonId);
                        }
                    }

                    // --- C) HANDLE PRODUCT MESSAGE REPLIES ---
                    if (msg.type === 'order') {
                        // This is how a user adds to cart from a product message
                        const order = msg.order;
                        const productItems = order.product_items;

                        // For now, just log it
                        console.log(`User ${from} is ordering:`, productItems);
                        const sku = productItems[0].product_retailer_id;
                        const quantity = productItems[0].quantity;

                        await sendTextMessage(from, `Got it! You want ${quantity} of product ${sku}. (Cart system coming soon!)`);
                    }
                }
            });
        });
    }

    res.sendStatus(200);
});


// --- 3. MENU & BUTTON LOGIC FUNCTIONS ---

/**
 * Sends the main menu List Message
 * (Same as before, no changes here)
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
                            { id: 'weekly_specials', title: 'View Weekly Specials', description: "Check out this week's deals" }
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
 * (Same as before, no changes here)
 */
async function handleMenuSelection(from, selectedOptionId) {
    let replyText;

    switch (selectedOptionId) {
        case 'browse_categories':
            const buttons = [
                { id: 'cat_cheese', title: '🧀 Cheese & Dairy' },
                { id: 'cat_bread', title: '🍞 Fresh Bread' },
                { id: 'cat_coffee', title: '☕ Coffee & Tea' }
            ];
            await sendReplyButtons(from, "Great! What are you looking for?", buttons);
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
 * (This is the updated function)
 */
async function handleCategorySelection(from, selectedCategoryId) {

    // Replace the text reply with a product message

    switch (selectedCategoryId) {
        case 'cat_cheese':
            await sendTextMessage(from, "Sorry, I don't have cheese products set up yet.");
            break;
        case 'cat_bread':
            await sendTextMessage(from, "Sorry, I don't have bread products set up yet.");
            break;
        case 'cat_coffee':
            // --- THIS IS OUR NEW LOGIC ---
            // **REPLACE THESE SKUs with the "Content IDs" you created!**
            const skus = ['coffee_001', 'tea_002', 'tea_003'];

            await sendMultiProductMessage(
                from,
                'Coffee & Tea',
                'Here are our top picks. You can view details and add to your cart right here.',
                skus
            );
            break;
        // -----------------------------
        default:
            await sendTextMessage(from, "You picked an unknown category.");
    }
}

module.exports = router;