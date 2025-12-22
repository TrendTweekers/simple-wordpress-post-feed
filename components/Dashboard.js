/* eslint-disable shopify/jsx-no-hardcoded-content */
/* eslint-disable shopify/prefer-early-return */
/* eslint-disable react/prop-types */
import {
  Page,
  Card,
  TextContainer,
  Heading,
  Button,
  Banner,
} from "@shopify/polaris";
import React, {useState} from "react";

import UpdateSection from "./UpdateSection";
import EnableSection from "./EnableSection";
import {TroubleShootBanner, ReviewBanner} from "./Banners";
import { Store } from '../store/store';

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */

const Dashboard = ({ newTheme}) => {
  const { data } = React.useContext(Store);
  const [showBanner, setShowBanner] = useState("true");
  const [showReviewBanner, setShowReviewBanner] = useState("true");
  const {theme,shop: shopFromState,themeAccess} = data

  // ✅ FIX: Get shop and host from URL query params as fallback (strict enforcement)
  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const shop = shopFromState || urlParams.get("shop") || '';
  const host = urlParams.get("host") || '';

  // Build OAuth URL to request read_themes scope
  const buildUpdatePermissionsUrl = () => {
    const shopParam = shop || '';
    const hostParam = host || (shopParam ? btoa(`${shopParam}/admin`) : '');
    return `/install/auth?shop=${encodeURIComponent(shopParam)}&host=${encodeURIComponent(hostParam)}`;
  };

  /** Link to the shop theme customizer - ✅ FIX: Use shop from URL params directly */
  const themeSectionEditor = (
    <Button
      primary
      onClick={() => {
        // ✅ FIX: Get shop directly from URL params to ensure it's always available
        const shopFromUrl = new URLSearchParams(window.location.search).get("shop");
        const shopToUse = shopFromUrl || shop;
        if (shopToUse) {
          const themeUrl = `https://${shopToUse}/admin/themes/current/editor?context=apps`;
          window.open(themeUrl, "_blank");
        } else {
          console.error("[Dashboard] Cannot open theme editor: shop parameter missing");
        }
      }}
    >
      Theme section editor
    </Button>
  );
  return (
    <Page title="Simple Wordpress Post Feed">
      <EnableSection/>
      {themeAccess === false && (
        <Banner
          title="Theme access not approved"
          status="warning"
          onDismiss={() => {}}
        >
          <p>
            Theme access not approved. Click &apos;Update permissions&apos; to grant read_themes scope.
          </p>
          <Button
            primary
            onClick={() => {
              const updateUrl = buildUpdatePermissionsUrl();
              window.location.href = updateUrl;
            }}
          >
            Update permissions
          </Button>
        </Banner>
      )}
      <Card sectioned>
        <TextContainer>
          <Heading>Thank you for installing Simple Wordpress Post Feed!</Heading>
          <p>
          To get started go to Theme section editor and add the Wordpress Post Feed section. For more detailed instructions see the documentation
          </p>
          {themeAccess !== false && themeSectionEditor}
          <p>
            <i>Hope you enjoy the app and please don&apos;t forget to leave a review <span role="img" aria-label="kisses">😘</span></i>
          </p>
        </TextContainer>
      </Card>
      <br />
      <ReviewBanner
        showBanner={showReviewBanner}
        setShowBanner={setShowReviewBanner}
      />
      <br />
      <TroubleShootBanner
        showBanner={showBanner}
        setShowBanner={setShowBanner}
      />
      {/* <ThemeCheck data={storeData} /> */}
      <UpdateSection />
      <br />
      <Card sectioned>
      <Heading>If you are currently using older theme but you want to test the settings for Theme 2.0 please click on the button below!</Heading>
      <br/>
      <Button primary onClick={newTheme}>Show theme 2.0 settings</Button>
      </Card>
    </Page>
  );
};

export default Dashboard;
