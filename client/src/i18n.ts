import { useSyncExternalStore } from 'react';
import { LANGS, isLang, pickLang, type Lang } from '@shared/languages';
import { MESSAGES, type Messages } from './locales';

// Языки кабинета и сайта: shared/languages.ts. Все тексты — словари client/src/locales (m.<раздел>.<ключ>).
export type { Lang };
export { LANGS };

const STORAGE_KEY = 'myepa-lang';
const listeners = new Set<() => void>();
const onChange = new Set<(lang: Lang) => void>();

function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLang(saved)) return saved;
  } catch {
    // localStorage недоступен — берём язык браузера
  }
  if (typeof navigator === 'undefined') return 'ru';
  return pickLang(navigator.languages?.length ? navigator.languages : [navigator.language ?? '']);
}

let currentLang: Lang = detectLang();
if (typeof document !== 'undefined') document.documentElement.lang = currentLang;

export function getLang(): Lang {
  return currentLang;
}

/** Сменить язык; user — выбор ученика (сохраняется в профиле), а не язык из профиля при входе */
export function setLang(lang: Lang, opts: { user?: boolean } = {}) {
  if (lang === currentLang) return;
  currentLang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // язык просто не запомнится
  }
  document.documentElement.lang = lang;
  listeners.forEach(listener => listener());
  if (opts.user) onChange.forEach(fn => fn(lang));
}

/** Подписка на выбор языка учеником — кабинет сохраняет его в профиле */
export function onUserLangChange(fn: (lang: Lang) => void): () => void {
  onChange.add(fn);
  return () => { onChange.delete(fn); };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLang() {
  const lang = useSyncExternalStore(subscribe, () => currentLang, () => currentLang);
  const m: Messages = MESSAGES[lang];
  return { lang, setLang, m };
}
