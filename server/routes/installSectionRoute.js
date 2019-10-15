const { PubSub } = require("@google-cloud/pubsub");
const { db } = require("../lib/firebase/firebase");
const config = require("../config/config");

const pubsub = new PubSub();

const { COLLECTION } = config;

/** Getting all the data from DB
 * @param  {context} ctx
 */
exports.installSectionRoute = async ctx => {
  const { shop } = await ctx.session;

  const topicName = "shopify";

  const shopRef = db.collection(COLLECTION).doc(shop);

  const getDoc = await shopRef
    .get()
    .then(async doc => {
      if (doc.exists) {
        console.log("doc exist .... checkstore ran from installSectionRoute");
        const docu = await doc.data();
        console.log(docu);

        // Add two custom attributes, origin and username, to the message
        const customAttributes = {
          app: "shopifyWordpress",
          shop,
          token: docu.token,
          mainThemeId: `${docu.themeId}`,
          scriptTag: "scriptTag"
        };

        const data = Buffer.from("Hello, world!");
        console.log(customAttributes);
        const messageId = await pubsub
          .topic(topicName)
          .publish(data, customAttributes);
        console.log(`Message ${messageId} published.`);
        // /
        return docu.email;
      }
      console.log("doc not exist ....");
      ctx.response.status = 404;
      console.log(`error getting document ${shop}`);
      return { error: "no document, app was not installed correctly" };
    })
    .catch(err => {
      console.log(`error getting document ${shop}, ${err}`);
    });

  ctx.body = getDoc;
};
