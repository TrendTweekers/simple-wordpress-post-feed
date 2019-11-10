const {
  checkTheme,
  checkEmailId,
  checkDevShop
} = require("../lib/shopify/functions");
const { getFs, writeFs } = require("../lib/firebase/firebase");
const { pushTopic } = require("../lib/pubsub/pubsub");
const config = require("../config/config");

const { PS_TOPIC, PS_APP } = config;

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

  shopData.theme = await checkTheme(shop, token);
  const emailId = await checkEmailId(shop, token);
  shopData.email = emailId.email;
  shopData.id = emailId.id;
  shopData.development = await checkDevShop(shop, token);

  // destructuring values
  const { theme, email, development, id } = shopData;

  // construction values for DB
  const newData = {
    shop,
    id,
    token,
    theme: theme,
    email,
    installDate: new Date(),
    lastUpdate: new Date(),
    trial: 7,
    development
  };
  console.log("NEW DATA");
  console.log(newData);

  // push to DB
  await writeFs(PS_APP, shop, newData);
  // push to pub/sub
  await pushTopic(PS_TOPIC, PS_APP, shop, theme.toString(), token, "install");

  return shopData;
};
