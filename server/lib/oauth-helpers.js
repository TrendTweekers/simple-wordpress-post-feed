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
 * ✅ CRITICAL: Always returns exactly 4 scopes to match shopify.app.toml
 */
function getRequiredScopes() {
  const requiredScopes = ["write_themes", "read_themes", "read_script_tags", "write_script_tags"];
  let scopesArray = null;
  
  // Priority 1: Use config.js (env.SCOPES) if it's an array with 4 scopes
  if (Array.isArray(env.SCOPES) && env.SCOPES.length === 4) {
    scopesArray = env.SCOPES.map(s => s.trim());
    console.log("[getRequiredScopes] Using scopes from config.js:", scopesArray);
  }
  // Priority 2: Use config.js if it's a string
  else if (typeof env.SCOPES === 'string') {
    scopesArray = env.SCOPES.split(',').map(s => s.trim());
    console.log("[getRequiredScopes] Using scopes from config.js (string):", scopesArray);
  }
  // Priority 3: Fallback to process.env.SCOPES
  else if (process.env.SCOPES) {
    scopesArray = process.env.SCOPES.split(',').map(s => s.trim());
    console.log("[getRequiredScopes] Using scopes from process.env.SCOPES:", scopesArray);
  }
  // Priority 4: Hardcoded fallback
  else {
    scopesArray = requiredScopes;
    console.log("[getRequiredScopes] Using hardcoded fallback scopes:", scopesArray);
  }
  
  // ✅ VALIDATE: Ensure all 4 required scopes are present
  const missingScopes = requiredScopes.filter(s => !scopesArray.includes(s));
  if (missingScopes.length > 0) {
    console.warn("[getRequiredScopes] ⚠️ Missing scopes:", missingScopes);
    console.warn("[getRequiredScopes] Expected:", requiredScopes);
    console.warn("[getRequiredScopes] Got:", scopesArray);
    console.warn("[getRequiredScopes] Forcing correct scopes");
    scopesArray = requiredScopes;
  }
  
  // ✅ CRITICAL: Final validation - must have exactly 4 scopes
  if (scopesArray.length !== 4) {
    console.error("[getRequiredScopes] ❌ ERROR: Expected 4 scopes, got", scopesArray.length, scopesArray);
    scopesArray = requiredScopes;
    console.log("[getRequiredScopes] ✅ Forced correct scopes:", scopesArray);
  }
  
  return scopesArray;
}

/**
 * Check if a required scope is satisfied by the granted scopes
 * ✅ CRITICAL: Implements "write includes read" logic
 * - write_themes implicitly includes read_themes
 * - write_script_tags implicitly includes read_script_tags
 * @param {string} requiredScope - The scope we need
 * @param {string[]} grantedScopes - The scopes that were granted
 * @returns {boolean} True if the required scope is satisfied
 */
function isScopeSatisfied(requiredScope, grantedScopes) {
  // Direct match: required scope is explicitly granted
  if (grantedScopes.includes(requiredScope)) {
    return true;
  }
  
  // ✅ CRITICAL: Write permissions include read permissions
  // If we need read_themes but have write_themes, we're good
  if (requiredScope === 'read_themes' && grantedScopes.includes('write_themes')) {
    return true;
  }
  
  // If we need read_script_tags but have write_script_tags, we're good
  if (requiredScope === 'read_script_tags' && grantedScopes.includes('write_script_tags')) {
    return true;
  }
  
  return false;
}

/**
 * Check if the current session has all required scopes
 * ✅ CRITICAL: Uses "write includes read" logic - 2 scopes can satisfy 4 requirements
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
    
    console.log('[CHECK SCOPES] Comparing scopes:', {
      granted: currentScopes,
      required: requiredScopes,
      grantedCount: currentScopes.length,
      requiredCount: requiredScopes.length
    });
    
    // ✅ CRITICAL: Use helper function that implements "write includes read" logic
    const missingScopes = requiredScopes.filter(required => {
      const satisfied = isScopeSatisfied(required, currentScopes);
      if (!satisfied) {
        console.log(`[CHECK SCOPES] Missing scope: ${required} (granted: ${currentScopes.join(', ')})`);
      }
      return !satisfied;
    });

    const needsReauth = missingScopes.length > 0;
    
    if (!needsReauth) {
      console.log('[CHECK SCOPES] ✅ All scopes satisfied (using write-includes-read logic)');
      console.log('[CHECK SCOPES] Granted:', currentScopes.join(', '), 'satisfies required:', requiredScopes.join(', '));
    } else {
      console.log('[CHECK SCOPES] ⚠️ Missing scopes:', missingScopes);
    }

    return {
      needsReauth,
      currentScopes: session.scope || '',
      missingScopes,
      reason: needsReauth ? 'missing_scopes' : 'ok'
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
 * ✅ CRITICAL: Uses "write includes read" logic - 2 scopes can satisfy 4 requirements
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
  
  console.log('[VERIFY SCOPES] Comparing scopes:', {
    granted: currentScopes,
    required: requiredScopes,
    grantedCount: currentScopes.length,
    requiredCount: requiredScopes.length
  });
  
  // ✅ CRITICAL: Use helper function that implements "write includes read" logic
  const missingScopes = requiredScopes.filter(required => {
    return !isScopeSatisfied(required, currentScopes);
  });

  const valid = missingScopes.length === 0;
  
  if (valid) {
    console.log('[VERIFY SCOPES] ✅ All scopes satisfied (using write-includes-read logic)');
    console.log('[VERIFY SCOPES] Granted:', currentScopes.join(', '), 'satisfies required:', requiredScopes.join(', '));
  } else {
    console.log('[VERIFY SCOPES] ⚠️ Missing scopes:', missingScopes);
  }

  return {
    valid,
    missingScopes
  };
}

module.exports = {
  checkScopesNeedApproval,
  forceDeleteSession,
  verifySessionScopes,
  getRequiredScopes,
};
