/* eslint-disable require-atomic-updates */
import "@babel/polyfill";

import "isomorphic-unfetch";
import { receiveWebhook } from "@shopify/koa-shopify-webhooks";
import Koa from "koa";
import next from "next";
import bodyParser from "koa-bodyparser";
import Router from "@koa/router";
import session from "koa-session";
import { Shopify, ApiVersion } from "@shopify/shopify-api";
// import createShopifyAuth,{verifyRequest}  from "@shopify/koa-shopify-auth";
import { createShopifyAuth, verifyRequest } from "simple-koa-shopify-auth";

import getSubscriptionUrlDEV from "./handlers/getSubscriptionUrlDEV";
import getSubscriptionUrl from "./handlers/getSubscriptionUrl";
import env from "./config/config";
import { getFs } from "./lib/firebase/firebase";
import {
  getData,
  uploadData,
  update,
  deleteAllMeta,
  uninstall,
  redact,
  install,
  customerData,
  customerRedact,
  cancelCharge,
  downloadMetafield,
} from "./routes/";
import { checkDevShop, checkCharge } from "./lib/shopify/functions";

const { SHOPIFY_API_SECRET_KEY, SHOPIFY_API_KEY, APP, TUNNEL_URL } = env;

Shopify.Context.initialize({
  API_KEY: SHOPIFY_API_KEY,
  API_SECRET_KEY: SHOPIFY_API_SECRET_KEY,
  SCOPES: process.env.SCOPES
    ? process.env.SCOPES.split(",")
    : "write_themes,read_themes,read_script_tags,write_script_tags",
  HOST_NAME: TUNNEL_URL.replace(/https:\/\//, ""),
  API_VERSION: ApiVersion.January22,
  IS_EMBEDDED_APP: true,
  SESSION_STORAGE: new Shopify.Session.MemorySessionStorage(),
});

const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = new Koa();
    const router = new Router();
    server.proxy = true;
    server.use(bodyParser());
    server.use(session({ sameSite: "none", secure: true }, server));
    server.keys = [Shopify.Context.API_SECRET_KEY];
    server.use(
      createShopifyAuth({
        accessMode: "offline",
        authRoute: "/install/auth",
        returnHeader: false,
        async afterAuth(ctx) {
          console.log(`after auth ran`);
          const { shop, accessToken } = ctx.state.shopify;
          const { host } = ctx.query;
          if (!accessToken) {
            // This can happen if the browser interferes with the auth flow
            ctx.response.status = 500;
            ctx.response.body = "Failed to get access token! Please try again.";
            return;
          }
          /** Check if its a development shop */
          const isDev = await checkDevShop(shop, accessToken);
          const returnUrl = `https://${Shopify.Context.HOST_NAME}?host=${host}&shop=${shop}`;
          
          // Get subscription URL (billing confirmation) if needed
          let confirmationUrl = null;
          if (isDev) {
            // if not active or development we run the install function
            confirmationUrl = await getSubscriptionUrlDEV(ctx, accessToken, shop, returnUrl, true);
          } else {
            confirmationUrl = await getSubscriptionUrl(ctx, accessToken, shop, returnUrl, true);
          }
          
          // If billing confirmation is needed, redirect to it
          // Otherwise, redirect to Shopify app launcher
          if (confirmationUrl) {
            ctx.redirect(confirmationUrl);
          } else {
            // Redirect to Shopify app launcher to ensure proper embedding
            const appLauncherUrl = `https://${shop}/admin/apps/${SHOPIFY_API_KEY}`;
            ctx.redirect(appLauncherUrl);
          }
        },
      })
    );
    const handleRequest = async (ctx) => {
      await handle(ctx.req, ctx.res);
      ctx.respond = false;
      ctx.res.statusCode = 200;
    };

    // Handle Shopify embedded app toplevel redirect for OAuth
    router.get("/auth/toplevel", async (ctx) => {
      const { shop, host } = ctx.query;
      if (shop && host) {
        // Redirect to OAuth flow in top-level window to break out of iframe
        ctx.redirect(`/install/auth?shop=${shop}&host=${host}`);
      } else {
        ctx.status = 400;
        ctx.body = "Missing shop or host parameter";
      }
    });

    router.get("/", async (ctx) => {
      const shop = ctx.query.shop;
      const host = ctx.query.host;
      
      // Check if this is an embedded app request (has shop and host)
      if (shop && host) {
        console.log(`Shop from query main page! ${shop}`);
        
        // Get shop data from Firebase
        const storeDB = await getFs(APP, shop);
        
        // Check if shop data exists and has required token
        if (!storeDB || !storeDB.token) {
          console.log(`No valid shop data found for ${shop}, redirecting to toplevel auth`);
          // Redirect to toplevel auth to break out of iframe for OAuth
          ctx.redirect(`/auth/toplevel?shop=${shop}&host=${host}`);
          return;
        }
        
        // Shop exists, check if charge is active
        const activeCharge = await checkCharge(
          shop,
          storeDB.token,
          storeDB?.chargeID
        );
        
        if (activeCharge) {
          await handleRequest(ctx);
        } else {
          console.log("Charge not active, redirecting to toplevel auth");
          // Redirect to toplevel auth to break out of iframe for OAuth
          ctx.redirect(`/auth/toplevel?shop=${shop}&host=${host}`);
        }
      } else if (shop) {
        // Non-embedded request, handle normally
        console.log(`Non-embedded request for shop: ${shop}`);
        await handleRequest(ctx);
      } else {
        // No shop parameter, handle normally
        await handleRequest(ctx);
      }
    });

    const webhook = receiveWebhook({ secret: SHOPIFY_API_SECRET_KEY });
    router
      .get("/api/data", getData)
      .post("/api/data", uploadData)
      .post("/api/deletedata", deleteAllMeta)
      .get("/api/meta", downloadMetafield)
      .get("/api/install", install)
      .post("/api/update", update)
      .post("/swpf/shop/redact", webhook, redact)
      .post("/swpf/customers/data_request", webhook, customerData)
      .post("/swpf/customers/redact", webhook, customerRedact)
      .post("/swpf/uninstall", webhook, uninstall)
      .post("/api/cancel", cancelCharge);

    // Static content is clear
    router.get("(/_next/static/.*)", handleRequest);
    // Webpack content is clear
    router.get("/_next/webpack-hmr", handleRequest);
    // Everything else must have sessions
    router.get("(.*)", verifyRequest(), handleRequest);

    server.use(router.allowedMethods());
    server.use(router.routes());
    router.post(
      "/graphql",
      verifyRequest({ returnHeader: true }),
      async (ctx) => {
        await Shopify.Utils.graphqlProxy(ctx.req, ctx.res);
      }
    );

    server.use(router.routes());

    server.listen(port, () => {
      console.log(`> Ready on http://localhost:${port}`);
    });
  })
  .catch((err) => console.log(err));
