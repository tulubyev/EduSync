/**
 * Logger Service - Conditional logging based on LOG_LEVEL
 * Format: [ISO timestamp] <emoji> message
 * Matches the style of the legacy EPA Recording Worker for consistency.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const getCurrentLevel = (): number => {
  const level = (process.env.LOG_LEVEL as LogLevel) || 'info';
  return LOG_LEVELS[level] ?? LOG_LEVELS.info;
};

const shouldLog = (level: LogLevel): boolean =>
  LOG_LEVELS[level] >= getCurrentLevel();

const ts = () => `[${new Date().toISOString()}]`;

export const logger = {
  debug: (message: string, data?: any) => {
    if (shouldLog('debug')) {
      console.log(`${ts()} 🔍 ${message}`, data !== undefined ? data : '');
    }
  },

  info: (message: string, data?: any) => {
    if (shouldLog('info')) {
      console.log(`${ts()} ℹ️  ${message}`, data !== undefined ? data : '');
    }
  },

  warn: (message: string, data?: any) => {
    if (shouldLog('warn')) {
      console.warn(`${ts()} ⚠️  ${message}`, data !== undefined ? data : '');
    }
  },

  error: (message: string, error?: any) => {
    if (shouldLog('error')) {
      console.error(`${ts()} ❌ ${message}`, error !== undefined ? error : '');
    }
  },

  success: (message: string, data?: any) => {
    if (shouldLog('info')) {
      console.log(`${ts()} ✅ ${message}`, data !== undefined ? data : '');
    }
  },
};
