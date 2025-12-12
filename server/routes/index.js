/* eslint-disable require-atomic-updates */
/* eslint-disable babel/camelcase */

const { getFs, getSettings, writeFs } = require("../lib/firebase/firebase");
const { checkTheme } = require("../lib/shopify/functions");
const config = require("../config/config");
const { pushTopic } = require("../lib/pubsub/pubsub");
const {
  checkCharge,
  checkDevShop,
  deleteCharge,
  supportBlocks,
} = require("../lib/shopify/functions");
const {
  getMultipleMetafields,
  updateMetafield,
  createMetafield,
  deleteMetafield,
} = require("../lib/shopify/metafields");
const getSubscriptionUrl = require("../handlers/getSubscriptionUrl");
const getSubscriptionUrlLongTrial = require("../handlers/getSubscriptionUrlLongTrial");
const getSubscriptionUrlDEV = require("../handlers/getSubscriptionUrlDEV");

const { APP, TUNNEL_URL } = config;

/** Getting all the data from DB
 * @param  {context} ctx
 */
const getData = async (ctx) => {
  try {
    const referer = new URLSearchParams(ctx.request.header.referer);
    const shop = referer.get("shop");
    const host = ctx.query.host || new URLSearchParams(ctx.request.header.referer).get("host");
    console.log(`GET DATA LOG ${shop}`);

    /** Checking version in settings DB */
    const settings = await getSettings(APP);
    const fsData = await getFs(APP, shop);
    const token = fsData?.token || null;
    const theme = fsData?.theme || null;
    
    if (!token) {
      ctx.status = 401;
      ctx.body = {
        ok: false,
        code: "SHOPIFY_AUTH_REQUIRED",
        shop: shop || null,
        message: "No access token found for shop",
        reauthUrl: `/install/auth?shop=${encodeURIComponent(shop || '')}&host=${encodeURIComponent(host || '')}`
      };
      return;
    }
    
    const support = await supportBlocks(shop, token);

    let disableUpdate = true;
    if (fsData?.version !== settings?.version && fsData?.version !== undefined) {
      disableUpdate = false;
    }
    const data = {
      shop,
      version: fsData?.version,
      latestVersion: settings?.version,
      clean: fsData?.clean,
      theme: fsData?.theme,
      disableUpdate,
      longTrial: fsData?.longTrial || false,
      chargeID: fsData?.chargeID || null,
      support,
    };
    if (data.version === undefined) {
      data.version = settings.version;
    }

    console.log("LOGGING FS DATA FROM ROUTE");
    ctx.status = 200;
    ctx.body = data;
    return data;
  } catch (error) {
    // Handle Shopify API errors (403/401)
    const isAxiosError = error.isAxiosError || (error.response && error.response.status);
    const status = error.response?.status;
    const shop = new URLSearchParams(ctx.request.header.referer).get("shop");
    const host = ctx.query.host || new URLSearchParams(ctx.request.header.referer).get("host");
    
    if (isAxiosError && (status === 401 || status === 403)) {
      console.error(`Shopify API ${status} error in /api/data for shop ${shop}:`, error.message);
      ctx.status = 401;
      ctx.body = {
        ok: false,
        code: "SHOPIFY_AUTH_REQUIRED",
        status: status,
        shop: shop || null,
        message: "Shopify token rejected (missing scope or needs reauth).",
        reauthUrl: `/install/auth?shop=${encodeURIComponent(shop || '')}&host=${encodeURIComponent(host || '')}`
      };
      return;
    }
    
    // Other errors
    console.error("Error in /api/data:", error);
    ctx.status = 500;
    ctx.body = {
      ok: false,
      error: "Internal server error",
      message: error.message || "An unexpected error occurred"
    };
  }
};

/** Upload data to metafields!@
 * @param  {context} ctx
 */
const uploadData = async (ctx) => {
  const { settings } = await ctx.request.body;
  const referer = new URLSearchParams(ctx.request.header.referer);
  const shop = referer.get("shop");
  console.log(`Upload data route ran for ${shop}`);
  const fsData = await getFs(APP, shop);
  const token = fsData?.token || null;
  
  if (!token) {
    ctx.status = 401;
    ctx.body = { error: "No access token found for shop" };
    return;
  }

  const lengthOfSettings = Object.keys(settings).length;
  const newData = { ...settings };
  Object.keys(settings).forEach(async (key, i) => {
    const { id, value, type } = settings[key];
    if (id && value !== "") {
      newData[key] = { id, value, type };
      updateMetafield(shop, token, id, value, type);
    }
    if (!id && value !== "") {
      /**Create metafield if it was not existing */
      const { id: newID } = await createMetafield(
        shop,
        token,
        key,
        value,
        type
      );
      newData[key] = { id: newID, value, type };
    }
    if (id && value === "") {
      deleteMetafield(shop, token, id);
      newData[key] = { id: "", value: "", type };
    }
    if (i === lengthOfSettings - 1) {
      console.log(newData);
    }
  });
  ctx.body = settings;
};

