const { db, getFs } = require("../lib/firebase/firebase");
const { pushTopic } = require("../lib/pubsub/pubsub");
const config = require("../config/config");

const { APP, PS_TOPIC } = config;

/** Getting all the data from DB
 * @param  {context} ctx
 */
exports.delete = async ctx => {
  const action = "delete";
  const { shop } = await ctx.session;
  const shopData = await getFs(APP, shop);
  console.log(`Update section route ran`);
  console.log(ctx.session);
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
