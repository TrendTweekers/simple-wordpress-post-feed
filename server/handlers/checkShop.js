const {
  checkTheme,
  checkEmail,
  checkDevShop
} = require("../lib/shopify/functions");
const { getShop, pushDB } = require("../lib/firebase/firebase");
const { pushTopic } = require("../lib/pubsub/pubsub");
const config = require("../config/config");

const { COLLECTION, PS_APP, PS_TOPIC } = config;

/** Fetch shop data and push DB
 * @param {string} shop
 * @param {string} accessToken
 */

exports.checkShop = async (shop, token) => {
  // init values
  const shopData = {
    themeId: "",
    email: "",
    status: ""
  };

  shopData.themeId = await checkTheme(shop, token);
  shopData.email = await checkEmail(shop, token);
  shopData.status = await checkDevShop(shop, token);

  /** destructuring before push */
  const { themeId, email, status } = shopData;

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
          themeId,
          email,
          installDate: new Date(),
          lastUpdate: new Date(),
          trialDays: 7,
          status
        };
        pushTopic(PS_TOPIC, PS_APP, shop, token, themeId);
        return pushDB(COLLECTION, shop, newData);
      }

      /** Document exist in the database so we update */
      console.log("DOCUMENT EXIST");
      const addData = {
        token,
        themeId,
        email,
        lastUpdate: new Date(),
        status
      };
      pushDB(COLLECTION, shop, addData);
      return addData;
    })
    .catch(err => {
      console.log("error getting document", err);
    });
  return shopData;
};
