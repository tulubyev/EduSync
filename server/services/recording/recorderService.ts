import { chromium, Browser, Page, CDPSession } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { logger } from '../logger';
import { RecordingConfig, RecordingPart } from './types';

const RECORDINGS_DIR = '/tmp/recordings';
const MAX_PART_DURATION_MS = 20 * 60 * 1000; // 20 minutes (Replit limit safety margin)

class RecorderService {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private cdpSession: CDPSession | null = null;
  private ffmpegProcess: ChildProcess | null = null;
  private isRecording = false;
  private currentOutputPath: string | null = null;
  private initialized = false;

  private config: RecordingConfig = {
    maxPartDurationMs: MAX_PART_DURATION_MS,
    outputDir: RECORDINGS_DIR,
    chromiumPath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    headless: true,
    viewport: { width: 1920, height: 1080 },
  };

  constructor() {
    if (!fs.existsSync(RECORDINGS_DIR)) {
      fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
    }
    // Lazy initialization - don't load Playwright until actually needed
    logger.info('🎬 RecorderService created (lazy init)');
  }

  private async ensureInitialized() {
    if (this.initialized) return;
    this.initialized = true;
    logger.info('🎬 RecorderService initializing Playwright...');
  }

  async startBrowser(): Promise<void> {
    if (this.browser) {
      logger.warn('Browser already running');
      return;
    }

    await this.ensureInitialized();

    try {
      this.browser = await chromium.launch({
        headless: this.config.headless,
        executablePath: this.config.chromiumPath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-extensions',
          '--disable-background-networking',
          '--mute-audio=false',
        ],
      });
      logger.info('✅ Browser started');
    } catch (error) {
      logger.error('Failed to start browser:', error);
      throw error;
    }
  }

  async stopBrowser(): Promise<void> {
    if (this.page) {
      await this.page.close().catch(() => {});
      this.page = null;
    }
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
    this.cdpSession = null;
    logger.info('Browser stopped');
  }

  async navigateToStream(url: string, password?: string): Promise<void> {
    if (!this.browser) {
      await this.startBrowser();
    }

    this.page = await this.browser!.newPage();
    await this.page.setViewportSize(this.config.viewport);

    try {
      await this.page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      logger.info(`📺 Navigated to stream: ${url}`);

      if (password) {
        await this.enterPassword(password);
      }

      await this.page.waitForTimeout(5000);
    } catch (error) {
      logger.error('Failed to navigate to stream:', error);
      throw error;
    }
  }

  private async enterPassword(password: string): Promise<void> {
    if (!this.page) return;

    try {
      const passwordSelectors = [
        'input[type="password"]',
        'input[name="password"]',
        'input[placeholder*="пароль"]',
        'input[placeholder*="password"]',
        '#password',
        '.password-input',
      ];

      for (const selector of passwordSelectors) {
        const input = await this.page.$(selector);
        if (input) {
          await input.fill(password);
          logger.info('Password entered');

          const submitSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:has-text("Войти")',
            'button:has-text("Enter")',
            'button:has-text("Submit")',
          ];

          for (const btnSelector of submitSelectors) {
            const btn = await this.page.$(btnSelector);
            if (btn) {
              await btn.click();
              await this.page.waitForTimeout(2000);
              break;
            }
          }
          break;
        }
      }
    } catch (error) {
      logger.warn('Could not enter password automatically:', error);
    }
  }

  async startRecording(
    taskId: string,
    partNumber: number,
    durationMs: number
  ): Promise<{ filePath: string; actualDuration: number }> {
    if (this.isRecording) {
      throw new Error('Recording already in progress');
    }

    if (!this.page) {
      throw new Error('No page available for recording');
    }

    await this.ensureInitialized();

    const fileName = `recording_${taskId}_part${partNumber}_${Date.now()}.webm`;
    const outputPath = path.join(RECORDINGS_DIR, fileName);
    this.currentOutputPath = outputPath;
    this.isRecording = true;

    const actualDuration = Math.min(durationMs, this.config.maxPartDurationMs);

    logger.info(`🔴 Starting recording: ${fileName}, duration: ${actualDuration}ms`);

    try {
      this.cdpSession = await this.page.context().newCDPSession(this.page);

      await this.cdpSession.send('Page.startScreencast', {
        format: 'jpeg',
        quality: 80,
        maxWidth: this.config.viewport.width,
        maxHeight: this.config.viewport.height,
        everyNthFrame: 2,
      });

      const startTime = Date.now();
      const frames: Buffer[] = [];

      this.cdpSession.on('Page.screencastFrame', async (params) => {
        if (!this.isRecording) return;

        try {
          const frameData = Buffer.from(params.data, 'base64');
          frames.push(frameData);
          await this.cdpSession?.send('Page.screencastFrameAck', { sessionId: params.sessionId });
        } catch (e) {
          // Ignore frame errors
        }
      });

      await new Promise<void>((resolve) => {
        setTimeout(async () => {
          this.isRecording = false;

          try {
            await this.cdpSession?.send('Page.stopScreencast');
          } catch (e) {
            // Ignore stop errors
          }

          if (frames.length > 0) {
            await this.convertFramesToVideo(frames, outputPath);
          }

          resolve();
        }, actualDuration);
      });

      const endTime = Date.now();
      const recordedDuration = endTime - startTime;

      logger.info(`✅ Recording completed: ${fileName}, frames: ${frames.length}, duration: ${recordedDuration}ms`);

      return {
        filePath: outputPath,
        actualDuration: recordedDuration,
      };
    } catch (error) {
      this.isRecording = false;
      logger.error('Recording failed:', error);
      throw error;
    }
  }

  private async convertFramesToVideo(frames: Buffer[], outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const framesDir = path.join(RECORDINGS_DIR, `frames_${Date.now()}`);
      fs.mkdirSync(framesDir, { recursive: true });

      frames.forEach((frame, index) => {
        const framePath = path.join(framesDir, `frame_${String(index).padStart(6, '0')}.jpg`);
        fs.writeFileSync(framePath, frame);
      });

      const ffmpeg = spawn('ffmpeg', [
        '-y',
        '-framerate', '15',
        '-i', path.join(framesDir, 'frame_%06d.jpg'),
        '-c:v', 'libvpx-vp9',
        '-b:v', '2M',
        '-pix_fmt', 'yuva420p',
        outputPath,
      ]);

      ffmpeg.on('close', (code) => {
        fs.rmSync(framesDir, { recursive: true, force: true });

        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });

      ffmpeg.on('error', (error) => {
        fs.rmSync(framesDir, { recursive: true, force: true });
        reject(error);
      });
    });
  }

  async stopRecording(): Promise<void> {
    this.isRecording = false;

    if (this.cdpSession) {
      try {
        await this.cdpSession.send('Page.stopScreencast');
      } catch (e) {
        // Ignore
      }
    }

    if (this.ffmpegProcess) {
      this.ffmpegProcess.kill('SIGTERM');
      this.ffmpegProcess = null;
    }

    logger.info('Recording stopped');
  }

  getRecordingStatus(): { isRecording: boolean; currentFile: string | null } {
    return {
      isRecording: this.isRecording,
      currentFile: this.currentOutputPath,
    };
  }

  async cleanup(): Promise<void> {
    await this.stopRecording();
    await this.stopBrowser();

    const files = fs.readdirSync(RECORDINGS_DIR);
    for (const file of files) {
      const filePath = path.join(RECORDINGS_DIR, file);
      const stats = fs.statSync(filePath);
      const ageMs = Date.now() - stats.mtimeMs;

      if (ageMs > 24 * 60 * 60 * 1000) {
        fs.unlinkSync(filePath);
        logger.info(`Cleaned up old recording: ${file}`);
      }
    }
  }
}

export const recorderService = new RecorderService();