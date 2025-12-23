/* eslint-disable require-atomic-updates */
import "@babel/polyfill";

import "isomorphic-unfetch";
import { receiveWebhook } from "@shopify/koa-shopify-webhooks";
import Koa from "koa";
import next from "next";
import bodyParser from "koa-bodyparser";
import Router from "@koa/router";
import session from "koa-session";
import serve from "koa-static";
import mount from "koa-mount";
import path from "path";
import { Shopify, ApiVersion } from "@shopify/shopify-api";
// import createShopifyAuth,{verifyRequest}  from "@shopify/koa-shopify-auth";
import { createShopifyAuth, verifyRequest } from "simple-koa-shopify-auth";

import getSubscriptionUrlDEV from "./handlers/getSubscriptionUrlDEV";
import getSubscriptionUrl from "./handlers/getSubscriptionUrl";
import env from "./config/config";
import { getFs, writeFs } from "./lib/firebase/firebase";
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
import { checkDevShop, checkCharge, checkAppSubscription } from "./lib/shopify/functions";

const { SHOPIFY_API_SECRET_KEY, SHOPIFY_API_KEY, APP, TUNNEL_URL, SCOPES: ENV_SCOPES } = env;

// ✅ FIX: Ensure SCOPES is always an array with ALL 4 required scopes
// Priority: config.js > process.env.SCOPES > hardcoded fallback
// ✅ SIMPLIFIED: Only request write permissions (write includes read automatically)
let scopesArray;
if (Array.isArray(ENV_SCOPES) && ENV_SCOPES.length === 2) {
  // Use scopes from config.js (already an array) - MUST have 2 scopes
  scopesArray = ENV_SCOPES;
  console.log("[SHOPIFY INIT] Using scopes from config.js:", scopesArray);
} else if (process.env.SCOPES) {
  // Fallback to process.env.SCOPES if config doesn't have it
  scopesArray = process.env.SCOPES.split(",").map(s => s.trim());
  console.log("[SHOPIFY INIT] Using scopes from process.env.SCOPES:", scopesArray);
  // ✅ VALIDATE: Ensure both write scopes are present
  const requiredScopes = ["write_themes", "write_script_tags"];
  const missingScopes = requiredScopes.filter(s => !scopesArray.includes(s));
  if (missingScopes.length > 0) {
    console.warn("[SHOPIFY INIT] ⚠️ Missing scopes in process.env.SCOPES:", missingScopes);
    console.warn("[SHOPIFY INIT] Using fallback with both write scopes");
    scopesArray = requiredScopes;
  }
} else {
  // Final fallback - ALWAYS use both write scopes
  scopesArray = ["write_themes", "write_script_tags"];
  console.log("[SHOPIFY INIT] Using hardcoded fallback scopes:", scopesArray);
}

// ✅ CRITICAL: Validate we have exactly 2 scopes
if (scopesArray.length !== 2) {
  console.error("[SHOPIFY INIT] ❌ ERROR: Expected 2 scopes, got", scopesArray.length, scopesArray);
  // Force correct scopes
  scopesArray = ["write_themes", "write_script_tags"];
  console.log("[SHOPIFY INIT] ✅ Forced correct scopes:", scopesArray);
}

console.log("[SHOPIFY INIT] ✅ Final scopes configured:", scopesArray);

// ✅ CRITICAL: Use Firebase-based session storage instead of MemorySessionStorage
// This ensures sessions persist and are accessible by both Shopify library and manual Firebase lookups
const FirebaseSessionStorage = require("./lib/shopify/firebaseSessionStorage");
const customSessionStorage = new FirebaseSessionStorage();

