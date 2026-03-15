// lib/shopify/sessionTokenClient.js

let _app = null;

function getApiKeyFromMeta() {
  const el = document.querySelector('meta[name="shopify-api-key"]');
  const key = el?.getAttribute("content");
  if (!key) throw new Error("Missing <meta name=\"shopify-api-key\"> tag (API key not found).");
  return key;
}

function getHostFromUrl() {
  const host = new URLSearchParams(window.location.search).get("host");
  if (!host) throw new Error("Missing `host` in URL. App Bridge cannot initialize.");
  return host;
}

export function getAppBridge() {
  if (_app) return _app;

  const ab = window["app-bridge"];
  if (!ab || typeof ab.createApp !== "function") {
    throw new Error("Shopify App Bridge CDN not loaded: window['app-bridge'].createApp is missing.");
  }

  const apiKey = getApiKeyFromMeta();
  const host = getHostFromUrl();

  _app = ab.createApp({
    apiKey,
    host,
    forceRedirect: true,
  });

  return _app;
}

// ✅ CRITICAL FIX: Wait for window.shopify to be available (Provider initializes it)
async function waitForShopifyIdToken(maxWaitMs = 3000) {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    if (window.shopify && typeof window.shopify.idToken === "function") {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return false;
}

export async function getSessionTokenSafe() {
  // ✅ CRITICAL FIX: Wait for window.shopify.idToken to be available (set by @shopify/app-bridge-react Provider)
  // The Provider takes time to initialize, so we must wait for it
  const isReady = await waitForShopifyIdToken(3000);

  // Preferred in App Bridge v4: shopify.idToken()
  if (isReady && window.shopify && typeof window.shopify.idToken === "function") {
    try {
      const t = await window.shopify.idToken();
      if (t) {
        console.log('[getSessionTokenSafe] ✅ Got token from window.shopify.idToken()');
        return t;
      }
    } catch (e) {
      console.error('[getSessionTokenSafe] ❌ window.shopify.idToken() failed:', e);
    }
  }

  // ✅ CRITICAL FIX: Only try CDN fallback if window.shopify is not available
  // In embedded admin context, we should never reach here because Provider always sets window.shopify
  if (window["app-bridge"] && typeof window["app-bridge"].createApp === "function") {
    try {
      const app = getAppBridge();

      // Try newer CDN utilities
      const ab = window["app-bridge"];
      const utilTokenFn = ab?.utilities?.getSessionToken;
      if (typeof utilTokenFn === "function") {
        const t = await utilTokenFn(app);
        if (t) {
          console.log('[getSessionTokenSafe] ✅ Got token from CDN utilities');
          return t;
        }
      }

      // Try older CDN utilities
      const abu = window["app-bridge-utils"];
      const legacyTokenFn = abu?.getSessionToken;
      if (typeof legacyTokenFn === "function") {
        const t = await legacyTokenFn(app);
        if (t) {
          console.log('[getSessionTokenSafe] ✅ Got token from legacy CDN');
          return t;
        }
      }
    } catch (e) {
      console.error('[getSessionTokenSafe] ❌ CDN fallback failed:', e);
    }
  }

  throw new Error(
    "[getSessionTokenSafe] ❌ Could not obtain Shopify session token. window.shopify.idToken and CDN fallbacks are unavailable. Provider may not have initialized."
  );
}
