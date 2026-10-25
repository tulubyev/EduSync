import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { needsMigration, parseRegionDeployment, placeRegistration, regionForCountry, REGION_COUNTRIES } from './dataRegions';

test('регион по стране', () => {
  assert.equal(regionForCountry('RU'), 'ru');
  assert.equal(regionForCountry('de'), 'eu');
  assert.equal(regionForCountry('GB'), 'eu');
  assert.equal(regionForCountry('US'), 'world');
  assert.equal(regionForCountry('KZ'), 'world');
  assert.equal(regionForCountry(null), 'ru');
});

// Сейчас: один сервер в РФ, других контуров нет
const onlyRu = parseRegionDeployment('ru', '');
// Позже: открыт контур ЕС
const ruAndEu = parseRegionDeployment('ru', 'eu=https://eu.myepa.example/');
const euNode = parseRegionDeployment('eu', 'ru=https://myepa.ru');

test('ученик из России хранится в контуре РФ', () => {
  assert.deepEqual(placeRegistration('RU', onlyRu), { action: 'create', homeRegion: 'ru', dataRegion: 'ru', crossBorder: false });
  assert.deepEqual(placeRegistration('RU', euNode), { action: 'redirect', homeRegion: 'ru', url: 'https://myepa.ru' });
});

test('ученик из ЕС: пока контура нет — в РФ по согласию, когда открыт — только в контуре ЕС', () => {
  assert.deepEqual(placeRegistration('FR', onlyRu), { action: 'create', homeRegion: 'eu', dataRegion: 'ru', crossBorder: true });
  assert.deepEqual(placeRegistration('FR', ruAndEu), { action: 'redirect', homeRegion: 'eu', url: 'https://eu.myepa.example' });
  assert.deepEqual(placeRegistration('FR', euNode), { action: 'create', homeRegion: 'eu', dataRegion: 'eu', crossBorder: false });
});

test('ученик из остального мира: в основном контуре, пока свой не открыт', () => {
  assert.deepEqual(placeRegistration('BR', ruAndEu), { action: 'create', homeRegion: 'world', dataRegion: 'ru', crossBorder: true });
});

test('перенос в открывшийся контур', () => {
  assert.equal(needsMigration({ homeRegion: 'eu', dataRegion: 'ru' }, onlyRu), null);
  assert.equal(needsMigration({ homeRegion: 'eu', dataRegion: 'ru' }, ruAndEu), 'eu');
  assert.equal(needsMigration({ homeRegion: 'ru', dataRegion: 'ru' }, ruAndEu), null);
});

test('настройка из окружения: только https и известные регионы', () => {
  const d = parseRegionDeployment('xx', 'eu=http://insecure,world=https://w.example,zz=https://z.example');
  assert.equal(d.current, 'ru');
  assert.deepEqual(d.urls, { world: 'https://w.example' });
});

test('SQL-скрипт контуров знает те же страны ЕС, что и код', () => {
  const sqlText = readFileSync(new URL('../scripts/sql/2026-10-25-data-regions.sql', import.meta.url), 'utf8');
  const inList = /country IN \(([^)]*)\) THEN 'eu'/.exec(sqlText)?.[1] ?? '';
  const codes = inList.match(/'([A-Z]{2})'/g)?.map((c) => c.slice(1, 3)).sort();
  assert.deepEqual(codes, [...REGION_COUNTRIES.eu].sort());
});
