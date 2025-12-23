/**
 * Custom Session Storage for Shopify API using Firebase
 * This bridges Shopify's session management with Firebase persistence
 */

const { getFs, writeFs } = require("../firebase/firebase");
const { APP } = require("../../config/config");

class FirebaseSessionStorage {
  /**
   * Store a session in Firebase
   * @param {Session} session - Shopify session object
   * @returns {Promise<boolean>} - True if successful
   */
  async storeSession(session) {
    if (!session || !session.id) {
      console.error("[FIREBASE SESSION] Cannot store session without ID");
      return false;
    }

    try {
      const sessionData = {
        id: session.id,
        shop: session.shop,
        state: session.state,
        isOnline: session.isOnline || false,
        scope: session.scope,
        expires: session.expires ? session.expires.toISOString() : null,
        accessToken: session.accessToken,
        token: session.accessToken, // Also save as 'token' for compatibility
        updatedAt: new Date().toISOString()
      };

      // ✅ CRITICAL: Use session.id as the document ID (e.g., "offline_japexstore.myshopify.com")
      console.log(`[FIREBASE SESSION] Storing session to Firebase document ID: ${session.id}`);
      await writeFs(APP, session.id, sessionData);
      console.log(`[FIREBASE SESSION] ✅ Successfully stored session ${session.id} to Firebase`);
      
      return true;
    } catch (error) {
      console.error(`[FIREBASE SESSION] ❌ Failed to store session ${session.id}:`, error);
      return false;
    }
  }

  /**
   * Load a session from Firebase
   * @param {string} sessionId - Session ID (e.g., "offline_japexstore.myshopify.com")
   * @returns {Promise<Session|null>} - Shopify session object or null if not found
   */
  async loadSession(sessionId) {
    if (!sessionId) {
      console.error("[FIREBASE SESSION] Cannot load session without ID");
      return null;
    }

    try {
      console.log(`[FIREBASE SESSION] Loading session from Firebase document ID: ${sessionId}`);
      const sessionData = await getFs(APP, sessionId);
      
      if (!sessionData) {
        console.log(`[FIREBASE SESSION] Session ${sessionId} not found in Firebase`);
        return null;
      }

      // Reconstruct Shopify session object
      const session = {
        id: sessionData.id || sessionId,
        shop: sessionData.shop,
        state: sessionData.state,
        isOnline: sessionData.isOnline || false,
        scope: sessionData.scope,
        expires: sessionData.expires ? new Date(sessionData.expires) : null,
        accessToken: sessionData.accessToken || sessionData.token, // Support both field names
      };

      console.log(`[FIREBASE SESSION] ✅ Loaded session ${sessionId} from Firebase (shop=${session.shop})`);
      return session;
    } catch (error) {
      console.error(`[FIREBASE SESSION] ❌ Failed to load session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Delete a session from Firebase
   * @param {string} sessionId - Session ID
   * @returns {Promise<boolean>} - True if successful
   */
  async deleteSession(sessionId) {
    if (!sessionId) {
      console.error("[FIREBASE SESSION] Cannot delete session without ID");
      return false;
    }

    try {
      const { deleteFs } = require("../firebase/firebase");
      console.log(`[FIREBASE SESSION] Deleting session from Firebase document ID: ${sessionId}`);
      await deleteFs(APP, sessionId);
      console.log(`[FIREBASE SESSION] ✅ Successfully deleted session ${sessionId} from Firebase`);
      return true;
    } catch (error) {
      console.error(`[FIREBASE SESSION] ❌ Failed to delete session ${sessionId}:`, error);
      return false;
    }
  }
}

module.exports = FirebaseSessionStorage;
