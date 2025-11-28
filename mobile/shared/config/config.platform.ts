/**
 * Platform-Specific Configuration for My EPA Mobile App
 * iOS and Android specific settings
 */

import { Platform } from 'react-native';

// ============= iOS Configuration =============
export const iOS_CONFIG = {
  MIN_VERSION: '12.0',
  APP_BUNDLE_ID: 'com.myepa.ios',
  APP_NAME: 'My EPA',
  PUSH_NOTIFICATION_ENTITLEMENT: true,
  FACE_ID_ENABLED: true,
  TOUCH_ID_ENABLED: true,
  KEYCHAIN_SERVICE: 'com.myepa.keychain',
  FONTS: {
    REGULAR: 'System',
    BOLD: 'System',
  },
};

// ============= Android Configuration =============
export const ANDROID_CONFIG = {
  MIN_API_VERSION: 21, // Android 5.0 (Lollipop)
  TARGET_API_VERSION: 34, // Android 14
  APP_PACKAGE_NAME: 'com.myepa.android',
  APP_NAME: 'My EPA',
  BIOMETRIC_ENABLED: true,
  MATERIAL_YOU: true, // Android 12+ Material Design 3
  FONTS: {
    REGULAR: 'Roboto-Regular',
    BOLD: 'Roboto-Bold',
  },
  NOTIFICATION_CHANNEL_IMPORTANCE: 4, // IMPORTANCE_HIGH
};

// ============= Dynamic URL Configuration =============
export function getApiBaseUrl(isDev: boolean = __DEV__): string {
  if (!isDev) {
    return 'https://api.myepa.ru';
  }

  // Development environment
  if (Platform.OS === 'ios') {
    // iOS simulator can use localhost directly
    return 'http://localhost:5000';
  } else if (Platform.OS === 'android') {
    // Android emulator needs special IP to reach host
    return 'http://10.0.2.2:5000';
  }

  return 'http://localhost:5000';
}

// ============= Platform-Specific Feature Flags =============
export const PLATFORM_FEATURES = {
  [Platform.OS]: Platform.OS === 'ios'
    ? {
      SUPPORTS_WIDGET: true,
      SUPPORTS_APP_CLIPS: true,
      SUPPORTS_HANDOFF: true,
      SUPPORTS_SIRI: true,
    }
    : {
      SUPPORTS_WIDGETS: true,
      SUPPORTS_SHORTCUTS: true,
      SUPPORTS_QUICK_SETTINGS: true,
      SUPPORTS_SPLIT_SCREEN: Platform.Version >= 24,
    },
};

// ============= Device Utilities =============
export const DEVICE_UTILS = {
  isIos: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
  iosVersion: Platform.OS === 'ios' ? parseFloat(Platform.Version) : 0,
  androidVersion: Platform.OS === 'android' ? Platform.Version : 0,
  hasNotch: Platform.OS === 'android' && Platform.Version >= 28,
};

// ============= Get Current Platform Config =============
export function getPlatformConfig() {
  return Platform.OS === 'ios' ? iOS_CONFIG : ANDROID_CONFIG;
}

export default {
  iOS_CONFIG,
  ANDROID_CONFIG,
  PLATFORM_FEATURES,
  DEVICE_UTILS,
  getApiBaseUrl,
  getPlatformConfig,
};
