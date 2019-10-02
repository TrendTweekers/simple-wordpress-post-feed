import { registerWebhook } from "@shopify/koa-shopify-webhooks";
const env = require("../config/config");
const { GRAPHQL_VERSION } = env;

/**Create webhook for the shop
 * @param  {string} shop
 * @param  {string} accessToken
 * @param  {string} topic
 * @param  {string} address
 */

exports.createWebhook = async (address, topic, accessToken, shop) => {
  const registration = await registerWebhook({
    address,
    topic: "APP_UNINSTALLED",
    accessToken,
    shop,
    apiVersion: GRAPHQL_VERSION
  });
  if (registration.success) {
    console.log(`Successfully registered webhook for #${topic} --- ${shop}`);
  } else {
    console.log("Failed to register webhook", registration.result);
  }
};
