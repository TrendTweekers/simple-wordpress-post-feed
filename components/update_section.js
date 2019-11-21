import {
  Page,
  Button,
  Layout,
  Card,
  FormLayout,
  Banner
} from "@shopify/polaris";
import Divider from "./Divider";
import React, { useState } from "react";
import ReactCSSTransitionGroup from "react-addons-css-transition-group";
import fetch from "isomorphic-unfetch";
import { TUNNEL_URL } from "../server/config/config";

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */

const update = props => {
  const [buttonDisabled, setButtonDisabled] = useState(
    props.data.disableUpdate
  );
  const [banner, setBanner] = useState(false);
  const action = "update";
  const { shop } = props;

  const update = () => {
    const data = { shop: shop, action: action };
    setButtonDisabled(true);
    setBanner(true);
    setTimeout(() => {
      setBanner(false);
    }, 8000);
    fetch(`${TUNNEL_URL}/api/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
        // 'Content-Type': 'application/x-www-form-urlencoded',
      },
      redirect: "follow", // manual, *follow, error
      referrer: "no-referrer", // no-referrer, *client
      body: JSON.stringify(data)
    })
      .then(res => {})
      .catch(err => console.log(err));
  };

  // console.log(getSettings());

  const bannerMessage = banner ? (
    <Banner key="update_banner" status="success">
      Reinstall &amp; Update was successful!
    </Banner>
  ) : null;

  return (
    <section>
      <Divider xl />
      <ReactCSSTransitionGroup
        transitionName="example"
        transitionEnterTimeout={500}
        transitionLeaveTimeout={500}
      >
        {bannerMessage}
      </ReactCSSTransitionGroup>

      <Layout>
        <Layout.AnnotatedSection
          title="Update App"
          description="Keep your app up to date when new version is relesed"
        >
          <Card sectioned>
            <Button onClick={update} disabled={buttonDisabled}>
              Update now
            </Button>
            <br />
            <br />
            {buttonDisabled
              ? `Store version: ${props.data.latestVersion} is up to date`
              : `update: ${props.data.version} => ${props.data.latestVersion}`}
          </Card>
        </Layout.AnnotatedSection>
      </Layout>
    </section>
  );
};

// Specifies the default values for props:
update.defaultProps = {
  data: { version: "1.1.1.1", latestVersion: "1.1.1.1", disableUpdate: true }
};

export default update;
