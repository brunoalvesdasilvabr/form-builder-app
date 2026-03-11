/**
 * Layout dropdown option: Select layout (initial), New layout (create), or saved layout id.
 */

export const LayoutOption = {
  SelectLayout: 'select',
  NewLayout: 'new',
} as const;
export type LayoutOptionType = (typeof LayoutOption)[keyof typeof LayoutOption];
