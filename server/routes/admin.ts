import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from "../storage";
import { authenticateToken, type AuthenticatedRequest } from "../middleware/auth";
import { requireAdmin, requirePermission, getAdminSections, hasPermission } from "../middleware/adminAuth";
import { getMetrics, checkAlerts, getSystemHealth, getPerformanceStats } from "../middleware/metrics";
import { getCacheStats } from "../middleware/caching";
import { tokenCache } from "../services/tokenCache";
import { asyncHandler } from "../middleware/errorHandler";

const adminRouter = Router();

// Global error handler для admin router
adminRouter.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Admin Router Error:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ 
    message: err.message || 'Ошибка администратора',
    error: process.env.NODE_ENV === 'development' ? err : undefined
  });
});

// Cache stats helper functions
interface CacheStatsInput {
  hits: number;
  misses: number;
  hitRate: number;
}

const calculateOverallHitRate = (
  httpCache: CacheStatsInput, 
  tokenCache: CacheStatsInput, 
  metricsCache: CacheStatsInput
): number => {
  const totalHits = httpCache.hits + tokenCache.hits + metricsCache.hits;
  const totalMisses = httpCache.misses + tokenCache.misses + metricsCache.misses;
  const total = totalHits + totalMisses;
  return total > 0 ? Math.round((totalHits / total) * 100 * 100) / 100 : 0;
};

const getCacheHealthStatus = (
  httpCache: CacheStatsInput, 
  tokenCache: CacheStatsInput
): 'healthy' | 'warming' | 'cold' | 'degraded' => {
  const avgHitRate = (httpCache.hitRate + tokenCache.hitRate) / 2;
  const totalRequests = httpCache.hits + httpCache.misses + tokenCache.hits + tokenCache.misses;
  
  if (totalRequests < 10) return 'cold';
  if (avgHitRate >= 60) return 'healthy';
  if (avgHitRate >= 30) return 'warming';
  return 'degraded';
};

// Admin actions logging helper
const logAdminAction = async (userId: string, action: string, targetType?: string, targetId?: string, details?: any, req?: Request) => {
  try {
    await storage.createAdminLog({
      adminUserId: userId,
      action,
      targetType,
      targetId,
      details,
      ipAddress: req?.ip || 'unknown',
      userAgent: req?.get('User-Agent') || 'unknown'
    });
  } catch (error) {
    console.error('Ошибка логирования действия админа:', error);
  }
};

// System monitoring endpoints - ПРОДВИНУТАЯ СИСТЕМА МОНИТОРИНГА
adminRouter.get('/system/metrics', authenticateToken, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const metrics = getMetrics();
  const alerts = checkAlerts();
  const performanceStats = getPerformanceStats();
  
  res.json({
    timestamp: new Date().toISOString(),
    metrics,
    alerts,
    performanceStats,
    status: alerts.length === 0 ? 'healthy' : 'warning'
  });
}));

