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
  let storeData = {
    mainThemeId: "",
    email: ""
  };

  storeData.mainThemeId = await checkTheme(shop, accessToken); // fetch theme ID
  storeData.email = await checkEmail(shop, accessToken);

  const { mainThemeId, email } = storeData; // destructuring before push

  console.log("CHECKSTORE");
  async function getSnapshot() {
    const snapshot = await getShop(COLLECTION, shop);
    return snapshot;
  }

  getSnapshot()
    .then(snapshot => {
      const dbData = snapshot;
      if (dbData === false) {
        console.log("DOCUMENT DONT EXIST");
        const newData = {
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
      console.log("DOCUMENT EXIST");
      /* Check if something was not deleted from Shopify and existing in DB */
      // console.log(dbData);
      const addData = {
        shop,
        token: accessToken,
        themeId: mainThemeId,
        email,
        lastUpdate: new Date(),
        status: "ACTIVE"
      };
      console.log("update data");
      pushDB(COLLECTION, shop, addData);
      return addData;
    })
    .catch(err => {
      console.log("error getting document", err);
    });
  return storeData;
};
