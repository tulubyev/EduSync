import { db } from "../db";
import { externalCourses, platformConnections } from "../../shared/schema";
import { eventStorage } from "../storage/EventStorage";
import { eq, and } from "drizzle-orm";
import stepikService from "./stepikService";

/**
 * Stepik Synchronization Service
 * Handles syncing courses, progress, and deadlines from Stepik API to database
 */

interface SyncResult {
  success: boolean;
  coursesCount: number;
  deadlinesCount: number;
  message: string;
  error?: string;
}

class StepikSyncService {
  /**
   * Full sync of user's courses from Stepik
   */
  async syncUserCourses(
    userId: string,
    platformId: string,
    accessTokenEncrypted: string,
    refreshTokenEncrypted: string,
    tokenExpiresAt: Date
  ): Promise<SyncResult> {
    try {
      // 1. Decrypt tokens
      const accessToken = stepikService.decrypt(accessTokenEncrypted);
      let refreshToken = stepikService.decrypt(refreshTokenEncrypted);
      let currentTokenExpiresAt = tokenExpiresAt;

      // 2. Check if token is expired and refresh if needed
      if (stepikService.isTokenExpired(currentTokenExpiresAt)) {
        console.log(`🔄 Refreshing access token for user ${userId}...`);
        try {
          const newTokens = await stepikService.refreshAccessToken(refreshToken);
          
          // Update tokens in database
          await db.update(platformConnections)
            .set({
              accessTokenEncrypted: stepikService.encrypt(newTokens.accessToken),
              refreshTokenEncrypted: stepikService.encrypt(newTokens.refreshToken),
              tokenExpiresAt: newTokens.expiresAt,
            })
            .where(
              and(
                eq(platformConnections.userId, userId),
                eq(platformConnections.platformId, platformId)
              )
            );

          refreshToken = newTokens.refreshToken;
          currentTokenExpiresAt = newTokens.expiresAt;
        } catch (error: any) {
          // Refresh token expired, need reauth
          console.error(`❌ Refresh token expired for user ${userId}`, error);
          
          await db.update(platformConnections)
            .set({
              connectionStatus: 'reauth_required',
              lastSyncError: 'Refresh token expired. Please reconnect to Stepik.',
            })
            .where(
              and(
                eq(platformConnections.userId, userId),
                eq(platformConnections.platformId, platformId)
              )
            );

          return {
            success: false,
            coursesCount: 0,
            deadlinesCount: 0,
            message: 'Refresh token expired',
            error: error.message,
          };
        }
      }

      // 3. Get current Stepik user
      console.log(`👤 Fetching Stepik user info...`);
      const stepikUser = await stepikService.getCurrentUser(accessToken);
      const stepikUserId = stepikUser.id;

      // 4. Get enrollments
      console.log(`📚 Fetching enrollments...`);
      const courseIds = await stepikService.getEnrollments(accessToken, stepikUserId);

      if (courseIds.length === 0) {
        console.log(`✅ No courses enrolled`);
        return {
          success: true,
          coursesCount: 0,
          deadlinesCount: 0,
          message: 'No courses enrolled',
        };
      }

      // 5. Get course details
      console.log(`📖 Fetching ${courseIds.length} course details...`);
      const stepikCourses = await stepikService.getCourses(accessToken, courseIds);

      // 6. Get progress for all courses
      console.log(`📊 Fetching progress data...`);
      const progressIds = stepikCourses.map((c: any) => c.progress).filter(Boolean);
      const progressData = await stepikService.getProgressBatch(accessToken, progressIds);
      const progressMap = new Map(progressData.map((p: any) => [p.id, p]));

      // 7. Sync courses to database
      console.log(`💾 Syncing ${stepikCourses.length} courses to database...`);
      let deadlineCount = 0;

      for (const stepikCourse of stepikCourses) {
        const progress = progressMap.get((stepikCourse as any).progress);
        
        // Upsert course
        await db
          .insert(externalCourses)
          .values({
            userId,
            platformId,
            externalCourseId: String(stepikCourse.id),
            title: stepikCourse.title,
            description: stepikCourse.summary || stepikCourse.description,
            imageUrl: stepikCourse.cover || null,
            courseUrl: `https://stepik.org/course/${stepikCourse.id}`,
            progress: progress ? Math.round((progress.nStepsPassed / progress.nSteps) * 100) : 0,
            isCompleted: progress?.isPassed ?? false,
            startDate: stepikCourse.beginDate ? new Date(stepikCourse.beginDate) : null,
            endDate: stepikCourse.endDate ? new Date(stepikCourse.endDate) : null,
            language: stepikCourse.language,
            certificateAvailable: stepikCourse.certificateRegularThreshold > 0,
            workload: stepikCourse.workload,
            metadata: { slug: stepikCourse.slug },
            lastSyncedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [externalCourses.externalCourseId, externalCourses.userId],
            set: {
              title: stepikCourse.title,
              description: stepikCourse.summary || stepikCourse.description,
              imageUrl: stepikCourse.cover || null,
              progress: progress ? Math.round((progress.nStepsPassed / progress.nSteps) * 100) : 0,
              isCompleted: progress?.isPassed ?? false,
              lastSyncedAt: new Date(),
            },
          });

        // 8. Get and sync deadlines for this course
        try {
          console.log(`   ⏰ Fetching deadlines for course ${stepikCourse.id}...`);
          const sections = await stepikService.getCourseSections(accessToken, stepikCourse.id);

          // сроки разделов — в общую ленту ученика (learning_events), как у любой площадки
          deadlineCount += await eventStorage.upsertSourceEvents(userId, 'stepik', platformId, sections
            .filter((section) => section.softDeadline || section.hardDeadline)
            .map((section) => ({
              externalId: `section-${section.id}`,
              type: 'deadline' as const,
              title: section.title,
              startsAt: new Date(section.softDeadline || section.hardDeadline),
              programTitle: stepikCourse.title,
              moduleTitle: section.title,
              lessonUrl: `https://stepik.org/course/${stepikCourse.id}/syllabus`,
              metadata: { sectionId: section.id, position: section.position, deadlineType: section.softDeadline ? 'soft' : 'hard' },
            })));
        } catch (error) {
          console.warn(`⚠️ Error fetching deadlines for course ${stepikCourse.id}:`, error);
        }
      }

      // 9. Update last sync time
      await db.update(platformConnections)
        .set({
          lastSyncAt: new Date(),
          syncStatus: 'idle',
          lastSyncError: null,
          externalUserId: String(stepikUserId),
        })
        .where(
          and(
            eq(platformConnections.userId, userId),
            eq(platformConnections.platformId, platformId)
          )
        );

      console.log(`✅ Sync complete: ${stepikCourses.length} courses, ${deadlineCount} deadlines`);

      return {
        success: true,
        coursesCount: stepikCourses.length,
        deadlinesCount: deadlineCount,
        message: `Synced ${stepikCourses.length} courses and ${deadlineCount} deadlines`,
      };
    } catch (error: any) {
      console.error('❌ Sync failed:', error);

      // Update sync status with error
      await db.update(platformConnections)
        .set({
          syncStatus: 'failed',
          lastSyncError: error.message,
        })
        .where(
          and(
            eq(platformConnections.userId, userId),
            eq(platformConnections.platformId, platformId)
          )
        );

      return {
        success: false,
        coursesCount: 0,
        deadlinesCount: 0,
        message: 'Sync failed',
        error: error.message,
      };
    }
  }

  /**
   * Update sync status to 'syncing'
   */
  async setSyncStatus(userId: string, platformId: string, status: string) {
    await db.update(platformConnections)
      .set({ syncStatus: status })
      .where(
        and(
          eq(platformConnections.userId, userId),
          eq(platformConnections.platformId, platformId)
        )
      );
  }
}

export default new StepikSyncService();
