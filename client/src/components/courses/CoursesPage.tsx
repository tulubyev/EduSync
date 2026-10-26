import { useState, useEffect } from 'react';
import { CourseCard } from './CourseCard';
import { AddCourseModal } from './AddCourseModal';
import { SimilarCoursesModal } from './SimilarCoursesModal';
import { CatalogView, type CatalogCourse } from './CatalogView';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, BookOpen, Filter } from 'lucide-react';
import { useLang } from '@/i18n';

interface Course {
  id: string;
  title: string;
  description?: string;
  instructor?: string;
  imageUrl?: string;
  courseUrl?: string;
  category?: string;
  difficulty?: string;
  duration?: number;
  progress: string;
  status: string;
  isFavorite: boolean;
  platformId?: string;
  platformName?: string;
  cost?: number | null;
  tags?: string[];
}

interface Platform {
  id: string;
  name: string;
  color: string;
}

export function CoursesPage() {
  const { m } = useLang();
  const p = m.courses.page;
  const [courses, setCourses] = useState<Course[]>([]);
  const [catalogCourses, setCatalogCourses] = useState<CatalogCourse[]>([]);
  const [platforms, setPlatforms] = useState<Record<string, Platform>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [selectedCourseForSimilar, setSelectedCourseForSimilar] = useState<Course | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('updated');
  const [viewMode, setViewMode] = useState<'my' | 'catalog'>('my');

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      let coursesData: Course[] = [];
      
      // Fetch personal courses
      const coursesResponse = await fetch('/api/courses', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (coursesResponse.ok) {
        coursesData = await coursesResponse.json();
        setCourses(coursesData);
      }
      
      // Каталог — обезличенный справочник курсов (только после входа)
      const catalogResponse = await fetch('/api/courses/catalog/all', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (catalogResponse.ok) {
        const catalogData = await catalogResponse.json();
        setCatalogCourses(catalogData);
      }

      // Fetch platforms
      const platformsResponse = await fetch('/api/platforms', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (platformsResponse.ok) {
        const platformsData = await platformsResponse.json();
        const platformsMap: Record<string, Platform> = {};
        platformsData.forEach((p: any) => {
          platformsMap[p.id] = {
            id: p.id,
            name: p.name,
            color: p.color || '#667eea',
          };
        });
        setPlatforms(platformsMap);

        // Add platform names to courses
        if (coursesData.length > 0) {
          const coursesWithPlatforms = coursesData.map((course: Course) => ({
            ...course,
            platformName: course.platformId && platformsMap[course.platformId] ? platformsMap[course.platformId].name : undefined,
          }));
          setCourses(coursesWithPlatforms);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : m.common.loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddCourse = async (data: any) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch('/api/courses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(p.errCreate);
    }
    
    await fetchData();
  };

  // Курс из каталога → в свои: копируются только поля справочника
  const handleAddFromCatalog = async (c: CatalogCourse) => {
    const token = localStorage.getItem('accessToken');
    const body: Record<string, unknown> = { title: c.title };
    if (c.courseUrl) body.courseUrl = c.courseUrl;
    if (c.imageUrl) body.imageUrl = c.imageUrl;
    if (c.category) body.category = c.category;
    if (c.difficulty) body.difficulty = c.difficulty;
    if (c.platformId) body.platformId = c.platformId;
    const response = await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error((data as any).message || p.errAdd);
    }
    await fetchData();
  };

  const handleEditCourse = async (data: any) => {
    if (!editingCourse) return;
    
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`/api/courses/${editingCourse.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(p.errUpdate);
    }
    
    setEditingCourse(null);
    await fetchData();
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm(p.confirmDelete)) return;
    
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`/api/courses/${courseId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      alert((data as any).message || p.errDelete);
      return;
    }
    
    await fetchData();
  };

  const handleToggleFavorite = async (courseId: string) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`/api/courses/${courseId}/favorite`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(p.errFavorite);
    }
    
    await fetchData();
  };

  const handleUpdateProgress = async (courseId: string, progress: number) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`/api/courses/${courseId}/progress`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ progress }),
    });
    
    if (!response.ok) {
      throw new Error(p.errProgress);
    }
    
    await fetchData();
  };

  const handleUpdateStatus = async (courseId: string, status: string) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`/api/courses/${courseId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    
    if (!response.ok) {
      throw new Error(p.errStatus);
    }
    
    await fetchData();
  };

  const filteredCourses = courses
    .filter(course => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          course.title.toLowerCase().includes(query) ||
          course.description?.toLowerCase().includes(query) ||
          course.instructor?.toLowerCase().includes(query) ||
          course.tags?.some(tag => tag.toLowerCase().includes(query))
        );
      }
      return true;
    })
    .filter(course => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'favorites') return course.isFavorite;
      return course.status === statusFilter;
    })
    .filter(course => {
      if (categoryFilter === 'all') return true;
      return course.category === categoryFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'progress':
          return parseFloat(b.progress) - parseFloat(a.progress);
        case 'updated':
        default:
          return 0;
      }
    });

  const categories = Array.from(new Set(courses.map(c => c.category).filter(Boolean) as string[]));

  const stats = {
    total: courses.length,
    inProgress: courses.filter(c => c.status === 'in_progress').length,
    completed: courses.filter(c => c.status === 'completed').length,
    favorites: courses.filter(c => c.isFavorite).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={fetchData}>{p.retry}</Button>
      </div>
    );
  }

  const displayCourses = filteredCourses;
  
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            {viewMode === 'catalog' ? p.titleCatalog : p.titleMy}
          </h1>
          <p className="text-muted-foreground mt-1">
            {viewMode === 'catalog' 
              ? p.catalogCount(catalogCourses.length)
              : p.stats(stats.total, stats.inProgress, stats.completed)
            }
          </p>
        </div>
        {viewMode === 'my' && (
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {p.addCourse}
          </Button>
        )}
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'my' | 'catalog')} className="w-full mb-6">
        <TabsList>
          <TabsTrigger value="my">{p.tabMy(stats.total)}</TabsTrigger>
          <TabsTrigger value="catalog">{p.tabCatalog(catalogCourses.length)}</TabsTrigger>
        </TabsList>
      </Tabs>

      {viewMode === 'my' && (
        <>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={p.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-auto">
              <TabsList>
                <TabsTrigger value="all">{p.filterAll(stats.total)}</TabsTrigger>
                <TabsTrigger value="in_progress">{p.filterInProgress(stats.inProgress)}</TabsTrigger>
                <TabsTrigger value="completed">{p.filterCompleted(stats.completed)}</TabsTrigger>
                <TabsTrigger value="favorites">{p.filterFavorites(stats.favorites)}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex gap-4 mb-6">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder={p.category} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{p.allCategories}</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat!}>{m.courses.categories[cat] ?? cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={p.sort} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated">{p.sortUpdated}</SelectItem>
                  <SelectItem value="title">{p.sortTitle}</SelectItem>
                  <SelectItem value="progress">{p.sortProgress}</SelectItem>
                </SelectContent>
              </Select>
          </div>
        </>
      )}

      {viewMode === 'catalog' ? (
        <CatalogView
          courses={catalogCourses}
          platforms={platforms}
          myCourseUrls={new Set(courses.map((c) => c.courseUrl).filter((u): u is string => !!u))}
          onAdd={handleAddFromCatalog}
        />
      ) : displayCourses.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">{p.notFound}</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
              ? p.tryFilters
              : p.addFirst}
          </p>
          {!searchQuery && statusFilter === 'all' && categoryFilter === 'all' && (
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {p.addCourse}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onEdit={(c) => setEditingCourse(c)}
              onDelete={handleDeleteCourse}
              onToggleFavorite={handleToggleFavorite}
              onUpdateProgress={handleUpdateProgress}
              onUpdateStatus={handleUpdateStatus}
              onShowSimilar={(c) => setSelectedCourseForSimilar(c)}
            />
          ))}
        </div>
      )}

      <AddCourseModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddCourse}
        platforms={Object.values(platforms)}
      />

      <AddCourseModal
        open={!!editingCourse}
        onClose={() => setEditingCourse(null)}
        onSubmit={handleEditCourse}
        initialData={editingCourse ? {
          title: editingCourse.title,
          description: editingCourse.description || '',
          instructor: editingCourse.instructor || '',
          imageUrl: editingCourse.imageUrl || '',
          courseUrl: editingCourse.courseUrl || '',
          category: editingCourse.category || '',
          difficulty: editingCourse.difficulty || '',
          duration: editingCourse.duration?.toString() || '',
          cost: editingCourse.cost?.toString() || '',
          tags: editingCourse.tags?.join(', ') || '',
        } : undefined}
        isEditing={true}
      />

      <SimilarCoursesModal
        open={!!selectedCourseForSimilar}
        onClose={() => setSelectedCourseForSimilar(null)}
        currentCourse={selectedCourseForSimilar}
        allCourses={courses}
        platforms={platforms}
      />
    </div>
  );
}
