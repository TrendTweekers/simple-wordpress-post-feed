import {
  Page,
  Button,
  Layout,
  Card,
  FormLayout,
  Banner,
  TextContainer,
  TextStyle,
  SettingToggle,
  Stack,
} from "@shopify/polaris";
import Divider from "./Divider";
import React, { useState, useEffect } from "react";
import fetch from "isomorphic-unfetch";
import { TUNNEL_URL } from "../server/config/config";
import { useTranslation } from "next-i18next";
import PropTypes from "prop-types";

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */

const EnableSection = ({ shop, data }) => {
  const { t } = useTranslation("dashboard");
  const { clean } = data;

  const [disabled, setDisabled] = useState(clean);

  const deleteBannerMessage = t("deactivate");
  const restoreBannerMessage = t("activate");

  const contentStatus = disabled ? t("Enable") : t("Disable");
  const textStatus = disabled ? t("disabled") : t("enabled");

  const handleClick = () => {
    const data = { shop: shop, action: null };
    if (disabled) {
      data.action = "enable";
      setDisabled(false);
    } else {
      data.action = "clean";
      setDisabled(true);
    }
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

  return (
    <SettingToggle
      action={{
        content: contentStatus,
        onAction: handleClick,
      }}
      enabled={!disabled}
    >
      {t("Section_is")} <TextStyle variation="strong">{textStatus}</TextStyle>
    </SettingToggle>
  );
};

EnableSection.defaultProps = {
  shop: "shop",
  data: { clean: false },
};

export default EnableSection;
