(function () {
  if (window.__flpBound) return;
  window.__flpBound = true;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var desktop = window.matchMedia('(min-width: 769px)');

  function reveal() {
    var nodes = document.querySelectorAll('.flp-reveal:not(.is-inview)');
    if (!nodes.length) return;
    if (reduce.matches || !('IntersectionObserver' in window)) {
      nodes.forEach(function (el) { el.classList.add('is-inview'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-inview');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.28 });
    nodes.forEach(function (el) { io.observe(el); });
  }

  function counters() {
    document.querySelectorAll('[data-count]:not([data-counted])').forEach(function (el) {
      var end = parseFloat(el.getAttribute('data-count')) || 0;
      function run() {
        if (el.getAttribute('data-counted') === '1') return;
        el.setAttribute('data-counted', '1');
        if (reduce.matches) {
          el.textContent = String(end);
          return;
        }
        var start = performance.now();
        function tick(now) {
          var t = Math.min(1, (now - start) / 1100);
          el.textContent = String(Math.round(end * (1 - Math.pow(1 - t, 3))));
          if (t < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      }
      if (!('IntersectionObserver' in window)) {
        run();
        return;
      }
      var io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        run();
        io.disconnect();
      }, { threshold: 0.6 });
      io.observe(el);
    });
  }

  function splitCopy() {
    document.querySelectorAll('[data-flp-copy]:not([data-split])').forEach(function (node) {
      var text = node.textContent || '';
      node.setAttribute('data-split', '1');
      node.textContent = '';
      Array.from(text).forEach(function (ch) {
        var span = document.createElement('span');
        span.textContent = ch;
        if (ch.trim()) span.setAttribute('data-flp-char', '');
        node.appendChild(span);
      });
    });
  }

  function paintChars(section, progress) {
    var chars = section.querySelectorAll('[data-flp-char]');
    if (!chars.length) return;
    var lit = Math.round(progress * chars.length);
    chars.forEach(function (ch, index) {
      ch.classList.toggle('is-on', index < lit);
    });
  }

  function scrub() {
    document.querySelectorAll('[data-flp-scrub]').forEach(function (section) {
      var desktopOnly = section.getAttribute('data-flp-scrub') === 'desktop';
      if (reduce.matches || (desktopOnly && !desktop.matches)) {
        section.style.setProperty('--p', '1');
        paintChars(section, 1);
        return;
      }
      var total = section.offsetHeight - window.innerHeight;
      var passed = Math.min(Math.max(0, -section.getBoundingClientRect().top), Math.max(total, 0));
      var progress = total > 0 ? passed / total : 1;
      section.style.setProperty('--p', progress.toFixed(4));
      paintChars(section, progress);
    });
  }

  var frame = 0;
  function onScroll() {
    if (frame) return;
    frame = requestAnimationFrame(function () {
      frame = 0;
      scrub();
    });
  }

  function closeModal(modal) {
    if (!modal) return;
    var video = modal.querySelector('video');
    var frameEl = modal.querySelector('iframe');
    if (video) video.pause();
    if (frameEl) frameEl.removeAttribute('src');
    modal.hidden = true;
    document.documentElement.classList.remove('flp-lock');
  }

  document.addEventListener('click', function (event) {
    var play = event.target.closest('[data-flp-play]');
    if (play) {
      var box = play.closest('.flp-video');
      var modal = box && box.querySelector('.flp-modal');
      if (!modal) return;
      modal.hidden = false;
      document.documentElement.classList.add('flp-lock');
      var video = modal.querySelector('video');
      if (video) {
        var url = video.getAttribute('data-src');
        if (url && video.getAttribute('src') !== url) video.src = url;
        video.play();
      }
      return;
    }

    var yt = event.target.closest('[data-yt]');
    if (yt) {
      var root = yt.closest('.flp-youtube');
      var modal = root && root.querySelector('.flp-modal');
      var frameEl = modal && modal.querySelector('iframe');
      if (!frameEl) return;
      frameEl.src = 'https://www.youtube.com/embed/' + yt.getAttribute('data-yt') + '?autoplay=1&rel=0';
      modal.hidden = false;
      document.documentElement.classList.add('flp-lock');
      return;
    }

    if (event.target.closest('[data-flp-close]')) {
      closeModal(event.target.closest('.flp-modal'));
      return;
    }

    var nav = event.target.closest('[data-flp-nav]');
    if (nav) {
      var scroller = nav.closest('section').querySelector('[data-flp-scroller]');
      if (!scroller) return;
      if (scroller.hasAttribute('data-flp-peek')) {
        peekStep(scroller, nav.getAttribute('data-flp-nav') === 'next' ? 1 : -1);
        return;
      }
      var card = scroller.firstElementChild;
      if (!card) return;
      var gap = parseFloat(getComputedStyle(scroller).columnGap || getComputedStyle(scroller).gap) || 0;
      var step = card.getBoundingClientRect().width + gap;
      scroller.scrollBy({ left: nav.getAttribute('data-flp-nav') === 'next' ? step : -step, behavior: reduce.matches ? 'auto' : 'smooth' });
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      document.querySelectorAll('.flp-modal:not([hidden])').forEach(closeModal);
    }
  });

  var peekFrame = new WeakMap();

  function peekSlides(scroller) {
    return [].slice.call(scroller.children);
  }

  function peekLeft(scroller, el) {
    return el.offsetLeft - (scroller.clientWidth - el.offsetWidth) / 2;
  }

  function peekIndex(scroller) {
    var slides = peekSlides(scroller);
    var mid = scroller.scrollLeft + scroller.clientWidth / 2;
    var idx = 0;
    var dist = Infinity;
    slides.forEach(function (slide, i) {
      var d = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - mid);
      if (d < dist) {
        dist = d;
        idx = i;
      }
    });
    return idx;
  }

  function peekRebase(scroller) {
    var slides = peekSlides(scroller);
    var idx = peekIndex(scroller);
    if (idx !== 0 && idx !== slides.length - 1) return;
    var real = idx === 0 ? slides[slides.length - 2] : slides[1];
    if (!real) return;
    scroller.scrollLeft = peekLeft(scroller, real);
  }

  function peekAnimate(scroller, left) {
    var prev = peekFrame.get(scroller);
    if (prev) cancelAnimationFrame(prev);
    if (reduce.matches || Math.abs(left - scroller.scrollLeft) < 1) {
      scroller.scrollLeft = left;
      scroller.removeAttribute('data-peek-anim');
      peekRebase(scroller);
      return;
    }
    var start = scroller.scrollLeft;
    var change = left - start;
    var t0 = performance.now();
    scroller.setAttribute('data-peek-anim', '1');
    function frame(now) {
      var t = Math.min(1, (now - t0) / 780);
      var e = 1 - Math.pow(1 - t, 3);
      scroller.scrollLeft = start + change * e;
      if (t < 1) {
        peekFrame.set(scroller, requestAnimationFrame(frame));
        return;
      }
      peekFrame.delete(scroller);
      scroller.removeAttribute('data-peek-anim');
      peekRebase(scroller);
    }
    peekFrame.set(scroller, requestAnimationFrame(frame));
  }

  function peekCenter(scroller, el, smooth) {
    var left = peekLeft(scroller, el);
    if (!smooth) {
      var prev = peekFrame.get(scroller);
      if (prev) cancelAnimationFrame(prev);
      scroller.scrollLeft = left;
      scroller.removeAttribute('data-peek-anim');
      return;
    }
    peekAnimate(scroller, left);
  }

  function peekStep(scroller, dir) {
    var slides = peekSlides(scroller);
    var idx = peekIndex(scroller) + dir;
    if (idx < 0) idx = 0;
    if (idx > slides.length - 1) idx = slides.length - 1;
    peekAnimate(scroller, peekLeft(scroller, slides[idx]));
  }

  function peek() {
    document.querySelectorAll('[data-flp-peek]:not([data-peeked])').forEach(function (scroller) {
      scroller.setAttribute('data-peeked', '1');
      var slides = peekSlides(scroller);
      if (slides.length > 1) {
        var head = slides[slides.length - 1].cloneNode(true);
        var tail = slides[0].cloneNode(true);
        head.setAttribute('aria-hidden', 'true');
        tail.setAttribute('aria-hidden', 'true');
        scroller.insertBefore(head, slides[0]);
        scroller.appendChild(tail);
      }
      var start = scroller.children[Math.min(1, scroller.children.length - 1)];
      requestAnimationFrame(function () { peekCenter(scroller, start, false); });

      var dragging = false;
      var moved = false;
      var axis = '';
      var startX = 0;
      var startY = 0;
      var startLeft = 0;
      scroller.addEventListener('pointerdown', function (event) {
        if (event.pointerType === 'touch') return;
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        var prev = peekFrame.get(scroller);
        if (prev) cancelAnimationFrame(prev);
        scroller.removeAttribute('data-peek-anim');
        dragging = true;
        moved = false;
        axis = '';
        startX = event.clientX;
        startY = event.clientY;
        startLeft = scroller.scrollLeft;
        scroller.classList.add('is-drag');
        try { scroller.setPointerCapture(event.pointerId); } catch (err) {}
      });
      scroller.addEventListener('pointermove', function (event) {
        if (!dragging) return;
        var dx = event.clientX - startX;
        var dy = event.clientY - startY;
        if (!axis) {
          if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
          axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
          if (axis === 'y') {
            dragging = false;
            scroller.classList.remove('is-drag');
            return;
          }
        }
        if (axis !== 'x') return;
        if (event.cancelable) event.preventDefault();
        moved = true;
        scroller.scrollLeft = startLeft - dx;
      }, { passive: false });
      function stopDrag() {
        if (!dragging) return;
        dragging = false;
        scroller.classList.remove('is-drag');
        if (!moved) return;
        var near = peekSlides(scroller)[peekIndex(scroller)];
        peekAnimate(scroller, peekLeft(scroller, near));
      }
      scroller.addEventListener('pointerup', stopDrag);
      scroller.addEventListener('pointercancel', stopDrag);
      scroller.addEventListener('dragstart', function (event) { event.preventDefault(); });
      var settle;
      function snapIfIdle() {
        if (dragging || scroller.getAttribute('data-peek-anim') === '1') return;
        var near = peekSlides(scroller)[peekIndex(scroller)];
        if (Math.abs(scroller.scrollLeft - peekLeft(scroller, near)) > 2) {
          peekAnimate(scroller, peekLeft(scroller, near));
          return;
        }
        peekRebase(scroller);
      }
      scroller.addEventListener('scroll', function () {
        if (dragging || scroller.getAttribute('data-peek-anim') === '1') return;
        clearTimeout(settle);
        settle = setTimeout(snapIfIdle, 90);
      }, { passive: true });
      scroller.addEventListener('scrollend', snapIfIdle);
    });
  }

  function stageDrop(selector, rowSelector, activeClass) {
    document.querySelectorAll(selector + ':not([data-flp-drop])').forEach(function (section) {
      section.setAttribute('data-flp-drop', '1');
      var row = section.querySelector(rowSelector);
      if (!row || reduce.matches || !desktop.matches || !('IntersectionObserver' in window)) {
        section.classList.add(activeClass);
        return;
      }
      var io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        section.classList.add(activeClass);
        io.disconnect();
      }, { rootMargin: '0px 0px -40% 0px', threshold: 0 });
      io.observe(row);
    });
  }

  function controlOpen() {
    document.querySelectorAll('.flp-control:not([data-flp-open])').forEach(function (section) {
      section.setAttribute('data-flp-open', '1');
      if (reduce.matches || !desktop.matches || !('IntersectionObserver' in window)) {
        section.classList.add('is-control');
        return;
      }
      var io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        section.classList.add('is-control');
        io.disconnect();
      }, { rootMargin: '0px 0px -60% 0px', threshold: 0 });
      io.observe(section);
    });
  }

  function videos() {
    document.querySelectorAll('.flp-video__stage video').forEach(function (video) {
      if (video.getAttribute('data-bound') === '1') return;
      video.setAttribute('data-bound', '1');
      function ready() { video.parentElement.classList.add('is-ready'); }
      if (video.readyState >= 2) ready();
      video.addEventListener('playing', ready, { once: true });
    });
  }

  function boot() {
    splitCopy();
    reveal();
    counters();
    stageDrop('.flp-phones', '.flp-phones__row', 'is-phones');
    controlOpen();
    peek();
    videos();
    scrub();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  document.addEventListener('shopify:section:load', boot);
})();
