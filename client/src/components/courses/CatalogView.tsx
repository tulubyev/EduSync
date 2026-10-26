import { useMemo, useState } from 'react';
import { Check, ExternalLink, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLang } from '@/i18n';

/** Курс каталога — обезличенный, без владельца (GET /api/courses/catalog/all) */
export interface CatalogCourse {
  id: string;
  title: string;
  imageUrl?: string | null;
  courseUrl?: string | null;
  category?: string | null;
  difficulty?: string | null;
  platformId?: string | null;
  source?: string;
}

interface CatalogViewProps {
  courses: CatalogCourse[];
  platforms: Record<string, { id: string; name: string; color: string }>;
  /** Ссылки курсов ученика — чтобы отметить «Уже у вас» */
  myCourseUrls: Set<string>;
  onAdd: (course: CatalogCourse) => Promise<void>;
}

const SOURCE_NAMES: Record<string, string> = { stepik: 'Stepik' };
const OTHER = 'other';

/** Каталог по площадкам: курс принадлежит площадке или школе, данных учеников здесь нет */
export function CatalogView({ courses, platforms, myCourseUrls, onAdd }: CatalogViewProps) {
  const { m, lang } = useLang();
  const t = m.courses.catalog;
  const [platformFilter, setPlatformFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const groupOf = (c: CatalogCourse) => {
    if (c.platformId && platforms[c.platformId]) return { key: c.platformId, name: platforms[c.platformId].name, color: platforms[c.platformId].color };
    if (c.source && c.source !== 'manual') return { key: `source:${c.source}`, name: SOURCE_NAMES[c.source] ?? c.source, color: '#667eea' };
    return { key: OTHER, name: t.otherPlatforms, color: '#9ca3af' };
  };

  const groups = useMemo(() => {
    const map = new Map<string, { name: string; color: string; items: CatalogCourse[] }>();
    for (const c of courses) {
      const g = groupOf(c);
      if (!map.has(g.key)) map.set(g.key, { name: g.name, color: g.color, items: [] });
      map.get(g.key)!.items.push(c);
    }
    // по алфавиту, «Другие площадки» — в конце
    return Array.from(map.entries())
      .sort(([ka, a], [kb, b]) => (ka === OTHER ? 1 : kb === OTHER ? -1 : a.name.localeCompare(b.name, lang)));
  }, [courses, platforms, lang]);

  const q = query.trim().toLowerCase();
  const visible = groups
    .filter(([key]) => platformFilter === 'all' || key === platformFilter)
    .map(([key, g]) => [key, { ...g, items: g.items.filter((c) => !q || c.title.toLowerCase().includes(q)) }] as const)
    .filter(([, g]) => g.items.length > 0);

  const add = async (c: CatalogCourse) => {
    setAdding(c.id);
    setError(null);
    try {
      await onAdd(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errAdd);
    } finally {
      setAdding(null);
    }
  };

  if (courses.length === 0) {
    return <p className="py-16 text-center text-muted-foreground">{t.empty}</p>;
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={t.search} value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="md:w-[220px]" aria-label={t.platform}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allPlatforms}</SelectItem>
            {groups.map(([key, g]) => <SelectItem key={key} value={key}>{g.name} ({g.items.length})</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {visible.length === 0 && <p className="py-10 text-center text-muted-foreground">{t.nothingFound}</p>}

      <div className="space-y-8">
        {visible.map(([key, g]) => (
          <section key={key}>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: g.color }} />
              {g.name}
              <span className="text-sm font-normal text-muted-foreground">{g.items.length}</span>
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {g.items.map((c) => {
                const mine = !!c.courseUrl && myCourseUrls.has(c.courseUrl);
                return (
                  <div key={c.id} className="flex flex-col rounded-xl border bg-white p-4">
                    <h3 className="break-words font-medium text-gray-900">{c.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[g.name, c.category && (m.courses.categories[c.category] ?? c.category)].filter(Boolean).join(' · ')}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {c.courseUrl && (
                        <a href={c.courseUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-purple-700 hover:underline">
                          <ExternalLink className="h-4 w-4" /> {t.onPlatform}
                        </a>
                      )}
                      <span className="flex-1" />
                      {mine ? (
                        <span className="inline-flex items-center gap-1 text-sm text-green-700"><Check className="h-4 w-4" /> {t.alreadyYours}</span>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => add(c)} disabled={adding === c.id}>
                          <Plus className="mr-1 h-4 w-4" /> {t.addToMine}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
