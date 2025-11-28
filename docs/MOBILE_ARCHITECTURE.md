# Архитектура мобильного приложения My EPA
## Стратегия портирования на iOS и Android

**Дата:** Ноябрь 28, 2025  
**Статус:** Рекомендации для полной интеграции

---

## 1. ТЕКУЩЕЕ СОСТОЯНИЕ

### Существующая структура:
- **Framework:** React Native (кроссплатформенный)
- **UI Library:** React Navigation (стеки, вкладки)
- **Состояние:** AuthService, StorageService, OfflineService, PlatformService, AnalyticsService
- **Платформы:** iOS (12.0+), Android (5.0+, API 21+)

### Преимущества текущей архитектуры:
✅ Единая кодовая база для обеих платформ  
✅ Модульная система сервисов  
✅ Поддержка оффлайн режима  
✅ Настройка под каждую платформу (AppConfig.ts)  

---

## 2. РЕКОМЕНДАЦИИ ПО МОДИФИКАЦИИ ИНФРАСТРУКТУРЫ

### 2.1 Разделение конфигураций (ПРИОРИТЕТ: ВЫСОКИЙ)

**Проблема:** AppConfig в android/ и ios/ имеют дублирование кода  
**Решение:** Централизованная конфиг система

```typescript
// shared/config/config.base.ts - базовые конфигурации
export const API_CONFIG = {
  BASE_URL: process.env.API_BASE_URL || 'https://api.myepa.ru',
  API_VERSION: 'v1',
  TIMEOUT: 30000,
};

export const AUTH_CONFIG = {
  TOKEN_KEY: '@myepa:auth_token',
  REFRESH_TOKEN_KEY: '@myepa:refresh_token',
  SESSION_TIMEOUT: 30 * 24 * 60 * 60 * 1000,
};

// shared/config/config.platform.ts - платформо-специфичные
import { Platform } from 'react-native';

const PLATFORM_CONFIG = Platform.OS === 'ios' ? {
  MIN_VERSION: '12.0',
  APP_BUNDLE_ID: 'com.myepa.ios',
  NOTIFICATION_ENTITLEMENT: true,
} : {
  MIN_VERSION: 21, // API 21 = Android 5.0
  APP_PACKAGE_NAME: 'com.myepa.android',
  MATERIAL_YOU: true,
};
```

### 2.2 Унифицированный слой API (ПРИОРИТЕТ: ВЫСОКИЙ)

**Текущая проблема:** ApiService имеет hardcoded URL для эмуляторов  
**Решение:** Динамическое определение хоста

```typescript
// shared/services/api.service.ts
private getBaseUrl(): string {
  if (__DEV__) {
    if (Platform.OS === 'ios') {
      return 'http://localhost:5000'; // iOS simulator
    } else if (Platform.OS === 'android') {
      return 'http://10.0.2.2:5000'; // Android emulator
    }
  }
  return process.env.API_URL || 'https://api.myepa.ru';
}
```

### 2.3 Стратегия управления состоянием (ПРИОРИТЕТ: СРЕДНИЙ)

**Текущее:** AsyncStorage + listener pattern  
**Рекомендация:** Добавить Redux/MobX для масштабируемости

```
shared/state/
├── store.ts           // Redux store config
├── slices/
│   ├── auth.slice.ts
│   ├── courses.slice.ts
│   ├── deadlines.slice.ts
│   └── offline.slice.ts
└── middleware/
    └── persistMiddleware.ts
```

### 2.4 Система деревьев навигации (ПРИОРИТЕТ: СРЕДНИЙ)

**Текущее:** Единая стек-навигация  
**Рекомендация:** Bottom Tab Navigator для более интуитивного мобильного UX

```typescript
// mobile/navigation/RootNavigator.tsx
<Tab.Navigator screenOptions={tabOptions}>
  <Tab.Screen name="Dashboard" component={DashboardStack} />
  <Tab.Screen name="Courses" component={CoursesStack} />
  <Tab.Screen name="Deadlines" component={DeadlinesStack} />
  <Tab.Screen name="Notes" component={NotesStack} />
  <Tab.Screen name="More" component={MoreStack} /> {/* Settings, Profile */}
</Tab.Navigator>
```

---

## 3. СТРУКТУРА ПРОЕКТА (ЦЕЛЕВАЯ)

