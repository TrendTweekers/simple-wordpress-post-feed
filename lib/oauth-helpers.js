/**
 * Helper function to check if a shop needs to re-authorize with new scopes
 * Place this in: server/lib/oauth-helpers.js
 */

const { shopify } = require('../shopify-config'); // Adjust path as needed

/**
 * Check if the current session has all required scopes
 * @param {string} shop - Shop domain
 * @returns {Promise<{needsReauth: boolean, currentScopes: string, missingScopes: string[]}>}
 */
async function checkScopesNeedApproval(shop) {
  try {
    const sessionId = shopify.api.session.getOfflineId(shop);
    const session = await shopify.api.session.loadSession(sessionId);
    
    if (!session) {
      return {
        needsReauth: true,
        currentScopes: '',
        missingScopes: process.env.SCOPES.split(',').map(s => s.trim()),
        reason: 'no_session'
      };
    }

    const currentScopes = (session.scope || '').split(',').map(s => s.trim());
    const requiredScopes = process.env.SCOPES.split(',').map(s => s.trim());
    
    const missingScopes = requiredScopes.filter(
      required => !currentScopes.includes(required)
    );

    return {
      needsReauth: missingScopes.length > 0,
      currentScopes: session.scope || '',
      missingScopes,
      reason: missingScopes.length > 0 ? 'missing_scopes' : 'ok'
    };
  } catch (error) {
    console.error('[CHECK SCOPES ERROR]', error);
    return {
      needsReauth: true,
      currentScopes: '',
      missingScopes: [],
      reason: 'error',
      error: error.message
    };
  }
}

/**
 * Force delete a session to trigger re-authentication
 * @param {string} shop - Shop domain
 * @returns {Promise<boolean>} Success status
 */
async function forceDeleteSession(shop) {
  try {
    const sessionId = shopify.api.session.getOfflineId(shop);
    const deleted = await shopify.api.session.deleteSession(sessionId);
    console.log(`[FORCE DELETE] Session deleted for ${shop}:`, deleted);
    return deleted;
  } catch (error) {
    console.error('[FORCE DELETE ERROR]', error);
    return false;
  }
}

/**
 * Build OAuth URL with grant_options to force approval screen
 * @param {string} shop - Shop domain
 * @param {string} state - OAuth state
 * @param {string} redirectUri - Callback URL
 * @returns {string} OAuth authorization URL
 */
function buildOAuthUrl(shop, state, redirectUri) {
  const scopes = process.env.SCOPES;
  const apiKey = process.env.SHOPIFY_API_KEY;
  
  // Normalize shop domain
  const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
  
  // Build OAuth URL with grant_options to force approval
  const params = new URLSearchParams({
    client_id: apiKey,
    scope: scopes,
    redirect_uri: redirectUri,
    state: state,
  });
  
  // Add grant_options to force approval screen
  params.append('grant_options[]', 'per-user');
  
  const authUrl = `https://${shopDomain}/admin/oauth/authorize?${params.toString()}`;
  
  return authUrl;
}

/**
 * Verify that a session has all required scopes
 * @param {Object} session - Shopify session object
 * @returns {{valid: boolean, missingScopes: string[]}}
 */
function verifySessionScopes(session) {
  if (!session || !session.scope) {
    return {
      valid: false,
      missingScopes: process.env.SCOPES.split(',').map(s => s.trim())
    };
  }

  const currentScopes = session.scope.split(',').map(s => s.trim());
  const requiredScopes = process.env.SCOPES.split(',').map(s => s.trim());
  
  const missingScopes = requiredScopes.filter(
    required => !currentScopes.includes(required)
  );

  return {
    valid: missingScopes.length === 0,
    missingScopes
  };
}

module.exports = {
  checkScopesNeedApproval,
  forceDeleteSession,
  buildOAuthUrl,
  verifySessionScopes,
};
