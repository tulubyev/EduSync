import { useSyncExternalStore } from 'react';
import { DEFAULT_THEME, isTheme, type Theme } from '@shared/themes';

// Тема оформления (#45). Класс .dark на <html> ставит ещё /theme-init.js до отрисовки — без мигания;
// здесь — смена темы, слежение за темой системы и подписка кабинета, который сохраняет выбор в профиле.
export type { Theme };

const STORAGE_KEY = 'myepa-theme';
const listeners = new Set<() => void>();
const onChange = new Set<(theme: Theme) => void>();
const media = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isTheme(saved)) return saved;
  } catch {
    // localStorage недоступен — как в системе
  }
  return DEFAULT_THEME;
}

let currentTheme: Theme = readTheme();

export const resolveTheme = (theme: Theme): 'light' | 'dark' =>
  theme === 'system' ? (media?.matches ? 'dark' : 'light') : theme;

function apply() {
  if (typeof document === 'undefined') return;
  const dark = resolveTheme(currentTheme) === 'dark';
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}

apply();
media?.addEventListener('change', () => {
  if (currentTheme !== 'system') return;
  apply();
  listeners.forEach((listener) => listener());
});

export function getTheme(): Theme {
  return currentTheme;
}

/** Сменить тему; user — выбор ученика (сохраняется в профиле), а не тема из профиля при входе */
export function setTheme(theme: Theme, opts: { user?: boolean } = {}) {
  if (theme === currentTheme) return;
  currentTheme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // тема просто не запомнится в браузере
  }
  apply();
  listeners.forEach((listener) => listener());
  if (opts.user) onChange.forEach((fn) => fn(theme));
}

/** Подписка на выбор темы учеником — кабинет сохраняет его в профиле */
export function onUserThemeChange(fn: (theme: Theme) => void): () => void {
  onChange.add(fn);
  return () => { onChange.delete(fn); };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => currentTheme, () => currentTheme);
  // resolved пересчитывается при смене темы системы: subscribe оповещает и о ней
  return { theme, resolved: resolveTheme(theme), setTheme };
}
