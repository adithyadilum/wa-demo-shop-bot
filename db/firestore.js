// db/firestore.js
const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
console.log('Firebase connection established.');

/**
 * Gets or creates a user profile in Firestore.
 * @param {string} wa_id - The user's WhatsApp ID
 * @returns {object} The user's data from Firestore
 */
async function getOrCreateUser(wa_id) {
    const userRef = db.collection('users').doc(wa_id);
    const doc = await userRef.get();

    if (!doc.exists) {
        console.log(`Creating new user profile for ${wa_id}`);
        const newUser = {
            wa_id: wa_id,
            created_at: new Date(),
            state: 'default' // Add the initial state
        };
        await userRef.set(newUser);
        return newUser;
    } else {
        // Ensure existing users have a state
        const userData = doc.data();
        if (!userData.state) {
            await userRef.update({ state: 'default' });
            return { ...userData, state: 'default' };
        }
        return userData;
    }
}

/**
 * Updates a user's state in Firestore.
 * @param {string} wa_id - The user's WhatsApp ID
 * @param {string} newState - The new state (e.g., 'awaiting_name')
 */
async function updateUserState(wa_id, newState) {
    const userRef = db.collection('users').doc(wa_id);
    await userRef.update({ state: newState });
    console.log(`Updated state for ${wa_id} to ${newState}`);
}

/**
 * Updates data on a user's profile.
 * @param {string} wa_id - The user's WhatsApp ID
 * @param {object} data - The data to update (e.g., { name: 'John Doe' })
 */
async function updateUserData(wa_id, data) {
    const userRef = db.collection('users').doc(wa_id);
    await userRef.update(data);
    console.log(`Updated data for ${wa_id}:`, data);
}

/**
 * Adds an item to a user's cart.
 * (Same as before)
 */
async function addToCart(wa_id, sku, quantity) {
    await getOrCreateUser(wa_id); // Ensures user exists
    const cartRef = db.collection('users').doc(wa_id).collection('cart').doc(sku);
    const doc = await cartRef.get();

    if (doc.exists) {
        const currentQuantity = doc.data().quantity;
        await cartRef.update({ quantity: currentQuantity + quantity });
    } else {
        await cartRef.set({
            sku: sku,
            quantity: quantity,
            added_at: new Date()
        });
    }
}

/**
 * Retrieves all items from a user's cart.
 * (Same as before)
 */
async function getCart(wa_id) {
    const cartRef = db.collection('users').doc(wa_id).collection('cart');
    const snapshot = await cartRef.get();

    if (snapshot.empty) {
        return [];
    }

    let cart = [];
    snapshot.forEach(doc => {
        cart.push(doc.data());
    });
    return cart;
}

/**
 * Clears a user's cart (e.g., after checkout).
 * @param {string} wa_id - The user's WhatsApp ID
 */
async function clearCart(wa_id) {
    const cartRef = db.collection('users').doc(wa_id).collection('cart');
    const snapshot = await cartRef.get();

    if (snapshot.empty) return;

    // Delete each document in the cart
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`Cleared cart for ${wa_id}`);
}

// Export all our functions
module.exports = {
    db,
    getOrCreateUser,
    updateUserState,
    updateUserData,
    addToCart,
    getCart,
    clearCart
};