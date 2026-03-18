import {
  copyFormValues,
  stripBuilderChrome,
  stripComponentWrappers,
} from './preview-html.util';

describe('preview-html.util', () => {
  describe('copyFormValues', () => {
    it('copies text input value to clone', () => {
      const source = document.createElement('div');
      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'hello';
      source.appendChild(input);
      const clone = document.createElement('div');
      const cloneInput = document.createElement('input');
      cloneInput.type = 'text';
      clone.appendChild(cloneInput);
      copyFormValues(source, clone);
      expect(cloneInput.value).toBe('hello');
    });

    it('copies checkbox checked state', () => {
      const source = document.createElement('div');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = true;
      source.appendChild(input);
      const clone = document.createElement('div');
      const cloneInput = document.createElement('input');
      cloneInput.type = 'checkbox';
      clone.appendChild(cloneInput);
      copyFormValues(source, clone);
      expect(cloneInput.checked).toBe(true);
    });

    it('copies textarea value', () => {
      const source = document.createElement('div');
      const ta = document.createElement('textarea');
      ta.value = 'text';
      source.appendChild(ta);
      const clone = document.createElement('div');
      const cloneTa = document.createElement('textarea');
      clone.appendChild(cloneTa);
      copyFormValues(source, clone);
      expect(cloneTa.value).toBe('text');
    });
  });

  describe('stripBuilderChrome', () => {
    it('removes builder selectors', () => {
      const clone = document.createElement('div');
      const toolbar = document.createElement('div');
      toolbar.className = 'canvas-toolbar';
      clone.appendChild(toolbar);
      stripBuilderChrome(clone);
      expect(clone.querySelector('.canvas-toolbar')).toBeNull();
    });

    it('removes outline classes', () => {
      const clone = document.createElement('div');
      const cell = document.createElement('div');
      cell.className = 'canvas-cell-selected';
      clone.appendChild(cell);
      stripBuilderChrome(clone);
      expect(cell.classList.contains('canvas-cell-selected')).toBe(false);
    });

    it('sets draggable to false', () => {
      const clone = document.createElement('div');
      const el = document.createElement('div');
      el.setAttribute('draggable', 'true');
      clone.appendChild(el);
      stripBuilderChrome(clone);
      expect(el.getAttribute('draggable')).toBe('false');
    });

    it('strips Angular when stripAngular !== false', () => {
      const clone = document.createElement('div');
      clone.setAttribute('_ngcontent-xyz', '');
      stripBuilderChrome(clone);
      expect(clone.hasAttribute('_ngcontent-xyz')).toBe(false);
    });

    it('keeps Angular attributes when stripAngular is false', () => {
      const clone = document.createElement('div');
      clone.setAttribute('_ngcontent-xyz', '');
      stripBuilderChrome(clone, { stripAngular: false });
      expect(clone.hasAttribute('_ngcontent-xyz')).toBe(true);
    });
  });

  describe('stripComponentWrappers', () => {
    it('unwraps app-widget-label keeping inner content', () => {
      const root = document.createElement('div');
      const wrapper = document.createElement('app-widget-label');
      const inner = document.createElement('label');
      inner.textContent = 'Label';
      wrapper.appendChild(inner);
      root.appendChild(wrapper);
      stripComponentWrappers(root);
      expect(root.querySelector('app-widget-label')).toBeNull();
      expect(root.querySelector('label')?.textContent).toBe('Label');
    });
  });
});
