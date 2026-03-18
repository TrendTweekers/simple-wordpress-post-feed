import React from "react";
import PropTypes from "prop-types";

const TABS = [
  { id: "main",          label: "Dashboard"     },
  { id: "documentation", label: "Documentation" },
];

const Header = ({ handleClick, activePage }) => {
  const active = activePage || "main";

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 4,
      borderBottom: "1px solid #e5e7eb",
      marginBottom: 0,
      padding: "0 20px",
      background: "#fff",
    }}>
      {TABS.map((tab) => {
        const isActive =
          tab.id === "main"
            ? (active === "main" || !active)
            : (active === tab.id || active === "about");

        return (
          <button
            key={tab.id}
            onClick={() => handleClick(tab.id)}
            style={{
              background: "none",
              border: "none",
              padding: "14px 16px",
              fontSize: 14,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? "#2563eb" : "#374151",
              cursor: "pointer",
              borderBottom: isActive ? "2px solid #2563eb" : "2px solid transparent",
              marginBottom: -1,
              transition: "color 0.15s, border-color 0.15s",
              borderRadius: 0,
              outline: "none",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

Header.propTypes = {
  handleClick:  PropTypes.func,
  activePage:   PropTypes.string,
};

export default Header;
