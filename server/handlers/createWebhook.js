const { registerWebhook } = require("@shopify/koa-shopify-webhooks");

const env = require("../config/config");

const { GRAPHQL_VERSION } = env;

/** Create webhook for the shop
 * @param  {string} address
 * @param  {string} topic
 * @param  {string} token
 * @param  {string} shop
 */

exports.createWebhook = async (address, topic, accessToken, shop) => {
  const registration = await registerWebhook({
    address,
    topic,
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
