import type { Lang } from '@shared/languages';

// Тема оформления (#45): переключатель в боковом меню и карточка в «Настройках»; русский — исходный
const ru = {
  label: 'Тема',
  light: 'Светлая',
  dark: 'Тёмная',
  system: 'Как в системе',
  title: 'Оформление',
  hint: '«Как в системе» следует настройке устройства: днём светлая, ночью тёмная, если так настроено. Выбор сохраняется в профиле и переходит на другие устройства.',
};

export type ThemeMessages = typeof ru;

const en: ThemeMessages = {
  label: 'Theme',
  light: 'Light',
  dark: 'Dark',
  system: 'System',
  title: 'Appearance',
  hint: '“System” follows your device setting — light by day and dark at night if it is set up that way. Your choice is saved to your profile and carries over to other devices.',
};

const fr: ThemeMessages = {
  label: 'Thème',
  light: 'Clair',
  dark: 'Sombre',
  system: 'Comme le système',
  title: 'Apparence',
  hint: '« Comme le système » suit le réglage de l’appareil : clair le jour et sombre la nuit s’il est configuré ainsi. Votre choix est enregistré dans votre profil et suit vos autres appareils.',
};

const de: ThemeMessages = {
  label: 'Design',
  light: 'Hell',
  dark: 'Dunkel',
  system: 'Wie im System',
  title: 'Darstellung',
  hint: '„Wie im System“ folgt der Einstellung des Geräts – tagsüber hell, nachts dunkel, wenn es so eingestellt ist. Ihre Wahl wird im Profil gespeichert und gilt auch auf anderen Geräten.',
};

const es: ThemeMessages = {
  label: 'Tema',
  light: 'Claro',
  dark: 'Oscuro',
  system: 'Como el sistema',
  title: 'Apariencia',
  hint: '«Como el sistema» sigue el ajuste del dispositivo: claro de día y oscuro de noche si está configurado así. Tu elección se guarda en el perfil y se aplica en tus otros dispositivos.',
};

const it: ThemeMessages = {
  label: 'Tema',
  light: 'Chiaro',
  dark: 'Scuro',
  system: 'Come il sistema',
  title: 'Aspetto',
  hint: '«Come il sistema» segue l’impostazione del dispositivo: chiaro di giorno e scuro di notte, se è configurato così. La scelta viene salvata nel profilo e vale anche sugli altri dispositivi.',
};

export const theme: Record<Lang, ThemeMessages> = { ru, en, fr, de, es, it };
