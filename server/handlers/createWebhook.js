const {default: Shopify} = require("@shopify/shopify-api");
import config from "../config/config";


const { API_VERSION } = config;

/** Create webhook for the shop
 * @param  {string} shop
 * @param  {string} token
 * @param  {string} topic
 * @param  {string} address
 */

const createWebhook = async (address, topic, accessToken, shop) => {
  const registration = await Shopify.Webhooks.Registry.register({
    path: address,
    topic,
    accessToken,
    shop,
    apiVersion: API_VERSION,
  });
  if (registration[topic].success) {
    console.log(`Successfully registered webhook for #${topic} --- ${shop}`);
  } else {
    console.log("Failed to register webhook", registration[topic].result);
  }
};

module.exports = createWebhook;