adminRouter.get('/system/health', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const health = getSystemHealth();
    const metrics = getMetrics();
    
    res.json({
      ...health,
      detailed: {
        uptime: metrics.uptime,
        totalRequests: metrics.totalRequests,
        averageResponseTime: metrics.averageResponseTime,
        errorRate: metrics.errors.rate,
        cacheHitRate: metrics.cache.hitRate,
        memory: metrics.performance.memory,
        cpu: metrics.performance.cpu
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching enhanced system health:', error);
    res.status(500).json({ message: 'Ошибка получения расширенного статуса системы' });
  }
});

// ===========================================
// НОВЫЕ ENDPOINTS ДЛЯ ВИЗУАЛИЗАЦИИ МОНИТОРИНГА
// ===========================================

// Активные алерты для дашборда
adminRouter.get('/monitoring/alerts', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const alerts = checkAlerts();
    const metrics = getMetrics();
    
    res.json({
      alerts,
      summary: {
        total: alerts.length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        low: alerts.filter(a => a.severity === 'low').length
      },
      currentStats: {
        errorRate: metrics.errors.rate,
        responseTime: metrics.averageResponseTime,
        cacheHitRate: metrics.cache.hitRate,
        memoryUsage: Math.round(metrics.performance.memory / 1024 / 1024)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching monitoring alerts:', error);
    res.status(500).json({ message: 'Ошибка получения алертов мониторинга' });
  }
});

// Real-time метрики для live обновлений
adminRouter.get('/monitoring/realtime', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const metrics = getMetrics();
    const performanceStats = getPerformanceStats();
    
    res.json({
      timestamp: new Date().toISOString(),
      realtime: {
        requestsPerMinute: metrics.requestsPerMinute,
        responseTime: metrics.averageResponseTime,
        errorRate: metrics.errors.rate,
        cacheStats: {
          hitRate: metrics.cache.hitRate,
          missRate: 100 - metrics.cache.hitRate,
          entries: metrics.cache.entryCount,
          memoryUsage: metrics.cache.memoryUsage
        },
        performance: {
          cpu: metrics.performance.cpu,
          memory: Math.round(metrics.performance.memory / 1024 / 1024),
          heapUsed: Math.round(metrics.performance.heapUsed / 1024 / 1024),
          uptime: metrics.uptime
        }
      },
      trends: performanceStats
    });
  } catch (error) {
    console.error('Error fetching realtime metrics:', error);
    res.status(500).json({ message: 'Ошибка получения real-time метрик' });
  }
});

// Детальная аналитика производительности
adminRouter.get('/monitoring/performance', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const metrics = getMetrics();
    const timeRange = req.query.range as string || '1h';
    
    res.json({
      timeRange,
      performance: {
        requests: {
          total: metrics.totalRequests,
          perMinute: metrics.requestsPerMinute
        },
        responses: {
          average: metrics.averageResponseTime
        },
        errors: {
          rate: metrics.errors.rate,
          total: metrics.errors.total,
          byType: metrics.errors.byType || {}
        },
        database: {
          connectionCount: metrics.database.connectionCount,
          queryCount: metrics.database.queryCount,
          averageQueryTime: metrics.database.averageQueryTime,
          slowQueries: metrics.database.slowQueries
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching performance analytics:', error);
    res.status(500).json({ message: 'Ошибка получения аналитики производительности' });
  }
});

adminRouter.get('/cache-stats', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const httpCacheStats = getCacheStats();
    const tokenCacheStats = tokenCache.getStats();
    const metrics = getMetrics();
    
    res.json({
      timestamp: new Date().toISOString(),
      httpCache: {
        ...httpCacheStats,
        memoryUsageMB: Math.round(httpCacheStats.memoryUsage / 1024 / 1024 * 100) / 100
      },
      tokenCache: {
        ...tokenCacheStats,
        status: tokenCacheStats.hitRate > 50 ? 'healthy' : 
                tokenCacheStats.hitRate > 20 ? 'warming' : 'cold'
      },
      metricsCache: {
        hits: metrics.cache.hits,
        misses: metrics.cache.misses,
        hitRate: metrics.cache.hitRate,
        entryCount: metrics.cache.entryCount,
        memoryUsage: metrics.cache.memoryUsage
      },
      summary: {
        totalHits: httpCacheStats.hits + tokenCacheStats.hits + metrics.cache.hits,
        totalMisses: httpCacheStats.misses + tokenCacheStats.misses + metrics.cache.misses,
        overallHitRate: calculateOverallHitRate(httpCacheStats, tokenCacheStats, metrics.cache),
        healthStatus: getCacheHealthStatus(httpCacheStats, tokenCacheStats)
      }
    });
  } catch (error) {
    console.error('Error fetching cache stats:', error);
    res.status(500).json({ message: 'Ошибка получения статистики кэша' });
  }
});

// ===========================================
// ADMIN PROFILE & PERMISSIONS
// ===========================================

