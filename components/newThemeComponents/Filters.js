import React, { useCallback } from "react";
import { TextField, FormLayout, Card } from "@shopify/polaris";
import { Store } from "../../store/store";
import * as types from "../../store/types";

const Filters = () => {
  const { data, dispatch } = React.useContext(Store);
  const { value: category } = data.settings.category;
  const { value: tags } = data.settings.tags;
  const { value: tagsExclude } = data.settings.tagsExclude;
  const { value: slug } = data.settings.slug;


  const handleCategory = useCallback((newValue) => {
    dispatch({
      type: types.CHANGE_CATEGORY,
      payload: newValue,
    });
  }, []);

  const handleTags = useCallback((newValue) => {
    dispatch({
      type: types.CHANGE_TAGS,
      payload: newValue,
    });
  }, []);

  const handleTagsExclude = useCallback((newValue) => {
    dispatch({
      type: types.CHANGE_TAGS_EXCLUDE,
      payload: newValue,
    });
  }, []);

  const handleSlug = useCallback((newValue) => {
    dispatch({
      type: types.CHANGE_SLUG,
      payload: newValue,
    });
  }, []);



  return (
    <Card sectioned title="Filters">
      <FormLayout>
        <TextField
          label="Categories"
          value={category}
          onChange={handleCategory}
          autoComplete="off"
          placeholder="12,121,15"
        />
        <TextField
          label="Tags"
          value={tags}
          onChange={handleTags}
          autoComplete="off"
          placeholder="12,121,15"
        />
        <TextField
          label="Tags to exclude"
          value={tagsExclude}
          onChange={handleTagsExclude}
          autoComplete="off"
          placeholder="12,121,15"
        />
        <TextField
          label="Slugs"
          value={slug}
          onChange={handleSlug}
          autoComplete="off"
          placeholder="cars,trees"
        />
      </FormLayout>
    </Card>
  );
};

export default Filters;
