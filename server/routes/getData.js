const { getFs, getSettings } = require("../lib/firebase/firebase");
const config = require("../config/config");

const { APP } = config;

/** Getting all the data from DB
 * @param  {context} ctx
 */
exports.getData = async ctx => {
  const { shop } = await ctx.session;

  console.log("GET DATA LOG");
  console.log(shop);

  /** Checking version in settings DB */
  const settings = await getSettings(APP);
  const fsData = await getFs(
    APP,
    "brbp-theme-assets-development-store.myshopify.com"
  );

  let disableUpdate = true;
  if (fsData.version !== settings.version) {
    disableUpdate = false;
  }

  const data = {
    version: fsData.version,
    latestVersion: settings.version,
    disableUpdate
  };
  console.log(settings);
  console.log("LOGGING FS DATA FROM ROUTE");
  console.log(data);
  ctx.body = data;
  return data;
};
