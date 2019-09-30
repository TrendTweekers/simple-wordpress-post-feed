/** Creating webhook for uninstall */
// //////////////////////////////////

const { getShop, pushDB } = require("../lib/firebase/firebase");
const config = require("../config/config");

const { COLLECTION } = config;

exports.uninstallRoute = async ctx => {
  console.log("uninstall");
  const { domain } = ctx.request.body;
  pushDB(COLLECTION, domain, { status: "DELETED" });
  return "success";
};
