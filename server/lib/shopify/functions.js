import Shopify, { DataType } from "@shopify/shopify-api";
import ApolloClient from "apollo-boost";

import config from "../../config/config";
import { loadOfflineSession } from "./session";
const { shopifyApi } = require("./shopify");

import axios from "axios";
import initialState from "../../../store/initialState";
const initialSettings = initialState.settings;

const { API_VERSION } = config;
const { GRAPHQL_VERSION } = config;

// Helper to extract endpoint from error for logging
const getEndpointFromError = (err, shop, defaultEndpoint) => {
  if (err.config?.url) {
    return err.config.url;
  }
  if (err.request?.url) {
    return err.request.url;
  }
  if (defaultEndpoint) {
    return defaultEndpoint;
  }
  return `https://${shop}/admin/api/${API_VERSION}/...`;
};

// Helper to wrap Shopify REST client calls and handle 403/401 errors
const safeShopifyRestCall = async (client, method, options) => {
  try {
    const response = await client[method](options);
    return response;
  } catch (err) {
    // Convert Shopify API 403/401 errors to axios-like errors for consistent handling
    if (err.code === 403 || err.code === 401 || err.statusCode === 403 || err.statusCode === 401) {
      const axiosError = new Error(err.message || 'Shopify API authentication failed');
      axiosError.isAxiosError = true;
      axiosError.response = {
        status: err.code || err.statusCode || 403
      };
      throw axiosError;
    }
    throw err;
  }
};

/**
 * Containing functions used to retrive and work data from Shopify
 * # checkBlogs - fetch blog data
 * # checkTheme - fetch current theme
 */

/**
 * Get currently used Theme ID
 * @param {string} shop
 * @param {string} token
 */

const checkTheme = async (shop, token = null) => {
  // --- ALWAYS define session in this scope ---
  // Defensive shop extraction for multiple entrypoints (Koa/Next handlers)
  const shopArg = shop ||
    (typeof ctx !== "undefined" && ctx.query && ctx.query.shop) ||
    (typeof req !== "undefined" && req.query && req.query.shop) ||
    null;

  if (!shopArg) {
    const err = new Error("Missing shop");
    err.status = 400;
    throw err;
  }

  let session = null;
  try {
    session = await loadOfflineSession(shopArg, shopifyApi);
  } catch (e) {
    session = null;
  }

  if (!session || !session.accessToken) {
    const err = new Error(`Offline session missing for ${shopArg}`);
    err.status = 401;
    throw err;
  }

  try {
    // Use token if provided, otherwise use session accessToken
    let accessToken = token || session.accessToken;
    
    const results = await axios(
      `https://${shopArg}/admin/api/${API_VERSION}/themes.json`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    ).then(({ data }) => {
      const mainTheme = data.themes.filter((theme) => theme.role === "main");
      return mainTheme[0]?.id;
    });
    return results;
  } catch (err) {
    // Handle 403 as theme access denied (read_themes scope not granted) - return null instead of throwing
    if (err.response && err.response.status === 403) {
      console.log(`[THEME ACCESS] 403 Forbidden for ${shopArg} - read_themes scope not granted`);
      return null; // Return null to indicate theme access is not available
    }
    
    // Re-throw 401 errors (authentication issues) so they can be caught by route handlers
    if (err.response && err.response.status === 401) {
      const xRequestId = err.response.headers?.['x-request-id'] || err.response.headers?.['X-Request-Id'] || 'none';
      console.error(`[SHOPIFY API 401] checkTheme for ${shopArg}:`, {
        status: err.response.status,
        responseData: err.response.data,
        xRequestId,
        sessionId: session?.id || 'none',
        sessionIsOnline: session?.isOnline || false,
        sessionScope: session?.scope || 'none',
        error: err.message
      });
      throw err;
    }
    console.log(err);
    return null;
  }
};

/**
 * Check shop owner email and shop ID
 * @param {string} shop
 * @param {string} token
 * @return {email:string,id:number}
 */
