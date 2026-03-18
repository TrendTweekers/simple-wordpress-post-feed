const {PubSub} = require("@google-cloud/pubsub");

const env = require("../../config/config");

const {PS_TOPIC, APP} = env;

// Reuse the same service account key Railway already has for Firebase.
// new PubSub() with no args relies on ADC which is not available on Railway.
let pubsub;
try {
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : null;
  pubsub = sa
    ? new PubSub({
        projectId: sa.project_id,
        credentials: { client_email: sa.client_email, private_key: sa.private_key },
      })
    : new PubSub();
} catch (err) {
  console.error("PubSub credentials init error:", err);
  pubsub = new PubSub();
}

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
    app: APP,
    shop,
    theme,
    token,
    action,
  };
  const data = Buffer.from("shopify");
  console.log(attributes);
  const messageId = await pubsub.topic(PS_TOPIC).publish(data, attributes);
  console.log(`Message ${messageId} published.`);
};

module.exports.pushTopic = pushTopic;
