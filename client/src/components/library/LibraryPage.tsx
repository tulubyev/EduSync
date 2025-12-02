import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  ExternalLink
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
    setIsModalOpen(false);
  };

  const handleEditNote = async (data: any) => {
    if (!editingNote) return;
    
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`/api/library/${editingNote.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) throw new Error('Ошибка обновления материала');
    
    setEditingNote(null);
    await fetchNotes();
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm('Удалить этот материал?')) return;
    
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
    if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('.mp4') || url.includes('.webm')) {
      return <Video className="h-4 w-4 text-red-500" />;
    }
    if (url.includes('.mp3') || url.includes('.wav') || url.includes('.ogg')) {
      return <Music className="h-4 w-4 text-purple-500" />;
    }
    if (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.gif') || url.includes('.webp')) {
      return <ImageIcon className="h-4 w-4 text-blue-500" />;
    }
    return <LinkIcon className="h-4 w-4 text-gray-500" />;
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Библиотека
          </h1>
          <p className="text-muted-foreground mt-1">
            {notes.length} материалов
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Новый материал
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск материалов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
          <SelectTrigger className="w-[200px]">
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

      <div className="flex gap-6">
        <div className="flex-1">
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNotes.map((note) => (
                <Card 
                  key={note.id} 
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    selectedNote?.id === note.id ? 'ring-2 ring-primary' : ''
                  } ${note.isPinned ? 'border-yellow-300 bg-yellow-50/50' : ''}`}
                  onClick={() => setSelectedNote(note)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base line-clamp-1">
                        {note.isPinned && '📌 '}{note.title}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePin(note);
                        }}
                      >
                        {note.isPinned ? (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        ) : (
                          <StarOff className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                      {truncateContent(note.content)}
                    </p>
                    
                    {note.resourceUrl && (
                      <a 
                        href={note.resourceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mb-2"
                      >
                        {getResourceIcon(note.resourceUrl)}
                        <span className="truncate">Ресурс</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    
                    {note.platform && (
                      <Badge variant="outline" className="mb-2 mr-2">
                        🔗 {note.platform.name}
                      </Badge>
                    )}
                    
                    {note.course && (
                      <Badge variant="outline" className="mb-2">
                        📚 {note.course.title}
                      </Badge>
                    )}
                    
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {note.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                        {note.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{note.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(note.updatedAt), 'd MMM yyyy', { locale: ru })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {selectedNote && (
          <div className="w-96 hidden lg:block">
            <Card className="sticky top-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{selectedNote.title}</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopyContent(selectedNote.content)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingNote(selectedNote)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteNote(selectedNote.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{selectedNote.content}</p>
                </div>
                
                {selectedNote.resourceUrl && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Ресурс:</p>
                    <a 
                      href={selectedNote.resourceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 break-all"
                    >
                      {getResourceIcon(selectedNote.resourceUrl)}
                      <span className="underline">{selectedNote.resourceUrl}</span>
                      <ExternalLink className="h-4 w-4 flex-shrink-0" />
                    </a>
                  </div>
                )}
                
                {selectedNote.platform && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Платформа: {selectedNote.platform.name}
                    </p>
                  </div>
                )}
                
                {selectedNote.course && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Курс: {selectedNote.course.title}
                    </p>
                  </div>
                )}
                
                {selectedNote.tags && selectedNote.tags.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex flex-wrap gap-1">
                      {selectedNote.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                  <p>Создано: {format(new Date(selectedNote.createdAt), 'd MMMM yyyy, HH:mm', { locale: ru })}</p>
                  <p>Обновлено: {format(new Date(selectedNote.updatedAt), 'd MMMM yyyy, HH:mm', { locale: ru })}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <MaterialModal
        open={isModalOpen || !!editingNote}
        onClose={() => {
          setIsModalOpen(false);
          setEditingNote(null);
        }}
        onSubmit={editingNote ? handleEditNote : handleAddNote}
        initialData={editingNote || undefined}
        courses={courses}
        platforms={platforms}
        isEditing={!!editingNote}
      />
    </div>
  );
}

interface MaterialModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: Note;
  courses: Course[];
  platforms: Platform[];
  isEditing?: boolean;
}

function MaterialModal({ open, onClose, onSubmit, initialData, courses, platforms, isEditing }: MaterialModalProps) {
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

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
        content: initialData.content,
        resourceUrl: initialData.resourceUrl || '',
        platformId: initialData.platformId || '',
        courseId: initialData.courseId || '',
        tags: initialData.tags?.join(', ') || '',
        isPinned: initialData.isPinned,
      });
    }
  }, [initialData]);

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
                onValueChange={(value) => setFormData(prev => ({ ...prev, platformId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите платформу" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не выбрана</SelectItem>
                  {platforms.map((platform) => (
                    <SelectItem key={platform.id} value={platform.id}>{platform.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Курс (опционально)</Label>
              <Select 
                value={formData.courseId} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, courseId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите курс" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не выбран</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                  ))}
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
            <Label>Ссылка на ресурс</Label>
            <Input
              type="url"
              value={formData.resourceUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, resourceUrl: e.target.value }))}
              placeholder="https://example.com/material или https://youtube.com/watch?v=..."
            />
            <p className="text-xs text-muted-foreground">
              Поддерживаются: текст, изображения (jpg, png), видео (YouTube, mp4), аудио (mp3, wav)
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
