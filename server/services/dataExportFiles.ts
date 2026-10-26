/**
 * Выгрузка данных ученика одним архивом (#44): право на доступ и переносимость данных
 * (ст. 14 152-ФЗ, ст. 15 и 20 GDPR). Только данные самого ученика; секреты в архив не попадают:
 * хеш пароля, секрет ленты календаря, токены площадок, пароль трансляции, сохранённые способы оплаты.
 * Чистые функции — без базы; данные собирает dataExport.ts.
 */
import { pickLang, type Lang } from "@shared/languages";
import { buildIcsFeed, type FeedEvent } from "./icalFeed";
import type { ZipEntry } from "./zip";

type Row = Record<string, unknown>;

export interface UserDataBundle {
  language?: string | null;
  profileImage?: string | null;
  profile: Row;
  settings: Row | null;
  courses: Row[];
  events: Row[];
  library: Row[];
  studySessions: Row[];
  recordings: Row[];
  platformConnections: Row[];
  subscriptions: Row[];
  payments: Row[];
  /** Сроки площадок из старой таблицы course_deadlines — в архив, только если есть */
  legacyPlatformDeadlines?: Row[];
}

/** Поля, которые не выгружаются никогда (секреты и служебное) */
const SECRET_FIELDS = new Set([
  "passwordHash", "calendarToken", "profileImage",
  "accessTokenEncrypted", "refreshTokenEncrypted",
  "streamPassword", "workerId", "lastHeartbeat",
  "yoomoneyPaymentMethodId", "alfabankPaymentMethodId",
]);

export function stripSecrets<T extends Row>(row: T): Row {
  return Object.fromEntries(Object.entries(row).filter(([k]) => !SECRET_FIELDS.has(k)));
}

// ---------- CSV ----------

const csvValue = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  let s = v instanceof Date ? v.toISOString() : Array.isArray(v) ? v.join("; ") : typeof v === "object" ? JSON.stringify(v) : String(v);
  // защита от формул при открытии в Excel и LibreOffice
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV с BOM (Excel открывает UTF-8 без искажений) */
export function toCsv(rows: Row[], columns: string[]): string {
  const lines = [columns.join(","), ...rows.map((r) => columns.map((c) => csvValue(r[c])).join(","))];
  return "﻿" + lines.join("\r\n") + "\r\n";
}

const COURSE_COLUMNS = ["title", "source", "courseUrl", "category", "status", "progress", "duration", "cost", "startedAt", "completedAt", "tags", "createdAt"];
const EVENT_COLUMNS = ["type", "title", "startsAt", "durationMinutes", "status", "priority", "courseTitle", "programTitle", "moduleTitle", "lessonUrl", "materialsUrl", "joinUrl", "source", "description"];

// ---------- README ----------

