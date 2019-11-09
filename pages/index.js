import {
  Page,
  Button,
  Layout,
  Card,
  FormLayout,
  Banner
} from "@shopify/polaris";
import Divider from "./../components/Divider";
import React, { useState, useEffect } from "react";
import ApolloClient, { gql } from "apollo-boost";
import Link from "next/link";

import "../styles.scss";

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */
const Index = () => {
  const [buttonDisabled, setButtonDisabled] = useState(true);
  const [banner, setBanner] = useState(false);
  const [settings, setSettings] = useState();
  const fetchURL = "/api/data";

  const install = () => {
    fetch("/api/update")
      .then(res => res.json())
      .then(json => {
        //console.log(json);
        setButtonDisabled(true);
        setBanner(true);
        setTimeout(() => {
          setBanner(false);
        }, 8000);
      })
      .catch(err => console.log(err));
  };

  const getSettings = () => {
    fetch(fetchURL)
      .then(res => res.json())
      .then(json => {
        setButtonDisabled(json.updated);
        //console.log(json);
      });
  };

  useEffect(() => {
    getSettings();
  }, [fetchURL]);

  const bannerMessage = banner ? (
    <Banner status="success">Reinstall &amp; Update was successful!</Banner>
  ) : null;

  return (
    <Page title="Simple Wordpress Feed">
      <Card sectioned>
        <p>
          <b>Thank for installing Simple Wordpress Post Feed.</b>
          <br /> To get started go to theme section editor and add the Simple
          Wordpress Post Feed section. For more detaild instructions see the
          <Link href="/about">
            <a>documentation</a>
          </Link>
          .<br />
          <br />
          <i>Hope you enjoy the app and dont forget to leave a reveiew.</i>
        </p>
      </Card>
      <Divider xl />
      {bannerMessage}
      <Layout>
        <Layout.AnnotatedSection
          title="Update App"
          description="If you would have any issues with application please run update"
        >
          <Card sectioned>
            Clicking update button will trigger a reinstall & update of App
            files & Scripts.
            <br />
            <br />
            <Button onClick={install} disabled={buttonDisabled}>
              Update
            </Button>
          </Card>
        </Layout.AnnotatedSection>
      </Layout>
    </Page>
  );
};

export default Index;
