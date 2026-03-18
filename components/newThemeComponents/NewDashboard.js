/* eslint-disable shopify/jsx-no-hardcoded-content */
/* eslint-disable react/prop-types */
import {
  Frame,
  Page,
  ContextualSaveBar,
  Card,
  Button,
  Layout,
  Badge,
  Banner,
} from "@shopify/polaris";
import React, { useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import * as types from "../../store/types";
import { Store } from "../../store/store";
import UrlInput from "./UrlInput";
import BasicSetings from "./BasicSettings";
import Filters from "./Filters";
import ShowExcerpt from "./ShowExcerpt";
import { manualTokenFetch } from "../../lib/manualTokenFetch";
import { getSessionToken } from "@shopify/app-bridge-utils";

/* ─── Single setup step ─────────────────────────────────── */
const Step = ({ number, title, description, status, action }) => {
  const palette = {
    complete: { bg: "#f0fdf4", border: "#86efac", dotBg: "#22c55e", badgeStatus: "success" },
    active:   { bg: "#eff6ff", border: "#93c5fd", dotBg: "#3b82f6", badgeStatus: "info" },
    pending:  { bg: "#f9fafb", border: "#e5e7eb", dotBg: "#d1d5db", badgeStatus: "subdued" },
  };
  const p = palette[status] || palette.pending;

  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 16,
      padding: "14px 18px",
      borderRadius: 10,
      background: p.bg,
      border: `1px solid ${p.border}`,
      marginBottom: 10,
    }}>
      {/* Step number dot */}
      <div style={{
        minWidth: 30,
        height: 30,
        borderRadius: "50%",
        background: p.dotBg,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: 13,
        flexShrink: 0,
        marginTop: 1,
      }}>
        {status === "complete" ? "✓" : number}
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{title}</span>
          <Badge status={p.badgeStatus}>
            {status === "complete" ? "Done" : status === "active" ? "Next step" : "Pending"}
          </Badge>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#6b7280", lineHeight: "1.5" }}>{description}</p>
        {action && status !== "complete" && (
          <div style={{ marginTop: 10 }}>{action}</div>
        )}
      </div>
    </div>
  );
};