```
project-root/
├── web/                                  # Веб-приложение (React + TypeScript)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── App.tsx
│   └── package.json
│
├── mobile/                               # React Native (iOS + Android)
│   ├── app.json
│   ├── package.json
│   ├── tsconfig.json
│   ├── App.tsx
│   ├── ios/                              # iOS нативный код (Swift/Objective-C)
│   │   ├── Podfile
│   │   ├── MyEPA/
│   │   └── MyEPA.xcodeproj/
│   ├── android/                          # Android нативный код (Kotlin/Java)
│   │   ├── app/
│   │   │   ├── build.gradle
│   │   │   └── src/main/
│   │   └── build.gradle
│   ├── src/
│   │   ├── screens/
│   │   │   ├── auth/
│   │   │   ├── courses/
│   │   │   ├── deadlines/
│   │   │   ├── notes/
│   │   │   └── settings/
│   │   ├── components/
│   │   ├── navigation/
│   │   ├── state/
│   │   └── utils/
│   └── shared/
│       ├── services/
│       │   ├── api.service.ts
│       │   ├── auth.service.ts
│       │   ├── storage.service.ts
│       │   ├── offline.service.ts
│       │   ├── analytics.service.ts
│       │   ├── notification.service.ts
│       │   └── platform.service.ts
│       └── config/
│           ├── config.base.ts
│           └── config.platform.ts
│
├── server/                               # Express.js Backend
│   ├── services/
│   ├── routes/
│   ├── middleware/
│   └── index.ts
│
├── shared/                               # Общая схема для всех приложений
│   ├── schema.ts
│   ├── types.ts
│   └── constants.ts
│
└── package.json (monorepo)
```

---

## 4. НАТИВНАЯ ИНТЕГРАЦИЯ

### 4.1 iOS (Swift)

```swift
// ios/MyEPA/AppDelegate.swift
import UIKit
import FirebaseCore
import UserNotifications

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
  
  func application(_ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    
    // Firebase setup
    FirebaseApp.configure()
    
    // Push notifications
    UNUserNotificationCenter.current().delegate = self
    UNUserNotificationCenter.current()
      .requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
        DispatchQueue.main.async {
          UIApplication.shared.registerForRemoteNotifications()
        }
      }
    
    return true
  }
}
```

### 4.2 Android (Kotlin)

```kotlin
// android/app/src/main/kotlin/com/myepa/MainActivity.kt
package com.myepa

import android.os.Build
import android.app.NotificationChannel
import android.app.NotificationManager
import com.facebook.react.ReactActivity

class MainActivity : ReactActivity() {
  override fun getMainComponentName(): String = "MyEPA"
  
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setupNotificationChannels()
  }
  
  private fun setupNotificationChannels() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        "edu_aggregator_channel",
        "My EPA Notifications",
        NotificationManager.IMPORTANCE_HIGH
      )
      val manager = getSystemService(NotificationManager::class.java)
      manager.createNotificationChannel(channel)
    }
  }
}
```

---

## 5. КРИТИЧЕСКИЕ УЛУЧШЕНИЯ

### 5.1 Безопасность (ПРИОРИТЕТ: КРИТИЧЕСКИЙ)

- [ ] Использовать **Secure Storage** вместо AsyncStorage для токенов
  - iOS: Keychain (react-native-keychain)
  - Android: EncryptedSharedPreferences

```typescript
// shared/services/secure-storage.service.ts
import * as Keychain from 'react-native-keychain';

export class SecureStorageService {
  async setToken(token: string): Promise<void> {
    await Keychain.setGenericPassword('myepa_token', token);
  }
  
  async getToken(): Promise<string | null> {
    const credentials = await Keychain.getGenericPassword();
    return credentials ? credentials.password : null;
  }
}
```

### 5.2 Оффлайн режим (ПРИОРИТЕТ: ВЫСОКИЙ)

- [ ] SQLite для локального кеша (не только AsyncStorage)
  - Используй **react-native-sqlite-storage** или **WatermelonDB**
  - Синхронизация при восстановлении сети

### 5.3 Производительность (ПРИОРИТЕТ: ВЫСОКИЙ)

- [ ] Ленивая загрузка экранов
- [ ] Виртуализация больших списков (FlatList с removeClippedSubviews)
- [ ] Оптимизация образов (react-native-fast-image)

### 5.4 Мониторинг (ПРИОРИТЕТ: СРЕДНИЙ)

- [ ] Firebase Crashlytics для отслеживания ошибок
- [ ] Firebase Analytics для аналитики
- [ ] Sentry для мониторинга производительности

---

