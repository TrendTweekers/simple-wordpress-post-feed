/* eslint-disable require-atomic-updates */
/* eslint-disable babel/camelcase */

const { getFs, getSettings, writeFs, db } = require("../lib/firebase/firebase");
const { checkTheme } = require("../lib/shopify/functions");
const { loadOfflineSession } = require("../lib/shopify/session");
const { shopifyApi } = require("../lib/shopify/shopify");
const config = require("../config/config");
const { pushTopic } = require("../lib/pubsub/pubsub");
const {
  checkCharge,
  checkAppSubscription,
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
const { handleShopifyAuthError } = require("../lib/shopify/authError");
const getSubscriptionUrl = require("../handlers/getSubscriptionUrl");
const getSubscriptionUrlLongTrial = require("../handlers/getSubscriptionUrlLongTrial");
const getSubscriptionUrlDEV = require("../handlers/getSubscriptionUrlDEV");
const { sendTelegram } = require("../lib/telegram/index.js");

const { APP, TUNNEL_URL, API_VERSION } = config;

// ── Post cache — 10-minute in-process TTL, keyed by shop:count ───────────────
const _postCache = new Map();
const POST_CACHE_TTL = 10 * 60 * 1000;
const getPostCache = (key) => {
  const e = _postCache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > POST_CACHE_TTL) { _postCache.delete(key); return null; }
  return e.posts;
};
const setPostCache = (key, posts) => _postCache.set(key, { posts, ts: Date.now() });

/**
 * Helper function to load offline session with error handling
 * Wraps loadOfflineSession and handles 401 errors by calling handleShopifyAuthError
 */
const loadSessionWithErrorHandling = async (shop, ctx, host, endpoint = "unknown") => {
  try {
    return await loadOfflineSession(shop, shopifyApi);
  } catch (sessionError) {
    // Handle session load errors (401) - will trigger reauth
    if (sessionError.status === 401 || sessionError.status === 403) {
      const handled = await handleShopifyAuthError(sessionError, ctx, shop, host, endpoint);
      if (handled) {
        // Return null to indicate redirect was triggered
        return null;
      }
    }
    throw sessionError; // Re-throw if not handled
  }
};

/** Getting all the data from DB
 * @param  {context} ctx
 */
