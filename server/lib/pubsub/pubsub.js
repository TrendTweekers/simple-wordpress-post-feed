const { PubSub } = require("@google-cloud/pubsub");

const pubsub = new PubSub();

/**
 * Push message to pub/sub topic
 * @param {string} app - trigger "app" cloudfunction
 * @param {string} shop - Shop url
 * @param {string} token - Shop token
 * @param {number} themeid - Shop theme ID
 * @param {string} tag - ScriptTag
 */
const pushTopic = async (topic, app, shop, token, themeId) => {
  console.log(`Pushed topic by >>> ${shop}`);
  const attributes = {
    app,
    shop,
    token,
    theme: `${themeId}`
  };
  const data = Buffer.from("Hello, world!");
  console.log(attributes);
  const messageId = await pubsub.topic(topic).publish(data, attributes);
  console.log(`Message ${messageId} published.`);
};

module.exports.pushTopic = pushTopic;
