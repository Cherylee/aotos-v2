if (!customElements.get('velotric-carousel')) {
      customElements.define(
        'velotric-carousel',
        class VelotricCarousel extends HTMLElement {
          connectedCallback() {
            this.track = this.querySelector('.velotric-custom-carousel__track');
            this.prevBtn = this.querySelector('.velotric-carousel-prev');
            this.nextBtn = this.querySelector('.velotric-carousel-next');
            this.zoomBtn = this.querySelector('.velotric-carousel-zoom');
            this.lightbox = this.querySelector('.velotric-image-lightbox');
            this.lightboxImg = this.querySelector('.velotric-image-lightbox__img');
            this.lightboxClose = this.querySelector('.velotric-image-lightbox__close');
            this.lightboxPrev = this.querySelector('.velotric-image-lightbox__nav--prev');
            this.lightboxNext = this.querySelector('.velotric-image-lightbox__nav--next');
            if (this.lightbox && this.lightbox.parentElement !== document.body) {
              document.body.appendChild(this.lightbox);
            }
            this.dotsContainer = this.querySelector('.velotric-custom-carousel__thumbnails');
            this.dots = Array.from(this.querySelectorAll('.velotric-carousel-dot'));
            if (!this.track) return;
            this.init();
            if (typeof subscribe !== 'undefined' && typeof PUB_SUB_EVENTS !== 'undefined') {
              this.unsubscribeVariantChange = subscribe(PUB_SUB_EVENTS.variantChange, (event) =>
                this.onVariantChange(event)
              );
            }
          }
          disconnectedCallback() {
            this.closeLightbox();
            document.removeEventListener('keydown', this._onLightboxKeydown);
            this.lightbox?.removeEventListener('touchstart', this._onLightboxTouchStart);
            this.lightbox?.removeEventListener('touchmove', this._onLightboxTouchMove);
            this.lightbox?.removeEventListener('touchend', this._onLightboxTouchEnd);
            this.lightbox?.removeEventListener('touchcancel', this._onLightboxTouchCancel);
            if (this.lightbox?.parentElement === document.body) {
              this.lightbox.remove();
            }
            if (this.unsubscribeVariantChange) this.unsubscribeVariantChange();
          }
          onVariantChange(event) {
            const data = event.data || event;
            if (!data || !data.variant || !data.html) return;
            const html = data.html;
            const sectionId = data.sectionId;
            if (sectionId && this.closest('product-info')) {
              const mySectionId = this.closest('product-info').dataset.section;
              if (mySectionId && !sectionId.toString().includes(mySectionId)) return;
            }

            // Lock height before update to prevent collapse on mobile
            const isMobile = window.innerWidth <= 768;
            if (isMobile && this.track) {
              const currentHeight = this.track.offsetHeight;
              this.track.style.minHeight = `${currentHeight}px`;
            }

            // Only update track from AJAX if it has video/special media not in the instant map
            const newTrack = html.querySelector('.velotric-custom-carousel__track');
            if (newTrack && this.track) {
              const hasSpecialMedia = !!newTrack.querySelector('video, model-viewer');
              if (hasSpecialMedia || this.track.innerHTML.trim() === '') {
                this.track.innerHTML = newTrack.innerHTML;
                this.track.scrollLeft = 0;
              }
            }

            const newDots = html.querySelector('.velotric-custom-carousel__thumbnails');
            if (newDots && this.dotsContainer) {
              // Only update dots if they are different
              if (this.dotsContainer.innerHTML.trim() !== newDots.innerHTML.trim()) {
                this.dotsContainer.innerHTML = newDots.innerHTML;
                this.dots = Array.from(this.querySelectorAll('.velotric-carousel-dot'));
                this.bindDotEvents();
              }
            }

            // Unlock height after content update
            if (isMobile && this.track) {
              requestAnimationFrame(() => {
                setTimeout(() => {
                  this.track.style.minHeight = '';
                }, 100);
              });
            }
          }
          init() {
            this.bindEvents();
          }
          updateDotActive(index) {
            this.dots?.forEach((dot, i) => {
              dot.classList.toggle('is-active', i === index);
            });
          }
          // 璁╅€変腑鐨勭缉鐣ュ浘(鍒嗛〉鍣?鍦ㄧ缉鐣ュ浘瀹瑰櫒鍐呭眳涓粦鍔紝鏂逛究鏌ョ湅鍓嶅悗椤电爜
          centerThumbnail(index) {
            const container = this.dotsContainer;
            const item = this.dots?.[index];
            if (!container || !item) return;
            const target = item.offsetLeft - container.clientWidth / 2 + item.clientWidth / 2;
            const maxScroll = container.scrollWidth - container.clientWidth;
            const left = Math.max(0, Math.min(target, maxScroll));
            container.scrollTo({
              left,
              behavior: window.matchMedia('(prefers-reduced-motion: no-preference)').matches ? 'smooth' : 'auto',
            });
          }
          easeOutQuart(t) {
            return 1 - --t * t * t * t;
          }
          smoothScroll(target, duration = 400) {
            if (!this.track) return;
            const start = this.track.scrollLeft;
            const change = target - start;
            let startTime = null;
            const animateScroll = (currentTime) => {
              if (startTime === null) startTime = currentTime;
              const timeElapsed = currentTime - startTime;
              const progress = Math.min(timeElapsed / duration, 1);
              this.track.scrollLeft = start + change * this.easeOutQuart(progress);
              if (timeElapsed < duration) requestAnimationFrame(animateScroll);
            };
            requestAnimationFrame(animateScroll);
          }
          normalizeImageData(image) {
            const data = typeof image === 'string' ? { src: image } : image || {};
            const width = Number(data.width) > 0 ? Number(data.width) : 1200;
            const height = Number(data.height) > 0 ? Number(data.height) : width;
            return {
              src: data.src || '',
              zoomSrc: data.zoom_src || data.src || '',
              width,
              height,
              alt: data.alt || '',
            };
          }
          withImageWidth(src, width) {
            if (!src) return '';
            try {
              const url = new URL(src, window.location.origin);
              url.searchParams.set('width', width);
              return url.toString();
            } catch (error) {
              const separator = src.includes('?') ? '&' : '?';
              return `${src}${separator}width=${width}`;
            }
          }
          escapeAttribute(value) {
            return String(value || '')
              .replaceAll('&', '&amp;')
              .replaceAll('"', '&quot;')
              .replaceAll('<', '&lt;')
              .replaceAll('>', '&gt;');
          }
          renderInstantSlides(images) {
            if (!this.track || !images || !images.length) return;

            // Prevent redundant rendering if same images
            const currentImages = Array.from(this.track.querySelectorAll('img')).map((img) => {
              try {
                return new URL(img.src).pathname + new URL(img.src).search;
              } catch (e) {
                return img.src;
              }
            });
            const newImages = images.map((image) => {
              const data = this.normalizeImageData(image);
              try {
                return new URL(data.src).pathname + new URL(data.src).search;
              } catch (e) {
                return data.src;
              }
            });

            if (JSON.stringify(currentImages) === JSON.stringify(newImages)) return;

            let slidesHtml = '';
            let dotsHtml = '';

            images.forEach((image, index) => {
              const data = this.normalizeImageData(image);
              const src400 = this.withImageWidth(data.src, 400);
              const src540 = this.withImageWidth(data.src, 540);
              const src720 = this.withImageWidth(data.src, 720);
              const thumbSrc = this.withImageWidth(data.src, 80);
              const zoomSrc = this.escapeAttribute(data.zoomSrc);
              const alt = this.escapeAttribute(data.alt);
              const srcset = this.escapeAttribute(`${src400} 400w, ${src540} 540w, ${src720} 720w`);
              slidesHtml += `
                <div class="velotric-custom-carousel__slide" data-index="${index + 1}" data-zoom-src="${zoomSrc}">
                  <img
                    src="${this.escapeAttribute(src540)}"
                    srcset="${srcset}"
                    sizes="(max-width: 768px) 92vw, 520px"
                    alt="${alt}"
                    loading="${index === 0 ? 'eager' : 'lazy'}"
                    fetchpriority="${index === 0 ? 'high' : 'auto'}"
                    width="720"
                    height="720"
                    class="velotric-carousel-img"
                  >
                </div>
              `;
              dotsHtml += `
                <button type="button" 
                  class="velotric-carousel-dot${index === 0 ? ' is-active' : ''}" 
                  data-index="${index}" 
                  aria-label="Go to slide ${index + 1}">
                  <img src="${this.escapeAttribute(thumbSrc)}" alt="" loading="lazy" width="48" height="48" sizes="48px">
                </button>
              `;
            });

            this.track.innerHTML = slidesHtml;
            if (this.dotsContainer) {
              this.dotsContainer.innerHTML = dotsHtml;
              this.dots = Array.from(this.querySelectorAll('.velotric-carousel-dot'));
              this.bindDotEvents();
            }

            // Lock/Unlock height for instant rendering as well
            const isMobile = window.innerWidth <= 768;
            if (isMobile && this.track) {
              const currentHeight = this.track.offsetHeight;
              this.track.style.minHeight = `${currentHeight}px`;
              setTimeout(() => {
                this.track.style.minHeight = '';
              }, 300);
            }

            this.track.scrollLeft = 0;
            this.updateDotActive(0);
            this.updateZoomButton();
          }
          bindDotEvents() {
            this.dots?.forEach((dot) => {
              dot.removeEventListener('click', dot._clickHandler);
              dot._clickHandler = (e) => {
                const index = parseInt(dot.dataset.index);
                this.smoothScroll(index * this.track.clientWidth);
                this.centerThumbnail(index);
              };
              dot.addEventListener('click', dot._clickHandler);
            });
          }
          bindEvents() {
            if (this.track) {
              this.track.addEventListener(
                'scroll',
                () => {
                  const slideWidth = this.track.clientWidth;
                  if (slideWidth === 0) return;
                  const index = Math.round(this.track.scrollLeft / slideWidth);
                  this.updateDotActive(index);
                  this.updateZoomButton();
                },
                { passive: true }
              );
            }
            this.bindDotEvents();
            this.prevBtn?.addEventListener('click', (e) => {
              e.preventDefault();
              const current = Math.round(this.track.scrollLeft / this.track.clientWidth);
              const target = Math.max(0, current - 1);
              this.smoothScroll(target * this.track.clientWidth);
              this.centerThumbnail(target);
            });
            this.nextBtn?.addEventListener('click', (e) => {
              e.preventDefault();
              const lastIndex = (this.dots?.length || 1) - 1;
              const current = Math.round(this.track.scrollLeft / this.track.clientWidth);
              const target = Math.min(lastIndex, current + 1);
              this.smoothScroll(target * this.track.clientWidth);
              this.centerThumbnail(target);
            });
            this.bindZoom();
          }
          getSlides() {
            return Array.from(this.track?.querySelectorAll('.velotric-custom-carousel__slide') || []);
          }
          getCurrentSlide() {
            const slides = this.getSlides();
            if (!slides.length) return null;
            if (!this.track) return slides[0];
            const slideWidth = this.track.clientWidth;
            if (!slideWidth) return slides[0];
            const index = Math.round(this.track.scrollLeft / slideWidth);
            return slides[index] || slides[0];
          }
          getCurrentSlideIndex() {
            const slides = this.getSlides();
            const current = this.getCurrentSlide();
            const index = slides.indexOf(current);
            return index < 0 ? 0 : index;
          }
          getZoomSrc(slide) {
            if (!slide) return '';
            if (slide.dataset.zoomSrc) return slide.dataset.zoomSrc;
            const img = slide.querySelector('img');
            return img?.currentSrc || img?.src || '';
          }
          countZoomableSlides() {
            return this.getSlides().filter((slide) => this.getZoomSrc(slide)).length;
          }
          updateZoomButton() {
            if (!this.zoomBtn) return;
            const src = this.getZoomSrc(this.getCurrentSlide());
            this.zoomBtn.hidden = !src;
          }
          updateLightboxNav() {
            const show = this.countZoomableSlides() > 1;
            if (this.lightboxPrev) this.lightboxPrev.hidden = !show;
            if (this.lightboxNext) this.lightboxNext.hidden = !show;
          }
          syncCarouselToIndex(index) {
            if (!this.track) return;
            this.smoothScroll(index * this.track.clientWidth);
            this.centerThumbnail(index);
            this.updateDotActive(index);
            this.updateZoomButton();
          }
          showLightboxSlide(index) {
            const slides = this.getSlides();
            if (!slides.length || !this.lightbox || !this.lightboxImg) return;
            const slide = slides[index];
            const src = this.getZoomSrc(slide);
            if (!src) return;
            this.lightboxIndex = index;
            this.lightboxImg.src = src;
            const slideImage = slide.querySelector('img');
            const sourceWidth = Number(slideImage?.getAttribute('width')) || 1200;
            const sourceHeight = Number(slideImage?.getAttribute('height')) || sourceWidth;
            this.lightboxImg.width = 2400;
            this.lightboxImg.height = Math.round((2400 * sourceHeight) / sourceWidth);
            this.lightboxImg.alt = slideImage?.alt || '';
            this.lightbox.hidden = false;
            document.body.classList.add('velotric-lightbox-open');
            this.updateLightboxNav();
            this.syncCarouselToIndex(index);
          }
          stepLightbox(dir) {
            const slides = this.getSlides();
            const len = slides.length;
            if (!len) return;
            let i = this.lightboxIndex ?? this.getCurrentSlideIndex();
            for (let n = 0; n < len; n++) {
              i = (i + dir + len) % len;
              if (this.getZoomSrc(slides[i])) {
                this.showLightboxSlide(i);
                return;
              }
            }
          }
          openLightbox() {
            const slides = this.getSlides();
            let index = this.getCurrentSlideIndex();
            if (!this.getZoomSrc(slides[index])) {
              const next = slides.findIndex((slide) => this.getZoomSrc(slide));
              if (next < 0) return;
              index = next;
            }
            this.showLightboxSlide(index);
            this.lightboxClose?.focus();
          }
          closeLightbox() {
            if (!this.lightbox || this.lightbox.hidden) return;
            this.lightbox.hidden = true;
            this.lightboxImg?.removeAttribute('src');
            document.body.classList.remove('velotric-lightbox-open');
            this.zoomBtn?.focus();
          }
          bindZoom() {
            if (!this.zoomBtn) return;
            this._onLightboxKeydown = (event) => {
              if (!this.lightbox || this.lightbox.hidden) return;
              if (event.key === 'Escape') this.closeLightbox();
              if (event.key === 'ArrowLeft') {
                event.preventDefault();
                this.stepLightbox(-1);
              }
              if (event.key === 'ArrowRight') {
                event.preventDefault();
                this.stepLightbox(1);
              }
            };
            this.zoomBtn.addEventListener('click', (event) => {
              event.preventDefault();
              event.stopPropagation();
              this.openLightbox();
            });
            this.lightboxClose?.addEventListener('click', (event) => {
              event.preventDefault();
              event.stopPropagation();
              this.closeLightbox();
            });
            this.lightboxPrev?.addEventListener('click', (event) => {
              event.preventDefault();
              event.stopPropagation();
              this.stepLightbox(-1);
            });
            this.lightboxNext?.addEventListener('click', (event) => {
              event.preventDefault();
              event.stopPropagation();
              this.stepLightbox(1);
            });
            this.lightbox?.addEventListener('click', (event) => {
              if (event.target === this.lightbox) this.closeLightbox();
            });
            this.lightboxImg?.addEventListener('click', (event) => event.stopPropagation());
            document.addEventListener('keydown', this._onLightboxKeydown);
            this.bindLightboxSwipe();
            this.updateZoomButton();
          }
          bindLightboxSwipe() {
            if (!this.lightbox) return;
            this._onLightboxTouchStart = (event) => {
              if (this.lightbox.hidden || this.countZoomableSlides() <= 1) return;
              const touch = event.changedTouches?.[0];
              if (!touch) return;
              this._lbSwipeX = touch.clientX;
              this._lbSwipeY = touch.clientY;
              this._lbSwipeDx = 0;
              this._lbSwiping = true;
              this._lbSwipeAxis = null;
            };
            this._onLightboxTouchMove = (event) => {
              if (!this._lbSwiping || this.lightbox.hidden) return;
              const touch = event.touches?.[0];
              if (!touch) return;
              const dx = touch.clientX - this._lbSwipeX;
              const dy = touch.clientY - this._lbSwipeY;
              if (!this._lbSwipeAxis) {
                if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
                this._lbSwipeAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
              }
              if (this._lbSwipeAxis !== 'x') return;
              event.preventDefault();
              this._lbSwipeDx = dx;
            };
            this._onLightboxTouchEnd = () => {
              if (!this._lbSwiping) return;
              this._lbSwiping = false;
              if (this._lbSwipeAxis !== 'x') {
                this._lbSwipeAxis = null;
                return;
              }
              this._lbSwipeAxis = null;
              const threshold = Math.min(56, window.innerWidth * 0.14);
              if (Math.abs(this._lbSwipeDx) < threshold) return;
              this.stepLightbox(this._lbSwipeDx < 0 ? 1 : -1);
            };
            this._onLightboxTouchCancel = () => {
              this._lbSwiping = false;
              this._lbSwipeAxis = null;
              this._lbSwipeDx = 0;
            };
            this.lightbox.addEventListener('touchstart', this._onLightboxTouchStart, { passive: true });
            this.lightbox.addEventListener('touchmove', this._onLightboxTouchMove, { passive: false });
            this.lightbox.addEventListener('touchend', this._onLightboxTouchEnd, { passive: true });
            this.lightbox.addEventListener('touchcancel', this._onLightboxTouchCancel, { passive: true });
          }
        }
      );
    }