// Get admin permissions and sections
adminRouter.get('/profile', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const sections = getAdminSections(user);
    
    res.json({
      adminRole: user.adminRole,
      sections,
      permissions: {
        canViewDashboard: hasPermission(user, 'dashboard.analytics'),
        canViewUsers: hasPermission(user, 'users.analytics'),
        canViewFinances: hasPermission(user, 'transactions.view'),
        canViewAPI: hasPermission(user, 'api.monitoring'),
        canViewSecurity: hasPermission(user, 'security.monitoring'),
        canViewSystem: hasPermission(user, 'system.monitoring'),
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения профиля админа' });
  }
});

// ===========================================
// ENHANCED ADMIN DASHBOARD & ANALYTICS
// ===========================================

// Admin logs (все админы могут видеть свои действия, super admin - все)
adminRouter.get('/logs', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user!.adminRole === 'super_admin' ? undefined : req.user!.id;
    
    const logs = await storage.getAdminLogs(userId, Number(page), Number(limit));
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения логов' });
  }
});

// ===========================================
// SUPER ADMIN USER MANAGEMENT
// ===========================================

// Get all users for super admin
adminRouter.get('/users', authenticateToken, requirePermission('users.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const all = await storage.getAllUsers();
    const q = String(search).trim().toLowerCase();
    const filtered = q
      ? all.filter(u => [u.email, u.phone, u.firstName, u.lastName].some(v => (v || '').toLowerCase().includes(q)))
      : all;
    const pageNum = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(limit) || 20));
    const users = {
      users: filtered.slice((pageNum - 1) * pageSize, pageNum * pageSize).map(({ passwordHash, ...rest }) => rest),
      total: filtered.length,
      page: pageNum,
      limit: pageSize
    };
    
    await logAdminAction(req.user!.id, 'users_list_viewed', 'admin_panel', undefined, { page, limit, search }, req);
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения списка пользователей' });
  }
});

// Update user admin role (super admin only)
adminRouter.patch('/users/:userId/role', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Только супер админ может назначать роли
    if (req.user!.adminRole !== 'super_admin') {
      return res.status(403).json({ message: 'Только супер админ может назначать роли' });
    }

    const { userId } = req.params;
    const { adminRole } = req.body;

    // Валидация роли
    const validRoles = ['super_admin', 'devops_admin', 'analytics_admin', 'finance_admin', 'api_admin', 'security_admin'];
    if (adminRole && !validRoles.includes(adminRole)) {
      return res.status(400).json({ message: 'Недопустимая админская роль' });
    }

    // Проверяем, что пользователь существует
    const targetUser = await storage.getUser(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Обновляем роль
    const updatedUser = await storage.updateUser(userId, { adminRole: adminRole || null });
    
    // Логируем действие
    await logAdminAction(
      req.user!.id, 
      'user_role_updated', 
      'user', 
      userId, 
      { 
        previousRole: targetUser.adminRole,
        newRole: adminRole || null,
        targetUserName: `${targetUser.firstName} ${targetUser.lastName}`,
        targetUserPhone: targetUser.phone
      }, 
      req
    );

    res.json({ 
      message: `Роль пользователя ${targetUser.firstName} ${targetUser.lastName} успешно ${adminRole ? 'назначена' : 'удалена'}`,
      user: updatedUser 
    });
  } catch (error) {
    console.error('Ошибка обновления роли пользователя:', error);
    res.status(500).json({ message: 'Ошибка обновления роли пользователя' });
  }
});

// Get available admin roles
adminRouter.get('/roles', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const roles = [
      { value: 'super_admin', label: 'Супер Администратор', description: 'Полный доступ ко всем функциям системы' },
      { value: 'devops_admin', label: 'DevOps Администратор', description: 'Управление инфраструктурой и системными ресурсами' },
      { value: 'analytics_admin', label: 'Аналитический Администратор', description: 'Доступ к аналитике и отчетам' },
      { value: 'finance_admin', label: 'Финансовый Администратор', description: 'Управление финансовыми операциями' },
      { value: 'api_admin', label: 'API Администратор', description: 'Мониторинг API и интеграций' },
      { value: 'security_admin', label: 'Администратор Безопасности', description: 'Управление безопасностью системы' }
    ];
    
    res.json(roles);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения ролей' });
  }
});

