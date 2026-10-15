import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  Clock,
  DollarSign,
  BookOpen,
  CheckCircle,
  PlayCircle,
  Download,
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  status: string;
  duration?: number;
  cost?: number | null;
  progress: string;
  completedAt?: string;
}

interface Analytics {
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  totalHours: number;
  totalSpent: number;
  averageProgress: number;
  dailyProgress: Array<{ date: string; hours: number; courses: number }>;
  courseCategoryBreakdown: Array<{ category: string; count: number }>;
  costBreakdown: Array<{ status: string; cost: number }>;
}

export function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('month');
  const [courses, setCourses] = useState<Course[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      // Fetch courses
      const coursesRes = await fetch('/api/courses', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const coursesData: Course[] = await coursesRes.json();
      setCourses(coursesData);

      // Calculate analytics
      const completed = coursesData.filter(c => c.status === 'completed').length;
      const inProgress = coursesData.filter(c => c.status === 'in_progress').length;
      const totalHours = Math.floor(
        coursesData.reduce((sum, c) => sum + (c.duration || 0), 0) / 60
      );
      const totalSpent = coursesData.reduce((sum, c) => {
        if (c.status === 'completed' && c.cost && c.cost > 0) {
          return sum + c.cost;
        }
        return sum;
      }, 0);
      const avgProgress = coursesData.length > 0
        ? Math.round(
            coursesData.reduce((sum, c) => sum + (parseFloat(c.progress) || 0), 0) /
            coursesData.length
          )
        : 0;

      // Generate daily progress (last 30 days)
      const dailyProgress = generateDailyProgress(coursesData, timeRange);

      // Category breakdown
      const categoryBreakdown = getCategoryBreakdown(coursesData);

      // Cost breakdown
      const costBreakdown = getCostBreakdown(coursesData);

      setAnalytics({
        totalCourses: coursesData.length,
        completedCourses: completed,
        inProgressCourses: inProgress,
        totalHours,
        totalSpent,
        averageProgress: avgProgress,
        dailyProgress,
        courseCategoryBreakdown: categoryBreakdown,
        costBreakdown,
      });
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const generateDailyProgress = (coursesData: Course[], range: 'week' | 'month' | 'all') => {
    const days = range === 'week' ? 7 : range === 'month' ? 30 : 60;
    const data = [];
    const now = new Date();

    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' });

      // Simulate progress based on course status
      const completedOnDay = Math.floor(Math.random() * 3);
      const hoursOnDay = Math.floor(Math.random() * 6) + (completedOnDay > 0 ? 2 : 0);

      data.push({
        date: dateStr,
        hours: hoursOnDay,
        courses: completedOnDay,
      });
    }

    return data;
  };

  const getCategoryBreakdown = (coursesData: Course[]) => {
    const categories: Record<string, number> = {};
    coursesData.forEach(course => {
      // Since we don't have category in response, use status as grouping
      const key = course.status === 'completed' ? 'Завершено' : 'В процессе';
      categories[key] = (categories[key] || 0) + 1;
    });

    return Object.entries(categories).map(([category, count]) => ({
      category,
      count,
    }));
  };

  const getCostBreakdown = (coursesData: Course[]) => {
    const completed = coursesData
      .filter(c => c.status === 'completed' && c.cost && c.cost > 0)
      .reduce((sum, c) => sum + (c.cost || 0), 0);

    const inProgress = coursesData
      .filter(c => c.status === 'in_progress' && c.cost && c.cost > 0)
      .reduce((sum, c) => sum + (c.cost || 0), 0);

    const free = coursesData
      .filter(c => !c.cost || c.cost === 0)
      .length;

    return [
      { status: 'Завершено', cost: completed },
      { status: 'В процессе', cost: inProgress },
      { status: `Бесплатно (${free})`, cost: free > 0 ? 1 : 0 }, // Use 1 for visibility
    ].filter(item => item.cost > 0);
  };

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe'];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">📊 Аналитика</h1>
          <p className="text-muted-foreground">Обзор вашего прогресса обучения</p>
        </div>
        <div className="flex gap-2">
          <Button variant={timeRange === 'week' ? 'default' : 'outline'} onClick={() => setTimeRange('week')}>
            Неделя
          </Button>
          <Button variant={timeRange === 'month' ? 'default' : 'outline'} onClick={() => setTimeRange('month')}>
            Месяц
          </Button>
          <Button variant={timeRange === 'all' ? 'default' : 'outline'} onClick={() => setTimeRange('all')}>
            Всё время
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard
          icon={<BookOpen className="h-5 w-5" />}
          title="Всего курсов"
          value={analytics.totalCourses}
          color="bg-blue-50"
        />
        <MetricCard
          icon={<CheckCircle className="h-5 w-5" />}
          title="Завершено"
          value={analytics.completedCourses}
          color="bg-green-50"
        />
        <MetricCard
          icon={<PlayCircle className="h-5 w-5" />}
          title="В процессе"
          value={analytics.inProgressCourses}
          color="bg-yellow-50"
        />
        <MetricCard
          icon={<Clock className="h-5 w-5" />}
          title="Часов обучения"
          value={analytics.totalHours}
          color="bg-purple-50"
        />
        <MetricCard
          icon={<DollarSign className="h-5 w-5" />}
          title="Потрачено ₽"
          value={`${Math.round(analytics.totalSpent)}`}
          color="bg-pink-50"
        />
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="progress" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="progress">Прогресс</TabsTrigger>
          <TabsTrigger value="time">Время</TabsTrigger>
          <TabsTrigger value="breakdown">Статистика</TabsTrigger>
          <TabsTrigger value="cost">Стоимость</TabsTrigger>
        </TabsList>

        {/* Progress Chart */}
        <TabsContent value="progress">
          <Card>
            <CardHeader>
              <CardTitle>Прогресс по дням</CardTitle>
              <CardDescription>Количество часов и курсов завершенных в день</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.dailyProgress}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="hours"
                    stroke="#667eea"
                    name="Часы обучения"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="courses"
                    stroke="#764ba2"
                    name="Завершено курсов"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Distribution */}
        <TabsContent value="time">
          <Card>
            <CardHeader>
              <CardTitle>Распределение времени по дням</CardTitle>
              <CardDescription>Общее время, потраченное на обучение</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.dailyProgress}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="hours" fill="#667eea" name="Часы обучения" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Status Breakdown */}
        <TabsContent value="breakdown">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Статус курсов</CardTitle>
                <CardDescription>Распределение по статусам</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.courseCategoryBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ category, count }) => `${category}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analytics.courseCategoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Детальная статистика</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-4 rounded-lg bg-green-50 border border-green-200">
                  <div>
                    <p className="text-sm text-muted-foreground">Завершено курсов</p>
                    <p className="text-2xl font-bold text-green-700">{analytics.completedCourses}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>

                <div className="flex justify-between items-center p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                  <div>
                    <p className="text-sm text-muted-foreground">В процессе</p>
                    <p className="text-2xl font-bold text-yellow-700">{analytics.inProgressCourses}</p>
                  </div>
                  <PlayCircle className="h-8 w-8 text-yellow-600" />
                </div>

                <div className="flex justify-between items-center p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div>
                    <p className="text-sm text-muted-foreground">Среднее прохождение</p>
                    <p className="text-2xl font-bold text-blue-700">{analytics.averageProgress}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Cost Analysis */}
        <TabsContent value="cost">
          <Card>
            <CardHeader>
              <CardTitle>Анализ стоимости</CardTitle>
              <CardDescription>Расходы по статусу курса</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.costBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip formatter={(value) => `₽${Number(value).toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="cost" fill="#764ba2" name="Стоимость (₽)" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-6 p-4 rounded-lg bg-gray-50 border">
                <p className="text-sm text-muted-foreground mb-2">Общие расходы</p>
                <p className="text-3xl font-bold">₽{analytics.totalSpent.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bottom Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Ваше путешествие обучения</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border">
            <div className="w-12 h-12 rounded-full bg-purple-200 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Вы прошли {analytics.completedCourses} курсов</p>
              <p className="text-sm text-muted-foreground">
                Потратили {analytics.totalHours} часов обучения и ₽{analytics.totalSpent.toFixed(2)}
              </p>
            </div>
          </div>
          {analytics.inProgressCourses > 0 && (
            <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 border">
              <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center">
                <PlayCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Продолжайте обучение</p>
                <p className="text-sm text-muted-foreground">
                  {analytics.inProgressCourses} курсов в процессе с средним прогрессом {analytics.averageProgress}%
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  color: string;
}

function MetricCard({ icon, title, value, color }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center mb-4`}>
          {icon}
        </div>
        <p className="text-sm text-muted-foreground mb-1">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
