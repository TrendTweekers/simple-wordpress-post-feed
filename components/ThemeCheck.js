/* eslint-disable react/prop-types */
import React from 'react';
import {
    Stack,
    Card,
    TextContainer,
    Icon,
    TextStyle,
  } from "@shopify/polaris";
import {RiskMinor, CircleTickOutlineMinor} from "@shopify/polaris-icons";

const ThemeCheck = ({data}) => {
  const {theme,
    supportsAppBlocks,
    supportsSe} = data.support;
  console.log(data);

  const GettingStartedStep = ({title, description, completed}) => {
    const source = completed ? CircleTickOutlineMinor : RiskMinor;
    const color = completed ? "success" : "critical";

    return (
      <Stack vertical spacing="tight">
        <Stack>
          <Icon color={color} source={source} />
          <TextStyle variation="strong">{title}</TextStyle>
        </Stack>
        {description && <div>{description}</div>}
      </Stack>
    );
  };

  const AppBlockSetupLayout = () => {
    return (

      <Card>
        {/* <Card.Section>
          <Stack vertical>
            <GettingStartedStep
              title="Average Review Score"
            />
            <GettingStartedStep
              title="Product Reviews"
            />
          </Stack>
        </Card.Section> */}
        <Card.Section>
          {supportsAppBlocks && supportsSe && (
            <p>
              Edit the product page for theme (
              <TextStyle variation="strong">{theme.name}</TextStyle>) in the Theme section editor
              to add or update app blocks.
            </p>
                    )}
          {(!supportsAppBlocks || !supportsSe) && (
            <p>Setup is only possible with supported themes.</p>
                    )}
        </Card.Section>
      </Card>
    );
  };

  const CurrentThemeLayout = () => {
    const appBlocksUnsupportedDescription = (
      <p>
        Currently published theme&apos;s{" "}
        <TextStyle variation="strong">main-product</TextStyle> section (
        <TextStyle variation="strong">{theme.name}</TextStyle>) does not support
        app blocks.
      </p>
    );

    const sectionsEverywhereUnsupportedDescription = (
      <p>
        Currently published theme (
        <TextStyle variation="strong">{theme.name}</TextStyle>) does not support
        Sections Everywhere.
      </p>
    );

    return (
      <Card>
        <Card.Section>
          <Stack vertical>
            <GettingStartedStep
              title="Sections Everywhere support"
              completed={supportsSe}
              description={
                !supportsSe && sectionsEverywhereUnsupportedDescription
              }
            />
            <GettingStartedStep
              title="App block support"
              completed={supportsAppBlocks}
              description={
                !supportsAppBlocks && appBlocksUnsupportedDescription
              }
            />
          </Stack>
        </Card.Section>
        <Card.Section>
          {supportsAppBlocks && supportsSe && (
          <p>Your theme fully supports app blocks </p>
            )}
          {(!supportsAppBlocks || !supportsSe) && (
          <TextContainer>
            <p>
              It looks like your theme does not fully support the
              functionality of this app.
            </p>
            <p>
              Try switching to a different theme or contacting your theme
              developer to request support.
            </p>
          </TextContainer>
            )}
        </Card.Section>
      </Card>
    );
  };


  return (
    <>
      <CurrentThemeLayout
        theme={theme}
        supportsAppBlocks={supportsAppBlocks}
        supportsSe={supportsSe}
      />
      <AppBlockSetupLayout
        theme={theme}
        supportsAppBlocks={supportsAppBlocks}
        supportsSe={supportsSe}
      />
    </>
  );
};

export default ThemeCheck;
