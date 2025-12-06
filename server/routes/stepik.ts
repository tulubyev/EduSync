import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
import { platforms, platformConnections, externalCourses } from "../../shared/schema";
import { authenticateToken } from "../middleware/auth";
import stepikService from "../services/stepikService";
import stepikSyncService from "../services/stepikSyncService";
import { eq, and } from "drizzle-orm";

interface AuthRequest extends Request {
  user?: { id: string; role?: string | null };
}

const router = Router();

/**
 * GET /api/stepik/auth-url
 * Returns OAuth authorization URL for Stepik
 */
router.get('/auth-url', (req: Request, res: Response) => {
  try {
    const state = uuidv4();
    // Store state in session for CSRF protection (you might use express-session)
    const authUrl = stepikService.getAuthorizationUrl(state);
    
    res.json({
      authUrl,
      state,
    });
  } catch (error: any) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ message: 'Error generating authorization URL', error: error.message });
  }
});

/**
 * GET /api/stepik/callback
 * OAuth 2.0 callback endpoint
 * Exchanges authorization code for tokens and creates connection
 */
router.get('/callback', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { code, state } = req.query;
    const userId = req.user?.id;

    if (!code || !state || !userId) {
      return res.status(400).json({ message: 'Missing required parameters: code, state, or user not authenticated' });
    }

    console.log(`🔐 Processing Stepik OAuth callback for user ${userId}`);

    // 1. Exchange code for tokens
    console.log('📝 Exchanging authorization code for tokens...');
    const tokens = await stepikService.exchangeCodeForTokens(code as string);

    // 2. Get Stepik user info
    console.log('👤 Fetching Stepik user info...');
    const stepikUser = await stepikService.getCurrentUser(tokens.accessToken);

    // 3. Get or create Stepik platform in our database
    console.log('🔍 Ensuring Stepik platform exists in database...');
    let stepikPlatform = await db.query.platforms.findFirst({
      where: eq(platforms.code, 'stepik'),
    });

    if (!stepikPlatform) {
      const result = await db.insert(platforms).values({
        code: 'stepik',
        name: 'Stepik',
        description: 'Russian online education platform',
        websiteUrl: 'https://stepik.org',
        apiType: 'oauth',
        color: '#66a13e',
        isActive: true,
      }).returning();
      stepikPlatform = result[0];
    }

    // 4. Create or update platform connection
    console.log('🔗 Creating platform connection...');
    const platformConnection = await db
      .insert(platformConnections)
      .values({
        userId,
        platformId: stepikPlatform.id,
        externalUserId: String(stepikUser.id),
        accessTokenEncrypted: stepikService.encrypt(tokens.accessToken),
        refreshTokenEncrypted: stepikService.encrypt(tokens.refreshToken),
        tokenExpiresAt: tokens.expiresAt,
        connectionStatus: 'active',
        syncStatus: 'idle',
      })
      .onConflictDoUpdate({
        target: [platformConnections.userId, platformConnections.platformId],
        set: {
          externalUserId: String(stepikUser.id),
          accessTokenEncrypted: stepikService.encrypt(tokens.accessToken),
          refreshTokenEncrypted: stepikService.encrypt(tokens.refreshToken),
          tokenExpiresAt: tokens.expiresAt,
          connectionStatus: 'active',
        },
      })
      .returning();

    const connection = platformConnection[0];

    // 5. Trigger initial sync
    console.log('🔄 Starting initial sync of courses...');
    const syncResult = await stepikSyncService.syncUserCourses(
      userId,
      stepikPlatform.id,
      connection.accessTokenEncrypted!,
      connection.refreshTokenEncrypted!,
      connection.tokenExpiresAt!
    );

    console.log(`✅ OAuth flow completed for user ${userId}`);

    res.json({
      success: true,
      message: 'Successfully connected to Stepik',
      user: {
        id: stepikUser.id,
        email: stepikUser.email,
        firstName: stepikUser.firstName,
        lastName: stepikUser.lastName,
      },
      sync: syncResult,
    });
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ 
      message: 'Error processing OAuth callback', 
      error: error.message 
    });
  }
});

/**
 * POST /api/stepik/sync
 * Manually trigger sync for authenticated user
 */
