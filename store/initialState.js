// Initial GLOBAL STORAGE
// stores intial values used in our application
// We are using this for the initial metafield creation as well. settings embedded object

const initialState = {
  disableSave: true,
  isLoading: true,
  shop: "",
  numberOfPosts: 6,
  version: "",
  latestVersion: "",
  clean: false,
  theme: "",
  disableUpdate: false,
  longTrial: false,
  chargeID: "",
  support: false,
  settings: {
    hostedOnWP: {
      id: "",
      value: true,
      type: "boolean",
    },
    postNumber: {
      id: "",
      value: 3,
      type: "number_integer",
    },
    url: {
      id: "",
      value: "",
      type: "single_line_text_field",
    },
    category: {
      id: "",
      value: "",
      type: "single_line_text_field",
    },
    tags: {
      id: "",
      value: "",
      type: "single_line_text_field",
    },
    tagsExclude: {
      id: "",
      value: "",
      type: "single_line_text_field",
    },
    slug: {
      id: "",
      value: "",
      type: "single_line_text_field",
    },
    target: {
      id: "",
      value: false,
      type: "boolean",
    },
  },
  tested: false,
  testedOK: false,
};

export default initialState;
