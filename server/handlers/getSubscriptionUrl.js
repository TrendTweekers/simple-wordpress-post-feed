const { default: Shopify } = require("@shopify/shopify-api");

const { getFs } = require("../lib/firebase/firebase");
const config = require("../config/config");

const { APP } = config;

const { initShop } = require("./checkShop");

/** Creating subscription URL
 * @param  {object} ctx context object
 * @param  {string} accessToken
 * @param  {string} shop
 * @param  {string} returnUrl
 * @param  {boolean} getUrl default false if we want to get back the URL and not redirect
 * @param {boolean} webhook default true if we want to make a webhook
 */
const getSubscriptionUrl = async (
  ctx,
  accessToken,
  shop,
  returnUrl,
  getUrl = false,
  webhook = true
) => {
  const { trial, price } = await getFs("settings", APP);

  const query = `mutation {
      appSubscriptionCreate(
          name: "Recurring charge"
          returnUrl: "${returnUrl}"
          test: false
          trialDays: ${trial}
          lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                  price: { amount: ${price}, currencyCode: USD },
                  interval: EVERY_30_DAYS
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
              status
            }
        }
    }`;

  const client = new Shopify.Clients.Graphql(shop, accessToken);
  const response = await client.query({
    data: query,
  });
  const { confirmationUrl } = response.body.data.appSubscriptionCreate;

  /** Getting the charge ID */
  const chargeID =
    response.body.data.appSubscriptionCreate.appSubscription.id.split("/")[4];

  initShop(shop, accessToken, chargeID, confirmationUrl);

  if (!getUrl) {
    return ctx.redirect(confirmationUrl);
  }
  return confirmationUrl;
};

module.exports = getSubscriptionUrl;
