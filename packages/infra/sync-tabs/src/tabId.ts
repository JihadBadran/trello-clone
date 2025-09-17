/**
 * A unique ID for the current browser tab session.
 * This is generated once and remains constant for the lifetime of the tab.
 */
export const TAB_ID = Math.random().toString(36).slice(2);
