const admin = require("firebase-admin");

// Load Firebase credentials from environment variable or local file
let serviceAccount;
let credential;

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  // Load from environment variable (Railway/production)
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    credential = admin.credential.cert(serviceAccount);
    console.log("Firebase credentials loaded from FIREBASE_SERVICE_ACCOUNT_KEY environment variable");
  } catch (error) {
    console.error("Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:", error);
    throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT_KEY JSON format");
  }
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  // Load from file path specified in environment variable
  credential = admin.credential.applicationDefault();
  console.log("Firebase credentials loaded from GOOGLE_APPLICATION_CREDENTIALS:", process.env.GOOGLE_APPLICATION_CREDENTIALS);
} else {
  // Fall back to local file (development)
  try {
    serviceAccount = require("./../../../ServiceAccountKey.json");
    credential = admin.credential.cert(serviceAccount);
    console.log("Firebase credentials loaded from local ServiceAccountKey.json file");
  } catch (error) {
    console.error("Error loading ServiceAccountKey.json:", error);
    throw new Error("Firebase credentials not found. Please set FIREBASE_SERVICE_ACCOUNT_KEY environment variable or provide ServiceAccountKey.json file.");
  }
}

// Initialize Firestore.
admin.initializeApp({
  credential: credential,
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
 * Gett Application settings from Firestore
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
 *
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
