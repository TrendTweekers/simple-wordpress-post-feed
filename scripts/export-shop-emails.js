/**
 * export-shop-emails.js
 *
 * Exports installed shops from Firestore to a CSV file.
 *
 * Usage:
 *   FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}' \
 *   node scripts/export-shop-emails.js
 *
 * Optional env vars:
 *   OUTPUT_FILE   – path for the CSV (default: scripts/shops-export.csv)
 */

'use strict';

const fs    = require('fs');
const path  = require('path');
const admin = require('firebase-admin');

// ── Config ────────────────────────────────────────────────────────────────────

const APP_COLLECTION = 'swpf';
const OUTPUT_FILE    = process.env.OUTPUT_FILE
  || path.join(__dirname, 'shops-export.csv');

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

// ── CSV helpers ───────────────────────────────────────────────────────────────

const CSV_COLUMNS = [
  'shopDocId',
  'myshopifyDomain',
  'name',
  'email',
  'contactEmail',
  'shopOwnerName',
  'savedWordPressUrl',
  'hasSavedUrl',
  'fetchedAt',
];

/** Escape a single CSV cell value */
function csvCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Wrap in quotes if it contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function csvRow(values) {
  return values.map(csvCell).join(',');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60));
  console.log('  Simple WordPress Post Feed — shop CSV export');
  console.log(`  Collection : ${APP_COLLECTION}`);
  console.log(`  Output     : ${OUTPUT_FILE}`);
  console.log('='.repeat(60));

  const db = initFirebase();

  // 1. Load every document in the collection
  console.log('\n[1/3] Loading Firestore documents…');
  const snapshot = await db.collection(APP_COLLECTION).get();
  console.log(`      Found ${snapshot.size} total documents.`);

  // 2. Index all docs by ID so we can cross-reference shop docs
  const allDocs = {};
  snapshot.forEach((doc) => {
    allDocs[doc.id] = doc.data();
  });

  // 3. Filter to offline session docs — these represent installed shops
  const offlineDocs = Object.entries(allDocs).filter(([id]) =>
    id.startsWith('offline_')
  );
  console.log(`      Found ${offlineDocs.length} installed shop(s) (offline_* docs).`);

  if (offlineDocs.length === 0) {
    console.log('\n      Nothing to export. Exiting.');
    process.exit(0);
  }

  // 4. Build CSV rows
  console.log('\n[2/3] Building rows…');

  const rows = [];

  for (const [sessionId, sessionData] of offlineDocs) {
    const shop = sessionData.shop || sessionId.replace(/^offline_/, '');

    // shopInfo is written by the backfill script
    const shopInfo = allDocs[shop]?.shopInfo || {};

    // WordPress URL is stored in the shop document as a metafield-style object
    // The backfill writes to swpf/{shop}; metafields are also stored there
    // url metafield: allDocs[shop]?.url?.value  (how uploadData/getMultipleMetafields stores it)
    const shopDoc         = allDocs[shop] || {};
    const savedWordPressUrl = shopDoc.url?.value || shopDoc.url || '';
    const hasSavedUrl       = Boolean(savedWordPressUrl && String(savedWordPressUrl).trim() !== '');

    rows.push({
      shopDocId         : shop,
      myshopifyDomain   : shopInfo.myshopifyDomain   || shop,
      name              : shopInfo.name              || '',
      email             : shopInfo.email             || '',
      contactEmail      : shopInfo.contactEmail      || '',
      shopOwnerName     : shopInfo.shopOwnerName     || '',
      savedWordPressUrl : savedWordPressUrl,
      hasSavedUrl       : hasSavedUrl,
      fetchedAt         : shopInfo.fetchedAt         || '',
    });

    console.log(`  → ${shop} | url: ${savedWordPressUrl || '(none)'} | shopInfo: ${shopInfo.name ? 'yes' : 'missing — run backfill first'}`);
  }

  // 5. Write CSV
  console.log(`\n[3/3] Writing CSV to ${OUTPUT_FILE}…`);

  const lines = [
    csvRow(CSV_COLUMNS),
    ...rows.map((r) => csvRow(CSV_COLUMNS.map((col) => r[col]))),
  ];

  fs.writeFileSync(OUTPUT_FILE, lines.join('\n') + '\n', 'utf8');

  console.log(`      Written ${rows.length} row(s).\n`);
  console.log('='.repeat(60));
  console.log(`  Done. Open: ${OUTPUT_FILE}`);
  console.log('='.repeat(60) + '\n');
}

main().catch((err) => {
  console.error('\n[FATAL] Unhandled error:', err.message || err);
  process.exit(1);
});
