import type { Lang } from '@shared/languages';
import { ru, type Messages } from './ru';
import { en } from './en';
import { fr } from './fr';
import { de } from './de';
import { es } from './es';
import { it } from './it';

export type { Messages };

export const MESSAGES: Record<Lang, Messages> = { ru, en, fr, de, es, it };
