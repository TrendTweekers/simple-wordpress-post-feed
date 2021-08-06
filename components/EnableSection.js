import {

  TextStyle,
  SettingToggle,

} from "@shopify/polaris";
import React, {useState} from "react";
import fetch from "isomorphic-unfetch";
import {useTranslation} from "next-i18next";
import PropTypes from "prop-types";

import {TUNNEL_URL} from "../server/config/config";

/**
 * Index is fetching data with graphql from wordpress.
 * @param  {pageURI}
 * has to be set
 */

const EnableSection = ({shop, data}) => {
  const {t} = useTranslation("dashboard");
  const {clean} = data;

  const [disabled, setDisabled] = useState(clean);

  const contentStatus = disabled ? t("Enable") : t("Disable");
  const textStatus = disabled ? t("disabled") : t("enabled");

  const handleClick = () => {
    const postData = {shop, action: null};
    if (disabled) {
      postData.action = "enable";
      setDisabled(false);
    } else {
      postData.action = "clean";
      setDisabled(true);
    }
    fetch(`/api/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // 'Content-Type': 'application/x-www-form-urlencoded',
      },
      redirect: "follow",
      referrer: "origin",
      body: JSON.stringify(postData),
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

EnableSection.propTypes = {
  shop: PropTypes.string,
  data: PropTypes.shape({
    clean: PropTypes.bool,
  }),
};

EnableSection.defaultProps = {
  shop: "shop",
  data: {clean: false},
};

export default EnableSection;
