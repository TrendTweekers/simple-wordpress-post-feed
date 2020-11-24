import {
  Page,
  Button,
  Layout,
  Card,
  FormLayout,
  Banner,
} from "@shopify/polaris";
import Divider from "../components/Divider";
import Update from "../components/update_section";
import DeleteApp from "../components/delete_section";
import React, { useState, useEffect } from "react";
import lscache from "lscache";
import { i18n, withTranslation } from "../i18n";
import PropTypes from "prop-types";
import Link from "next/link";
import "../styles.scss";

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */

const Dashboard = ({ storeData, shop, banner, t }) => {
  console.log(i18n.language);
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
  const customizerlink = `https://${shop}/admin/themes/${storeData.theme}/editor`;
  return (
    <Page title="Simple Wordpress Post Feed">
      <Card sectioned>
        <p>
          <b>{t("header")}</b>
          <br />
          {t("p1")}{" "}
          <a href={customizerlink} target="_blank">
            {t("p2")}
          </a>{" "}
          {t("p3")}{" "}
          <Link href="/about">
            <a>{t("documentation")}</a>
          </Link>
          .<br />
          <br />
          <i>{t("p4")}</i>
        </p>
      </Card>
      <br />
      {showBanner ? bannerMessage : null}
      <br />
      <Update data={storeData} shop={shop} />
      <Divider xl />
      <DeleteApp data={storeData} shop={shop} />
    </Page>
  );
};

Dashboard.propTypes = {
  t: PropTypes.func.isRequired,
};

export default withTranslation("dashboard")(Dashboard);
