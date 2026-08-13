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
