/**
 * Manual Token Fetch Utility
 * Since App Bridge v4 automatic fetch interceptor is failing,
 * we manually inject the Bearer token from window.shopify.idToken()
 */

/**
 * Wait for window.shopify to be available (App Bridge v4 CDN script loads)
 * @param {number} maxWaitMs - Maximum time to wait in milliseconds (default: 5000)
 * @returns {Promise<boolean>} - True if window.shopify is available, false if timeout
 */
export const waitForShopify = async (maxWaitMs = 5000) => {
  if (typeof window === 'undefined') {
    return false;
  }

  // ✅ CRITICAL: Check if host parameter is missing from URL
  // App Bridge requires host parameter to initialize properly
  const urlParams = new URLSearchParams(window.location.search);
  const hostParam = urlParams.get('host');
  
  if (!hostParam) {
    console.error('[MANUAL TOKEN] ❌ CRITICAL: Missing "host" parameter in URL!');
    console.error('[MANUAL TOKEN] Current URL:', window.location.href);
    console.error('[MANUAL TOKEN] App Bridge cannot initialize without host parameter');
    console.error('[MANUAL TOKEN] This usually means the host was lost during a redirect');
    return false;
  }

  // ✅ CRITICAL FIX: @shopify/app-bridge-react Provider sets window.shopify.idToken()
  // Do NOT check for window.shopify.config - that's not set by the Provider
  // Just check for the idToken function which is all we need
  if (window.shopify && typeof window.shopify.idToken === 'function') {
    console.log('[MANUAL TOKEN] ✅ App Bridge initialized correctly (idToken available)');
    return true;
  }

  // Poll for window.shopify.idToken to become available (Provider initializing)
  const startTime = Date.now();
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (window.shopify && typeof window.shopify.idToken === 'function') {
        clearInterval(checkInterval);
        console.log('[MANUAL TOKEN] ✅ App Bridge initialized: window.shopify.idToken is now available');
        resolve(true);
      } else if (Date.now() - startTime > maxWaitMs) {
        clearInterval(checkInterval);
        console.error('[MANUAL TOKEN] ❌ Timeout after', maxWaitMs, 'ms - window.shopify.idToken() still not available');
        if (window.shopify) {
          console.error('[MANUAL TOKEN] window.shopify exists but idToken is not a function');
          console.error('[MANUAL TOKEN] window.shopify keys:', Object.keys(window.shopify));
        } else {
          console.error('[MANUAL TOKEN] window.shopify does not exist at all');
        }
        console.error('[MANUAL TOKEN] Host parameter:', hostParam);
        resolve(false);
      }
    }, 100); // Check every 100ms
  });
};

/**
 * Get App Bridge session token manually from window.shopify.idToken()
 * @returns {Promise<string|null>} - Session token or null if unavailable
 */
export const getShopifyToken = async () => {
  if (typeof window === 'undefined') {
    return null;
  }

  // Wait for App Bridge to be available
  const isAvailable = await waitForShopify(3000);
  if (!isAvailable) {
    console.error('[MANUAL TOKEN] window.shopify.idToken() not available');
    return null;
  }

  try {
    const token = await window.shopify.idToken();
    
    // ✅ CRITICAL: Force token refresh - throw error if token is empty/null/empty string
    if (!token || token === '' || token.trim() === '') {
      const errorMsg = '[MANUAL TOKEN] ❌ CRITICAL: window.shopify.idToken() returned empty/null token!';
      console.error(errorMsg);
      console.error('[MANUAL TOKEN] This means App Bridge is not properly initialized or host parameter is missing');
      console.error('[MANUAL TOKEN] Current URL:', typeof window !== 'undefined' ? window.location.href : 'N/A');
      console.error('[MANUAL TOKEN] Host param:', typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('host') : 'N/A');
      console.error('[MANUAL TOKEN] shopify.config:', window.shopify?.config ? 'exists' : 'missing');
      
      // Throw error instead of returning null to prevent sending request without token
      throw new Error(errorMsg);
    }
    
    console.log('[MANUAL TOKEN] ✅ Got session token from window.shopify.idToken()');
    console.log('[MANUAL TOKEN] Token length:', token.length);
    return token;
  } catch (err) {
    console.error('[MANUAL TOKEN] ❌ Error getting token:', err);
    // Re-throw the error so manualTokenFetch can handle it properly
    throw err;
  }
};

/**
 * Manual authenticated fetch with Bearer token injection
 * Replaces automatic App Bridge authenticatedFetch when it fails
 * 
 * @param {string} url - API endpoint URL
 * @param {object} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise<Response|null>} - Fetch Response or null if token unavailable
 */
export const manualTokenFetch = async (url, options = {}) => {
  // Get token manually
  let token;
  try {
    token = await getShopifyToken();
  } catch (err) {
    // ✅ CRITICAL: If getShopifyToken throws (empty token), do not make request
    console.error('[MANUAL TOKEN] Cannot make request - token fetch failed:', err.message);
    return null;
  }
  
  // Double-check token is valid (should never reach here if getShopifyToken throws correctly)
  if (!token || token === '' || token.trim() === '') {
    console.error('[MANUAL TOKEN] ❌ CRITICAL: Token validation failed - empty token detected');
    return null;
  }

  // Merge headers to include Authorization Bearer token
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'Content-Type': options.headers?.['Content-Type'] || 'application/json',
  };

  console.log(`[MANUAL TOKEN] Making request to ${url} with Bearer token (length=${token.length})`);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Include cookies
    });

    // Check for X-Shopify-API-Request-Failure-Reauthorize header
    if (response.headers.get("X-Shopify-API-Request-Failure-Reauthorize") === "1") {
      console.log('[MANUAL TOKEN] Reauth required (detected via header)');
      const authUrl = response.headers.get("X-Shopify-API-Request-Failure-Reauthorize-Url");
      if (authUrl && typeof window !== 'undefined') {
        // Use App Bridge redirect if available
        if (window.shopify && window.shopify.redirect) {
          window.shopify.redirect(authUrl);
        } else {
          window.location.href = authUrl;
        }
      }
      return null;
    }

    return response;
  } catch (err) {
    console.error('[MANUAL TOKEN] Fetch error:', err);
    throw err;
  }
};
