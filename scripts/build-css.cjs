// SCSS だけをビルドする検証用スクリプト。
// gulp の default タスクは BrowserSync を含み、ポート占有時に起動できないため分離している。
// パイプラインは gulpfile.js の cssSass と同じ（sassGlob → sass → gcmq → autoprefixer）。
const gulp = require("gulp");
const sass = require("gulp-dart-sass");
const autoprefixer = require("gulp-autoprefixer");
const gcmq = require("gulp-group-css-media-queries");
const sassGlob = require("gulp-sass-glob-use-forward");

gulp
  .src("./src/scss/**/*.scss", { sourcemaps: true })
  .pipe(sassGlob())
  .pipe(sass({ outputStyle: "expanded" }))
  .pipe(gcmq())
  .pipe(autoprefixer())
  .pipe(gulp.dest("./public_html/assets/css", { sourcemaps: "./" }))
  .on("end", function () {
    console.log("css built");
  });
