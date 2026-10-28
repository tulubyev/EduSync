// Тёмная тема для жёстко заданных классов Tailwind (#45): bg-white, text-gray-800, bg-red-50 и т. п.
// Пишет client/src/theme-dark.css — не править руками, а перезапустить: node scripts/gen-dark-theme-css.cjs
// Новые экраны лучше сразу писать на токенах (bg-card, text-foreground, text-muted-foreground, border).
const fs = require('fs');
const path = require('path');
const colors = require('tailwindcss/colors');
const hexToRgb = (h) => { const n = parseInt(h.slice(1), 16); return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`; };
const esc = (c) => c.replace(/:/g, '\\:').replace(/\//g, '\\/');
// Админ-панель остаётся светлой: её карточки на инлайн-стилях
const sel = (cls, pseudo = '') => `.dark .${esc(cls)}${pseudo}:where(:not(.light-island, .light-island *))`;
const out = [];
const rule = (selectors, body) => out.push(`${selectors.join(',\n')} {\n  ${body}\n}`);

// нейтральные фоны, текст и рамки
rule([sel('bg-white'), sel('bg-gray-50'), sel('bg-slate-50')], 'background-color: var(--card);');
rule([sel('bg-gray-100'), sel('bg-slate-100')], 'background-color: var(--muted);');
rule([sel('bg-gray-200'), sel('bg-slate-200')], 'background-color: hsl(210, 30%, 22%);');
rule([sel('hover:bg-white', ':hover'), sel('hover:bg-gray-50', ':hover'), sel('hover:bg-gray-100', ':hover')], 'background-color: hsl(210, 35%, 17%);');
rule([sel('hover:bg-gray-200', ':hover')], 'background-color: hsl(210, 30%, 24%);');
rule([sel('text-gray-900'), sel('text-gray-800'), sel('text-black'), sel('text-slate-900'), sel('text-slate-800'), sel('hover:text-gray-900', ':hover'), sel('hover:text-gray-800', ':hover')], 'color: var(--foreground);');
rule([sel('text-gray-700'), sel('text-slate-700'), sel('hover:text-gray-700', ':hover')], 'color: hsl(210, 25%, 82%);');
rule([sel('text-gray-600'), sel('text-slate-600')], 'color: hsl(210, 18%, 70%);');
rule([sel('text-gray-500'), sel('text-slate-500')], 'color: hsl(210, 14%, 60%);');
rule([sel('text-gray-400'), sel('text-slate-400')], 'color: hsl(210, 12%, 50%);');
rule(['100', '200', '300'].flatMap((n) => [sel(`border-gray-${n}`), sel(`border-slate-${n}`), sel(`divide-gray-${n}`, ' > * + *')]), 'border-color: var(--border);');
rule([sel('from-gray-50'), sel('from-white')], '--tw-gradient-from: var(--card) var(--tw-gradient-from-position); --tw-gradient-to: transparent var(--tw-gradient-to-position); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to);');
rule([sel('to-gray-100'), sel('to-white'), sel('to-gray-50')], '--tw-gradient-to: var(--muted) var(--tw-gradient-to-position);');

// светлые цветные плашки → полупрозрачный цвет; тёмный цветной текст → светлый оттенок
const families = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];
for (const f of families) {
  const c = colors[f];
  const a = (alpha) => `rgb(${hexToRgb(c['500'])} / ${alpha})`;
  rule([sel(`bg-${f}-50`), sel(`bg-${f}-50/50`), sel(`bg-${f}-50/30`)], `background-color: ${a(0.12)};`);
  rule([sel(`bg-${f}-100`)], `background-color: ${a(0.2)};`);
  rule([sel(`bg-${f}-200`)], `background-color: ${a(0.3)};`);
  rule([sel(`hover:bg-${f}-50`, ':hover'), sel(`hover:bg-${f}-100`, ':hover')], `background-color: ${a(0.25)};`);
  rule([sel(`from-${f}-50`)], `--tw-gradient-from: ${a(0.12)} var(--tw-gradient-from-position); --tw-gradient-to: transparent var(--tw-gradient-to-position); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to);`);
  rule([sel(`to-${f}-50`)], `--tw-gradient-to: ${a(0.12)} var(--tw-gradient-to-position);`);
  rule([sel(`text-${f}-700`), sel(`text-${f}-800`), sel(`text-${f}-900`), sel(`hover:text-${f}-700`, ':hover'), sel(`hover:text-${f}-800`, ':hover')], `color: ${c['300']};`);
  rule([sel(`text-${f}-600`), sel(`hover:text-${f}-600`, ':hover')], `color: ${c['400']};`);
  rule([sel(`border-${f}-100`), sel(`border-${f}-200`), sel(`border-${f}-300`), sel(`hover:border-${f}-200`, ':hover'), sel(`hover:border-${f}-300`, ':hover')], `border-color: ${a(0.35)};`);
}

const header = '/* Создано scripts/gen-dark-theme-css.cjs — не править руками (#45) */\n';
fs.writeFileSync(path.join(__dirname, '../client/src/theme-dark.css'), header + out.join('\n') + '\n');
