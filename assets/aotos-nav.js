(function () {
  var nav = document.querySelector('[data-aotos-nav]');
  if (!nav || nav.dataset.bound === 'true') return;
  nav.dataset.bound = 'true';

  var toggle = nav.querySelector('[data-aotos-nav-toggle]');
  var mq = window.matchMedia('(max-width: 768px)');

  function setExpanded(button, open) {
    if (button) button.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function closeSubmenus() {
    nav.querySelectorAll('.aotos-nav__item.is-open').forEach(function (item) {
      item.classList.remove('is-open');
      item.querySelectorAll('[data-aotos-sub-toggle]').forEach(function (button) {
        setExpanded(button, false);
      });
    });
  }

  function closeNav() {
    nav.classList.remove('is-open');
    setExpanded(toggle, false);
    closeSubmenus();
  }

  nav.addEventListener('click', function (event) {
    if (event.target.closest('[data-aotos-nav-toggle]')) {
      var open = nav.classList.toggle('is-open');
      setExpanded(toggle, open);
      if (!open) closeSubmenus();
      return;
    }

    var subToggle = event.target.closest('[data-aotos-sub-toggle]');
    if (!subToggle || !mq.matches) return;

    event.preventDefault();
    var item = subToggle.closest('.aotos-nav__item');
    if (!item) return;
    var open = item.classList.toggle('is-open');
    item.querySelectorAll('[data-aotos-sub-toggle]').forEach(function (button) {
      setExpanded(button, open);
    });
  });

  document.addEventListener('click', function (event) {
    if (!nav.contains(event.target)) closeNav();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeNav();
  });

  function activateMega(item) {
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
