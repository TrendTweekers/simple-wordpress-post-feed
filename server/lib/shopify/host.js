// server/lib/shopify/host.js
function ensureHost(shop, host) {
  if (host) return host;
  if (!shop) return null;

  // Shopify embedded "host" is base64("<shop>/admin")
  return Buffer.from(`${shop}/admin`, "utf8").toString("base64");
}

module.exports = { ensureHost };

