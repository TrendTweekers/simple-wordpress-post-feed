const admin = require('firebase-admin');

// Load Firebase credentials from environment variable or local file
// Updated: Force redeploy
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  // Production: Load from environment variable
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    console.log('Firebase credentials loaded from FIREBASE_SERVICE_ACCOUNT_KEY environment variable');
    
    // Debug logging
    console.log('Service account email:', serviceAccount.client_email);
    console.log('Project ID:', serviceAccount.project_id);
    console.log('Private key starts with:', serviceAccount.private_key ? serviceAccount.private_key.substring(0, 50) : 'MISSING');
  } catch (error) {
    console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:', error);
    throw error;
  }
} else {
  // Development: Load from local file
  serviceAccount = require('./../../../ServiceAccountKey.json');
  console.log('Firebase credentials loaded from local ServiceAccountKey.json file');
  
  // Debug logging for development
  console.log('Service account email:', serviceAccount.client_email);
  console.log('Project ID:', serviceAccount.project_id);
  console.log('Private key starts with:', serviceAccount.private_key ? serviceAccount.private_key.substring(0, 50) : 'MISSING');
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/**
 * Get data for shop
 * @param {*} app app collection
 * @param {*} shop shop
 */
const getFs = (app, shop) => {
  const docRef = db.collection(app).doc(shop);
  const getDoc = docRef
    .get()
    .then((doc) => {
      if (!doc.exists) {
        console.log("No such document!");
        return false;
      }
      return doc.data();
    })
    .catch((err) => {
      console.log("Error getting document", err);
    });

  return getDoc;
};

/**
 * Get Application settings from Firestore
 * @param {*} app name of app
 */
const getSettings = (app) => {
  const docRef = db.collection("settings").doc(app);
  const getDoc = docRef
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return console.log("No such document!");
      }

      // return document data
      return doc.data();
    })
    .catch((err) => {
      console.log("Error getting document", err);
    });

  return getDoc;
};

/**
 * Delete Shop
 * target => COLLECTION > SHOP
 * @param {*} app
 * @param {*} shop
 */
const deleteFs = (app, shop) => {
  const deleteDoc = db.collection(app).doc(shop).delete();

  return deleteDoc;
};

/**
 * Write to Firebase
 * @param {string} app
 * @param {string} shop
 * @param {any} data
 */
const writeFs = (app, shop, data) => {
  const docRef = db.collection(app).doc(shop);
  const writeData = docRef.update(data, { merge: false });

  return writeData;
};

module.exports.getFs = getFs;
module.exports.writeFs = writeFs;
module.exports.deleteFs = deleteFs;
module.exports.getSettings = getSettings;
module.exports.db = db;
