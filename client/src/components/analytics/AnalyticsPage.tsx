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
import { useLang } from '@/i18n';
import { fetchEvents } from '../events/eventsApi';
import { costOf, dailyActivity, rangeStart } from './analyticsData';

/** Дней в периоде; «всё время» — последний год (столько отдаёт календарь за раз) */
const RANGE_DAYS = { week: 7, month: 30, all: 365 } as const;

interface Course {
  id: string;
  title: string;
  status: string;
  duration?: number;
  cost?: number | string | null;
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
  const { m, lang } = useLang();
  const t = m.analytics;
  const money = (value: number, digits = 2) =>
    new Intl.NumberFormat(lang, { style: 'currency', currency: 'RUB', maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('month');
  const [courses, setCourses] = useState<Course[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      const days = RANGE_DAYS[timeRange];
      const now = new Date();
      const [coursesRes, events] = await Promise.all([
        fetch('/api/courses', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetchEvents(rangeStart(days, now).toISOString(), now.toISOString()),
      ]);
      const coursesData: Course[] = await coursesRes.json();
      setCourses(coursesData);

      // Calculate analytics
      const completed = coursesData.filter(c => c.status === 'completed').length;
      const inProgress = coursesData.filter(c => c.status === 'in_progress').length;
      // часы и завершённые курсы по дням — из пройденных занятий календаря и дат завершения курсов
      const activity = dailyActivity(events, coursesData, days, now);
      const dailyProgress = activity.map((d) => ({
        date: new Date(`${d.day}T12:00:00`).toLocaleDateString(lang, { month: 'short', day: 'numeric' }),
        hours: d.hours,
        courses: d.courses,
      }));
      const totalHours = Math.round(activity.reduce((sum, d) => sum + d.hours, 0) * 10) / 10;
      const totalSpent = coursesData
        .filter((c) => c.status === 'completed')
        .reduce((sum, c) => sum + costOf(c), 0);
      const avgProgress = coursesData.length > 0
        ? Math.round(
            coursesData.reduce((sum, c) => sum + (parseFloat(c.progress) || 0), 0) /
            coursesData.length
          )
        : 0;

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
  }, [timeRange, lang]);

  const getCategoryBreakdown = (coursesData: Course[]) => {
    const categories: Record<string, number> = {};
    coursesData.forEach(course => {
      // Since we don't have category in response, use status as grouping
      const key = course.status === 'completed' ? t.completed : t.inProgress;
      categories[key] = (categories[key] || 0) + 1;
    });

    return Object.entries(categories).map(([category, count]) => ({
      category,
      count,
    }));
  };

  const getCostBreakdown = (coursesData: Course[]) => {
    const completed = coursesData
      .filter(c => c.status === 'completed')
      .reduce((sum, c) => sum + costOf(c), 0);

    const inProgress = coursesData
      .filter(c => c.status === 'in_progress')
      .reduce((sum, c) => sum + costOf(c), 0);

    const free = coursesData
      .filter(c => costOf(c) === 0)
      .length;

    return [
      { status: t.completed, cost: completed },
      { status: t.inProgress, cost: inProgress },
      { status: t.free(free), cost: free > 0 ? 1 : 0 }, // Use 1 for visibility
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
          <h1 className="text-3xl font-bold mb-2">{t.title}</h1>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button variant={timeRange === 'week' ? 'default' : 'outline'} onClick={() => setTimeRange('week')}>
            {t.week}
          </Button>
          <Button variant={timeRange === 'month' ? 'default' : 'outline'} onClick={() => setTimeRange('month')}>
            {t.month}
          </Button>
          <Button variant={timeRange === 'all' ? 'default' : 'outline'} onClick={() => setTimeRange('all')}>
            {t.all}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard
          icon={<BookOpen className="h-5 w-5" />}
          title={t.totalCourses}
          value={analytics.totalCourses}
          color="bg-blue-50"
        />
        <MetricCard
          icon={<CheckCircle className="h-5 w-5" />}
          title={t.completed}
          value={analytics.completedCourses}
          color="bg-green-50"
        />
        <MetricCard
          icon={<PlayCircle className="h-5 w-5" />}
          title={t.inProgress}
          value={analytics.inProgressCourses}
          color="bg-yellow-50"
        />
        <MetricCard
          icon={<Clock className="h-5 w-5" />}
          title={t.hours}
          value={analytics.totalHours}
          color="bg-purple-50"
        />
        <MetricCard
          icon={<DollarSign className="h-5 w-5" />}
          title={t.spent}
          value={money(Math.round(analytics.totalSpent), 0)}
          color="bg-pink-50"
        />
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="progress" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="progress">{t.tabProgress}</TabsTrigger>
          <TabsTrigger value="time">{t.tabTime}</TabsTrigger>
          <TabsTrigger value="breakdown">{t.tabBreakdown}</TabsTrigger>
          <TabsTrigger value="cost">{t.tabCost}</TabsTrigger>
        </TabsList>

        {/* Progress Chart */}
        <TabsContent value="progress">
          <Card>
            <CardHeader>
              <CardTitle>{t.progressTitle}</CardTitle>
              <CardDescription>{t.progressDesc}</CardDescription>
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
                    name={t.hoursSeries}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="courses"
                    stroke="#764ba2"
                    name={t.coursesSeries}
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
              <CardTitle>{t.timeTitle}</CardTitle>
              <CardDescription>{t.timeDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.dailyProgress}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="hours" fill="#667eea" name={t.hoursSeries} />
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
                <CardTitle>{t.statusTitle}</CardTitle>
                <CardDescription>{t.statusDesc}</CardDescription>
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
                <CardTitle>{t.detailsTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-4 rounded-lg bg-green-50 border border-green-200">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.completedCourses}</p>
                    <p className="text-2xl font-bold text-green-700">{analytics.completedCourses}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>

                <div className="flex justify-between items-center p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.inProgress}</p>
                    <p className="text-2xl font-bold text-yellow-700">{analytics.inProgressCourses}</p>
                  </div>
                  <PlayCircle className="h-8 w-8 text-yellow-600" />
                </div>

                <div className="flex justify-between items-center p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.avgProgress}</p>
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
              <CardTitle>{t.costTitle}</CardTitle>
              <CardDescription>{t.costDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.costBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip formatter={(value) => money(Number(value))} />
                  <Legend />
                  <Bar dataKey="cost" fill="#764ba2" name={t.costSeries} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-6 p-4 rounded-lg bg-gray-50 border">
                <p className="text-sm text-muted-foreground mb-2">{t.totalSpent}</p>
                <p className="text-3xl font-bold">{money(analytics.totalSpent)}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bottom Summary */}
      <Card>
        <CardHeader>
          <CardTitle>{t.journey}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border">
            <div className="w-12 h-12 rounded-full bg-purple-200 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">{t.passed(analytics.completedCourses)}</p>
              <p className="text-sm text-muted-foreground">
                {t.spentSummary(analytics.totalHours, money(analytics.totalSpent))}
              </p>
            </div>
          </div>
          {analytics.inProgressCourses > 0 && (
            <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 border">
              <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center">
                <PlayCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{t.keepGoing}</p>
                <p className="text-sm text-muted-foreground">
                  {t.inProgressSummary(analytics.inProgressCourses, analytics.averageProgress)}
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
