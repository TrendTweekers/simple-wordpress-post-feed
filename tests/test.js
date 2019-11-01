const { PubSub } = require("@google-cloud/pubsub");

// const serviceAccount = require("./pluginmaker-955a081d0d03.json");

// console.log(serviceAccount);

// const projectId = 'pluginmaker';
const pubsub = new PubSub();

/**
 * Push message to pub/sub topic
 * @param {string} app - trigger "app" cloudfunction
 * @param {string} shop - Shop url
 * @param {string} token - Shop token
 * @param {number} theme - Shop theme ID
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
  const data = Buffer.from("Hello, world11!");
  console.log(attributes);
  const messageId = await pubsub.topic(topic).publish(data, attributes);
  console.log(`Message ${messageId} published.`);
};

pushTopic("123", "123", "123", "123", "123");