const checkEmailId = async (shop, token) => {
  try {
    const results = await axios(
      `https://${shop}/admin/api/${API_VERSION}/shop.json`,
      {
        headers: {
          "X-Shopify-Access-Token": token,
        },
      }
    ).then(
      ({
        data: {
          shop: { email, id, shop_owner },
        },
      }) => {
        return {
          email: email,
          id: id,
          name: shop_owner,
        };
      }
    );
    return results;
  } catch (err) {
    console.log(err);
    return false;
  }
  return console.log("check email,id");
};

/** Check if shop is on affiliate plan
 * @param  {string} shop
 * @param  {string} token
 * @return {boolean}
 */
const checkDevShop = async (shop, token = null) => {
  // Load offline session if token not provided
  let accessToken = token;
  let session = null;
  if (!accessToken) {
    session = await loadOfflineSession(shop, shopifyApi);
    if (!session || !session.accessToken) {
      throw new Error('No offline session found');
    }
    accessToken = session.accessToken;
  }
  
  if (accessToken) {
    try {
      const response = await fetch(
        `https://${shop}/admin/api/${API_VERSION}/shop.json`,
        {
          method: "GET",
          headers: {
            "X-Shopify-Access-Token": accessToken,
          },
        }
      );
      
      // Handle 403/401 - throw error to trigger reauth with enhanced logging
      if (response.status === 401 || response.status === 403) {
        const xRequestId = response.headers.get('x-request-id') || response.headers.get('X-Request-Id') || 'none';
        const responseData = await response.json().catch(() => ({}));
        console.error(`[SHOPIFY API ${response.status}] checkDevShop for ${shop}:`, {
          status: response.status,
          responseData,
          xRequestId,
          sessionId: session?.id || 'none',
          sessionIsOnline: session?.isOnline || false,
          sessionScope: session?.scope || 'none'
        });
        
        const axiosError = new Error('Shopify API authentication failed');
        axiosError.isAxiosError = true;
        axiosError.response = {
          status: response.status
        };
        throw axiosError;
      }
      
      const data = await response.json();
      const { shop: { plan_name } } = data;
      if (plan_name === "affiliate" || plan_name === "partner_test") {
        return true;
      }
      return false;
    } catch (err) {
      // Re-throw auth errors
      if (err.isAxiosError || (err.response && (err.response.status === 401 || err.response.status === 403))) {
        throw err;
      }
      console.log(err);
      return false;
    }
  } else {
    console.log("no token");
    return false;
  }
};

/** Check if there's an active AppSubscription using GraphQL (idempotent billing guard)
 * This is the source of truth - checks Shopify directly, not DB
 * @param  {string} shop
 * @param  {string} token - Optional, will load from offline session if not provided
 * @return {boolean} true if active subscription exists, false otherwise
 */
