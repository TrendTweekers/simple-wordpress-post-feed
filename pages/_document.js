import Document, { Html, Head, Main, NextScript } from "next/document";

class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps };
  }

  render() {
    return (
      <Html>
        <Head />
        <body>
          <Main />
          <NextScript />
          <script
            id="ze-snippet"
            src="https://static.zdassets.com/ekr/snippet.js?key=d2688089-3283-453c-b69b-905bbef62f4d"
          />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
