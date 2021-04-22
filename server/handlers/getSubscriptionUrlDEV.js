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
const getSubscriptionUrlDEV = async (
    ctx,
    accessToken,
    shop,
    returnUrl,
    getUrl = false,
    webhook = true,
) => {
  const {trial, price} = await getFs("settings", APP);

  const query = `mutation {
    appSubscriptionCreate(
        name: "Development Plan(Free - You will not be billed for this test charge!)"
        returnUrl: "${returnUrl}"
        test: true
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
  }`;

  const client = new Shopify.Clients.Graphql(shop, accessToken);
  const response = await client.query({
    data: query,
  });
  const {confirmationUrl} = response.body.data.appSubscriptionCreate;

    /** Getting the charge ID */
  const chargeID = response.body.data.appSubscriptionCreate.appSubscription.id.split(
        "/",
    )[4];

    /** Initialization of the shop without saving the charging plan */
  await initShop(shop, accessToken, chargeID, confirmationUrl);

    /** Creating Uninstall webhook on shopify that will be triggered directly after uninstall */
  if (webhook) {
    createWebhook(`/${APP}/uninstall`, "APP_UNINSTALLED", accessToken, shop);
  }

  if (!getUrl) {
    return ctx.redirect(confirmationUrl);
  }
  return confirmationUrl;
};

module.exports = getSubscriptionUrlDEV;
