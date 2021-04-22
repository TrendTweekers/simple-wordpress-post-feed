const {default: Shopify} = require("@shopify/shopify-api");

const env = require("../config/config");
const {getFs} = require("../lib/firebase/firebase");

const {initShop} = require("./checkShop");
const {createWebhook} = require("./createWebhook");

const {APP} = env;


/** Creating subscription URL
 * @param  {object} ctx context object
 * @param  {string} accessToken
 * @param  {string} shop
 * @param  {string} returnUrl
 * @param  {boolean} getUrl if we want to get back the URL and not redirect, set true
 * @param {boolean} webhook if we want to make a webhook set true
 */
const getSubscriptionUrl = async (
  ctx,
  accessToken,
  shop,
  getUrl = false,
  returnUrl,
  webhook = true,
) => {
  const settings = await getFs("settings", APP);

  const query = JSON.stringify({
    query: `mutation {
      appSubscriptionCreate(
          name: "Long Trial"
          returnUrl: "${returnUrl}"
          test: true
          trialDays: ${settings.longTrial}
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
    }`,
  });

  const client = new Shopify.Clients.Graphql(shop, accessToken);
  const response = await client.query({
    data: query,
  });
  const {confirmationUrl} = response.body.data.appSubscriptionCreate;

  /** Getting the charge ID */
  const chargeID = response.body.data.appSubscriptionCreate.appSubscription.id.split(
    "/",
  )[4];

  initShop(shop, accessToken, chargeID, confirmationUrl);

  if (webhook) {
    createWebhook(`/${APP}/uninstall`, "APP_UNINSTALLED", accessToken, shop);
  }

  if (!getUrl) {
    return ctx.redirect(confirmationUrl);
  }
  return confirmationUrl;
};

module.exports = getSubscriptionUrl;
