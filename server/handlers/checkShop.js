const { checkTheme, checkEmailId } = require("../lib/shopify/functions");
const { writeFs } = require("../lib/firebase/firebase");
const config = require("../config/config");
const { PS_APP } = config;

/**Shop initialization with charge id
 * @param  {} shop
 * @param  {} token
 * @param  {} chargeID
 */
const initShop = async (shop, token, chargeID, confirmationUrl) => {
  // init values
  const shopData = {
    theme: "",
    email: "",
    id: "",
    chargeID: "",
    plan: ""
  };

  shopData.theme = await checkTheme(shop, token);
  const emailId = await checkEmailId(shop, token);
  shopData.email = emailId.email;
  shopData.id = emailId.id;
  shopData.name = emailId.name;

  // destructuring values
  const { theme, email, id, name, plan } = shopData;

  // construction values for DB
  const newData = {
    shop,
    id,
    token,
    theme: theme,
    email,
    name,
    installDate: new Date(),
    lastUpdate: new Date(),
    trial: 7,
    chargeID,
    confirmationUrl,
    plan: plan
  };
  console.log("NEW DATA");
  console.log(newData);

  // push to DB
  await writeFs(PS_APP, shop, newData);
  // push to pub/sub

  return shopData;
};

module.exports.initShop = initShop;
