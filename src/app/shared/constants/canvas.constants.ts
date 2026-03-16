/**
 * Constants for canvas and history. Single place for magic numbers and limits.
 */

/** Maximum number of undo states kept in memory. */
export const UNDO_LIMIT = 50;

/** Default layout name when user has not entered one (e.g. after "New layout"). */
export const DEFAULT_LAYOUT_NAME = 'Untitled';

/** Script element id used in downloaded HTML to embed canvas state for upload/restore. */
export const FORM_BUILDER_LAYOUT_STATE_SCRIPT_ID = 'form-builder-layout-state';
