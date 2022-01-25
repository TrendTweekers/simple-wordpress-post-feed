import React from "react";
import PropTypes from "prop-types";

// import LanguageSelector from "./LanguageSelector";

const Header = ({handleClick}) => {
  const handleKeypress = (event) => {
    if (event.key === 'Enter') {
      handleClick('main');
    }
  };
  return (
    <div className="header">
      <div onClick={() => handleClick('main')} className="nav-button" onKeyPress={() => handleKeypress()}>
        <div>Settings</div>
      </div>
      <div onClick={() => handleClick('documentation')} className="nav-button" onKeyPress={() => handleKeypress()}>
        <div>Documentation</div>
      </div>
      {/* <LanguageSelector shopOrigin={shop} /> */}
    </div>
  );
};

Header.propTypes = {
  handleClick: PropTypes.func,
};

// Header.getInitialProps = async () => ({
//   namespacesRequired: ["common"],
// });

export default Header;
