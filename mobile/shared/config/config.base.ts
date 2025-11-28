/**
 * Base Configuration for My EPA Mobile App
 * Unified configuration shared between iOS and Android
 */

export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'https://api.myepa.ru',
  API_VERSION: 'v1',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

export const AUTH_CONFIG = {
  TOKEN_KEY: '@myepa:auth_token',
  REFRESH_TOKEN_KEY: '@myepa:refresh_token',
  USER_KEY: '@myepa:user',
  SESSION_TIMEOUT: 30 * 24 * 60 * 60 * 1000, // 30 days
  BIOMETRIC_ENABLED: true,
};

export const APP_CONFIG = {
  APP_NAME: 'My EPA',
  APP_VERSION: '1.0.0',
  BUILD_NUMBER: '1',
};

export const NOTIFICATION_CONFIG = {
  NOTIFICATION_CHANNEL_ID: 'myepa_channel',
  NOTIFICATION_CHANNEL_NAME: 'My EPA Notifications',
  NOTIFICATION_CHANNEL_DESCRIPTION: 'Notifications from My EPA',
  NOTIFICATION_COLOR: '#667eea',
};

export const DEEP_LINK_CONFIG = {
  URL_SCHEME: 'myepa://',
};

export const FEATURE_FLAGS = {
  ENABLE_BIOMETRIC_AUTHENTICATION: true,
  ENABLE_OFFLINE_MODE: true,
  ENABLE_PUSH_NOTIFICATIONS: true,
  ENABLE_ANALYTICS: true,
  ENABLE_CRASH_REPORTING: true,
  ENABLE_REDUX: true,
};

export const THEME_CONFIG = {
  PRIMARY_COLOR: '#667eea',
  SECONDARY_COLOR: '#764ba2',
  TEXT_COLOR: '#333333',
  BACKGROUND_COLOR: '#FFFFFF',
  ERROR_COLOR: '#F44336',
  SUCCESS_COLOR: '#4CAF50',
  WARNING_COLOR: '#FF9800',
  INFO_COLOR: '#2196F3',
  BORDER_RADIUS: 8,
};

export const STORAGE_CONFIG = {
  // SQLite cache settings
  CACHE_ENABLED: true,
  CACHE_EXPIRATION: 24 * 60 * 60 * 1000, // 24 hours
  MAX_CACHE_SIZE: 100 * 1024 * 1024, // 100 MB
};

export const OFFLINE_CONFIG = {
  ENABLED: true,
  MAX_QUEUE_SIZE: 1000,
  MAX_QUEUE_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days
  MAX_RETRIES: 5,
  SYNC_INTERVAL: 15 * 60 * 1000, // 15 minutes
};

export const ANALYTICS_CONFIG = {
  FIREBASE_ENABLED: true,
  CRASH_REPORTING_ENABLED: true,
  EVENT_BATCH_SIZE: 50,
  EVENT_UPLOAD_INTERVAL: 60 * 1000, // 1 minute
};

export default {
  API_CONFIG,
  AUTH_CONFIG,
  APP_CONFIG,
  NOTIFICATION_CONFIG,
  DEEP_LINK_CONFIG,
  FEATURE_FLAGS,
  THEME_CONFIG,
  STORAGE_CONFIG,
  OFFLINE_CONFIG,
  ANALYTICS_CONFIG,
};
