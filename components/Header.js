import React from "react";
import {useTranslation} from "next-i18next";
import PropTypes from "prop-types";

import LanguageSelector from "./LanguageSelector";

const Header = ({shop, handleClick}) => {
  return (
    <div className="header">
      <div onClick={() => handleClick('main')} className="nav-button">
        <div>Settings</div>
      </div>
      <div onClick={() => handleClick('documentation')} className="nav-button">
        <div>Documentation</div>
      </div>
      {/* <LanguageSelector shopOrigin={shop} /> */}
    </div>
  );
};

// Header.getInitialProps = async () => ({
//   namespacesRequired: ["common"],
// });

export default Header;
