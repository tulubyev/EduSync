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
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Trash2,
  Edit
} from 'lucide-react';
import { format, isBefore, isToday, isTomorrow, addDays, differenceInCalendarDays } from 'date-fns';
import { useLang } from '@/i18n';

interface Deadline {
  id: string;
  courseId?: string;
  title: string;
  description?: string;
  dueDate: string;
  priority: string;
  status: string;
  reminderDate?: string;
}

interface Course {
  id: string;
  title: string;
}

/** Radix Select не допускает пустое значение пункта — «без курса» хранится так */
const NO_COURSE = 'none';

export function DeadlinesPage() {
  const { m, lang } = useLang();
  const d = m.deadlines;
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState<Deadline | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const fetchDeadlines = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/deadlines', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error(d.errors.load);
      
      const data = await response.json();
      setDeadlines(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : m.common.loadError);
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
      
      if (!response.ok) throw new Error(d.errors.loadCourses);
      
      const data = await response.json();
      setCourses(data);
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  useEffect(() => {
    fetchDeadlines();
    fetchCourses();
  }, []);

  const handleAddDeadline = async (data: any) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch('/api/deadlines', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) throw new Error(d.errors.create);
    
    await fetchDeadlines();
    setIsModalOpen(false);
  };

  const handleEditDeadline = async (data: any) => {
    if (!editingDeadline) return;
    
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`/api/deadlines/${editingDeadline.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) throw new Error(d.errors.update);
    
    setEditingDeadline(null);
    await fetchDeadlines();
  };

  const handleDeleteDeadline = async (id: string) => {
    if (!confirm(d.confirmDelete)) return;
    
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`/api/deadlines/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      setError(d.errors.delete);
      return;
    }
    
    setError(null);
    await fetchDeadlines();
  };

  const handleCompleteDeadline = async (id: string) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`/api/deadlines/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ status: 'completed' }),
    });
    
    if (!response.ok) {
      setError(d.errors.update);
      return;
    }
    
    setError(null);
    await fetchDeadlines();
  };

  const courseTitle = (courseId?: string) => courses.find((c) => c.id === courseId)?.title;

  const getDeadlineStatus = (deadline: Deadline) => {
    if (deadline.status === 'completed') return 'completed';
    
    const dueDate = new Date(deadline.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isBefore(dueDate, today)) return 'overdue';
    if (isToday(dueDate)) return 'today';
    if (isTomorrow(dueDate)) return 'tomorrow';
    if (isBefore(dueDate, addDays(today, 7))) return 'this_week';
    return 'upcoming';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">{d.status.completed}</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800">{d.status.overdue}</Badge>;
      case 'today':
        return <Badge className="bg-orange-100 text-orange-800">{d.status.today}</Badge>;
      case 'tomorrow':
        return <Badge className="bg-yellow-100 text-yellow-800">{d.status.tomorrow}</Badge>;
      case 'this_week':
        return <Badge className="bg-blue-100 text-blue-800">{d.status.this_week}</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{d.status.upcoming}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">{m.events.priorities.urgent}</Badge>;
      case 'high':
        return <Badge variant="destructive">{d.priority.high}</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500">{d.priority.medium}</Badge>;
      default:
        return <Badge variant="secondary">{d.priority.low}</Badge>;
    }
  };

  const filteredDeadlines = deadlines
    .filter(d => {
      if (filterStatus === 'all') return true;
      if (filterStatus === 'active') return d.status !== 'completed';
      if (filterStatus === 'completed') return d.status === 'completed';
      return getDeadlineStatus(d) === filterStatus;
    })
    .sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  const stats = {
    total: deadlines.filter(d => d.status !== 'completed').length,
    overdue: deadlines.filter(d => getDeadlineStatus(d) === 'overdue').length,
    today: deadlines.filter(d => getDeadlineStatus(d) === 'today').length,
    completed: deadlines.filter(d => d.status === 'completed').length,
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
            <Calendar className="h-6 w-6" />
            {d.title}
          </h1>
          <p className="text-muted-foreground mt-1">
            {d.summaryActive(stats.total)}{stats.overdue > 0 && (
              <span className="text-red-500"> • {d.summaryOverdue(stats.overdue)}</span>
            )}{stats.today > 0 && (
              <span className="text-orange-500"> • {d.summaryToday(stats.today)}</span>
            )}
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {d.add}
        </Button>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {['all', 'active', 'today', 'this_week', 'overdue', 'completed'].map((status) => (
          <Button
            key={status}
            variant={filterStatus === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus(status)}
          >
            {d.filters[status]}
          </Button>
        ))}
      </div>

      {filteredDeadlines.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">{d.empty}</h3>
          <p className="text-muted-foreground mb-4">
            {filterStatus !== 'all' ? d.emptyFiltered : d.emptyHint}
          </p>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {d.add}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDeadlines.map((deadline) => {
            const status = getDeadlineStatus(deadline);
            const dueDate = new Date(deadline.dueDate);
            const daysLeft = differenceInCalendarDays(dueDate, new Date());
            
            return (
              <Card 
                key={deadline.id} 
                className={`transition-all ${
                  status === 'overdue' ? 'border-red-200 bg-red-50/50' :
                  status === 'today' ? 'border-orange-200 bg-orange-50/50' :
                  status === 'completed' ? 'opacity-60' : ''
                }`}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-medium ${status === 'completed' ? 'line-through' : ''}`}>
                          {deadline.title}
                        </h3>
                        {getStatusBadge(status)}
                        {getPriorityBadge(deadline.priority)}
                      </div>
                      
                      {deadline.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {deadline.description}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {dueDate.toLocaleString(lang, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {courseTitle(deadline.courseId) && (
                          <span className="flex items-center gap-1">
                            📚 {courseTitle(deadline.courseId)}
                          </span>
                        )}
                        {status !== 'completed' && status !== 'overdue' && (
                          <span>
                            {daysLeft === 0 ? d.today :
                             daysLeft === 1 ? d.tomorrow :
                             d.inDays(daysLeft)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {status !== 'completed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCompleteDeadline(deadline.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {d.markDone}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingDeadline(deadline)}
                        aria-label={m.common.edit}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteDeadline(deadline.id)}
                        aria-label={m.common.delete}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <DeadlineModal
        open={isModalOpen || !!editingDeadline}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDeadline(null);
        }}
        onSubmit={editingDeadline ? handleEditDeadline : handleAddDeadline}
        initialData={editingDeadline || undefined}
        courses={courses}
        isEditing={!!editingDeadline}
      />
    </div>
  );
}

interface DeadlineModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: Deadline;
  courses: Course[];
  isEditing?: boolean;
}

function DeadlineModal({ open, onClose, onSubmit, initialData, courses, isEditing }: DeadlineModalProps) {
  const { m } = useLang();
  const f = m.deadlines.form;
  const fromInitial = () => ({
    title: initialData?.title || '',
    description: initialData?.description || '',
    courseId: initialData?.courseId || '',
    dueDate: initialData?.dueDate ? format(new Date(initialData.dueDate), "yyyy-MM-dd'T'HH:mm") : '',
    priority: initialData?.priority || 'medium',
  });
  const [formData, setFormData] = useState(fromInitial);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // при каждом открытии — данные редактируемого дедлайна или пустая форма
  useEffect(() => {
    if (open) {
      setFormData(fromInitial());
      setSubmitError(null);
    }
  }, [open, initialData]);

  const handleSubmit = async () => {
    if (!formData.title || !formData.dueDate) return;
    
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit({
        ...formData,
        courseId: formData.courseId || null,
        dueDate: new Date(formData.dueDate).toISOString(),
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : m.common.loadError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? f.titleEdit : f.titleNew}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>{f.name}</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder={f.namePlaceholder}
            />
          </div>

          <div className="space-y-2">
            <Label>{f.description}</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder={f.descriptionPlaceholder}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{f.due}</Label>
              <Input
                type="datetime-local"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{f.priority}</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{m.deadlines.priority.low}</SelectItem>
                  <SelectItem value="medium">{m.deadlines.priority.medium}</SelectItem>
                  <SelectItem value="high">{m.deadlines.priority.high}</SelectItem>
                  <SelectItem value="urgent">{m.events.priorities.urgent}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{f.course}</Label>
            <Select 
              value={formData.courseId || NO_COURSE} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, courseId: value === NO_COURSE ? '' : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={f.coursePlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_COURSE}>{f.noCourse}</SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {submitError && (
          <p role="alert" className="text-sm text-red-600">{submitError}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{m.common.cancel}</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !formData.title || !formData.dueDate}>
            {isSubmitting ? m.common.saving : (isEditing ? m.common.save : f.create)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
