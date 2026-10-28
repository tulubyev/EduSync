import { useEffect, useState } from 'react';
import { LegalDocument, type LegalDocName } from './LegalDocument';
import { useLang } from '../i18n';
import type { Messages } from '../locales';
import type { SiteItem, SiteSection } from '../locales/site';

interface FooterPageProps {
  page: string;
  onBack: () => void;
}

// Публичные страницы сайта: адрес → страница. Открываются без входа и по прямой ссылке.
export const PUBLIC_PAGE_PATHS: Record<string, string> = {
  '/features/courses': 'course-management',
  '/features/progress': 'progress-tracking',
  '/features/deadlines': 'deadline-management',
  '/features/schedule': 'schedule-planning',
  '/docs': 'documentation',
  '/docs/api': 'api-reference',
  '/status': 'system-status',
  '/contacts': 'contact',
  '/privacy': 'privacy-policy',
  '/terms': 'terms-of-service',
  '/cookies': 'cookie-policy',
  '/consent': 'consent',
  '/security': 'security',
};

export function pathForPage(page: string): string {
  return Object.keys(PUBLIC_PAGE_PATHS).find(path => PUBLIC_PAGE_PATHS[path] === page) ?? '/';
}

// Страница сайта → её тексты в словаре (m.site.pages)
const PAGE_TEXTS: Record<string, keyof Messages['site']['pages']> = {
  'course-management': 'courses',
  'progress-tracking': 'progress',
  'deadline-management': 'deadlines',
  'schedule-planning': 'schedule',
  documentation: 'docs',
  'api-reference': 'api',
  'system-status': 'status',
  contact: 'contact',
  security: 'security',
};

const LEGAL_PAGES: Record<string, LegalDocName> = {
  'privacy-policy': 'privacy-policy',
  'terms-of-service': 'terms',
  'cookie-policy': 'cookies',
  consent: 'consent',
};

function ServiceStatus() {
  const { m, lang } = useLang();
  const t = m.site.serviceStatus;
  const [state, setState] = useState<'checking' | 'up' | 'down'>('checking');
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  useEffect(() => {
    fetch('/api/config/public')
      .then(res => res.json().then(() => res.ok))
      .then(ok => setState(ok ? 'up' : 'down'))
      .catch(() => setState('down'))
      .finally(() => setCheckedAt(new Date()));
  }, []);

  const label = state === 'checking' ? t.checking : state === 'up' ? t.up : t.down;
  return (
    <section>
      <h2>{t.title}</h2>
      <div className="status-grid">
        <div className={`status-item ${state === 'up' ? 'operational' : ''}`}>
          <span className="status-indicator"></span>
          <span>{t.server}</span>
          <span className="status-label">{label}</span>
        </div>
      </div>
      {checkedAt && (
        <p>{t.checkedAt(checkedAt.toLocaleString(lang))}</p>
      )}
    </section>
  );
}

function Item({ item }: { item: SiteItem }) {
  if (typeof item === 'string') return <li>{item}</li>;
  return <li><strong>{item[0]}</strong> — {item[1]}</li>;
}

function Section({ section }: { section: SiteSection }) {
  return (
    <section>
      <h2>{section.title}</h2>
      {section.text?.map((line, i) => <p key={i}>{line}</p>)}
      {section.code?.map((block, i) => (
        <div key={i} className="code-block">
          {block.map((line, j) => <p key={j}>{j === 0 && block.length > 1 ? <strong>{line}</strong> : line}</p>)}
        </div>
      ))}
      {section.items && <ul>{section.items.map((item, i) => <Item key={i} item={item} />)}</ul>}
      {section.steps && <ol>{section.steps.map((item, i) => <Item key={i} item={item} />)}</ol>}
    </section>
  );
}

export function FooterPage({ page, onBack }: FooterPageProps) {
  const { m } = useLang();
  const renderContent = () => {
    const legal = LEGAL_PAGES[page];
    if (legal) return <LegalDocument doc={legal} />;
    const key = PAGE_TEXTS[page];
    const text = m.site.pages[key ?? 'notFound'];
    return (
      <>
        <h1>{text.title}</h1>
        <p className="subtitle">{text.subtitle}</p>
        {text.sections.map((section, i) => <Section key={i} section={section} />)}
        {key === 'status' && <ServiceStatus />}
      </>
    );
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'var(--card)',
        padding: '15px 40px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <img 
          src="/myepa-logo-clean.png" 
          alt="My EPA Logo" 
          style={{
            height: '50px',
            width: 'auto'
          }}
        />
        <button
          onClick={onBack}
          style={{
            padding: '10px 24px',
            background: '#5a6a7a',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ← {m.common.toHome}
        </button>
      </header>

      {/* Content */}
      <main style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '40px 20px'
      }}>
        <style>{`
          h1 {
            font-size: 32px;
            font-weight: 700;
            color: var(--foreground);
            margin: 0 0 12px 0;
          }
          .subtitle {
            font-size: 18px;
            color: var(--muted-foreground);
            margin: 0 0 40px 0;
          }
          section {
            margin-bottom: 40px;
          }
          h2 {
            font-size: 20px;
            font-weight: 600;
            color: var(--foreground);
            margin: 0 0 16px 0;
            padding-bottom: 8px;
            border-bottom: 2px solid #667eea;
          }
          ul, ol {
            padding-left: 24px;
            margin: 0;
          }
          ul { list-style: disc; }
          ol { list-style: decimal; }
          li {
            margin-bottom: 10px;
            line-height: 1.6;
            color: var(--card-foreground);
          }
          p {
            line-height: 1.7;
            color: var(--card-foreground);
            margin: 0 0 16px 0;
          }
          .platforms-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 12px;
            margin-top: 16px;
          }
          .platform-card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 16px;
            text-align: center;
            font-weight: 500;
            color: var(--foreground);
          }
          .code-block {
            background: #1a1a1a;
            color: #fff;
            padding: 16px;
            border-radius: 8px;
            margin: 12px 0;
            font-family: monospace;
            font-size: 14px;
          }
          .code-block p {
            color: #fff;
            margin: 4px 0;
          }
          .status-grid {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .status-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            background: var(--card);
            border-radius: 8px;
            border: 1px solid var(--border);
          }
          .status-item.operational .status-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #22c55e;
          }
          .status-label {
            margin-left: auto;
            color: #22c55e;
            font-weight: 500;
          }
        `}</style>
        {renderContent()}
      </main>
    </div>
  );
}
