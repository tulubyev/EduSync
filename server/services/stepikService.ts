import crypto from 'crypto';
import { logger } from './logger';
import * as https from 'https';
import * as querystring from 'querystring';

/**
 * Stepik Integration Service
 * Handles OAuth 2.0 flow and API interactions with Stepik platform
 */

const STEPIK_API_BASE = 'https://stepik.org/api';
const STEPIK_OAUTH_BASE = 'https://stepik.org/oauth2';
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

interface StepikTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  expiresIn: number;
}

interface StepikUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  avatar: string;
}

interface StepikEnrollment {
  id: number;
  user: number;
  course: number;
  isPaid: boolean;
  isActive: boolean;
}

interface StepikCourse {
  id: number;
  title: string;
  summary: string;
  description: string;
  cover: string;
  courseFormat: string;
  beginDate: string;
  endDate: string;
  language: string;
  workload: number;
  certificateRegularThreshold: number;
  slug: string;
}

interface StepikProgress {
  id: number;
  user: number;
  course: number;
  nStepsPassed: number;
  nSteps: number;
  isPassed: boolean;
  percentPassed: number;
  cost: number;
  isPaid: boolean;
}

interface StepikSection {
  id: number;
  course: number;
  title: string;
  position: number;
  softDeadline: string;
  hardDeadline: string;
  gradeType: string;
}

class StepikService {
  private clientId: string;
  private clientSecret: string;
  private encryptionKey: string;

  constructor() {
    this.clientId = process.env.STEPIK_CLIENT_ID || '';
    this.clientSecret = process.env.STEPIK_CLIENT_SECRET || '';
    this.encryptionKey = process.env.PLATFORM_TOKENS_ENCRYPTION_KEY || '';

    if (!this.clientId || !this.clientSecret || !this.encryptionKey) {
      logger.warn('Stepik environment variables not fully configured');
    }
  }

  /**
   * Get OAuth authorization URL for user to authenticate
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: `${(process.env.API_BASE_URL || process.env.APP_URL || 'http://localhost:5000')}/api/platforms/stepik/callback`,
      state,
    });

    return `${STEPIK_OAUTH_BASE}/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access and refresh tokens
   */
  async exchangeCodeForTokens(code: string): Promise<StepikTokenPair> {
    return new Promise((resolve, reject) => {
      const data = querystring.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${(process.env.API_BASE_URL || process.env.APP_URL || 'http://localhost:5000')}/api/platforms/stepik/callback`,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      });

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      };

      const req = https.request(`${STEPIK_OAUTH_BASE}/token/`, options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const response = JSON.parse(body);
            resolve({
              accessToken: response.access_token,
              refreshToken: response.refresh_token,
              expiresIn: response.expires_in,
              expiresAt: new Date(Date.now() + response.expires_in * 1000),
            });
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<StepikTokenPair> {
    return new Promise((resolve, reject) => {
      const data = querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      });

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      };

      const req = https.request(`${STEPIK_OAUTH_BASE}/token/`, options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const response = JSON.parse(body);
            resolve({
              accessToken: response.access_token,
              refreshToken: response.refresh_token || refreshToken,
              expiresIn: response.expires_in,
              expiresAt: new Date(Date.now() + response.expires_in * 1000),
            });
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  /**
   * Make HTTPS request to Stepik API
   */
  private makeApiRequest<T>(
    method: string,
    path: string,
    accessToken: string,
    queryParams?: Record<string, string | number>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const url = new URL(`${STEPIK_API_BASE}${path}`);
      if (queryParams) {
        Object.entries(queryParams).forEach(([key, value]) => {
          url.searchParams.append(key, String(value));
        });
      }

      const options = {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      };

      const req = https.request(url, options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${body}`));
            } else {
              resolve(JSON.parse(body || '{}'));
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  /**
   * Get current user info from Stepik
   */
  async getCurrentUser(accessToken: string): Promise<StepikUser> {
    const response = await this.makeApiRequest<any>('GET', '/stepics', accessToken, {
      user: 'current',
    });

    if (!response.stepics || response.stepics.length === 0) {
      throw new Error('No user data received from Stepik');
    }

    return response.stepics[0];
  }

  /**
   * Get user enrollments
   */
  async getEnrollments(accessToken: string, userId: number): Promise<number[]> {
    const courseIds: number[] = [];
    let page = 1;
    const pageSize = 20;

    while (true) {
      const response = await this.makeApiRequest<any>('GET', '/enrollments', accessToken, {
        user: userId,
        page,
        page_size: pageSize,
      });

      if (!response.enrollments || response.enrollments.length === 0) {
        break;
      }

      courseIds.push(...response.enrollments.map((e: StepikEnrollment) => e.course));

      if (!response.meta.has_next) {
        break;
      }

      page++;
    }

    return courseIds;
  }

  /**
   * Get course details (batch request)
   */
  async getCourses(accessToken: string, courseIds: number[]): Promise<StepikCourse[]> {
    if (courseIds.length === 0) {
      return [];
    }

    const courses: StepikCourse[] = [];
    // Batch requests in groups of 100 (Stepik API limit)
    for (let i = 0; i < courseIds.length; i += 100) {
      const batch = courseIds.slice(i, i + 100);
      const response = await this.makeApiRequest<any>('GET', '/courses', accessToken, {
        ids: batch.join(','),
      });

      if (response.courses) {
        courses.push(...response.courses);
      }
    }

    return courses;
  }

  /**
   * Get course progress for multiple courses
   */
  async getProgressBatch(accessToken: string, progressIds: string[]): Promise<StepikProgress[]> {
    if (progressIds.length === 0) {
      return [];
    }

    const progresses: StepikProgress[] = [];
    // Batch requests in groups of 100
    for (let i = 0; i < progressIds.length; i += 100) {
      const batch = progressIds.slice(i, i + 100);
      const response = await this.makeApiRequest<any>('GET', '/progresses', accessToken, {
        ids: batch.join(','),
      });

      if (response.progresses) {
        progresses.push(...response.progresses);
      }
    }

    return progresses;
  }

  /**
   * Get sections (deadlines) for a course
   */
  async getCourseSections(accessToken: string, courseId: number): Promise<StepikSection[]> {
    const sections: StepikSection[] = [];
    let page = 1;

    while (true) {
      const response = await this.makeApiRequest<any>('GET', '/sections', accessToken, {
        course: courseId,
        page,
        page_size: 20,
      });

      if (!response.sections || response.sections.length === 0) {
        break;
      }

      sections.push(...response.sections);

      if (!response.meta.has_next) {
        break;
      }

      page++;
    }

    return sections;
  }

  /**
   * Encrypt token for database storage
   */
  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      ENCRYPTION_ALGORITHM,
      Buffer.from(this.encryptionKey, 'hex'),
      iv
    );

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = (cipher as any).getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt token from database storage
   */
  decrypt(encrypted: string): string {
    const [ivHex, authTagHex, encryptedText] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(
      ENCRYPTION_ALGORITHM,
      Buffer.from(this.encryptionKey, 'hex'),
      iv
    );

    (decipher as any).setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Check if access token is expired
   */
  isTokenExpired(expiresAt: Date): boolean {
    return new Date() >= new Date(expiresAt.getTime() - 5 * 60 * 1000); // 5 min buffer
  }
}

export default new StepikService();
