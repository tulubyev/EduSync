/** Курс по ссылке: разбор страницы, площадка, защита от SSRF (#19, npm test) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPublicAddress, matchPlatform, parseCourseMeta, titleFromUrl } from './coursePreviewParse';

test('OpenGraph: название, описание, обложка, сайт, канонический адрес', () => {
  const html = `<html><head>
    <title>Ignored | Coursera</title>
    <meta property="og:title" content="Machine Learning &amp; AI">
    <meta property='og:description' content="Learn ML with Andrew Ng.&#10;New &quot;edition&quot;">
    <meta property="og:image" content="/img/cover.png">
    <meta property="og:site_name" content="Coursera">
    <link rel="canonical" href="https://www.coursera.org/learn/machine-learning">
  </head></html>`;
  const m = parseCourseMeta(html, 'https://www.coursera.org/learn/machine-learning?utm_source=x');
  assert.equal(m.title, 'Machine Learning & AI');
  assert.equal(m.description, 'Learn ML with Andrew Ng. New "edition"');
  assert.equal(m.imageUrl, 'https://www.coursera.org/img/cover.png');
  assert.equal(m.siteName, 'Coursera');
  assert.equal(m.canonicalUrl, 'https://www.coursera.org/learn/machine-learning');
});

test('без OpenGraph — JSON-LD Course, затем <title> и meta description; опасные ссылки отбрасываются', () => {
  const ld = `<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Course","name":"Python для начинающих","description":"Курс <b>Python</b>","provider":{"@type":"Organization","name":"Stepik"},"image":"https://cdn.stepik.net/c.png"}]}</script>`;
  const a = parseCourseMeta(`<head>${ld}<title>T</title></head>`, 'https://stepik.org/course/58852');
  assert.equal(a.title, 'Python для начинающих');
  assert.equal(a.description, 'Курс Python');
  assert.equal(a.siteName, 'Stepik');
  assert.equal(a.imageUrl, 'https://cdn.stepik.net/c.png');
  const b = parseCourseMeta(`<head><title> Курс по SQL </title><meta name="description" content="Описание"><meta property="og:image" content="javascript:alert(1)"></head>`, 'https://school.example/sql');
  assert.equal(b.title, 'Курс по SQL');
  assert.equal(b.description, 'Описание');
  assert.equal(b.imageUrl, null);
});

test('площадка по домену: справочник, встроенный список, поддомены, LinkedIn Learning', () => {
  const platforms = [
    { id: 'p1', code: 'coursera', name: 'Coursera', websiteUrl: 'https://www.coursera.org' },
    { id: 'p2', code: 'myschool', name: 'Моя школа', websiteUrl: 'https://learn.myschool.ru' },
  ];
  assert.equal(matchPlatform('https://www.coursera.org/learn/python', platforms)?.id, 'p1');
  assert.equal(matchPlatform('https://learn.myschool.ru/course/1', platforms)?.id, 'p2');
  assert.deepEqual(matchPlatform('https://www.udemy.com/course/react/', platforms), { code: 'udemy', name: 'Udemy' });
  assert.equal(matchPlatform('https://practicum.yandex.ru/data-analyst/', platforms)?.code, 'yandex-practicum');
  assert.equal(matchPlatform('https://www.linkedin.com/learning/excel', platforms)?.code, 'linkedin-learning');
  assert.equal(matchPlatform('https://www.linkedin.com/in/someone', platforms), null);
  assert.equal(matchPlatform('https://evilcoursera.org/x', platforms), null);
});

test('название из адреса, если страница недоступна', () => {
  assert.equal(titleFromUrl('https://www.coursera.org/learn/machine-learning'), 'Machine learning');
  assert.equal(titleFromUrl('https://www.udemy.com/course/the-complete-javascript-course/'), 'The complete javascript course');
  assert.equal(titleFromUrl('https://stepik.org/course/58852/promo'), 'Promo');
  assert.equal(titleFromUrl('https://example.com/'), null);
});

test('публичные и непубличные адреса', () => {
  for (const ip of ['8.8.8.8', '104.16.1.1', '2606:4700::1111']) assert.ok(isPublicAddress(ip), ip);
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1',
    '0.0.0.0', '224.0.0.1', '::1', '::', 'fc00::1', 'fd12::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1', 'not-an-ip']) {
    assert.ok(!isPublicAddress(ip), ip);
  }
});
