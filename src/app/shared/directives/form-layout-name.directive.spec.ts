import { TestBed } from '@angular/core/testing';
import { FormLayoutNameDirective } from './form-layout-name.directive';
import { Component, ElementRef } from '@angular/core';
import { SavedLayoutsService } from '../../core/services/saved-layouts.service';

@Component({
  standalone: true,
  template: '<form appFormLayoutName></form>',
  imports: [FormLayoutNameDirective],
})
class TestComponent {}

describe('FormLayoutNameDirective', () => {
  let savedLayouts: { selectedLayout: jasmine.Spy };

  beforeEach(async () => {
    savedLayouts = { selectedLayout: jasmine.createSpy().and.returnValue({ name: ' My Layout ' }) };
    await TestBed.configureTestingModule({
      imports: [TestComponent],
      providers: [{ provide: SavedLayoutsService, useValue: savedLayouts }],
    }).compileComponents();
  });

  it('should set data-form-group from selected layout name slugified', () => {
    const fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();
    const form = fixture.nativeElement.querySelector('form');
    expect(form.getAttribute('data-form-group')).toBe('my_layout');
  });

  it('should use "form" when no layout', () => {
    savedLayouts.selectedLayout.and.returnValue(null);
    const fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();
    const form = fixture.nativeElement.querySelector('form');
    expect(form.getAttribute('data-form-group')).toBe('form');
  });
});
