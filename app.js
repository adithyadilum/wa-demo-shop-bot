// app.js
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const webhookRoutes = require("./routes/webhook");

const app = express();
app.use(bodyParser.json());
app.use("/webhook", webhookRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