// Get users with detailed info (courses, platforms, subscription)
adminRouter.get('/users/detailed/all', authenticateToken, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const users = await storage.getAllUsers();
  
  // Enrich users with additional info
  const enrichedUsers = (users || []).map((user: any) => ({
    ...user,
    subscription: user.subscriptionPlan || 'free',
    connectedPlatforms: user.platformConnections?.length || 0,
    enrolledCourses: user.enrolledCourses?.length || 0,
    joinedDate: user.createdAt,
    profileComplete: user.firstName && user.lastName && user.email ? true : false
  }));

  res.json({
    users: enrichedUsers,
    pagination: {
      total: enrichedUsers.length
    }
  });
}));

// Payment systems management - restricted to super_admin and finance_admin
adminRouter.get('/payment-systems', authenticateToken, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const allowedRoles = ['super_admin', 'finance_admin'];
  if (!allowedRoles.includes(req.user!.adminRole || '')) {
    return res.status(403).json({ message: 'Доступ запрещен. Требуется роль super_admin или finance_admin' });
  }
  const yookassaConfigured = !!process.env.YOOKASSA_SHOP_ID && !!process.env.YOOKASSA_SECRET_KEY;
  const alfabankConfigured = !!process.env.ALFABANK_USERNAME && !!process.env.ALFABANK_PASSWORD;
  
  const yookassaTransCount = await storage.getPaymentTransactionCount?.('yookassa') || 0;
  const yookassaTotalAmount = await storage.getPaymentTotalAmount?.('yookassa') || 0;
  const yookassaSuccessCount = await storage.getSuccessfulPaymentCount?.('yookassa') || 0;
  const yookassaSuccessRate = yookassaTransCount > 0 ? Math.round((yookassaSuccessCount / yookassaTransCount) * 100 * 10) / 10 : 0;
  
  const alfabankTransCount = await storage.getPaymentTransactionCount?.('alfabank') || 0;
  const alfabankTotalAmount = await storage.getPaymentTotalAmount?.('alfabank') || 0;
  const alfabankSuccessCount = await storage.getSuccessfulPaymentCount?.('alfabank') || 0;
  const alfabankSuccessRate = alfabankTransCount > 0 ? Math.round((alfabankSuccessCount / alfabankTransCount) * 100 * 10) / 10 : 0;
  
  const systems = [
    {
      id: '1',
      name: 'YooKassa',
      code: 'yookassa',
      isActive: yookassaConfigured,
      isConfigured: yookassaConfigured,
      lastChecked: new Date().toISOString(),
      totalTransactions: yookassaTransCount,
      totalAmount: yookassaTotalAmount,
      successRate: yookassaSuccessRate
    },
    {
      id: '2',
      name: 'Альфа-Банк',
      code: 'alfabank',
      isActive: alfabankConfigured,
      isConfigured: alfabankConfigured,
      lastChecked: new Date().toISOString(),
      totalTransactions: alfabankTransCount,
      totalAmount: alfabankTotalAmount,
      successRate: alfabankSuccessRate
    }
  ];

  res.json({ systems });
}));

