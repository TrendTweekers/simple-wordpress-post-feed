const myModule = require("../firebase/firebase");
const config = require("../../server/config/config");

const { COLLECTION } = config;

const db = myModule.FStore.firestore();
const { API_VERSION } = config;

// // Deleting stored data for shop(liquid file in the snippets brbp.liquid )
module.exports = async ctx => {
  const { shop_domain } = ctx.request.body;
  const shopRef = await db.collection(COLLECTION).doc(shop_domain);
  const request = await shopRef
    .get()
    .then(doc => {
      if (doc.exists) {
        const docu = doc.data();

        const url = `https://${docu.shop}/admin/api/${API_VERSION}/themes/${docu.themeId}/assets.json?asset[key]=snippets/brbp.liquid`;

        fetch(url, {
          method: "DELETE",
          headers: {
            "X-Shopify-Access-Token": docu.token
          }
        });
        console.log("application was uninstalled file deleted for ", docu.shop);
        ctx.response.status = 200;
        // ESLINT FIX ( added return statement)
        return "application was uninstalled";
      }
      ctx.response.status = 404;
      console.log(`error getting document for delete => ${shop_domain}`);
      return "Error getting document for deletion";
    })
    .catch(err => {
      ctx.response.status = 404;
      console.log(`error deleting document ${shop}`, err);
      return "Error deleting document";
    });
  ctx.body = request;
};
