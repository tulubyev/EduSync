import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description?: string;
  instructor?: string;
  category?: string;
  difficulty?: string;
  duration?: number;
  platformId?: string;
  platformName?: string;
  cost?: number | null;
  courseUrl?: string;
}

interface SimilarCoursesModalProps {
  open: boolean;
  onClose: () => void;
  currentCourse: Course | null;
  allCourses: Course[];
  platforms: Record<string, { name: string; color: string }>;
}

const difficultyLabels: Record<string, string> = {
  beginner: 'Начинающий',
  intermediate: 'Средний',
  advanced: 'Продвинутый',
};

const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-red-100 text-red-800',
};

const formatCost = (cost?: number | string | null) => {
  if (cost === null || cost === undefined || cost === 0 || cost === '0') return 'Бесплатно';
  const numCost = typeof cost === 'string' ? parseFloat(cost) : cost;
  if (isNaN(numCost)) return 'Бесплатно';
  return `₽${numCost.toFixed(2)}`;
};

export function SimilarCoursesModal({
  open,
  onClose,
  currentCourse,
  allCourses,
  platforms,
}: SimilarCoursesModalProps) {
  const [similarCourses, setSimilarCourses] = useState<Course[]>([]);

  useEffect(() => {
    if (!currentCourse || !open) return;

    // Find similar courses: same category or difficulty, but different platform
    const similar = allCourses
      .filter(
        (course) =>
          course.id !== currentCourse.id &&
          (course.category === currentCourse.category ||
            course.difficulty === currentCourse.difficulty) &&
          course.platformId !== currentCourse.platformId
      )
      .slice(0, 6); // Limit to 6 suggestions

    setSimilarCourses(similar);
  }, [currentCourse, allCourses, open]);

  if (!currentCourse) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Подобные курсы для сравнения
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Мы нашли {similarCourses.length} похожих курсов на других платформах в категории "{currentCourse.category}"
          </p>
        </DialogHeader>

        {similarCourses.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">
              К сожалению, похожих курсов не найдено
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {similarCourses.map((course) => (
              <div
                key={course.id}
                className="border rounded-lg p-4 hover:bg-accent transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold line-clamp-2">{course.title}</h4>
                    {course.instructor && (
                      <p className="text-sm text-muted-foreground">
                        {course.instructor}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {course.platformId && platforms[course.platformId] && (
                    <Badge
                      className="text-white"
                      style={{
                        backgroundColor:
                          platforms[course.platformId]?.color || '#667eea',
                      }}
                    >
                      {platforms[course.platformId]?.name}
                    </Badge>
                  )}
                  {course.difficulty && (
                    <Badge
                      variant="secondary"
                      className={difficultyColors[course.difficulty]}
                    >
                      {difficultyLabels[course.difficulty]}
                    </Badge>
                  )}
                  {course.duration && (
                    <Badge variant="outline">
                      {Math.floor(course.duration / 60)}ч {course.duration % 60}м
                    </Badge>
                  )}
                  <Badge variant="outline" className="font-medium">
                    {formatCost(course.cost)}
                  </Badge>
                </div>

                {course.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {course.description}
                  </p>
                )}

                {course.courseUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(course.courseUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Перейти на платформу
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
