/** Адрес ленты на этом сайте: https://<сайт>/api/calendar/<секрет>.ics */
export const feedUrl = (token: string, origin = window.location.origin) => `${origin}/api/calendar/${token}.ics`;
/** Тот же адрес по схеме webcal: — его открывают Apple Календарь и Outlook */
export const webcalUrl = (url: string) => url.replace(/^https?:/i, 'webcal:');
/** Ссылка «Добавить в Google Calendar» с подпиской на ленту */
export const googleAddUrl = (url: string) => `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl(url))}`;
