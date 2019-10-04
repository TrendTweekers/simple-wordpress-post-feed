const { db } = require("../lib/firebase/firebase");
const config = require("../config/config");

const { COLLECTION } = config;

/** Getting all the data from DB
 * @param  {context} ctx
 */
exports.getRoute = async ctx => {
  const { shop } = await ctx.session;

  const shopRef = db.collection(COLLECTION).doc(shop);

  const getDoc = await shopRef
    .get()
    .then(async doc => {
      if (doc.exists) {
        console.log("doc exist .... checkstore ran from getroute");
        const docu = doc.data();
        // console.log(docu);

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
