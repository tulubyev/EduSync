/**
 * Разбор страницы курса по ссылке (#19, «добавить курс по ссылке»): название, описание, обложка, площадка.
 * Чистые функции без сети — их проверяют тесты; загрузку страницы делает coursePreview.ts.
 */
import { isIP } from "net";

export interface CourseMeta {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
  canonicalUrl: string | null;
}

export interface PlatformRef {
  id?: string | null;
  code: string;
  name: string;
  websiteUrl?: string | null;
}

/** Известные площадки по домену — на случай, если в справочнике площадок нет адреса сайта */
export const KNOWN_HOSTS: Record<string, { code: string; name: string }> = {
  "coursera.org": { code: "coursera", name: "Coursera" },
  "udemy.com": { code: "udemy", name: "Udemy" },
  "edx.org": { code: "edx", name: "edX" },
  "stepik.org": { code: "stepik", name: "Stepik" },
  "udacity.com": { code: "udacity", name: "Udacity" },
  "khanacademy.org": { code: "khan-academy", name: "Khan Academy" },
  "codecademy.com": { code: "codecademy", name: "Codecademy" },
  "datacamp.com": { code: "datacamp", name: "DataCamp" },
  "pluralsight.com": { code: "pluralsight", name: "Pluralsight" },
  "skillshare.com": { code: "skillshare", name: "Skillshare" },
  "domestika.org": { code: "domestika", name: "Domestika" },
  "futurelearn.com": { code: "futurelearn", name: "FutureLearn" },
  "openclassrooms.com": { code: "openclassrooms", name: "OpenClassrooms" },
  "fun-mooc.fr": { code: "fun-mooc", name: "FUN MOOC" },
  "openedu.ru": { code: "openedu", name: "Открытое образование" },
  "geekbrains.ru": { code: "geekbrains", name: "GeekBrains" },
  "gb.ru": { code: "geekbrains", name: "GeekBrains" },
  "skillbox.ru": { code: "skillbox", name: "Skillbox" },
  "netology.ru": { code: "netology", name: "Нетология" },
  "skillfactory.ru": { code: "skillfactory", name: "SkillFactory" },
  "practicum.yandex.ru": { code: "yandex-practicum", name: "Яндекс Практикум" },
};

/** Хост без www. и в нижнем регистре; null для неверной ссылки */
export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

const sameOrSub = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

/** Площадка по домену ссылки: сначала справочник площадок (его адреса сайтов), затем встроенный список */
export function matchPlatform(url: string, platforms: readonly PlatformRef[]): PlatformRef | null {
  const host = hostOf(url);
  if (!host) return null;
  // LinkedIn Learning — раздел общего сайта
  if (sameOrSub(host, "linkedin.com") && new URL(url).pathname.startsWith("/learning")) {
    return platforms.find((p) => p.code === "linkedin-learning") ?? { code: "linkedin-learning", name: "LinkedIn Learning" };
  }
  let best: PlatformRef | null = null;
  let bestLen = 0;
  for (const p of platforms) {
    const site = p.websiteUrl ? hostOf(p.websiteUrl) : null;
    if (site && sameOrSub(host, site) && site.length > bestLen) {
      best = p;
      bestLen = site.length;
    }
  }
  if (best) return best;
  const known = Object.entries(KNOWN_HOSTS)
    .filter(([domain]) => sameOrSub(host, domain))
    .sort((a, b) => b[0].length - a[0].length)[0]?.[1];
  if (!known) return null;
  return platforms.find((p) => p.code === known.code) ?? known;
}

// ---------- HTML ----------

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", laquo: "«", raquo: "»", mdash: "—", ndash: "–", hellip: "…" };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

const clean = (s: string | null | undefined, max: number): string | null => {
  if (!s) return null;
  const v = decodeEntities(s).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return v ? v.slice(0, max) : null;
};

/** Атрибуты тега: name="…", content='…', property=… */
function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of Array.from(tag.matchAll(/([a-zA-Z:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g))) {
    out[m[1].toLowerCase()] = m[3] ?? m[4] ?? m[5] ?? "";
  }
  return out;
}

