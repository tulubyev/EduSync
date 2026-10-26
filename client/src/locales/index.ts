import { LANGS, type Lang } from '@shared/languages';
import { ru, type CoreMessages } from './ru';
import { en } from './en';
import { fr } from './fr';
import { de } from './de';
import { es } from './es';
import { it } from './it';
import { courses } from './courses';
import { deadlines } from './deadlines';
import { library } from './library';
import { settings } from './settings';
import { subscription } from './subscription';
import { platforms } from './platforms';

// Разделы кабинета — каждый в своём файле со всеми языками
const AREAS = { courses, deadlines, library, settings, subscription, platforms };
type Areas = { [K in keyof typeof AREAS]: (typeof AREAS)[K]['ru'] };

export type Messages = CoreMessages & Areas;

const CORE: Record<Lang, CoreMessages> = { ru, en, fr, de, es, it };

export const MESSAGES = Object.fromEntries(
  LANGS.map((lang) => [
    lang,
    { ...CORE[lang], ...Object.fromEntries(Object.entries(AREAS).map(([k, v]) => [k, v[lang]])) },
  ]),
) as Record<Lang, Messages>;
