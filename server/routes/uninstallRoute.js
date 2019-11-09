/** Creating webhook for uninstall */
// //////////////////////////////////
const { pushDB, db } = require("../lib/firebase/firebase");
const config = require("../config/config");

const { COLLECTION } = config;

/** Changins status in DB to DELETED
 * @param  {context} ctx
 */
exports.uninstallRoute = async ctx => {
  const action = "uninstall";
  console.log(`UnInstall section route ran`);
  const { shop } = await ctx.session;

  const shopRef = db.collection(COLLECTION).doc(shop);

  const getDoc = await shopRef
    .get()
    .then(async doc => {
      if (doc.exists) {
        const docu = doc.data();
        const { token, theme } = docu;
        pushTopic(shop, theme, token, action);
        pushDB(COLLECTION, shop, { script: true });
        return { success: "OK" };
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

  return "success";
};