## 6. МИГРАЦИЯ ДАННЫХ И СИНХРОНИЗАЦИЯ

### 6.1 Синхронизация между Web и Mobile

```typescript
// shared/services/sync.service.ts
export class SyncService {
  /**
   * Синхронизирует данные между веб и мобилью
   */
  async syncUserData(): Promise<void> {
    // 1. Загрузить данные с бэкенда
    const remoteData = await this.apiService.get('/sync');
    
    // 2. Сравнить с локальными данными
    const localData = await this.storageService.getUserData();
    
    // 3. Объединить (remote wins для конфликтов)
    const merged = this.mergeData(localData, remoteData);
    
    // 4. Сохранить локально
    await this.storageService.saveUserData(merged);
    
    // 5. Обновить UI
    this.notifySync();
  }
}
```

---

## 7. CI/CD ПАЙПЛАЙН ДЛЯ МОБИЛЯ

### 7.1 Структура GitHub Actions

```yaml
# .github/workflows/mobile-build.yml
name: Mobile Build & Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd mobile && npm install
      - run: cd mobile && npm run build:ios
      
  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - uses: actions/setup-java@v3
      - run: cd mobile && npm install
      - run: cd mobile && npm run build:android
      
  deploy-testflight:
    needs: build-ios
    if: github.ref == 'refs/heads/main'
    runs-on: macos-latest
    steps:
      - run: cd mobile/ios && fastlane beta
      
  deploy-play-store:
    needs: build-android
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: cd mobile/android && fastlane beta
```

---

## 8. ROADMAP ИМПЛЕМЕНТАЦИИ

### Фаза 1: Базовая инфраструктура (2-3 недели)
- [x] Унифицировать конфигурации
- [ ] Добавить Redux/state management
- [ ] Реализовать secure storage для токенов
- [ ] Добавить Firebase

### Фаза 2: Оптимизация (1-2 недели)
- [ ] Внедрить SQLite кеш
- [ ] Оптимизировать производительность
- [ ] Настроить bottom tab navigation
- [ ] Добавить analytics

### Фаза 3: Тестирование и деплой (1 неделя)
- [ ] Настроить CI/CD
- [ ] Beta тестирование (TestFlight + Google Play Beta)
- [ ] Подготовка к App Store + Google Play
- [ ] Production release

---

## 9. ТЕХНОЛОГИЧЕСКИЙ СТЕК

| Компонент | iOS | Android | Оба |
|-----------|-----|---------|------|
| **Framework** | - | - | React Native |
| **Navigation** | - | - | React Navigation |
| **State** | - | - | Redux / MobX |
| **Storage** | Keychain | KeyStore | react-native-keychain |
| **Database** | SQLite | SQLite | WatermelonDB |
| **Analytics** | - | - | Firebase Analytics |
| **Crash Report** | - | - | Firebase Crashlytics |
| **Push Notif** | APNs | FCM | Firebase Cloud Messaging |
| **Build Tool** | Xcode | Gradle | Fastlane + GitHub Actions |

---

## 10. ПРИЛОЖЕНИЕ: ФАЙЛЫ КОНФИГУРАЦИИ

### mobile/package.json (новые зависимости)

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-native": "^0.73.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/bottom-tabs": "^6.5.0",
    "@redux-devtools/extension": "^3.2.5",
    "redux": "^4.2.1",
    "react-redux": "^8.1.3",
    "redux-thunk": "^2.4.2",
    "@react-native-async-storage/async-storage": "^1.21.0",
    "react-native-keychain": "^8.1.1",
    "firebase": "^10.7.0",
    "react-native-firebase": "^18.0.0",
    "react-native-sqlite-storage": "^6.0.1",
    "react-native-fast-image": "^8.6.3",
    "axios": "^1.6.2"
  },
  "devDependencies": {
    "@react-native/metro-config": "^0.73.0",
    "@types/react-native": "^0.73.0",
    "typescript": "^5.3.0",
    "fastlane": "^2.220.0"
  }
}
```

---

## ИТОГОВЫЕ РЕКОМЕНДАЦИИ

✅ **Используйте текущую структуру** - это хороший старт  
✅ **Приоритет:** Унифицировать конфиги → Добавить redux → Secure storage  
✅ **iOS и Android** идеально подходят для React Native текущей архитектуры  
⚠️ **Важно:** Перед каждым релизом - тестировать оффлайн режим и синхронизацию  

Готовы начать имплементацию первой фазы!
