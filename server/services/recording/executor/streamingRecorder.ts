import { chromium, Browser, Page, CDPSession } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { logger } from '../../logger';
import { RecordingConfig } from '../types';
import { AudioSetup } from './audioSetup';
import { executorConfig } from './config';
import { previewBus } from './previewBus';

const BASE_RECORDINGS_DIR = executorConfig.recording.outputDir;
const DEFAULT_VIEWPORT = executorConfig.recording.viewport;
const FRAME_RATE = executorConfig.recording.frameRate;

const MIN_FREE_DISK_MB = 500;

function getFreeDiskMB(dir: string): number {
  try {
    const { execSync } = require('child_process');
    const out: string = execSync(`df -m "${dir}" | tail -1 | awk '{print $4}'`, { encoding: 'utf-8' }).trim();
    return parseInt(out, 10) || 0;
  } catch {
    return Infinity;
  }
}

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

export class StreamingRecorder {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private cdpSession: CDPSession | null = null;
  private currentSession: StreamingRecordingSession | null = null;
  private frameBuffer: Buffer[] = [];
  private frameWriteInterval: NodeJS.Timeout | null = null;
  private workerId: string;
  private outputDir: string;
  private audioSetup: AudioSetup;

  private recordingConfig: RecordingConfig;

  constructor(workerId: string = 'default') {
    this.workerId = workerId;
    const safeId = workerId.replace(/[^a-zA-Z0-9_-]/g, '_');
    this.outputDir = path.join(BASE_RECORDINGS_DIR, safeId);

    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    this.audioSetup = new AudioSetup(workerId);

    this.recordingConfig = {
      maxPartDurationMs: executorConfig.recording.maxPartDurationMs,
      outputDir: this.outputDir,
      chromiumPath: executorConfig.chromium.executablePath,
      headless: executorConfig.chromium.headless,
      viewport: DEFAULT_VIEWPORT,
    };

    logger.info(`StreamingRecorder initialized (worker: ${workerId}, dir: ${this.outputDir})`);
  }

  async initialize(): Promise<{ audioAvailable: boolean }> {
    const audioAvailable = await this.audioSetup.initialize();
    if (!audioAvailable) {
      logger.warn('Audio capture not available - recordings will be video-only');
    }
    return { audioAvailable };
  }