/** Абсолютная http(s)-ссылка относительно страницы; иное — null */
export function absoluteHttpUrl(value: string | null | undefined, base: string): string | null {
  if (!value) return null;
  try {
    const u = new URL(decodeEntities(value.trim()), base);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Курс из JSON-LD (schema.org Course / Product) */
function jsonLdCourse(html: string): { name?: string; description?: string; image?: string; provider?: string } | null {
  for (const m of Array.from(html.matchAll(/<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))) {
    let data: unknown;
    try { data = JSON.parse(m[1].trim()); } catch { continue; }
    const items: any[] = [];
    const walk = (v: any) => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") { items.push(v); if (v["@graph"]) walk(v["@graph"]); }
    };
    walk(data);
    const course = items.find((i) => [].concat(i["@type"] ?? []).some((t: string) => t === "Course"));
    if (course) {
      const image = typeof course.image === "string" ? course.image : course.image?.url ?? (Array.isArray(course.image) ? course.image[0] : undefined);
      const provider = typeof course.provider === "string" ? course.provider : course.provider?.name;
      return { name: course.name, description: course.description, image: typeof image === "string" ? image : undefined, provider };
    }
  }
  return null;
}

export function parseCourseMeta(html: string, pageUrl: string): CourseMeta {
  const head = html.slice(0, 500_000);
  const meta: Record<string, string> = {};
  for (const m of Array.from(head.matchAll(/<meta\b[^>]*>/gi))) {
    const a = attrs(m[0]);
    const key = (a.property || a.name || "").toLowerCase();
    if (key && a.content !== undefined && !(key in meta)) meta[key] = a.content;
  }
  let canonical: string | null = null;
  for (const m of Array.from(head.matchAll(/<link\b[^>]*>/gi))) {
    const a = attrs(m[0]);
    if ((a.rel || "").toLowerCase().split(/\s+/).includes("canonical")) { canonical = a.href ?? null; break; }
  }
  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(head)?.[1];
  const ld = jsonLdCourse(head);

  return {
    title: clean(meta["og:title"] ?? meta["twitter:title"] ?? ld?.name ?? titleTag, 500),
    description: clean(meta["og:description"] ?? meta["twitter:description"] ?? meta["description"] ?? ld?.description, 2000),
    imageUrl: absoluteHttpUrl(meta["og:image"] ?? meta["og:image:url"] ?? meta["twitter:image"] ?? ld?.image, pageUrl),
    siteName: clean(meta["og:site_name"] ?? ld?.provider, 100),
    canonicalUrl: absoluteHttpUrl(canonical ?? meta["og:url"], pageUrl),
  };
}

/** Название из адреса, если страницу не удалось прочитать: …/learn/machine-learning → «Machine Learning» */
export function titleFromUrl(url: string): string | null {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean).map((p) => decodeURIComponent(p));
    const slug = [...parts].reverse().find((p) => /[a-zа-яё]/i.test(p) && !/^(learn|course|courses|program|programs|specializations?|professional-certificates|catalog|lesson|ru|en|fr|de|es|it)$/i.test(p) && !/^\d+$/.test(p));
    if (!slug) return null;
    const words = slug.replace(/\.[a-z]{2,5}$/i, "").replace(/[-_+]+/g, " ").replace(/\s+/g, " ").trim();
    return words ? words.charAt(0).toUpperCase() + words.slice(1) : null;
  } catch {
    return null;
  }
}

// ---------- адреса ----------

/** Адрес из публичного интернета: не локальный, не частный, не служебный (защита от SSRF) */
export function isPublicAddress(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127) return false;
    if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT
    if (a === 169 && b === 254) return false; // link-local, метаданные облака
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 192 && b === 0) return false; // 192.0.0.0/24, 192.0.2.0/24
    if (a === 198 && (b === 18 || b === 19)) return false; // тестовые сети
    if (a >= 224) return false; // multicast и зарезервированные
    return true;
  }
  if (v === 6) {
    const s = ip.toLowerCase();
    if (s === "::" || s === "::1") return false;
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(s);
    if (mapped) return isPublicAddress(mapped[1]);
    if (/^f[cd]/.test(s)) return false; // fc00::/7
    if (/^fe[89ab]/.test(s)) return false; // fe80::/10
    if (/^ff/.test(s)) return false; // multicast
    if (s.startsWith("2001:db8") || s.startsWith("64:ff9b")) return false;
    return true;
  }
  return false;
}
