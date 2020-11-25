import React, { useCallback, useState } from "react";
import { Select } from "@shopify/polaris";
import { i18n, withTranslation } from "../i18n";
import PropTypes from "prop-types";
import Image from "next/image";

const LanguageSelector = ({ t }) => {
  const [selected, setSelected] = useState(i18n.language);

  const handleSelectChange = useCallback((lang) => {
    i18n.changeLanguage(lang);
    setSelected(lang);
  }, []);

  const options = [
    { label: "english", value: "en" },
    { label: "polski", value: "pl" },
  ];

  return (
    <div id="languageselector">
      <Select
        label={t("change-locale")}
        options={options}
        onChange={handleSelectChange}
        value={selected}
        labelHidden={true}
      />
    </div>
  );
};

LanguageSelector.propTypes = {
  t: PropTypes.func.isRequired,
};

export default withTranslation("common")(LanguageSelector);
