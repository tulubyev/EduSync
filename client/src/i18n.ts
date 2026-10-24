import { useSyncExternalStore } from 'react';

// Языки публичной части сайта. Кабинет пока только на русском.
export type Lang = 'ru' | 'en';

const STORAGE_KEY = 'myepa-lang';
const listeners = new Set<() => void>();

function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'ru' || saved === 'en') return saved;
  } catch {
    // localStorage недоступен — берём язык браузера
  }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

let currentLang: Lang = detectLang();
if (typeof document !== 'undefined') document.documentElement.lang = currentLang;

export function setLang(lang: Lang) {
  currentLang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // язык просто не запомнится
  }
  document.documentElement.lang = lang;
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Текст на двух языках: { ru: '…', en: '…' }
export type Text = Record<Lang, string>;

export function useLang() {
  const lang = useSyncExternalStore(subscribe, () => currentLang, () => currentLang);
  const t = (text: Text) => text[lang];
  return { lang, setLang, t };
}
