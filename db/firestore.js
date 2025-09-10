// db/firestore.js
const admin = require("firebase-admin");
const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT || "./firebase-service-account.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const ORDERS = process.env.FIRESTORE_COLLECTION || "orders";

module.exports = {
    db, ORDERS
};
