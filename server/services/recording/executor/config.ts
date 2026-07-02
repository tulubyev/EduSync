import { execSync } from 'child_process';

function detectChromiumPath(): string | undefined {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  }
  try {
    const path = execSync('which chromium || which chromium-browser || which google-chrome', {
      encoding: 'utf-8',
    }).trim().split('\n')[0];
    if (path) return path;
  } catch (_) {}
  return undefined;
}

export const executorConfig = {
  beget: {
    endpoint: process.env.BEGET_S3_ENDPOINT || 'https://s3.ru1.storage.beget.cloud',
    region: process.env.BEGET_S3_REGION || 'us-east-1',
    bucket: process.env.BEGET_S3_BUCKET || '',
    accessKeyId: process.env.BEGET_S3_ACCESS_KEY || process.env.BEGET_S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.BEGET_S3_SECRET_KEY || process.env.BEGET_S3_SECRET_ACCESS_KEY || '',
    publicUrl: process.env.BEGET_S3_PUBLIC_URL || '',
  },
  worker: {
    id: process.env.WORKER_ID || 'epa-worker-1',
    maxWorkers: Math.max(1, Math.min(8, parseInt(process.env.MAX_WORKERS || '1', 10))),
    pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '5000', 10),
    heartbeatIntervalMs: parseInt(process.env.HEARTBEAT_INTERVAL_MS || '30000', 10),
    heartbeatTimeoutMs: parseInt(process.env.HEARTBEAT_TIMEOUT_MS || '600000', 10),
    scheduledTimeTzOffsetH: parseInt(process.env.SCHEDULED_TIME_TZ_OFFSET_H || '0', 10),
  },
  recording: {
    outputDir: process.env.RECORDINGS_DIR || '/tmp/recordings',
    maxPartDurationMs: parseInt(process.env.MAX_PART_DURATION_MS || '1200000', 10),
    frameRate: parseInt(process.env.FRAME_RATE || '15', 10),
    viewport: {
      width: parseInt(process.env.VIEWPORT_WIDTH || '1920', 10),
      height: parseInt(process.env.VIEWPORT_HEIGHT || '1080', 10),
    },
  },
  chromium: {
    executablePath: detectChromiumPath(),
    headless: process.env.CHROMIUM_HEADLESS !== 'false',
  },
};
