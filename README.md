# WhatsApp E-commerce Bot: "The Local Pantry"

This is a comprehensive, database-driven e-commerce chatbot built using the Meta WhatsApp Business API, Node.js, Firebase Firestore, and Wit.ai (NLP).

It is a complete practice project demonstrating how to build enterprise-grade WhatsApp solutions. The bot simulates a shopping journey for a fictional gourmet food shop, featuring natural language understanding, a persistent shopping cart, and automated order tracking.

## ✨ Features Implemented

- **Natural Language Processing (NLP):** Integrated with Wit.ai to understand user intent. Users can type "I need coffee" or "Do you have bread?" and the bot intelligently routes them to the correct product category, bypassing menus.
- **Stateful Conversations:** Manages complex user states (e.g., `awaiting_address`, `awaiting_order_id`, `awaiting_agent`) in Firestore to handle multi-step flows like checkout and tracking.
- **Product Catalog Integration:**
  - **Multi-Product Messages:** Sends native WhatsApp product lists linked to a Meta Commerce Catalog.
  - **Add to Cart:** Captures product selections directly from the chat interface.
- **Database Integration (Firebase Firestore):**
  - **User Profiles:** Auto-creates profiles based on WhatsApp ID.
  - **Persistent Cart:** Saves items to a database so users can come back later.
  - **Order Management:** Saves completed orders and generates unique Order IDs.
  - **Order Tracking:** Users can enter their Order ID to get real-time status updates from the database.
- **Human Agent Handover:** A specific mode that "pauses" the bot, allowing a human agent to take over the conversation via a support inbox, with a secret admin command (`!resume`) to reactivate the bot.
- **Interactive UI:** Uses List Messages and Reply Buttons for a seamless app-like experience.
- **Message Templates:** Sends pre-approved Utility templates for formal order confirmations.

## 🚀 Tech Stack

- Backend: Node.js, Express.js
- Database: Google Firebase Firestore (NoSQL)
- AI/NLP: Wit.ai (Meta)
- API: Meta WhatsApp Business Cloud API
- Environment: dotenv
- Dev Tooling: ngrok (for local tunneling)

## 📂 Project Structure

```
WA-DEMO-SHOP-BOT/
│
├── db/
│   └── firestore.js      # Database logic (Users, Cart, Orders)
│
├── routes/
│   └── webhook.js        # Main controller: Handles messages, state logic, and routing
│
├── services/
│   ├── whatsapp.js       # API wrapper for sending WhatsApp messages/templates
│   └── wit.js            # Service for sending text to Wit.ai for NLP analysis
│
├── .env                  # API Keys and Secrets
├── app.js                # Express server entry point
├── package.json
└── firebase-service-account.json  # Firebase credentials
```

## 🔧 Setup & Installation

### 1. Prerequisites

- Node.js (v16+)
- A Meta for Developers App
- A Firebase Project
- A Wit.ai App

### 2. Installation

Clone the repo and install dependencies:

```bash
git clone [your-repo-link]
cd WA-DEMO-SHOP-BOT
npm install
```

Add your `firebase-service-account.json` key to the root folder.

### 3. Configuration (.env)

Create a `.env` file with the following keys:

```env
PORT=3000
VERIFY_TOKEN="your_custom_webhook_token"
WHATSAPP_TOKEN="your_meta_access_token"
PHONE_NUMBER_ID="your_whatsapp_phone_id"
CATALOG_ID="your_commerce_catalog_id"
WIT_API_TOKEN="your_wit_server_access_token"
```

### 4. Platform Setup

- **Meta:** Connect your phone number to a Product Catalog. Create an `order_confirmation` Utility template.
- **Wit.ai:** Train an intent called `browse_category` with entities for `product_category` (keywords: coffee, bread, cheese, etc.).
- **Firebase:** Create a Firestore database (start in Test Mode for development).

### 5. Run Local Server

```bash
# 1. Start the server
node app.js

# 2. In a separate terminal, expose port 3000
./ngrok http 3000
```

Copy the ngrok URL and paste it into the Callback URL field in **Meta App Dashboard → WhatsApp → Configuration**.

## 🧪 How to Test

- **Shopping:** Send `Hi` → Browse → Add items → Checkout.
- **NLP:** Send `I want to buy coffee` (triggers smart routing).
- **Tracking:** Send `Menu` → Track Order → Enter your Order ID.
- **Support:** Select `Talk to Agent`. Bot pauses. Type `!resume` to unpause.
