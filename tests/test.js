// const { PubSub } = require("@google-cloud/pubsub");
// const { getFs } = require("./../server/lib/firebase/firebase")
// const { getSubscriptionStatus } = require("./../server/lib/firebase/getSubscriptionStatus")
const { pushTopic } = require("./../server/lib/pubsub/pubsub");

// const serviceAccount = require("./pluginmaker-955a081d0d03.json");

// console.log(serviceAccount);

// const projectId = 'pluginmaker';
// const pubsub = new PubSub();

// /**
//  * Push message to pub/sub topic
//  * @param {string} app - trigger "app" cloudfunction
//  * @param {string} shop - Shop url
//  * @param {string} token - Shop token
//  * @param {number} theme - Shop theme ID
//  * @param {string} tag - ScriptTag
//  */
// const pushTopic = async (app, shop, token, theme, tag) => {
//   const topic = "shopify";
//   const attributes = {
//     app,
//     shop,
//     token,
//     theme: `${theme}`,
//     scriptTag: tag
//   };
//   const data = Buffer.from("Hello, world11!");
//   console.log(attributes);
//   const messageId = await pubsub.topic(topic).publish(data, attributes);
//   console.log(`Message ${messageId} published.`);
//   const msg = await getFs('swpf', 'stacked-demo-1.myshopify.com');
//   console.log(msg);
// };

// pushTopic("123", "123", "123", "123", "123");
const cat = async () => {
  // const msg = await getSubscriptionStatus('swpf', 'nostore')

  await pushTopic(
    "shopify",
    "swpf",
    "brbp-theme-assets-development-store.myshopify.com",
    "7904231428",
    "b3d86a15d2c98742c6b0db3e1626909c",
    "install"
  );
  // const storeDB = await getFs('swpf', 'stacked-demo-1.myshopify.com')
  // if (storeDB) {

  //   console.log(storeDB)
  //   return storeDB;
  // } else {
  //   console.log('no storeDB')
  //   return;
  // }

  // return storeDB;
};

const cat3 = async () => {
  await console.log(cat());
};
cat3();

//
