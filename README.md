# WhatsApp E-commerce Bot: "The Local Pantry"

This is a comprehensive, database-driven e-commerce chatbot built using the Meta WhatsApp Business API, Node.js, and Firebase Firestore.

It's a practice project designed to implement and master the core features of the WhatsApp API for building real-world business solutions. The bot simulates a complete shopping journey for a fictional gourmet food shop called "The Local Pantry."

## ✨ Features Implemented

This bot demonstrates a wide range of the WhatsApp Business API's capabilities:

- Webhook Integration: A secure webhook endpoint (built with Express) receives all real-time message notifications from Meta.
- Stateful Conversations: The bot manages user state (e.g., default, awaiting_name, awaiting_address) in Firestore, allowing for complex, multi-step conversations like text-based checkouts.
- Interactive List Messages: Used to display the main menu in a clean, structured, and user-friendly way.
- Interactive Reply Buttons: Used for quick selections like browsing categories or confirming actions (e.g., "Checkout").
- Product Catalog Integration:
  - Multi-Product Messages: Displays a rich list of products from a Meta Commerce Catalog when a user browses a category.
  - "Add to Cart" Handling: Receives the order message when a user adds an item to their cart from a product message.
- Database Integration (Firebase Firestore):
  - User Profiles: Automatically creates and retrieves user profiles based on their WhatsApp ID.
  - Persistent Shopping Cart: Saves, retrieves, and clears the user's shopping cart in a Firestore subcollection.
  - Order Management: Stores user name and address during checkout.
- Message Templates: Sends a pre-approved "order_confirmation" (Utility) template at the end of the checkout flow, demonstrating business-initiated messaging.

## 🚀 Tech Stack

- Backend: Node.js, Express.js
- Database: Google Firebase Firestore (NoSQL)
- API: Meta WhatsApp Business Cloud API
- HTTP Client: axios
- Environment: dotenv
- Tunnelling: ngrok (for development)

## 📂 Project Structure

```
WA-DEMO-SHOP-BOT/
│
├── db/
│ └── firestore.js # Manages all Firestore database logic (users, cart)
│
├── routes/
│ └── webhook.js # Handles all incoming webhook requests (GET, POST) and all bot logic
│
├── services/
│ └── whatsapp.js # Manages all _outgoing_ API calls to Meta (sending messages, templates, etc.)
│
├── .env # Stores all secret keys (API tokens, database credentials)
├── app.js # The main Express server entry point
├── package.json
└── firebase-service-account.json # Firebase admin credentials
```

## 🔧 Setup & Installation

To run this project, you will need:

- A Meta for Developers account
- A Firebase project with Firestore enabled
- Node.js (v16 or higher)
- ngrok for local development

### 1. Project Setup

Clone the repository:

```bash
git clone [your-repo-url]
cd WA-DEMO-SHOP-BOT
```

Install dependencies:

```bash
npm install
```

Get Firebase Credentials:

- Go to your Firebase project Settings > Service Accounts.
- Click "Generate new private key".
- Rename the downloaded JSON file to firebase-service-account.json and place it in the root of this project.

### 2. Meta App & Catalog Setup

Create a Meta App:

- Go to developers.facebook.com > My Apps > Create App.
- Select "Business" type.
- Add the "WhatsApp" product to your app.

Configure WhatsApp:

- You will be given a Test Phone Number, a Phone Number ID, and a Temporary Access Token.
- Add your personal phone number as a test recipient.

Create a Product Catalog:

- Go to Meta Commerce Manager.
- Create a new catalog (e.g., "The Local Pantry").
- Manually add a few sample products. Crucially, set the "Content ID" (SKU) to match the ones in the code (e.g., coffee_001).
- Ensure all products have a Price, Currency, and are In Stock.
- Copy your Catalog ID.

Connect Catalog to WhatsApp:

- Go back to your Meta App Dashboard > WhatsApp > Configuration and connect your new catalog.
- Go to WhatsApp Manager > Account Tools > Catalog and ensure your catalog is connected to your test phone number.

Create Message Template:

- In the Meta App Dashboard > WhatsApp > Configuration > Message Templates, create a new template:
- Name: order_confirmation
- Category: Utility
- Header (Text): Your order is confirmed!
- Body: Hi {{1}}! 👋\n\nThanks for your order... (See services/whatsapp.js for the full text with 3 variables).
- Buttons (Quick Reply): Track My Order
- Submit it and wait for approval.

### 3. Final Configuration (.env)

Create a .env file in the root directory and fill it with your credentials:

```env
# Server port

PORT=3000

# A secret token you create for the webhook

VERIFY_TOKEN="your-secret-token"

# Your access token from the Meta App Dashboard

WHATSAPP_TOKEN="PASTE_YOUR_ACCESS_TOKEN_HERE"

# Your Phone Number ID from the Meta App Dashboard

PHONE_NUMBER_ID="PASTE_YOUR_PHONE_NUMBER_ID_HERE"

# Your Catalog ID from the Commerce Manager

CATALOG_ID="PASTE_YOUR_CATALOG_ID_HERE"
```

### 4. Running the Bot

Start the server:

```bash
node app.js
```

Start ngrok: In a new terminal, expose your local port:

```bash
./ngrok http 3000
```

Configure the Webhook:

- Copy the https://... URL from ngrok.
- In your Meta App Dashboard > WhatsApp > Configuration, set the Callback URL to [your-ngrok-url]/webhook.
- Set the Verify token to match the VERIFY_TOKEN in your .env file.
- Click "Verify and save."
- In "Webhook subscriptions," click "Manage" and subscribe to messages.

Test the Bot: Send "Hi" from your personal WhatsApp to your bot's test number to start the conversation!
