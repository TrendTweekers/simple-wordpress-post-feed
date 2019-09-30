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
  // console.log('getShop');
  return documentReference
    .then(doc => {
      if (!doc.exists) {
        // console.log('doc not exist');
        return false;
      }
      // console.log('Document data:', doc.data());
      return doc.data();
    })
    .catch(err => {
      console.log("Error getting document", err);
    });
};

module.exports.getShop = getShop;

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

module.exports.deleteShop = deleteShop;

/**
 * Pushdata to DB
 * target => COLLECTION > SHOP
 * @param {*} shop
 * @param {*} collection
 *
 */

const pushDB = (collection, shop, data) => {
  const documentReference = db.doc(`${collection}/${shop}`);
  console.log("PushDB");
  documentReference.set(data, { merge: true }).then(() => {
    console.log("data saved push db");
    return true;
  });
};

const updateDB = (collection, shop, newBlogs) => {
  const documentReference = db.doc(`${collection}/${shop}`);
  console.log("Update DB");
  documentReference.update({ newBlogs }, { merge: false }).then(() => {
    console.log("data saved update db");
    return newBlogs;
  });
};

//
const updateDBPromise = (collection, shop, newBlogs) =>
  new Promise((resolve, reject) => {
    const documentReference = db.doc(`${collection}/${shop}`);
    console.log("Update DB");
    const docUpdate = documentReference
      .update(newBlogs, { merge: false })
      .then(() => {
        console.log("data saved update db");
        return true;
      });
    if (docUpdate === true) {
      resolve(newBlogs);
    } else {
      reject(Error);
    }
  });
//

module.exports.pushDB = pushDB;
module.exports.updateDB = updateDB;
module.exports.updateDBPromise = updateDBPromise;
