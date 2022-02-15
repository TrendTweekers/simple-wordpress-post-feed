import config from "../../config/config";
import "isomorphic-unfetch";
import initialState from "../../../store/initialState";
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
    try {
      console.log(`metafield creation ${JSON.stringify(data)}`);
      fetch(`https://${shop}/admin/api/${API_VERSION}/metafields.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token,
        },
        body: JSON.stringify(data),
      })
        .then((response) => response.json())
        .then((data) => data.metafield)
        .catch((err) => console.log(err));
    } catch (err) {
      console.log(err);
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
      if(value !== ""){
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
          fetch(`https://${shop}/admin/api/${API_VERSION}/metafields.json`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": token,
            },
            body: JSON.stringify(data),
          })
            .then((response) => response.json())
            .then((data) => data.metafield)
            .catch((err) => console.log(err));
        } catch (err) {
          console.log(err);
        }
      }else{
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
      const response = await fetch(
        `https://${shop}/admin/api/${API_VERSION}/metafields/${metafieldID}.json`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": token,
          },
        }
      )
        .then((response) => response.json())
        .then((data) => data.metafield.value)
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
      const response = await fetch(
        `https://${shop}/admin/api/${API_VERSION}/metafields.json?namespace=swpf&fields=key,id,value,type`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": token,
          },
        }
      )
        .then((response) => response.json())
        .then((data) => {
          console.log(data.metafields);
          const objectVersion = data.metafields.reduce(
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
    console.log("update metafield");
    const updateData = {
      metafield: {
        id,
        value,
        type,
      },
    };
    try {
      const response = await fetch(
        `https://${shop}/admin/api/${API_VERSION}/metafields/${id}.json`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": token,
          },
          body: JSON.stringify(updateData),
        }
      )
        .then((response) => response.json())
        .then((data) => data.metafield)
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
      const response = await fetch(
        `https://${shop}/admin/api/${API_VERSION}/metafields/${metafieldID}.json`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": token,
          },
        }
      )
        .then((response) => response.json())
        .then((data) => data)
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