// db/firestore.js
const admin = require('firebase-admin');

// Path to your service account key file
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

console.log('Firebase connection established.');
module.exports = { db };