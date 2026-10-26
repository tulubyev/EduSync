import type { Lang } from '@shared/languages';

// Подсказка записать вебинар в неудобное время и настройки удобного времени (#48); русский — исходный
const ru = {
  inconvenient: 'Неудобное время',
  reason: {
    conflict: (title: string) => `пересекается с «${title}»`,
    work: 'в рабочее время',
    night: 'вне ваших удобных часов',
  },
  offer: 'Не успеваете? Запишем вебинар — посмотрите, когда удобно.',
  record: 'Записать',
  dismiss: 'Не предлагать',
  banner: (n: number) => `Вебинаров в неудобное время на этой неделе: ${n}`,
  bannerText: 'Запланируйте запись — она пройдёт сама, а видео появится в «Записях».',
  settings: {
    title: 'Удобное время',
    intro: 'По этим часам My EPA подсказывает, какие вебинары лучше записать.',
    comfort: 'Удобно заниматься',
    from: 'с',
    to: 'до',
    work: 'Учитывать рабочее время (пн–пт)',
    hints: 'Предлагать запись вебинаров в неудобное время',
    save: 'Сохранить',
    saved: 'Сохранено',
    errLoad: 'Не удалось загрузить настройки времени',
    errSave: 'Не удалось сохранить',
    errOrder: 'Начало должно быть раньше конца',
  },
};

export type HintsMessages = typeof ru;

const en: HintsMessages = {
  inconvenient: 'Inconvenient time',
  reason: {
    conflict: (title) => `overlaps with “${title}”`,
    work: 'during your working hours',
    night: 'outside your preferred hours',
  },
  offer: 'Can’t make it? We’ll record the webinar so you can watch it when it suits you.',
  record: 'Record',
  dismiss: 'Don’t suggest',
  banner: (n) => `Webinars at inconvenient times this week: ${n}`,
  bannerText: 'Schedule a recording — it runs by itself and the video appears in “Recordings”.',
  settings: {
    title: 'Preferred time',
    intro: 'My EPA uses these hours to suggest which webinars are better recorded.',
    comfort: 'I can study',
    from: 'from',
    to: 'to',
    work: 'Take working hours into account (Mon–Fri)',
    hints: 'Suggest recording webinars at inconvenient times',
    save: 'Save',
    saved: 'Saved',
    errLoad: 'Could not load time settings',
    errSave: 'Could not save',
    errOrder: 'The start must be earlier than the end',
  },
};

const fr: HintsMessages = {
  inconvenient: 'Horaire peu pratique',
  reason: {
    conflict: (title) => `chevauche « ${title} »`,
    work: 'pendant vos heures de travail',
    night: 'en dehors de vos heures préférées',
  },
  offer: 'Pas disponible ? Nous enregistrons le webinaire pour que vous le regardiez quand vous voulez.',
  record: 'Enregistrer',
  dismiss: 'Ne pas proposer',
  banner: (n) => `Webinaires à un horaire peu pratique cette semaine : ${n}`,
  bannerText: 'Programmez l’enregistrement — il se fait tout seul et la vidéo apparaît dans « Enregistrements ».',
  settings: {
    title: 'Horaires préférés',
    intro: 'My EPA s’appuie sur ces horaires pour suggérer les webinaires à enregistrer.',
    comfort: 'Je peux étudier',
    from: 'de',
    to: 'à',
    work: 'Tenir compte des heures de travail (lun–ven)',
    hints: 'Proposer d’enregistrer les webinaires à un horaire peu pratique',
    save: 'Enregistrer',
    saved: 'Enregistré',
    errLoad: 'Impossible de charger les réglages horaires',
    errSave: 'Impossible d’enregistrer',
    errOrder: 'Le début doit précéder la fin',
  },
};

const de: HintsMessages = {
  inconvenient: 'Ungünstige Zeit',
  reason: {
    conflict: (title) => `überschneidet sich mit „${title}“`,
    work: 'während Ihrer Arbeitszeit',
    night: 'außerhalb Ihrer bevorzugten Zeit',
  },
  offer: 'Keine Zeit? Wir nehmen das Webinar auf — schauen Sie es, wann es passt.',
  record: 'Aufnehmen',
  dismiss: 'Nicht vorschlagen',
  banner: (n) => `Webinare zu ungünstigen Zeiten diese Woche: ${n}`,
  bannerText: 'Planen Sie die Aufnahme — sie läuft von selbst, das Video erscheint unter „Aufnahmen“.',
  settings: {
    title: 'Bevorzugte Zeit',
    intro: 'Anhand dieser Zeiten schlägt My EPA vor, welche Webinare Sie besser aufnehmen.',
    comfort: 'Ich kann lernen',
    from: 'von',
    to: 'bis',
    work: 'Arbeitszeit berücksichtigen (Mo–Fr)',
    hints: 'Aufnahme von Webinaren zu ungünstigen Zeiten vorschlagen',
    save: 'Speichern',
    saved: 'Gespeichert',
    errLoad: 'Zeiteinstellungen konnten nicht geladen werden',
    errSave: 'Speichern fehlgeschlagen',
    errOrder: 'Der Beginn muss vor dem Ende liegen',
  },
};

const es: HintsMessages = {
  inconvenient: 'Horario poco cómodo',
  reason: {
    conflict: (title) => `coincide con «${title}»`,
    work: 'en tu horario de trabajo',
    night: 'fuera de tu horario preferido',
  },
  offer: '¿No llegas? Grabamos el webinar para que lo veas cuando te venga bien.',
  record: 'Grabar',
  dismiss: 'No sugerir',
  banner: (n) => `Webinars en horario poco cómodo esta semana: ${n}`,
  bannerText: 'Programa la grabación: se hace sola y el vídeo aparece en «Grabaciones».',
  settings: {
    title: 'Horario preferido',
    intro: 'My EPA usa este horario para sugerir qué webinars conviene grabar.',
    comfort: 'Puedo estudiar',
    from: 'de',
    to: 'a',
    work: 'Tener en cuenta el horario de trabajo (lun–vie)',
    hints: 'Sugerir grabar los webinars en horario poco cómodo',
    save: 'Guardar',
    saved: 'Guardado',
    errLoad: 'No se pudieron cargar los ajustes de horario',
    errSave: 'No se pudo guardar',
    errOrder: 'El inicio debe ser anterior al final',
  },
};

const it: HintsMessages = {
  inconvenient: 'Orario scomodo',
  reason: {
    conflict: (title) => `si sovrappone a «${title}»`,
    work: 'durante il tuo orario di lavoro',
    night: 'fuori dal tuo orario preferito',
  },
  offer: 'Non riesci? Registriamo il webinar: lo guardi quando ti è comodo.',
  record: 'Registra',
  dismiss: 'Non proporre',
  banner: (n) => `Webinar in orari scomodi questa settimana: ${n}`,
  bannerText: 'Programma la registrazione: parte da sola e il video compare in «Registrazioni».',
  settings: {
    title: 'Orario preferito',
    intro: 'My EPA usa questi orari per suggerire quali webinar conviene registrare.',
    comfort: 'Posso studiare',
    from: 'dalle',
    to: 'alle',
    work: 'Considera l’orario di lavoro (lun–ven)',
    hints: 'Proponi di registrare i webinar in orari scomodi',
    save: 'Salva',
    saved: 'Salvato',
    errLoad: 'Impossibile caricare le impostazioni dell’orario',
    errSave: 'Impossibile salvare',
    errOrder: 'L’inizio deve precedere la fine',
  },
};

export const hints: Record<Lang, HintsMessages> = { ru, en, fr, de, es, it };
