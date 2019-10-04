/* eslint-disable camelcase */

const { deleteShop } = require("../lib/firebase/firebase");
const config = require("../config/config");

const { COLLECTION } = config;

/** Deleting stored data in DB
 * @param  {context} ctx
 */
exports.redactRoute = async ctx => {
  ctx.response.status = 200;
  const { shop_domain } = ctx.request.body;
  const shopRef = await deleteShop(COLLECTION, shop_domain);
  // successfully removed shop
  if (shopRef === true) {
    ctx.response.status = 200;
    ctx.body = request;
    return;
  }
  // error removing shop
  ctx.response.status = 404;
  ctx.body = request;
};
