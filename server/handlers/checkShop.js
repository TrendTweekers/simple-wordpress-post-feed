const {
  checkTheme,
  checkEmail,
  checkDevShop
} = require("../lib/shopify/functions");
const { getShop, pushDB } = require("../lib/firebase/firebase");
const { pushTopic } = require("../lib/pubsub/pubsub");
const config = require("../config/config");

const { COLLECTION } = config;

/** Fetch shop data and push DB
 * @param {string} shop
 * @param {string} accessToken
 */

exports.checkShop = async (shop, token) => {
  // init values
  const shopData = {
    theme: "",
    email: "",
    active: "",
    development: ""
  };
  const action = "install";

  shopData.theme = await checkTheme(shop, token);
  shopData.email = await checkEmail(shop, token);
  shopData.development = checkDevShop(shop, token);

  /** destructuring before push */
  const { theme, email, development } = shopData;

  console.log("CHECKSHOP");
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
          token,
          theme,
          email,
          installDate: new Date(),
          lastUpdate: new Date(),
          trialDays: 7,
          development,
          active: !development
        };
        pushTopic(shop, theme, token, action);
        return pushDB(COLLECTION, shop, newData);
      }

      /** Document exist in the database so we update */
      console.log("DOCUMENT EXIST");
      const addData = {
        token,
        theme,
        email,
        lastUpdate: new Date(),
        development,
        active: !development
      };
      pushDB(COLLECTION, shop, addData);
      return addData;
    })
    .catch(err => {
      console.log("error getting document", err);
    });
  return shopData;
};
