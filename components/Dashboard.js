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
import {useTranslation} from "next-i18next";

import UpdateSection from "./UpdateSection";
import EnableSection from "./EnableSection";
import {TroubleShootBanner, ReviewBanner} from "./Banners";
import ThemeCheck from "./ThemeCheck";

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */

const Dashboard = ({storeData, shop, banner, reviewBanner}) => {
  const {t} = useTranslation("dashboard");
  const [showBanner, setShowBanner] = useState(banner === "true");
  const [showReviewBanner, setShowReviewBanner] = useState(
    reviewBanner === "true",
  );

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
          `https://${shop}/admin/themes/${storeData.theme}/editor`,
          "_blank",
        )
      }
    >
      {t("p2")}
    </Button>
  );
  return (
    <Page title="Simple Wordpress Post Feed">
      <EnableSection data={storeData} shop={shop} />
      <Card sectioned>
        <TextContainer>
          <Heading>{t("header")}</Heading>
          <p>
            {t("p1")} {t("p2")} {t("p3")}
          </p>
          {themeSectionEditor}
          <p>
            <i>{t("p4")}</i>
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
      <ThemeCheck data={storeData} />
      <UpdateSection data={storeData} shop={shop} />
    </Page>
  );
};

export default Dashboard;
