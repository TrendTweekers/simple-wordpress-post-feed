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

  // If already available, return immediately
  if (window.shopify && typeof window.shopify.idToken === 'function') {
    return true;
  }

  // Poll for window.shopify to become available
  const startTime = Date.now();
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (window.shopify && typeof window.shopify.idToken === 'function') {
        clearInterval(checkInterval);
        resolve(true);
      } else if (Date.now() - startTime > maxWaitMs) {
        clearInterval(checkInterval);
        console.warn('[MANUAL TOKEN] Timeout waiting for window.shopify.idToken()');
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
    if (token) {
      console.log('[MANUAL TOKEN] ✅ Got session token from window.shopify.idToken()');
      return token;
    } else {
      console.warn('[MANUAL TOKEN] ⚠️ window.shopify.idToken() returned null');
      return null;
    }
  } catch (err) {
    console.error('[MANUAL TOKEN] ❌ Error getting token:', err);
    return null;
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
  const token = await getShopifyToken();
  if (!token) {
    console.error('[MANUAL TOKEN] Cannot make request - no token available');
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
