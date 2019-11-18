import {
  Page,
  Button,
  Layout,
  Card,
  FormLayout,
  Banner
} from "@shopify/polaris";
import Update from "../components/update_section";
import DeleteApp from "../components/delete_section ";
import React, { useState, useEffect } from "react";

import Link from "next/link";
import { TUNNEL_URL } from "../server/config/config";

import "../styles.scss";

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */

const Dashboard = ({ storeData, shop }) => {
  const [banner, setBanner] = useState(false);

  const bannerMessage = banner ? (
    <Banner status="success">Reinstall &amp; Update was successful!</Banner>
  ) : null;

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
      <Update data={storeData} shop={shop} />
      <DeleteApp data={storeData} shop={shop} />
    </Page>
  );
};

export default Dashboard;
