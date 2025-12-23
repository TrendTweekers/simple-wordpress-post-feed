import React, { useContext, useState, useEffect } from "react";
import { Store } from "../store/store";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Spinner } from "@shopify/polaris";
import About from "../components/About";
import Dashboard from "../components/Dashboard";
import Header from "../components/Header";
import SpinnerComponent from "../components/SpinnerComponent";
import NewDashboard from "../components/newThemeComponents/NewDashboard";
import * as types from "../store/types";
import { manualTokenFetch, waitForShopify } from "../lib/manualTokenFetch";

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
  const [themeOverride, setThemeOverride] = useState(false);
  const [page, setPage] = useState("main");
  const [shopifyReady, setShopifyReady] = useState(false);
  const {
    support: { newThemeCapable },
  } = data;
  
  // ✅ CRITICAL: Wait for window.shopify to be available before making any requests
  useEffect(() => {
    const checkShopify = async () => {
      const isReady = await waitForShopify(5000);
      setShopifyReady(isReady);
      if (isReady) {
        console.log('[Index] ✅ window.shopify.idToken() is ready');
      } else {
        console.error('[Index] ❌ window.shopify.idToken() not available after 5 seconds');
      }
    };
    
    if (typeof window !== 'undefined') {
      checkShopify();
    }
  }, []);

  const fetchShopData = async () => {
    if (!shopifyReady) {
      console.error('[Index] Shopify not ready, cannot fetch shop data');
      return null;
    }
    
    try {
      const response = await manualTokenFetch(`/api/data`, {
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
    if (!shopifyReady) {
      console.error('[Index] Shopify not ready, cannot fetch metadata');
      return null;
    }
    
    try {
      const response = await manualTokenFetch(`/api/meta`, {
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
    
    // ✅ CRITICAL: Wait for Shopify to be ready before making requests
    if (!shopifyReady) {
      console.log('[Index] Waiting for Shopify to be ready...');
      const isReady = await waitForShopify(5000);
      if (!isReady) {
        console.error('[Index] Shopify not ready after waiting, cannot fetch settings');
        dispatch({ type: types.LOADING, payload: false });
        return;
      }
      setShopifyReady(true);
    }
    
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

  useEffect(() => {
    // ✅ CRITICAL: Only fetch settings if App Bridge is ready
    if (shopifyReady) {
      getSettings();
    }
    return () => abortController.abort();
  }, [shop, themeOverride, shopifyReady]);

  // ✅ CRITICAL: Block initial render if App Bridge is not ready
  // Do not render dashboard components until shopifyReady is true
  if (!shopifyReady) {
    console.log('[Index] ⏳ Waiting for App Bridge to initialize...');
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

  const dashboardComponent =
    newThemeCapable || themeOverride ? (
      <NewDashboard getSettings={getSettings} />
    ) : (
      <Dashboard newTheme={newThemeSwitch} />
    );

  const activePage =
    page === "main" ? (
      dashboardComponent
    ) : (
      <About newThemeCapable={newThemeCapable} />
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
