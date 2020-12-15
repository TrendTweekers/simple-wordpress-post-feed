import {
  Page,
  Button,
  Layout,
  Card,
  FormLayout,
  Banner,
} from "@shopify/polaris";
import Divider from "./Divider";
import React, { useState } from "react";
import fetch from "isomorphic-unfetch";
import { TUNNEL_URL } from "../server/config/config";
import { withTranslation } from "../i18n";
import PropTypes from "prop-types";

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */

const update = ({ data, shop, t }) => {
  const [buttonDisabled, setButtonDisabled] = useState(data.disableUpdate);
  const [banner, setBanner] = useState(false);
  const action = "update";

  const update = () => {
    const data = { shop: shop, action: action };
    setButtonDisabled(true);
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
      .then((res) => {})
      .catch((err) => console.log(err));
  };

  // console.log(getSettings());

  const bannerMessage = banner ? (
    <div className="banner_animation">
      <Banner
        key="update_banner"
        status="success"
        title={t("ubanner")}
      ></Banner>
    </div>
  ) : null;

  return (
    <section>
      <div style={{ height: "60px" }}>{bannerMessage}</div>
      <br />
      <Card title={t("utitle")} sectioned>
        {t("u1")}
        <br />
        <br />
        <Button onClick={update} disabled={buttonDisabled}>
          {t("ubutton")}
        </Button>
        <br />
        <br />
        {buttonDisabled
          ? `${t("u2")} ${data.latestVersion} ${t("u3")}`
          : `${t("u4")} ${data.version} => ${data.latestVersion}`}
      </Card>
    </section>
  );
};

// Specifies the default values for props:
update.defaultProps = {
  data: { version: "1.1.1.1", latestVersion: "1.1.1.1", disableUpdate: true },
};

update.propTypes = {
  t: PropTypes.func.isRequired,
};

export default withTranslation("dashboard")(update);
