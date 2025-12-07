import { chromium, Browser, Page, CDPSession } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { logger } from '../logger';
import { RecordingConfig, RecordingPart } from './types';
import { audioSetup } from './audioSetup';

const RECORDINGS_DIR = '/tmp/recordings';
const DEFAULT_VIEWPORT = { width: 1920, height: 1080 };
const FRAME_RATE = 15;

interface StreamingRecordingSession {
  taskId: string;
  partNumber: number;
  ffmpegProcess: ChildProcess;
  outputPath: string;
  startTime: number;
  frameCount: number;
  isActive: boolean;
  ffmpegExitCode: number | null;
  ffmpegError: string | null;
}

const MAX_FRAME_BUFFER_SIZE = 100;
const FRAME_DROP_THRESHOLD = 80;

class StreamingRecorderService {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private cdpSession: CDPSession | null = null;
  private currentSession: StreamingRecordingSession | null = null;
  private frameBuffer: Buffer[] = [];
  private frameWriteInterval: NodeJS.Timeout | null = null;
  
  private config: RecordingConfig = {
    maxPartDurationMs: 20 * 60 * 1000,
    outputDir: RECORDINGS_DIR,
    chromiumPath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    headless: true,
    viewport: DEFAULT_VIEWPORT,
  };

  constructor() {
    if (!fs.existsSync(RECORDINGS_DIR)) {
      fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
    }
    logger.info('🎬 StreamingRecorderService initialized');
  }

  async initialize(): Promise<{ audioAvailable: boolean }> {
    const audioAvailable = await audioSetup.initialize();
    if (!audioAvailable) {
      logger.warn('Audio capture not available - recordings will be video-only');
    }
    return { audioAvailable };
  }