Shopify.Context.initialize({
  API_KEY: SHOPIFY_API_KEY,
  API_SECRET_KEY: SHOPIFY_API_SECRET_KEY,
  SCOPES: scopesArray,  // ✅ Always an array
  HOST_NAME: TUNNEL_URL.replace(/https:\/\//, ""),
  API_VERSION: ApiVersion.January22,
  IS_EMBEDDED_APP: true,
  SESSION_STORAGE: customSessionStorage, // ✅ Use Firebase session storage
});

// Boot check: verify session storage is available after initialization
const { getSessionStorageSafe } = require("./lib/shopify/shopify");
const shopifyApi = Shopify; // The initialized Shopify instance
const storage = getSessionStorageSafe(shopifyApi);
console.log("[SESSION STORAGE] Boot check: active =", storage ? "OK" : "MISSING");
if (storage) {
  console.log("[SESSION STORAGE] Boot check: loadSession =", typeof storage.loadSession);
  console.log("[SESSION STORAGE] Boot check: deleteSession =", typeof storage.deleteSession);
}

const port = parseInt(process.env.PORT, 10) || 3000;
// Force production mode - don't rely on NODE_ENV (prevents "assets exist but Next still 404s" bugs)
const dev = false;
const app = next({ dev });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    // Runtime sanity checks - verify .next directory exists
    const fs = require("fs");
    console.log("HAS .next:", fs.existsSync(".next"));
    console.log("HAS .next/static:", fs.existsSync(".next/static"));
    console.log("HAS .next/static/chunks:", fs.existsSync(".next/static/chunks"));
    
    // Proof logs - verify BUILD_ID and chunks
    const buildIdPath = path.join(process.cwd(), ".next", "BUILD_ID");
    console.log("BUILD_ID exists:", fs.existsSync(buildIdPath));
    if (fs.existsSync(buildIdPath)) {
      console.log("BUILD_ID:", fs.readFileSync(buildIdPath, "utf8").trim());
    }
    console.log("chunks count:", fs.existsSync(".next/static/chunks") ? fs.readdirSync(".next/static/chunks").length : 0);
    
    // Runtime debug log - check static chunks directories
    const chunksPath = path.join(process.cwd(), ".next/static/chunks");
    const standaloneChunksPath = path.join(process.cwd(), ".next/standalone/.next/static/chunks");
    console.log(`\n=== Static Chunks Debug ===`);
    console.log(`Regular chunks path exists: ${fs.existsSync(chunksPath)}`);
    if (fs.existsSync(chunksPath)) {
      const files = fs.readdirSync(chunksPath).slice(0, 30);
      console.log(`Regular chunks files (first 30):`, files);
    }
    console.log(`Standalone chunks path exists: ${fs.existsSync(standaloneChunksPath)}`);
    if (fs.existsSync(standaloneChunksPath)) {
      const files = fs.readdirSync(standaloneChunksPath).slice(0, 30);
      console.log(`Standalone chunks files (first 30):`, files);
    }
    console.log(`process.cwd():`, process.cwd());
    console.log(`===========================\n`);
    
    const server = new Koa();
    // ✅ CRITICAL: Trust Railway proxy for secure cookies (required for SameSite=None cookies)
    server.proxy = true;
    
    // ✅ CRITICAL: Validate Railway Variables - Check SHOPIFY_API_SECRET_KEY
    if (!SHOPIFY_API_SECRET_KEY || SHOPIFY_API_SECRET_KEY === 'undefined' || SHOPIFY_API_SECRET_KEY.trim() === '') {
      console.error(`[SERVER] ❌ CRITICAL: SHOPIFY_API_SECRET_KEY is missing or undefined!`);
      console.error(`[SERVER] This will cause session storage checks to fail silently`);
      console.error(`[SERVER] Please verify Railway environment variable SHOPIFY_API_SECRET_KEY is set correctly`);
    } else {
      console.log(`[SERVER] ✅ SHOPIFY_API_SECRET_KEY is configured (length=${SHOPIFY_API_SECRET_KEY.length})`);
    }
    
    const router = new Router();
    
    // Global error handler to suppress EPIPE errors (common in web servers)
    server.on('error', (err, ctx) => {
      if (err.code === 'EPIPE') {
        // Client disconnected - ignore this common error
        return;
      }
      // Log other errors normally
      console.error('Server error:', err);
    });
    
    console.log("✅ _next middleware mounted in", __filename);
    console.log("✅ Custom Koa server starting - auth routes will be handled by Koa, not Next.js");
    
    // ✅ CRITICAL: Create Shopify auth middleware FIRST (required for hard intercept below)
    // ✅ FIX: Explicitly pass scopes to ensure OAuth requests correct permissions
    const shopifyAuthMiddleware = createShopifyAuth({
      accessMode: "offline",
      authPath: "/install/auth",
      authCallbackPath: "/install/auth/callback",
      returnHeader: false,
      scopes: scopesArray,  // ✅ Explicitly set scopes for OAuth
      async afterAuth(ctx) {
          console.log(`[AFTER AUTH] OAuth callback completed`);
          const { shop, accessToken } = ctx.state.shopify;
          const { host } = ctx.query;
          
          if (!accessToken) {
            // This can happen if the browser interferes with the auth flow
            ctx.response.status = 500;
            ctx.response.body = "Failed to get access token! Please try again.";
            return;
          }

          // ✅ SCOPE VERIFICATION: Verify all required scopes were granted
          const { verifySessionScopes, forceDeleteSession } = require("./lib/oauth-helpers");
          const session = ctx.state.shopify.session || ctx.state.shopify;
          
          // ✅ CRITICAL: Log session object to verify scope property exists
          console.log(`[AFTER AUTH] Session object keys:`, Object.keys(session || {}));
          console.log(`[AFTER AUTH] Session scope property:`, session?.scope || 'MISSING');
          console.log(`[AFTER AUTH] Session scope type:`, typeof session?.scope);
          
          const scopeVerification = verifySessionScopes(session);
          
          if (!scopeVerification.valid) {
            console.error(`[AFTER AUTH] ❌ Missing required scopes for ${shop}!`);
            console.error(`[AFTER AUTH] Missing scopes:`, scopeVerification.missingScopes);
            console.error(`[AFTER AUTH] Current scopes:`, session?.scope || 'none');
            
            // Delete the incomplete session and redirect to re-auth
            await forceDeleteSession(shop);
            
            const errorQuery = new URLSearchParams({
              shop: shop,
              host: host || '',
              error: 'missing_scopes',
              missing: scopeVerification.missingScopes.join(',')
            });
            
            // ✅ CRITICAL: Ensure host parameter is explicitly passed in redirect
            console.log(`[AFTER AUTH] Redirecting to error page with shop=${shop}&host=${host || ''}`);
            ctx.redirect(`/?${errorQuery.toString()}`);
            return;
          }

          console.log(`[AFTER AUTH] ✅ All required scopes granted for ${shop}`);
          console.log(`[AFTER AUTH] Granted scopes:`, session?.scope || 'unknown');
          
          // ✅ CRITICAL: Ensure session object has scope before storing
          if (!session.scope) {
            console.error(`[AFTER AUTH] ❌ CRITICAL: Session object missing scope property before storing!`);
            console.error(`[AFTER AUTH] Session object:`, JSON.stringify(session, null, 2));
            console.error(`[AFTER AUTH] This will cause AUTH-GUARD to fail with granted: []`);
          }
          
          // ✅ CRITICAL: Log session ID format to verify consistency with SHOP GUARD
          const sessionId = session?.id || session?.sessionId || 'unknown';
          console.log(`[AFTER AUTH] Session ID format: ${sessionId}`);
          console.log(`[AFTER AUTH] Session shop: ${session?.shop || shop}`);
          
          // Verify session ID format matches what SHOP GUARD expects
          const { getOfflineIdSafe } = require("./lib/shopify/session");
          const { shopifyApi } = require("./lib/shopify/shopify");
          const expectedOfflineId = getOfflineIdSafe(shop, shopifyApi);
          console.log(`[AFTER AUTH] Expected offline ID format: ${expectedOfflineId}`);
          
          // ✅ CRITICAL: Save accessToken to Firebase using unified session ID format
          // Use offline_{shop} as the document ID to match SHOP GUARD lookup
          try {
            console.log(`[AFTER AUTH] [SESSION] Accessing Firebase document ID: ${expectedOfflineId}`);
            console.log(`[AFTER AUTH] Saving accessToken to Firebase for ${shop}...`);
            
            // ✅ CRITICAL: Save to Firebase using offline_{shop} format (matches SHOP GUARD lookup)
            await writeFs(APP, expectedOfflineId, { 
              token: accessToken,
              accessToken: accessToken, // Save to both fields for compatibility
              shop: shop,
              updatedAt: new Date().toISOString()
            });
            console.log(`[AFTER AUTH] ✅ Successfully saved accessToken to Firebase document: ${expectedOfflineId}`);
            
            // ✅ CRITICAL: Verify the token was saved using the same document ID format
            const verifyStoreDB = await getFs(APP, expectedOfflineId);
            if (verifyStoreDB && (verifyStoreDB.token || verifyStoreDB.accessToken)) {
              const savedToken = verifyStoreDB.token || verifyStoreDB.accessToken;
              console.log(`[AFTER AUTH] ✅ Verified token saved to Firebase document ${expectedOfflineId} (length=${savedToken ? savedToken.length : 0})`);
            } else {
              console.warn(`[AFTER AUTH] ⚠️ Token save verification failed - token not found in Firebase document ${expectedOfflineId}`);
            }
            
            // ✅ CRITICAL: Also save to legacy shop document for backward compatibility
            // Some code paths might still look for shop name directly
            try {
              await writeFs(APP, shop, { 
                token: accessToken,
                accessToken: accessToken,
                shop: shop,
                updatedAt: new Date().toISOString()
              });
              console.log(`[AFTER AUTH] ✅ Also saved token to legacy Firebase document: ${shop}`);
            } catch (legacyError) {
              console.warn(`[AFTER AUTH] ⚠️ Failed to save to legacy document ${shop}:`, legacyError.message);
            }
          } catch (firebaseError) {
            console.error(`[AFTER AUTH] ❌ CRITICAL: Failed to save accessToken to Firebase for ${shop}:`, firebaseError);
            console.error(`[AFTER AUTH] Document ID attempted: ${expectedOfflineId}`);
            console.error(`[AFTER AUTH] This will cause SHOP GUARD to trigger OAuth again on next request`);
            // Don't return here - continue with auth flow even if Firebase save fails
          }
          if (sessionId !== expectedOfflineId && sessionId !== 'unknown') {
            console.warn(`[AFTER AUTH] ⚠️ Session ID mismatch! Saved as: ${sessionId}, SHOP GUARD expects: ${expectedOfflineId}`);
          } else {
            console.log(`[AFTER AUTH] ✅ Session ID format matches expected format`);
          }
          
          // ✅ CRITICAL: Force session save before redirect
          // This ensures the session is committed to storage before the redirect happens
          if (ctx.session && typeof ctx.session.save === 'function') {
            await ctx.session.save();
            console.log(`[AFTER AUTH] Koa session saved to storage for ${shop}`);
          } else {
            console.log(`[AFTER AUTH] Koa session save not available (using Shopify session storage)`);
          }
          
          // ✅ CRITICAL: Store session in Shopify library's session storage
          // This registers the session with the library so AUTH-GUARD can find it
          const { getSessionStorageSafe } = require("./lib/shopify/shopify");
          const storage = getSessionStorageSafe(shopifyApi);
          if (storage && session) {
            try {
              console.log(`[AFTER AUTH] Storing session in Shopify library storage (id=${expectedOfflineId})...`);
              await storage.storeSession(session);
              console.log(`[AFTER AUTH] ✅ Successfully stored session in Shopify library storage`);
              
              // Verify the session was stored
              const storedSession = await storage.loadSession(expectedOfflineId);
              if (storedSession && storedSession.accessToken) {
                console.log(`[AFTER AUTH] ✅ Verified session exists in Shopify storage with ID: ${expectedOfflineId}`);
              } else {
                console.warn(`[AFTER AUTH] ⚠️ Session not found in Shopify storage after store (id=${expectedOfflineId})`);
              }
            } catch (err) {
              console.error(`[AFTER AUTH] ❌ CRITICAL: Failed to store session in Shopify library storage:`, err.message);
              console.error(`[AFTER AUTH] This will cause AUTH-GUARD to trigger re-auth because reason: 'no_session'`);
            }
          } else {
            console.warn(`[AFTER AUTH] ⚠️ Session storage not available or session missing`);
          }
          
          /** Check if its a development shop */
          const isDev = await checkDevShop(shop, accessToken);
          
          // ✅ IDEMPOTENT BILLING GUARD: Check Shopify first before creating subscription
          const hasActiveSubscription = await checkAppSubscription(shop, accessToken);
          
          // ✅ CRITICAL: Ensure host is defined before redirect
          // Host comes from query params during OAuth callback
          const finalHost = host || ctx.query.host || '';
          if (!finalHost) {
            console.warn(`[AFTER AUTH] ⚠️ Host parameter missing in callback - attempting to generate from shop`);
            // Try to generate host from shop if missing
            try {
              const generatedHost = btoa(`${shop}/admin`);
              console.log(`[AFTER AUTH] Generated host from shop: ${generatedHost}`);
            } catch (e) {
              console.error(`[AFTER AUTH] Failed to generate host:`, e);
            }
          }
          
          if (hasActiveSubscription) {
            console.log(`[BILLING GUARD] Active subscription exists for ${shop} after OAuth - skipping charge creation`);
            // ✅ CRITICAL: Fix final redirect - ensure host is defined and encoded
            console.log(`[AFTER AUTH] Redirecting to app with shop=${shop}&host=${finalHost}`);
            ctx.redirect(`/?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(finalHost)}`);
            return;
          }
          
          console.log(`[BILLING GUARD] No active subscription found for ${shop} after OAuth - creating charge`);
          const returnUrl = `https://${Shopify.Context.HOST_NAME}?host=${finalHost}&shop=${shop}`;
          
          // Get subscription URL (billing confirmation) if needed
          let confirmationUrl = null;
          if (isDev) {
            // if not active or development we run the install function
            confirmationUrl = await getSubscriptionUrlDEV(ctx, accessToken, shop, returnUrl, true);
          } else {
            confirmationUrl = await getSubscriptionUrl(ctx, accessToken, shop, returnUrl, true);
          }
          
          // If billing confirmation is needed, redirect to it
          // Otherwise, redirect to app with host and shop parameters
          if (confirmationUrl) {
            ctx.redirect(confirmationUrl);
          } else {
            // ✅ CRITICAL: Fix final redirect - ensure host is defined and encoded
            console.log(`[AFTER AUTH] Redirecting to app with shop=${shop}&host=${finalHost}`);
            ctx.redirect(`/?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(finalHost)}`);
          }
        },
      });
    
    // ✅ HARD INTERCEPT: Normalize path and intercept /install/auth routes BEFORE EVERYTHING
    // This ensures these routes NEVER reach Next.js, router, or any other middleware
    server.use(async (ctx, next) => {
      // Normalize path by stripping trailing slashes
      const p = ctx.path.replace(/\/+$/, "");
      
      // Hard intercept: if normalized path matches auth routes, check scopes and handle OAuth
      if (p === "/install/auth") {
        console.log("[AUTH-GUARD] intercept /install/auth", ctx.method, ctx.path, ctx.querystring);
        const shop = ctx.query.shop;
        
        if (shop) {
          try {
            // ✅ SCOPE CHECK: Check if we need to request new scopes before OAuth
            const { checkScopesNeedApproval, forceDeleteSession } = require("./lib/oauth-helpers");
            const scopeCheck = await checkScopesNeedApproval(shop);
            
            console.log("[AUTH-GUARD] Scope check result:", {
              needsReauth: scopeCheck.needsReauth,
              currentScopes: scopeCheck.currentScopes,
              missingScopes: scopeCheck.missingScopes,
              reason: scopeCheck.reason
            });
            
            // If we need new scopes, delete the old session to force approval screen
            if (scopeCheck.needsReauth && scopeCheck.currentScopes) {
              console.log("[AUTH-GUARD] ⚠️ Missing scopes detected, deleting old session to force approval");
              console.log("[AUTH-GUARD] Missing scopes:", scopeCheck.missingScopes);
              await forceDeleteSession(shop);
            }
          } catch (scopeError) {
            console.error("[AUTH-GUARD] Error checking scopes:", scopeError);
            // Continue with OAuth even if scope check fails
          }
        }
        
        // Normalize ctx.path for auth middleware
        ctx.path = p;
        // Return auth middleware with noop next to prevent fallthrough
        return shopifyAuthMiddleware(ctx, async () => {});
      }
      
      if (p === "/install/auth/callback") {
        console.log("[AUTH-GUARD] intercept /install/auth/callback", ctx.method, ctx.path, ctx.querystring);
        // Normalize ctx.path for auth middleware
        ctx.path = p;
        // Return auth middleware with noop next to prevent fallthrough
        return shopifyAuthMiddleware(ctx, async () => {});
      }
      
      return next();
    });
    
    // ✅ REQUIRED: Body parser and session MUST be before Shopify auth middleware
    server.use(bodyParser());
    // Configure session for cross-site cookie support
    server.use(session({ 
      sameSite: "none",  // Required for cross-site (iframe) cookies
      secure: true,       // Requires HTTPS (Railway handles this)
      httpOnly: true,    // Prevents XSS attacks
      maxAge: 86400000,  // 24 hours
      renew: true        // Renew session on activity
    }, server));
    server.keys = [Shopify.Context.API_SECRET_KEY];
    
    // Mount auth middleware normally (handles other auth-related routes)
    server.use(shopifyAuthMiddleware);
    
    // ✅ EARLY LOGGER: Track ALL /install/auth requests
    server.use(async (ctx, next) => {
      if (ctx.path.startsWith("/install/auth")) {
        console.log(`[EARLY LOG] ${ctx.method} ${ctx.path} - shop=${ctx.query.shop || 'none'}, host=${ctx.query.host || 'none'}`);
      }
      await next();
    });
    
    // Serve static assets with koa-static + koa-mount - MUST be ABSOLUTE FIRST middleware
    const nextStaticPath = path.join(process.cwd(), ".next", "static");
    
    // Logging middleware for /_next/static requests (before static serving)
    server.use(async (ctx, next) => {
      if (ctx.path.startsWith("/_next/static")) {
        const filePath = path.join(nextStaticPath, ctx.path.replace("/_next/static/", ""));
        console.log(`[_next/static] ${ctx.method} ${ctx.path} -> ${filePath}`);
        await next();
        console.log(`[_next/static] ${ctx.method} ${ctx.path} -> status: ${ctx.status}`);
        return;
      }
      await next();
    });
    
    // Static serving middleware - MUST be before any other /_next handling
    server.use(
      mount(
        "/_next/static",
        serve(nextStaticPath, {
          maxage: 365 * 24 * 60 * 60 * 1000,
          gzip: true,
        })
      )
    );
    
    // Let Next handle other _next paths (not /_next/static) and favicon
    server.use(async (ctx, next) => {
      if (ctx.path.startsWith("/_next/static")) {
        // Should never reach here if static middleware works
        console.warn(`[_next/static] WARNING: Request not handled by static middleware: ${ctx.path}`);
        return next();
      }
      if (ctx.path.startsWith("/_next/") || ctx.path === "/favicon.ico") {
        ctx.respond = false;
        await handle(ctx.req, ctx.res);
        return;
      }
      await next();
    });
    
    // Only enforce shop/host for HTML document requests, never for assets
    server.use(async (ctx, next) => {
      const isDocument =
        ctx.method === "GET" &&
        (ctx.get("sec-fetch-dest") === "document" || ctx.accepts("html"));
      
      // Only protect the main HTML page render
      if (isDocument && !ctx.query.shop && !ctx.query.host) {
        ctx.status = 400;
        ctx.body = "Open this app from Shopify Admin (missing shop/host).";
        return;
      }
      
      await next();
    });
    
    // ✅ CSP Middleware - Allow iframe embedding from Shopify domains
    // Required for embedded apps to work in Shopify admin iframe
    // ✅ CRITICAL: Must allow cdn.shopify.com for App Bridge script to load
    server.use(async (ctx, next) => {
      // Skip CSP for static assets and favicon
      if (ctx.path.startsWith("/_next/") || ctx.path === "/favicon.ico") {
        return next();
      }
      
      // Get shop from multiple sources (query params, session, request)
      const shop = ctx.query.shop || ctx.request.query.shop || (ctx.session && ctx.session.shop);
      
      if (shop) {
        // ✅ CRITICAL: Allow cdn.shopify.com for App Bridge script loading
        // frame-ancestors controls who can embed this page (for iframe)
        // script-src would control script sources, but we're not setting that here
        // The default script-src allows all, so cdn.shopify.com should work
        // But we explicitly allow it in case browser has strict CSP
        ctx.set('Content-Security-Policy', `frame-ancestors https://${shop} https://admin.shopify.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.shopify.com https://unpkg.com;`);
        console.log(`[CSP] Set frame-ancestors and script-src for shop: ${shop} (allowing cdn.shopify.com)`);
      } else {
        // Secure fallback - deny embedding if no shop identified
        // But still allow cdn.shopify.com scripts to load
        ctx.set('Content-Security-Policy', `frame-ancestors 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.shopify.com https://unpkg.com;`);
        console.log(`[CSP] No shop found, denying frame embedding but allowing cdn.shopify.com scripts`);
      }
      await next();
    });
    
    // ✅ PATH NORMALIZATION: Remove trailing slashes (except root and auth routes)
    // Auth routes are already handled by hard guard above, so skip them here
    server.use(async (ctx, next) => {
      // Skip auth routes - they're already handled by hard guard
      if (ctx.path === "/install/auth" || ctx.path === "/install/auth/" || 
          ctx.path === "/install/auth/callback" || ctx.path === "/install/auth/callback/") {
        return next();
      }
      // Normalize: remove trailing slash if path length > 1 (preserve root "/")
      if (ctx.path.length > 1 && ctx.path.endsWith("/")) {
        ctx.path = ctx.path.slice(0, -1);
      }
      await next();
    });
    
    // ✅ CRITICAL: Logging middleware for /install/auth - track all auth requests
    server.use(async (ctx, next) => {
      if (ctx.path === "/install/auth" || ctx.path.startsWith("/install/auth")) {
        console.log(`[AUTH] /install/auth hit: method=${ctx.method}, path=${ctx.path}, shop=${ctx.query.shop}, host=${ctx.query.host}`);
        const startTime = Date.now();
        await next();
        const duration = Date.now() - startTime;
        console.log(`[AUTH] /install/auth response: status=${ctx.status}, Location=${ctx.response.get('Location') || 'none'}, duration=${duration}ms`);
        return;
      }
      await next();
    });
    
    // ✅ REQUIRED: Next.js static assets - MUST BE FIRST ROUTE
    router.get("/_next/(.*)", async (ctx) => {
      ctx.respond = false;
      await handle(ctx.req, ctx.res);
    });
    
    // (Optional but safe) Static assets route
    router.get("/static/(.*)", async (ctx) => {
      ctx.respond = false;
      await handle(ctx.req, ctx.res);
    });
    const handleRequest = async (ctx) => {
      // ✅ FIX: Explicitly pass shop and host to frontend
      const shop = ctx.query.shop;
      const host = ctx.query.host;
      
      // Ensure shop and host are always in URL query params for frontend access
      if (shop && host) {
        ctx.req.query = { shop, host };
        // Ensure URL always has shop and host params
        const url = new URL(ctx.req.url || '/', `http://${ctx.req.headers.host || 'localhost'}`);
        url.searchParams.set('shop', shop);
        url.searchParams.set('host', host);
        ctx.req.url = url.pathname + url.search;
      } else if (shop) {
        // If only shop is present, ensure it's in URL
        const url = new URL(ctx.req.url || '/', `http://${ctx.req.headers.host || 'localhost'}`);
        url.searchParams.set('shop', shop);
        if (host) url.searchParams.set('host', host);
        ctx.req.query = { shop, ...(host && { host }) };
        ctx.req.url = url.pathname + url.search;
      }
      
      await handle(ctx.req, ctx.res);
      ctx.respond = false;
    };

    // --- /auth/toplevel (NO koa-router) ---
    const { ensureHost } = require("./lib/shopify/host");
    server.use(async (ctx, next) => {
      if (ctx.path !== "/auth/toplevel") return next();

      const apiKey =
        process.env.SHOPIFY_API_KEY ||
        process.env.API_KEY ||
        (SHOPIFY_API_KEY || "");

      const shop = ctx.query.shop;
      const host = ensureHost(shop, ctx.query.host);

      // IMPORTANT: redirectTo must be absolute so query params survive
      const redirectTo = ctx.query.redirectTo || `/install/auth?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(host)}`;
      const absoluteRedirectTo = redirectTo.startsWith("http")
        ? redirectTo
        : `${ctx.protocol}://${ctx.host}${redirectTo}`;

      console.log("[TOPLEVEL] /auth/toplevel hit", {
        shop,
        host,
        redirectTo,
        absoluteRedirectTo,
      });

      if (!apiKey) {
        ctx.status = 500;
        ctx.body = "Missing SHOPIFY_API_KEY configuration";
        return;
      }

      ctx.type = "html";
      ctx.body = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="referrer" content="no-referrer" />
    <title>Redirecting…</title>
    <script src="https://cdn.jsdelivr.net/npm/@shopify/app-bridge@3.7.10/umd/index.js"></script>
  </head>
  <body>
    <p style="font-family: -apple-system, system-ui, Segoe UI, Roboto, Arial;">Redirecting…</p>
    <script>
      (function () {
        var apiKey = ${JSON.stringify(apiKey)};
        var host = ${JSON.stringify(host)};
        var redirectTo = ${JSON.stringify(absoluteRedirectTo)};

        try {
          var AppBridge = window['app-bridge'];
          var createApp = AppBridge.default;
          var actions = AppBridge.actions;
          var Redirect = actions.Redirect;

          var app = createApp({ apiKey: apiKey, host: host, forceRedirect: true });
          var redirect = Redirect.create(app);

          // MUST be REMOTE so query params are not stripped
          redirect.dispatch(Redirect.Action.REMOTE, redirectTo);
        } catch (e) {
          // fallback (may be blocked by sandbox, but worth trying)
          try { window.top.location.href = redirectTo; } catch (_) {}
        }
      })();
    </script>
  </body>
</html>`;
      return;
    });

    router.get("/", async (ctx) => {
      // ✅ CRITICAL: Bypass Guard for Callback - let callback handler process it
      if (ctx.path === "/install/auth/callback" || ctx.path === "/install/auth/callback/") {
        console.log(`[SHOP GUARD] Bypassing guard for callback path: ${ctx.path}`);
        return next();
      }
      
      const shop = ctx.query.shop;
      const host = ctx.query.host;
      
      // Check if this is an embedded app request (has shop and host)
      if (shop && host) {
        console.log(`[SHOP GUARD] Checking access for shop: ${shop}`);
        
        // ✅ CRITICAL: Check if this is a Document Request (initial HTML load)
        // Document requests need to load so App Bridge can initialize
        // We don't require Bearer token for initial HTML - only for API calls
        const acceptHeader = ctx.get("accept") || ctx.request.headers.accept || '';
        const isDocumentRequest = acceptHeader.includes("text/html") || 
                                  (!acceptHeader.includes("application/json") && (ctx.path === '/' || ctx.path === ''));
        
        // ✅ DEBUG: Log Authorization header to verify Bearer token is being sent
        const authHeader = ctx.get('Authorization') || ctx.request.headers.authorization || ctx.request.header.authorization || '';
        console.log(`[SHOP GUARD] DEBUG: Authorization Header = [${authHeader}]`);
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const bearerToken = authHeader.substring(7);
          console.log(`[SHOP GUARD] DEBUG: Bearer token found (length=${bearerToken.length}, preview=${bearerToken.substring(0, 20)}...)`);
        } else {
          console.log(`[SHOP GUARD] DEBUG: No Bearer token in Authorization header - App Bridge may not be sending session token`);
        }
        
        // ✅ CRITICAL: First check offline session directly (same storage as Auth routes)
        // This is the source of truth after OAuth completes
        let offlineSession = null;
        let tokenToUse = null;
        let hasOfflineSession = false;
        
        try {
          const { loadOfflineSession } = require("./lib/shopify/session");
          const { shopifyApi } = require("./lib/shopify/shopify");
          const { getOfflineIdSafe } = require("./lib/shopify/session");
          const { getSessionStorageSafe } = require("./lib/shopify/shopify");
          
          // Use same sessionStorage instance as Auth routes
          const storage = getSessionStorageSafe(shopifyApi);
          if (storage) {
            // Construct offline ID using same method as Auth routes
            const offlineId = getOfflineIdSafe(shop, shopifyApi);
            console.log(`[SHOP GUARD] Checking offline session with ID: ${offlineId}`);
            
            // Try to load session directly from storage
            offlineSession = await storage.loadSession(offlineId);
            
            if (offlineSession && offlineSession.accessToken) {
              tokenToUse = offlineSession.accessToken;
              hasOfflineSession = true;
              console.log(`[SHOP GUARD] ✅ Found offline session for ${shop} (id=${offlineId})`);
            } else {
              console.log(`[SHOP GUARD] Offline session not found or missing token (id=${offlineId})`);
            }
          } else {
            console.log(`[SHOP GUARD] Session storage not available`);
          }
        } catch (sessionError) {
          console.log(`[SHOP GUARD] Error loading offline session:`, sessionError.message || sessionError);
          // Continue to check Firebase/legacy records
        }
        
        // ✅ CRITICAL: Trust Offline Session for Initial Load
        // If this is a document request AND we have an offline session, allow it to load
        // The frontend will then use App Bridge to get idToken for API calls
        if (isDocumentRequest && hasOfflineSession) {
          console.log(`[SHOP GUARD] ✅ Document request with offline session found - allowing HTML to load`);
          console.log(`[SHOP GUARD] App Bridge will initialize and handle API calls with Bearer token`);
          // Set the session in state so it's available for the request handler
          ctx.state.shopify = offlineSession;
          await handleRequest(ctx);
          return;
        }
        
        // Fallback: Check Firebase for existing shop data
        // ✅ CRITICAL: Use unified session ID format (offline_{shop}) to match afterAuth save logic
        let storeDB = null;
        const { getOfflineIdSafe } = require("./lib/shopify/session");
        const { shopifyApi } = require("./lib/shopify/shopify");
        const firebaseDocId = getOfflineIdSafe(shop, shopifyApi);
        
        try {
          console.log(`[SHOP GUARD] [SESSION] Accessing Firebase document ID: ${firebaseDocId}`);
          storeDB = await getFs(APP, firebaseDocId);
          console.log(`[SHOP GUARD] Firebase query result for document ${firebaseDocId}:`, storeDB ? 'Found' : 'Not found');
          
          // ✅ CRITICAL: Validate Firebase Data - check if accessToken field exists
          if (storeDB) {
            if (!storeDB.token && !storeDB.accessToken) {
              console.warn(`[FIREBASE] ⚠️ Document ${firebaseDocId} found in Firebase but accessToken field is missing`);
              console.warn(`[FIREBASE] Firebase document keys:`, Object.keys(storeDB));
            } else {
              const tokenField = storeDB.token || storeDB.accessToken;
              console.log(`[FIREBASE] ✅ Document ${firebaseDocId} found in Firebase with token (length=${tokenField ? tokenField.length : 0})`);
            }
          } else {
            // ✅ CRITICAL: Fallback to legacy shop document for backward compatibility
            console.log(`[SHOP GUARD] Document ${firebaseDocId} not found, checking legacy document: ${shop}`);
            try {
              storeDB = await getFs(APP, shop);
              if (storeDB) {
                console.log(`[SHOP GUARD] ✅ Found legacy Firebase document for ${shop}`);
                // Migrate token to new format
                if (storeDB.token || storeDB.accessToken) {
                  const tokenToMigrate = storeDB.token || storeDB.accessToken;
                  try {
                    await writeFs(APP, firebaseDocId, {
                      token: tokenToMigrate,
                      accessToken: tokenToMigrate,
                      shop: shop,
                      migratedAt: new Date().toISOString()
                    });
                    console.log(`[SHOP GUARD] ✅ Migrated token from legacy document ${shop} to ${firebaseDocId}`);
                  } catch (migrateError) {
                    console.warn(`[SHOP GUARD] ⚠️ Failed to migrate token:`, migrateError.message);
                  }
                }
              }
            } catch (legacyError) {
              console.log(`[SHOP GUARD] Legacy document ${shop} also not found`);
            }
          }
        } catch (error) {
          console.error(`[SHOP GUARD] Error fetching shop data from Firebase:`, error);
          storeDB = null;
        }
        
        // ✅ CRITICAL: Loosen Document Guard - If document request AND shop found in Firebase, allow HTML to load
        // Even if token is missing, let App Bridge initialize and handle authentication
        if (isDocumentRequest && storeDB) {
          console.log(`[SHOP GUARD] ✅ Document request with shop found in Firebase - allowing HTML to load`);
          console.log(`[SHOP GUARD] App Bridge will initialize and handle authentication via window.shopify.idToken()`);
          
          // Use token if available, but don't require it for document requests
          if (storeDB.token || storeDB.accessToken) {
            tokenToUse = storeDB.token || storeDB.accessToken;
            ctx.state.shopify = { accessToken: tokenToUse, shop: shop };
            console.log(`[SHOP GUARD] Token available in Firebase, setting in state`);
          } else {
            // No token, but still allow HTML to load - App Bridge will handle auth
            ctx.state.shopify = { shop: shop };
            console.log(`[SHOP GUARD] No token in Firebase, but allowing HTML load for App Bridge initialization`);
          }
          
          await handleRequest(ctx);
          return;
        }
        
        // ✅ CRITICAL: Trust Firebase Token for Initial Load (legacy check for token)
        // If this is a document request AND Firebase has a token, allow it to load
        if (isDocumentRequest && storeDB && (storeDB.token || storeDB.accessToken)) {
          console.log(`[SHOP GUARD] ✅ Document request with Firebase token found - allowing HTML to load`);
          console.log(`[SHOP GUARD] App Bridge will initialize and handle API calls with Bearer token`);
          tokenToUse = storeDB.token || storeDB.accessToken;
          // Create a session-like object for state
          ctx.state.shopify = { accessToken: tokenToUse, shop: shop };
          await handleRequest(ctx);
          return;
        }
        
        // If Firebase has token, use it (for API requests or charge checking)
        if (storeDB && (storeDB.token || storeDB.accessToken) && !tokenToUse) {
          tokenToUse = storeDB.token || storeDB.accessToken;
          console.log(`[SHOP GUARD] Using token from Firebase for ${shop}`);
        }
        
        // If we have offline session, proceed to check charge
        if (tokenToUse && !isDocumentRequest) {
          console.log(`[SHOP GUARD] Using offline session token for ${shop}`);
          let activeCharge = false;
          try {
            const { checkAppSubscription } = require("./lib/shopify/functions");
            activeCharge = await checkAppSubscription(shop, tokenToUse);
            if (activeCharge) {
              console.log(`[SHOP GUARD] Active charge found for ${shop}, rendering app`);
              await handleRequest(ctx);
              return;
            } else {
              console.log(`[SHOP GUARD] No active charge for ${shop}`);
            }
          } catch (chargeError) {
            console.log(`[SHOP GUARD] Error checking charge:`, chargeError.message || chargeError);
            // Continue to check other sources
          }
        }
        
        // Fallback: Check if there's a valid Shopify session (user is authenticated)
        const shopifySession = ctx.state.shopify;
        if (shopifySession && shopifySession.accessToken) {
          console.log(`[SHOP GUARD] Valid Shopify session found for ${shop}, proceeding with app`);
          await handleRequest(ctx);
          return;
        }
        
        // If we have a token from any source, check charge (only for non-document requests)
        if (tokenToUse && !isDocumentRequest) {
          try {
            const { checkAppSubscription, checkCharge } = require("./lib/shopify/functions");
            let activeCharge = await checkAppSubscription(shop, tokenToUse);
            if (!activeCharge && storeDB?.chargeID) {
              activeCharge = await checkCharge(shop, tokenToUse, storeDB.chargeID);
            }
            if (activeCharge) {
              console.log(`[SHOP GUARD] Active charge found for ${shop}, rendering app`);
              await handleRequest(ctx);
              return;
            }
          } catch (err) {
            if (err.isAxiosError || (err.response && (err.response.status === 401 || err.response.status === 403))) {
              // ✅ CRITICAL: This is an API request error - return 401 JSON
              console.log(`[SHOP GUARD] Auth error checking charge for API request, returning 401`);
              const { ensureHost } = require("./lib/shopify/host");
              const finalHost = ensureHost(shop, host);
              ctx.status = 401;
              ctx.set('X-Shopify-API-Request-Failure-Reauthorize', '1');
              ctx.set('X-Shopify-API-Request-Failure-Reauthorize-Url', `/install/auth?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(finalHost)}`);
              ctx.body = {
                ok: false,
                reauth: true,
                code: "SHOPIFY_AUTH_REQUIRED",
                shop: shop || null,
                message: "Shopify authentication required",
                reauthUrl: `/install/auth?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(finalHost)}`
              };
              return;
            }
          }
        }
        
        // No valid session or charge found
        // ✅ CRITICAL: Check if host parameter is missing (Catch-All Redirect)
        // If host is missing, App Bridge cannot initialize, so we must re-acquire it
        if (!host && shop) {
          console.error(`[SHOP GUARD] ❌ CRITICAL: Missing "host" parameter for shop ${shop}!`);
          console.error(`[SHOP GUARD] App Bridge requires host parameter to initialize`);
          console.error(`[SHOP GUARD] Redirecting to /auth/toplevel to re-acquire host from Shopify`);
          const redirectTo = `/install/auth?shop=${encodeURIComponent(shop)}`;
          ctx.redirect(`/auth/toplevel?shop=${encodeURIComponent(shop)}&redirectTo=${encodeURIComponent(redirectTo)}`);
          return;
        }
        
        // ✅ CRITICAL: Reuse acceptHeader already declared above (line 588)
        // Browser page loads will NOT have this header, so they MUST return HTML/redirect
        // Derive isApiRequest from existing acceptHeader and isDocumentRequest
        const isApiRequest = acceptHeader.includes("application/json");
        
        // Root path is NEVER an API request (it's always a document request)
        const isRootPath = ctx.path === '/' || ctx.path === '';
        const isTrueApiRequest = !isRootPath && isApiRequest && !isDocumentRequest;
        
        if (isTrueApiRequest) {
          // This is a true API request (not the initial document load)
          console.log(`[SHOP GUARD] No valid session for API request ${ctx.path} (Accept: application/json), returning 401`);
          const { ensureHost } = require("./lib/shopify/host");
          const finalHost = ensureHost(shop, host);
          ctx.status = 401;
          ctx.set('X-Shopify-API-Request-Failure-Reauthorize', '1');
          ctx.set('X-Shopify-API-Request-Failure-Reauthorize-Url', `/install/auth?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(finalHost)}`);
          ctx.body = {
            ok: false,
            reauth: true,
            code: "NO_OFFLINE_SESSION",
            shop: shop || null,
            message: "No valid session found - reauthentication required",
            reauthUrl: `/install/auth?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(finalHost)}`
          };
          return;
        }
        
        // For document requests (including root path), redirect to auth
        console.log(`[SHOP GUARD] No valid session or charge for ${shop}, redirecting to auth (document request)`);
        const { ensureHost } = require("./lib/shopify/host");
        const finalHost = ensureHost(shop, host);
        const redirectTo = `/install/auth?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(finalHost)}`;
        ctx.redirect(`/auth/toplevel?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(finalHost)}&redirectTo=${encodeURIComponent(redirectTo)}`);
        return;
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
      .post("/api/cancel", cancelCharge)
      // ✅ OAuth scope management routes
      .get("/force-reauth", async (ctx) => {
        const shop = ctx.query.shop;
        const host = ctx.query.host;

        if (!shop) {
          ctx.body = {
            error: 'Missing shop parameter',
            usage: '/force-reauth?shop=SHOP_DOMAIN.myshopify.com'
          };
          ctx.status = 400;
          return;
        }

        console.log('[FORCE REAUTH] Requested for shop:', shop);

        try {
          // Delete existing session
          const { forceDeleteSession } = require('./lib/oauth-helpers');
          const deleted = await forceDeleteSession(shop);
          
          if (deleted) {
            console.log('[FORCE REAUTH] ✅ Session deleted for', shop);
          } else {
            console.log('[FORCE REAUTH] ⚠️ No session found for', shop);
          }

          // Redirect to OAuth via /auth/toplevel (App Bridge) to escape iframe
          const { ensureHost } = require('./lib/shopify/host');
          const finalHost = ensureHost(shop, host);
          const redirectTo = `/install/auth?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(finalHost)}`;

          console.log('[FORCE REAUTH] Redirecting to OAuth for', shop);
          ctx.redirect(`/auth/toplevel?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(finalHost)}&redirectTo=${encodeURIComponent(redirectTo)}`);

        } catch (error) {
          console.error('[FORCE REAUTH ERROR]', error);
          ctx.body = {
            error: 'Failed to force re-auth',
            message: error.message,
            shop
          };
          ctx.status = 500;
        }
      })
      .get("/check-scopes", async (ctx) => {
        const shop = ctx.query.shop;

        if (!shop) {
          ctx.body = {
            error: 'Missing shop parameter',
            usage: '/check-scopes?shop=SHOP_DOMAIN.myshopify.com'
          };
          ctx.status = 400;
          return;
        }

        try {
          const { checkScopesNeedApproval, getRequiredScopes } = require('./lib/oauth-helpers');
          const scopeCheck = await checkScopesNeedApproval(shop);
          
          ctx.body = {
            shop,
            requiredScopes: getRequiredScopes(),
            ...scopeCheck,
            timestamp: new Date().toISOString()
          };

        } catch (error) {
          console.error('[CHECK SCOPES ERROR]', error);
          ctx.body = {
            error: 'Failed to check scopes',
            message: error.message,
            shop
          };
          ctx.status = 500;
        }
      });
    
    // GraphQL proxy route
    router.post(
      "/graphql",
      verifyRequest({ returnHeader: true }),
      async (ctx) => {
        await Shopify.Utils.graphqlProxy(ctx.req, ctx.res);
      }
    );

    // ✅ MUST BE LAST: Catch-all for Next.js - handles pages, API routes, and any unmatched routes
    // /install/auth and /install/auth/callback are handled by hard route guard above
    router.get("(.*)", async (ctx) => {
      ctx.respond = false;
      await handle(ctx.req, ctx.res);
    });

    // ✅ CRITICAL ORDERING: Register router routes BEFORE Next.js catch-all
    // Router routes must be registered first so they take precedence
    server.use(router.routes());
    server.use(router.allowedMethods());
    
    // ✅ FINAL: Next.js catch-all - only handles unmatched routes
    // /install/auth and /install/auth/callback are handled by hard route guard above
    server.use(async (ctx) => {
      await handle(ctx.req, ctx.res);
      ctx.respond = false;
    });

    server.listen(port, () => {
      console.log(`> Ready on http://localhost:${port}`);
    });
  })
  .catch((err) => console.log(err));
