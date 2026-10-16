import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { LibraryTreeNav } from './LibraryTreeNav';
import { ResizeHandle } from './ResizeHandle';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  FileText, 
  Search, 
  Trash2,
  Edit,
  Star,
  StarOff,
  Copy,
  Link as LinkIcon,
  Music,
  Video,
  Image as ImageIcon,
  ExternalLink,
  List,
  Grid3x3
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Note {
  id: string;
  courseId?: string;
  platformId?: string;
  title: string;
  content: string;
  resourceUrl?: string;
  tags?: string[];
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  course?: {
    title: string;
  };
  platform?: {
    name: string;
  };
}

interface Course {
  id: string;
  title: string;
}

interface Platform {
  id: string;
  name: string;
}

export function LibraryPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeType, setSelectedNodeType] = useState<string>('');
  const [leftWidth, setLeftWidth] = useState(224);
  const [rightWidth, setRightWidth] = useState(384);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/library', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Ошибка загрузки материалов');

      const data = await response.json();
      setNotes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/courses', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Ошибка загрузки курсов');

      const data = await response.json();
      setCourses(data);
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  const fetchPlatforms = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/platforms/by-region', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Ошибка загрузки платформ');

      const data = await response.json();
      const allPlatforms: Platform[] = [];

      Object.values(data).forEach((regionPlatforms: any) => {
        if (Array.isArray(regionPlatforms)) {
          regionPlatforms.forEach((p: any) => {
            allPlatforms.push({ id: p.id, name: p.name });
          });
        }
      });

      setPlatforms(allPlatforms);
    } catch (err) {
      console.error('Error fetching platforms:', err);
    }
  };

  useEffect(() => {
    fetchNotes();
    fetchCourses();
    fetchPlatforms();
  }, []);

  const handleAddNote = async (data: any) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch('/api/library', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error('Ошибка создания материала');

    await fetchNotes();
  };

  const handleEditNote = async (id: string, data: any) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`/api/library/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error('Ошибка обновления материала');

    await fetchNotes();
  };

  const handleDeleteNote = async (id: string) => {

    const token = localStorage.getItem('accessToken');
    const response = await fetch(`/api/library/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error('Ошибка удаления');

    if (selectedNote?.id === id) setSelectedNote(null);
    await fetchNotes();
  };

  const handleTogglePin = async (note: Note) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`/api/library/${note.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ isPinned: !note.isPinned }),
    });

    if (!response.ok) throw new Error('Ошибка обновления');

    await fetchNotes();
  };

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const filteredNotes = notes
    .filter(note => {
      if (selectedNodeId) {
        if (selectedNodeId === 'pinned') return note.isPinned;
        if (selectedNodeId.startsWith('material-')) return note.id === selectedNodeId.replace('material-', '');
        if (selectedNodeId.startsWith('platform-')) return note.platformId === selectedNodeId.replace('platform-', '');
        if (selectedNodeId.startsWith('course-')) return note.courseId === selectedNodeId.replace('course-', '');
        if (selectedNodeId.startsWith('tag-')) {
          const tag = selectedNodeId.replace('tag-', '');
          return note.tags?.includes(tag);
        }
        if (selectedNodeId === 'uncategorized') return !note.platformId && !note.courseId && (!note.tags || note.tags.length === 0);
        if (selectedNodeId === 'platforms' || selectedNodeId === 'courses' || selectedNodeId === 'tags') return true;
      }
      return true;
    })
    .filter(note => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query) ||
          note.tags?.some(tag => tag.toLowerCase().includes(query))
        );
      }
      return true;
    })
    .filter(note => {
      if (selectedCourse === 'all') return true;
      if (selectedCourse === 'none') return !note.courseId;
      return note.courseId === selectedCourse;
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const getResourceIcon = (url: string) => {
    if (!url) return null;
    if (url.startsWith('data:image/') || url.includes('youtube.com') || url.includes('youtu.be') || url.includes('.mp4') || url.includes('.webm')) {
      return <Video className="h-4 w-4 text-red-500" />;
    }
    if (url.includes('.mp3') || url.includes('.wav') || url.includes('.ogg') || url.startsWith('data:audio/')) {
      return <Music className="h-4 w-4 text-purple-500" />;
    }
    if (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.gif') || url.includes('.webp') || url.startsWith('data:image/')) {
      return <ImageIcon className="h-4 w-4 text-blue-500" />;
    }
    return <LinkIcon className="h-4 w-4 text-gray-500" />;
  };

  const renderResource = (url: string) => {
    if (!url) return null;
    if (url.startsWith('data:image/')) {
      return <img src={url} alt="Загруженное изображение" className="max-w-full max-h-96 rounded border" />;
    }
    if (url.startsWith('data:video/')) {
      return <video src={url} controls className="max-w-full max-h-96 rounded border" />;
    }
    if (url.startsWith('data:audio/')) {
      return <audio src={url} controls className="w-full" />;
    }
    // Записи трансляций и другие видеофайлы по ссылке — играют прямо в карточке
    if (/^https?:\/\/.+\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url)) {
      return <video src={url} controls playsInline preload="metadata" className="max-w-full max-h-96 rounded border bg-black" />;
    }
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 break-all">
        {getResourceIcon(url)}
        <span className="underline">{url.substring(0, 50)}...</span>
        <ExternalLink className="h-4 w-4 flex-shrink-0" />
      </a>
    );
  };

  const getResourcePreview = (url: string) => {
    if (!url) return null;
    if (url.startsWith('data:image/')) {
      const type = url.substring(11, url.indexOf(';')).toUpperCase();
      return <div className="flex items-center gap-1"><ImageIcon className="h-3 w-3 text-blue-500" /><span className="text-xs truncate">{type}</span></div>;
    }
    if (url.startsWith('data:video/')) {
      const type = url.substring(11, url.indexOf(';')).toUpperCase();
      return <div className="flex items-center gap-1"><Video className="h-3 w-3 text-red-500" /><span className="text-xs truncate">{type}</span></div>;
    }
    if (url.startsWith('data:audio/')) {
      const type = url.substring(11, url.indexOf(';')).toUpperCase();
      return <div className="flex items-center gap-1"><Music className="h-3 w-3 text-purple-500" /><span className="text-xs truncate">{type}</span></div>;
    }
    return <div className="flex items-center gap-1"><LinkIcon className="h-3 w-3 text-gray-500" /><span className="text-xs truncate">{url.substring(0, 20)}...</span></div>;
  };

  const isImageUrl = (url: string) => {
    if (!url) return false;
    return url.startsWith('data:image/') || 
           url.includes('.jpg') || 
           url.includes('.jpeg') || 
           url.includes('.png') || 
           url.includes('.gif') || 
           url.includes('.webp');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
            Библиотека
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {notes.length} материалов
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant={viewMode === 'list' ? 'default' : 'outline'} 
            size="icon"
            title="Список"
            className="min-h-11 min-w-11"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button 
            variant={viewMode === 'grid' ? 'default' : 'outline'} 
            size="icon"
            title="Сетка"
            className="min-h-11 min-w-11"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button onClick={() => setIsModalOpen(true)} className="min-h-11">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Новый материал</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск материалов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 min-h-11"
          />
        </div>

        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
          <SelectTrigger className="w-full sm:w-[200px] min-h-11">
            <SelectValue placeholder="Фильтр по курсу" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все курсы</SelectItem>
            <SelectItem value="none">Без курса</SelectItem>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-200px)] lg:h-[calc(100vh-200px)]">
        <div className="hidden lg:block w-56 flex-shrink-0">
          <LibraryTreeNav 
            notes={notes} 
            selectedNodeId={selectedNodeId}
            selectedMaterialId={selectedNote?.id}
            onSelectNode={(nodeId, type) => {
              setSelectedNodeId(nodeId);
              setSelectedNodeType(type);
            }}
            onSelectMaterial={(note) => {
              setSelectedNote(note);
            }}
          />
        </div>

        <div className="hidden lg:block">
          <ResizeHandle 
            onResize={(delta) => {
              setLeftWidth(prev => Math.max(150, Math.min(400, prev + delta)));
            }}
          />
        </div>

        <div className="flex-1 overflow-x-hidden">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Нет материалов</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'Ничего не найдено' : 'Создайте первый материал'}
              </p>
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Новый материал
              </Button>
            </div>
          ) : viewMode === 'list' ? (
            <div className="flex flex-col gap-1 overflow-y-auto">
              {filteredNotes.map((note) => (
                <div 
                  key={note.id} 
                  className={`cursor-pointer hover:bg-accent/50 transition-colors flex items-center gap-2 px-2 py-1.5 rounded border ${
                    selectedNote?.id === note.id ? 'bg-accent ring-1 ring-primary' : 'bg-background'
                  } ${note.isPinned ? 'border-yellow-300 bg-yellow-50/30' : 'border-transparent'}`}
                  onClick={() => setSelectedNote(note)}
                >
                  {note.resourceUrl && isImageUrl(note.resourceUrl) && (
                    <img 
                      src={note.resourceUrl} 
                      alt="" 
                      className="w-8 h-8 object-cover rounded flex-shrink-0"
                    />
                  )}
                  {note.resourceUrl && !isImageUrl(note.resourceUrl) && (
                    <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded flex-shrink-0">
                      {getResourceIcon(note.resourceUrl)}
                    </div>
                  )}
                  {!note.resourceUrl && (
                    <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded flex-shrink-0">
                      <FileText className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      {note.isPinned && <span className="text-xs">📌</span>}
                      <span className="text-sm font-medium truncate">{note.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {truncateContent(note.content, 60)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(note.updatedAt), 'd.MM', { locale: ru })}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePin(note);
                      }}
                    >
                      {note.isPinned ? (
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                      ) : (
                        <StarOff className="h-3 w-3 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 overflow-y-auto">
              {filteredNotes.map((note) => (
                <div 
                  key={note.id} 
                  className={`cursor-pointer hover:shadow-md transition-all rounded-lg border p-2 ${
                    selectedNote?.id === note.id ? 'ring-2 ring-primary bg-accent' : 'bg-background'
                  } ${note.isPinned ? 'border-yellow-300 bg-yellow-50/30' : ''}`}
                  onClick={() => setSelectedNote(note)}
                >
                  {note.resourceUrl && isImageUrl(note.resourceUrl) && (
                    <img 
                      src={note.resourceUrl} 
                      alt="" 
                      className="w-full h-20 object-cover rounded mb-1"
                    />
                  )}
                  {note.resourceUrl && !isImageUrl(note.resourceUrl) && (
                    <div className="w-full h-20 flex items-center justify-center bg-gray-100 rounded mb-1">
                      {getResourceIcon(note.resourceUrl)}
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium line-clamp-1">
                        {note.isPinned && '📌 '}{note.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {truncateContent(note.content, 40)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePin(note);
                      }}
                    >
                      {note.isPinned ? (
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                      ) : (
                        <StarOff className="h-3 w-3 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="hidden lg:block">
          <ResizeHandle 
            onResize={(delta) => {
              setRightWidth(prev => Math.max(200, Math.min(600, prev - delta)));
            }}
          />
        </div>

        {selectedNote && (
          <div className="hidden lg:flex flex-col w-96 flex-shrink-0">
            <Card className="flex-1 rounded-lg border-l">
              <CardHeader className="border-b">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="line-clamp-2">{selectedNote.title}</CardTitle>
                    {selectedNote.platform && (
                      <Badge variant="secondary" className="mt-2">
                        {selectedNote.platform.name}
                      </Badge>
                    )}
                    {selectedNote.course && (
                      <Badge variant="outline" className="mt-2 ml-2">
                        {selectedNote.course.title}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleTogglePin(selectedNote)}
                    >
                      {selectedNote.isPinned ? (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      ) : (
                        <StarOff className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditingNote(selectedNote)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDeleteNote(selectedNote.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 pt-4 overflow-y-auto">
                {selectedNote.tags && selectedNote.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedNote.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {selectedNote.resourceUrl && renderResource(selectedNote.resourceUrl)}

                <div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                    {selectedNote.content}
                  </p>
                </div>

                <div className="pt-4 border-t text-xs text-muted-foreground">
                  <p>Создано: {format(new Date(selectedNote.createdAt), 'dd MMMM yyyy, HH:mm', { locale: ru })}</p>
                  <p>Обновлено: {format(new Date(selectedNote.updatedAt), 'dd MMMM yyyy, HH:mm', { locale: ru })}</p>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyContent(selectedNote.content)}
                  className="w-full"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Копировать текст
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <MaterialModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingNote(null);
        }}
        onSubmit={editingNote ? (data) => handleEditNote(editingNote.id, data) : handleAddNote}
        isEditing={!!editingNote}
        initialData={editingNote}
        courses={courses}
        platforms={platforms}
      />
    </div>
  );
}

interface MaterialModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void | Promise<void>;
  isEditing?: boolean;
  initialData?: Note | null;
  courses: Course[];
  platforms: Platform[];
}

function MaterialModal({ open, onClose, onSubmit, isEditing = false, initialData, courses, platforms }: MaterialModalProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    content: initialData?.content || '',
    resourceUrl: initialData?.resourceUrl || '',
    platformId: initialData?.platformId || '',
    courseId: initialData?.courseId || '',
    tags: initialData?.tags?.join(', ') || '',
    isPinned: initialData?.isPinned || false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [platformSearch, setPlatformSearch] = useState('');
  const [courseSearch, setCourseSearch] = useState('');

  const filteredPlatforms = platforms.filter(p => 
    p.name.toLowerCase().includes(platformSearch.toLowerCase())
  );
  
  const filteredCourses = courses.filter(c =>
    c.title.toLowerCase().includes(courseSearch.toLowerCase())
  );

  const compressImage = (file: File) => {
    return new Promise<Blob>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxWidth = 1920;
          const maxHeight = 1080;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round(height * (maxWidth / width));
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round(width * (maxHeight / height));
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx!.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          }, 'image/jpeg', 0.85);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Файл должен быть не больше 5 МБ');
      return;
    }

    setIsConverting(true);
    setUploadedFileName(file.name);

    try {
      let processedFile = file;
      if (file.type.startsWith('image/')) {
        const compressed = await compressImage(file);
        processedFile = new File([compressed], file.name, { type: 'image/jpeg' });
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Data = event.target?.result as string;
        setFormData(prev => ({ ...prev, resourceUrl: base64Data }));
        setIsConverting(false);
      };
      reader.readAsDataURL(processedFile);
    } catch (error) {
      console.error('Ошибка при обработке файла:', error);
      setIsConverting(false);
      setUploadedFileName('');
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.content) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        resourceUrl: formData.resourceUrl || null,
        platformId: formData.platformId === 'none' ? null : formData.platformId || null,
        courseId: formData.courseId === 'none' ? null : formData.courseId || null,
        tags: formData.tags ? formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      });
      setFormData({
        title: '',
        content: '',
        resourceUrl: '',
        platformId: '',
        courseId: '',
        tags: '',
        isPinned: false,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Редактировать материал' : 'Новый материал'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Заголовок *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Название материала"
            />
          </div>

          <div className="space-y-2">
            <Label>Содержание *</Label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Текст материала..."
              rows={10}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Платформа (опционально)</Label>
              <Select 
                value={formData.platformId} 
                onValueChange={(value) => { setFormData(prev => ({ ...prev, platformId: value })); setPlatformSearch(''); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите платформу" />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2 border-b">
                    <Input
                      placeholder="🔍 Поиск платформы..."
                      value={platformSearch}
                      onChange={(e) => setPlatformSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-8"
                    />
                  </div>
                  <SelectItem value="none">Не выбрана</SelectItem>
                  {filteredPlatforms.map((platform) => (
                    <SelectItem key={platform.id} value={platform.id}>{platform.name}</SelectItem>
                  ))}
                  {filteredPlatforms.length === 0 && platformSearch && (
                    <div className="p-2 text-xs text-muted-foreground text-center">
                      Платформ не найдено
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Курс (опционально)</Label>
              <Select 
                value={formData.courseId} 
                onValueChange={(value) => { setFormData(prev => ({ ...prev, courseId: value })); setCourseSearch(''); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите курс" />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2 border-b">
                    <Input
                      placeholder="🔍 Поиск курса..."
                      value={courseSearch}
                      onChange={(e) => setCourseSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-8"
                    />
                  </div>
                  <SelectItem value="none">Не выбран</SelectItem>
                  {filteredCourses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                  ))}
                  {filteredCourses.length === 0 && courseSearch && (
                    <div className="p-2 text-xs text-muted-foreground text-center">
                      Курсов не найдено
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Теги</Label>
            <Input
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="теги, через, запятую"
            />
          </div>

          <div className="space-y-2">
            <Label>Ресурс (URL или файл)</Label>
            <div className="space-y-2">
              <Input
                type="url"
                value={formData.resourceUrl.startsWith('data:') ? '' : formData.resourceUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, resourceUrl: e.target.value }))}
                placeholder="https://example.com/material или https://youtube.com/watch?v=..."
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">ИЛИ загрузи файл:</span>
              </div>
              <Input
                type="file"
                onChange={handleFileUpload}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                className="cursor-pointer"
                disabled={isConverting}
              />
              {isConverting && (
                <p className="text-xs text-blue-600">⏳ Обработка файла...</p>
              )}
              {uploadedFileName && !isConverting && (
                <p className="text-xs text-green-600">✅ Загружено: {uploadedFileName}</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Поддерживаются: изображения, видео, аудио, PDF, документы (макс 5 МБ)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !formData.title || !formData.content}>
            {isSubmitting ? 'Сохранение...' : (isEditing ? 'Сохранить' : 'Создать')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}