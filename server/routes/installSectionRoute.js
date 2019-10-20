const { db, pushDB } = require("../lib/firebase/firebase");
const { pushTopic } = require("../lib/pubsub/pubsub");
const config = require("../config/config");

const { COLLECTION } = config;

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
        console.log("doc exist .... checkstore ran from installSectionRoute");
        const docu = await doc.data();
        const { script } = docu;

        if (script) {
          pushTopic("shopifyWordpress", shop, docu.token, docu.themeId, "");
        } else {
          pushTopic(
            "shopifyWordpress",
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
