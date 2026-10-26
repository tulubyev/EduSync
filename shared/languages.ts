/** Языки кабинета и сайта (#17). Первый в списке — исходный: по нему проверяется полнота остальных словарей. */
export const LANGS = ['ru', 'en', 'fr', 'de', 'es', 'it'] as const;
export type Lang = typeof LANGS[number];

/** Название языка на нём самом — для переключателя */
export const LANG_NAMES: Record<Lang, string> = {
  ru: 'Русский',
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  it: 'Italiano',
};

export const isLang = (v: unknown): v is Lang => typeof v === 'string' && (LANGS as readonly string[]).includes(v);

/** Язык из списка браузера («fr-CA» → fr); не нашли — английский */
export function pickLang(candidates: readonly string[]): Lang {
  for (const c of candidates) {
    const base = c.toLowerCase().split('-')[0];
    if (isLang(base)) return base;
  }
  return 'en';
}
