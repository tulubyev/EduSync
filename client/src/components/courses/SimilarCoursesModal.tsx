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
import { useLang } from '@/i18n';

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

const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-red-100 text-red-800',
};

export function SimilarCoursesModal({
  open,
  onClose,
  currentCourse,
  allCourses,
  platforms,
}: SimilarCoursesModalProps) {
  const { m, lang } = useLang();
  const t = m.courses.similar;
  const [similarCourses, setSimilarCourses] = useState<Course[]>([]);

  const formatCost = (cost?: number | string | null) => {
    const numCost = typeof cost === 'string' ? parseFloat(cost) : cost;
    if (numCost === null || numCost === undefined || isNaN(numCost) || numCost === 0) return m.courses.free;
    return new Intl.NumberFormat(lang, { style: 'currency', currency: 'RUB' }).format(numCost);
  };

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
            {t.title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            {t.found(similarCourses.length, currentCourse.category ? (m.courses.categories[currentCourse.category] ?? currentCourse.category) : '')}
          </p>
        </DialogHeader>

        {similarCourses.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">
              {t.none}
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
                      {m.courses.difficulty[course.difficulty] ?? course.difficulty}
                    </Badge>
                  )}
                  {course.duration && (
                    <Badge variant="outline">
                      {m.courses.duration(Math.floor(course.duration / 60), course.duration % 60)}
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
                    {t.goToPlatform}
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