  async startBrowser(): Promise<void> {
    if (this.browser) {
      logger.warn('Browser already running, closing first');
      try {
        await this.browser.close().catch(() => {});
      } catch (_e) {}
      this.browser = null;
    }

    try {
      const audioFlags = this.audioSetup.getChromiumAudioFlags();

      const chromiumArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--use-gl=swiftshader',
        '--ignore-gpu-blocklist',
        '--enable-unsafe-swiftshader',
        '--disable-extensions',
        '--disable-background-networking',
        '--autoplay-policy=no-user-gesture-required',
        '--disable-features=VizDisplayCompositor',
        '--use-fake-ui-for-media-stream',
        '--enable-features=WebRtcHideLocalIpsWithMdns',
        '--disable-rtc-smoothness-algorithm',
        '--allow-running-insecure-content',
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--no-default-browser-check',
        ...audioFlags,
      ];

      logger.info(`[BROWSER] Chromium args: ${chromiumArgs.join(' ')}`);
      logger.info(`[BROWSER] Executable: ${this.recordingConfig.chromiumPath ?? 'playwright-bundled'}`);
      logger.info(`[BROWSER] Headless: ${this.recordingConfig.headless}`);

      this.browser = await chromium.launch({
        headless: this.recordingConfig.headless,
        executablePath: this.recordingConfig.chromiumPath,
        args: chromiumArgs,
        env: {
          ...process.env,
          ...this.audioSetup.getChromiumEnv(),
        },
      });

      this.browser.on('disconnected', () => {
        const wasRecording = this.currentSession?.isActive ?? false;
        logger.error(`[BROWSER] ❌ Browser disconnected unexpectedly (recording active: ${wasRecording})`);
        if (this.currentSession?.isActive) {
          this.currentSession.isActive = false;
          logger.error(`[BROWSER] Recording session ${this.currentSession.taskId} aborted by browser disconnect`);
        }
        this.browser = null;
        this.page = null;
        this.cdpSession = null;
      });

      logger.info('[BROWSER] ✅ Browser started successfully');
    } catch (error) {
      logger.error('[BROWSER] ❌ Failed to start browser:', error);
      this.browser = null;
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

  getBrowserStatus(): {
    browserAlive: boolean;
    pageAlive: boolean;
    currentUrl: string | null;
    isRecording: boolean;
    frameCount: number;
    elapsedMs: number | null;
    taskId: string | null;
  } {
    const browserAlive = this.browser !== null;
    const pageAlive = this.page !== null && !this.page.isClosed();
    let currentUrl: string | null = null;
    if (pageAlive && this.page) {
      try { currentUrl = this.page.url(); } catch { currentUrl = null; }
    }
    const session = this.currentSession;
    return {
      browserAlive,
      pageAlive,
      currentUrl,
      isRecording: session?.isActive ?? false,
      frameCount: session?.frameCount ?? 0,
      elapsedMs: session ? Date.now() - session.startTime : null,
      taskId: session?.taskId ?? null,
    };
  }

  async navigateToStream(url: string, password?: string): Promise<void> {
    if (this.page) {
      try {
        await this.page.close().catch(() => {});
      } catch (_e) {}
      this.page = null;
    }

    if (!this.browser) {
      await this.startBrowser();
    }

    try {
      const context = await this.browser!.newContext({
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        permissions: ['camera', 'microphone'],
        ignoreHTTPSErrors: true,
      });

      await context.addInitScript(`
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['ru-RU', 'ru', 'en-US', 'en'] });
      `);

      this.page = await context.newPage();
      await this.page.setViewportSize(this.recordingConfig.viewport);

      this.page.on('console', (msg) => {
        const type = msg.type();
        const text = msg.text().slice(0, 200);
        if (type === 'error') {
          logger.warn(`[BROWSER CONSOLE] error: ${text}`);
        } else if (type === 'warning') {
          logger.info(`[BROWSER CONSOLE] warn: ${text}`);
        }
      });
      this.page.on('pageerror', (err) => {
        logger.warn(`[BROWSER PAGE ERROR] ${String(err).slice(0, 300)}`);
      });

      // Video platforms (YouTube, Twitch, VK) never reach networkidle — they
      // continuously stream data.  Use domcontentloaded and let the 20-second
      // post-nav wait handle player initialisation instead.
      // Webinar platforms (Zoom, Webinar.ru, etc.) get 'load' so their JS
      // bundles are fully evaluated before we try to interact with the page.
      const isVideoHosting = /youtube\.com|youtu\.be|twitch\.tv|vk\.com\/video|vk\.com\/live|rutube\.ru|ok\.ru\/video|vimeo\.com|kinescope\.io|kick\.com|boosty\.to|goodgame\.ru|trovo\.live/i.test(url);
      const waitUntil = isVideoHosting ? 'domcontentloaded' : 'load';
      const navTimeout = 45000;

      logger.info(`[NAV] Navigating to ${url} (waitUntil: ${waitUntil}, timeout: ${navTimeout / 1000}s)`);
      await this.page.goto(url, { waitUntil, timeout: navTimeout });

      const finalUrl = this.page.url();
      const title = await this.page.title().catch(() => '(no title)');
      logger.info(`[NAV] ✅ Loaded — title: "${title}", finalUrl: ${finalUrl}`);

      if (password) {
        await this.enterPassword(password);
      }

      logger.info('[NAV] Waiting 20s for players to initialise...');
      await this.page.waitForTimeout(20000);

      await this.page.mouse.click(
        this.recordingConfig.viewport.width / 2,
        this.recordingConfig.viewport.height / 2,
      ).catch(() => {});
      logger.info('[NAV] Clicked center of page to trigger autoplay');

      try {
        const frames = this.page.frames();
        const kinescopeFrame = frames.find(f => f.url().includes('kinescope.io'));
        if (kinescopeFrame) {
          logger.info(`[NAV] Found Kinescope frame: ${kinescopeFrame.url()}`);
          await kinescopeFrame.evaluate(`
            (() => {
              const videos = Array.from(document.querySelectorAll('video'));
              const info = videos.map(v => ({
                src: v.src || v.currentSrc || 'no-src',
                readyState: v.readyState,
                paused: v.paused,
                networkState: v.networkState,
                error: v.error ? v.error.code : null,
              }));
              console.log('[KINESCOPE] videos:', JSON.stringify(info));
              videos.forEach(v => {
                if (v.paused) {
                  v.play().catch(function(e) { console.warn('[KINESCOPE] play failed:', e.message); });
                }
              });
            })()
          `).catch((e: Error) => logger.warn(`[NAV] Kinescope frame eval failed: ${e.message}`));
        } else {
          logger.info('[NAV] No Kinescope frame found yet (still loading?)');
        }
      } catch (_e) {
        logger.warn(`[NAV] Frame interaction error: ${(_e as Error).message}`);
      }

      await this.page.waitForTimeout(3000);
      await this.debugPageState();

    } catch (error) {
      logger.error('[NAV] ❌ Failed to navigate to stream:', error);
      if (this.page) {
        try {
          await this.page.close().catch(() => {});
        } catch (_e) {}
        this.page = null;
      }
      throw error;
    }
  }

  private async debugPageState(): Promise<void> {
    if (!this.page) return;
    try {
      const info = await this.page.evaluate(() => {
        const win = globalThis as any;
        const doc = win.document;
        const videos: any[] = Array.from(doc.querySelectorAll('video'));
        const iframes: any[] = Array.from(doc.querySelectorAll('iframe'));
        return {
          videoCount: videos.length,
          videos: videos.map((v: any) => ({
            src: v.src || v.currentSrc || '(no src)',
            paused: v.paused,
            readyState: v.readyState,
            w: v.videoWidth,
            h: v.videoHeight,
          })),
          iframeCount: iframes.length,
          iframes: iframes.slice(0, 3).map((f: any) => f.src || f.srcdoc?.slice(0, 50) || '(empty)'),
          bodyText: String(doc.body?.innerText ?? '').slice(0, 200) || '(empty body)',
        };
      }).catch((e: unknown) => ({ error: String(e) }));
      logger.info(`[PAGE STATE] ${JSON.stringify(info)}`);

      const debugDir = '/tmp/debug';
      if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });
      const screenshotPath = `${debugDir}/screenshot_${Date.now()}.jpg`;
      await this.page.screenshot({ path: screenshotPath, type: 'jpeg', quality: 70 }).catch(() => {});
      logger.info(`[PAGE STATE] Screenshot saved: ${screenshotPath}`);
    } catch (_e) {
      logger.warn('[PAGE STATE] Debug eval failed:', _e);
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

    // Disk space check before recording
    const freeMB = getFreeDiskMB(this.outputDir);
    if (freeMB < MIN_FREE_DISK_MB) {
      throw new Error(`Недостаточно места на диске: ${freeMB} МБ свободно (минимум ${MIN_FREE_DISK_MB} МБ). Запись отменена.`);
    }
    if (freeMB < MIN_FREE_DISK_MB * 2) {
      logger.warn(`[DISK] ⚠️  Мало свободного места: ${freeMB} МБ (рекомендуется >${MIN_FREE_DISK_MB * 2} МБ)`);
    }

    const fileName = `recording_${taskId}_part${partNumber}_${Date.now()}.mp4`;
    const outputPath = path.join(this.outputDir, fileName);

    const hasAudio = this.audioSetup.isAudioAvailable();
    const audioArgs = hasAudio ? this.audioSetup.getFFmpegAudioArgs() : [];

    const ffmpegArgs = [
      '-y',
      '-thread_queue_size', '1024',
      '-f', 'mjpeg',
      '-framerate', String(FRAME_RATE),
      '-i', 'pipe:0',
      ...(hasAudio ? ['-thread_queue_size', '1024', ...audioArgs] : []),
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      ...(hasAudio ? [
        '-c:a', 'aac',
        '-b:a', '128k',
        '-af', 'aresample=async=1:min_hard_comp=0.100000:first_pts=0',
      ] : []),
      '-t', String(Math.ceil(durationMs / 1000)),
      '-movflags', '+faststart',
      outputPath,
    ];

    logger.info(`[REC] Starting recording: ${fileName}`);
    logger.info(`[REC] FFmpeg args: ffmpeg ${ffmpegArgs.join(' ')}`);

    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let ffmpegStderrBuf = '';
    const ffmpegErrorLines: string[] = [];
    ffmpegProcess.stderr?.on('data', (data) => {
      ffmpegStderrBuf += data.toString();
      const lines = ffmpegStderrBuf.split('\n');
      ffmpegStderrBuf = lines.pop() ?? '';
      for (const line of lines) {
        const l = line.trim();
        if (!l) continue;
        if (l.includes('error') || l.includes('Error') || l.includes('Invalid') || l.includes('Output file does not') || l.includes('No such file')) {
          logger.error(`[FFMPEG] ${l}`);
          ffmpegErrorLines.push(l);
          // Сохраняем накопленные ошибки в сессию чтобы errorMessage попал в БД
          if (this.currentSession) {
            this.currentSession.ffmpegError = ffmpegErrorLines.slice(-5).join('; ');
          }
        } else if (l.startsWith('frame=') || l.includes('fps=')) {
          logger.info(`[FFMPEG progress] ${l}`);
        } else {
          logger.info(`[FFMPEG] ${l}`);
        }
      }
    });

    ffmpegProcess.on('error', (error) => {
      logger.error('[FFMPEG] ❌ Process error:', error);
      if (this.currentSession) {
        this.currentSession.ffmpegError = `Process error: ${(error as Error).message}`;
      }
    });

    if (!ffmpegProcess.pid) {
      throw new Error('[REC] Failed to spawn FFmpeg — process did not start');
    }
    logger.info(`[REC] FFmpeg started (PID ${ffmpegProcess.pid})`);

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
      logger.info(`[FFMPEG] Process closed with code ${code}`);
    });

    logger.info('[CDP] Creating CDPSession...');
    this.cdpSession = await this.page.context().newCDPSession(this.page);
    logger.info('[CDP] ✅ CDPSession created');

    let cdpEventCount = 0;
    const cdpDiagTimer = setTimeout(() => {
      logger.info(`[CDP DIAG] Events received in first 30s: ${cdpEventCount} total`);
    }, 30_000);
    (this.cdpSession as any).on('*', () => { cdpEventCount++; });

    logger.info('[CDP] Sending Page.startScreencast (format=jpeg, quality=80, everyNthFrame=2)...');
    await this.cdpSession.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 80,
      maxWidth: this.recordingConfig.viewport.width,
      maxHeight: this.recordingConfig.viewport.height,
      everyNthFrame: 2,
    });
    logger.info('[CDP] ✅ Page.startScreencast sent — waiting for frames...');

    this.cdpSession.on('Page.screencastFrame', () => { void cdpDiagTimer; });

    let framesReceived = 0;
    this.cdpSession.on('Page.screencastFrame', (params) => {
      if (!this.currentSession?.isActive) return;

      try {
        const frameData = Buffer.from(params.data, 'base64');
        framesReceived++;

        if (framesReceived === 1) {
          logger.info(`CDPSession: first frame received (${frameData.length} bytes)`);
        } else if (framesReceived % 100 === 0) {
          logger.info(`CDPSession: ${framesReceived} frames received, buffer=${this.frameBuffer.length}`);
        }

        if (this.frameBuffer.length >= MAX_FRAME_BUFFER_SIZE) {
          const dropCount = this.frameBuffer.length - FRAME_DROP_THRESHOLD;
          if (dropCount > 0) {
            this.frameBuffer.splice(0, dropCount);
            logger.warn(`Backpressure: dropped ${dropCount} oldest frames`);
          }
        }

        this.frameBuffer.push(frameData);

        if (this.currentSession && previewBus.hasSubscribers(this.currentSession.taskId)) {
          previewBus.publishFrame(this.currentSession.taskId, frameData);
        }

        this.cdpSession?.send('Page.screencastFrameAck', { sessionId: params.sessionId }).catch(() => {});
      } catch (_e) {
        logger.warn('screencastFrame handler error:', _e);
      }
    });

    ffmpegProcess.stdin.on('drain', () => {
      this.flushFrameBuffer();
    });

    this.frameWriteInterval = setInterval(() => {
      this.flushFrameBuffer();
    }, 50);

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
        } catch (_e) {
          // stdin закрыт или разрушен
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

    const NO_FRAMES_ABORT_MS = 120_000;
    const STALL_WARN_MS = 60_000;
    let abortedEarly = false;
    let abortReason = '';
    let lastFrameCount = 0;
    let lastFrameAt = Date.now();

    // Обновляем lastFrameAt по мере прихода кадров
    const stalledFrameTracker = setInterval(() => {
      const fc = this.currentSession?.frameCount ?? 0;
      if (fc !== lastFrameCount) {
        lastFrameCount = fc;
        lastFrameAt = Date.now();
      }
    }, 1_000);

    await new Promise<void>((resolve) => {
      const progressInterval = setInterval(() => {
        const session = this.currentSession;
        if (!session) { clearInterval(progressInterval); resolve(); return; }

        const fc = session.frameCount;
        const elapsed = Math.round((Date.now() - session.startTime) / 1000);
        const msSinceLastFrame = Date.now() - lastFrameAt;

        // FFmpeg завершился досрочно с ошибкой — прерываем немедленно
        if (session.ffmpegExitCode !== null && session.isActive) {
          if (session.ffmpegExitCode !== 0) {
            abortReason = `FFmpeg завершился досрочно (код ${session.ffmpegExitCode})${session.ffmpegError ? ': ' + session.ffmpegError : ''}`;
            logger.error(`[WAIT] ❌ ${abortReason} — прерываем запись`);
          } else {
            logger.warn(`[WAIT] FFmpeg завершился досрочно (код 0, ${elapsed}s из ${Math.round(durationMs / 1000)}s) — возможно, истёк -t лимит`);
          }
          abortedEarly = true;
          clearInterval(progressInterval);
          clearInterval(stalledFrameTracker);
          resolve();
          return;
        }

        // 0 кадров за первые 2 минуты — CDPSession не захватывает
        if (fc === 0 && elapsed * 1000 >= NO_FRAMES_ABORT_MS) {
          abortReason = `CDPSession не прислал ни одного кадра за ${elapsed}s — страница не рендерится`;
          logger.error(`[WAIT] ❌ ${abortReason} — прерываем запись`);
          abortedEarly = true;
          clearInterval(progressInterval);
          clearInterval(stalledFrameTracker);
          resolve();
        } else if (fc === 0) {
          logger.warn(`[WAIT] ${elapsed}s прошло, 0 кадров — CDPSession ещё не начал захватывать`);
        } else if (fc > 0 && msSinceLastFrame > STALL_WARN_MS) {
          // Кадры шли, но остановились — браузер мог упасть
          const stallSec = Math.round(msSinceLastFrame / 1000);
          logger.warn(`[WAIT] ⚠️ Нет новых кадров уже ${stallSec}s (всего кадров: ${fc}) — CDPSession завис или браузер упал`);
        } else {
          logger.info(`[WAIT] Прогресс: ${elapsed}s, ${fc} кадров`);
        }
      }, 30_000);

      setTimeout(() => {
        clearInterval(progressInterval);
        clearInterval(stalledFrameTracker);
        resolve();
      }, durationMs);
    });

    const result = await this.stopRecording();

    // Досрочное прерывание — определяем успех по наличию кадров
    if (abortedEarly) {
      if (result.frameCount === 0) {
        return {
          ...result,
          success: false,
          error: abortReason || result.error || 'Запись прервана без единого кадра',
        };
      }
      // Есть кадры — видео сохранено частично, это не фатально
      logger.warn(`[WAIT] Досрочное завершение, но ${result.frameCount} кадров записано — загружаем частичный файл`);
    }

    return result;
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
      } catch (_e) {}
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
          logger.info(`FFmpeg completed successfully`);
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
    const isSigterm = session.ffmpegExitCode === null || session.ffmpegExitCode === 255;
    const ffmpegOk = session.ffmpegExitCode === 0 || (isSigterm && fileExists && session.frameCount > 0);
    const success = ffmpegOk && fileExists && session.frameCount > 0;

    const result = {
      filePath: session.outputPath,
      actualDuration,
      frameCount: session.frameCount,
      success,
      error: !success
        ? (session.ffmpegError || `FFmpeg exited with code ${session.ffmpegExitCode}, file exists: ${fileExists}, frames: ${session.frameCount}`)
        : undefined,
    };

    if (success) {
      logger.info(`Recording completed: ${session.outputPath}, frames: ${session.frameCount}, duration: ${actualDuration}ms`);
    } else {
      logger.error(`Recording failed: ${result.error}`);
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
    await this.audioSetup.cleanup();

    if (fs.existsSync(this.outputDir)) {
      const files = fs.readdirSync(this.outputDir);
      for (const file of files) {
        const filePath = path.join(this.outputDir, file);
        const stats = fs.statSync(filePath);
        const ageMs = Date.now() - stats.mtimeMs;

        if (ageMs > 24 * 60 * 60 * 1000) {
          fs.unlinkSync(filePath);
          logger.info(`Cleaned up old recording: ${file}`);
        }
      }
    }
  }

  async recordStream(options: {
    url: string;
    duration: number;
    title: string;
    taskId?: string;
    password?: string;
    onChunk?: (chunk: {
      partNumber: number;
      filePath: string;
      frameCount: number;
      durationMs: number;
      isFinal: boolean;
    }) => Promise<void>;
    chunkDurationMs?: number;
  }): Promise<string> {
    await this.initialize();

    const totalDurationMs = options.duration * 60 * 1000;
    const chunkDurationMs = options.chunkDurationMs ?? executorConfig.recording.maxPartDurationMs;
    const taskId = options.taskId || `task_${Date.now()}`;

    let partNumber = 1;
    let remainingMs = totalDurationMs;
    let lastFilePath = '';

    try {
      await this.navigateToStream(options.url, options.password);

      while (remainingMs > 0) {
        const thisChunkMs = Math.min(chunkDurationMs, remainingMs);
        const isFinal = thisChunkMs >= remainingMs;

        logger.info(`[CHUNK] Starting part ${partNumber} (${Math.round(thisChunkMs / 60000)} min, final=${isFinal})`);

        await this.startStreamingRecording(taskId, partNumber, thisChunkMs);
        const result = await this.waitForRecordingComplete(thisChunkMs);

        if (!result.success && result.frameCount === 0) {
          // Браузер упал, нет смысла продолжать
          throw new Error(result.error || `Part ${partNumber} recording failed with 0 frames`);
        }

        lastFilePath = result.filePath;

        if (options.onChunk && result.filePath) {
          try {
            await options.onChunk({
              partNumber,
              filePath: result.filePath,
              frameCount: result.frameCount,
              durationMs: result.actualDuration,
              isFinal,
            });
          } catch (chunkErr) {
            logger.error(`[CHUNK] onChunk error for part ${partNumber}:`, chunkErr);
            // не прерываем запись — продолжаем следующий чанк
          }
        }

        partNumber++;
        remainingMs -= thisChunkMs;

        // Если страница закрылась или браузер отвалился — выходим из цикла
        if (!this.page || this.page.isClosed() || !this.browser) {
          logger.warn('[CHUNK] Browser/page gone — stopping chunked recording early');
          break;
        }
      }
    } finally {
      await this.cleanup().catch((e) => {
        logger.warn('[recordStream] cleanup error (non-fatal):', e);
      });
    }

    return lastFilePath;
  }
}