const getData = async (ctx) => {
  try {
    // ✅ FIX: Read shop/host from query params first, then fall back to a properly-parsed
    // Referer URL. The old pattern `new URLSearchParams(fullUrl)` treated the full URL as a
    // query string, making every key wrong (e.g. key = "https://host/?shop", not "shop").
    const refererStr = ctx.request.header.referer || "";
    let refererShop = null, refererHost = null;
    try {
      if (refererStr) {
        const u = new URL(refererStr);
        refererShop = u.searchParams.get("shop");
        refererHost = u.searchParams.get("host");
      }
    } catch (_) { /* ignore malformed referer */ }
    const shop = ctx.query.shop || refererShop;
    const host = ctx.query.host || refererHost;

    /** Checking version in settings DB */
    const settings = await getSettings(APP);
    const fsData = await getFs(APP, shop);
    const theme = fsData?.theme || null;
    
    // ✅ ALWAYS load offline session from session storage (not from Firebase token)
    const session = await loadSessionWithErrorHandling(shop, ctx, host, `GET /api/data (loadOfflineSession)`);
    if (!session) return; // Redirect was triggered
    
    // Use offline session for API calls (no token parameter = uses session)
    let support;
    try {
      support = await supportBlocks(shop);
    } catch (error) {
      // Handle Shopify auth errors
      const handled = await handleShopifyAuthError(error, ctx, shop, host, `GET /admin/api/${API_VERSION}/themes.json (supportBlocks)`);
      if (handled) return;
      throw error; // Re-throw if not handled
    }

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
      themeAccess: fsData?.themeAccess !== false, // Default to true if not explicitly set to false
    };
    if (data.version === undefined) {
      data.version = settings.version;
    }

    ctx.status = 200;
    ctx.body = data;
    return data;
  } catch (error) {
    // Handle Shopify API errors (403/401) and session load errors
    // ✅ FIX: same URL-parsing fix as the try block — use new URL() not new URLSearchParams(fullUrl)
    let _shop = ctx.query.shop, _host = ctx.query.host;
    try {
      const u = new URL(ctx.request.header.referer || "");
      _shop = _shop || u.searchParams.get("shop");
      _host = _host || u.searchParams.get("host");
    } catch (_) {}

    const isAxiosError = error.isAxiosError || (error.response && error.response.status);
    const status = error.response?.status || error.status;
    const isAuthError = status === 401 || status === 403;

    if ((isAxiosError || isAuthError) && isAuthError) {
      const handled = await handleShopifyAuthError(error, ctx, _shop, _host, `GET /api/data`);
      if (handled) return;
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
  try {
    const { settings } = await ctx.request.body;
    // ✅ FIX: same Referer parsing fix as getData — use new URL() not new URLSearchParams(fullUrl)
    const refererStr = ctx.request.header.referer || "";
    let refererShop = null, refererHost = null;
    try {
      if (refererStr) {
        const u = new URL(refererStr);
        refererShop = u.searchParams.get("shop");
        refererHost = u.searchParams.get("host");
      }
    } catch (_) { /* ignore malformed referer */ }
    const shop = ctx.query.shop || refererShop;
    const host = ctx.query.host || refererHost;
    console.log(`Upload data route ran for ${shop}`);
    
    // ✅ ALWAYS load offline session from session storage
    const session = await loadSessionWithErrorHandling(shop, ctx, host, `POST /api/data (uploadData)`);
    if (!session) return; // Redirect was triggered
    
    const token = session.accessToken;
    const lengthOfSettings = Object.keys(settings).length;
    const newData = { ...settings };
    
    for (const [i, key] of Object.keys(settings).entries()) {
      const { id, value, type } = settings[key];
      try {
        if (id && value !== "") {
          newData[key] = { id, value, type };
          await updateMetafield(shop, token, id, value, type);
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
          await deleteMetafield(shop, token, id);
          newData[key] = { id: "", value: "", type };
        }
      } catch (metafieldError) {
        // Handle Shopify API errors
        const handled = await handleShopifyAuthError(metafieldError, ctx, shop, host, `POST /admin/api/${API_VERSION}/metafields.json (uploadData)`);
        if (handled) return;
        throw metafieldError; // Re-throw if not handled
      }
    }
    ctx.body = settings;
  } catch (error) {
    let _shop = ctx.query.shop, _host = ctx.query.host;
    try {
      const u = new URL(ctx.request.header.referer || "");
      _shop = _shop || u.searchParams.get("shop");
      _host = _host || u.searchParams.get("host");
    } catch (_) {}
    const handled = await handleShopifyAuthError(error, ctx, _shop, _host, `POST /api/data (uploadData)`);
    if (!handled) {
      console.error("Error in /api/data upload:", error);
      ctx.status = 500;
      ctx.body = { ok: false, error: "Internal server error" };
    }
  }
};

/** Upload data to metafields!@
 * @param  {context} ctx
 */
const deleteAllMeta = async (ctx) => {
  try {
    const { settings } = await ctx.request.body;
    const referer = new URLSearchParams(ctx.request.header.referer);
    const shop = referer.get("shop");
    const host = ctx.query.host || new URLSearchParams(ctx.request.header.referer).get("host");
    console.log(`Delete all meta ${shop}`);
    
    // ✅ ALWAYS load offline session from session storage
    const session = await loadSessionWithErrorHandling(shop, ctx, host, `POST /api/deletedata (deleteAllMeta)`);
    if (!session) return; // Redirect was triggered
    
    const token = session.accessToken;
    const lengthOfSettings = Object.keys(settings).length;
    const newData = { ...settings };
    
    for (const [i, key] of Object.keys(settings).entries()) {
      const { id, type } = settings[key];
      if (id) {
        try {
          await deleteMetafield(shop, token, id);
          newData[key] = { id: "", value: "", type };
        } catch (metafieldError) {
          // Handle Shopify API errors
          const handled = await handleShopifyAuthError(metafieldError, ctx, shop, host, `DELETE /admin/api/${API_VERSION}/metafields/${id}.json (deleteAllMeta)`);
          if (handled) return;
          throw metafieldError; // Re-throw if not handled
        }
      }
    }
    
    console.log("deleted");
    ctx.body = newData;
  } catch (error) {
    const shop = new URLSearchParams(ctx.request.header.referer).get("shop");
    const host = ctx.query.host || new URLSearchParams(ctx.request.header.referer).get("host");
    const handled = await handleShopifyAuthError(error, ctx, shop, host, `POST /api/deletedata (deleteAllMeta)`);
    if (!handled) {
      console.error("Error in /api/deletedata:", error);
      ctx.status = 500;
      ctx.body = { ok: false, error: "Internal server error" };
    }
  }
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
    const installDate = shopData?.installDate?.toDate?.() || new Date();
    const minutesSince = Math.floor((Date.now() - installDate.getTime()) / 60000);
    const timeLabel = minutesSince < 60 ? `${minutesSince} minutes` : minutesSince < 1440 ? `${Math.floor(minutesSince/60)} hours` : `${Math.floor(minutesSince/1440)} days`;
    const flag = minutesSince < 1440 ? "\n⚠️ Same-day uninstall!" : "";
    await sendTelegram(`🔴 <b>Uninstall — WP Simple Feed</b>\n🏪 ${myshopify_domain}\n⏱ Time since install: ${timeLabel}${flag}\n📅 ${new Date().toUTCString()}`);
    await db.collection("swpf").doc(myshopify_domain).set({ status: "cancelled" }, { merge: true });
    // Clear offline session so reinstall gets a fresh OAuth and a new valid token.
    // Without this, the stale swpf/offline_{shop} doc causes the billing guard to 401-loop.
    const offlineId = `offline_${myshopify_domain}`;
    try {
      await db.collection("swpf").doc(offlineId).delete();
      console.log(`[UNINSTALL] 🗑 Cleared offline session ${offlineId} — reinstall will trigger fresh OAuth`);
    } catch (clearErr) {
      console.error(`[UNINSTALL] Failed to clear offline session for ${myshopify_domain}:`, clearErr.message);
    }
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
    const chargeID = shopData?.chargeID || null;
    const plan = shopData?.plan || "";
    const theme = shopData?.theme || null;
    const longTrial = shopData?.longTrial || false;
    
    // ✅ ALWAYS load offline session from session storage (not from Firebase token)
    const session = await loadSessionWithErrorHandling(shop, ctx, host, `GET /api/install (install)`);
    if (!session) return; // Redirect was triggered
    
    // ✅ Use checkAppSubscription (GraphQL) as source of truth - works even after re-auth
    // Falls back to checkCharge (REST) if chargeID exists for backward compatibility
    // No token parameter = uses offline session
    let activeCharge = false;
    try {
      activeCharge = await checkAppSubscription(shop);
      if (!activeCharge && chargeID) {
        // Fallback to REST API check for legacy charges
        activeCharge = await checkCharge(shop, null, chargeID);
      }
    } catch (err) {
      // If checkAppSubscription fails with auth error, handle it
      if (err.isAxiosError || (err.response && (err.response.status === 401 || err.response.status === 403))) {
        const handled = await handleShopifyAuthError(err, ctx, shop, host, `GraphQL currentAppInstallation.activeSubscriptions (checkAppSubscription)`);
        if (handled) return;
        throw err; // Re-throw if not handled
      }
      // Otherwise, try legacy checkCharge if chargeID exists
      if (chargeID) {
        try {
          activeCharge = await checkCharge(shop, null, chargeID);
        } catch (chargeErr) {
          if (chargeErr.isAxiosError || (chargeErr.response && (chargeErr.response.status === 401 || chargeErr.response.status === 403))) {
            const handled = await handleShopifyAuthError(chargeErr, ctx, shop, host, `GET /admin/api/${API_VERSION}/recurring_application_charges/${chargeID}.json (checkCharge)`);
            if (handled) return;
          }
          throw chargeErr;
        }
      }
    }
    
    if (activeCharge) {
      // Use offline session for API calls (no token parameter = uses session)
      let development, currentTheme, support;
      let themeAccess = true; // Default to true, will be set to false if checkTheme returns null due to 403
      try {
        development = await checkDevShop(shop);
        currentTheme = await checkTheme(shop);
        // If checkTheme returns null, it means 403 (theme access denied)
        if (currentTheme === null) {
          themeAccess = false;
          console.log(`[INSTALL] Theme access denied for ${shop} - read_themes scope not granted`);
          // Save themeAccess flag to Firebase
          await writeFs(APP, shop, { themeAccess: false });
        }
        const returnUrl = `${TUNNEL_URL}?shop=${shop}&host=${host}`;
        support = await supportBlocks(shop);
        const { newThemeCapable } = support;
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
          // Note: pushTopic needs token, but we're using session - get from session if needed
          const sessionToken = session?.accessToken;
          if (sessionToken) {
            pushTopic(shop, theme.toString(), sessionToken, action);
          }

          ctx.status = 200;
          const plan = { plan: shopData.plan };
          await writeFs(APP, shop, plan);
          ctx.body = { allowed: true, themeAccess };
        } else if (activeCharge) {
          ctx.status = 200;
          ctx.body = { allowed: true, themeAccess };
        } else if (longTrial) {
          /** Runs when its normal store and got one year free */
          console.log(`[BILLING] install() route: longTrial=true → calling getSubscriptionUrlLongTrial() for ${shop}`);
          const sessionToken = session?.accessToken;
          const confirmationUrl = await getSubscriptionUrlLongTrial(
            ctx,
            sessionToken,
            shop,
            returnUrl,
            true,
            false
          );
          console.log(`[BILLING] install() route: getSubscriptionUrlLongTrial() returned confirmationUrl=${confirmationUrl ? 'present' : 'null'} for ${shop}`);
          // If confirmationUrl is null, active subscription exists - allow access
          if (!confirmationUrl) {
            ctx.status = 200;
            ctx.body = { allowed: true, themeAccess };
          } else {
            ctx.status = 200;
            ctx.body = { allowed: false, confirmationUrl };
          }
        } else if (development) {
          /** Runs when its dev store */
          console.log(`[BILLING] install() route: development=true → calling getSubscriptionUrlDEV() for ${shop}`);
          const sessionToken = session?.accessToken;
          const confirmationUrl = await getSubscriptionUrlDEV(
            ctx,
            sessionToken,
            shop,
            returnUrl,
            true,
            false
          );
          console.log(`[BILLING] install() route: getSubscriptionUrlDEV() returned confirmationUrl=${confirmationUrl ? 'present' : 'null'} for ${shop}`);
          // If confirmationUrl is null, active subscription exists - allow access
          if (!confirmationUrl) {
            ctx.status = 200;
            ctx.body = { allowed: true, themeAccess };
          } else {
            ctx.status = 200;
            ctx.body = { allowed: false, confirmationUrl };
          }
        } else {
          /** Runs when its normal store */
          console.log(`[BILLING] install() route: development=false, longTrial=false → calling getSubscriptionUrl() for ${shop}`);
          const sessionToken = session?.accessToken;
          const confirmationUrl = await getSubscriptionUrl(
            ctx,
            sessionToken,
            shop,
            returnUrl,
            true,
            false
          );
          console.log(`[BILLING] install() route: getSubscriptionUrl() returned confirmationUrl=${confirmationUrl ? 'present' : 'null'} for ${shop}`);
          // If confirmationUrl is null, active subscription exists - allow access
          if (!confirmationUrl) {
            ctx.status = 200;
            ctx.body = { allowed: true, themeAccess };
          } else {
            ctx.status = 200;
            ctx.body = { allowed: false, confirmationUrl };
          }
        }
      } catch (apiError) {
        // Handle Shopify API errors in checkDevShop, checkTheme, or supportBlocks
        const handled = await handleShopifyAuthError(apiError, ctx, shop, host, `GET /admin/api/${API_VERSION}/... (checkDevShop/checkTheme/supportBlocks)`);
        if (handled) return;
        throw apiError; // Re-throw if not handled
      }
    } else {
      const { ensureHost } = require("../lib/shopify/host");
      const finalHost = ensureHost(shop, host);
      const redirectTo = `/install/auth?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(finalHost)}`;
      ctx.status = 200;
      ctx.body = { allowed: false, confirmationUrl: `/auth/toplevel?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(finalHost)}&redirectTo=${encodeURIComponent(redirectTo)}` };
    }
  } catch (error) {
    // Handle Shopify API errors (axios errors)
    const isAxiosError = error.isAxiosError || (error.response && error.response.status);
    const status = error.response?.status;
    const { shop, host } = ctx.request.query;
    
    if (isAxiosError && (status === 401 || status === 403)) {
      // Use unified auth error handler
      const handled = await handleShopifyAuthError(error, ctx, shop, host, `GET /api/install (various Shopify API calls)`);
      if (handled) return;
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
  const shop = ctx.query.shop || referer.get("shop");
  const host = ctx.query.host || new URLSearchParams(ctx.request.header.referer).get("host");
  try {
    // ✅ ALWAYS load offline session from session storage
    const session = await loadSessionWithErrorHandling(shop, ctx, host, `GET /api/meta (downloadMetafield)`);
    if (!session) return; // Redirect was triggered
    
    const token = session.accessToken;
    const data = await getMultipleMetafields(shop, token);
    ctx.body = data;
    return data;
  } catch (err) {
    // Handle Shopify API errors
    const handled = await handleShopifyAuthError(err, ctx, shop, host, `GET /admin/api/${API_VERSION}/metafields.json (downloadMetafield)`);
    if (!handled) {
      console.error("Error in /api/meta:", err);
      ctx.status = 500;
      ctx.body = { ok: false, error: "Internal server error" };
    }
  }
};

/** Fetch WordPress posts for storefront theme extension
 * @param  {context} ctx
 */
const getPosts = async (ctx) => {
  const shop = ctx.query.shop;

  if (!shop) {
    ctx.status = 400;
    ctx.body = { posts: [] };
    return;
  }

  try {
    // GET /api/posts is public — if shop not installed, return empty posts gracefully
    let session = null;
    try {
      session = await loadOfflineSession(shop, shopifyApi);
    } catch (sessionError) {
      ctx.status = 200;
      ctx.body = { posts: [] };
      return;
    }

    if (!session) {
      ctx.status = 200;
      ctx.body = { posts: [] };
      return;
    }

    const token = session.accessToken;

    // Get metafields: url, hostedOnWP, postNumber
    let metafields;
    try {
      metafields = await getMultipleMetafields(shop, token);
    } catch (metafieldError) {
      ctx.status = 200;
      ctx.body = { posts: [] };
      return;
    }

    const wpUrl = metafields.url?.value || '';
    const postNumber = parseInt(ctx.query.count || metafields.postNumber?.value || '5', 10) || 5;
    const cacheKey = `${shop}:${postNumber}`;

    // Safely parse hostedOnWP (may be string or boolean)
    const hostedOnWPValue = metafields.hostedOnWP?.value;
    const isWordPressHosted =
      hostedOnWPValue === true ||
      hostedOnWPValue === 'true' ||
      hostedOnWPValue === '1';

    // If no WordPress URL configured, return empty posts
    if (!wpUrl || typeof wpUrl !== 'string' || wpUrl.trim() === '') {
      ctx.status = 200;
      ctx.body = { posts: [] };
      return;
    }

    // Normalize WordPress URL: add https if missing, remove trailing slash
    let normalizedUrl = wpUrl.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    normalizedUrl = normalizedUrl.replace(/\/$/, '');

    // Serve from cache if fresh
    const cachedPosts = getPostCache(cacheKey);
    if (cachedPosts) {
      ctx.status = 200;
      ctx.body = { posts: cachedPosts, cached: true };
      return;
    }

    // Build WordPress REST API endpoint
    let wpEndpoint;
    if (isWordPressHosted) {
      wpEndpoint = `https://public-api.wordpress.com/rest/v1.1/sites/${normalizedUrl.replace(/^https?:\/\//, '')}/posts/?number=${postNumber}`;
    } else {
      wpEndpoint = `${normalizedUrl}/wp-json/wp/v2/posts?_embed&order=desc&per_page=${postNumber}`;
    }

    // Fetch from WordPress REST API
    const axios = require('axios');
    let wpResponse;
    try {
      wpResponse = await axios.get(wpEndpoint, {
        timeout: 5000,
        headers: {
          'User-Agent': 'SimpleWordPressPostFeed/1.0'
        }
      });
    } catch (wpError) {
      console.error(`[/api/posts] WordPress fetch failed for ${shop}: ${wpError.message}${wpError.response ? ` (HTTP ${wpError.response.status})` : ''}`);
      const stale = getPostCache(cacheKey);
      ctx.status = 200;
      ctx.body = { posts: stale || [], cached: !!stale, stale: !!stale };
      return;
    }

    // Transform WordPress posts to extension format
    const wpData = wpResponse.data;
    const postsArray = Array.isArray(wpData) ? wpData : (wpData.posts || []);

    const posts = postsArray
      .slice(0, postNumber)
      .map(post => {
        try {
          // Handle both WordPress.com and self-hosted formats
          const url = post.link || post.URL || '';
          const title = post.title?.rendered || post.title || '';

          // Clean excerpt of HTML tags
          let excerpt = post.excerpt?.rendered || post.excerpt || '';
          excerpt = excerpt.replace(/<[^>]*>/g, '').trim();

          // Parse date safely
          const postDate = post.date || post.modified || new Date().toISOString();
          const dateObj = new Date(postDate);
          const dateStr = dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });

          // Featured image: self-hosted uses _embedded media; WP.com uses post_thumbnail
          const image =
            post._embedded?.['wp:featuredmedia']?.[0]?.source_url ||
            post.post_thumbnail?.URL ||
            post.featured_image ||
            '';

          return {
            url,
            title,
            excerpt,
            date: dateStr,
            image,
          };
        } catch (transformError) {
          console.warn(`[/api/posts] Error transforming post for ${shop}:`, transformError.message);
          return null;
        }
      })
      .filter(post => post !== null && post.url && post.title);

    setPostCache(cacheKey, posts);
    ctx.status = 200;
    ctx.body = { posts };

  } catch (error) {
    console.error(`[/api/posts] Unexpected error for ${shop}:`, error.message || error);
    ctx.status = 200;
    ctx.body = { posts: [] };
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
module.exports.getPosts = getPosts;
