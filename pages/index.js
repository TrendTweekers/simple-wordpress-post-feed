import React, { useContext, useState, useEffect } from "react";
import { Store } from "../store/store";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticatedFetch as appBridgeAuthenticatedFetch } from "@shopify/app-bridge-utils";
import About from "../components/About";
import Dashboard from "../components/Dashboard";
import Header from "../components/Header";
import Spinner from "../components/SpinnerComponent";
import NewDashboard from "../components/newThemeComponents/NewDashboard";
import * as types from "../store/types";

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
  const {
    support: { newThemeCapable },
  } = data;
  
  // ✅ CRITICAL: Get App Bridge instance and use authenticatedFetch from app-bridge-utils
  // This automatically adds the session token (Bearer token) to all requests
  const app = useAppBridge();
  
  // Create authenticated fetch function that includes App Bridge session token
  const authenticatedFetch = app ? appBridgeAuthenticatedFetch(app) : null;

  const fetchShopData = async () => {
    if (!authenticatedFetch) {
      console.error('[Index] App Bridge not available, cannot fetch shop data');
      return null;
    }
    
    try {
      const response = await authenticatedFetch(`/api/data`, {
        method: 'GET',
      });
      
      // authenticatedFetch from app-bridge-utils returns null if redirect was triggered
      if (!response) {
        console.log('[Index] Redirect triggered by authenticatedFetch');
        return null;
      }
      
      // Check for X-Shopify-API-Request-Failure-Reauthorize header
      if (response.headers?.get("X-Shopify-API-Request-Failure-Reauthorize") === "1") {
        console.log('[Index] Reauth required (detected via header)');
        return null; // App Bridge will handle redirect automatically
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('[Index] Error fetching shop data:', err);
      // Don't trigger page reload - let App Bridge handle it
      return null;
    }
  };
  
  const getMetaData = async () => {
    if (!authenticatedFetch) {
      console.error('[Index] App Bridge not available, cannot fetch metadata');
      return null;
    }
    
    try {
      const response = await authenticatedFetch(`/api/meta`, {
        method: 'GET',
      });
      
      // authenticatedFetch from app-bridge-utils returns null if redirect was triggered
      if (!response) {
        console.log('[Index] Redirect triggered by authenticatedFetch');
        return null;
      }
      
      // Check for X-Shopify-API-Request-Failure-Reauthorize header
      if (response.headers?.get("X-Shopify-API-Request-Failure-Reauthorize") === "1") {
        console.log('[Index] Reauth required (detected via header)');
        return null; // App Bridge will handle redirect automatically
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('[Index] Error fetching metadata:', err);
      // Don't trigger page reload - let App Bridge handle it
      return null;
    }
  };

  const getSettings = async () => {
    dispatch({ type: types.LOADING, payload: true });
    
    if (!authenticatedFetch) {
      console.error('[Index] App Bridge not available, cannot fetch settings');
      dispatch({ type: types.LOADING, payload: false });
      return;
    }
    
    try {
      const metaData = await getMetaData();
      if (!metaData) {
        // Redirect was triggered by App Bridge - don't do anything, App Bridge handles it
        console.log('[Index] Metadata fetch triggered redirect');
        return;
      }
      
      const shopData = await fetchShopData();
      if (!shopData) {
        // Redirect was triggered by App Bridge - don't do anything, App Bridge handles it
        console.log('[Index] Shop data fetch triggered redirect');
        return;
      }

      dispatch({ type: types.FETCH_METADATA, payload: metaData });
      dispatch({ type: types.FETCH_DATA, payload: shopData });
      dispatch({ type: types.LOADING, payload: false });
    } catch (err) {
      console.error('[Index] Error fetching settings:', err);
      // ✅ CRITICAL: Don't trigger page reload on errors
      // App Bridge will handle reauth automatically via headers
      // If we do window.location.href, it causes redirect loops
      dispatch({ type: types.LOADING, payload: false });
    }
  };

  /** Override current theme setting, showing new Theme 2.0 settings */
  const newThemeSwitch = () => setThemeOverride(!themeOverride);

  useEffect(() => {
    getSettings();
    return () => abortController.abort();
  }, [shop, themeOverride]);

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
