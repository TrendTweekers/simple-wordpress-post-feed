const { src, dest, parallel, series, watch, lastRun } = require("gulp");
var fs = require("fs");
// const { watch, series } = require("gulp");
// const autoprefixer = require("gulp-autoprefixer");
const babel = require("gulp-babel");
// const changed = require("gulp-changed");
// const clean = require("gulp-clean");
// const cleanCSS = require("gulp-clean-css");
// const concat = require("gulp-concat");
// const newer = require("gulp-newer");
// const strip = require("gulp-strip-comments");
const injectfile = require("gulp-inject-file");
// const compile = require("gulp-compile-liquid");
const inject = require("gulp-inject-string");
// const inlineCss = require("gulp-inline-css");
const livereload = require("gulp-livereload");
// const notify = require("gulp-notify");
// const path = require("path");
// const postcss = require("gulp-postcss");
// const rename = require("gulp-rename");
// const sass = require("gulp-sass");
// const liquid = require("gulp-liquid");
// const source = require("vinyl-source-stream");
// const sourcemaps = require("gulp-sourcemaps");
// const uglify = require("gulp-uglify");
const wait = require("gulp-wait");

const t2 = require("through2"); // Get through2 as t2

const babelify = require("babelify");
const browserify = require("browserify");
const buffer = require("vinyl-buffer");

// Should be added
// gulp-scss-lint
livereload({
  start: true
});
// const $$ = gulpLoadPlugins();

// PATHS
//--------------------------------------------------

// Base
// path to base folders

// Base
// const baseFolder = {
//   src: ".",
//   dev: "./src",
//   dist: "./dist",

//   npm: "../../node_modules/"
// };

// Source Path
// path to source folders

// const srcFolder = {
//   sass: `${baseFolder.dev}/scss`,
//   js: `${baseFolder.src}js/`,
//   liquid: `${baseFolder.dev}`,
//   font: `${baseFolder.src}fonts/`,
//   php: `${baseFolder.src}`,
//   root: `${baseFolder.src}`
// };

// Output
// output folders

// const distFolder = {
//   css: `${baseFolder.dist}css/`,
//   js: `${baseFolder.dist}js/`,
//   img: `${baseFolder.dist}img/`,
//   liquid: `${baseFolder.dist}`,
//   root: `${baseFolder.dist}`
// };

/**
 *  Make the final file by injecting dependencie files
 */
function make() {
  src(`wordpress-shopify.liquid`)
    .pipe(wait(250))
    // .pipe(
    //   inject.replace("<!-- inject: style -->", `<!-- inject: style.scss -->`)
    // )
    // .pipe(
    //   inject.replace("<!-- inject: script -->", `<!-- inject: functions.js -->`)
    // )
    .pipe(
      injectfile({
        pattern: "<!--\\s*inject:<filename>-->"
      })
    )
    .pipe(
      t2.obj((chunk, enc, cb) => {
        // Execute through2
        let date = new Date();
        chunk.stat.atime = date;
        chunk.stat.mtime = date;
        cb(null, chunk);
      })
    )
    .pipe(dest("./sections"));
}

exports.build = function(cb) {
  make();
  cb();
};

exports.default = function() {
  livereload.listen();
  // watch liquid files
  watch("wordpress-shopify.liquid", function(cb) {
    console.log("Change in Liquid file");
    make();
    cb();
  });
};

exports.make = make;