router.post('/sync', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    console.log(`🔄 Manual sync triggered for user ${userId}`);

    // Get Stepik platform
    const stepikPlatform = await db.query.platforms.findFirst({
      where: eq(platforms.code, 'stepik'),
    });

    if (!stepikPlatform) {
      return res.status(404).json({ message: 'Stepik platform not configured' });
    }

    // Get platform connection
    const connection = await db.query.platformConnections.findFirst({
      where: and(
        eq(platformConnections.userId, userId),
        eq(platformConnections.platformId, stepikPlatform.id)
      ),
    });

    if (!connection) {
      return res.status(404).json({ message: 'Stepik not connected' });
    }

    if (connection.connectionStatus !== 'active') {
      return res.status(400).json({ 
        message: 'Stepik connection not active', 
        status: connection.connectionStatus 
      });
    }

    // Set sync status
    await stepikSyncService.setSyncStatus(userId, stepikPlatform.id, 'syncing');

    // Perform sync
    const syncResult = await stepikSyncService.syncUserCourses(
      userId,
      stepikPlatform.id,
      connection.accessTokenEncrypted!,
      connection.refreshTokenEncrypted!,
      connection.tokenExpiresAt!
    );

    res.json({
      success: syncResult.success,
      message: syncResult.message,
      coursesCount: syncResult.coursesCount,
      deadlinesCount: syncResult.deadlinesCount,
      ...(syncResult.error && { error: syncResult.error }),
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    res.status(500).json({ 
      message: 'Error syncing courses', 
      error: error.message 
    });
  }
});

/**
 * GET /api/stepik/courses
 * Get synced courses from Stepik for current user
 */
router.get('/courses', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    console.log(`📚 Fetching Stepik courses for user ${userId}`);

    const courses = await db.query.externalCourses.findMany({
      where: and(
        eq(externalCourses.userId, userId),
        eq(externalCourses.platformId, 'stepik') // Will be replaced with actual platformId
      ),
    });

    res.json({
      courses,
      total: courses.length,
    });
  } catch (error: any) {
    console.error('Error fetching Stepik courses:', error);
    res.status(500).json({ 
      message: 'Error fetching courses', 
      error: error.message 
    });
  }
});

/**
 * GET /api/stepik/status
 * Get connection status for Stepik
 */
router.get('/status', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Get Stepik platform
    const stepikPlatform = await db.query.platforms.findFirst({
      where: eq(platforms.code, 'stepik'),
    });

    if (!stepikPlatform) {
      return res.json({ connected: false, message: 'Stepik platform not configured' });
    }

    // Get connection
    const connection = await db.query.platformConnections.findFirst({
      where: and(
        eq(platformConnections.userId, userId),
        eq(platformConnections.platformId, stepikPlatform.id)
      ),
    });

    if (!connection) {
      return res.json({ connected: false, message: 'Not connected to Stepik' });
    }

    // Get course count
    const courseCount = await db.$count(
      externalCourses,
      and(
        eq(externalCourses.userId, userId),
        eq(externalCourses.platformId, stepikPlatform.id)
      )
    );

    res.json({
      connected: connection.connectionStatus === 'active',
      status: connection.connectionStatus,
      syncStatus: connection.syncStatus,
      lastSyncAt: connection.lastSyncAt,
      lastSyncError: connection.lastSyncError,
      externalUserId: connection.externalUserId,
      coursesCount: courseCount,
      requiresReauth: connection.connectionStatus === 'reauth_required',
    });
  } catch (error: any) {
    console.error('Error getting Stepik status:', error);
    res.status(500).json({ 
      message: 'Error getting status', 
      error: error.message 
    });
  }
});

/**
 * POST /api/stepik/disconnect
 * Disconnect from Stepik
 */
router.post('/disconnect', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Get Stepik platform
    const stepikPlatform = await db.query.platforms.findFirst({
      where: eq(platforms.code, 'stepik'),
    });

    if (!stepikPlatform) {
      return res.status(404).json({ message: 'Stepik platform not configured' });
    }

    // Delete connection
    await db.delete(platformConnections)
      .where(
        and(
          eq(platformConnections.userId, userId),
          eq(platformConnections.platformId, stepikPlatform.id)
        )
      );

    // Delete synced courses
    await db.delete(externalCourses)
      .where(
        and(
          eq(externalCourses.userId, userId),
          eq(externalCourses.platformId, stepikPlatform.id)
        )
      );

    console.log(`🔌 Disconnected user ${userId} from Stepik`);

    res.json({ success: true, message: 'Disconnected from Stepik' });
  } catch (error: any) {
    console.error('Error disconnecting from Stepik:', error);
    res.status(500).json({ 
      message: 'Error disconnecting', 
      error: error.message 
    });
  }
});

export default router;
