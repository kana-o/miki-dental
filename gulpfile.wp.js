// WordPress用 gulpfile
// SCSS / JS / img をテーマルートの assets/ にビルド
// BrowserSync は WordPress (Local by Flywheel) をプロキシ
//
// 静的HTML版は gulpfile.static.js を参照（静的案件では gulpfile.static.js をこのファイルに上書きする）
const gulp = require("gulp");
const sass = require("gulp-dart-sass");
const plumber = require("gulp-plumber");
const notify = require("gulp-notify");
const browserSync = require("browser-sync");
const autoprefixer = require("gulp-autoprefixer");
const gcmq = require("gulp-group-css-media-queries");
const sassGlob = require('gulp-sass-glob-use-forward');
const webp = require('gulp-webp');

// WordPressローカルURL（Local by Flywheel）。案件開始時にプロジェクト名へ更新する
const siteUrl = '260813-miki-dental.local';

const srcBase = './src';
const distBase = '.'; // theme root

const srcPath = {
  scss: srcBase + '/scss/**/*.scss',
  js:   srcBase + '/js/**/*.js',
  img:  srcBase + '/img/**/*.*',
};

const distPath = {
  css: distBase + '/assets/css/',
  js:  distBase + '/assets/js/',
  img: distBase + '/assets/img/',
};

const cssSass = () => {
  return gulp
    .src(srcPath.scss, { sourcemaps: true })
    .pipe(plumber({ errorHandler: notify.onError('Error:<%= error.message %>') }))
    .pipe(sassGlob())
    .pipe(sass({ outputStyle: 'expanded' }))
    .pipe(gcmq())
    .pipe(autoprefixer())
    .pipe(gulp.dest(distPath.css, { sourcemaps: './' }))
    .pipe(browserSync.stream())
    .pipe(notify({ onLast: true }));
};

const copyScss = () => {
  return gulp.src(srcPath.scss).pipe(gulp.dest(distBase + '/assets/scss/'));
};

const jsCopy = () => {
  return gulp
    .src(srcPath.js)
    .pipe(gulp.dest(distPath.js))
    .pipe(browserSync.stream());
};

// 画像 → WebP変換 + 元画像もコピー
const imageWebp = () => {
  return gulp
    .src(srcBase + '/img/**/*.+(jpg|jpeg|png)')
    .pipe(webp())
    .pipe(gulp.dest(distPath.img));
};

// 画像（svg/gif/ico/jpg/jpeg/png）をそのままコピー（SVGや元画像の参照を有効にする）
const imageCopy = () => {
  return gulp
    .src(srcBase + '/img/**/*.+(svg|gif|ico|jpg|jpeg|png)', { encoding: false })
    .pipe(gulp.dest(distPath.img));
};

// BrowserSync（WordPressプロキシモード）
const browserSyncFunc = () => {
  browserSync.init({
    proxy: siteUrl,
    port: 3005,
    open: true,
    ghostMode: false,
    files: [
      '**/*.php',
      './assets/css/*.css',
      './assets/js/*.js',
      './assets/img/**/*',
    ],
  });
};

const browserSyncReload = (done) => {
  browserSync.reload();
  done();
};

// ファイル監視
const watchFiles = () => {
  gulp.watch(srcPath.scss, gulp.series(cssSass, copyScss));
  gulp.watch(srcPath.js, gulp.series(jsCopy, browserSyncReload));
  gulp.watch(srcPath.img, gulp.series(imageWebp, imageCopy, browserSyncReload));
  gulp.watch('./**/*.php', gulp.series(browserSyncReload));
};

exports.default = gulp.series(
  gulp.parallel(cssSass, copyScss, jsCopy, imageWebp, imageCopy),
  gulp.parallel(watchFiles, browserSyncFunc),
);
