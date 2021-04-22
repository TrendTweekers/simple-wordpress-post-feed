/* eslint-disable babel/camelcase */
const {default: Shopify, ApiVersion} = require("@shopify/shopify-api");

const {getFs, getSettings, writeFs} = require("../lib/firebase/firebase");
const {checkTheme} = require("../lib/shopify/functions");
const config = require("../config/config");
const {pushTopic} = require("../lib/pubsub/pubsub");
const {
  checkCharge,
  checkDevShop,
  deleteCharge,
} = require("../lib/shopify/functions");
const getSubscriptionUrl = require("../handlers/getSubscriptionUrl");
const getSubscriptionUrl_LongTrial = require("../handlers/getSubscriptionUrl_LongTrial");
const getSubscriptionUrlDEV = require("../handlers/getSubscriptionUrlDEV");

const {APP, TUNNEL_URL} = config;

/** Getting all the data from DB
 * @param  {context} ctx
 */
const getData = async (ctx) => {
  const {shop, action} = await ctx.request.query;

  console.log(`GET DATA LOG ${shop} and ${action}`);

  /** Checking version in settings DB */
  const settings = await getSettings(APP);
  const fsData = await getFs(APP, shop);

  let disableUpdate = true;
  if (fsData.version !== settings.version && fsData.version !== undefined) {
    disableUpdate = false;
  }
  const data = {
    version: fsData.version,
    latestVersion: settings.version,
    clean: fsData.clean,
    theme: fsData.theme,
    disableUpdate,
  };
  if (data.version === undefined) {
    data.version = settings.version;
  }

  console.log("LOGGING FS DATA FROM ROUTE");
  ctx.body = data;
  return data;
};

/** This is for shopify to redact everything GDPR mandatory webhook
 * @param  {context} ctx
 */
const redact = async (ctx) => {
  const {shop_domain, shop_id} = await ctx.request.body;
  console.log(`Redact  route ran by shopify GDPR for ${shop_domain}`);
  const shopData = await getFs(APP, shop_domain);
  const action = "uninstall";
  if (shopData) {
    pushTopic(shop_domain, shopData.theme.toString(), shopData.token, action);
    ctx.body = {};
  } else {
    console.log(`Shop is already not in DB ${shop_domain}`);
    ctx.body = {};
  }
};

/** This is for shopify to redact customer GDPR mandatory webhook
 * @param  {context} ctx
 */
const customerRedact = async (ctx) => {
  console.log(`Customer Redact  route ran by shopify GDPR`);
  const action = "data-erasure";
  const {shop_domain, shop_id} = await ctx.request.body;
  const shopData = await getFs(APP, shop_domain);
  if (shopData) {
    console.log(`Shop is in DB`);
    pushTopic(shop_domain, shopData.theme.toString(), shopData.token, action);
    ctx.body = {};
  } else {
    console.log(`Shop is NOT in DB`);
    ctx.body = {};
  }
};

/** This is for shopify to get customer DATA GDPR mandatory webhook
 * @param  {context} ctx
 */
const customerData = async (ctx) => {
  console.log(`customer data  route ran by shopify GDPR`);
  const action = "data-request";
  const {shop_domain, shop_id} = await ctx.request.body;
  const shopData = await getFs(APP, shop_domain);
  if (shopData) {
    console.log(`shop is in DB`);
    pushTopic(shop_domain, shopData.theme.toString(), shopData.token, action);
    ctx.body = {shopData};
  } else {
    console.log(`shop is NOT in DB`);
    ctx.body = {};
  }
};

/** This is for our own webhook for uninstall, triggered after hitting uninstall from admin panel
 * @param  {context} ctx
 */
const uninstall = async (ctx) => {
  try {
    const {myshopify_domain} = await ctx.request.body;
    console.log(`Uninstall webhook ran ${myshopify_domain}`);
    const shopData = await getFs(APP, myshopify_domain);
    const action = "uninstall";
    if (shopData) {
      pushTopic(
        myshopify_domain,
        shopData.theme.toString(),
        shopData.token,
        action,
      );
      ctx.response.status = 200;
    } else {
      console.log(`shop is not in our db ${myshopify_domain}`);
    }
  } catch (error) {
    console.log(`Failed to process webhook: ${error}`);
  }
};

/** Multipurpose route
 * @param  {context} ctx
 * @param {shop}
 * @param {action}
 */
const update = async (ctx) => {
  const {shop, action} = await ctx.request.body;
  console.log(`${action} section route ran`);
  const shopData = await getFs(APP, shop);
  if (shopData) {
    pushTopic(shop, shopData.theme.toString(), shopData.token, action);
    ctx.status = 200;
  } else {
    console.log(`update but shop is not in our db ${shop}`);
  }
};

/** Auth + Install route that run at first time, and each time somebody start the app
 * @param  {string} shop
 * @param {string} action
 * @return {object} allowed:boolean and confirmationUrl:string
 */
const install = async (ctx) => {
  const {shop, action} = await ctx.request.query;
  console.log(`${action} section route ran`);
  const shopData = await getFs(APP, shop);
  const {token, chargeID, plan, theme} = shopData;
  const activeCharge = await checkCharge(shop, token, chargeID);
  const development = await checkDevShop(shop, token);
  const currentTheme = await checkTheme(shop, token);
  const returnUrl = `${TUNNEL_URL}?shop=${shop}`;

  /** Always checking if the current theme is the same as in the DB */
  if (theme !== currentTheme) {
    writeFs(APP, shop, {theme: currentTheme});
  }

  /** Runs only first time when someone log in and plan is active */
  if (activeCharge && plan === "") {
    if (development) {
      shopData.plan = "developer";
    } else {
      shopData.plan = "basic";
    }
    pushTopic(shop, shopData.theme.toString(), shopData.token, action);
    ctx.status = 200;
    const plan = {plan: shopData.plan};
    await writeFs(APP, shop, plan);
    ctx.body = {allowed: true};
  } else if (shopData.longTrial) {

    /** Longer trial for winners */

    deleteCharge(shop, token, chargeID);
    const confirmationUrl = await getSubscriptionUrl_LongTrial(
      ctx,
      token,
      shop,
      returnUrl,
      true,
      false,
    );
    const longTrial = {longTrial: false};

    await writeFs(APP, shop, longTrial);
    ctx.body = {allowed: false, confirmationUrl};
  } else if (activeCharge) {
    ctx.body = {allowed: true};
  } else if (development) {

      /** Runs when its dev store */
    const confirmationUrl = await getSubscriptionUrlDEV(
        ctx,
        token,
        shop,
        returnUrl,
        true,
        false,
      );
    ctx.body = {allowed: false, confirmationUrl};
  } else {

      /** Runs when its normal store */
    const confirmationUrl = await getSubscriptionUrl(
        ctx,
        token,
        shop,
        returnUrl,
        true,
        false,
      );
    ctx.body = {allowed: false, confirmationUrl};
  }
};

module.exports.getData = getData;
module.exports.redact = redact;
module.exports.uninstall = uninstall;
module.exports.update = update;
module.exports.install = install;
module.exports.customerRedact = customerRedact;
module.exports.customerData = customerData;
