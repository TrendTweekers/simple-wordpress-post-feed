/* eslint-disable shopify/jsx-no-hardcoded-content */
/* eslint-disable shopify/prefer-early-return */
/* eslint-disable react/prop-types */
import {
  Frame,
  Page,
  ContextualSaveBar,
  Card,
  TextContainer,
  Heading,
  Button,
  Layout,
  Banner,
} from "@shopify/polaris";
import React, { useState, useEffect } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { getSessionToken } from "@shopify/app-bridge-utils";
import { TroubleShootBanner, ReviewBanner } from "../Banners";
import * as types from "../../store/types";
import { Store } from "../../store/store";
import UrlInput from "./UrlInput";
import BasicSetings from "./BasicSettings";
import Filters from "./Filters";
import ShowExcerpt from "./ShowExcerpt";
import { manualTokenFetch } from "../../lib/manualTokenFetch";

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */

const Dashboard = ({ banner, reviewBanner, getSettings, newThemeCapable }) => {
  const { data, dispatch } = React.useContext(Store);
  const app = useAppBridge();
  const [showBanner, setShowBanner] = useState(banner === "true");
  const [showReviewBanner, setShowReviewBanner] = useState(
    reviewBanner === "true"
  );
  const { theme, shop: shopFromState, disableSave, settings, testedOK } = data;

  // ✅ FIX: Get shop from URL query params as fallback (strict enforcement)
  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const shop = shopFromState || urlParams.get("shop") || '';

  // Track Shopify admin context and save feedback
  const [isShopifyAdmin, setIsShopifyAdmin] = useState(null); // null=checking, true=admin, false=not admin
  const [saveMessage, setSaveMessage] = useState(null); // null, { type: 'success'|'error', message: string }

  useEffect(() => {
    if (banner === undefined) {
      setShowBanner(true);
      setShowReviewBanner(true);
    }
  }, [banner, reviewBanner]);

  // Check if app is running inside Shopify admin
  useEffect(() => {
    const checkAdmin = () => {
      const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      const hostParam = urlParams.get('host');

      // ✅ CRITICAL FIX: Presence of host parameter from Shopify means we're in embedded admin context
      // Do NOT wait for App Bridge initialization here - that's handled by manualTokenFetch when making API calls
      // Shopify's embedded iframe always includes host parameter if launched from Admin > Apps
      const isAdmin = !!hostParam;
      setIsShopifyAdmin(isAdmin);

      if (!isAdmin) {
        console.warn('[NewDashboard] No host parameter — app may not be running inside Shopify Admin');
      }
    };

    checkAdmin();
  }, []);

  // ✅ FIX: Normalize WordPress URL before sending to server
  const normalizeWordPressUrl = (urlValue) => {
    if (!urlValue || typeof urlValue !== 'string') {
      return '';
    }

    let normalized = urlValue.trim();

    // Add https:// if no protocol
    if (!normalized.match(/^https?:\/\//)) {
      normalized = `https://${normalized}`;
    }

    // Remove trailing slashes
    normalized = normalized.replace(/\/+$/, '');

    // Validate URL has a domain
    try {
      const urlObj = new URL(normalized);
      if (!urlObj.hostname) {
        console.warn('[NewDashboard] Invalid URL - no hostname');
        return '';
      }
      // Only include pathname if it's not just the root '/'
      const path = urlObj.pathname && urlObj.pathname !== '/' ? urlObj.pathname.replace(/\/+$/, '') : '';
      return `https://${urlObj.hostname}${path}`;
    } catch (e) {
      console.error('[NewDashboard] Invalid URL:', e.message);
      return '';
    }
  };

  const handleSubmit = async () => {
    try {
      setSaveMessage(null);

      // Check if in Shopify admin
      if (!isShopifyAdmin) {
        setSaveMessage({
          type: 'error',
          message: 'Please open this app from Shopify Admin > Apps'
        });
        console.error('[NewDashboard] Not in Shopify admin context');
        return;
      }

      // ✅ CORRECT v3 PATTERN: Get session token using App Bridge instance
      let token;
      try {
        token = await getSessionToken(app);
        if (!token) {
          setSaveMessage({
            type: 'error',
            message: 'Failed to get session token. Please refresh and try again.'
          });
          return;
        }
      } catch (err) {
        setSaveMessage({
          type: 'error',
          message: 'Failed to authenticate with Shopify. Please refresh and try again.'
        });
        console.error('[NewDashboard] ❌ getSessionToken failed:', err.message);
        return;
      }

      // ✅ FIX: Normalize WordPress URL before sending
      const normalizedSettings = {
        ...settings,
        url: {
          ...settings.url,
          value: normalizeWordPressUrl(settings.url.value)
        }
      };

      const response = await manualTokenFetch(`/api/data`, token, {
        method: 'POST',
        body: JSON.stringify({ settings: normalizedSettings }),
      });

      if (!response || !response.ok) {
        setSaveMessage({
          type: 'error',
          message: 'Failed to save settings. Please try again.'
        });
        return;
      }

      const responseData = await response.json();
      if (responseData) {
        dispatch({
          type: types.FETCH_METADATA,
          payload: responseData,
        });
        dispatch({
          type: types.SAVE_DB,
        });
        setSaveMessage({
          type: 'success',
          message: 'Settings saved successfully!'
        });
        // Clear success message after 3 seconds
        setTimeout(() => setSaveMessage(null), 3000);
      }
    } catch (err) {
      setSaveMessage({
        type: 'error',
        message: `Error saving settings: ${err.message}`
      });
      console.error("Error uploading settings:", err);
    }
  };

  const openThemeEditor = () => {
    const shopFromUrl = new URLSearchParams(window.location.search).get("shop");
    const shopToUse = shopFromUrl || shop;
    if (shopToUse) {
      window.open(`https://${shopToUse}/admin/themes/current/editor?context=apps`, "_blank");
    } else {
      console.error("[NewDashboard] Cannot open theme editor: shop parameter missing");
    }
  };

  const themeButtonDisabled = !testedOK || !disableSave;
  const themeButtonHint = !settings.url.value
    ? "Enter and verify your WordPress URL first."
    : !testedOK
    ? "WordPress URL could not be verified — check the URL above."
    : !disableSave
    ? "Save your settings to continue."
    : null;

  const SaveBar = disableSave || !isShopifyAdmin ? null : (
    <ContextualSaveBar
      fullWidth
      message="Unsaved changes"
      saveAction={{
        onAction: () => handleSubmit(),
        disabled: !testedOK || !isShopifyAdmin,
      }}
      discardAction={{
        onAction: () => getSettings(),
      }}
    />
  );

  const handleDeleteAllMeta = async () => {
    try {
      setSaveMessage(null);

      // Check if in Shopify admin
      if (!isShopifyAdmin) {
        setSaveMessage({
          type: 'error',
          message: 'Please open this app from Shopify Admin > Apps'
        });
        console.error('[NewDashboard] Not in Shopify admin context');
        return;
      }

      // ✅ CORRECT v3 PATTERN: Get session token using App Bridge instance
      let token;
      try {
        token = await getSessionToken(app);
        if (!token) {
          setSaveMessage({
            type: 'error',
            message: 'Failed to get session token. Please refresh and try again.'
          });
          return;
        }
      } catch (err) {
        setSaveMessage({
          type: 'error',
          message: 'Failed to authenticate with Shopify. Please refresh and try again.'
        });
        console.error('[NewDashboard] getSessionToken failed:', err.message);
        return;
      }

      const response = await manualTokenFetch(`/api/deletedata`, token, {
        method: 'POST',
        body: JSON.stringify({ settings }),
      });

      if (!response || !response.ok) {
        setSaveMessage({
          type: 'error',
          message: 'Failed to delete metadata. Please try again.'
        });
        return;
      }

      const responseData = await response.json();
      if (responseData) {
        dispatch({
          type: types.RESET_DATA,
        });
        setSaveMessage({
          type: 'success',
          message: 'All metadata deleted successfully!'
        });
        setTimeout(() => setSaveMessage(null), 3000);
      }
    } catch (err) {
      setSaveMessage({
        type: 'error',
        message: `Error deleting metadata: ${err.message}`
      });
      console.error("Error deleting meta data:", err);
    }
  }


    return (
      <Frame>
        {SaveBar}
        {saveMessage && (
          <div style={{ padding: '16px' }}>
            <Banner
              title={saveMessage.type === 'success' ? 'Success' : 'Error'}
              status={saveMessage.type === 'success' ? 'success' : 'critical'}
              onDismiss={() => setSaveMessage(null)}
            >
              {saveMessage.message}
            </Banner>
          </div>
        )}
        {isShopifyAdmin === false && (
          <div style={{ padding: '16px' }}>
            <Banner status="critical">
              Please open this app from Shopify Admin &gt; Apps. The app is not fully functional when accessed directly.
            </Banner>
          </div>
        )}
        {newThemeCapable === false && (
          <div style={{ padding: '16px' }}>
            <Banner
              title="Theme compatibility notice"
              status="info"
            >
              Your current theme has limited support for Online Store 2.0 app blocks. The WordPress feed can still be embedded using the legacy section method, but some features may not be available. Consider upgrading to a 2.0-compatible theme for the best experience.
            </Banner>
          </div>
        )}
        <Page title="Simple Wordpress Post Feed">
          <Card sectioned>
            <TextContainer>
              <Heading>Get started in 3 steps</Heading>
              <p>
                <strong>1.</strong> Enter your WordPress site URL in the &ldquo;Hosting settings&rdquo; card below and wait for the green confirmation.
              </p>
              <p>
                <strong>2.</strong> Save your settings using the bar that appears at the top of the page.
              </p>
              <p>
                <strong>3.</strong> Open the theme editor to place the WordPress feed block on any page of your store.
              </p>
            </TextContainer>
          </Card>
          <UrlInput />
          <div className="menu-spacer" style={{ height: "16px" }}></div>
          <Layout>
            <Layout.Section oneThird>
              <BasicSetings />
            </Layout.Section>
            <Layout.Section oneThird>
              <Filters />
            </Layout.Section>
            <Layout.Section oneThird>
              <ShowExcerpt />
            </Layout.Section>
          </Layout>
          <div className="menu-spacer" style={{ height: "16px" }}></div>
          <Card sectioned title="Step 3 — Add the feed to your store">
            <TextContainer>
              {themeButtonHint && <p>{themeButtonHint}</p>}
              <Button
                primary
                disabled={themeButtonDisabled}
                onClick={openThemeEditor}
              >
                Open theme editor
              </Button>
            </TextContainer>
          </Card>
          <div className="menu-spacer" style={{ height: "16px" }}></div>
          <ReviewBanner
            showBanner={showReviewBanner}
            setShowBanner={setShowReviewBanner}
          />
          <div className="menu-spacer" style={{ height: "16px" }}></div>
          <TroubleShootBanner
            showBanner={showBanner}
            setShowBanner={setShowBanner}
          />
          <Button destructive onClick={handleDeleteAllMeta} disabled={!isShopifyAdmin}>Delete all meta tags</Button>
          
        </Page>
      </Frame>
    );
};

export default Dashboard;
