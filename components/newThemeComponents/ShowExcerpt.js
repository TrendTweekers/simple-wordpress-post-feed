import React, { useCallback } from "react";
import { Store } from "../../store/store";
import * as types from "../../store/types";
import {
  Card,
  RangeSlider,
  Checkbox,
  TextField,
  Collapsible,
  TextContainer,
  Stack,
} from "@shopify/polaris";

const ShowExcerpt = () => {
  const { data, dispatch } = React.useContext(Store);
  const { value: showExcerpt } = data.settings.showExcerpt;
  const { value: clickableArticle } = data.settings.clickableArticle;
  const { value: showButton } = data.settings.showButton;
  const { value: buttonText } = data.settings.buttonText;

  const handleShowExcerpt = useCallback((newValue) => {
    dispatch({
      type: types.CHANGE_SHOWEXCERPT,
      payload: newValue,
    });
  }, []);

  const handleClickableArticle = useCallback((newValue) => {
    dispatch({
      type: types.CHANGE_CLICKABLE,
      payload: newValue,
    });
  }, []);

  const handleShowButton = useCallback((newValue) => {
    dispatch({
      type: types.CHANGE_SHOWBUTTON,
      payload: newValue,
    });
  }, []);

  const handleButtonText = useCallback((newValue) => {
    dispatch({
      type: types.CHANGE_BUTTONTEXT,
      payload: newValue,
    });
  }, []);

  return (
    <Card sectioned title="Showing excerpt">
        <Checkbox
          label="Showing excerpt?"
          checked={showExcerpt}
          onChange={handleShowExcerpt}
        />
        <Collapsible
          open={showExcerpt}
          id="basic-collapsible"
          transition={{ duration: "500ms", timingFunction: "ease-in-out" }}
          expandOnPrint
        >
          <Stack vertical>
            <Checkbox
              label="Clickable article?"
              checked={clickableArticle}
              onChange={handleClickableArticle}
            />
            <Checkbox
              label="Show button?"
              checked={showButton}
              onChange={handleShowButton}
            />
            <Collapsible open={showButton}>
              <TextField
                label="Button text"
                value={buttonText}
                onChange={handleButtonText}
                autoComplete="off"
                placeholder=""
              />
            </Collapsible>
          </Stack>
        </Collapsible>
    </Card>
  );
};

export default ShowExcerpt;
