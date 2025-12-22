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
import { authenticatedFetch } from "../../lib/authenticatedFetch";

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
  useEffect(() => {
    if (banner === undefined) {
      setShowBanner(true);
      setShowReviewBanner(true);
    }
  }, [banner, reviewBanner]);
  const handleSubmit = async () => {
    try {
      const responseData = await authenticatedFetch(`/api/data`, {
        method: 'POST',
        data: { settings }
      }, app);
      
      if (responseData) {
        dispatch({
          type: types.FETCH_METADATA,
          payload: responseData,
        });
        dispatch({
          type: types.SAVE_DB,
        });
      } else {
        // Redirect was triggered
        console.log("!!! Redirect triggered for reauth !!!");
      }
    } catch (err) {
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

  const SaveBar = disableSave ? null : (
    <ContextualSaveBar
      fullWidth
      message="Unsaved changes"
      saveAction={{
        onAction: () => handleSubmit(),
        disabled: !testedOK,
      }}
      discardAction={{
        onAction: () => getSettings(),
      }}
    />
  );

  const handleDeleteAllMeta = async () => {
    try {
      const responseData = await authenticatedFetch(`/api/deletedata`, {
        method: 'POST',
        data: { settings }
      }, app);
      
      if (responseData) {
        dispatch({
          type: types.RESET_DATA,
        });
      } else {
        // Redirect was triggered
        console.log("!!! Redirect triggered for reauth !!!");
      }
    } catch (err) {
      console.error("Error deleting meta data:", err);
    }
  }


    return (
      <Frame>
        {SaveBar}
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
          <Button destructive onClick={handleDeleteAllMeta}>Delete all meta tags</Button>
          
        </Page>
      </Frame>
    );
};

export default Dashboard;
