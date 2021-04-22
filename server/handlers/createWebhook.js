const {default: Shopify, ApiVersion} = require("@shopify/shopify-api");

/** Create webhook for the shop
 * @param  {string} shop
 * @param  {string} token
 * @param  {string} topic
 * @param  {string} address
 */

const createWebhook = async (address, topic, accessToken, shop) => {
  const registration = await Shopify.Webhooks.Registry.register({
    shop,
    accessToken,
    path: address,
    topic,
    apiVersion: ApiVersion.October20,
  });
  if (registration.success) {
    console.log(`Successfully registered webhook for #${topic} --- ${shop}`);
  } else {
    console.log("Failed to register webhook", registration.result);
  }
};

module.exports = createWebhook;
