#!/usr/bin/env node

/**
 * Test Script for OAuth Scope Fix
 * 
 * Usage:
 *   node test-oauth-fix.js https://your-app.railway.app japexstore.myshopify.com
 * 
 * This script tests:
 * 1. The /check-scopes endpoint works
 * 2. The current scopes for a shop
 * 3. If re-auth is needed
 */

const https = require('https');
const http = require('http');

const APP_URL = process.argv[2] || 'https://simple-wordpress-post-feed-production.up.railway.app';
const SHOP = process.argv[3] || 'japexstore.myshopify.com';

console.log('='.repeat(60));
console.log('OAuth Scope Fix Test Script');
console.log('='.repeat(60));
console.log(`App URL: ${APP_URL}`);
console.log(`Shop: ${SHOP}`);
console.log('='.repeat(60));
console.log('');

// Helper function to make HTTP/HTTPS requests
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, {
      headers: {
        'User-Agent': 'OAuthTestScript/1.0'
      }
    }, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
            parseError: e.message
          });
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function runTests() {
  try {
    // Test 1: Check if /check-scopes endpoint exists
    console.log('Test 1: Checking /check-scopes endpoint...');
    const checkUrl = `${APP_URL}/check-scopes?shop=${SHOP}`;
    console.log(`URL: ${checkUrl}`);
    console.log('');
    
    const response = await makeRequest(checkUrl);
    
    if (response.statusCode === 200) {
      console.log('✅ /check-scopes endpoint is working');
      console.log('');
      
      console.log('Response Data:');
      console.log(JSON.stringify(response.data, null, 2));
      console.log('');
      
      // Analyze the response
      if (response.data.needsReauth) {
        console.log('⚠️  WARNING: Shop needs re-authentication!');
        console.log(`   Current scopes: ${response.data.currentScopes || 'none'}`);
        console.log(`   Missing scopes: ${response.data.missingScopes?.join(', ') || 'none'}`);
        console.log(`   Reason: ${response.data.reason}`);
        console.log('');
        console.log('📌 Next Steps:');
        console.log(`   1. Send this link to the merchant:`);
        console.log(`      ${APP_URL}/force-reauth?shop=${SHOP}`);
        console.log('');
        console.log(`   2. Or access it yourself:`);
        console.log(`      ${APP_URL}/force-reauth?shop=${SHOP}`);
        console.log('');
        console.log('   3. Click "Update/Approve" on the Shopify permission screen');
        console.log('');
      } else {
        console.log('✅ Shop has all required scopes!');
        console.log(`   Current scopes: ${response.data.currentScopes}`);
        console.log('');
        console.log('🎉 No re-authentication needed. The app should work properly.');
        console.log('');
      }
      
    } else if (response.statusCode === 404) {
      console.log('❌ /check-scopes endpoint not found (404)');
      console.log('');
      console.log('This means the OAuth fix has NOT been deployed yet.');
      console.log('');
      console.log('📌 Action needed:');
      console.log('   1. Add oauth-helpers.js to server/lib/');
      console.log('   2. Add the /check-scopes route to your server');
      console.log('   3. Deploy to Railway');
      console.log('   4. Run this test again');
      console.log('');
    } else {
      console.log(`⚠️  Unexpected status code: ${response.statusCode}`);
      console.log('Response:', response.data);
      console.log('');
    }
    
    // Test 2: Generate force-reauth link
    console.log('='.repeat(60));
    console.log('Test 2: Force Re-auth Link');
    console.log('='.repeat(60));
    const forceReauthUrl = `${APP_URL}/force-reauth?shop=${SHOP}`;
    console.log(`Force Re-auth URL: ${forceReauthUrl}`);
    console.log('');
    console.log('Copy this URL and send it to the merchant, or open it yourself.');
    console.log('It will delete the old session and redirect to OAuth with proper scopes.');
    console.log('');
    
    // Test 3: Check expected scopes
    console.log('='.repeat(60));
    console.log('Test 3: Expected Configuration');
    console.log('='.repeat(60));
    console.log('Expected environment variables:');
    console.log('  SCOPES=write_themes,read_themes,read_script_tags,write_script_tags');
    console.log('');
    console.log('Make sure Railway has these env vars set correctly.');
    console.log('');
    
  } catch (error) {
    console.error('❌ Test failed with error:');
    console.error(error.message);
    console.error('');
    console.error('Stack trace:');
    console.error(error.stack);
    console.error('');
    console.error('Possible issues:');
    console.error('  - App is not running or not deployed');
    console.error('  - Network connection issue');
    console.error('  - Invalid URL provided');
    console.error('');
  }
}

// Run the tests
console.log('Starting tests...');
console.log('');
runTests().then(() => {
  console.log('='.repeat(60));
  console.log('Tests completed!');
  console.log('='.repeat(60));
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
