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
  const response = await axios({
    method: "post",
    url: `https://${shop}/admin/api/${API_VERSION}/metafields.json`,
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    data,
  })
    .then(({ data }) => data)
    .catch((err) => console.log(err));
  return response.metafield;
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
    })
      .then(
        ({
          data: {
            metafield: { value },
          },
        }) => value
      )
      .catch((err) => console.log(err));
    return response;
  } catch (err) {
    console.log(err);
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
    })
      .then(({ data: { metafields } }) => {
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
      })
      .catch((err) => console.log(err));
    return response;
  } catch (err) {
    console.log(err);
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
    })
      .then(({ data: { metafield } }) => metafield)
      .catch((err) => console.log(err));
    return response;
  } catch (err) {
    console.log(err);
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
    })
      .then(({ data }) => data)
      .catch((err) => console.log(err));
    return response;
  } catch (err) {
    console.log(err);
  }
};

module.exports.createMetafields = createMetafields;
module.exports.createMetafield = createMetafield;
module.exports.updateMetafield = updateMetafield;
module.exports.getMetafield = getMetafield;
module.exports.getMultipleMetafields = getMultipleMetafields;
module.exports.deleteMetafield = deleteMetafield;
