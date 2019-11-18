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
 */
const getSubscriptionUrlDEV = async (ctx, accessToken, shop) => {
  let test = false;
  const settings = await getFs("settings", APP);

  const query = JSON.stringify({
    query: `mutation {
      appSubscriptionCreate(
          name: "Development Plan"
          returnUrl: "${TUNNEL_URL}"
          test: false
          trialDays: ${settings.trial}
          lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                  price: { amount: 0, currencyCode: USD }
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

  /** Creating Uninstall webhook on shopify that will be triggered directly after uninstall*/

  const { id } = responseJson.data.appSubscriptionCreate.appSubscription;
  const chargeID = id.split("/")[4];
  await initShop(shop, accessToken, chargeID);
  createWebhook(
    `${TUNNEL_URL}/${APP}/uninstall`,
    "APP_UNINSTALLED",
    accessToken,
    shop
  );
  return ctx.redirect(confirmationUrl);
};

module.exports = getSubscriptionUrlDEV;
