import { TestBed } from '@angular/core/testing';
import { PreviewModalComponent, PreviewModalData } from './preview-modal.component';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DomSanitizer } from '@angular/platform-browser';

describe('PreviewModalComponent', () => {
  const mockDialogRef = { close: jasmine.createSpy('close') };
  const mockSanitizer = { bypassSecurityTrustHtml: (v: string) => v };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreviewModalComponent],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { html: '<p>test</p>' } as PreviewModalData },
        { provide: DomSanitizer, useValue: mockSanitizer },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(PreviewModalComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('title returns data.title when set', () => {
    TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: { title: 'My Preview', html: '' } });
    const fixture = TestBed.createComponent(PreviewModalComponent);
    expect(fixture.componentInstance.title).toBe('My Preview');
  });

  it('title returns Preview when data.title not set', () => {
    const fixture = TestBed.createComponent(PreviewModalComponent);
    expect(fixture.componentInstance.title).toBe('Preview');
  });

  it('html returns data.html', () => {
    const fixture = TestBed.createComponent(PreviewModalComponent);
    expect(fixture.componentInstance.html).toBe('<p>test</p>');
  });

  it('previewDoc returns document string with html', () => {
    const fixture = TestBed.createComponent(PreviewModalComponent);
    const doc = fixture.componentInstance.previewDoc();
    expect(doc).toContain('<!DOCTYPE html>');
    expect(doc).toContain('<p>test</p>');
  });

  it('sanitizedSrcdoc calls sanitizer', () => {
    const fixture = TestBed.createComponent(PreviewModalComponent);
    const result = fixture.componentInstance.sanitizedSrcdoc;
    expect(result).toBeTruthy();
  });

  it('close closes dialog', () => {
    const fixture = TestBed.createComponent(PreviewModalComponent);
    fixture.componentInstance.close();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });

  it('copyToClipboard writes html to clipboard', async () => {
    const fixture = TestBed.createComponent(PreviewModalComponent);
    const writeSpy = jasmine.createSpy().and.returnValue(Promise.resolve());
    const clipboardMock = { writeText: writeSpy };
    Object.defineProperty(navigator, 'clipboard', { value: clipboardMock, configurable: true });
    fixture.componentInstance.copyToClipboard();
    await Promise.resolve();
    expect(writeSpy).toHaveBeenCalledWith('<p>test</p>');
  });
});
