import { LANG_NAMES, LANGS, isLang } from '@shared/languages';
import { useLang } from '../i18n';

/**
 * Выбор языка. В кабинете выбор ученика сохраняется в профиле (App подписан на onUserLangChange),
 * на публичных страницах — только в браузере.
 */
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { lang, setLang, m } = useLang();
  return (
    <select
      value={lang}
      onChange={(e) => { if (isLang(e.target.value)) setLang(e.target.value, { user: true }); }}
      aria-label={m.common.language}
      className={`rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 ${className}`}
    >
      {LANGS.map((l) => <option key={l} value={l}>{LANG_NAMES[l]}</option>)}
    </select>
  );
}
