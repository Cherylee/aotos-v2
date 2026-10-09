if (!customElements.get('aotos-option-modal')) {
  customElements.define(
    'aotos-option-modal',
    class AotosOptionModal extends HTMLElement {
      connectedCallback() {
        if (!this.bound) {
          this.bound = true;
          this.variants = JSON.parse(this.querySelector('[data-opt-variants]').textContent);
          this.optionCount = Number(this.dataset.optionCount || 1);
          this.selected = this.variants.find((item) => item.available)?.options?.slice() || this.variants[0]?.options?.slice() || [];
          this.img = this.querySelector('[data-opt-image]');
          this.priceEl = this.querySelector('[data-opt-price]');
          this.idInput = this.querySelector('input.product-variant-id');
          this.addBtn = this.querySelector('[name="add"]');
          this.querySelectorAll('[data-opt-close]').forEach((el) => {
            el.addEventListener('click', () => this.close());
          });
          this.querySelectorAll('[data-opt-value]').forEach((btn) => {
            btn.addEventListener('click', () => this.pick(btn));
          });
          this.keyHandler = (event) => {
            if (event.key === 'Escape' && this.classList.contains('is-open')) this.close();
          };
          this.sync();
        }
        document.addEventListener('keydown', this.keyHandler);
        this.bindCartClose();
      }

      bindCartClose() {
        if (this.unsubscribeCart) this.unsubscribeCart();
        if (typeof subscribe !== 'function' || typeof PUB_SUB_EVENTS === 'undefined') return;
        this.unsubscribeCart = subscribe(PUB_SUB_EVENTS.cartUpdate, () => {
          if (this.classList.contains('is-open')) this.close();
        });
      }

      disconnectedCallback() {
        document.removeEventListener('keydown', this.keyHandler);
        if (this.unsubscribeCart) {
          this.unsubscribeCart();
          this.unsubscribeCart = null;
        }
      }

      open(opener) {
        this.opener = opener;
        const others = document.querySelectorAll(`aotos-option-modal[data-product="${this.dataset.product}"]`);
        others.forEach((el) => {
          if (el !== this) el.remove();
        });
        document.body.appendChild(this);
        this.hidden = false;
        this.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        const dialog = this.querySelector('.aotos-opt-modal__dialog');
        if (dialog) dialog.focus();
      }

      close() {
        this.classList.remove('is-open');
        this.hidden = true;
        document.body.style.overflow = '';
      }

      pick(btn) {
        const index = Number(btn.dataset.optionIndex);
        this.selected[index] = btn.dataset.optValue;
        this.sync();
      }

      findVariant() {
        return this.variants.find((variant) =>
          variant.options.every((value, index) => value === this.selected[index])
        );
      }

      isValueAvailable(optionIndex, value) {
        return this.variants.some((variant) => {
          if (!variant.available) return false;
          return variant.options.every((opt, index) =>
            index === optionIndex ? opt === value : opt === this.selected[index]
          );
        });
      }

      sync() {
        const variant = this.findVariant();
        this.querySelectorAll('[data-opt-value]').forEach((btn) => {
          const index = Number(btn.dataset.optionIndex);
          const value = btn.dataset.optValue;
          btn.classList.toggle('is-active', this.selected[index] === value);
          btn.classList.toggle('is-unavailable', !this.isValueAvailable(index, value));
        });
        if (!variant) {
          if (this.idInput) this.idInput.disabled = true;
          if (this.addBtn) this.addBtn.disabled = true;
          return;
        }
        if (this.idInput) {
          this.idInput.disabled = !variant.available;
          this.idInput.value = String(variant.id);
        }
        if (this.priceEl && variant.price) this.priceEl.textContent = variant.price;
        if (this.img && variant.image) this.img.src = variant.image;
        if (this.addBtn) this.addBtn.disabled = !variant.available;
      }
    }
  );

  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-aotos-opt-open]');
    if (!opener) return;
    event.preventDefault();
    const modal = document.getElementById(opener.getAttribute('data-aotos-opt-open'));
    if (modal && typeof modal.open === 'function') modal.open(opener);
  });
}
