const admin = require('firebase-admin');

// Guard against re-initialization
if (!admin.apps.length) {
  // Load Firebase credentials from environment variable
  let serviceAccount = null;
  
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    }
  } catch (error) {
    console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:', error);
  }
  
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'pluginmaker'
    });
    console.log('Firebase initialized with service account key ID:', serviceAccount.private_key_id);
  } else {
    // Fallback to application default credentials
    admin.initializeApp({
      projectId: 'pluginmaker'
    });
    console.log('Firebase initialized with application default credentials');
  }
}

const db = admin.firestore();
// Optional safety (prevents undefined write crashes)
db.settings({ ignoreUndefinedProperties: true });

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
  
  // Sanitize: remove keys with undefined values before writing
  const clean = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  );
  
  const writeData = docRef.update(clean, { merge: true });

  return writeData;
};

module.exports.getFs = getFs;
module.exports.writeFs = writeFs;
module.exports.deleteFs = deleteFs;
module.exports.getSettings = getSettings;
module.exports.db = db;
