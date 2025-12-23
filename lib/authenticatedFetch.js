// lib/authenticatedFetch.js
import { getSessionTokenSafe } from "./shopify/sessionTokenClient";

function isSameOrigin(url) {
  try {
    const u = new URL(url, window.location.origin);
    return u.origin === window.location.origin;
  } catch {
    return true; // relative url
  }
}

function isApiCall(url) {
  try {
    const u = new URL(url, window.location.origin);
    return u.pathname.startsWith("/api/");
  } catch {
    return String(url).startsWith("/api/");
  }
}

export async function authenticatedFetch(url, options = {}) {
  // ✅ CRITICAL: authenticatedFetch() must only be called in the browser (App Bridge token required)
  if (typeof window === "undefined") {
    throw new Error("authenticatedFetch() must only be called in the browser (App Bridge token required).");
  }

  const opts = { ...options, headers: { ...(options.headers || {}) } };

  const shouldAttach =
    typeof window !== "undefined" &&
    isSameOrigin(url) &&
    isApiCall(url);

  if (!shouldAttach) {
    return fetch(url, opts);
  }

  const token1 = await getSessionTokenSafe();
  opts.headers["Authorization"] = `Bearer ${token1}`;
  opts.headers["Accept"] = opts.headers["Accept"] || "application/json";

  let res = await fetch(url, opts);

  // If token expired/missing/invalid, retry once with fresh token
  if (res.status === 401) {
    const token2 = await getSessionTokenSafe();
    const retryOpts = {
      ...opts,
      headers: { ...(opts.headers || {}), Authorization: `Bearer ${token2}` },
    };
    res = await fetch(url, retryOpts);
  }

  if (res.status === 401) {
    const body = await res.text().catch(() => "");
    throw new Error(`API 401 (missing/invalid session token). Body: ${body}`);
  }

  return res;
}
