import {
  Page,
  Card,
  Banner,
  TextContainer,
  Heading,
  Button,
} from "@shopify/polaris";
import EnableSection from "./EnableSection";
import UpdateSection from "./UpdateSection";
import React, { useState, useEffect } from "react";
import lscache from "lscache";
import { useTranslation } from "next-i18next";
import PropTypes from "prop-types";
import Link from "next/link";

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */

const Dashboard = ({ storeData, shop, banner }) => {
  const { t } = useTranslation("dashboard");
  const [showBanner, setShowBanner] = useState(banner === "true");
  const bannerMessage = (
    <Banner
      className="infobanner"
      title={t("infobanner")}
      onDismiss={() => {
        lscache.set("message", "false", 300000);
        setShowBanner(false);
      }}
      status="info"
    >
      <p>
        {t("infomessage")}{" "}
        <a
          href="https://stackedboost.com/apps/simple-wordpress-post-feed/#faq"
          target="blank"
        >
          {t("linkmessage")}
        </a>
      </p>
    </Banner>
  );
  /**Link to the shop theme customizer */
  const themeSectionEditor = (
    <Button
      primary={true}
      onClick={() =>
        window.open(
          `https://${shop}/admin/themes/${storeData.theme}/editor`,
          "_blank"
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
            {t("p1")} {t("p2")} {t("p3")}{" "}
            <Link href="/about">
              <a>{t("documentation")}</a>
            </Link>
          </p>
          {themeSectionEditor}
          <p>
            <i>{t("p4")}</i>
          </p>
        </TextContainer>
      </Card>
      <br />
      {showBanner ? bannerMessage : null}
      <UpdateSection data={storeData} shop={shop} />
    </Page>
  );
};

export default Dashboard;
