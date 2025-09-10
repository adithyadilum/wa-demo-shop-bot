// services/whatsapp.js
const axios = require("axios");

const API_VERSION = "v17.0";
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const BASE = `https://graph.facebook.com/${API_VERSION}/${PHONE_ID}`;

async function sendText(to, text) {
    const url = `${BASE}/messages`;
    await axios.post(url, {
        messaging_product: "whatsapp",
        to,
        text: { body: text }
    }, { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } });
}

module.exports = { sendText };