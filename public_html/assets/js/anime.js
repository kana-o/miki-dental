'use strict';

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// アニメーション専用JS
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

//===============================================
// モーション削減設定の検知（ONなら演出を一切動かさない）
//===============================================
const PREFERS_REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

//===============================================
// js-sticky-cover の切り替え区間（既定値）
// 進捗の前後を静止に使い、画像を見せる「間」を作る。
// 次のセクションを重ねる等でタイミングを変えたい場合は、
// 対象要素に data-sc-reveal-start / data-sc-reveal-end を書いて上書きする
//===============================================
const STICKY_COVER_REVEAL_START = 0.25;
const STICKY_COVER_REVEAL_END = 0.75;

//-----------------------------------------------
// スティッキーカバー - 画面固定＋背景の切り替え
//-----------------------------------------------
(function () {
  if (PREFERS_REDUCED_MOTION) {
    return;
  }

  const covers = [...document.querySelectorAll('.js-sticky-cover')];

  if (covers.length === 0) {
    return;
  }

  const clamp = function (value) {
    return Math.min(Math.max(value, 0), 1);
  };

  // data 属性は未指定・数値以外なら既定値を使う（0 を指定できるよう isFinite で判定）
  const readRatio = function (value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  // 減速（power1.out 相当）。切り替わり際で失速させて唐突さを消す
  const easeOut = function (t) {
    return 1 - (1 - t) * (1 - t);
  };

  let ticking = false;

  const update = function () {
    covers.forEach(function (cover) {
      const stage = cover.querySelector('.js-sticky-cover__stage');

      if (!stage) {
        return;
      }

      const rect = cover.getBoundingClientRect();
      // 貼り付いていられる距離 = 親の高さ - ステージの高さ
      const travel = rect.height - stage.offsetHeight;

      if (travel <= 0) {
        return;
      }

      const start = readRatio(cover.dataset.scRevealStart, STICKY_COVER_REVEAL_START);
      const end = readRatio(cover.dataset.scRevealEnd, STICKY_COVER_REVEAL_END);
      const progress = clamp(-rect.top / travel);
      const reveal = easeOut(clamp((progress - start) / (end - start)));

      cover.style.setProperty('--sc-progress', progress.toFixed(4));
      cover.style.setProperty('--sc-reveal', reveal.toFixed(4));

      // 画面に掛かっている間だけ will-change を有効にする
      const isActive = rect.top < window.innerHeight && rect.bottom > 0;
      cover.classList.toggle('is-sticky-cover-active', isActive);
    });

    ticking = false;
  };

  const onScroll = function () {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
})();
