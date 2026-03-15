/**
 * Manual Token Fetch Utility - App Bridge v3.4.3
 * ✅ CORRECT PATTERN: Uses token obtained in React component via getSessionToken(app)
 */

/**
 * ✅ CORRECT v3 PATTERN: Fetch with pre-obtained token from component
 *
 * Usage in React component:
 *   import { getSessionToken } from "@shopify/app-bridge-utils";
 *   import { useAppBridge } from "@shopify/app-bridge-react";
 *   import { manualTokenFetch } from "../lib/manualTokenFetch";
 *
 *   const MyComponent = () => {
 *     const app = useAppBridge();
 *
 *     const handleSave = async () => {
 *       try {
 *         const token = await getSessionToken(app);
 *         const response = await manualTokenFetch('/api/data', token, {
 *           method: 'POST',
 *           body: JSON.stringify({ data: ... }),
 *         });
 *         const result = await response.json();
 *       } catch (err) {
 *         console.error('Error:', err);
 *       }
 *     };
 *   };
 *
 * @param {string} url - API endpoint URL
 * @param {string} token - Pre-obtained session token from getSessionToken(app)
 * @param {object} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise<Response>} - Fetch Response
 */
export const manualTokenFetch = async (url, token, options = {}) => {
  if (!token) {
    const err = '[MANUAL TOKEN FETCH] ❌ No token provided - cannot make authenticated request';
    console.error(err);
    throw new Error(err);
  }

  if (!url) {
    throw new Error('URL is required');
  }

  // Merge headers to include Authorization Bearer token
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'Content-Type': options.headers?.['Content-Type'] || 'application/json',
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    // Check for reauth header
    if (response.headers.get("X-Shopify-API-Request-Failure-Reauthorize") === "1") {
      const authUrl = response.headers.get("X-Shopify-API-Request-Failure-Reauthorize-Url");
      if (authUrl && typeof window !== 'undefined') {
        window.location.href = authUrl;
      }
      return null;
    }

    return response;
  } catch (err) {
    console.error('[MANUAL TOKEN FETCH] ❌ Fetch error:', err);
    throw err;
  }
};

/**
 * ❌ DEPRECATED: waitForShopify() relied on window.shopify.idToken() which doesn't exist in App Bridge v3
 * DO NOT USE - use getSessionToken(app) from @shopify/app-bridge-utils in your React component instead
 */
export const waitForShopify = async () => {
  throw new Error(
    'waitForShopify() is deprecated and does not work with App Bridge v3\n' +
    'Use getSessionToken(app) from @shopify/app-bridge-utils in your component instead:\n' +
    '  import { getSessionToken } from "@shopify/app-bridge-utils";\n' +
    '  const app = useAppBridge();\n' +
    '  const token = await getSessionToken(app);'
  );
};
