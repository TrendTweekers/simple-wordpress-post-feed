import React, { useContext, useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Store } from "../store/store";
import { useAppBridge } from "@shopify/app-bridge-react";
import { getSessionToken } from "@shopify/app-bridge-utils";
import { Spinner } from "@shopify/polaris";
import About from "../components/About";
import Dashboard from "../components/Dashboard";
import Header from "../components/Header";
import SpinnerComponent from "../components/SpinnerComponent";
import NewDashboard from "../components/newThemeComponents/NewDashboard";
import * as types from "../store/types";
import { manualTokenFetch } from "../lib/manualTokenFetch";

/* ------------------ SAFE REVIEW BANNER ------------------ */
function ReviewBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Guard for SSR and strict-browsers (private mode etc.)
    if (typeof window === "undefined") return;
    try {
      const KEY_DISMISSED = "wpfeed_review_banner_dismissed";
      const KEY_FIRST_SEEN = "wpfeed_first_seen";
      const now = Date.now();

      // Record first seen timestamp once
      if (!window.localStorage.getItem(KEY_FIRST_SEEN)) {
        window.localStorage.setItem(KEY_FIRST_SEEN, String(now));
      }

      const firstSeen = Number(window.localStorage.getItem(KEY_FIRST_SEEN) || now);
      const agedEnough = now - firstSeen > 3 * 24 * 60 * 60 * 1000; // ~3 days
      const dismissed = window.localStorage.getItem(KEY_DISMISSED) === "1";

      let shouldShow = agedEnough && !dismissed;

      // Dev override: ?showReview=1
      const params = new URLSearchParams(window.location.search);
      if (params.get("showReview") === "1") shouldShow = true;

      setShow(shouldShow);
    } catch {
      // If storage is blocked, don’t show (fail safe)
      setShow(false);
    }
  }, []);

  if (!show) return null;

  const handleDismiss = () => {
    try {
      window.localStorage.setItem("wpfeed_review_banner_dismissed", "1");
    } catch {}
    setShow(false);
  };

  return (
    <div
      style={{
        background: "#f0f9ff",
        border: "1px solid #0ea5e9",
        borderRadius: 10,
        padding: 16,
        margin: "16px 0",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div style={{ maxWidth: 720 }}>
          <div style={{ fontWeight: 700, color: "#0369a1", marginBottom: 6 }}>
            💬 Enjoying WP Simple WordPress Post Feed?
          </div>
          <div style={{ color: "#075985", marginBottom: 10 }}>
            Your feedback helps us improve and helps other merchants discover the app.
          </div>
          <a
            href="https://apps.shopify.com/simple-wordpress-post-feed#reviews?utm_source=app&utm_medium=banner&utm_campaign=review-nudge"
            target="_blank"
            rel="noopener"
            style={{
              background: "#0ea5e9",
              color: "#fff",
              padding: "8px 14px",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Leave a Review →
          </a>
        </div>
        <button
          onClick={handleDismiss}
          title="Dismiss"
          style={{
            background: "transparent",
            border: "none",
            color: "#0369a1",
            fontSize: 18,
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
/* -------------------------------------------------------- */

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */
const Index = ({ shopOrigin: shop }) => {
  const abortController = new AbortController();
  const { data, dispatch } = useContext(Store);
  const app = useAppBridge();
  const [themeOverride, setThemeOverride] = useState(false);

  // ✅ SYNC: Initialize page state from URL query param (for App Bridge Navigation)
  const router = useRouter();
  const initialPage = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('page') || 'main'
    : 'main';
  const [page, setPage] = useState(initialPage);
  
  // ✅ SYNC: Update page state when URL query param changes (App Bridge Navigation)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pageParam = router.query.page || 'main';
      if (pageParam !== page) {
        setPage(pageParam);
      }
    }
  }, [router.query.page, page]);
  
  // ✅ SYNC: Update URL when page state changes (for App Bridge Navigation)
  const handlePageChange = (newPage) => {
    setPage(newPage);
    // Update URL query param without full page reload
    if (typeof window !== 'undefined') {
      const url = new URL(window.location);
      if (newPage === 'main') {
        url.searchParams.delete('page');
      } else {
        url.searchParams.set('page', newPage);
      }
      window.history.pushState({}, '', url);
    }
  };
  const [shopifyReady, setShopifyReady] = useState(false);
  const {
    support: { newThemeCapable },
  } = data;
  
  // ✅ CRITICAL: Initialize App Bridge token before making any API calls
  // Uses correct v3 pattern: getSessionToken(app) from @shopify/app-bridge-utils
  useEffect(() => {
    let timeoutId = null;

    (async () => {
      try {
        // ✅ CORRECT v3 PATTERN: Get token using the app instance
        const token = await getSessionToken(app);
        if (token) {
          setShopifyReady(true);
          console.log('[Index] ✅ App Bridge token initialized successfully');
          // Clear timeout if token init succeeds
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        } else {
          console.error('[Index] ❌ Token init returned empty token');
          // Will fallback to timeout below
        }
      } catch (e) {
        console.error('[Index] ❌ Token init failed:', e.message);
        // Will fallback to timeout below
      }
    })();

    // ✅ CRITICAL: Hard fallback - render UI after 3 seconds even if token init fails
    // This prevents infinite loading spinner and allows partial functionality
    timeoutId = setTimeout(() => {
      if (!shopifyReady) {
        console.warn('[Index] ⚠️ App Bridge token init timeout - rendering UI anyway');
        setShopifyReady(true);
      }
    }, 3000);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [app]);

  const fetchShopData = async () => {
    // ✅ CRITICAL: Force-gate API calls until token init is complete
    if (!shopifyReady) {
      console.error('[Index] Shopify not ready, cannot fetch shop data');
      return null;
    }

    try {
      // ✅ v3 PATTERN: Get token directly from app instance, then pass to manualTokenFetch
      const token = await getSessionToken(app);
      if (!token) {
        console.error('[Index] Could not obtain session token for fetchShopData');
        return null;
      }
      const response = await manualTokenFetch(`/api/data`, token, {
        method: 'GET',
      });

      if (!response) {
        console.log('[Index] Request failed or redirect triggered');
        return null;
      }

      if (!response.ok) {
        console.error(`[Index] API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error('[Index] Error fetching shop data:', err);
      return null;
    }
  };

  const getMetaData = async () => {
    // ✅ CRITICAL: Force-gate API calls until token init is complete
    if (!shopifyReady) {
      console.error('[Index] Shopify not ready, cannot fetch metadata');
      return null;
    }

    try {
      // ✅ v3 PATTERN: Get token directly from app instance, then pass to manualTokenFetch
      const token = await getSessionToken(app);
      if (!token) {
        console.error('[Index] Could not obtain session token for getMetaData');
        return null;
      }
      const response = await manualTokenFetch(`/api/meta`, token, {
        method: 'GET',
      });

      if (!response) {
        console.log('[Index] Request failed or redirect triggered');
        return null;
      }

      if (!response.ok) {
        console.error(`[Index] API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error('[Index] Error fetching metadata:', err);
      return null;
    }
  };

  const getSettings = async () => {
    dispatch({ type: types.LOADING, payload: true });
    
    // ✅ CRITICAL: authenticatedFetch handles token retrieval automatically
    // No need to wait for Shopify - authenticatedFetch will throw if App Bridge isn't ready
    
    try {
      const metaData = await getMetaData();
      if (!metaData) {
        // Request failed or redirect triggered
        console.log('[Index] Metadata fetch failed or redirect triggered');
        dispatch({ type: types.LOADING, payload: false });
        return;
      }
      
      const shopData = await fetchShopData();
      if (!shopData) {
        // Request failed or redirect triggered
        console.log('[Index] Shop data fetch failed or redirect triggered');
        dispatch({ type: types.LOADING, payload: false });
        return;
      }

      dispatch({ type: types.FETCH_METADATA, payload: metaData });
      dispatch({ type: types.FETCH_DATA, payload: shopData });
      dispatch({ type: types.LOADING, payload: false });
    } catch (err) {
      console.error('[Index] Error fetching settings:', err);
      dispatch({ type: types.LOADING, payload: false });
    }
  };

  /** Override current theme setting, showing new Theme 2.0 settings */
  const newThemeSwitch = () => setThemeOverride(!themeOverride);

  // ✅ CRITICAL: Separate effect for shopifyReady - only trigger API calls when App Bridge becomes ready
  useEffect(() => {
    // Guard: Only run on client side
    if (typeof window === 'undefined') {
      return;
    }
    
    // Guard: Only fetch settings when shopifyReady becomes true
    if (!shopifyReady) {
      console.log('[Index] ⏳ Waiting for App Bridge to initialize before fetching settings...');
      return;
    }
    
    console.log('[Index] ✅ App Bridge ready, fetching settings...');
    getSettings();
    
    return () => abortController.abort();
  }, [shopifyReady]); // ✅ CRITICAL: Only depend on shopifyReady - don't re-fetch on shop/themeOverride changes
  
  // ✅ Separate effect for shop/themeOverride changes - only fetch if App Bridge is already ready
  useEffect(() => {
    // Guard: Only run on client side
    if (typeof window === 'undefined') {
      return;
    }
    
    // Guard: Only refetch if App Bridge is already ready
    if (!shopifyReady) {
      console.log('[Index] ⏳ Shop/theme changed but App Bridge not ready, skipping refetch');
      return;
    }
    
    console.log('[Index] ✅ Shop/theme changed and App Bridge ready, refetching settings...');
    getSettings();
  }, [shop, themeOverride]); // Only refetch when shop or themeOverride changes (and App Bridge is ready)

  // ✅ CRITICAL: Render UI as soon as shop + host exist, don't block on App Bridge
  // App Bridge initialization happens asynchronously and shouldn't block rendering
  // Billing checks happen AFTER render, not before
  const hasShopAndHost = shop && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('host');
  
  if (!hasShopAndHost && !shopifyReady) {
    console.log('[Index] ⏳ Waiting for shop/host parameters...');
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <Spinner />
        <p style={{ marginTop: '20px', fontSize: '16px', color: '#666' }}>
          Loading App Bridge...
        </p>
      </div>
    );
  }
  
  // ✅ CRITICAL: Show loading spinner only briefly while App Bridge initializes
  // After 3 seconds, render UI anyway (timeout handled in useEffect above)
  if (!shopifyReady && hasShopAndHost) {
    console.log('[Index] ⏳ App Bridge initializing, rendering UI...');
    // Continue to render - don't block UI on App Bridge initialization
  }

  const dashboardComponent =
    newThemeCapable || themeOverride ? (
      <NewDashboard getSettings={getSettings} />
    ) : (
      <Dashboard newTheme={newThemeSwitch} />
    );

  // ✅ SYNC: Handle both "about" and "documentation" page values (Header uses "documentation")
  const activePage =
    page === "main" ? (
      dashboardComponent
    ) : page === "about" || page === "documentation" ? (
      <About newThemeCapable={newThemeCapable} />
    ) : (
      dashboardComponent // Default fallback
    );

  if (data.isLoading) {
    return <Spinner />;
  } else {
    return (
      <>
        <Header shop={shop} handleClick={setPage} />
        <ReviewBanner /> {/* ← banner rendered here */}
        {activePage}
      </>
    );
  }
};

export default Index;
