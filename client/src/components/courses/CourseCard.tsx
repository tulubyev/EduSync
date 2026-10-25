import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreVertical, 
  Star, 
  StarOff, 
  ExternalLink, 
  Trash2, 
  Edit, 
  Play,
  Pause,
  CheckCircle,
  Lightbulb
} from 'lucide-react';

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
  /** manual или код площадки, с которой курс получен (stepik, …) */
  source?: string;
  cost?: number | null;
  tags?: string[];
}

interface CourseCardProps {
  course: Course;
  onEdit?: (course: Course) => void;
  onDelete?: (courseId: string) => void;
  onToggleFavorite?: (courseId: string) => void;
  onUpdateProgress?: (courseId: string, progress: number) => void;
  onUpdateStatus?: (courseId: string, status: string) => void;
  onShowSimilar?: (course: Course) => void;
}

const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-red-100 text-red-800',
};

const difficultyLabels: Record<string, string> = {
  beginner: 'Начинающий',
  intermediate: 'Средний',
  advanced: 'Продвинутый',
};

const statusLabels: Record<string, string> = {
  not_started: 'Не начат',
  in_progress: 'В процессе',
  completed: 'Завершён',
  paused: 'Приостановлен',
};

const statusColors: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  paused: 'bg-orange-100 text-orange-800',
};

export function CourseCard({ 
  course, 
  onEdit, 
  onDelete, 
  onToggleFavorite,
  onUpdateProgress,
  onUpdateStatus,
  onShowSimilar
}: CourseCardProps) {
  const progress = parseFloat(course.progress) || 0;
  
  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}ч ${mins > 0 ? `${mins}м` : ''}`;
    }
    return `${mins}м`;
  };

  const formatCost = (cost?: number | string | null) => {
    if (cost === null || cost === undefined || cost === 0 || cost === '0') return 'Бесплатно';
    const numCost = typeof cost === 'string' ? parseFloat(cost) : cost;
    if (isNaN(numCost)) return 'Бесплатно';
    return `₽${numCost.toFixed(2)}`;
  };

  const handleStartCourse = () => {
    if (course.status === 'not_started') {
      onUpdateStatus?.(course.id, 'in_progress');
    } else if (course.status === 'paused') {
      onUpdateStatus?.(course.id, 'in_progress');
    } else if (course.status === 'in_progress') {
      onUpdateStatus?.(course.id, 'paused');
    }
  };

  const handleCompleteCourse = () => {
    onUpdateStatus?.(course.id, 'completed');
    onUpdateProgress?.(course.id, 100);
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 overflow-hidden">
      <CardHeader className="pb-2 relative">
        {course.imageUrl && (
          <div className="absolute inset-0 h-24 overflow-hidden">
            <img 
              src={course.imageUrl} 
              alt={course.title}
              className="w-full h-full object-cover opacity-20"
            />
          </div>
        )}
        <div className="flex justify-between items-start relative z-10">
          <div className="flex-1">
            <h3 className="font-semibold text-lg line-clamp-2">{course.title}</h3>
            {course.instructor && (
              <p className="text-sm text-muted-foreground mt-1">{course.instructor}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {onToggleFavorite && <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleFavorite(course.id)}
              className="h-8 w-8"
            >
              {course.isFavorite ? (
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              ) : (
                <StarOff className="h-4 w-4 text-gray-400" />
              )}
            </Button>}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(course)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Редактировать
                  </DropdownMenuItem>
                )}
                {course.courseUrl && (
                  <DropdownMenuItem onClick={() => window.open(course.courseUrl, '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Открыть на платформе
                  </DropdownMenuItem>
                )}
                {onDelete && (!course.source || course.source === 'manual') && (
                  <DropdownMenuItem 
                    onClick={() => onDelete(course.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Удалить
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-2">
        {course.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {course.description}
          </p>
        )}
        
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant="secondary" className={statusColors[course.status]}>
            {statusLabels[course.status]}
          </Badge>
          {course.difficulty && (
            <Badge variant="secondary" className={difficultyColors[course.difficulty]}>
              {difficultyLabels[course.difficulty]}
            </Badge>
          )}
          {course.platformName && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {course.platformName}
            </Badge>
          )}
          {course.source && course.source !== 'manual' && !course.platformName && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {course.source === 'stepik' ? 'Stepik' : course.source}
            </Badge>
          )}
          {course.category && (
            <Badge variant="outline">{course.category}</Badge>
          )}
          {course.duration && (
            <Badge variant="outline">{formatDuration(course.duration)}</Badge>
          )}
          {course.cost !== undefined && course.cost !== null && (
            <Badge variant="outline" className="font-medium">{formatCost(course.cost)}</Badge>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Прогресс</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="flex gap-2 mt-4">
          {onUpdateStatus && course.status !== 'completed' && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={handleStartCourse}
              >
                {course.status === 'not_started' && (
                  <>
                    <Play className="h-4 w-4 mr-1" />
                    Начать
                  </>
                )}
                {course.status === 'in_progress' && (
                  <>
                    <Pause className="h-4 w-4 mr-1" />
                    Пауза
                  </>
                )}
                {course.status === 'paused' && (
                  <>
                    <Play className="h-4 w-4 mr-1" />
                    Продолжить
                  </>
                )}
              </Button>
              <Button 
                variant="default" 
                size="sm"
                onClick={handleCompleteCourse}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Завершить
              </Button>
            </>
          )}
          {course.status === 'completed' && (
            <Button variant="outline" size="sm" className="flex-1" disabled>
              <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
              Курс завершён
            </Button>
          )}
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-2"
          onClick={() => onShowSimilar?.(course)}
        >
          <Lightbulb className="h-4 w-4 mr-2" />
          Подобные курсы
        </Button>

        {course.tags && course.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {course.tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
