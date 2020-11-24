import React from "react";
import Link from "next/link";
import { i18n, withTranslation } from "../i18n";
import PropTypes from "prop-types";
import LanguageSelector from "./LanguageSelector";

const Header = ({ t }) => (
  <div className="header">
    <Link href="/">
      <a>{t("settings")}</a>
    </Link>
    <Link href="/about">
      <a>{t("documentation")}</a>
    </Link>
    <LanguageSelector />
  </div>
);

// Header.getInitialProps = async () => ({
//   namespacesRequired: ['common'],
// })

Header.propTypes = {
  t: PropTypes.func.isRequired,
};

export default withTranslation("common")(Header);
