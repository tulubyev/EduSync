// Recording Worker Configuration
// Loads environment variables and validates configuration

import dotenv from 'dotenv';

dotenv.config();

interface Config {
  // Database
  database: {
    url: string;
  };

  // Worker
  worker: {
    id: string;
    pollInterval: number; // milliseconds
    maxConcurrentTasks: number;
    heartbeatInterval: number; // milliseconds
    taskTimeout: number; // milliseconds
  };

  // Recording
  recording: {
    maxPartDuration: number; // minutes
    browser: {
      headless: boolean;
      timeout: number; // milliseconds
    };
    audioCodec: string; // aac, mp3, opus, etc.
    audioSampleRate: number; // Hz
    audioBitrate: string; // e.g., "192k"
  };

  // Storage - Beget S3
  beget: {
    endpoint: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    region: string;
  };

  // Logging
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
  };

  // Paths
  paths: {
    temp: string; // temporary storage for recording chunks
    logs: string; // log file directory
  };
}

function validateConfig(): Config {
  const requiredVars = [
    'DATABASE_URL',
    'WORKER_ID',
    'BEGET_S3_ENDPOINT',
    'BEGET_S3_ACCESS_KEY',
    'BEGET_S3_SECRET_KEY',
    'BEGET_S3_BUCKET',
  ];

  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  return {
    database: {
      url: process.env.DATABASE_URL!,
    },

    worker: {
      id: process.env.WORKER_ID || `worker-${Date.now()}`,
      pollInterval: parseInt(process.env.WORKER_POLL_INTERVAL || '5000'),
      maxConcurrentTasks: parseInt(process.env.WORKER_MAX_CONCURRENT || '2'),
      heartbeatInterval: parseInt(process.env.WORKER_HEARTBEAT_INTERVAL || '30000'),
      taskTimeout: parseInt(process.env.WORKER_TASK_TIMEOUT || '3600000'), // 1 hour default
    },

    recording: {
      maxPartDuration: parseInt(process.env.RECORDING_MAX_PART_DURATION || '20'),
      browser: {
        headless: process.env.BROWSER_HEADLESS !== 'false',
        timeout: parseInt(process.env.BROWSER_TIMEOUT || '30000'),
      },
      audioCodec: process.env.AUDIO_CODEC || 'aac',
      audioSampleRate: parseInt(process.env.AUDIO_SAMPLE_RATE || '48000'),
      audioBitrate: process.env.AUDIO_BITRATE || '192k',
    },

    beget: {
      endpoint: process.env.BEGET_S3_ENDPOINT!,
      accessKeyId: process.env.BEGET_S3_ACCESS_KEY!,
      secretAccessKey: process.env.BEGET_S3_SECRET_KEY!,
      bucket: process.env.BEGET_S3_BUCKET!,
      region: process.env.BEGET_S3_REGION || 'us-east-1',
    },

    logging: {
      level: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
      format: (process.env.LOG_FORMAT || 'json') as 'json' | 'text',
    },

    paths: {
      temp: process.env.TEMP_DIR || '/tmp/recording-worker',
      logs: process.env.LOGS_DIR || '/var/log/recording-worker',
    },
  };
}

export const config: Config = validateConfig();
