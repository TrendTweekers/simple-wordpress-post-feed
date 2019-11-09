const env = require("../config/config");
const { getShop } = require("../lib/firebase/firebase");

const { TUNNEL_URL, TEST, API_VERSION, COLLECTION } = env;
const { checkShop } = require("./checkShop");
const { createWebhook } = require("./createWebhook");

/** Creating subscription URL
 * @param  {object} ctx context object
 * @param  {string} accessToken
 * @param  {string} shop
 */
const getSubscriptionUrl = async (ctx, accessToken, shop) => {
  const { trial } = await getShop("settings", COLLECTION);
  const { price } = await getShop("settings", COLLECTION);
  const query = JSON.stringify({
    query: `mutation {
      appSubscriptionCreate(
          name: "Standard"
          returnUrl: "${TUNNEL_URL}"
          test: ${TEST}
          trialDays: ${trial}
          lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                  price: { amount: ${price}, currencyCode: USD }
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
  checkShop(shop, accessToken);

  createWebhook(
    `${TUNNEL_URL}/api/uninstall`,
    "APP_UNINSTALLED",
    accessToken,
    shop
  );
  return ctx.redirect(confirmationUrl);
};

module.exports = getSubscriptionUrl;
