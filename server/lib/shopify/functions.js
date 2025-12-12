import Shopify, { DataType } from "@shopify/shopify-api";
import ApolloClient from "apollo-boost";

import config from "../../config/config";

import axios from "axios";
import initialState from "../../../store/initialState";
const initialSettings = initialState.settings;

const { API_VERSION } = config;
const { GRAPHQL_VERSION } = config;

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

const checkTheme = async (shop, token) => {
  try {
    const results = await axios(
      `https://${shop}/admin/api/${API_VERSION}/themes.json`,
      {
        headers: {
          "X-Shopify-Access-Token": token,
        },
      }
    ).then(({ data }) => {
      const mainTheme = data.themes.filter((theme) => theme.role === "main");
      return mainTheme[0]?.id;
    });
    return results;
  } catch (err) {
    // Re-throw 403/401 errors so they can be caught by route handlers
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
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
const checkDevShop = async (shop, token) => {
  if (token) {
    try {
      const response = await fetch(
        `https://${shop}/admin/api/${API_VERSION}/shop.json`,
        {
          method: "GET",
          headers: {
            "X-Shopify-Access-Token": token,
          },
        }
      );
      
      // Handle 403/401 - throw error to trigger reauth
      if (response.status === 401 || response.status === 403) {
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

/** This function checking if the charge is active or not
 * @param  {string} shop
 * @param  {string} token
 * @param  {string} chargeID
 * @return {boolean}
 */
const checkCharge = async (shop, token, chargeID) => {
  try {
    const response = await fetch(
      `https://${shop}/admin/api/${API_VERSION}/recurring_application_charges/${chargeID}.json`,
      {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": token,
        },
      }
    );
    
    // Handle 403/401 - throw error to trigger reauth
    if (response.status === 401 || response.status === 403) {
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
 * @param  {string} token
 * @returns {blocksupport}
 */
const supportBlocks = async (shop, token) => {
  try {
    const clients = {
      rest: new Shopify.Clients.Rest(shop, token),
      graphQL: createClient(shop, token),
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
    
    // Treat 403/401 as auth errors - throw to trigger reauth
    if (error.code === 403 || error.code === 401 || error.statusCode === 403 || error.statusCode === 401) {
      const axiosError = new Error(error.message || 'Shopify API authentication failed');
      axiosError.isAxiosError = true;
      axiosError.response = {
        status: error.code || error.statusCode || 403
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
module.exports.deleteCharge = deleteCharge;
module.exports.supportBlocks = supportBlocks;
