/**
 * «Добавить курс по ссылке» (#19): загрузка страницы курса и разбор — название, описание, обложка, площадка.
 * Защита от SSRF: только http(s) на портах 80/443; каждый адрес из DNS проверяется, и соединение идёт именно на
 * проверенный адрес (подмена DNS между проверкой и запросом не проходит); редиректы проверяются заново;
 * ограничены время, размер и тип ответа.
 */
import http from "http";
import https from "https";
import { lookup as dnsLookup } from "dns";
import { createGunzip, createInflate, createBrotliDecompress } from "zlib";
import type { LookupFunction } from "net";
import { isPublicAddress, matchPlatform, parseCourseMeta, titleFromUrl, type CourseMeta, type PlatformRef } from "./coursePreviewParse";

const TIMEOUT_MS = 8000;
const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 4;

export class PreviewError extends Error {
  constructor(public code: "invalid_url" | "blocked" | "unavailable") {
    super(code);
  }
}

/** DNS только в публичные адреса — иначе ошибка до соединения */
const safeLookup = (allowPrivate: boolean): LookupFunction => (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return (callback as any)(err);
    const list = (addresses as unknown as Array<{ address: string; family: number }>) ?? [];
    const ok = list.filter((a) => allowPrivate || isPublicAddress(a.address));
    if (ok.length === 0) return (callback as any)(Object.assign(new Error("blocked address"), { code: "EBLOCKED" }));
    if ((options as any)?.all) return (callback as any)(null, ok);
    (callback as any)(null, ok[0].address, ok[0].family);
  });
};

function checkUrl(raw: string, allowPrivate: boolean): URL {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new PreviewError("invalid_url");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new PreviewError("invalid_url");
  if (u.username || u.password) throw new PreviewError("invalid_url");
  const port = u.port ? Number(u.port) : u.protocol === "https:" ? 443 : 80;
  if (!allowPrivate && port !== 80 && port !== 443) throw new PreviewError("blocked");
  // IP прямо в адресе — проверяем сразу
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (!allowPrivate && /^[\d.]+$|:/.test(host) && !isPublicAddress(host)) throw new PreviewError("blocked");
  if (!allowPrivate && /^(localhost|.*\.local|.*\.internal)$/i.test(host)) throw new PreviewError("blocked");
  return u;
}

function requestOnce(u: URL, lang: string, allowPrivate: boolean): Promise<{ status: number; location?: string; type: string; body: string }> {
  return new Promise((resolve, reject) => {
    const mod = u.protocol === "https:" ? https : http;
    const req = mod.request(
      u,
      {
        method: "GET",
        lookup: safeLookup(allowPrivate),
        timeout: TIMEOUT_MS,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; MyEPA-LinkPreview/1.0; +https://myepa.ru)",
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
          "Accept-Language": `${lang},en;q=0.8`,
          "Accept-Encoding": "gzip, deflate, br",
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          return resolve({ status, location: res.headers.location, type: "", body: "" });
        }
        const type = String(res.headers["content-type"] ?? "");
        if (status >= 400 || !/text\/html|application\/xhtml/i.test(type)) {
          res.resume();
          return resolve({ status, type, body: "" });
        }
        const enc = String(res.headers["content-encoding"] ?? "").toLowerCase();
        const stream = enc === "gzip" ? res.pipe(createGunzip()) : enc === "deflate" ? res.pipe(createInflate()) : enc === "br" ? res.pipe(createBrotliDecompress()) : res;
        const chunks: Buffer[] = [];
        let size = 0;
        stream.on("data", (c: Buffer) => {
          size += c.length;
          if (size > MAX_BYTES) {
            // хватит головы страницы: метаданные — в <head>
            stream.destroy();
            req.destroy();
            return resolve({ status, type, body: Buffer.concat(chunks).toString("utf8") });
          }
          chunks.push(c);
        });
        stream.on("end", () => resolve({ status, type, body: Buffer.concat(chunks).toString("utf8") }));
        stream.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end();
  });
}

/** HTML страницы с проверкой каждого перехода; allowPrivate — только для тестов на локальном сервере */
export async function fetchCoursePage(raw: string, opts: { lang?: string; allowPrivate?: boolean } = {}): Promise<{ url: string; html: string }> {
  const allowPrivate = !!opts.allowPrivate;
  let u = checkUrl(raw, allowPrivate);
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    let r;
    try {
      r = await requestOnce(u, opts.lang ?? "en", allowPrivate);
    } catch (e) {
      throw new PreviewError((e as { code?: string }).code === "EBLOCKED" ? "blocked" : "unavailable");
    }
    if (r.location) {
      u = checkUrl(new URL(r.location, u).toString(), allowPrivate);
      continue;
    }
    if (!r.body) throw new PreviewError("unavailable");
    return { url: u.toString(), html: r.body };
  }
  throw new PreviewError("unavailable");
}

export interface CoursePreview extends CourseMeta {
  courseUrl: string;
  platform: { id: string | null; code: string; name: string } | null;
  /** Страница не прочиталась — название взято из адреса */
  partial: boolean;
}

/** Сведения о курсе по ссылке; площадка определяется даже без страницы */
export async function previewCourse(raw: string, platforms: readonly PlatformRef[], opts: { lang?: string; allowPrivate?: boolean } = {}): Promise<CoursePreview> {
  const url = checkUrl(raw, !!opts.allowPrivate).toString();
  const platformOf = (u: string) => {
    const p = matchPlatform(u, platforms);
    return p ? { id: p.id ?? null, code: p.code, name: p.name } : null;
  };
  try {
    const page = await fetchCoursePage(url, opts);
    const meta = parseCourseMeta(page.html, page.url);
    const courseUrl = meta.canonicalUrl && matchPlatform(meta.canonicalUrl, platforms)?.code === matchPlatform(url, platforms)?.code ? meta.canonicalUrl : page.url;
    return { ...meta, title: meta.title ?? titleFromUrl(url), courseUrl, platform: platformOf(url), partial: false };
  } catch (e) {
    if (e instanceof PreviewError && e.code !== "unavailable") throw e;
    return { title: titleFromUrl(url), description: null, imageUrl: null, siteName: null, canonicalUrl: null, courseUrl: url, platform: platformOf(url), partial: true };
  }
}
