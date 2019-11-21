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
import ReactCSSTransitionGroup from "react-addons-css-transition-group";

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */

const DeleteApp = ({ shop, data }) => {
  const { clean } = data;

  const [banner, setBanner] = useState(false);
  const [showDelete, setShowDelete] = useState(!clean);
  const [deleteButtonDisabled, setDeleteButtonDisabled] = useState(false);
  const [restoreButtonDisabled, setRestoreButtonDisabled] = useState(false);
  const [bannertext, setBannertext] = useState("");
  const handleClick = action => {
    const data = { shop: shop, action: action };
    if (action === "restore") {
      setRestoreButtonDisabled(true);
      setDeleteButtonDisabled(false);
      setBannertext(restoreBannerMessage);
      setShowDelete(true);
    } else {
      setRestoreButtonDisabled(false), setDeleteButtonDisabled(true);
      setBannertext(deleteBannerMessage);
      setShowDelete(false);
    }
    setBanner(true);
    setTimeout(() => {
      setBanner(false);
    }, 6000);
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
      .then(res => {
        //
      })
      .catch(err => console.log(err));
  };

  const deleteBannerMessage =
    "Delete was successful! Now you can uninstall the application normally from the Apps";
  const restoreBannerMessage = "Reinstall was successful!";

  const bannerMessage = (
    <Banner key="banner" status="success">
      {bannertext}
    </Banner>
  );

  const deleteButton = (
    <Layout.AnnotatedSection
      title="Remove App Files"
      description="Remove Liquid files added by the application"
    >
      <Card sectioned>
        <Button
          destructive
          onClick={() => handleClick("clean")}
          disabled={deleteButtonDisabled}
        >
          Uninstall
        </Button>
        <br />
        <br />
        This will delete all liquid files and it is recommended to do just
        before removing the app from your shopify store.
      </Card>
    </Layout.AnnotatedSection>
  );

  const restoreButton = (
    <Layout.AnnotatedSection
      title="Reinstall App Files"
      description="Reinstall Liquid files"
    >
      <Card sectioned>
        <Button
          primary
          onClick={() => handleClick("restore")}
          disabled={restoreButtonDisabled}
        >
          Reinstall
        </Button>
        <br />
        <br />
        This will reinstall all liquid files.
      </Card>
    </Layout.AnnotatedSection>
  );
  const deleteFiles = showDelete ? deleteButton : restoreButton;

  return (
    <section>
      <Divider xl />
      <ReactCSSTransitionGroup
        transitionName="example"
        transitionEnterTimeout={500}
        transitionLeaveTimeout={500}
      >
        {banner ? bannerMessage : null}
      </ReactCSSTransitionGroup>
      <Layout>{deleteFiles}</Layout>
    </section>
  );
};

DeleteApp.defaultProps = {
  shop: "shop",
  data: { clean: false }
};

export default DeleteApp;
