import React, { useCallback, useState } from "react";
import { Select } from "@shopify/polaris";
import { i18n, withTranslation } from "../i18n";
import PropTypes from "prop-types";

const LanguageSelector = ({ t }) => {
  const [selected, setSelected] = useState(i18n.language);

  const handleSelectChange = useCallback((lang) => {
    i18n.changeLanguage(lang);
    setSelected(lang);
  }, []);

  const options = [
    { label: t("english"), value: "en" },
    { label: t("polish"), value: "pl" },
  ];

  return (
    <Select
      label={t("change-locale")}
      options={options}
      onChange={handleSelectChange}
      value={selected}
      labelHidden={true}
    />
  );
};

export default withTranslation("common")(LanguageSelector);
