import { TestBed } from '@angular/core/testing';
import { UploadTemplateDialogComponent } from './upload-template-dialog.component';
import { MatDialogRef } from '@angular/material/dialog';

describe('UploadTemplateDialogComponent', () => {
  const mockDialogRef = { close: jasmine.createSpy('close') };

  beforeEach(async () => {
    mockDialogRef.close.calls.reset();
    await TestBed.configureTestingModule({
      imports: [UploadTemplateDialogComponent],
      providers: [{ provide: MatDialogRef, useValue: mockDialogRef }],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(UploadTemplateDialogComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('selectedFileName returns empty when no file', () => {
    const fixture = TestBed.createComponent(UploadTemplateDialogComponent);
    expect(fixture.componentInstance.selectedFileName).toBe('');
  });

  it('selectedFileName returns file name when file set', () => {
    const fixture = TestBed.createComponent(UploadTemplateDialogComponent);
    fixture.componentInstance.selectedFile.set({ name: 'test.html' } as File);
    expect(fixture.componentInstance.selectedFileName).toBe('test.html');
  });

  it('browse clears error and triggers file input click', () => {
    const fixture = TestBed.createComponent(UploadTemplateDialogComponent);
    fixture.detectChanges();
    fixture.componentInstance.errorMessage.set('err');
    fixture.componentInstance.browse();
    expect(fixture.componentInstance.errorMessage()).toBeNull();
  });

  it('onFilenameKeydown preventDefault and browse on space', () => {
    const fixture = TestBed.createComponent(UploadTemplateDialogComponent);
    fixture.detectChanges();
    const e = { key: ' ', preventDefault: jasmine.createSpy() } as unknown as KeyboardEvent;
    fixture.componentInstance.onFilenameKeydown(e as Event);
    expect(e.preventDefault).toHaveBeenCalled();
  });

  it('onFilenameKeydown does nothing when key is not space', () => {
    const fixture = TestBed.createComponent(UploadTemplateDialogComponent);
    fixture.detectChanges();
    const e = { key: 'Enter', preventDefault: jasmine.createSpy() } as unknown as KeyboardEvent;
    fixture.componentInstance.onFilenameKeydown(e as Event);
    expect(e.preventDefault).not.toHaveBeenCalled();
  });

  it('onFileSelected sets error for non-html file', () => {
    const fixture = TestBed.createComponent(UploadTemplateDialogComponent);
    const input = document.createElement('input');
    input.type = 'file';
    Object.defineProperty(input, 'files', { value: [{ name: 'x.txt' }], configurable: true });
    const e = { target: input } as unknown as Event;
    fixture.componentInstance.onFileSelected(e);
    expect(fixture.componentInstance.errorMessage()).toBe('Invalid file type');
    expect(fixture.componentInstance.selectedFile()).toBeNull();
  });

  it('onFileSelected sets selectedFile for .html file', () => {
    const fixture = TestBed.createComponent(UploadTemplateDialogComponent);
    const file = new File([''], 't.html', { type: 'text/html' });
    const input = document.createElement('input');
    input.type = 'file';
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    const e = { target: input } as unknown as Event;
    fixture.componentInstance.onFileSelected(e);
    expect(fixture.componentInstance.selectedFile()).toBe(file);
  });

  it('onFileSelected clears selection when no file', () => {
    const fixture = TestBed.createComponent(UploadTemplateDialogComponent);
    fixture.componentInstance.selectedFile.set(new File([''], 'x.html', { type: 'text/html' }));
    const input = document.createElement('input');
    input.type = 'file';
    Object.defineProperty(input, 'files', { value: [], configurable: true });
    const e = { target: input } as unknown as Event;
    fixture.componentInstance.onFileSelected(e);
    expect(fixture.componentInstance.selectedFile()).toBeNull();
  });

  it('ok does nothing when no file', () => {
    const fixture = TestBed.createComponent(UploadTemplateDialogComponent);
    fixture.componentInstance.ok();
    expect(mockDialogRef.close).not.toHaveBeenCalled();
  });

  it('ok sets error and does not close when file has invalid extension', () => {
    const fixture = TestBed.createComponent(UploadTemplateDialogComponent);
    const file = new File([''], 'bad.txt', { type: 'text/plain' });
    fixture.componentInstance.selectedFile.set(file);
    fixture.componentInstance.ok();
    expect(fixture.componentInstance.errorMessage()).toBe('Invalid file type');
    expect(mockDialogRef.close).not.toHaveBeenCalled();
  });

  it('ok reads file and closes with result on success', (done) => {
    const fixture = TestBed.createComponent(UploadTemplateDialogComponent);
    const file = new File(['<p>hello</p>'], 't.html', { type: 'text/html' });
    fixture.componentInstance.selectedFile.set(file);
    fixture.componentInstance.ok();
    setTimeout(() => {
      expect(mockDialogRef.close).toHaveBeenCalledWith({ content: '<p>hello</p>', fileName: 't.html' });
      done();
    }, 50);
  });

  it('ok sets error when FileReader fails', (done) => {
    const fixture = TestBed.createComponent(UploadTemplateDialogComponent);
    const file = new File([''], 't.html', { type: 'text/html' });
    fixture.componentInstance.selectedFile.set(file);
    const origReader = window.FileReader;
    (window as unknown as { FileReader: unknown }).FileReader = class {
      readAsText(): void {
        setTimeout(() => {
          if (this.onerror) this.onerror(new ProgressEvent('error'));
        }, 0);
      }
      onerror: ((e: ProgressEvent) => void) | null = null;
    } as unknown as typeof FileReader;
    fixture.componentInstance.ok();
    setTimeout(() => {
      expect(fixture.componentInstance.errorMessage()).toBe('Could not read file');
      (window as unknown as { FileReader: unknown }).FileReader = origReader;
      done();
    }, 50);
  });

  it('cancel closes dialog', () => {
    const fixture = TestBed.createComponent(UploadTemplateDialogComponent);
    fixture.componentInstance.cancel();
    expect(mockDialogRef.close).toHaveBeenCalledWith();
  });
});
