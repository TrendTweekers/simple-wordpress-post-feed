const { db, pushDB } = require("../lib/firebase/firebase");
const { pushTopic } = require("../lib/pubsub/pubsub");
const config = require("../config/config");

const { COLLECTION, PS_APP, PS_TOPIC } = config;

/** Getting all the data from DB
 * @param  {context} ctx
 */
exports.installSectionRoute = async ctx => {
  const { shop } = await ctx.session;

  const shopRef = db.collection(COLLECTION).doc(shop);

  const getDoc = await shopRef
    .get()
    .then(async doc => {
      if (doc.exists) {
        const docu = await doc.data();
        const { script } = docu;

        if (script) {
          pushTopic(PS_TOPIC, PS_APP, shop, docu.token, docu.themeId, "");
        } else {
          pushTopic(
            PS_TOPIC,
            PS_APP,
            shop,
            docu.token,
            docu.themeId,
            "scriptTag"
          );

          pushDB(COLLECTION, shop, { script: true });
        }

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
