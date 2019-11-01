module.exports = {
  extends: [
    "plugin:shopify/react",
    "plugin:shopify/polaris",
    "plugin:shopify/jest",
    "plugin:shopify/webpack"
  ],
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
        "react/react-in-jsx-scope": "off"
      }
    }
  ],
  env: {
    browser: true,
    node: true
  }
};
