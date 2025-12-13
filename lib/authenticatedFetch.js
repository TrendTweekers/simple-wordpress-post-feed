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
  
  // Ensure host exists (Shopify requires it) - get from current URL
  const currentHost = new URLSearchParams(window.location.search).get("host");
  if (!url.searchParams.get("host") && currentHost) {
    url.searchParams.set("host", currentHost);
  }
  
  // Ensure shop parameter exists
  const currentShop = new URLSearchParams(window.location.search).get("shop");
  if (!url.searchParams.get("shop") && currentShop) {
    url.searchParams.set("shop", currentShop);
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
  
  // Use provided reauthUrl or build default
  const finalReauthUrl = reauthUrl || `/install/auth/toplevel?shop=${encodeURIComponent(shop || '')}&host=${encodeURIComponent(host || '')}`;
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
    
    // Final fallback: use window.location
    console.warn(`[AUTH] App Bridge not available, using window.location.assign`);
    window.location.assign(fullUrl);
  } catch (err) {
    console.error(`[AUTH] App Bridge redirect failed:`, err);
    window.location.assign(fullUrl);
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

