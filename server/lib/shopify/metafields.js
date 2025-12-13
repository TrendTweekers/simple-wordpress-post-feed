import config from "../../config/config";
import "isomorphic-unfetch";
import initialState from "../../../store/initialState";
import axios from "axios";
const initialSettings = initialState.settings;

const { API_VERSION } = config;

/** Create one Metafield
 * @param  {} shop
 * @param  {} token
 * @return {Object} response body
 */

const createMetafield = async (shop, token, key, value, type) => {
  console.log(`create one metafield`);
  const data = {
    metafield: {
      namespace: "swpf",
      key,
      value,
      type,
    },
  };
  console.log(`metafield creation ${JSON.stringify(data)}`);
  try {
    const response = await axios({
      method: "post",
      url: `https://${shop}/admin/api/${API_VERSION}/metafields.json`,
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      data,
    });
    return response.data.metafield;
  } catch (err) {
    // Re-throw 401/403 errors so they can be caught by route handlers
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
      throw err;
    }
    console.error(`Error creating metafield for ${shop}:`, err.message || err);
    throw err;
  }
};

/** Create Metafields separately for all settings based on initial settings
 * @param  {} shop
 * @param  {} token
 * @return {Object} response body
 */

const createMetafields = async (shop, token) => {
  console.log(`create metafields based on initial settings`);

  for (const property in initialSettings) {
    const { value, type } = initialSettings[property];
    if (value !== "") {
      const data = {
        metafield: {
          namespace: "swpf",
          key: property,
          value,
          type,
        },
      };
      try {
        console.log(`metafield creation ${JSON.stringify(data)}`);
        axios({
          method: "post",
          url: `https://${shop}/admin/api/${API_VERSION}/metafields.json`,
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": token,
          },
          data,
        })
          .then(({ data: { metafield } }) => metafield)
          .catch((err) => console.log(err));
      } catch (err) {
        console.log(err);
      }
    } else {
    }
  }
};

/** Retrieve/get one Metafield
 * @param  {} shop
 * @param  {} token
 * @param  {} metafielID
 * @return {Object} response body
 */

const getMetafield = async (shop, token, metafieldID) => {
  console.log("get metafield");
  try {
    const response = await axios({
      method: "get",
      url: `https://${shop}/admin/api/${API_VERSION}/metafields/${metafieldID}.json`,
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
    });
    return response.data.metafield.value;
  } catch (err) {
    // Re-throw 401/403 errors so they can be caught by route handlers
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
      throw err;
    }
    console.error(`Error getting metafield for ${shop}:`, err.message || err);
    throw err;
  }
};

/** Retrieve/get multiple Metafields
 * @param  {} shop
 * @param  {} token
 * @param  {} metafielID
 * @return {Object} nested objects {key:{id:number,value:json},key:{id:number,value:json}}
 */

const getMultipleMetafields = async (shop, token) => {
  console.log("get metafields");
  try {
    const response = await axios({
      method: "get",
      url: `https://${shop}/admin/api/${API_VERSION}/metafields.json`,
      params: {
        namespace: "swpf",
        fields: "id,value,key,type",
      },
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
    });
    const metafields = response.data.metafields;
    const objectVersion = metafields.reduce(
      (obj, item) => (
        (obj[item.key] = {
          value: item.value,
          id: item.id,
          type: item.type,
        }),
        obj
      ),
      {}
    );
    return objectVersion;
  } catch (err) {
    // Re-throw 401/403 errors so they can be caught by route handlers
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
      throw err;
    }
    console.error(`Error getting metafields for ${shop}:`, err.message || err);
    throw err;
  }
};

/** update Metafield
 * @param  {} shop
 * @param  {} token
 * @param  {} metafielID
 * @return {Object} response body
 */

const updateMetafield = async (shop, token, id, value, type) => {
  const updateData = {
    metafield: {
      id,
      value,
      type,
    },
  };
  try {
    const response = await axios({
      method: "put",
      url: `https://${shop}/admin/api/${API_VERSION}/metafields/${id}.json`,
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      data: updateData,
    });
    return response.data.metafield;
  } catch (err) {
    // Re-throw 401/403 errors so they can be caught by route handlers
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
      throw err;
    }
    console.error(`Error updating metafield for ${shop}:`, err.message || err);
    throw err;
  }
};

/** Delete Metafield
 * @param  {} shop
 * @param  {} token
 * @param  {} metafielID
 * @return {Object} response body
 */

const deleteMetafield = async (shop, token, metafieldID) => {
  console.log("delete metafield");

  try {
    const response = await axios({
      method: "delete",
      url: `https://${shop}/admin/api/${API_VERSION}/metafields/${metafieldID}.json`,
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
    });
    return response.data;
  } catch (err) {
    // Re-throw 401/403 errors so they can be caught by route handlers
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
      throw err;
    }
    console.error(`Error deleting metafield for ${shop}:`, err.message || err);
    throw err;
  }
};

module.exports.createMetafields = createMetafields;
module.exports.createMetafield = createMetafield;
module.exports.updateMetafield = updateMetafield;
module.exports.getMetafield = getMetafield;
module.exports.getMultipleMetafields = getMultipleMetafields;
module.exports.deleteMetafield = deleteMetafield;
