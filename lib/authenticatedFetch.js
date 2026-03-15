// lib/authenticatedFetch.js
// ⚠️  DEPRECATED — do not use.
// Use getSessionToken(app) + manualTokenFetch(url, token, options) instead.
// See lib/manualTokenFetch.js
export async function authenticatedFetch() {
  throw new Error(
    "authenticatedFetch() is deprecated and relies on window.shopify.idToken (App Bridge v4 only).\n" +
    "Use getSessionToken(app) from @shopify/app-bridge-utils and manualTokenFetch() instead."
  );
}
