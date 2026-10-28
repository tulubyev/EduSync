/** Тема оформления кабинета (#45): светлая, тёмная или как в системе (prefers-color-scheme) */
export const THEMES = ['light', 'dark', 'system'] as const;
export type Theme = (typeof THEMES)[number];
export const DEFAULT_THEME: Theme = 'system';

export const isTheme = (value: unknown): value is Theme => (THEMES as readonly unknown[]).includes(value);
