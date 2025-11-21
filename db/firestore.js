const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

// Prevent multiple initializations
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
console.log('Firebase connection established.');

async function getOrCreateUser(wa_id) {
    const userRef = db.collection('users').doc(wa_id);
    const doc = await userRef.get();

    if (!doc.exists) {
        const newUser = { wa_id: wa_id, created_at: new Date(), state: 'default' };
        await userRef.set(newUser);
        return newUser;
    } else {
        const userData = doc.data();
        if (!userData.state) {
            await userRef.update({ state: 'default' });
            return { ...userData, state: 'default' };
        }
        return userData;
    }
}

async function updateUserState(wa_id, newState) {
    await db.collection('users').doc(wa_id).update({ state: newState });
}

async function updateUserData(wa_id, data) {
    await db.collection('users').doc(wa_id).update(data);
}

async function addToCart(wa_id, sku, quantity) {
    await getOrCreateUser(wa_id);
    const cartRef = db.collection('users').doc(wa_id).collection('cart').doc(sku);
    const doc = await cartRef.get();

    if (doc.exists) {
        const currentQuantity = doc.data().quantity;
        await cartRef.update({ quantity: currentQuantity + quantity });
    } else {
        await cartRef.set({ sku: sku, quantity: quantity, added_at: new Date() });
    }
}

async function getCart(wa_id) {
    const cartRef = db.collection('users').doc(wa_id).collection('cart');
    const snapshot = await cartRef.get();
    if (snapshot.empty) return [];
    let cart = [];
    snapshot.forEach(doc => cart.push(doc.data()));
    return cart;
}

async function clearCart(wa_id) {
    const cartRef = db.collection('users').doc(wa_id).collection('cart');
    const snapshot = await cartRef.get();
    if (snapshot.empty) return;
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
}
/**
 * Creates a new order from the user's cart.
 * @param {string} wa_id - User's WhatsApp ID
 * @param {string} name - User's Name
 * @param {string} address - User's Address
 * @param {Array} cartItems - Items from the cart
 * @returns {string} The new Order ID
 */
async function createOrder(wa_id, name, address, cartItems) {
    // Generate a simple Order ID (e.g., ORD-1234)
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const orderId = `ORD-${randomNum}`;

    const orderData = {
        order_id: orderId,
        wa_id: wa_id,
        customer_name: name,
        shipping_address: address,
        items: cartItems,
        status: 'Processing', // Default status
        created_at: new Date()
    };

    // Save to a top-level 'orders' collection
    await db.collection('orders').doc(orderId).set(orderData);
    console.log(`Order created: ${orderId}`);
    return orderId;
}

/**
 * Retrieves an order by its ID.
 * @param {string} orderId - The Order ID to look up
 * @returns {object|null} The order data or null if not found
 */
async function getOrder(orderId) {
    // Handle case sensitivity or extra spaces
    const cleanId = orderId.trim().toUpperCase();
    const orderRef = db.collection('orders').doc(cleanId);
    const doc = await orderRef.get();

    if (doc.exists) {
        return doc.data();
    } else {
        return null;
    }
}

module.exports = {
    db, getOrCreateUser, updateUserState, updateUserData,
    addToCart, getCart, clearCart,
    createOrder, getOrder
};