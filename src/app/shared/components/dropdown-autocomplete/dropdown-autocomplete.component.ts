import {
  Component,
  input,
  output,
  signal,
  computed,
  effect,
  inject,
  HostListener,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DropdownAutocompleteOption {
  value: string | null;
  label: string;
}

@Component({
  selector: 'app-dropdown-autocomplete',
  host: {
    '[class.dropdown-autocomplete-compact]': 'compact()',
    '[class.dropdown-autocomplete-open]': 'isOpen()',
  },
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dropdown-autocomplete.component.html',
  styleUrl: './dropdown-autocomplete.component.scss',
})
export class DropdownAutocompleteComponent {
  readonly options = input.required<DropdownAutocompleteOption[]>();
  /** Option values to always show at top (e.g. "New Template") even when filtering. */
  readonly alwaysShowValues = input<(string | null)[]>([]);
  readonly value = input<string | null>(null);
  readonly displayValue = input<string>('');
  readonly valueChange = output<string | null>();
  readonly placeholder = input('Search or select...');
  readonly inputId = input('');
  readonly compact = input(false);

  readonly searchQuery = signal('');
  readonly isOpen = signal(false);

  private readonly elRef = inject(ElementRef<HTMLElement>);

  @ViewChild('inputRef') private inputRef?: ElementRef<HTMLInputElement>;

  /** What to show in the input: when closed use displayValue, when open use search query. */
  readonly inputDisplay = computed(() => {
    if (this.isOpen()) return this.searchQuery();
    return this.displayValue() || '';
  });

  readonly filteredOptions = computed(() => {
    const all = this.options();
    const query = (this.searchQuery() ?? '').trim().toLowerCase();
    const always = this.alwaysShowValues();
    const pinned = always.length ? all.filter((o) => always.includes(o.value)) : [];
    const rest = always.length ? all.filter((o) => !always.includes(o.value)) : all;
    if (!query) return all;
    const filtered = rest.filter((o) => (o.label ?? '').toLowerCase().includes(query));
    return [...pinned, ...filtered];
  });

  constructor() {
    effect(() => {
      const selectedValue = this.value();
      this.options();
      if (!this.isOpen()) {
        const matchedOption = this.options().find((option) => option.value === selectedValue);
        this.searchQuery.set(matchedOption?.label ?? '');
      }
    }, { allowSignalWrites: true });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    const host = this.elRef.nativeElement;
    if (host.contains(e.target as Node)) return;
    this.close();
  }

  onFocus(): void {
    this.isOpen.set(true);
    this.searchQuery.set(this.displayValue() || '');
    setTimeout(() => this.inputRef?.nativeElement?.focus(), 0);
  }

  onInput(e: Event): void {
    const inputValue = (e.target as HTMLInputElement).value;
    this.searchQuery.set(inputValue ?? '');
  }

  onBlur(): void {
    setTimeout(() => this.close(), 150);
  }

  close(): void {
    this.isOpen.set(false);
    this.searchQuery.set('');
  }

  select(opt: DropdownAutocompleteOption): void {
    this.valueChange.emit(opt.value);
    this.close();
  }

  /** Remove focus from the input (e.g. after parent saves a new template). */
  blurInput(): void {
    this.close();
    this.inputRef?.nativeElement?.blur();
  }
}
