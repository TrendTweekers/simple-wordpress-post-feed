import React from "react";
import Link from "next/link";
import { useTranslation } from "next-i18next";
import PropTypes from "prop-types";
import LanguageSelector from "./LanguageSelector";

const Header = ({ shop }) => {
  return (
    <div className="header">
      <Link href={`/?shop=${shop}`}>
        <a>Settings</a>
      </Link>
      <Link href={`/about?shop=${shop}`}>
        <a>Documentation</a>
      </Link>
      {/* <LanguageSelector shopOrigin={shop} /> */}
    </div>
  );
};

// Header.getInitialProps = async () => ({
//   namespacesRequired: ["common"],
// });

export default Header;
