import Document, {Html, Head, Main, NextScript} from "next/document";
import { SHOPIFY_API_KEY } from "../server/config/config";

class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);
    return {...initialProps};
  }

  render() {
    // ✅ CRITICAL: Get API key for meta tag (must be available at build time)
    const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || SHOPIFY_API_KEY || '312f1491e10a2848b3ef63a7cd13e91d';
    
    // ✅ CRITICAL: Validate API key is not undefined
    if (!apiKey || apiKey === 'undefined' || apiKey.trim() === '') {
      console.error('[_document] ❌ CRITICAL: NEXT_PUBLIC_SHOPIFY_API_KEY is undefined or empty!');
      console.error('[_document] process.env.NEXT_PUBLIC_SHOPIFY_API_KEY:', process.env.NEXT_PUBLIC_SHOPIFY_API_KEY);
      console.error('[_document] SHOPIFY_API_KEY:', SHOPIFY_API_KEY);
      console.error('[_document] App Bridge will fail silently without a valid API key');
    } else {
      console.log('[_document] ✅ API key found for App Bridge meta tag:', apiKey.substring(0, 10) + '...');
    }
    
    return (
      <Html>
        <Head>
          {/* ✅ CRITICAL: Shopify App Bridge v4 CDN script MUST be first in <head> */}
          {/* No async or defer - must load synchronously for App Bridge initialization */}
          {/* ✅ CRITICAL: Use correct App Bridge v4 script URL */}
          <script src="https://cdn.shopify.com/static/frontend/app-bridge-v4/app-bridge.js"></script>
          
          {/* ✅ CRITICAL: Meta tag with API key for App Bridge v4 token exchange */}
          {/* If this is missing or undefined, App Bridge will fail silently and never provide tokens */}
          <meta name="shopify-api-key" content={apiKey} />
        </Head>
        <body>
          <Main />
          <NextScript />
          <script
            id="ze-snippet"
            src="https://static.zdassets.com/ekr/snippet.js?key=ba9c8cbc-acee-42ec-9972-94a1bf355962"
          />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