/* ─── Main dashboard ────────────────────────────────────── */
const Dashboard = ({ getSettings }) => {
  const { data, dispatch } = React.useContext(Store);
  const app = useAppBridge();
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const { shop: shopFromState, disableSave, settings, testedOK } = data;

  const urlParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const shop = shopFromState || urlParams.get("shop") || "";
  const urlValue = settings?.url?.value || "";

  /* ── Save ───────────────────────────────────────────── */
  const handleSubmit = async () => {
    try {
      // ✅ v3 PATTERN: getSessionToken(app) → manualTokenFetch(url, token, options)
      const token = await getSessionToken(app);
      if (!token) { console.error("[Dashboard] No session token — cannot save"); return; }
      const response = await manualTokenFetch("/api/data", token, {
        method: "POST",
        body: JSON.stringify({ settings }),
      });
      if (!response || !response.ok) {
        console.error("[Dashboard] Save failed:", response?.status);
        return;
      }
      const rd = await response.json();
      if (rd) {
        dispatch({ type: types.FETCH_METADATA, payload: rd });
        dispatch({ type: types.SAVE_DB });
      }
    } catch (err) {
      console.error("[Dashboard] Save error:", err.message);
    }
  };

  /* ── Delete all ─────────────────────────────────────── */
  const handleDeleteAllMeta = async () => {
    try {
      // ✅ v3 PATTERN: getSessionToken(app) → manualTokenFetch(url, token, options)
      const token = await getSessionToken(app);
      if (!token) { console.error("[Dashboard] No session token — cannot delete"); return; }
      const response = await manualTokenFetch("/api/deletedata", token, {
        method: "POST",
        body: JSON.stringify({ settings }),
      });
      if (!response || !response.ok) return;
      const rd = await response.json();
      if (rd) dispatch({ type: types.RESET_DATA });
      setDeleteConfirm(false);
    } catch (err) {
      console.error("[Dashboard] Delete error:", err.message);
    }
  };

  /* ── Open theme editor ──────────────────────────────── */
  const openThemeEditor = () => {
    const s = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : ""
    ).get("shop") || shop;
    if (s) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("wpfeed_theme_opened", "1");
      }
      window.open(`https://${s}/admin/themes/current/editor?context=apps`, "_blank");
    }
  };

  /* ── Step statuses ──────────────────────────────────── */
  const billingActive = true; // reached dashboard → billing passed
  const themeOpened =
    typeof window !== "undefined" &&
    window.localStorage.getItem("wpfeed_theme_opened") === "1";
  const urlSet = !!urlValue && testedOK;
  const feedVerified = testedOK;

  // First incomplete step
  const activeStep = !billingActive ? 1
    : !themeOpened    ? 2
    : !urlSet         ? 3
    : !feedVerified   ? 4
    : null;

  const allDone = activeStep === null;

  const stepStatus = (n) =>
    n < (activeStep ?? 99)     ? "complete"
    : n === (activeStep ?? 99) ? "active"
    : "pending";

  const SaveBar = disableSave ? null : (
    <ContextualSaveBar
      fullWidth
      message="Unsaved changes"
      saveAction={{ onAction: handleSubmit, disabled: !testedOK }}
      discardAction={{ onAction: () => getSettings() }}
    />
  );

  return (
    <Frame>
      {SaveBar}
      <Page>

        {/* ── Page header ──────────────────────────────── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: "1px solid #e5e7eb",
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>
              WP Simple Feed
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
              Display your WordPress blog posts in your Shopify store
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <Button primary disabled={!testedOK} onClick={openThemeEditor}>
              Open theme editor ↗
            </Button>
            {!testedOK && (
              <span style={{ fontSize: 11, color: "#9ca3af" }}>
                Save a valid WordPress URL to unlock
              </span>
            )}
          </div>
        </div>

        {/* ── Setup checklist ──────────────────────────── */}
        <Card sectioned>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600, color: "#111827" }}>
              Setup checklist
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
              Follow these steps to start showing your WordPress posts.
            </p>
          </div>

          <Step
            number={1}
            title="Activate billing"
            description="Your plan is active — you have full access."
            status={stepStatus(1)}
          />

          <Step
            number={2}
            title="Add app block to your theme"
            description={
              themeOpened
                ? 'You opened the theme editor. Add the "WP Post Feed" block to a page section and click Save.'
                : "Open the theme editor and add the WP Simple Feed app block to any section of your storefront."
            }
            status={stepStatus(2)}
            action={
              <Button size="slim" onClick={openThemeEditor}>
                Open theme editor ↗
              </Button>
            }
          />

          <Step
            number={3}
            title="Enter your WordPress site URL"
            description={
              urlSet
                ? `Connected: ${urlValue}`
                : "Enter your WordPress URL in the Configuration section below. We test it automatically."
            }
            status={stepStatus(3)}
          />

          <Step
            number={4}
            title="Verify your feed is live"
            description={
              feedVerified
                ? "Your WordPress posts are being pulled in successfully."
                : "Once your URL is saved and the block is in your theme, your feed will go live automatically."
            }
            status={stepStatus(4)}
          />

          {allDone && (
            <div style={{
              marginTop: 14,
              padding: "12px 16px",
              background: "#f0fdf4",
              border: "1px solid #86efac",
              borderRadius: 8,
              fontSize: 14,
              color: "#166534",
              fontWeight: 500,
            }}>
              🎉 All steps complete — your feed is live!
            </div>
          )}
        </Card>

        {/* ── Configuration ────────────────────────────── */}
        <div style={{ marginTop: 24 }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600, color: "#111827" }}>
            Configuration
          </h2>

          <UrlInput />

          <div style={{ height: 14 }} />

          <Layout>
            <Layout.Section oneThird>
              <BasicSetings />
            </Layout.Section>
            <Layout.Section oneThird>
              <Filters />
            </Layout.Section>
            <Layout.Section oneThird>
              <ShowExcerpt />
            </Layout.Section>
          </Layout>
        </div>

        {/* ── Need help ────────────────────────────────── */}
        <div style={{ marginTop: 24 }}>
          <Card sectioned>
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}>
              <div>
                <h3 style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 600, color: "#111827" }}>
                  Need help?
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                  Full documentation, troubleshooting guides, and contact support.
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Button
                  plain
                  external
                  url="https://apps.shopify.com/simple-wordpress-post-feed#reviews"
                >
                  Leave a review ⭐
                </Button>
                <Button
                  external
                  url={`mailto:admin@stackedboost.com?subject=WP Simple Feed Help`}
                >
                  Contact support
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Danger zone ──────────────────────────────── */}
        <div style={{
          marginTop: 28,
          paddingTop: 20,
          borderTop: "1px solid #e5e7eb",
        }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#374151" }}>
            Danger zone
          </h3>
          {!deleteConfirm ? (
            <Button destructive outline onClick={() => setDeleteConfirm(true)}>
              Delete all saved settings
            </Button>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "#ef4444" }}>
                This will remove all configuration. Cannot be undone.
              </span>
              <Button destructive onClick={handleDeleteAllMeta}>Yes, delete everything</Button>
              <Button onClick={() => setDeleteConfirm(false)}>Cancel</Button>
            </div>
          )}
        </div>

        <div style={{ height: 48 }} />
      </Page>
    </Frame>
  );
};

export default Dashboard;
