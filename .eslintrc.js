module.exports = {
  extends: ["prettier",
    "plugin:shopify/react",'plugin:@next/next/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2018,
    requireConfigFile: false,
  },
  plugins: ["prettier", "chai-expect"],
  rules: {
    "import/no-unresolved": "off",
    "no-console": "off",
    "shopify/jsx-no-hardcoded-content": "off",
    "react/react-in-jsx-scope": "off",
  },
  parser: "@babel/eslint-parser",
  overrides: [{
    files: ["*.test.*"],
    rules: {
      "shopify/jsx-no-hardcoded-content": "off",
      "react/react-in-jsx-scope": "off",
      "jsx-a11y/anchor-is-valid": "off",
      
    },
  }],
  env: {
    browser: true,
    node: true,
  }
};