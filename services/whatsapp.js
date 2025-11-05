// services/whatsapp.js
const axios = require('axios');

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

/**
 * Sends any formatted message to the WhatsApp API.
 * @param {object} data - The complete message payload (e.g., text, interactive, etc.)
 */
async function sendMessage(data) {
    const url = `https://graph.facebook.com/v24.0/${PHONE_NUMBER_ID}/messages`;

    const headers = {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
    };

    try {
        console.log('Sending message:', JSON.stringify(data, null, 2));
        await axios.post(url, data, { headers: headers });
        console.log(`Message sent successfully to ${data.to}.`);
    } catch (error) {
        console.error('Error sending message:');
        if (error.response) {
            console.error('Data:', error.response.data);
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);
        } else if (error.request) {
            console.error('Request:', error.request);
        } else {
            console.error('Error Message:', error.message);
        }
    }
}

/**
 * Helper function to send a simple text message.
 * @param {string} to - The recipient's phone number
 * @param {string} text - The text to send
 */
async function sendTextMessage(to, text) {
    const data = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: {
            body: text
        }
    };
    await sendMessage(data);
}

/**
 * Sends an interactive Reply Button message.
 * @param {string} to - The recipient's phone number
 * @param {string} text - The main body text of the message
 * @param {Array<object>} buttons - An array of button objects (max 3)
 */
async function sendReplyButtons(to, text, buttons) {
    // WhatsApp allows a max of 3 reply buttons
    if (buttons.length > 3) {
        throw new Error('Too many buttons. Max 3 allowed.');
    }

    const data = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'interactive',
        interactive: {
            type: 'button',
            body: {
                text: text
            },
            action: {
                buttons: buttons.map(btn => ({
                    type: 'reply',
                    reply: {
                        id: btn.id,
                        title: btn.title
                    }
                }))
            }
        }
    };
    await sendMessage(data); // Use the generic sendMessage
}


const CATALOG_ID = process.env.CATALOG_ID;

/**
 * Sends a Multi-Product Message.
 * @param {string} to - The recipient's phone number
 * @param {string} header - The text for the header
 * @param {string} body - The main body text
 * @param {Array<string>} product_skus - An array of product SKUs (Content IDs)
 */
async function sendMultiProductMessage(to, header, body, product_skus) {
    const data = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'interactive',
        interactive: {
            type: 'product_list',
            header: {
                type: 'text',
                text: header
            },
            body: {
                text: body
            },
            action: {
                catalog_id: CATALOG_ID,
                sections: [
                    {
                        title: 'Our Products', // Section title
                        product_items: product_skus.map(sku => ({
                            product_retailer_id: sku
                        }))
                    }
                ]
            }
        }
    };
    await sendMessage(data);
}

module.exports = { sendMessage, sendTextMessage, sendReplyButtons, sendMultiProductMessage };