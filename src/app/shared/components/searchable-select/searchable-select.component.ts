import {
  Component,
  input,
  output,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

export interface SearchableSelectOption {
  value: string | null;
  label: string;
}

@Component({
  selector: 'app-searchable-select',
  host: { '[class.searchable-select-compact]': 'compact()' },
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
  ],
  templateUrl: './searchable-select.component.html',
  styleUrl: './searchable-select.component.scss',
})
export class SearchableSelectComponent {
  /** Options to display. Filtered by search query. */
  readonly options = input.required<SearchableSelectOption[]>();

  /** Currently selected value (string id or null). */
  readonly value = input<string | null>(null);

  /** Emitted when selection changes. */
  readonly valueChange = output<string | null>();

  /** Placeholder when empty. */
  readonly placeholder = input('Search or select...');

  /** Optional CSS class for the form field. */
  readonly formFieldClass = input('');

  /** Optional id for the input (for label[for]). */
  readonly inputId = input('');

  /** Use compact styling (for toolbars). */
  readonly compact = input(false);

  /** Search query (what user types). */
  readonly searchQuery = signal('');

  /** Options filtered by search query. Parent provides full list; we filter here by label. */
  readonly filteredOptions = computed(() => {
    const all = this.options();
    const query = (this.searchQuery() ?? '').trim().toLowerCase();
    if (!query) return all;
    return all.filter((o) =>
      (o.label ?? '').toLowerCase().includes(query)
    );
  });

  /** Display text for the current value. */
  readonly displayText = computed(() => {
    const val = this.value();
    if (val === null || val === undefined) return '';
    const opt = this.options().find((o) => o.value === val);
    return opt?.label ?? '';
  });

  readonly displayOption = (opt: SearchableSelectOption | null): string =>
    opt?.label ?? '';

  constructor() {
    effect(() => this.searchQuery.set(this.displayText()));
  }

  onInput(value: string): void {
    this.searchQuery.set(value ?? '');
  }

  onOptionSelected(opt: SearchableSelectOption): void {
    this.searchQuery.set(opt.value === null ? '' : opt.label);
    this.valueChange.emit(opt.value);
  }
}
