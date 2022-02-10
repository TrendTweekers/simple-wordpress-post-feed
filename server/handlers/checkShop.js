const {
  checkTheme,
  checkEmailId,
  createMetafield,
} = require("../lib/shopify/functions");
const { writeFs } = require("../lib/firebase/firebase");
const { pushTopic } = require("../lib/pubsub/pubsub");
const config = require("../config/config");

const { APP } = config;

/** Shop initialization with charge id
 * @param  {} shop
 * @param  {} token
 * @param  {} chargeID
 * @param  {} confirmationUrl
 */
const initShop = async (shop, token, chargeID, confirmationUrl) => {
  console.log('!!initShop function!!')
  // init values
  const shopData = {
    theme: "",
    email: "",
    id: "",
    chargeID: "",
    plan: "",
  };

  shopData.theme = await checkTheme(shop, token);
  const emailId = await checkEmailId(shop, token);
  createMetafield(shop,token);
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
    theme,
    email,
    name,
    installDate: new Date(),
    lastUpdate: new Date(),
    trial: 7,
    chargeID,
    confirmationUrl,
    plan,
  };
  console.log("NEW DATA");
  console.log(newData);

  // push to DB
  await writeFs(APP, shop, newData);
  // push to pub/sub
  pushTopic(shop, theme.toString(), token, "enable");
  return shopData;
};

module.exports.initShop = initShop;
