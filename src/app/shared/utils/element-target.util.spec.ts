import { getElementKeyFromElement } from './element-target.util';

describe('element-target.util', () => {
  it('returns null for null element', () => {
    expect(getElementKeyFromElement(null)).toBeNull();
  });

  it('returns null when no matching class in hierarchy', () => {
    const el = document.createElement('div');
    expect(getElementKeyFromElement(el)).toBeNull();
  });

  it('returns "control" for widget-input-control', () => {
    const div = document.createElement('div');
    div.className = 'widget-input-control';
    expect(getElementKeyFromElement(div)).toBe('control');
  });

  it('returns "control" for widget-label-control', () => {
    const div = document.createElement('div');
    div.className = 'widget-label-control';
    expect(getElementKeyFromElement(div)).toBe('control');
  });

  it('returns "checkbox" for widget-checkbox-control', () => {
    const div = document.createElement('div');
    div.className = 'widget-checkbox-control';
    expect(getElementKeyFromElement(div)).toBe('checkbox');
  });

  it('returns "label" for widget-checkbox-label', () => {
    const div = document.createElement('div');
    div.className = 'widget-checkbox-label';
    expect(getElementKeyFromElement(div)).toBe('label');
  });

  it('returns "table" for widget-table-wrap', () => {
    const div = document.createElement('div');
    div.className = 'widget-table-wrap';
    expect(getElementKeyFromElement(div)).toBe('table');
  });

  it('returns "group-label" for widget-radio-group-label', () => {
    const div = document.createElement('div');
    div.className = 'widget-radio-group-label';
    expect(getElementKeyFromElement(div)).toBe('group-label');
  });

  it('returns option-0 for first widget-radio-item', () => {
    const group = document.createElement('div');
    group.className = 'widget-radio-group';
    const item0 = document.createElement('div');
    item0.className = 'widget-radio-item';
    const item1 = document.createElement('div');
    item1.className = 'widget-radio-item';
    group.appendChild(item0);
    group.appendChild(item1);
    expect(getElementKeyFromElement(item0)).toBe('option-0');
    expect(getElementKeyFromElement(item1)).toBe('option-1');
  });

  it('returns option-0-input for widget-radio-option-input inside first item', () => {
    const parent = document.createElement('div');
    const item0 = document.createElement('div');
    item0.className = 'widget-radio-item';
    const input = document.createElement('div');
    input.className = 'widget-radio-option-input';
    parent.appendChild(item0);
    item0.appendChild(input);
    expect(getElementKeyFromElement(input)).toBe('option-0-input');
  });

  it('uses closest to find ancestor', () => {
    const wrap = document.createElement('div');
    wrap.className = 'widget-input-control';
    const child = document.createElement('span');
    wrap.appendChild(child);
    expect(getElementKeyFromElement(child)).toBe('control');
  });
});