/** Upload data to metafields!@
 * @param  {context} ctx
 */
const deleteAllMeta = async (ctx) => {
  const { settings } = await ctx.request.body;
  const referer = new URLSearchParams(ctx.request.header.referer);
  const shop = referer.get("shop");
  console.log(`Delete all meta ${shop}`);
  const fsData = await getFs(APP, shop);
  const token = fsData?.token || null;
  
  if (!token) {
    ctx.status = 401;
    ctx.body = { error: "No access token found for shop" };
    return;
  }

  const lengthOfSettings = Object.keys(settings).length;
  const deletePromise = new Promise((resolve, reject) => {
    const newData = { ...settings };
    Object.keys(settings).forEach(async (key, i) => {
      const { id, type } = settings[key];
      if (id) {
        deleteMetafield(shop, token, id);
        newData[key] = { id: "", value: "", type };
      }
      if (i === lengthOfSettings - 1) {
        resolve(newData);
      }
    });
  });
  deletePromise.then((deletedData) => {
    console.log("promise finished");
    console.log(deletedData);
    return (ctx.body = deletedData);
  });
};

/** This is for shopify to redact everything GDPR mandatory webhook
 * @param  {context} ctx
 */
const redact = async (ctx) => {
  const { shop_domain, shop_id } = await ctx.request.body;
  console.log(`Redact  route ran by shopify GDPR for ${shop_domain}`);
  const shopData = await getFs(APP, shop_domain);
  const action = "uninstall";
  if (shopData) {
    pushTopic(shop_domain, shopData.theme.toString(), shopData.token, action);
  }
  ctx.response.status = 200;
};

/** This is for shopify to redact customer GDPR mandatory webhook
 * @param  {context} ctx
 */
const customerRedact = async (ctx) => {
  console.log(`Customer Redact  route ran by shopify GDPR`);
  const action = "data-erasure";
  const { shop_domain, shop_id } = await ctx.request.body;
  const shopData = await getFs(APP, shop_domain);
  if (shopData) {
    console.log(`Shop is in DB`);
    pushTopic(shop_domain, shopData.theme.toString(), shopData.token, action);
  }
  ctx.response.status = 200;
};

/** This is for shopify to get customer DATA GDPR mandatory webhook
 * @param  {context} ctx
 */
const customerData = async (ctx) => {
  console.log(`customer data  route ran by shopify GDPR`);
  const action = "data-request";
  const { shop_domain, shop_id } = await ctx.request.body;
  const shopData = await getFs(APP, shop_domain);
  if (shopData) {
    console.log(`shop is in DB`);
    pushTopic(shop_domain, shopData.theme.toString(), shopData.token, action);
    ctx.body = { shopData };
  } else {
    console.log(`shop is NOT in DB`);
    ctx.body = { message: "Shop is not in DB" };
  }
};

/** This is for our own webhook for uninstall, triggered after hitting uninstall from admin panel
 * @param  {context} ctx
 */
