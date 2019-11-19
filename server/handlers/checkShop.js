const {
  checkTheme,
  checkEmailId,
  checkDevShop
} = require("../lib/shopify/functions");
const { getFs, writeFs } = require("../lib/firebase/firebase");
const { pushTopic } = require("../lib/pubsub/pubsub");
const config = require("../config/config");
const { createWebhook } = require("./createWebhook");
const { PS_TOPIC, PS_APP, TUNNEL_URL, APP } = config;

/** Fetch shop data and push DB
 * @param {string} shop
 * @param {string} accessToken
 */

const checkShop = async (shop, token) => {
  // init values
  const shopData = {
    theme: "",
    email: "",
    active: "",
    development: "",
    id: "",
    name: ""
  };

  shopData.theme = await checkTheme(shop, token);
  const emailId = await checkEmailId(shop, token);
  shopData.email = emailId.email;
  shopData.id = emailId.id;
  shopData.name = emailId.name;
  shopData.development = await checkDevShop(shop, token);

  // destructuring values
  const { theme, email, development, id, name } = shopData;

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
    development
  };
  console.log("NEW DATA");
  console.log(newData);
  // push to DB
  await writeFs(PS_APP, shop, newData);
  await pushTopic(PS_TOPIC, PS_APP, shop, theme.toString(), token, "install");
  createWebhook(
    `${TUNNEL_URL}/${APP}/uninstall`,
    "APP_UNINSTALLED",
    token,
    shop
  );
  return shopData;
};
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
    active: "",
    development: "",
    id: "",
    chargeID: "",
    plan: ""
  };

  shopData.theme = await checkTheme(shop, token);
  const emailId = await checkEmailId(shop, token);
  shopData.email = emailId.email;
  shopData.id = emailId.id;
  shopData.name = emailId.name;
  shopData.development = await checkDevShop(shop, token);

  // destructuring values
  const { theme, email, development, id, name, plan } = shopData;

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
    development,
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

module.exports.checkShop = checkShop;
module.exports.initShop = initShop;
