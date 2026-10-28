import { Monitor, Moon, Sun } from 'lucide-react';
import { THEMES, isTheme, type Theme } from '@shared/themes';
import { useLang } from '../i18n';
import { useTheme } from '../theme';

const ICONS: Record<Theme, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };

/**
 * Выбор темы. В кабинете выбор ученика сохраняется в профиле (App подписан на onUserThemeChange),
 * на публичных страницах — только в браузере.
 */
export function ThemeSwitcher({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const { m } = useLang();
  return (
    <select
      value={theme}
      onChange={(e) => { if (isTheme(e.target.value)) setTheme(e.target.value, { user: true }); }}
      aria-label={m.theme.label}
      className={`rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 ${className}`}
    >
      {THEMES.map((t) => <option key={t} value={t}>{m.theme[t]}</option>)}
    </select>
  );
}

/** Три кнопки с иконками — для карточки в «Настройках» */
export function ThemeButtons() {
  const { theme, setTheme } = useTheme();
  const { m } = useLang();
  return (
    <div className="inline-flex rounded-lg border border-gray-200 p-1" role="radiogroup" aria-label={m.theme.label}>
      {THEMES.map((t) => {
        const Icon = ICONS[t];
        const active = theme === t;
        return (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(t, { user: true })}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition ${active ? 'bg-purple-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <Icon className="h-4 w-4" />
            {m.theme[t]}
          </button>
        );
      })}
    </div>
  );
}
