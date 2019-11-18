const { db, getFs, getSettings } = require("../lib/firebase/firebase");
const config = require("../config/config");
const { pushTopic } = require("../lib/pubsub/pubsub");

const { APP, PS_TOPIC } = config;

/** Getting all the data from DB
 * @param  {context} ctx
 */
const getData = async ctx => {
  const { shop, action } = await ctx.request.query;

  console.log(`GET DATA LOG ${shop} and ${action}`);

  /** Checking version in settings DB */
  const settings = await getSettings(APP);
  const fsData = await getFs(APP, shop);

  let disableUpdate = true;
  if (fsData.version !== settings.version) {
    disableUpdate = false;
  }

  const data = {
    version: fsData.version,
    latestVersion: settings.version,
    clean: fsData.clean,
    disableUpdate
  };
  console.log("LOGGING FS DATA FROM ROUTE");
  ctx.body = data;
  return data;
};

/** This is for shopify to redact everything GDPR mandatory webhook
 * @param  {context} ctx
 */
const redact = async ctx => {
  console.log(`Redact  route ran by shopify GDPR`);
  const { shop_domain, shop_id } = await ctx.request.body;
  const shopData = await getFs(APP, shop_domain);
  const action = "uninstall";
  if (shopData) {
    pushTopic(
      PS_TOPIC,
      APP,
      shop_domain,
      shopData.theme.toString(),
      shopData.token,
      action
    );
    ctx.status = 200;
  } else {
    ctx.respond = false;
    ctx.res.statusCode = 404;
  }
};

/** This is for our own webhook for uninstall, triggered after hitting uninstall from admin panel
 * @param  {context} ctx
 */
const uninstall = async ctx => {
  console.log(`Uninstall webhook ran`);
  const action = "uninstall";
  const { myshopify_domain } = await ctx.request.body;
  const shopData = await getFs(APP, myshopify_domain);
  if (shopData) {
    pushTopic(
      PS_TOPIC,
      APP,
      myshopify_domain,
      shopData.theme.toString(),
      shopData.token,
      action
    );
    ctx.status = 200;
  } else {
    console.log(`shop is not in our db ${myshopify_domain}`);
    ctx.respond = false;
    ctx.res.statusCode = 200;
  }
};

/** Multipurpose route
 * @param  {context} ctx
 * @param {shop}
 * @param {action}
 */
const update = async ctx => {
  const { shop, action } = await ctx.request.body;
  console.log(`${action} section route ran`);
  const shopData = await getFs(APP, shop);
  if (shopData) {
    pushTopic(
      PS_TOPIC,
      APP,
      shop,
      shopData.theme.toString(),
      shopData.token,
      action
    );
    ctx.status = 200;
  } else {
    console.log(`shop is not in our db ${shop}`);
    ctx.respond = false;
    ctx.status = 404;
  }
};

module.exports.getData = getData;
module.exports.redact = redact;
module.exports.uninstall = uninstall;
module.exports.update = update;
