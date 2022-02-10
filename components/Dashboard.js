/* eslint-disable shopify/jsx-no-hardcoded-content */
/* eslint-disable shopify/prefer-early-return */
/* eslint-disable react/prop-types */
import {
  Page,
  Card,
  TextContainer,
  Heading,
  Button,
} from "@shopify/polaris";
import React, {useState, useEffect} from "react";

import UpdateSection from "./UpdateSection";
import EnableSection from "./EnableSection";
import {TroubleShootBanner, ReviewBanner} from "./Banners";
import { Store } from '../store/store';

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */

const Dashboard = ({ banner, reviewBanner}) => {
  const { data, dispatch } = React.useContext(Store);
  const [showBanner, setShowBanner] = useState(banner === "true");
  const [showReviewBanner, setShowReviewBanner] = useState(reviewBanner === "true");
const {theme,shop} = data
  useEffect(() => {
    if (banner === undefined) {
      setShowBanner(true);
      setShowReviewBanner(true);
    }
  }, [banner, reviewBanner]);


  /** Link to the shop theme customizer */
  const themeSectionEditor = (
    <Button
      primary
      onClick={() =>
        window.open(
          `https://${shop}/admin/themes/${theme}/editor`,
          "_blank"
        )
      }
    >
      Theme section editor
    </Button>
  );
  return (
    <Page title="Simple Wordpress Post Feed">
      <EnableSection/>
      <Card sectioned>
        <TextContainer>
          <Heading>Thank you for installing Simple Wordpress Post Feed!</Heading>
          <p>
          To get started go to Theme section editor and add the Wordpress Post Feed section. For more detailed instructions see the documentation
          </p>
          {themeSectionEditor}
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
    </Page>
  );
};

export default Dashboard;
