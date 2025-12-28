import { chromium, Browser, Page } from 'playwright';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

export class Recorder {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private ffmpegProcess: ChildProcess | null = null;

  async start(url: string, durationMin: number, outputPath: string) {
    this.browser = await chromium.launch({
      args: ['--disable-setuid-sandbox', '--no-sandbox'],
    });

    const context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
    });

    this.page = await context.newPage();
    await this.page.goto(url, { waitUntil: 'networkidle' });

    // Use CDP to capture screen
    const client = await this.page.context().newCDPSession(this.page);
    await client.send('Page.startScreencast', { format: 'jpeg', quality: 80 });

    const ffmpegArgs = [
      '-f', 'image2pipe',
      '-vcodec', 'mjpeg',
      '-i', '-',
      '-vcodec', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-threads', '0',
      '-f', 'mp4',
      '-movflags', 'frag_keyframe+empty_moov',
      outputPath
    ];

    this.ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

    client.on('Page.screencastFrame', ({ data, sessionId }) => {
      if (this.ffmpegProcess?.stdin) {
        this.ffmpegProcess.stdin.write(Buffer.from(data, 'base64'));
      }
      client.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    });

    console.log(`Started recording ${url} to ${outputPath}`);

    // Auto-stop after duration
    setTimeout(() => this.stop(), durationMin * 60 * 1000);
  }

  async stop() {
    if (this.ffmpegProcess) {
      this.ffmpegProcess.stdin?.end();
      this.ffmpegProcess = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
    console.log('Recording stopped');
  }
}