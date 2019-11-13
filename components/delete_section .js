import {
  Page,
  Button,
  Layout,
  Card,
  FormLayout,
  Banner
} from "@shopify/polaris";
import Divider from "./Divider";
import React, { useState, useEffect } from "react";
import fetch from "isomorphic-unfetch";
import { TUNNEL_URL } from "../server/config/config";

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */

const DeleteApp = props => {
  const { shop } = props;
  const action = "uninstall";
  const [banner, setBanner] = useState(false);
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const unInstall = () => {
    fetch(`${TUNNEL_URL}/api/update?shop=${shop}&action=${action}`)
      .then(res => res.json())
      .then(json => {
        setButtonDisabled(true);
        setBanner(true);
        setTimeout(() => {
          setBanner(false);
        }, 12000);
      })
      .catch(err => console.log(err));
  };

  const bannerMessage = banner ? (
    <Banner status="success">
      Delete was successful! Now you can uninstall the application normally from
      the Apps
    </Banner>
  ) : null;

  return (
    <section>
      <Divider xl />
      {bannerMessage}
      <Layout>
        <Layout.AnnotatedSection
          title="Remove App Files"
          description="Remove Liquid files added by application"
        >
          <Card sectioned>
            <Button destructive onClick={unInstall} disabled={buttonDisabled}>
              Uninstall
            </Button>
            <br />
            <br />
            This will delete all liquid files and is recommended to do just
            before removing the app from your shopify store.
          </Card>
        </Layout.AnnotatedSection>
      </Layout>
    </section>
  );
};

export default DeleteApp;
