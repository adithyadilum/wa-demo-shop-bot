// app.js
require('dotenv').config(); // MUST BE AT THE TOP
const express = require('express');

// Import our routes
const webhookRouter = require('./routes/webhook');
// Import our DB connection (this just runs the file)
require('./db/firestore');

const app = express();
const PORT = process.env.PORT || 3000;

// Use express.json() to parse incoming JSON payloads
// This replaces body-parser.json()
app.use(express.json());

// Mount our webhook router
// All requests to /webhook will be handled by webhookRouter
app.use('/webhook', webhookRouter);

// Simple route for testing if the server is up
app.get('/', (req, res) => {
    res.send('WhatsApp Bot Server is running!');
});

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});