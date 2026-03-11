/**
 * Application enums - shared constants for type safety and readability.
 */

/** Layout actions for drag-and-drop (add row/column to table). */
export const LayoutAction = { Row: 'row', Col: 'col' } as const;
export type LayoutActionType = (typeof LayoutAction)[keyof typeof LayoutAction];

/** Grid actions for drag-and-drop (add row/column to grid widget only). */
export const GridAction = { Row: 'grid-row', Col: 'grid-col' } as const;
export type GridActionType = (typeof GridAction)[keyof typeof GridAction];

/** Drop position: before or after the target row/column. */
export const LayoutDropPosition = { Before: 'before', After: 'after' } as const;
export type LayoutDropPositionType = (typeof LayoutDropPosition)[keyof typeof LayoutDropPosition];

/** What was clicked when selecting a cell: td, widget host, inner component, or child element. */
export const SelectedTarget = {
  Cell: 'cell',
  Widget: 'widget',
  WidgetInner: 'widget-inner',
  Element: 'element',
} as const;
export type SelectedTargetType = (typeof SelectedTarget)[keyof typeof SelectedTarget];

/** Text alignment for grid columns. */
export const TextAlignment = { Left: 'left', Center: 'center', Right: 'right' } as const;
export type TextAlignmentType = (typeof TextAlignment)[keyof typeof TextAlignment];

/** Validator keys for min/max length and numeric bounds. */
export const ValidatorKey = {
  MinLength: 'minLength',
  MaxLength: 'maxLength',
  Min: 'min',
  Max: 'max',
} as const;
export type ValidatorKeyType = (typeof ValidatorKey)[keyof typeof ValidatorKey];

/** Layout dropdown option: Select layout (initial), New layout (create), or saved layout id. */
export const LayoutOption = {
  SelectLayout: 'select',
  NewLayout: 'new',
} as const;
export type LayoutOptionType = (typeof LayoutOption)[keyof typeof LayoutOption];

/** Binding paths that refer to activities arrays (for grid column-level binding). */
export const ACTIVITIES_BINDING_PATHS = [
  'amsInformation.arrangements[0].amsActivity.activities',
  'nonAmsActivity.activities',
] as const;
