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
import DeleteApp from "../components/delete_section ";
import React, { useState, useEffect } from "react";
import lscache from "lscache";

import Link from "next/link";
import { TUNNEL_URL } from "../server/config/config";

import "../styles.scss";

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */

const Dashboard = ({ storeData, shop, banner }) => {
  const [showBanner, setShowBanner] = useState(banner === "true");
  const bannerMessage = (
    <Banner
      className="infobanner"
      title="Troubleshooting"
      onDismiss={() => {
        lscache.set("message", "false", 300000);
        setShowBanner(false);
      }}
      status="info"
    >
      <p>
        If you have problem displaying your wordpress posts please check our
        troubleshooting guide for instructions how to solve common issues{" "}
        <a
          href="https://stackedboost.com/apps/simple-wordpress-post-feed/faq/"
          target="blank"
        >
          open troubleshooting
        </a>
      </p>
    </Banner>
  );
  return (
    <Page title="Simple Wordpress Feed">
      <Card sectioned>
        <p>
          <b>Thank you for installing Simple Wordpress Post Feed!</b>
          <br /> To get started go to theme section editor and add the Simple
          Wordpress Post Feed section. For more detailed instructions see the{" "}
          <Link href="/about">
            <a>documentation</a>
          </Link>
          .<br />
          <br />
          <i>
            Hope you enjoy the app and please don't forget to leave a review 😘
          </i>
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

export default Dashboard;
