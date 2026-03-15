/**
 * backfill-shop-data.js
 *
 * One-time admin script: iterate every installed shop in Firestore,
 * query Shopify Admin GraphQL for shop identity fields, and write
 * the result back into each shop's document.
 *
 * Usage:
 *   FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}' \
 *   node scripts/backfill-shop-data.js
 *
 * Optional env vars (same as the main app):
 *   SHOPIFY_API_VERSION  – defaults to 2024-10
 *   DRY_RUN=true         – print what would be written without writing
 */

'use strict';

const https = require('https');
const admin = require('firebase-admin');

// ── Config ────────────────────────────────────────────────────────────────────

const APP_COLLECTION  = 'swpf';
const API_VERSION     = process.env.SHOPIFY_API_VERSION || '2024-10';
const DRY_RUN         = process.env.DRY_RUN === 'true';
const DELAY_MS        = 300; // ms between shops — stay well under burst limits

const GQL_QUERY = `{
  shop {
    myshopifyDomain
    name
    shopOwnerName
    email
    contactEmail
  }
}`;

// ── Firebase init ─────────────────────────────────────────────────────────────

function initFirebase() {
  if (admin.apps.length) return admin.firestore();

  const keyRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!keyRaw) {
    console.error('[FATAL] FIREBASE_SERVICE_ACCOUNT_KEY env var is not set.');
    process.exit(1);
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(keyRaw);
  } catch (e) {
    console.error('[FATAL] Could not parse FIREBASE_SERVICE_ACCOUNT_KEY as JSON:', e.message);
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id || 'pluginmaker',
  });

  const db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });
  return db;
}

// ── Shopify GraphQL helper ────────────────────────────────────────────────────

function shopifyGraphQL(shop, accessToken, query) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query });
    const options = {
      hostname: shop,
      path: `/admin/api/${API_VERSION}/graphql.json`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'X-Shopify-Access-Token': accessToken,
      },
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 200)}`));
        }
        try {
          resolve(JSON.parse(raw));
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy(new Error('Request timed out after 10s'));
    });
    req.write(body);
    req.end();
  });
}

// ── Delay helper ──────────────────────────────────────────────────────────────

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60));
  console.log('  Simple WordPress Post Feed — shop data backfill');
  console.log(`  API version : ${API_VERSION}`);
  console.log(`  Collection  : ${APP_COLLECTION}`);
  console.log(`  Dry run     : ${DRY_RUN}`);
  console.log('='.repeat(60));

  const db = initFirebase();

  // 1. Load every document in the collection
  console.log('\n[1/4] Loading all Firestore documents…');
  const snapshot = await db.collection(APP_COLLECTION).get();
  console.log(`      Found ${snapshot.size} documents total.`);

  // 2. Filter for offline session docs (id = "offline_{shop}")
  const sessions = [];
  snapshot.forEach((doc) => {
    const id = doc.id;
    if (id.startsWith('offline_')) {
      const data = doc.data();
      const shop = data.shop || id.replace(/^offline_/, '');
      const accessToken = data.accessToken || data.token;
      sessions.push({ shop, accessToken, sessionId: id });
    }
  });

  console.log(`\n[2/4] Found ${sessions.size || sessions.length} offline session(s).`);

  if (sessions.length === 0) {
    console.log('      Nothing to do. Exiting.');
    process.exit(0);
  }

  // 3. Query Shopify + write back for each shop
  console.log('\n[3/4] Processing shops…\n');

  let ok = 0, skipped = 0, failed = 0;

  for (const { shop, accessToken, sessionId } of sessions) {
    process.stdout.write(`  → ${shop} … `);

    // Skip shops without a token
    if (!accessToken) {
      console.log('SKIP (no access token)');
      skipped++;
      continue;
    }

    try {
      const result = await shopifyGraphQL(shop, accessToken, GQL_QUERY);

      if (result.errors) {
        const msg = result.errors.map((e) => e.message).join('; ');
        console.log(`FAIL (GraphQL errors: ${msg})`);
        failed++;
        await delay(DELAY_MS);
        continue;
      }

      const shopData = result?.data?.shop;
      if (!shopData) {
        console.log('FAIL (no data.shop in response)');
        failed++;
        await delay(DELAY_MS);
        continue;
      }

      const payload = {
        shopInfo: {
          myshopifyDomain : shopData.myshopifyDomain,
          name            : shopData.name,
          shopOwnerName   : shopData.shopOwnerName,
          email           : shopData.email,
          contactEmail    : shopData.contactEmail,
          fetchedAt       : new Date().toISOString(),
        },
      };

      if (DRY_RUN) {
        console.log(`DRY RUN — would write: ${JSON.stringify(payload.shopInfo)}`);
      } else {
        // Write into the shop document (same collection, doc ID = shop domain)
        await db
          .collection(APP_COLLECTION)
          .doc(shop)
          .set(payload, { merge: true });
        console.log(`OK (${shopData.name})`);
      }

      ok++;
    } catch (err) {
      console.log(`FAIL (${err.message})`);
      failed++;
    }

    await delay(DELAY_MS);
  }

  // 4. Summary
  console.log('\n' + '='.repeat(60));
  console.log('[4/4] Done.');
  console.log(`      OK      : ${ok}`);
  console.log(`      Skipped : ${skipped}`);
  console.log(`      Failed  : ${failed}`);
  console.log('='.repeat(60) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('\n[FATAL] Unhandled error:', err.message || err);
  process.exit(1);
});
