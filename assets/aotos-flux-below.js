(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!customElements.get('flux-anchor')) {
    customElements.define('flux-anchor', class extends HTMLElement {
      connectedCallback() {
        this.links = [...this.querySelectorAll('[data-fxb-key]')];
        this.sectionEl = this.closest('.shopify-section');
        this.sentinel = this.sectionEl?.querySelector('.fxb-anchor-sentinel');
        this.onClick = (event) => {
          const link = event.target.closest('[data-fxb-key]');
          if (!link) return;
          const target = this.find(link.dataset.fxbKey);
          if (!target) return;
          event.preventDefault();
          this.setActive(link.dataset.fxbKey);
          target.style.scrollMarginTop = `${this.offset()}px`;
          target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        };
        this.addEventListener('click', this.onClick);
        this.links.forEach((link) => {
          const target = this.find(link.dataset.fxbKey);
          if (!target) link.closest('li')?.setAttribute('hidden', '');
        });
        this.visible = this.links.filter((link) => !link.closest('li')?.hasAttribute('hidden'));
        if (!this.visible.length) {
          this.sectionEl?.setAttribute('hidden', '');
          return;
        }
        this.onScroll = () => {
          if (this.raf) return;
          this.raf = requestAnimationFrame(() => {
            this.raf = 0;
            this.syncStuck();
            this.syncActive();
          });
        };
        window.addEventListener('scroll', this.onScroll, { passive: true });
        this.syncStuck();
        this.syncActive();
      }
      disconnectedCallback() {
        window.removeEventListener('scroll', this.onScroll);
        document.documentElement.classList.remove('fxb-anchor-stuck');
      }
      syncStuck() {
        const bar = this.sectionEl?.querySelector('.fxb-anchor-section');
        if (bar) document.documentElement.style.setProperty('--fxb-anchor-h', `${bar.offsetHeight}px`);
        const top = this.sentinel?.getBoundingClientRect().top ?? 1;
        const headerH = document.querySelector('.section-header')?.offsetHeight || 0;
        document.documentElement.classList.toggle('fxb-anchor-stuck', top <= headerH);
      }
      syncActive() {
        const bar = this.sectionEl?.querySelector('.fxb-anchor-section');
        const stuck = document.documentElement.classList.contains('fxb-anchor-stuck');
        const line = stuck ? (bar?.getBoundingClientRect().bottom || 0) + 2 : 0;
        let key = this.visible[0]?.dataset.fxbKey;
        if (!stuck) {
          this.setActive(key);
          return;
        }
        this.visible.forEach((link) => {
          const target = this.find(link.dataset.fxbKey);
          if (target && target.getBoundingClientRect().top <= line) key = link.dataset.fxbKey;
        });
        const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
        if (atEnd) {
          this.visible.forEach((link) => {
            const target = this.find(link.dataset.fxbKey);
            if (!target) return;
            const rect = target.getBoundingClientRect();
            if (rect.bottom > line && rect.top < window.innerHeight) key = link.dataset.fxbKey;
          });
        }
        this.setActive(key);
      }
      setActive(key) {
        this.links.forEach((link) => link.classList.toggle('is-active', link.dataset.fxbKey === key));
      }
      offset() {
        return this.sectionEl?.querySelector('.fxb-anchor-section')?.offsetHeight || 0;
      }
      find(key) {
        return document.getElementById(`shopify-section-${key}`)
          || document.querySelector(`.shopify-section[id$="__${key}"]`);
      }
    });
  }

  if (!customElements.get('flux-features')) {
    customElements.define('flux-features', class extends HTMLElement {
      connectedCallback() {
        this.slides = [...this.querySelectorAll('.fxb-features__slide')];
        this.dots = [...this.querySelectorAll('.fxb-features__dot')];
        this.track = this.querySelector('.fxb-features__track');
        this.index = 0;
        this.querySelector('.fxb-features__nav--prev')?.addEventListener('click', () => this.go(-1));
        this.querySelector('.fxb-features__nav--next')?.addEventListener('click', () => this.go(1));
        this.dots.forEach((dot, index) => dot.addEventListener('click', () => this.goTo(index)));
        this.stage = this.querySelector('.fxb-features__stage');
        this.bindSwipe();
        this.onResize = () => this.updateTrack(0, false);
        window.addEventListener('resize', this.onResize);
        this.updateTrack(0, false);
        this.observer = new IntersectionObserver((entries) => {
          this.inView = entries.some((entry) => entry.isIntersecting);
          this.syncVideo();
        }, { threshold: 0.45 });
        this.observer.observe(this);
        this.syncVideo();
      }
      disconnectedCallback() {
        this.observer?.disconnect();
        window.removeEventListener('resize', this.onResize);
        this.stage?.removeEventListener('touchstart', this.onTouchStart);
        this.stage?.removeEventListener('touchmove', this.onTouchMove);
        this.stage?.removeEventListener('touchend', this.onTouchEnd);
        this.stage?.removeEventListener('touchcancel', this.onTouchCancel);
        this.pauseAll();
      }
      mobile() {
        return window.matchMedia('(max-width: 768px)').matches;
      }
      updateTrack(offsetPx, animate) {
        if (!this.track) return;
        if (!this.mobile()) {
          this.track.style.transform = '';
          this.track.style.transition = '';
          return;
        }
        const slide = this.slides[this.index];
        const shift = slide ? slide.offsetLeft : 0;
        const x = -shift + (offsetPx || 0);
        this.track.style.transition = animate && !reduced ? 'transform 0.4s ease' : 'none';
        this.track.style.transform = `translate3d(${x}px, 0, 0)`;
      }
      bindSwipe() {
        const stage = this.stage;
        if (!stage) return;
        this.onTouchStart = (event) => {
          if (!this.mobile()) return;
          const touch = event.changedTouches[0];
          if (!touch) return;
          this.swipeX = touch.clientX;
          this.swipeY = touch.clientY;
          this.swipeDx = 0;
          this.swiping = true;
          this.swipeAxis = null;
          this.updateTrack(0, false);
        };
        this.onTouchMove = (event) => {
          if (!this.swiping || !this.mobile()) return;
          const touch = event.touches[0];
          if (!touch) return;
          const dx = touch.clientX - this.swipeX;
          const dy = touch.clientY - this.swipeY;
          if (!this.swipeAxis) {
            if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
            this.swipeAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
          }
          if (this.swipeAxis !== 'x') return;
          event.preventDefault();
          let offset = dx;
          const last = this.slides.length - 1;
          if ((this.index === 0 && offset > 0) || (this.index === last && offset < 0)) offset *= 0.32;
          this.swipeDx = offset;
          this.updateTrack(offset, false);
        };
        this.onTouchEnd = () => {
          if (!this.swiping) return;
          this.swiping = false;
          if (this.swipeAxis !== 'x') {
            this.swipeAxis = null;
            return;
          }
          this.swipeAxis = null;
          const width = this.stage.getBoundingClientRect().width || 1;
          const shouldChange = Math.abs(this.swipeDx) > Math.min(40, width * 0.18);
          if (shouldChange) {
            const next = this.index + (this.swipeDx < 0 ? 1 : -1);
            this.goTo(Math.max(0, Math.min(this.slides.length - 1, next)));
          } else {
            this.updateTrack(0, true);
          }
        };
        this.onTouchCancel = () => {
          this.swiping = false;
          this.swipeAxis = null;
          this.updateTrack(0, true);
        };
        stage.addEventListener('touchstart', this.onTouchStart, { passive: true });
        stage.addEventListener('touchmove', this.onTouchMove, { passive: false });
        stage.addEventListener('touchend', this.onTouchEnd, { passive: true });
        stage.addEventListener('touchcancel', this.onTouchCancel, { passive: true });
      }
      go(step) {
        this.goTo((this.index + step + this.slides.length) % this.slides.length);
      }
      goTo(index) {
        this.index = index;
        this.slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
        this.dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
        this.updateTrack(0, true);
        this.syncVideo();
      }
      pauseAll() {
        this.querySelectorAll('video').forEach((video) => video.pause());
      }
      syncVideo() {
        this.querySelectorAll('.fxb-features__media').forEach((media) => media.classList.remove('is-playing'));
        this.pauseAll();
        if (!this.inView) return;
        const video = this.slides[this.index]?.querySelector('video');
        if (!video) return;
        video.play().then(() => {
          video.closest('.fxb-features__media')?.classList.add('is-playing');
        }).catch(() => {});
      }
    });
  }

  if (!customElements.get('flux-tabs')) {
    customElements.define('flux-tabs', class extends HTMLElement {
      connectedCallback() {
        this.addEventListener('click', (event) => {
          const tab = event.target.closest('[data-fxb-tab]');
          if (!tab || !this.contains(tab)) return;
          const name = tab.dataset.fxbTab;
          this.querySelectorAll('[data-fxb-tab]').forEach((item) => {
            item.classList.toggle('is-active', item.dataset.fxbTab === name);
          });
          this.querySelectorAll('[data-fxb-panel]').forEach((panel) => {
            const on = panel.dataset.fxbPanel === name;
            panel.classList.toggle('is-active', on);
            if (!on) panel.querySelectorAll('video').forEach((video) => video.pause());
          });
        });
      }
    });
  }

  if (!customElements.get('flux-experts')) {
    customElements.define('flux-experts', class extends HTMLElement {
      connectedCallback() {
        this.onTrackScroll = () => {
          if (this.raf) return;
          this.raf = requestAnimationFrame(() => {
            this.raf = 0;
            this.syncArrows();
          });
        };
        this.querySelectorAll('.fxb-experts__track').forEach((track) => {
          track.addEventListener('scroll', this.onTrackScroll, { passive: true });
        });
        this.syncArrows();
        this.addEventListener('click', (event) => {
          if (event.target.closest('[data-fxb-tab]')) {
            requestAnimationFrame(() => this.syncArrows());
          }
          const arrow = event.target.closest('[data-fxb-dir]');
          if (arrow) {
            if (arrow.disabled) return;
            const track = this.querySelector('.fxb-experts__panel.is-active .fxb-experts__track');
            const card = track?.querySelector('.fxb-experts__card');
            if (!track || !card) return;
            const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
            const delta = (card.getBoundingClientRect().width + gap) * Number(arrow.dataset.fxbDir);
            track.scrollBy({ left: delta, behavior: reduced ? 'auto' : 'smooth' });
            return;
          }
          const social = event.target.closest('[data-fxb-video]');
          if (social) {
            const media = social.closest('.fxb-experts__media');
            const video = media?.querySelector('video');
            if (!media || !video) return;
            this.querySelectorAll('.fxb-experts__media.is-playing video').forEach((item) => {
              if (item !== video) {
                item.pause();
                item.closest('.fxb-experts__media')?.classList.remove('is-playing');
              }
            });
            media.classList.add('is-playing');
            video.controls = true;
            video.play();
            return;
          }
          const play = event.target.closest('[data-fxb-yt]');
          if (!play) return;
          const media = play.closest('.fxb-experts__media');
          if (!media || media.querySelector('iframe')) return;
          const frame = document.createElement('iframe');
          frame.src = `https://www.youtube.com/embed/${play.dataset.fxbYt}?autoplay=1&rel=0`;
          frame.title = play.getAttribute('aria-label') || 'Video';
          frame.allow = 'autoplay; encrypted-media; picture-in-picture';
          frame.allowFullscreen = true;
          media.replaceChildren(frame);
        });
      }
      syncArrows() {
        const track = this.querySelector('.fxb-experts__panel.is-active .fxb-experts__track');
        if (!track) return;
        const max = track.scrollWidth - track.clientWidth;
        const atStart = track.scrollLeft <= 2;
        const atEnd = max <= 2 || track.scrollLeft >= max - 2;
        this.querySelectorAll('[data-fxb-dir]').forEach((arrow) => {
          const off = Number(arrow.dataset.fxbDir) < 0 ? atStart : atEnd;
          arrow.disabled = off;
          arrow.classList.toggle('is-disabled', off);
        });
      }
    });
  }

  if (!customElements.get('flux-safety')) {
    customElements.define('flux-safety', class extends HTMLElement {
      connectedCallback() {
        this.modal = this.querySelector('.fxb-modal');
        this.addEventListener('click', (event) => {
          if (event.target.closest('[data-fxb-open]')) this.open();
          if (event.target.closest('[data-fxb-close]')) this.close();
        });
        this.onKey = (event) => {
          if (event.key === 'Escape') this.close();
        };
      }
      open() {
        if (!this.modal) return;
        this.modal.hidden = false;
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', this.onKey);
      }
      close() {
        if (!this.modal || this.modal.hidden) return;
        this.modal.hidden = true;
        document.body.style.overflow = '';
        document.removeEventListener('keydown', this.onKey);
      }
    });
  }

  if (!window.fxbBelowReady) {
    window.fxbBelowReady = true;

    document.addEventListener('click', (event) => {
      const mute = event.target.closest('[data-fxb-mute]');
      if (!mute) return;
      const video = mute.parentElement?.querySelector('video');
      if (!video) return;
      video.muted = !video.muted;
      mute.setAttribute('aria-pressed', String(!video.muted));
    });

    const closeFaq = (item) => {
      const answer = item.querySelector('.fxb-faq__answer');
      if (!answer || !item.classList.contains('is-open')) return;
      const gen = (answer.fxbGen = (answer.fxbGen || 0) + 1);
      if (answer.fxbEnd) {
        answer.removeEventListener('transitionend', answer.fxbEnd);
        answer.fxbEnd = null;
      }
      item.classList.remove('is-open');
      if (reduced) {
        item.open = false;
        answer.style.height = '';
        return;
      }
      answer.style.height = `${answer.scrollHeight}px`;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (answer.fxbGen !== gen) return;
          answer.style.height = '0px';
          let settled = false;
          const finishClose = () => {
            if (settled || answer.fxbGen !== gen) return;
            settled = true;
            if (answer.fxbEnd) {
              answer.removeEventListener('transitionend', answer.fxbEnd);
              answer.fxbEnd = null;
            }
            item.open = false;
            answer.style.height = '';
          };
          answer.fxbEnd = (evt) => {
            if (evt.propertyName !== 'height') return;
            finishClose();
          };
          answer.addEventListener('transitionend', answer.fxbEnd);
          setTimeout(finishClose, 500);
        });
      });
    };

    document.addEventListener('click', (event) => {
      const summary = event.target.closest('.fxb-faq__item summary');
      if (!summary) return;
      const item = summary.parentElement;
      const answer = item?.querySelector('.fxb-faq__answer');
      if (!item || !answer) return;
      event.preventDefault();
      if (item.classList.contains('is-open')) {
        closeFaq(item);
        return;
      }
      item.closest('.fxb-faq')?.querySelectorAll('.fxb-faq__item.is-open').forEach((other) => {
        if (other !== item) closeFaq(other);
      });
      if (answer.fxbEnd) {
        answer.removeEventListener('transitionend', answer.fxbEnd);
        answer.fxbEnd = null;
      }
      const gen = (answer.fxbGen = (answer.fxbGen || 0) + 1);
      item.classList.add('is-open');
      item.open = true;
      if (reduced) {
        answer.style.height = 'auto';
        return;
      }
      answer.style.height = '0px';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (answer.fxbGen !== gen || !item.classList.contains('is-open')) return;
          answer.style.height = `${answer.scrollHeight}px`;
          answer.fxbEnd = (evt) => {
            if (evt.propertyName !== 'height' || answer.fxbGen !== gen || !item.classList.contains('is-open')) return;
            answer.removeEventListener('transitionend', answer.fxbEnd);
            answer.fxbEnd = null;
            answer.style.height = 'auto';
          };
          answer.addEventListener('transitionend', answer.fxbEnd);
        });
      });
    });
  }
})();
