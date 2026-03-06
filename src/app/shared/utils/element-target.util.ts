/**
 * Resolves the element key (for right-panel "element" class targeting) from a clicked DOM element,
 * using component class names instead of data-class-target.
 */
export function getElementKeyFromElement(el: Element | null): string | null {
  if (!el) return null;
  const target = el.closest?.('.widget-input-control, .widget-label-control, .widget-checkbox-control, .widget-checkbox-label, .widget-radio-group-label, .widget-radio-item, .widget-radio-option-input, .widget-table-wrap');
  if (!target) return null;
  if (target.classList.contains('widget-input-control') || target.classList.contains('widget-label-control')) return 'control';
  if (target.classList.contains('widget-checkbox-control')) return 'checkbox';
  if (target.classList.contains('widget-checkbox-label')) return 'label';
  if (target.classList.contains('widget-radio-group-label')) return 'group-label';
  if (target.classList.contains('widget-table-wrap')) return 'table';
  if (target.classList.contains('widget-radio-option-input')) {
    const item = target.closest('.widget-radio-item');
    if (!item?.parentElement) return null;
    const items = Array.from(item.parentElement.children).filter((c) => c.classList.contains('widget-radio-item'));
    const i = items.indexOf(item);
    return i >= 0 ? `option-${i}-input` : null;
  }
  if (target.classList.contains('widget-radio-item')) {
    const group = target.closest('.widget-radio-group');
    if (!group) return null;
    const items = Array.from(group.children).filter((c) => c.classList.contains('widget-radio-item'));
    const i = items.indexOf(target);
    return i >= 0 ? `option-${i}` : null;
  }
  return null;
}