document.addEventListener('change', (event) => {
  const target = event.target;
  if (!target || target.type !== 'radio') return;
  const container = target.closest('variant-selects');
  if (!container) return;
  const mapScript = container.querySelector('[data-variants-map]');
  if (!mapScript) return;
  let variantsMap;
  try { variantsMap = JSON.parse(mapScript.textContent); } catch (e) { return; }
  const selectedOptions = Array.from(container.querySelectorAll('fieldset input:checked')).map((input) => input.value);
  const variant = Object.values(variantsMap).find((item) =>
    item.options.length === selectedOptions.length && item.options.every((opt) => selectedOptions.includes(opt))
  );
  if (!variant) return;
  const url = new URL(window.location.href);
  url.searchParams.set('variant', variant.id);
  window.history.replaceState({}, '', url.href);
  document.querySelectorAll('[id^="price-"]').forEach((priceBox) => {
    const regularPrice = priceBox.querySelector('.aotos-flux-price__regular');
    if (regularPrice) regularPrice.textContent = variant.price_formatted;
    const comparePrice = priceBox.querySelector('.aotos-flux-price__compare-value');
    if (comparePrice) {
      comparePrice.textContent = variant.compare_at_price > variant.price ? variant.compare_at_price_formatted : '';
    }
    const onSale = variant.compare_at_price > variant.price;
    const saveBadge = priceBox.querySelector('.aotos-flux-price__save');
    if (saveBadge) saveBadge.textContent = onSale && variant.save_formatted ? `SAVE  ${variant.save_formatted}` : '';
    const wrapper = priceBox.querySelector('.aotos-flux-price__row');
    if (wrapper) wrapper.classList.toggle('is-sale', onSale);
  });
  document.querySelectorAll('[id^="ProductSubmitButton-"]').forEach((btn) => {
    const span = btn.querySelector('span');
    if (variant.available) {
      btn.removeAttribute('disabled');
      if (span) span.textContent = window.variantStrings ? window.variantStrings.addToCart : 'Add to cart';
    } else {
      btn.setAttribute('disabled', 'disabled');
      if (span) span.textContent = window.variantStrings ? window.variantStrings.soldOut : 'Sold out';
    }
  });
  document.querySelectorAll('product-form input.product-variant-id, product-form input[name="id"]').forEach((input) => {
    input.value = variant.id;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const carousel = document.querySelector('velotric-carousel');
  if (carousel && typeof carousel.renderInstantSlides === 'function' && variant.images) {
    carousel.renderInstantSlides(variant.images);
  }
  document.querySelectorAll('[data-product-spec-values]').forEach((element) => {
    try {
      const values = JSON.parse(element.dataset.productSpecValues);
      if (values[variant.id] != null) element.textContent = values[variant.id];
    } catch (err) {}
  });
  if (typeof publish !== 'undefined' && typeof PUB_SUB_EVENTS !== 'undefined') {
    publish(PUB_SUB_EVENTS.variantChange, {
      data: { variant, sectionId: container.dataset.section, html: document.documentElement }
    });
  }
});

document.addEventListener('click', (event) => {
  const toggle = event.target.closest('[data-perk-popover-toggle]');
  if (toggle) {
    event.preventDefault();
    const item = toggle.closest('.aotos-flux-perks__item');
    const open = !item.classList.contains('is-open');
    document.querySelectorAll('.aotos-flux-perks__item.is-open').forEach((el) => {
      if (el !== item) {
        el.classList.remove('is-open');
        el.querySelector('[data-perk-popover-toggle]')?.setAttribute('aria-expanded', 'false');
      }
    });
    item.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (!open) toggle.blur();
    return;
  }
  if (!event.target.closest('.aotos-flux-perks__item')) {
    document.querySelectorAll('.aotos-flux-perks__item.is-open').forEach((el) => {
      el.classList.remove('is-open');
      el.querySelector('[data-perk-popover-toggle]')?.setAttribute('aria-expanded', 'false');
    });
  }
});

if (!customElements.get('size-fit-drawer')) {
  customElements.define(
    'size-fit-drawer',
    class SizeFitDrawer extends HTMLElement {
      connectedCallback() {
        if (this.dataset.initialized === 'true') return;
        this.dataset.initialized = 'true';
        this.trigger = this.querySelector('[data-size-fit-open]');
        this.panel = this.querySelector('[data-size-fit-panel]');
        this.closeButtons = this.querySelectorAll('[data-size-fit-close]');
        this.tabs = Array.from(this.querySelectorAll('[data-size-fit-tab]'));
        this.images = Array.from(this.querySelectorAll('[data-size-fit-image]'));
        this.handleKeydown = this.handleKeydown.bind(this);
        this.show = this.show.bind(this);
        this.hide = this.hide.bind(this);
        this.trigger?.addEventListener('click', (event) => {
          event.preventDefault();
          this.show();
        });
        this.closeButtons.forEach((button) =>
          button.addEventListener('click', (event) => {
            event.preventDefault();
            this.hide();
          })
        );
        this.tabs.forEach((tab) => {
          tab.addEventListener('click', () => this.activateVariant(tab.dataset.sizeFitTab));
        });
      }
      disconnectedCallback() {
        document.removeEventListener('keydown', this.handleKeydown);
        document.body.classList.remove('size-fit-drawer-open');
      }
      show() {
        const urlVariant = new URL(window.location.href).searchParams.get('variant');
        this.activateVariant(urlVariant || this.dataset.initialVariant);
        this.setAttribute('open', '');
        this.trigger?.setAttribute('aria-expanded', 'true');
        this.panel?.setAttribute('aria-hidden', 'false');
        document.body.classList.add('size-fit-drawer-open');
        document.addEventListener('keydown', this.handleKeydown);
        requestAnimationFrame(() => this.panel?.focus());
      }
      hide() {
        this.removeAttribute('open');
        this.trigger?.setAttribute('aria-expanded', 'false');
        this.panel?.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('size-fit-drawer-open');
        document.removeEventListener('keydown', this.handleKeydown);
        this.trigger?.focus();
      }
      activateVariant(variantId) {
        const activeTab = this.tabs.find((tab) => tab.dataset.sizeFitTab === String(variantId)) || this.tabs[0];
        if (!activeTab) return;
        this.tabs.forEach((tab) => {
          const isActive = tab === activeTab;
          tab.setAttribute('aria-selected', String(isActive));
          tab.tabIndex = isActive ? 0 : -1;
        });
        this.images.forEach((image) => {
          image.setAttribute('aria-hidden', String(image.dataset.sizeFitImage !== activeTab.dataset.sizeFitTab));
        });
      }
      handleKeydown(event) {
        if (event.key === 'Escape') this.hide();
      }
    }
  );
}

const relocateSpecs = () => {
  document.querySelectorAll('.aotos-flux').forEach((root) => {
    const specs = root.querySelector('[data-product-specs]');
    const desktop = root.querySelector('[data-product-specs-desktop]');
    const mobile = root.querySelector('[data-product-specs-mobile]');
    if (!specs || !desktop || !mobile) return;
    if (window.matchMedia('(max-width: 768px)').matches) {
      if (specs.parentElement !== mobile) mobile.appendChild(specs);
    } else if (specs.parentElement !== desktop) {
      desktop.appendChild(specs);
    }
  });
};
relocateSpecs();
window.addEventListener('resize', relocateSpecs, { passive: true });

const relocateXcotton = () => {
  document.querySelectorAll('.aotos-flux').forEach((root) => {
    const mount = root.querySelector('#ProductBlockXcotton');
    if (!mount || mount.dataset.xcottonBound) return;
    mount.dataset.xcottonBound = '1';
    const place = () => {
      root.querySelectorAll('.xcotton-productProtection-detail-warp').forEach((widget) => {
        if (!mount.contains(widget)) mount.appendChild(widget);
      });
      const inside = mount.querySelectorAll('.xcotton-productProtection-detail-warp');
      for (let i = 0; i < inside.length - 1; i += 1) inside[i].remove();
    };
    place();
    new MutationObserver(place).observe(root, { childList: true, subtree: true });
  });
};
relocateXcotton();

document.querySelectorAll('.product-rating').forEach((root) => {
  const badge = root.querySelector('.product-rating__badge');
  const placeholder = root.querySelector('.product-rating__placeholder');
  if (!badge || !placeholder) return;
  const reveal = () => {
    const badgeRoot = badge.querySelector('.jdgm-prev-badge');
    const count = parseInt(badgeRoot?.getAttribute('data-number-of-reviews') || '0', 10);
    if (!badgeRoot || count < 1) return false;
    const countEl = root.querySelector('.product-rating__count');
    if (countEl) {
      const label = countEl.textContent.replace(/^\s*\d+\s*/, '').trim() || 'reviews';
      countEl.textContent = `${count} ${label}`;
    }
    root.classList.add('is-rating-ready');
    badge.removeAttribute('aria-hidden');
    placeholder.setAttribute('aria-hidden', 'true');
    observer.disconnect();
    return true;
  };
  const observer = new MutationObserver(reveal);
  if (!reveal()) observer.observe(badge, { childList: true, subtree: true, characterData: true });
});
