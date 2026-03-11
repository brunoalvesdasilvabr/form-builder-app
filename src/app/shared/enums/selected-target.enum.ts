/**
 * What was clicked when selecting a cell: td, widget host, inner component, or child element.
 */

export const SelectedTarget = {
  Cell: 'cell',
  Widget: 'widget',
  WidgetInner: 'widget-inner',
  Element: 'element',
} as const;
export type SelectedTargetType = (typeof SelectedTarget)[keyof typeof SelectedTarget];
