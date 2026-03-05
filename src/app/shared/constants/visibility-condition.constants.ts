/**
 * Reactive-form-style visibility condition snippets.
 * Placeholders: {form} = layout name (data-form-group), {ctrl} = control name (formControlName), {grp} = nested group name.
 * Path pattern: {form}.{ctrl} for flat form, or {form}.{grp}.{ctrl} for nested group.
 */
export interface VisibilityConditionSnippet {
  /** Label shown in the dropdown */
  label: string;
  /** Expression template with {form}, {ctrl} and optionally {grp} placeholders */
  template: string;
  /** Whether this snippet uses form group (requires {grp}) */
  usesGroup?: boolean;
}

export const VISIBILITY_CONDITION_SNIPPETS: VisibilityConditionSnippet[] = [
  {
    label: 'Invalid and (dirty or touched)',
    template: '{form}.{ctrl}.invalid && ({form}.{ctrl}.dirty || {form}.{ctrl}.touched)',
  },
  {
    label: 'Touched and required error',
    template: "{form}.{ctrl}.touched && {form}.{ctrl}.errors?.['required']",
  },
  {
    label: 'Invalid and touched',
    template: '{form}.{ctrl}.invalid && {form}.{ctrl}.touched',
  },
  {
    label: 'Invalid and dirty',
    template: '{form}.{ctrl}.invalid && {form}.{ctrl}.dirty',
  },
  {
    label: 'Touched with any error',
    template: '{form}.{ctrl}.touched && {form}.{ctrl}.errors',
  },
  {
    label: "Required error only",
    template: "{form}.{ctrl}.errors?.['required']",
  },
  {
    label: "Email error",
    template: "{form}.{ctrl}.errors?.['email']",
  },
  {
    label: "Minlength error",
    template: "{form}.{ctrl}.errors?.['minlength']",
  },
  {
    label: "Maxlength error",
    template: "{form}.{ctrl}.errors?.['maxlength']",
  },
  {
    label: "Pattern error",
    template: "{form}.{ctrl}.errors?.['pattern']",
  },
  {
    label: "Min error",
    template: "{form}.{ctrl}.errors?.['min']",
  },
  {
    label: "Max error",
    template: "{form}.{ctrl}.errors?.['max']",
  },
  {
    label: 'Nested: invalid and touched (with form group)',
    template: '{form}.{grp}.{ctrl}.invalid && {form}.{grp}.{ctrl}.touched',
    usesGroup: true,
  },
  {
    label: 'Nested: touched and required error (with form group)',
    template: "{form}.{grp}.{ctrl}.touched && {form}.{grp}.{ctrl}.errors?.['required']",
    usesGroup: true,
  },
];
