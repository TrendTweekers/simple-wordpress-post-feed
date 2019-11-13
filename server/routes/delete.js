const { db, getFs } = require("../lib/firebase/firebase");
const { pushTopic } = require("../lib/pubsub/pubsub");
const config = require("../config/config");

const { APP, PS_TOPIC } = config;

/** Getting all the data from DB
 * @param  {context} ctx
 */
exports.delete = async ctx => {
  const { shop, action } = await ctx.request.query;
  const shopData = await getFs(APP, shop);
  console.log(`Delete section route ran`);
  pushTopic(
    PS_TOPIC,
    APP,
    shop,
    shopData.theme.toString(),
    shopData.token,
    action
  );
  ctx.body = { updated: true };
};
