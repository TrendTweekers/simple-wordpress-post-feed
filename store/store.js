import React, { createContext, useReducer } from "react";
import initialState from "./initialState";

/** Initial GLOBAL STORAGE */

export const Store = createContext({ data: initialState });

function reducer(data, action) {
  switch (action.type) {
    case "LOADING":
      return {
        ...data,
        disableSave: true,
        isLoading: action.payload,
      };
    case "SAVE_DB":
      return {
        ...data,
        disableSave: true,
        isLoading: false,
      };
    case "FETCH_DATA":
      return {
        ...data,
        disableSave: true,
        shop: action.payload.shop,
        version: action.payload.version,
        latestVersion: action.payload.latestVersion,
        clean: action.payload.clean,
        theme: action.payload.theme,
        disableUpdate: action.payload.latestVersion,
        chargeID: action.payload.chargeID,
        support: action.payload.support,
      };
    case "FETCH_METADATA":
      return {
        ...data,
        disableSave: true,
        settings: action.payload,
      };
    case "CHANGE_URL":
      return {
        ...data,
        disableSave: false,
        testedOK: false,
        settings: {
          ...data.settings,
          url: {
            ...data.settings.url,
            value: action.payload,
          },
        },
      };
    case "CHANGE_POST_NUMBER":
      return {
        ...data,
        disableSave: false,
        settings: {
          ...data.settings,
          postNumber: {
            ...data.settings.postNumber,
            value: action.payload,
          },
        },
      };
    case "HOSTED_ON_WP":
      return {
        ...data,
        disableSave: false,
        testedOK: false,
        settings: {
          ...data.settings,
          hostedOnWP: {
            ...data.settings.hostedOnWP,
            value: action.payload,
          },
        },
      };

    case "CHANGE_CATEGORY":
      return {
        ...data,
        disableSave: false,
        settings: {
          ...data.settings,
          category: {
            ...data.settings.category,
            value: action.payload,
          },
        },
      };
    case "CHANGE_TAGS":
      return {
        ...data,
        disableSave: false,
        settings: {
          ...data.settings,
          tags: {
            ...data.settings.tags,
            value: action.payload,
          },
        },
      };
    case "CHANGE_TAGS_EXCLUDE":
      return {
        ...data,
        disableSave: false,
        settings: {
          ...data.settings,
          tagsExclude: {
            ...data.settings.tagsExclude,
            value: action.payload,
          },
        },
      };
    case "CHANGE_SLUG":
      return {
        ...data,
        disableSave: false,
        settings: {
          ...data.settings,
          slug: {
            ...data.settings.slug,
            value: action.payload,
          },
        },
      };
    case "CHANGE_TARGET":
      return {
        ...data,
        disableSave: false,
        settings: {
          ...data.settings,
          target: {
            ...data.settings.target,
            value: action.payload,
          },
        },
      };
    case "TESTED":
      return {
        ...data,
        testedOK: action.payload,
      };
    default:
      return data;
  }
}

export function StoreProvider({ children }) {
  const [data, dispatch] = useReducer(reducer, initialState);
  const value = { data, dispatch };
  return <Store.Provider value={value}>{children}</Store.Provider>;
}
