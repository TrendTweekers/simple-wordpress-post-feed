# Dev environment Wordpress Shopify --- DEV

To allow pub/sub to run in local enviorment path to keyfile need to be set. For example in  
`export GOOGLE_APPLICATION_CREDENTIALS="/Users/mathiasasberg/Projects/stackedboost/Simple-Wordpress-Post-Feed-APP/server/lib/ServiceAccountKey.json"`

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

https://ingrid.eu.ngrok.io/auth?shop=brbp-theme-assets-development-store.myshopify.com

longTrial = true in db and need to cancel subscription in postman
https://shopify.dev/docs/admin-api/rest/reference/billing/recurringapplicationcharge#destroy-2021-04

DELETE https://{shop_URL}/admin/api/2021-04/recurring_application_charges/{recurring_application_charge_id}.json