const uninstall = async (ctx) => {
  try {
    const { myshopify_domain } = await ctx.request.body;
    console.log(`Uninstall webhook ran ${myshopify_domain}`);
    const shopData = await getFs(APP, myshopify_domain);
    const action = "uninstall";
    if (shopData) {
      pushTopic(
        myshopify_domain,
        shopData.theme.toString(),
        shopData.token,
        action
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
  const { shop, action } = await ctx.request.body;
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
 * @param {string} host
 * @return {object} allowed:boolean and confirmationUrl:string
 */
const install = async (ctx) => {
  try {
    const { shop, host } = await ctx.request.query;
    
    if (!shop) {
      ctx.status = 400;
      ctx.body = { error: "Missing shop parameter" };
      return;
    }
    
    const shopData = await getFs(APP, shop);
    
    // Safely extract properties with defaults
    const token = shopData?.token || null;
    const chargeID = shopData?.chargeID || null;
    const plan = shopData?.plan || "";
    const theme = shopData?.theme || null;
    const longTrial = shopData?.longTrial || false;
    
    const activeCharge = await checkCharge(shop, token, chargeID);
    if (activeCharge) {
      const development = await checkDevShop(shop, token);
      const currentTheme = await checkTheme(shop, token);
      const returnUrl = `${TUNNEL_URL}?shop=${shop}&host=${host}`;
      const { newThemeCapable } = await supportBlocks(shop, token);
      const action = newThemeCapable ? "newtheme-install" : "install";
      console.log(`${action} section route ran`);

      /** Always checking if the current theme is the same as in the DB */
      // Only write theme if currentTheme is defined (not undefined)
      if (theme !== currentTheme && currentTheme !== undefined && currentTheme !== null) {
        writeFs(APP, shop, { theme: currentTheme });
      }

      /** Runs only first time when someone log in and plan is active */
      if (activeCharge && plan === "") {
        if (development) {
          shopData.plan = "developer";
        } else {
          shopData.plan = "basic";
        }
        pushTopic(shop, theme.toString(), token, action);

        ctx.status = 200;
        const plan = { plan: shopData.plan };
        await writeFs(APP, shop, plan);
        ctx.body = { allowed: true };
      } else if (activeCharge) {
        ctx.status = 200;
        ctx.body = { allowed: true };
      } else if (longTrial) {
        /** Runs when its normal store and got one year free */
        const confirmationUrl = await getSubscriptionUrlLongTrial(
          ctx,
          token,
          shop,
          returnUrl,
          true,
          false
        );
        ctx.status = 200;
        ctx.body = { allowed: false, confirmationUrl };
      } else if (development) {
        /** Runs when its dev store */
        const confirmationUrl = await getSubscriptionUrlDEV(
          ctx,
          token,
          shop,
          returnUrl,
          true,
          false
        );
        ctx.status = 200;
        ctx.body = { allowed: false, confirmationUrl };
      } else {
        /** Runs when its normal store */
        const confirmationUrl = await getSubscriptionUrl(
          ctx,
          token,
          shop,
          returnUrl,
          true,
          false
        );
        ctx.status = 200;
        ctx.body = { allowed: false, confirmationUrl };
      }
    } else {
      ctx.status = 200;
      ctx.body = { allowed: false, confirmationUrl: `/auth/toplevel?shop=${shop}&host=${host}` };
    }
  } catch (error) {
    // Handle Shopify API errors (axios errors)
    const isAxiosError = error.isAxiosError || (error.response && error.response.status);
    const status = error.response?.status;
    
    if (isAxiosError && (status === 401 || status === 403)) {
      // Shopify token rejected - needs reauth
      const { shop, host } = ctx.request.query;
      console.error(`Shopify API ${status} error for shop ${shop}:`, error.message);
      ctx.status = 401;
      ctx.body = {
        ok: false,
        code: "SHOPIFY_AUTH_REQUIRED",
        status: status,
        shop: shop || null,
        message: "Shopify token rejected (missing scope or needs reauth).",
        reauthUrl: `/install/auth?shop=${encodeURIComponent(shop || '')}&host=${encodeURIComponent(host || '')}`
      };
      return;
    }
    
    // Other errors - return 500 with safe message
    console.error("Error in /api/install:", error);
    ctx.status = 500;
    ctx.body = { 
      ok: false,
      error: "Internal server error",
      message: error.message || "An unexpected error occurred"
    };
  }
};

const cancelCharge = async (ctx) => {
  const { shop, chargeID } = await ctx.request.body;
  const shopData = await getFs(APP, shop);
  const token = shopData?.token || null;
  if (token) {
    deleteCharge(shop, token, chargeID);
  }
  ctx.body = "OK";
};

const downloadMetafield = async (ctx) => {
  const referer = new URLSearchParams(ctx.request.header.referer);
  const shop = referer.get("shop");
  console.log("download metafield");
  try {
    const shopData = await getFs(APP, shop);
    const token = shopData?.token || null;
    
    if (!token) {
      ctx.status = 401;
      ctx.body = { error: "No access token found for shop" };
      return;
    }
    
    const data = await getMultipleMetafields(shop, token);
    console.log(`metafield data --> ${data}`);
    ctx.body = data;
    return data;
  } catch (err) {
    console.log(err);
    return (ctx.body = "ERROR");
  }
};

module.exports.getData = getData;
module.exports.uploadData = uploadData;
module.exports.redact = redact;
module.exports.uninstall = uninstall;
module.exports.update = update;
module.exports.deleteAllMeta = deleteAllMeta;
module.exports.install = install;
module.exports.customerRedact = customerRedact;
module.exports.customerData = customerData;
module.exports.cancelCharge = cancelCharge;
module.exports.downloadMetafield = downloadMetafield;
