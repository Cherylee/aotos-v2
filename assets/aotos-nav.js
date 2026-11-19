(function () {
  var nav = document.querySelector('[data-aotos-nav]');
  if (!nav || nav.dataset.bound === 'true') return;
  nav.dataset.bound = 'true';

  var toggle = nav.querySelector('[data-aotos-nav-toggle]');
  var mq = window.matchMedia('(max-width: 768px)');

  function setExpanded(button, open) {
    if (button) button.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function setToggleLabel(open) {
    var label = toggle && toggle.querySelector('.visually-hidden');
    if (!label || !toggle) return;
    label.textContent = open ? toggle.getAttribute('data-label-close') : toggle.getAttribute('data-label-menu');
  }

  function resetDrill() {
    nav.classList.remove('is-drill', 'is-drill-products');
    nav.querySelectorAll('.is-drill').forEach(function (el) {
      el.classList.remove('is-drill');
    });
  }

  function scrollDrawer() {
    var list = nav.querySelector('.aotos-nav__list');
    if (list) list.scrollTop = 0;
  }

  function openBranch(item) {
    if (!item) return;
    nav.querySelectorAll('.aotos-nav__item.is-drill, .aotos-nav__mega-item.is-drill').forEach(function (el) {
      el.classList.remove('is-drill');
    });
    item.classList.add('is-drill');
    nav.classList.add('is-drill');
    nav.classList.remove('is-drill-products');
    scrollDrawer();
  }

  function openProducts(megaItem) {
    if (!megaItem) return;
    var branch = megaItem.closest('.aotos-nav__item');
    openBranch(branch);
    megaItem.classList.add('is-drill');
    nav.classList.add('is-drill-products');
    scrollDrawer();
  }

  function backDrill() {
    if (nav.classList.contains('is-drill-products')) {
      nav.classList.remove('is-drill-products');
      nav.querySelectorAll('.aotos-nav__mega-item.is-drill').forEach(function (el) {
        el.classList.remove('is-drill');
      });
      scrollDrawer();
      return;
    }
    resetDrill();
    scrollDrawer();
  }

  function placeDrawer() {
    var header = nav.closest('.header');
    if (!header) return;
    document.documentElement.style.setProperty('--aotos-drawer-top', header.getBoundingClientRect().bottom + 'px');
  }

  function closeNav() {
    nav.classList.remove('is-open');
    document.documentElement.classList.remove('aotos-nav-open');
    setExpanded(toggle, false);
    setToggleLabel(false);
    resetDrill();
  }

  nav.addEventListener('click', function (event) {
    if (event.target.closest('[data-aotos-nav-close]')) {
      closeNav();
      return;
    }

    if (event.target.closest('[data-aotos-nav-toggle]')) {
      var open = nav.classList.toggle('is-open');
      setExpanded(toggle, open);
      setToggleLabel(open);
      if (open && mq.matches) {
        placeDrawer();
        document.documentElement.classList.add('aotos-nav-open');
      } else {
        document.documentElement.classList.remove('aotos-nav-open');
        resetDrill();
      }
      return;
    }

    if (event.target.closest('[data-aotos-nav-back]')) {
      if (mq.matches) backDrill();
      return;
    }

    if (!mq.matches) return;

    var megaLink = event.target.closest('.aotos-nav__mega-link');
    if (megaLink) {
      event.preventDefault();
      var megaItem = megaLink.closest('.aotos-nav__mega-item');
      if (!megaItem) return;
      if (!megaItem.querySelector('.aotos-nav__card')) {
        window.location.href = megaLink.getAttribute('href');
        return;
      }
      openProducts(megaItem);
      return;
    }

    var rowLink = event.target.closest('.aotos-nav__row .aotos-nav__link');
    if (rowLink) {
      event.preventDefault();
      openBranch(rowLink.closest('.aotos-nav__item'));
      return;
    }

    var subToggle = event.target.closest('[data-aotos-sub-toggle]');
    if (!subToggle) return;

    event.preventDefault();
    openBranch(subToggle.closest('.aotos-nav__item'));
  });

  document.addEventListener('click', function (event) {
    if (!nav.contains(event.target)) closeNav();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    if (mq.matches && nav.classList.contains('is-drill')) {
      backDrill();
      return;
    }
    closeNav();
  });

  function syncMegaAlign() {
    if (mq.matches) return;
    var header = nav.closest('.header');
    var wrapper = nav.closest('.header-wrapper') || header;
    var firstItem = nav.querySelector('.aotos-nav__list > .aotos-nav__item');
    if (!header || !wrapper || !firstItem) return;
    var logo = header.querySelector('.header__heading-logo') || header.querySelector('.header__heading-link');
    if (!logo) return;
    var wrapRect = wrapper.getBoundingClientRect();
    var logoRect = logo.getBoundingClientRect();
    var navRect = firstItem.getBoundingClientRect();
    var megaLeft = logoRect.left - wrapRect.left;
    var totalOffset = navRect.left - logoRect.left;
    if (megaLeft >= 0 && totalOffset > 120) {
      var rem = wrapRect.width / 1440;
      var midX = (logoRect.right + navRect.left) / 2;
      var side = Math.min(totalOffset - 16, Math.max(140 * rem, midX - logoRect.left));
      nav.style.setProperty('--aotos-mega-left', megaLeft + 'px');
      nav.querySelectorAll('.aotos-nav__mega-list').forEach(function (list) {
        list.style.setProperty('--aotos-mega-side', side + 'px');
        list.style.setProperty('--aotos-mega-gap', (totalOffset - side) + 'px');
      });
    }
  }

  window.addEventListener('resize', function () {
    if (!mq.matches) {
      closeNav();
      syncMegaAlign();
    } else if (nav.classList.contains('is-open')) {
      placeDrawer();
    }
  });

  window.addEventListener('scroll', function () {
    if (mq.matches && nav.classList.contains('is-open')) placeDrawer();
  }, { passive: true });

  syncMegaAlign();
  window.addEventListener('load', syncMegaAlign, { once: true });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(syncMegaAlign);
  }

  function activateMega(item) {
    syncMegaAlign();
    var mega = item.closest('.aotos-nav__mega');
    if (!mega) return;
    var items = mega.querySelectorAll('.aotos-nav__mega-item');
    var index = Array.prototype.indexOf.call(items, item);
    if (index < 0) return;
    items.forEach(function (el, i) {
      el.classList.toggle('is-active', i === index);
    });
    mega.querySelectorAll('.aotos-nav__mega-products').forEach(function (panel, i) {
      panel.classList.toggle('is-active', i === index);
    });
  }

  nav.addEventListener('pointerover', function (event) {
    if (mq.matches) return;
    var item = event.target.closest('.aotos-nav__mega-item');
    if (item) activateMega(item);
  });

  nav.addEventListener('focusin', function (event) {
    if (mq.matches) return;
    var item = event.target.closest('.aotos-nav__mega-item');
    if (item) activateMega(item);
  });

  document.addEventListener('aotos-nav:close', closeNav);
})();