const README: Record<Lang, (date: string) => string> = {
  ru: (date) => `Ваши данные в My EPA на ${date}

profile.json — профиль (без пароля и секретов)
settings.json — настройки
courses.json, courses.csv — курсы и программы
events.json, events.csv — уроки, вебинары, задания, экзамены и дедлайны
calendar.ics — те же события для импорта в любой календарь
library.json — библиотека: заметки, ссылки, материалы
study-sessions.json — учебные сессии
recordings.json — записи трансляций (сведения; видео скачиваются в разделе «Записи»)
platforms.json — подключённые площадки (без ключей доступа)
subscriptions.json, payments.json — подписка и платежи
profile-image.* — фото профиля, если загружено

JSON — для переноса в другие сервисы, CSV открывается в Excel и LibreOffice.
Вопросы о данных: support@myepa.ru
`,
  en: (date) => `Your My EPA data as of ${date}

profile.json — profile (without password and secrets)
settings.json — settings
courses.json, courses.csv — courses and programmes
events.json, events.csv — lessons, webinars, assignments, exams and deadlines
calendar.ics — the same events for import into any calendar
library.json — library: notes, links, materials
study-sessions.json — study sessions
recordings.json — stream recordings (details; videos are downloaded in “Recordings”)
platforms.json — connected platforms (without access keys)
subscriptions.json, payments.json — subscription and payments
profile-image.* — profile photo, if uploaded

JSON is for moving to other services; CSV opens in Excel and LibreOffice.
Questions about your data: support@myepa.ru
`,
  fr: (date) => `Vos données My EPA au ${date}

profile.json — profil (sans mot de passe ni secrets)
settings.json — paramètres
courses.json, courses.csv — cours et programmes
events.json, events.csv — leçons, webinaires, devoirs, examens et échéances
calendar.ics — les mêmes événements à importer dans n’importe quel calendrier
library.json — bibliothèque : notes, liens, ressources
study-sessions.json — sessions d’étude
recordings.json — enregistrements de diffusions (informations ; les vidéos se téléchargent dans « Enregistrements »)
platforms.json — plateformes connectées (sans clés d’accès)
subscriptions.json, payments.json — abonnement et paiements
profile-image.* — photo de profil, si elle a été ajoutée

Le JSON sert au transfert vers d’autres services ; le CSV s’ouvre dans Excel et LibreOffice.
Questions sur vos données : support@myepa.ru
`,
  de: (date) => `Ihre My-EPA-Daten, Stand ${date}

profile.json — Profil (ohne Passwort und Geheimnisse)
settings.json — Einstellungen
courses.json, courses.csv — Kurse und Programme
events.json, events.csv — Lektionen, Webinare, Aufgaben, Prüfungen und Fristen
calendar.ics — dieselben Ereignisse zum Import in jeden Kalender
library.json — Bibliothek: Notizen, Links, Materialien
study-sessions.json — Lerneinheiten
recordings.json — Stream-Aufnahmen (Angaben; Videos werden unter „Aufnahmen“ heruntergeladen)
platforms.json — verbundene Plattformen (ohne Zugangsschlüssel)
subscriptions.json, payments.json — Abonnement und Zahlungen
profile-image.* — Profilfoto, falls hochgeladen

JSON dient dem Umzug zu anderen Diensten, CSV öffnet sich in Excel und LibreOffice.
Fragen zu Ihren Daten: support@myepa.ru
`,
  es: (date) => `Tus datos de My EPA a fecha de ${date}

profile.json — perfil (sin contraseña ni secretos)
settings.json — ajustes
courses.json, courses.csv — cursos y programas
events.json, events.csv — clases, webinars, tareas, exámenes y plazos
calendar.ics — los mismos eventos para importar en cualquier calendario
library.json — biblioteca: notas, enlaces, materiales
study-sessions.json — sesiones de estudio
recordings.json — grabaciones de transmisiones (datos; los vídeos se descargan en «Grabaciones»)
platforms.json — plataformas conectadas (sin claves de acceso)
subscriptions.json, payments.json — suscripción y pagos
profile-image.* — foto de perfil, si la subiste

JSON sirve para llevar los datos a otros servicios; CSV se abre en Excel y LibreOffice.
Preguntas sobre tus datos: support@myepa.ru
`,
  it: (date) => `I tuoi dati My EPA al ${date}

profile.json — profilo (senza password né segreti)
settings.json — impostazioni
courses.json, courses.csv — corsi e programmi
events.json, events.csv — lezioni, webinar, compiti, esami e scadenze
calendar.ics — gli stessi eventi da importare in qualsiasi calendario
library.json — libreria: note, link, materiali
study-sessions.json — sessioni di studio
recordings.json — registrazioni delle dirette (dati; i video si scaricano in «Registrazioni»)
platforms.json — piattaforme collegate (senza chiavi di accesso)
subscriptions.json, payments.json — abbonamento e pagamenti
profile-image.* — foto del profilo, se caricata

Il JSON serve per trasferire i dati ad altri servizi; il CSV si apre in Excel e LibreOffice.
Domande sui tuoi dati: support@myepa.ru
`,
};

const json = (v: unknown) => JSON.stringify(v, null, 2) + "\n";

/** Фото профиля хранится в base64 (иногда с префиксом data:) — в архив кладётся файлом, расширение по сигнатуре */
function imageEntry(stored: string | null): ZipEntry | null {
  if (!stored) return null;
  const data = Buffer.from(stored.replace(/^data:[^,]*,/, ""), "base64");
  if (data.length === 0) return null;
  const ext =
    data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WEBP" ? "webp"
    : data[0] === 0x89 && data[1] === 0x50 ? "png"
    : data[0] === 0xff && data[1] === 0xd8 ? "jpg"
    : data.subarray(0, 3).toString("ascii") === "GIF" ? "gif"
    : null;
  return ext ? { name: `profile-image.${ext}`, data } : null;
}

/** Файлы архива — чистая функция над собранными данными */
export function buildExportEntries(
  data: UserDataBundle,
  now = new Date(),
): ZipEntry[] {
  const lang = pickLang([data.language ?? ""]);
  const clean = (rows: Row[]) => rows.map(stripSecrets);
  const events = clean(data.events);
  const entries: ZipEntry[] = [
    { name: "README.txt", data: README[lang](now.toISOString().slice(0, 10)) },
    { name: "profile.json", data: json(stripSecrets(data.profile)) },
    { name: "settings.json", data: json(data.settings ? stripSecrets(data.settings) : null) },
    { name: "courses.json", data: json(clean(data.courses)) },
    { name: "courses.csv", data: toCsv(clean(data.courses), COURSE_COLUMNS) },
    { name: "events.json", data: json(events) },
    { name: "events.csv", data: toCsv(events, EVENT_COLUMNS) },
    { name: "calendar.ics", data: buildIcsFeed(data.events as unknown as FeedEvent[], { lang, now }) },
    { name: "library.json", data: json(clean(data.library)) },
    { name: "study-sessions.json", data: json(clean(data.studySessions)) },
    { name: "recordings.json", data: json(clean(data.recordings)) },
    { name: "platforms.json", data: json(clean(data.platformConnections)) },
    { name: "subscriptions.json", data: json(clean(data.subscriptions)) },
    { name: "payments.json", data: json(clean(data.payments)) },
  ];
  if (data.legacyPlatformDeadlines?.length) {
    entries.push({ name: "platform-deadlines-legacy.json", data: json(clean(data.legacyPlatformDeadlines)) });
  }
  const image = imageEntry(data.profileImage ?? null);
  if (image) entries.push(image);
  return entries;
}
