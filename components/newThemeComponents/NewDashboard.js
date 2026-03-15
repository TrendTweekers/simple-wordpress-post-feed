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
import axios from "axios";
import { useAppBridge } from "@shopify/app-bridge-react";
import { TroubleShootBanner, ReviewBanner } from "../Banners";
import * as types from "../../store/types";
import { Store } from "../../store/store";
import UrlInput from "./UrlInput";
import BasicSetings from "./BasicSettings";
import Filters from "./Filters";
import ShowExcerpt from "./ShowExcerpt";
import LastPost from "./LastPost";
import { manualTokenFetch, waitForShopify } from "../../lib/manualTokenFetch";

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */

const Dashboard = ({ banner, reviewBanner, getSettings }) => {
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
        console.warn('[NewDashboard] Admin context check: No host parameter found - not embedded in Shopify admin');
      } else {
        console.log('[NewDashboard] Admin context check: ✅ Host parameter present - embedded in Shopify admin');
      }
    };

    checkAdmin();
  }, []);
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

      // ✅ CRITICAL: Wait for Shopify and use manual token fetch
      const isReady = await waitForShopify(3000);
      if (!isReady) {
        setSaveMessage({
          type: 'error',
          message: 'Failed to connect to Shopify. Please refresh and try again.'
        });
        console.error('[NewDashboard] window.shopify.idToken() not available');
        return;
      }

      const response = await manualTokenFetch(`/api/data`, {
        method: 'POST',
        body: JSON.stringify({ settings }),
      });

      if (!response || !response.ok) {
        setSaveMessage({
          type: 'error',
          message: 'Failed to save settings. Please try again.'
        });
        console.log("!!! Request failed or redirect triggered !!!");
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

  /** Link to the shop theme customizer - ✅ FIX: Use shop from URL params directly */
  const themeSectionEditor = (
    <Button
      primary
      disabled={!testedOK}
      onClick={() => {
        // ✅ FIX: Get shop directly from URL params to ensure it's always available
        const shopFromUrl = new URLSearchParams(window.location.search).get("shop");
        const shopToUse = shopFromUrl || shop;
        if (shopToUse) {
          const themeUrl = `https://${shopToUse}/admin/themes/current/editor?context=apps`;
          window.open(themeUrl, "_blank");
        } else {
          console.error("[NewDashboard] Cannot open theme editor: shop parameter missing");
        }
      }}
    >
      Theme section editor
    </Button>
  );

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

      // ✅ CRITICAL: Wait for Shopify and use manual token fetch
      const isReady = await waitForShopify(3000);
      if (!isReady) {
        setSaveMessage({
          type: 'error',
          message: 'Failed to connect to Shopify. Please refresh and try again.'
        });
        console.error('[NewDashboard] window.shopify.idToken() not available');
        return;
      }

      const response = await manualTokenFetch(`/api/deletedata`, {
        method: 'POST',
        body: JSON.stringify({ settings }),
      });

      if (!response || !response.ok) {
        setSaveMessage({
          type: 'error',
          message: 'Failed to delete metadata. Please try again.'
        });
        console.log("!!! Request failed or redirect triggered !!!");
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
        // Clear success message after 3 seconds
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        // Redirect was triggered
        console.log("!!! Redirect triggered for reauth !!!");
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
        <Page title="Simple Wordpress Post Feed">
          <Card sectioned>
            <TextContainer>
              <Heading>
                Thank you for installing Simple Wordpress Post Feed!
              </Heading>
              <p>
                To get started please set your Wordpress URL and some basic
                settings here below. After saving the settings you can head over
                to the Theme section editor to customize the widget
              </p>
              {themeSectionEditor}
              <p>
                <i>
                  Hope you enjoy the app and please don&apos;t forget to leave a
                  review{" "}
                  <span role="img" aria-label="kisses">
                    😘
                  </span>
                </i>
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
