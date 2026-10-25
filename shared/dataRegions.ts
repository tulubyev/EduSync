/**
 * Региональные контуры хранения персональных данных (#17).
 *
 * Контур — отдельная установка My EPA со своей базой и своим доменом. Ученик живёт ровно в одном контуре:
 * его учётная запись, курсы, события, записи и обмен с площадками идут только туда. Общими между контурами
 * остаются обезличенные справочники (площадки, каталог курсов).
 *
 * homeRegion — где данные ученика должны храниться по закону его страны (по стране при регистрации).
 * dataRegion — где они хранятся на самом деле. Пока контура для homeRegion нет, ученик хранится в основном
 * контуре по согласию на трансграничную передачу; когда контур откроется, такие учётные записи переносятся.
 *
 * Новый регион по требованию местного закона: код в DATA_REGIONS, страны в REGION_COUNTRIES,
 * установка контура с DATA_REGION=<код> и его адрес в DATA_REGION_URLS у остальных.
 */

export const DATA_REGIONS = ['ru', 'eu', 'world'] as const;
export type DataRegion = typeof DATA_REGIONS[number];

export const DATA_REGION_LABELS: Record<DataRegion, string> = {
  ru: 'Россия',
  eu: 'Европейский союз и ЕЭЗ',
  world: 'Остальной мир',
};

/** Страны с собственным контуром (ISO 3166-1 alpha-2). Остальные — world. */
export const REGION_COUNTRIES: Record<Exclude<DataRegion, 'world'>, readonly string[]> = {
  // 152-ФЗ, ч. 5 ст. 18: данные граждан РФ собираются и хранятся в базах на территории РФ
  ru: ['RU'],
  // GDPR: ЕС и ЕЭЗ; Великобритания и Швейцария — с равноценной защитой (UK GDPR, FADP)
  eu: [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU',
    'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH',
  ],
};

export const isDataRegion = (v: unknown): v is DataRegion => typeof v === 'string' && (DATA_REGIONS as readonly string[]).includes(v);

/** Регион по стране ученика; без страны — основной контур (ru), как было до появления выбора страны */
export function regionForCountry(country: string | null | undefined): DataRegion {
  const code = (country ?? '').toUpperCase();
  if (!code) return 'ru';
  for (const [region, list] of Object.entries(REGION_COUNTRIES) as Array<[DataRegion, readonly string[]]>) {
    if (list.includes(code)) return region;
  }
  return 'world';
}

/** Настройка установки: какой это контур и где живут остальные */
export interface RegionDeployment {
  current: DataRegion;
  /** Адреса открытых контуров (без текущего не обязательно) */
  urls: Partial<Record<DataRegion, string>>;
}

export type RegistrationPlacement =
  | { action: 'create'; homeRegion: DataRegion; dataRegion: DataRegion; crossBorder: boolean }
  | { action: 'redirect'; homeRegion: DataRegion; url: string };

/**
 * Где регистрировать ученика из страны country.
 * Свой контур открыт и это не мы — отправляем туда; открыт и это мы — создаём здесь;
 * не открыт — создаём здесь с пометкой трансграничной передачи (нужно согласие на хранение в этом контуре).
 */
export function placeRegistration(country: string | null | undefined, d: RegionDeployment): RegistrationPlacement {
  const homeRegion = regionForCountry(country);
  if (homeRegion === d.current) return { action: 'create', homeRegion, dataRegion: d.current, crossBorder: false };
  const url = d.urls[homeRegion];
  if (url) return { action: 'redirect', homeRegion, url };
  return { action: 'create', homeRegion, dataRegion: d.current, crossBorder: true };
}

/** Учётные записи, которые надо перенести в открывшийся контур: живут здесь, а по закону — там */
export function needsMigration(user: { homeRegion: string | null; dataRegion: string | null }, d: RegionDeployment): DataRegion | null {
  const home = isDataRegion(user.homeRegion) ? user.homeRegion : null;
  if (!home || home === d.current || user.dataRegion !== d.current) return null;
  return d.urls[home] ? home : null;
}

/** DATA_REGION и DATA_REGION_URLS из окружения: «eu=https://eu.myepa.example,world=https://…» */
export function parseRegionDeployment(current: string | undefined, urls: string | undefined): RegionDeployment {
  const cur = isDataRegion(current) ? current : 'ru';
  const map: Partial<Record<DataRegion, string>> = {};
  for (const part of (urls ?? '').split(',')) {
    const [k, ...rest] = part.split('=');
    const v = rest.join('=').trim();
    if (isDataRegion(k?.trim()) && /^https:\/\/[^\s]+$/i.test(v)) map[k.trim() as DataRegion] = v.replace(/\/+$/, '');
  }
  return { current: cur, urls: map };
}
