module.exports = {
  extends: ["prettier"],
  plugins: ["prettier", "chai-expect"],
  rules: {
    "import/no-unresolved": "off",
    "no-console": "off",
    "shopify/jsx-no-hardcoded-content": "off",
    "react/react-in-jsx-scope": "off"
  },
  parser: "babel-eslint",
  overrides: [
    {
      files: ["*.test.*"],
      rules: {
        "shopify/jsx-no-hardcoded-content": "off",
        "react/react-in-jsx-scope": "off",
        "jsx-a11y/anchor-is-valid": "off"
      }
    }
  ],
  env: {
    browser: true,
    node: true
  }
};
