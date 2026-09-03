const gulp = require("gulp");
const sass = require("gulp-dart-sass");
const plumber = require("gulp-plumber");
const notify = require("gulp-notify");
const browserSync = require("browser-sync");
const autoprefixer = require("gulp-autoprefixer");
const gcmq = require("gulp-group-css-media-queries");
const sassGlob = require('gulp-sass-glob-use-forward');
const webp = require('gulp-webp');
const fileInclude = require('gulp-file-include');

const srcBase = './src';
const distBase = './public_html';

const srcPath = {
  // parts/ は @@include で読み込まれるだけなので直接コンパイル対象から除外
  html: [srcBase + '/html/**/*.html', '!' + srcBase + '/html/parts/**/*.html'],
  parts: srcBase + '/html/parts/**/*.html',
  scss: srcBase + '/scss/**/*.scss',
  img:  srcBase + '/img/**/*.*',
};

const distPath = {
  html: distBase + '/',
  css:  distBase + '/assets/css/',
  img:  distBase + '/assets/img/',
};

// HTML（@@include でパーツを展開）
const buildHtml = () => {
  return gulp
    .src(srcPath.html)
    .pipe(plumber({ errorHandler: notify.onError('Error:<%= error.message %>') }))
    .pipe(fileInclude({
      prefix: '@@',
      basepath: '@file',  // @@include のパスをソースファイル基準で解決
    }))
    .pipe(gulp.dest(distPath.html))
    .pipe(browserSync.stream());
};

// SCSS
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

// 画像 → WebP変換
const imageWebp = () => {
  return gulp
    .src(srcBase + '/img/**/*.+(jpg|jpeg|png)')
    .pipe(webp())
    .pipe(gulp.dest(distPath.img));
};

// 画像（svg/png/jpg/gif/ico）をそのままコピー（SVGや元画像・ファビコンの参照を有効にする）
const imageCopy = () => {
  return gulp
    .src(srcBase + '/img/**/*.+(jpg|jpeg|png|gif|svg|ico)', { encoding: false })
    .pipe(gulp.dest(distPath.img));
};

// BrowserSync（静的サーバーモード）
const browserSyncFunc = () => {
  browserSync.init({
    server: { baseDir: distBase },
    open: true,
    ghostMode: false,
  });
};

const browserSyncReload = (done) => {
  browserSync.reload();
  done();
};

// ファイル監視
const watchFiles = () => {
  gulp.watch(srcPath.scss, gulp.series(cssSass, copyScss));
  gulp.watch(srcPath.img, gulp.series(gulp.parallel(imageWebp, imageCopy), browserSyncReload));
  // HTML本体 or パーツが変わったら全HTML再ビルド
  gulp.watch([srcPath.html[0], srcPath.parts], gulp.series(buildHtml));
};

exports.default = gulp.series(
  gulp.parallel(buildHtml, cssSass, copyScss, imageWebp, imageCopy),
  gulp.parallel(watchFiles, browserSyncFunc),
);
