import { TestBed } from '@angular/core/testing';
import { DropdownAutocompleteComponent, DropdownAutocompleteOption } from './dropdown-autocomplete.component';

describe('DropdownAutocompleteComponent', () => {
  const options: DropdownAutocompleteOption[] = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DropdownAutocompleteComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DropdownAutocompleteComponent);
    fixture.componentRef.setInput('options', options);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('inputDisplay shows displayValue when closed', () => {
    const fixture = TestBed.createComponent(DropdownAutocompleteComponent);
    fixture.componentRef.setInput('options', options);
    fixture.componentRef.setInput('displayValue', 'Selected');
    fixture.detectChanges();
    expect(fixture.componentInstance.inputDisplay()).toBe('Selected');
  });

  it('filteredOptions returns all when no query', () => {
    const fixture = TestBed.createComponent(DropdownAutocompleteComponent);
    fixture.componentRef.setInput('options', options);
    fixture.detectChanges();
    expect(fixture.componentInstance.filteredOptions().length).toBe(2);
  });

  it('onFocus sets isOpen true', () => {
    const fixture = TestBed.createComponent(DropdownAutocompleteComponent);
    fixture.componentRef.setInput('options', options);
    fixture.detectChanges();
    fixture.componentInstance.onFocus();
    expect(fixture.componentInstance.isOpen()).toBe(true);
  });

  it('onInput updates searchQuery', () => {
    const fixture = TestBed.createComponent(DropdownAutocompleteComponent);
    fixture.componentRef.setInput('options', options);
    fixture.detectChanges();
    const e = { target: { value: 'test' } } as unknown as Event;
    fixture.componentInstance.onInput(e);
    expect(fixture.componentInstance.searchQuery()).toBe('test');
  });

  it('close sets isOpen false and clears searchQuery', () => {
    const fixture = TestBed.createComponent(DropdownAutocompleteComponent);
    fixture.componentRef.setInput('options', options);
    fixture.detectChanges();
    fixture.componentInstance.onFocus();
    fixture.componentInstance.close();
    expect(fixture.componentInstance.isOpen()).toBe(false);
    expect(fixture.componentInstance.searchQuery()).toBe('');
  });

  it('select emits valueChange and closes', () => {
    const fixture = TestBed.createComponent(DropdownAutocompleteComponent);
    fixture.componentRef.setInput('options', options);
    fixture.detectChanges();
    let value: string | null = null;
    fixture.componentInstance.valueChange.subscribe((v) => (value = v));
    fixture.componentInstance.select(options[0]);
    expect(value).not.toBeNull();
    expect(value === 'a').toBe(true);
    expect(fixture.componentInstance.isOpen()).toBe(false);
  });

  it('blurInput closes and blurs input', () => {
    const fixture = TestBed.createComponent(DropdownAutocompleteComponent);
    fixture.componentRef.setInput('options', options);
    fixture.detectChanges();
    fixture.componentInstance.onFocus();
    fixture.componentInstance.blurInput();
    expect(fixture.componentInstance.isOpen()).toBe(false);
  });

  it('filteredOptions filters by query', () => {
    const fixture = TestBed.createComponent(DropdownAutocompleteComponent);
    fixture.componentRef.setInput('options', options);
    fixture.detectChanges();
    fixture.componentInstance.searchQuery.set('option b');
    expect(fixture.componentInstance.filteredOptions().length).toBe(1);
    expect(fixture.componentInstance.filteredOptions()[0].label).toBe('Option B');
  });
});
