const env = require("../config/config");
const { getFs } = require("../lib/firebase/firebase");
const { initShop } = require("./checkShop");
const { checkDevShop } = require("./../lib/shopify/functions");
const { TUNNEL_URL, TEST, API_VERSION, APP, HOOK_URL } = env;
const { createWebhook } = require("./createWebhook");

/** Creating subscription URL
 * @param  {object} ctx context object
 * @param  {string} accessToken
 * @param  {string} shop
 * @param  {boolean} getUrl if we want to get back the URL and not redirect, set true
 * @param {boolean} webhook if we want to make a webhook set true
 */
const getSubscriptionUrlDEV = async (
  ctx,
  accessToken,
  shop,
  getUrl = false,
  webhook = true
) => {
  const settings = await getFs("settings", APP);

  const query = JSON.stringify({
    query: `mutation {
      appSubscriptionCreate(
          name: "Development Plan"
          returnUrl: "${TUNNEL_URL}"
          test: true
          trialDays: ${settings.trial}
          lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                  price: { amount: ${settings.price}, currencyCode: USD }
              }
            }
          }
          ]
        ) {
            userErrors {
              field
              message
            }
            confirmationUrl
            appSubscription {
              id
            }
        }
    }`
  });

  const response = await fetch(
    `https://${shop}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken
      },
      body: query
    }
  );

  const responseJson = await response.json();
  const confirmationUrl =
    responseJson.data.appSubscriptionCreate.confirmationUrl;

  const { id } = await responseJson.data.appSubscriptionCreate.appSubscription;
  /**Getting the charge ID */
  const chargeID = id.split("/")[4];

  /**Initialization of the shop without saving the charging plan */
  await initShop(shop, accessToken, chargeID, confirmationUrl);

  /** Creating Uninstall webhook on shopify that will be triggered directly after uninstall*/
  if (webhook) {
    createWebhook(
      `${TUNNEL_URL}/${APP}/uninstall`,
      "APP_UNINSTALLED",
      accessToken,
      shop
    );
  }
  if (!getUrl) {
    return ctx.redirect(confirmationUrl);
  }
  return confirmationUrl;
};

module.exports = getSubscriptionUrlDEV;
