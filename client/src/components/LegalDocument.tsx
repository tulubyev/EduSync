import { useEffect, useState } from 'react';
import { marked } from 'marked';
import { useLang } from '../i18n';

// Тексты правовых документов лежат в docs/legal/<язык>/<документ>.md — один источник для юриста и для сайта.
// Загружаются отдельными файлами по требованию, в основной бандл не попадают.
const sources = import.meta.glob('../../../docs/legal/*/*.md', { query: '?raw', import: 'default' }) as Record<
  string,
  () => Promise<string>
>;

export type LegalDocName = 'privacy-policy' | 'terms' | 'cookies' | 'consent';

export function LegalDocument({ doc }: { doc: LegalDocName }) {
  const { lang, m } = useLang();
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHtml(null);
    setFailed(false);
    // документы есть на русском и английском; для остальных языков — английский
    const load = sources[`../../../docs/legal/${lang}/${doc}.md`] ?? sources[`../../../docs/legal/en/${doc}.md`] ?? sources[`../../../docs/legal/ru/${doc}.md`];
    if (!load) {
      setFailed(true);
      return;
    }
    load()
      .then(text => {
        if (!cancelled) setHtml(marked.parse(text, { async: false }) as string);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [doc, lang]);

  if (failed) {
    return <p>{m.site.legal.loadError}</p>;
  }
  if (html === null) {
    return <p>{m.common.loading}</p>;
  }
  const translated = !!sources[`../../../docs/legal/${lang}/${doc}.md`];
  return (
    <>
      {!translated && <p><em>{m.site.legal.englishOnly}</em></p>}
      <style>{`
        .legal-doc table { width: 100%; border-collapse: collapse; margin: 0 0 24px; font-size: 14px; }
        .legal-doc th, .legal-doc td { border: 1px solid #e0e0e0; padding: 8px 10px; text-align: left; vertical-align: top; }
        .legal-doc th { background: #f1f3f5; }
        .legal-doc p, .legal-doc li { line-height: 1.6; color: #444; }
        .legal-doc ul, .legal-doc ol { padding-left: 24px; margin: 0 0 16px; }
        .legal-doc code { background: #f1f3f5; padding: 1px 4px; border-radius: 4px; }
        .legal-doc .legal-table-wrap { overflow-x: auto; }
      `}</style>
      {/* Текст из файлов репозитория (docs/legal), не из пользовательского ввода */}
      <div className="legal-doc" dangerouslySetInnerHTML={{ __html: html.replace(/<table>/g, '<div class="legal-table-wrap"><table>').replace(/<\/table>/g, '</table></div>') }} />
    </>
  );
}
