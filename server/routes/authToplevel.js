// server/routes/authToplevel.js
const Router = require("koa-router");
const { ensureHost } = require("../lib/shopify/host");
const env = require("../config/config");

const router = new Router();

router.get("/auth/toplevel", async (ctx) => {
  const shop = ctx.query.shop;
  
  if (!shop) {
    ctx.status = 400;
    ctx.body = "Missing shop parameter";
    return;
  }
  
  const host = ensureHost(shop, ctx.query.host);
  const redirectTo = ctx.query.redirectTo || `/install/auth?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(host)}`;
  const apiKey = env.SHOPIFY_API_KEY || process.env.SHOPIFY_API_KEY || process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;

  if (!apiKey) {
    ctx.status = 500;
    ctx.body = "Missing SHOPIFY_API_KEY configuration";
    return;
  }

  ctx.type = "html";
  ctx.body = `<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body>
    <script src="https://unpkg.com/@shopify/app-bridge@3"></script>
    <script>
      (function () {
        var apiKey = ${JSON.stringify(apiKey)};
        var host = ${JSON.stringify(host)};
        var redirectTo = ${JSON.stringify(redirectTo)};

        var AppBridge = window["app-bridge"];
        var createApp = AppBridge.default;
        var actions = AppBridge.actions;
        var Redirect = actions.Redirect;

        var app = createApp({ apiKey: apiKey, host: host, forceRedirect: true });
        Redirect.create(app).dispatch(Redirect.Action.REMOTE, redirectTo);
      })();
    </script>
    Redirecting…
  </body>
</html>`;
});

module.exports = router;

