console.log("BOOT: Koa server/index.js is running");
console.log("BOOT: Koa server/index.js starting, NODE_ENV=", process.env.NODE_ENV);
console.log("BOOT: Custom Koa server will handle all routes including /install/auth");

require('@babel/register')({
  presets: ['@babel/preset-env'],
  ignore: ['node_modules'],
});

  // Import the rest of our application.
module.exports = require('./server');
