/**
 * Helper functions for OAuth scope approval
 * Checks if shops need to re-authorize with new scopes
 */

const { shopifyApi, getSessionStorageSafe } = require('./shopify/shopify');
const { getOfflineIdSafe } = require('./shopify/session');
const env = require('../config/config');

/**
 * Get required scopes as an array
 * Handles both array and comma-separated string formats
 */
function getRequiredScopes() {
  if (Array.isArray(env.SCOPES)) {
    return env.SCOPES.map(s => s.trim());
  }
  if (typeof env.SCOPES === 'string') {
    return env.SCOPES.split(',').map(s => s.trim());
  }
  // Fallback to process.env.SCOPES
  const scopesEnv = process.env.SCOPES || 'write_themes,read_themes,read_script_tags,write_script_tags';
  return scopesEnv.split(',').map(s => s.trim());
}

/**
 * Check if the current session has all required scopes
 * @param {string} shop - Shop domain
 * @returns {Promise<{needsReauth: boolean, currentScopes: string, missingScopes: string[]}>}
 */
async function checkScopesNeedApproval(shop) {
  try {
    const storage = getSessionStorageSafe(shopifyApi);
    if (!storage) {
      console.error('[CHECK SCOPES] Session storage not available');
      return {
        needsReauth: true,
        currentScopes: '',
        missingScopes: getRequiredScopes(),
        reason: 'no_storage'
      };
    }

    const offlineId = getOfflineIdSafe(shop, shopifyApi);
    const session = await storage.loadSession(offlineId);
    
    if (!session) {
      return {
        needsReauth: true,
        currentScopes: '',
        missingScopes: getRequiredScopes(),
        reason: 'no_session'
      };
    }

    const currentScopes = (session.scope || '').split(',').map(s => s.trim()).filter(s => s);
    const requiredScopes = getRequiredScopes();
    
    const missingScopes = requiredScopes.filter(required => {
      // ✅ FIX: write_themes includes read_themes, write_script_tags includes read_script_tags
      if (required === 'read_themes' && currentScopes.includes('write_themes')) {
        return false; // Not missing - write includes read
      }
      if (required === 'read_script_tags' && currentScopes.includes('write_script_tags')) {
        return false; // Not missing - write includes read
      }
      return !currentScopes.includes(required);
    });

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
      missingScopes: getRequiredScopes(),
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
    const storage = getSessionStorageSafe(shopifyApi);
    if (!storage) {
      console.error('[FORCE DELETE] Session storage not available');
      return false;
    }

    const offlineId = getOfflineIdSafe(shop, shopifyApi);
    const deleted = await storage.deleteSession(offlineId);
    console.log(`[FORCE DELETE] Session deleted for ${shop}:`, deleted);
    return true; // Return true if deletion was attempted (even if session didn't exist)
  } catch (error) {
    console.error('[FORCE DELETE ERROR]', error);
    return false;
  }
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
      missingScopes: getRequiredScopes()
    };
  }

  const currentScopes = session.scope.split(',').map(s => s.trim()).filter(s => s);
  const requiredScopes = getRequiredScopes();
  
  const missingScopes = requiredScopes.filter(required => {
    // ✅ FIX: write_themes includes read_themes, write_script_tags includes read_script_tags
    if (required === 'read_themes' && currentScopes.includes('write_themes')) {
      return false; // Not missing - write includes read
    }
    if (required === 'read_script_tags' && currentScopes.includes('write_script_tags')) {
      return false; // Not missing - write includes read
    }
    return !currentScopes.includes(required);
  });

  return {
    valid: missingScopes.length === 0,
    missingScopes
  };
}

module.exports = {
  checkScopesNeedApproval,
  forceDeleteSession,
  verifySessionScopes,
  getRequiredScopes,
};
