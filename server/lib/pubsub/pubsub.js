const { PubSub } = require("@google-cloud/pubsub");
const config = require("../../config/config");
const { COLLECTION, PS_APP, PS_TOPIC } = config;

const pubsub = new PubSub();

/**
 * Push message to pub/sub topic
 * @param {string} shop - Shop url
 * @param {number} theme - Shop theme ID
 * @param {string} token - Shop token
 * @param {number} action - Shop theme ID
 */
const pushTopic = async (shop, theme, token, action) => {
  console.log(`Pushed topic by >>> ${shop}`);
  const attributes = {
    PS_APP,
    shop,
    theme: `${theme}`,
    token,
    action
  };
  const data = Buffer.from("shopify");
  console.log(attributes);
  const messageId = await pubsub.topic(PS_TOPIC).publish(data, attributes);
  console.log(`Message ${messageId} published.`);
};

module.exports.pushTopic = pushTopic;