  async startBrowser(): Promise<void> {
    if (this.browser) {
      logger.warn('Browser already running');
      return;
    }

    try {
      const audioFlags = audioSetup.getChromiumAudioFlags();
      
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
          ...audioFlags,
        ],
      });
      logger.info('✅ Browser started with audio support');
    } catch (error) {
      logger.error('Failed to start browser:', error);
      throw error;
    }
  }

  async stopBrowser(): Promise<void> {
    await this.stopRecording();
    
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

  async startStreamingRecording(
    taskId: string,
    partNumber: number,
    durationMs: number
  ): Promise<{ outputPath: string }> {
    if (this.currentSession?.isActive) {
      throw new Error('Recording already in progress');
    }

    if (!this.page) {
      throw new Error('No page available for recording');
    }

    const fileName = `recording_${taskId}_part${partNumber}_${Date.now()}.webm`;
    const outputPath = path.join(RECORDINGS_DIR, fileName);

    const hasAudio = audioSetup.isAudioAvailable();
    const audioArgs = hasAudio ? audioSetup.getFFmpegAudioArgs() : [];

    const ffmpegArgs = [
      '-y',
      '-f', 'mjpeg',
      '-framerate', String(FRAME_RATE),
      '-i', 'pipe:0',
      ...audioArgs,
      '-c:v', 'libvpx-vp9',
      '-b:v', '2M',
      '-deadline', 'realtime',
      '-cpu-used', '8',
      '-pix_fmt', 'yuv420p',
      ...(hasAudio ? ['-c:a', 'libopus', '-b:a', '128k'] : []),
      '-t', String(Math.ceil(durationMs / 1000)),
      outputPath,
    ];

    logger.info(`🔴 Starting streaming recording: ${fileName}`);
    logger.info(`FFmpeg args: ${ffmpegArgs.join(' ')}`);

    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    ffmpegProcess.stderr?.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('error') || msg.includes('Error')) {
        logger.error('FFmpeg error:', msg);
      }
    });

    ffmpegProcess.on('error', (error) => {
      logger.error('FFmpeg process error:', error);
    });

    this.currentSession = {
      taskId,
      partNumber,
      ffmpegProcess,
      outputPath,
      startTime: Date.now(),
      frameCount: 0,
      isActive: true,
      ffmpegExitCode: null,
      ffmpegError: null,
    };

    ffmpegProcess.on('close', (code) => {
      if (this.currentSession) {
        this.currentSession.ffmpegExitCode = code;
      }
    });

    ffmpegProcess.stderr?.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('error') || msg.includes('Error') || msg.includes('fatal')) {
        if (this.currentSession) {
          this.currentSession.ffmpegError = msg;
        }
        logger.error('FFmpeg error:', msg);
      }
    });

    this.cdpSession = await this.page.context().newCDPSession(this.page);

    await this.cdpSession.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 80,
      maxWidth: this.config.viewport.width,
      maxHeight: this.config.viewport.height,
      everyNthFrame: 2,
    });

    this.cdpSession.on('Page.screencastFrame', async (params) => {
      if (!this.currentSession?.isActive) return;
      
      try {
        const frameData = Buffer.from(params.data, 'base64');
        
        if (this.frameBuffer.length >= MAX_FRAME_BUFFER_SIZE) {
          const dropCount = this.frameBuffer.length - FRAME_DROP_THRESHOLD;
          if (dropCount > 0) {
            this.frameBuffer.splice(0, dropCount);
            logger.warn(`Backpressure: dropped ${dropCount} oldest frames`);
          }
        }
        
        this.frameBuffer.push(frameData);
        await this.cdpSession?.send('Page.screencastFrameAck', { sessionId: params.sessionId });
      } catch (e) {
      }
    });

    this.frameWriteInterval = setInterval(() => {
      this.flushFrameBuffer();
    }, 100);

    return { outputPath };
  }

  private flushFrameBuffer(): void {
    if (!this.currentSession?.isActive || !this.currentSession.ffmpegProcess.stdin) {
      return;
    }

    while (this.frameBuffer.length > 0) {
      const frame = this.frameBuffer.shift();
      if (frame) {
        try {
          const canWrite = this.currentSession.ffmpegProcess.stdin.write(frame);
          this.currentSession.frameCount++;
          
          if (!canWrite) {
            break;
          }
        } catch (e) {
        }
      }
    }
  }

  async waitForRecordingComplete(durationMs: number): Promise<{
    filePath: string;
    actualDuration: number;
    frameCount: number;
    success: boolean;
    error?: string;
  }> {
    if (!this.currentSession) {
      throw new Error('No active recording session');
    }

    await new Promise<void>((resolve) => {
      setTimeout(resolve, durationMs);
    });

    return this.stopRecording();
  }

  async stopRecording(): Promise<{
    filePath: string;
    actualDuration: number;
    frameCount: number;
    success: boolean;
    error?: string;
  }> {
    if (!this.currentSession) {
      return { filePath: '', actualDuration: 0, frameCount: 0, success: false, error: 'No active session' };
    }

    const session = this.currentSession;
    session.isActive = false;

    if (this.frameWriteInterval) {
      clearInterval(this.frameWriteInterval);
      this.frameWriteInterval = null;
    }

    this.flushFrameBuffer();

    if (this.cdpSession) {
      try {
        await this.cdpSession.send('Page.stopScreencast');
      } catch (e) {
      }
    }

    await new Promise<void>((resolve) => {
      if (!session.ffmpegProcess.stdin) {
        resolve();
        return;
      }

      session.ffmpegProcess.stdin.end();

      session.ffmpegProcess.on('close', (code) => {
        session.ffmpegExitCode = code;
        if (code === 0) {
          logger.info(`✅ FFmpeg completed successfully`);
        } else {
          logger.warn(`FFmpeg exited with code ${code}`);
        }
        resolve();
      });

      setTimeout(() => {
        session.ffmpegProcess.kill('SIGTERM');
        resolve();
      }, 10000);
    });

    const actualDuration = Date.now() - session.startTime;
    
    const fileExists = fs.existsSync(session.outputPath);
    const success = session.ffmpegExitCode === 0 && fileExists && session.frameCount > 0;
    
    const result = {
      filePath: session.outputPath,
      actualDuration,
      frameCount: session.frameCount,
      success,
      error: !success ? (session.ffmpegError || `FFmpeg exited with code ${session.ffmpegExitCode}, file exists: ${fileExists}, frames: ${session.frameCount}`) : undefined,
    };

    if (success) {
      logger.info(`✅ Recording completed: ${session.outputPath}, frames: ${session.frameCount}, duration: ${actualDuration}ms`);
    } else {
      logger.error(`❌ Recording failed: ${result.error}`);
    }

    this.currentSession = null;
    this.frameBuffer = [];

    return result;
  }

  async rotateChunk(
    taskId: string,
    newPartNumber: number,
    newDurationMs: number
  ): Promise<{
    previousFilePath: string;
    previousDuration: number;
    previousFrameCount: number;
    newOutputPath: string;
  }> {
    const previousResult = await this.stopRecording();
    
    const { outputPath } = await this.startStreamingRecording(taskId, newPartNumber, newDurationMs);

    return {
      previousFilePath: previousResult.filePath,
      previousDuration: previousResult.actualDuration,
      previousFrameCount: previousResult.frameCount,
      newOutputPath: outputPath,
    };
  }

  isRecording(): boolean {
    return this.currentSession?.isActive ?? false;
  }

  getCurrentSession(): StreamingRecordingSession | null {
    return this.currentSession;
  }

  async cleanup(): Promise<void> {
    await this.stopRecording();
    await this.stopBrowser();
    await audioSetup.cleanup();

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

export const streamingRecorderService = new StreamingRecorderService();
