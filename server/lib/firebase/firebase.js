const admin = require("firebase-admin");
const serviceAccount = require("./ServiceAccountKey.json");

// Initialize Firestore.
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

module.exports.db = db;

/**
 * Check if store exist and fetch data
 * target => COLLECTION > SHOP
 * @param {string} collection
 * @param {string} shop
 */

const getShop = (collection, shop) => {
  const documentReference = db.doc(`${collection}/${shop}`).get();
  return documentReference
    .then(doc => {
      if (!doc.exists) {
        return false;
      }
      return doc.data();
    })
    .catch(err => {
      console.log("Error getting document", err);
    });
};

/**
 * Delete shop
 * target => COLLECTION > SHOP
 * @param {*} shop
 * @param {*} collection
 *
 */

const deleteShop = (collection, shop) => {
  const documentReference = db.doc(`${collection}/${shop}`).get();
  console.log("deleteShop");
  return documentReference
    .then(doc => {
      if (!doc.exists) {
        console.log(`ERROR: deleteShop(): ${shop} does not exist`);
        return false;
      }
      db.doc(`${collection}/${shop}`).delete();
      console.log(`SUCCESS deleteShop(): ${shop} deleted`);
      return true;
    })
    .catch(err => {
      console.log("Error getting document", err);
    });
};

/**Pushdata to DB
 * @param  {} collection
 * @param  {} shop
 * @param  {} data
 */
const pushDB = (collection, shop, data) => {
  const documentReference = db.doc(`${collection}/${shop}`);
  console.log("PushDB");
  documentReference.set(data, { merge: true }).then(() => {
    console.log("data saved push db");
    return true;
  });
};
/**Update data in DB MERGE:FALSE
 * @param  {} collection
 * @param  {} shop
 * @param  {} data
 */
const updateDB = (collection, shop, data) => {
  const documentReference = db.doc(`${collection}/${shop}`);
  console.log("Update DB");
  documentReference.update({ data }, { merge: false }).then(() => {
    console.log("data saved update db");
    return data;
  });
};

module.exports.pushDB = pushDB;
module.exports.updateDB = updateDB;
module.exports.getShop = getShop;
module.exports.deleteShop = deleteShop;
