import {
  Page,
  Button,
  Layout,
  Card,
  FormLayout,
  Banner,
} from "@shopify/polaris";
import Divider from "./Divider";
import React, { useState, useEffect } from "react";
import fetch from "isomorphic-unfetch";
import { TUNNEL_URL } from "../server/config/config";
import { withTranslation } from "../i18n";
import PropTypes from "prop-types";

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */

const DeleteApp = ({ shop, data, t }) => {
  const { clean } = data;

  const [banner, setBanner] = useState(false);
  const [showDelete, setShowDelete] = useState(!clean);
  const [deleteButtonDisabled, setDeleteButtonDisabled] = useState(false);
  const [restoreButtonDisabled, setRestoreButtonDisabled] = useState(false);
  const [bannertext, setBannertext] = useState("");
  const handleClick = (action) => {
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
    }, 9000);
    fetch(`${TUNNEL_URL}/api/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // 'Content-Type': 'application/x-www-form-urlencoded',
      },
      redirect: "follow", // manual, *follow, error
      referrer: "no-referrer", // no-referrer, *client
      body: JSON.stringify(data),
    })
      .then((res) => {
        //
      })
      .catch((err) => console.log(err));
  };

  const deleteBannerMessage = t("dmessage1");
  const restoreBannerMessage = t("dmessage2");

  const bannerMessage = banner ? (
    <div className="banner_animation">
      <Banner key="banner" status="success" title={bannertext}></Banner>
    </div>
  ) : null;

  const deleteButton = (
    <Card title={t("dtitle")} sectioned>
      {t("dp1")}
      <br />
      <br />
      <Button
        destructive
        onClick={() => handleClick("clean")}
        disabled={deleteButtonDisabled}
      >
        {t("dbutton")}
      </Button>
      <br />
      <br />
      {t("dp2")}
    </Card>
  );

  const restoreButton = (
    <Card title="Reinstall App Files" sectioned>
      {t("rtitle")}
      <br />
      <br />
      <Button
        primary
        onClick={() => handleClick("restore")}
        disabled={restoreButtonDisabled}
      >
        {t("rbutton")}
      </Button>
    </Card>
  );
  const deleteFiles = showDelete ? deleteButton : restoreButton;

  return (
    <React.Fragment>
      <div style={{ height: "60px" }}>{bannerMessage}</div>
      <br />
      {deleteFiles}
    </React.Fragment>
  );
};

DeleteApp.defaultProps = {
  shop: "shop",
  data: { clean: false },
};

DeleteApp.propTypes = {
  t: PropTypes.func.isRequired,
};

export default withTranslation("dashboard")(DeleteApp);
