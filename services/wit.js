const axios = require('axios');

const WIT_API_TOKEN = process.env.WIT_API_TOKEN;

async function detectIntent(text) {
    try {
        const response = await axios.get(`https://api.wit.ai/message`, {
            params: {
                q: text,
                v: '20240304'
            },
            headers: {
                Authorization: `Bearer ${WIT_API_TOKEN}`
            }
        });

        const data = response.data;

        // --- DEBUG LOG ---
        console.log("FULL WIT.AI RESPONSE:", JSON.stringify(data, null, 2));
        // -----------------

        const intents = data.intents;
        const intent = intents.length > 0 ? intents[0].name : null;
        const entities = data.entities;

        return { intent, entities };

    } catch (error) {
        console.error('Error calling Wit.ai:', error.message);
        return { intent: null, entities: {} };
    }
}

module.exports = { detectIntent };