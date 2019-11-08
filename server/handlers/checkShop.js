const {
  checkTheme,
  checkEmailId,
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
    development: "",
    id: ""
  };
  const action = "install";

  shopData.theme = await checkTheme(shop, token);
  const emailId = await checkEmailId(shop, token);
  shopData.email = emailId.email;
  shopData.id = emailId.id;
  shopData.development = await checkDevShop(shop, token);

  /** destructuring before push */
  const { theme, email, development, id } = shopData;

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
          id,
          token,
          theme,
          email,
          installDate: new Date(),
          lastUpdate: new Date(),
          trialDays: 7,
          development,
          active: !development
        };
        console.log(newData);
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
