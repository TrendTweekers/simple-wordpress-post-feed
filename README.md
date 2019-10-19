# Dev environment Wordpress Shopify --- DEV

`npm install ngrok -g`

Adding ngrok token  
`ngrok authtoken 6gSpC39U3skFF6CsmPJYF_3opca5N75GRHr6u8Ga6u8`

In terminal start ngrok.  
`ngrok http 3000 -region eu -subdomain=ingrid`

Copying forwarding https address to shopify  
`admin => Apps=>Better Related... => App setup`

App url :ngrok address for example  
`https://ingrid.eu.ngrok.io`

Whitelisted redirection URL(s) ngrok url + /auth/callback for example  
`https://ingrid.eu.ngrok.io/auth/callback`

`Save`

---

For payment test, change the config/config.js config.TUNNEL_URL to the ngrok address otherwise leave it as it is

Installing app to an application(unlisted way) ngrok url + /auth?shop= + shop url for example  
`https://ingrid.eu.ngrok.io/auth?shop=stacked-development.myshopify.com`
`https://shopify-wordpress-post-feed-app-rga4phvsoq-uc.a.run.app/auth?shop=stacked-development.myshopify.com`
`npm run dev`

## Wordpress Shopify --- PRODUCTION

`npm run start`  
Deploy newest version on google cloud run.

https://ingrid.eu.ngrok.io/auth?shop=stacked-demo-1.myshopify.com
https://shopify-wordpress-post-feed-app-rga4phvsoq-uc.a.run.app>
