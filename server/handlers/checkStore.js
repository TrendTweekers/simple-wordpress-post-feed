const { checkTheme, checkEmail } = require("../lib/shopify/functions");
const { getShop, pushDB } = require("../lib/firebase/firebase");
const config = require("../config/config");

const { COLLECTION, API_VERSION } = config;

/** Fetch store data and push DB
 * @param {string} shop
 * @param {string} accessToken
 */

exports.checkStore = async (shop, accessToken) => {
  // init values
  const storeData = {
    mainThemeId: "",
    email: ""
  };

  storeData.mainThemeId = await checkTheme(shop, accessToken);
  storeData.email = await checkEmail(shop, accessToken);

  /** destructuring before push */
  const { mainThemeId, email } = storeData;

  console.log("CHECKSTORE");
  async function getSnapshot() {
    const snapshot = await getShop(COLLECTION, shop);
    return snapshot;
  }

  getSnapshot()
    .then(snapshot => {
      const dbData = snapshot;

      /** Document does not exist in the database */
      if (dbData === false) {
        console.log("DOCUMENT DONT EXIST");
        const newData = {
          shop,
          token: accessToken,
          themeId: mainThemeId,
          email,
          installDate: new Date(),
          lastUpdate: new Date(),
          trialDays: 7,
          status: "ACTIVE"
        };
        return pushDB(COLLECTION, shop, newData);
      }

      /** Document exist in the database so we update */
      console.log("DOCUMENT EXIST");
      const addData = {
        token: accessToken,
        themeId: mainThemeId,
        email,
        lastUpdate: new Date(),
        status: "ACTIVE"
      };
      pushDB(COLLECTION, shop, addData);
      return addData;
    })
    .catch(err => {
      console.log("error getting document", err);
    });
  return storeData;
};

/**Check if shop is in devmode
 * @param  {string} shop
 * @param  {string} token
 */
exports.checkDevShop = async (shop, token) => {
  try {
    const devShop = await fetch(
      `https://${shop}/admin/api/${API_VERSION}/shop.json`,
      {
        headers: {
          "X-Shopify-Access-Token": token
        }
      }
    )
      .then(response => response.json())
      .then(json => {
        console.log(json.shop.plan_name);
        if (json.shop.plan_name === "affiliate") {
          return true;
        }
        return false;
      });
    return devShop;
  } catch (err) {
    console.log(err);
  }
};

/** Fetch store data and push DB for DEV Shops
 * @param {string} shop
 * @param {string} accessToken
 */
exports.checkStoreDEV = async (shop, accessToken) => {
  // init values
  const storeData = {
    mainThemeId: "",
    email: ""
  };

  storeData.mainThemeId = await checkTheme(shop, accessToken);
  storeData.email = await checkEmail(shop, accessToken);

  /** destructuring before push */
  const { mainThemeId, email } = storeData;

  console.log("CHECKSTORE");
  async function getSnapshot() {
    const snapshot = await getShop(COLLECTION, shop);
    return snapshot;
  }

  getSnapshot()
    .then(snapshot => {
      const dbData = snapshot;

      /** Document does not exist in the database */
      if (dbData === false) {
        console.log("DOCUMENT DONT EXIST");
        const newData = {
          shop,
          token: accessToken,
          themeId: mainThemeId,
          email,
          installDate: new Date(),
          lastUpdate: new Date(),
          trialDays: 7,
          status: "DEV"
        };
        return pushDB(COLLECTION, shop, newData);
      }

      /** Document exist in the database so we update */
      console.log("DOCUMENT EXIST");
      const addData = {
        token: accessToken,
        themeId: mainThemeId,
        email,
        lastUpdate: new Date(),
        status: "DEV"
      };
      pushDB(COLLECTION, shop, addData);
      return addData;
    })
    .catch(err => {
      console.log("error getting document", err);
    });
  return storeData;
};
