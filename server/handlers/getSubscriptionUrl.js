const env = require("../config/config");
const { getFs } = require("../lib/firebase/firebase");
const { checkShop } = require("./checkShop");
const { checkDevShop } = require("./../lib/shopify/functions");
const { TUNNEL_URL, TEST, API_VERSION, APP } = env;
const { createWebhook } = require("./createWebhook");

/** Creating subscription URL
 * @param  {object} ctx context object
 * @param  {string} accessToken
 * @param  {string} shop
 */
const getSubscriptionUrl = async (ctx, accessToken, shop) => {
  let test = false;
  const settings = await getFs("settings", APP);
  const devShop = await checkDevShop(shop, accessToken);
  if (devShop) {
    test = true;
  }
  const query = JSON.stringify({
    query: `mutation {
      appSubscriptionCreate(
          name: "Standard"
          returnUrl: "${TUNNEL_URL}"
          test: ${test}
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
  await checkShop(shop, accessToken);

  /** Creating Uninstall webhook on shopify that will be triggered directly after uninstall*/
  createWebhook(
    `${TUNNEL_URL}/api/uninstall`,
    "APP_UNINSTALLED",
    accessToken,
    shop
  );

  return ctx.redirect(confirmationUrl);
};

module.exports = getSubscriptionUrl;
