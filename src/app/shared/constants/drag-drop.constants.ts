/**
 * Single source of truth for drag-and-drop: DataTransfer keys and related CSS classes.
 * Use these constants instead of magic strings so the app stays consistent and beginner-friendly.
 */

/** DataTransfer type keys used when dragging (set in palette) and dropping (read in canvas/embedded-table). */
export const DragDropDataKey = {
  /** Moving a widget between canvas cells. */
  CanvasMove: 'application/x-canvas-move',
  /** Moving a widget between nested table cells. */
  NestedMove: 'application/x-nested-move',
  /** Dragging a widget type from palette (e.g. "input", "table"). */
  WidgetType: 'application/widget-type',
  /** Layout action: add row or column to table. Value is "row" | "col". */
  LayoutAction: 'application/layout-action',
  /** Present when layout action is row (used for type detection). */
  LayoutActionRow: 'application/layout-action-row',
  /** Present when layout action is col (used for type detection). */
  LayoutActionCol: 'application/layout-action-col',
  /** Grid action: add row or column to grid widget. Value is "row" | "col". */
  GridAction: 'application/grid-action',
  /** Present when grid action is row (used for type detection). */
  GridActionRow: 'application/grid-action-row',
  /** Present when grid action is col (used for type detection). */
  GridActionCol: 'application/grid-action-col',
} as const;

/** CSS class names applied during drag-over for visual feedback. */
export const DragDropCssClass = {
  /** Cell (td) when a valid drop is over it. */
  CellDragOver: 'canvas-cell-drag-over',
  /** Empty state area when table can be dropped. */
  EmptyStateDragOver: 'canvas-empty-state-drag-over',
} as const;
