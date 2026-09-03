window.addEventListener('DOMContentLoaded', function () {
  /* ========================================
    Drawer（SPナビ）
  ======================================== */
  const drawerToggle = document.querySelector('.js-drawer-toggle');
  const drawer = document.getElementById('drawer');

  if (drawerToggle && drawer) {
    const openDrawer = function () {
      drawerToggle.classList.add('is-active');
      drawerToggle.setAttribute('aria-expanded', 'true');
      drawerToggle.setAttribute('aria-label', 'メニューを閉じる');
      drawer.classList.add('is-active');
      drawer.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    };

    const closeDrawer = function () {
      drawerToggle.classList.remove('is-active');
      drawerToggle.setAttribute('aria-expanded', 'false');
      drawerToggle.setAttribute('aria-label', 'メニューを開く');
      drawer.classList.remove('is-active');
      drawer.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };

    drawerToggle.addEventListener('click', function () {
      if (drawerToggle.getAttribute('aria-expanded') === 'true') {
        closeDrawer();
      } else {
        openDrawer();
      }
    });

    // ドロワー内リンクを踏んだら閉じる
    drawer.querySelectorAll('a[href]').forEach(function (link) {
      link.addEventListener('click', closeDrawer);
    });

    // Esc で閉じる
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && drawerToggle.getAttribute('aria-expanded') === 'true') {
        closeDrawer();
        drawerToggle.focus();
      }
    });

    // PC幅へリサイズしたときにスクロールロックが残らないようにする
    const pcQuery = window.matchMedia('(min-width: 769px)');
    pcQuery.addEventListener('change', function (event) {
      if (event.matches) {
        closeDrawer();
      }
    });
  }

  /* ========================================
    FVスライダー（途切れず横に流れ続ける）
  ======================================== */
  const fvSlider = document.querySelector('.js-fv-slider');

  if (fvSlider && typeof Swiper !== 'undefined') {
    new Swiper(fvSlider, {
      slidesPerView: 'auto',
      spaceBetween: 29, // SP（カンプ 29.337）
      loop: true,
      speed: 8000,
      allowTouchMove: false,
      observer: true,
      observeParents: true,
      autoplay: {
        delay: 0,
        disableOnInteraction: false,
      },
      // loop の位置補正（loopFix）に必要な余分なスライド。
      // これが足りないと1周ごとに translate が約195px巻き戻り、8秒おきにカクつく。
      // freeMode は loopFix と競合して同じ症状を起こすため使わない
      // （等速化は .swiper-wrapper の transition-timing-function: linear が担当）。
      loopAdditionalSlides: 5,
      breakpoints: {
        // CSS の @include mq("sp") が max-width:768px なので 769 以上を PC とする
        769: {
          spaceBetween: 45,
        },
      },
    });
  }

  /* ========================================
    パララックス（2枚の帯が逆方向にずれる）
  ======================================== */
  const parallax = document.querySelector('.js-parallax');

  if (parallax && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const imgs = [...parallax.querySelectorAll('.js-parallax-img')];
    const MAX_SHIFT = 60; // px。カンプに移動量の指定が無いため実装側で決めた値
    let ticking = false;

    const update = function () {
      const rect = parallax.getBoundingClientRect();
      const total = rect.height + window.innerHeight;
      // 画面に入ってから出るまでを 0〜1 に正規化
      const progress = Math.min(Math.max((window.innerHeight - rect.top) / total, 0), 1);
      const shift = (progress - 0.5) * 2 * MAX_SHIFT;

      imgs.forEach(function (img, i) {
        const dir = i % 2 === 0 ? 1 : -1;
        img.style.transform = `translate(calc(-50% + ${shift * dir}px), -50%)`;
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
  }

  /* ========================================
    Accordion（ドロワー内の下層メニュー）
  ======================================== */
  document.querySelectorAll('.js-accordion-toggle').forEach(function (toggle) {
    const panel = document.getElementById(toggle.getAttribute('aria-controls'));
    if (!panel) {
      return;
    }

    toggle.addEventListener('click', function () {
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      panel.hidden = isOpen;
    });
  });
});
