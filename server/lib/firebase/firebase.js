const admin = require("firebase-admin");
const serviceAccount = require("./../../../ServiceAccountKey.json");

//Initialize Firestore.
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
  // credential: admin.credential.applicationDefault()
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
    .then(doc => {
      if (!doc.exists) {
        return console.log("No such document!");
      }
      return doc.data();
    })
    .catch(err => {
      console.log("Error getting document", err);
    });

  return getDoc;
};

/**
 * Gett Application settings from Firestore
 * @param {*} app name of app
 */

const getSettings = app => {
  const docRef = db.collection("settings").doc(app);
  const getDoc = docRef
    .get()
    .then(doc => {
      if (!doc.exists) {
        return console.log("No such document!");
      }

      // return document data
      return doc.data();
    })
    .catch(err => {
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
  const deleteDoc = db
    .collection(app)
    .doc(shop)
    .delete();

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
