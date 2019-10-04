const { checkTheme, checkEmail } = require("../lib/shopify/functions");
const { getShop, pushDB } = require("../lib/firebase/firebase");
const config = require("../config/config");

const { COLLECTION } = config;

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
