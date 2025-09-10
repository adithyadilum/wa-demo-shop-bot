// routes/webhook.js
const express = require("express");
const router = express.Router();
const { sendText } = require("../services/whatsapp");

// ✅ GET /webhook (verification)
router.get("/", (req, res) => {
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

    // Parse params from the request
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    // Check mode and token sent are correct
    if (mode && token) {
        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            console.log("✅ Webhook verified!");
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// ✅ POST /webhook (incoming messages)
router.post("/", async (req, res) => {
    try {
        const body = req.body;

        if (body.object) {
            const changes = body.entry?.[0]?.changes;
            if (changes && changes[0].value.messages) {
                const message = changes[0].value.messages[0];
                const from = message.from; // sender's WA ID
                const text = message.text?.body;

                console.log(`💬 Received message: "${text}" from ${from}`);

                // Simple auto-reply for now
                if (text) {
                    await sendText(from, `You said: ${text}`);
                }
            }

            res.sendStatus(200); // must respond 200 within 10s
        } else {
            res.sendStatus(404);
        }
    } catch (err) {
        console.error("❌ Error in webhook:", err);
        res.sendStatus(500);
    }
});

module.exports = router;