const checkAppSubscription = async (shop, token = null) => {
  // --- ALWAYS define session in this scope ---
  // Defensive shop extraction for multiple entrypoints (Koa/Next handlers)
  const shopArg = shop ||
    (typeof ctx !== "undefined" && ctx.query && ctx.query.shop) ||
    (typeof req !== "undefined" && req.query && req.query.shop) ||
    null;

  if (!shopArg) {
    const err = new Error("Missing shop");
    err.status = 400;
    throw err;
  }

  let session = null;
  try {
    session = await loadOfflineSession(shopArg, shopifyApi);
  } catch (e) {
    session = null;
  }

  if (!session || !session.accessToken) {
    const err = new Error(`Offline session missing for ${shopArg}`);
    err.status = 401;
    throw err;
  }

  try {
    // Use token if provided, otherwise use session accessToken
    let accessToken = token || session.accessToken;
    
    const query = `{
      currentAppInstallation {
        activeSubscriptions {
          id
          status
          name
          test
        }
      }
    }`;

    const client = new Shopify.Clients.Graphql(shopArg, accessToken);
    const response = await client.query({ data: query });
    
    if (!response?.body?.data?.currentAppInstallation) {
      console.log(`No app installation found for ${shopArg}`);
      return false;
    }
    
    const subscriptions = response.body.data.currentAppInstallation.activeSubscriptions || [];
    
    // Check if any subscription is ACTIVE (status can be ACTIVE, PENDING, etc.)
    const hasActiveSubscription = subscriptions.some(
      (sub) => sub.status === "ACTIVE"
    );
    
    if (hasActiveSubscription) {
      console.log(`Active subscription found for ${shopArg}:`, subscriptions.filter(s => s.status === "ACTIVE").map(s => s.name));
    }
    
    return hasActiveSubscription;
  } catch (err) {
    // Handle GraphQL errors with enhanced logging
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
      const xRequestId = err.response.headers?.['x-request-id'] || err.response.headers?.['X-Request-Id'] || 'none';
      console.error(`[SHOPIFY API ${err.response.status}] checkAppSubscription for ${shopArg}:`, {
        status: err.response.status,
        responseData: err.response.body || err.response.data,
        xRequestId,
        sessionId: session?.id || 'none',
        sessionIsOnline: session?.isOnline || false,
        sessionScope: session?.scope || 'none',
        error: err.message
      });
      
      const axiosError = new Error('Shopify API authentication failed');
      axiosError.isAxiosError = true;
      axiosError.response = {
        status: err.response.status
      };
      throw axiosError;
    }
    console.error(`Error checking AppSubscription for ${shopArg}:`, err.message || err);
    return false;
  }
};

/** This function checking if the charge is active or not (REST API - legacy)
 * NOTE: This checks RecurringApplicationCharge, but app uses AppSubscription
 * Kept for backward compatibility, but should use checkAppSubscription instead
 * @param  {string} shop
 * @param  {string} token
 * @param  {string} chargeID
 * @return {boolean}
 */
const checkCharge = async (shop, token = null, chargeID) => {
  try {
    // Load offline session if token not provided
    let accessToken = token;
    let session = null;
    if (!accessToken) {
      session = await loadOfflineSession(shop, shopifyApi);
      if (!session || !session.accessToken) {
        throw new Error('No offline session found');
      }
      accessToken = session.accessToken;
    }
    
    const response = await fetch(
      `https://${shop}/admin/api/${API_VERSION}/recurring_application_charges/${chargeID}.json`,
      {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );
    
    // Handle 403/401 - throw error to trigger reauth with enhanced logging
    if (response.status === 401 || response.status === 403) {
      const xRequestId = response.headers.get('x-request-id') || response.headers.get('X-Request-Id') || 'none';
      const responseData = await response.json().catch(() => ({}));
      console.error(`[SHOPIFY API ${response.status}] checkCharge for ${shop}:`, {
        status: response.status,
        responseData,
        xRequestId,
        sessionId: session?.id || 'none',
        sessionIsOnline: session?.isOnline || false,
        sessionScope: session?.scope || 'none'
      });
      
      const axiosError = new Error('Shopify API authentication failed');
      axiosError.isAxiosError = true;
      axiosError.response = {
        status: response.status
      };
      throw axiosError;
    }
    
    const data = await response.json();
    const { recurring_application_charge: { status } } = data;
    const active = status === "active";
    return active;
  } catch (err) {
    // Re-throw auth errors
    if (err.isAxiosError || (err.response && (err.response.status === 401 || err.response.status === 403))) {
      throw err;
    }
    console.log(err);
    return false;
  }
};

/** Cancelling existing  recurringcharge and creating a new longer one
 * @param  {string} shop
 * @param  {string} token
 * @param  {string} chargeID
 */
const deleteCharge = async (shop, token, chargeID) => {
  const result = await axios
    .delete(
      `https://${shop}/admin/api/${API_VERSION}/recurring_application_charges/${chargeID}.json`,
      {
        headers: {
          "X-Shopify-Access-Token": token,
        },
      }
    )
    .catch((err) => console.log(err));
  return result;
};

/**
 * Check if an specific app block wsa added to a template file.
 */
const containsAppBlock = (
  templateJSONAssetContent,
  appBlockName,
  themeAppExtensionUuid
) => {
  const regExp = new RegExp(
    // eslint-disable-next-line no-useless-escape
    `shopify:\/\/apps\/.*\/blocks\/${appBlockName}\/${themeAppExtensionUuid}`
  );

  let parsedContent;

  try {
    parsedContent = JSON.parse(templateJSONAssetContent);
  } catch (err) {
    console.error(err);
  }

  /**
   * Retrieves all blocks belonging to template sections
   */
  const sections = Object.values(parsedContent?.sections || {});
  const blocks = sections
    .map(({ blocks = {} }) => Object.values(blocks))
    .flat();
  return blocks.some((block) => regExp.test(block.type));
};

const createClient = (shop, accessToken) => {
  return new ApolloClient({
    uri: `https://${shop}/admin/api/${GRAPHQL_VERSION}/graphql.json`,
    request: (operation) => {
      operation.setContext({
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "User-Agent": `shopify-app-node ${process.env.npm_package_version} | Shopify App CLI`,
        },
      });
    },
  });
};

