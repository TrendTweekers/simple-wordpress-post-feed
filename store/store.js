import React, { createContext, useReducer } from "react";
import initialState from "./initialState";
import * as types from "./types";

/** Initial GLOBAL STORAGE */

export const Store = createContext({ data: initialState });

function reducer(data, action) {
  switch (action.type) {
    case types.LOADING:
      return {
        ...data,
        disableSave: true,
        isLoading: action.payload,
      };
    case types.SAVE_DB:
      return {
        ...data,
        disableSave: true,
        isLoading: false,
      };
    case types.FETCH_DATA:
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
    case types.FETCH_METADATA:
      return {
        ...data,
        disableSave: true,
        settings: {
          ...data.settings,
          ...action.payload
        },
      };
    case types.CHANGE_URL:
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
    case types.CHANGE_POST_NUMBER:
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
    case types.HOSTED_ON_WP:
      return {
        ...data,
        disableSave: false,
        tested: false,
        testedOK: false,
        settings: {
          ...data.settings,
          hostedOnWP: {
            ...data.settings.hostedOnWP,
            value: action.payload,
          },
        },
      };

    case types.CHANGE_CATEGORY:
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
    case types.CHANGE_TAGS:
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
    case types.CHANGE_TAGS_EXCLUDE:
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
    case types.CHANGE_SLUG:
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
    case types.CHANGE_TARGET:
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
    case types.CHANGE_SECTIONTITLE:
      return {
        ...data,
        disableSave: false,
        settings: {
          ...data.settings,
          sectionTitle: {
            ...data.settings.sectionTitle,
            value: action.payload,
          },
        },
      };
    case types.CHANGE_SECTIONSUBTITLE:
      return {
        ...data,
        disableSave: false,
        settings: {
          ...data.settings,
          sectionSubtitle: {
            ...data.settings.sectionSubtitle,
            value: action.payload,
          },
        },
      };
    case types.CHANGE_SHOWEXCERPT:
      return {
        ...data,
        disableSave: false,
        settings: {
          ...data.settings,
          showExcerpt: {
            ...data.settings.showExcerpt,
            value: action.payload,
          },
        },
      };
    case types.CHANGE_CLICKABLE:
      return {
        ...data,
        disableSave: false,
        settings: {
          ...data.settings,
          clickableArticle: {
            ...data.settings.clickableArticle,
            value: action.payload,
          },
        },
      };
    case types.CHANGE_SHOWBUTTON:
      return {
        ...data,
        disableSave: false,
        settings: {
          ...data.settings,
          showButton: {
            ...data.settings.showButton,
            value: action.payload,
          },
        },
      };
    case types.CHANGE_BUTTONTEXT:
      return {
        ...data,
        disableSave: false,
        settings: {
          ...data.settings,
          buttonText: {
            ...data.settings.buttonText,
            value: action.payload,
          },
        },
      };
    case types.TESTEDOK:
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
