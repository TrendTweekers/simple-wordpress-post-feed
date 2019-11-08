const { db, getShop } = require("../lib/firebase/firebase");
const config = require("../config/config");

const { COLLECTION } = config;

/** Getting all the data from DB
 * @param  {context} ctx
 */
exports.getRoute = async ctx => {
  const { shop } = await ctx.session;

  const shopRef = db.collection(COLLECTION).doc(shop);
  /** Checking version in settings DB */
  const { version } = await getShop("settings", COLLECTION);
  console.log(version);

  const getDoc = await shopRef
    .get()
    .then(doc => {
      if (doc.exists) {
        console.log("doc exist .... ");
        const docu = doc.data();
        const docuversion = docu.version;
        console.log(docuversion);
        const dataObj = { script };
        return dataObj;
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