adminRouter.get('/payment-transactions', authenticateToken, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const allowedRoles = ['super_admin', 'finance_admin'];
  if (!allowedRoles.includes(req.user!.adminRole || '')) {
    return res.status(403).json({ message: 'Доступ запрещен. Требуется роль super_admin или finance_admin' });
  }
  const period = req.query.period as string || 'month';
  
  let dateFilter = new Date();
  switch (period) {
    case 'week':
      dateFilter.setDate(dateFilter.getDate() - 7);
      break;
    case 'month':
      dateFilter.setMonth(dateFilter.getMonth() - 1);
      break;
    case 'year':
      dateFilter.setFullYear(dateFilter.getFullYear() - 1);
      break;
    default:
      dateFilter = new Date(0);
  }

  const transactions = await storage.getPaymentTransactions?.(dateFilter) || [];
  
  res.json({ 
    transactions: transactions.map((tx: any) => ({
      id: tx.id,
      paymentSystem: tx.paymentMethod || 'yookassa',
      amount: parseFloat(tx.amount) || 0,
      status: tx.status,
      createdAt: tx.createdAt,
      userId: tx.userId,
      userName: tx.userName || 'Пользователь',
      planName: tx.planName || 'Подписка'
    })),
    period 
  });
}));

adminRouter.get('/payment-stats', authenticateToken, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const allowedRoles = ['super_admin', 'finance_admin'];
  if (!allowedRoles.includes(req.user!.adminRole || '')) {
    return res.status(403).json({ message: 'Доступ запрещен. Требуется роль super_admin или finance_admin' });
  }
  const now = new Date();
  const monthAgo = new Date(now);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const allTransactions = await storage.getPaymentTransactions?.(new Date(0)) || [];
  const monthTransactions = await storage.getPaymentTransactions?.(monthAgo) || [];
  const weekTransactions = await storage.getPaymentTransactions?.(weekAgo) || [];

  const calculateStats = (txs: any[]) => {
    return {
      total: txs.reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0),
      count: txs.length,
      successful: txs.filter((tx: any) => tx.status === 'succeeded' || tx.status === 'success').length,
      failed: txs.filter((tx: any) => tx.status === 'failed' || tx.status === 'canceled').length,
      pending: txs.filter((tx: any) => tx.status === 'pending').length
    };
  };

  const allStats = calculateStats(allTransactions);
  const monthStats = calculateStats(monthTransactions);
  const weekStats = calculateStats(weekTransactions);

  res.json({
    totalRevenue: allStats.total,
    monthlyRevenue: monthStats.total,
    weeklyRevenue: weekStats.total,
    transactionCount: allStats.count,
    successfulPayments: allStats.successful,
    failedPayments: allStats.failed,
    pendingPayments: allStats.pending
  });
}));

// Admin stats endpoint for analytics
adminRouter.get('/stats', authenticateToken, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userGrowth = await storage.getUserGrowthByMonth?.(6) || [];
  const totalUsers = await storage.getTotalUsersCount?.() || 0;
  const newUsersThisMonth = await storage.getNewUsersCount?.(30) || 0;
  
  res.json({
    totalUsers,
    newUsersThisMonth,
    userGrowth,
    completedCourses: 0
  });
}));

// Course discovery - trigger manual discovery
adminRouter.post('/course-discovery', authenticateToken, requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { courseDiscoveryService } = await import("../services/courseDiscoveryService");
    const limit = req.body.limit || 5;
    
    const result = await courseDiscoveryService.discoverCourses(limit);
    
    res.json({
      success: result.success,
      message: `Обнаружено и сохранено ${result.totalSaved} курсов из ${result.platformsWithCourses} платформ (${result.platformsProcessed} платформ обработано)`,
      result: {
        totalSaved: result.totalSaved,
        platformsProcessed: result.platformsProcessed,
        platformsWithCourses: result.platformsWithCourses,
        duration: result.endTime.getTime() - result.startTime.getTime(),
        errors: result.errors
      }
    });
    
    await logAdminAction(
      req.user!.id,
      'course_discovery',
      'courses',
      undefined,
      { limit, saved: result.totalSaved, platforms: result.platformsWithCourses },
      req
    );
  } catch (error) {
    res.status(500).json({ 
      message: 'Ошибка при обнаружении курсов',
      error: String(error)
    });
  }
}));

export default adminRouter;