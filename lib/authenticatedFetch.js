import { useAppBridge } from "@shopify/app-bridge-react";
import { Redirect } from "@shopify/app-bridge/actions";
import axios from "axios";

/**
 * Build absolute URL with host parameter preserved
 * @param {string} reauthUrl - Relative or absolute reauth URL
 * @returns {string} - Absolute URL with shop and host parameters
 */
const buildAuthUrl = (reauthUrl) => {
  // Start with absolute URL
  const url = new URL(reauthUrl, window.location.origin);
  
  // Ensure shop parameter exists
  const currentShop = new URLSearchParams(window.location.search).get("shop");
  const shopParam = url.searchParams.get("shop") || currentShop;
  if (shopParam && !url.searchParams.get("shop")) {
    url.searchParams.set("shop", shopParam);
  }
  
  // Ensure host exists (Shopify requires it) - generate if missing
  const currentHost = new URLSearchParams(window.location.search).get("host");
  let hostParam = url.searchParams.get("host") || currentHost;
  if (!hostParam && shopParam) {
    // Generate host if missing: base64("<shop>/admin")
    hostParam = btoa(`${shopParam}/admin`);
  }
  if (hostParam && !url.searchParams.get("host")) {
    url.searchParams.set("host", hostParam);
  }
  
  return url.toString();
};

/**
 * Trigger reauth redirect using App Bridge
 * @param {string} reauthUrl - Reauth URL (can be relative or absolute)
 * @param {object} appBridgeApp - Optional App Bridge app instance
 */
const triggerReauth = (reauthUrl, appBridgeApp = null) => {
  const shop = new URLSearchParams(window.location.search).get("shop");
  const host = new URLSearchParams(window.location.search).get("host");
  
  // Generate host if missing
  const finalHost = host || (shop ? btoa(`${shop}/admin`) : '');
  
  // Use provided reauthUrl or build default (use /install/auth instead of /install/auth/toplevel)
  const finalReauthUrl = reauthUrl || `/install/auth?shop=${encodeURIComponent(shop || '')}&host=${encodeURIComponent(finalHost)}`;
  const fullUrl = buildAuthUrl(finalReauthUrl);
  
  console.log(`[AUTH] Reauth required, redirecting to: ${fullUrl}`);
  
  try {
    // Use provided App Bridge instance if available
    if (appBridgeApp) {
      const redirect = Redirect.create(appBridgeApp);
      redirect.dispatch(Redirect.Action.REMOTE, fullUrl);
      console.log(`[AUTH] App Bridge redirect dispatched`);
      return;
    }
    
    // Try to use App Bridge from window (if available)
    if (typeof window !== "undefined" && window.shopify?.appBridge) {
      const app = window.shopify.appBridge;
      const redirect = Redirect.create(app);
      redirect.dispatch(Redirect.Action.REMOTE, fullUrl);
      console.log(`[AUTH] App Bridge redirect dispatched (from window)`);
      return;
    }
    
    // Final fallback: redirect to /auth/toplevel which uses App Bridge
    console.warn(`[AUTH] App Bridge not available, redirecting to /auth/toplevel`);
    const shop = new URLSearchParams(window.location.search).get("shop");
    const host = new URLSearchParams(window.location.search).get("host") || (shop ? btoa(`${shop}/admin`) : '');
    const toplevelUrl = `/auth/toplevel?shop=${encodeURIComponent(shop || '')}&host=${encodeURIComponent(host)}&redirectTo=${encodeURIComponent(finalReauthUrl)}`;
    window.location.href = toplevelUrl;
  } catch (err) {
    console.error(`[AUTH] App Bridge redirect failed:`, err);
    // Fallback: redirect to /auth/toplevel on error
    const shop = new URLSearchParams(window.location.search).get("shop");
    const host = new URLSearchParams(window.location.search).get("host") || (shop ? btoa(`${shop}/admin`) : '');
    const toplevelUrl = `/auth/toplevel?shop=${encodeURIComponent(shop || '')}&host=${encodeURIComponent(host)}&redirectTo=${encodeURIComponent(finalReauthUrl)}`;
    window.location.href = toplevelUrl;
  }
};

/**
 * Authenticated fetch wrapper that handles 401/403 and reauth flags
 * Checks response status and response body for reauth requirements
 * 
 * @param {string} url - API endpoint URL
 * @param {object} options - Fetch options (method, body, headers, etc.)
 * @param {object} appBridgeApp - Optional App Bridge app instance (for redirects)
 * @returns {Promise} - Response data or null if redirect was triggered
 */
export const authenticatedFetch = async (url, options = {}, appBridgeApp = null) => {
  try {
    const response = await axios({
      url,
      ...options,
    });
    
    // Check response status
    if (response.status === 401 || response.status === 403) {
      const data = response.data || {};
      const needsReauth = data?.reauth === true || 
                         data?.code === "SHOPIFY_AUTH_REQUIRED" || 
                         data?.code === "NO_OFFLINE_SESSION";
      
      if (needsReauth) {
        triggerReauth(data?.reauthUrl, appBridgeApp);
        return null;
      }
    }
    
    // Check response data for reauth flag (even if status is 200)
    const data = response.data || {};
    if (data.reauth === true || data?.code === "SHOPIFY_AUTH_REQUIRED" || data?.code === "NO_OFFLINE_SESSION") {
      triggerReauth(data?.reauthUrl, appBridgeApp);
      return null;
    }
    
    return response.data;
  } catch (err) {
    // Handle axios errors
    if (err.response) {
      const status = err.response.status;
      const data = err.response.data || {};
      
      // Check for 401/403 status
      if (status === 401 || status === 403) {
        const needsReauth = data?.reauth === true || 
                           data?.code === "SHOPIFY_AUTH_REQUIRED" || 
                           data?.code === "NO_OFFLINE_SESSION";
        
        if (needsReauth) {
          triggerReauth(data?.reauthUrl, appBridgeApp);
          return null;
        }
      }
      
      // Check response data for reauth flag
      if (data.reauth === true || data?.code === "SHOPIFY_AUTH_REQUIRED" || data?.code === "NO_OFFLINE_SESSION") {
        triggerReauth(data?.reauthUrl, appBridgeApp);
        return null;
      }
    }
    
    // Re-throw other errors
    throw err;
  }
};

/**
 * React hook version that uses App Bridge from context
 * Use this in React components that have access to App Bridge Provider
 */
export const useAuthenticatedFetch = () => {
  const app = useAppBridge();
  
  return async (url, options = {}) => {
    return authenticatedFetch(url, options, app);
  };
};

/**
 * Helper function to trigger reauth (exported for direct use)
 */
export { triggerReauth, buildAuthUrl };

