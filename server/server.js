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

const extractHostParameter = (ctx) => {
  const parts = new URL(`https://${ctx.request.header.host}${ctx.request.url}`);
  return parts.searchParams.get("host");
};

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
          if (isDev) {
            // if not active or development we run the install function
            await getSubscriptionUrlDEV(ctx, accessToken, shop, returnUrl);
          } else {
            await getSubscriptionUrl(ctx, accessToken, shop, returnUrl);
          }
        },
      })
    );
    const handleRequest = async (ctx) => {
      await handle(ctx.req, ctx.res);
      ctx.respond = false;
      ctx.res.statusCode = 200;
    };

    router.get("/", async (ctx) => {
      const shop = ctx.query.shop;
      if (shop) {
        console.log(`Shop from query main page! ${shop}`);
        const storeDB = await getFs(APP, shop);
        const activeCharge = checkCharge(
          shop,
          storeDB.token,
          storeDB?.chargeID
        );
        if (storeDB && activeCharge) {
          await handleRequest(ctx);
          ctx.redirect(`/auth?shop=${shop}`);
        } else {
          console.log("no shop in DB lets auth");
          ctx.redirect(`/auth?shop=${shop}`);
        }
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