/**
 * @typedef {Object} blocksupport
 * @property {boolean} supportBlocks - Support blocks
 * @property {boolean} supportsSe - Support Sse
 */

/** Support Blocks
 * @param  {string} shop
 * @param  {string} token - Optional, will load from offline session if not provided
 * @returns {blocksupport}
 */
const supportBlocks = async (shop, token = null) => {
  // ✅ ensure session exists in this scope
  let session;
  try {
    session = await loadOfflineSession(shop, shopifyApi);
  } catch (e) {
    session = null;
  }

  if (!session || !session.accessToken) {
    const err = new Error(`Offline session missing for ${shop}`);
    err.status = 401;
    throw err;
  }

  try {
    // Use token if provided, otherwise use session accessToken
    let accessToken = token || session.accessToken;
    
    const clients = {
      rest: new Shopify.Clients.Rest(shop, accessToken),
      graphQL: createClient(shop, accessToken),
    };

    // Check if App Blocks are supported
    // -----------------------------------

    // Specify the name of the template we want our app to integrate with
    // eslint-disable-next-line shopify/prefer-module-scope-constants
    const APP_BLOCK_TEMPLATES = [
      "product",
      "collection",
      "article",
      "blog",
      "index",
    ];

    // Use `client.get` to request list of themes on store
    const themesResponse = await safeShopifyRestCall(clients.rest, 'get', {
      path: "themes",
    });
    const themes = themesResponse.body.themes;

    // Find the published theme
    const publishedTheme = themes.find((theme) => theme.role === "main");
    
    if (!publishedTheme) {
      throw new Error("No published theme found");
    }

    // Get list of assets contained within the published theme
    const assetsResponse = await safeShopifyRestCall(clients.rest, 'get', {
      path: `themes/${publishedTheme.id}/assets`,
    });
    const assets = assetsResponse.body.assets;

    // Check if template JSON files exist for the template specified in APP_BLOCK_TEMPLATES
    const templateJSONFiles = assets.filter((file) => {
      return APP_BLOCK_TEMPLATES.some(
        (template) => file.key === `templates/${template}.json`
      );
    });

    if (templateJSONFiles.length === APP_BLOCK_TEMPLATES.length) {
      console.log("All desired templates support sections everywhere!");
    } else if (templateJSONFiles.length) {
      console.log(
        "Only some of the desired templates support sections everywhere."
      );
    }

    // Get bodies of template JSONs
    const templateJSONAssetContents = await Promise.all(
      templateJSONFiles.map(async (file) => {
        const response = await safeShopifyRestCall(clients.rest, 'get', {
          path: `themes/${publishedTheme.id}/assets`,
          query: { "asset[key]": file.key },
        });
        return response.body.asset;
      })
    );

    // Find what section is set as 'main' for each template JSON's body
    const templateMainSections = templateJSONAssetContents
      .map((asset, index) => {
        const json = JSON.parse(asset.value);
        const main = json.sections.main && json.sections.main.type;

        return assets.find((file) => file.key === `sections/${main}.liquid`);
      })
      .filter((value) => value);

    // Request the content of each section and check if it has a schema that contains a
    // block of type '@app'
    const sectionsWithAppBlock = (
      await Promise.all(
        templateMainSections.map(async (file, index) => {
          let acceptsAppBlock = false;
          const response = await safeShopifyRestCall(clients.rest, 'get', {
            path: `themes/${publishedTheme.id}/assets`,
            query: { "asset[key]": file.key },
          });
          const asset = response.body.asset;

          const match = asset.value.match(
            /\{\%\s+schema\s+\%\}([\s\S]*?)\{\%\s+endschema\s+\%\}/m
          );
          const schema = JSON.parse(match[1]);

          if (schema && schema.blocks) {
            acceptsAppBlock = schema.blocks.some((b) => b.type === "@app");
          }

          return acceptsAppBlock ? file : null;
        })
      )
    ).filter((value) => value);

    /**
     * This is where we check if the theme supports apps blocks.
     * To do so, we check if the main-product section supports blocks of type @app
     */
    const supportsSe = templateJSONFiles.length > 0;
    const supportsAppBlocks = supportsSe && sectionsWithAppBlock.length > 0;
    if (templateJSONFiles.length === sectionsWithAppBlock.length) {
      console.log(
        `All desired templates have main sections that support app blocks!`
      );
    } else if (sectionsWithAppBlock.length) {
      console.log(`Only some of the desired templates support app blocks.`);
    } else {
      console.log("None of the desired templates support app blocks");
    }
    const newThemeCapable =
      supportsSe === true && supportsAppBlocks === true ? true : false;
    const response = {
      theme: publishedTheme,
      supportsSe,
      supportsAppBlocks,
      newThemeCapable,
      /**
       * Check if each of the sample app's app blocks have been added to the product.json template
       */
      // containsSWPFAppBlock: containsAppBlock(
      //   templateJSONAssetContents[0]?.value,
      //   "home-section-swpf",
      //   "b261966a-8614-4405-a97b-68a3a40fdcc0",
      // ),
    };
    console.log(response);
    return response;
  } catch (error) {
    console.log(error);
    
    // Treat 403/401 as auth errors - throw to trigger reauth with enhanced logging
    if (error.code === 403 || error.code === 401 || error.statusCode === 403 || error.statusCode === 401) {
      const status = error.code || error.statusCode || 403;
      const xRequestId = error.response?.headers?.['x-request-id'] || error.response?.headers?.['X-Request-Id'] || 'none';
      console.error(`[SHOPIFY API ${status}] supportBlocks for ${shop}:`, {
        status,
        responseData: error.response?.body || error.response?.data || error.body || error.data,
        xRequestId,
        sessionId: session?.id || 'none',
        sessionIsOnline: session?.isOnline || false,
        sessionScope: session?.scope || 'none',
        error: error.message || error
      });
      
      const axiosError = new Error(error.message || 'Shopify API authentication failed');
      axiosError.isAxiosError = true;
      axiosError.response = {
        status
      };
      throw axiosError;
    }
    
    // For other errors, return default response
    const response = {
      theme: 99999,
      supportsSe: false,
      supportsAppBlocks: false,
    };

    return response;
  }
};

// exports

module.exports.checkTheme = checkTheme;
module.exports.checkEmailId = checkEmailId;
module.exports.checkDevShop = checkDevShop;
module.exports.checkCharge = checkCharge;
module.exports.checkAppSubscription = checkAppSubscription;
module.exports.deleteCharge = deleteCharge;
module.exports.supportBlocks = supportBlocks;
