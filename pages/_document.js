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
    
    return (
      <Html>
        <Head>
          {/* ✅ CRITICAL: Shopify App Bridge v4 CDN script MUST be first in <head> */}
          {/* No async or defer - must load synchronously for App Bridge initialization */}
          <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
          
          {/* ✅ CRITICAL: Meta tag with API key for App Bridge v4 token exchange */}
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
