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
  readonly options = input.required<SearchableSelectOption[]>();
  readonly value = input<string | null>(null);
  readonly valueChange = output<string | null>();
  readonly placeholder = input('Search or select...');
  readonly formFieldClass = input('');
  readonly inputId = input('');
  readonly compact = input(false);

  readonly searchQuery = signal('');

  readonly filteredOptions = computed(() => {
    const all = this.options();
    const query = (this.searchQuery() ?? '').trim().toLowerCase();
    if (!query) return all;
    return all.filter((o) =>
      (o.label ?? '').toLowerCase().includes(query)
    );
  });

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
