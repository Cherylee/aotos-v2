(function () {
  if (customElements.get('bf-anchor-nav')) return;

  class BfAnchorNav extends HTMLElement {
    connectedCallback() {
      this.host = this.closest('.shopify-section') || this;
      this.list = this.querySelector('.bf-nav__list');
      this.links = Array.from(this.querySelectorAll('[data-bf-target]'));
      this.items = this.links
        .map((link) => ({ link, target: document.getElementById(link.dataset.bfTarget) }))
        .filter((item) => item.target);
      if (!this.items.length) return;

      this.activeLink = null;
      this.ticking = false;

      this.onScroll = () => {
        if (this.ticking) return;
        this.ticking = true;
        requestAnimationFrame(() => {
          this.ticking = false;
          this.update();
        });
      };

      this.onClick = (event) => {
        const link = event.target.closest('[data-bf-target]');
        if (!link) return;
        const item = this.items.find((entry) => entry.link === link);
        if (!item) return;
        event.preventDefault();
        this.scrollToTarget(item.target);
      };

      this.addEventListener('click', this.onClick);
      window.addEventListener('scroll', this.onScroll, { passive: true });
      window.addEventListener('resize', this.onScroll, { passive: true });
      this.update();
    }

    disconnectedCallback() {
      this.removeEventListener('click', this.onClick);
      window.removeEventListener('scroll', this.onScroll);
      window.removeEventListener('resize', this.onScroll);
    }

    headerHeight() {
      const header = document.querySelector('.section-header.shopify-section-header-sticky');
      return header ? header.getBoundingClientRect().height : 0;
    }

    scrollToTarget(target) {
      const navH = this.getBoundingClientRect().height;
      const top = target.getBoundingClientRect().top;
      const goingUp = top < 0;
      const offset = navH + (goingUp ? this.headerHeight() : 0);
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: Math.max(0, top + window.scrollY - offset), behavior: reduce ? 'auto' : 'smooth' });
    }

    update() {
      const hostTop = this.host.getBoundingClientRect().top;
      const stuck = hostTop <= (parseFloat(getComputedStyle(this.host).top) || 0) + 1;
      const line = this.getBoundingClientRect().bottom + 8;
      let current = null;
      if (stuck) {
        this.items.forEach((item) => {
          if (item.target.getBoundingClientRect().top <= line) current = item;
        });
      }
      if (current) {
        const rect = current.target.getBoundingClientRect();
        if (rect.bottom <= line) current = null;
      }
      const link = current ? current.link : null;
      if (link === this.activeLink) return;
      if (this.activeLink) {
        this.activeLink.classList.remove('is-active');
        this.activeLink.removeAttribute('aria-current');
      }
      this.activeLink = link;
      if (!link) {
        if (this.list) this.list.scrollTo({ left: 0, behavior: 'smooth' });
        return;
      }
      link.classList.add('is-active');
      link.setAttribute('aria-current', 'true');
      if (this.list && this.list.scrollWidth > this.list.clientWidth) {
        const left = link.offsetLeft - (this.list.clientWidth - link.offsetWidth) / 2;
        this.list.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
      }
    }
  }

  customElements.define('bf-anchor-nav', BfAnchorNav);
})();
