const { PubSub } = require("@google-cloud/pubsub");

const pubsub = new PubSub();

/**
 * Push message to pub/sub topic
 * @param {string} app - trigger "app" cloudfunction
 * @param {string} shop - Store url
 * @param {string} token - Store token
 * @param {number} theme - Store theme ID
 * @param {string} tag - ScriptTag
 */
const pushTopic = async (app, shop, token, theme, tag) => {
  const topic = "shopify";
  const attributes = {
    app,
    shop,
    token,
    mainThemeId: `${theme}`,
    scriptTag: tag
  };
  const data = Buffer.from("Hello, world!");
  console.log(attributes);
  const messageId = await pubsub.topic(topic).publish(data, attributes);
  console.log(`Message ${messageId} published.`);
};

module.exports.pushTopic = pushTopic;
