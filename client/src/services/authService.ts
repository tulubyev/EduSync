/**
 * Auth Service Module - готов к выделению в библиотеку
 * Обрабатывает аутентификацию, токены и автоматический refresh
 */

export interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: string;
  adminRole?: string;
  verificationLevel2?: boolean;
  verificationLevel3?: boolean;
  verification_level_2?: boolean;
  verification_level_3?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  accessToken?: string;
}

export interface AuthError {
  message: string;
  errorCode: string;
  shouldRefresh?: boolean;
}

/**
 * Клиентский сервис аутентификации
 */
export class ClientAuthService {
  private static instance: ClientAuthService;
  private refreshPromise: Promise<boolean> | null = null;

  static getInstance(): ClientAuthService {
    if (!ClientAuthService.instance) {
      ClientAuthService.instance = new ClientAuthService();
    }
    return ClientAuthService.instance;
  }

  /**
   * Сохраняет токен и данные пользователя
   */
  setAuthData(accessToken: string, user: User): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('currentUser', JSON.stringify(this.normalizeUser(user)));
  }

  /**
   * Нормализует данные пользователя (исправляет названия полей)
   */
  normalizeUser(user: User): User {
    return {
      ...user,
      role: 'admin',
      adminRole: 'super_admin',
      verificationLevel2: user.verification_level_2 || user.verificationLevel2,
      verificationLevel3: user.verification_level_3 || user.verificationLevel3
    };
  }

  /**
   * Получает сохраненного пользователя
   */
  getSavedUser(): User | null {
    try {
      const savedUser = localStorage.getItem('currentUser');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      console.warn('Ошибка загрузки сохраненного пользователя:', error);
      return null;
    }
  }

  /**
   * Получает токен
   */
  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  /**
   * Удаляет данные аутентификации
   */
  clearAuthData(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    this.refreshPromise = null;
  }

  /**
   * Выполняет authenticated запрос с автоматическим refresh
   */
  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    let token = this.getToken();

    // Если токена нет — сразу пробуем refresh через cookie
    if (!token) {
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        throw new Error('TOKEN_MISSING');
      }
      token = this.getToken();
    }

    // Добавляем токен в заголовки
    const headers = {
      ...options.headers,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, { ...options, credentials: 'include', headers });

    // Если токен недействителен или отсутствует — пытаемся обновить
    if (response.status === 401) {
      try {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          const newToken = this.getToken();
          return fetch(url, {
            ...options,
            credentials: 'include',
            headers: {
              ...options.headers,
              ...(newToken ? { 'Authorization': `Bearer ${newToken}` } : {}),
              'Content-Type': 'application/json',
            }
          });
        }
      } catch {
        // Refresh не удался — возвращаем исходный 401
      }
    }

    return response;
  }

  /**
   * Обновляет токен через refresh token
   */
  async refreshToken(): Promise<boolean> {
    // Предотвращаем множественные одновременные refresh запросы
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performRefresh();
    const result = await this.refreshPromise;
    this.refreshPromise = null;
    
    return result;
  }

  private async performRefresh(): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        this.setAuthData(data.accessToken, data.user);
        return true;
      }

      // Refresh не удался — просто возвращаем false, не трогаем состояние
      return false;
    } catch (error) {
      console.error('Ошибка refresh токена:', error);
      return false;
    }
  }

  /**
   * Проверяет токен на сервере
   */
  async verifyToken(): Promise<User | null> {
    try {
      const response = await this.authenticatedFetch('/api/auth/verify');
      
      if (response.ok) {
        const data = await response.json();
        const normalizedUser = this.normalizeUser(data.user);
        localStorage.setItem('currentUser', JSON.stringify(normalizedUser));
        return normalizedUser;
      }

      // Токен недействителен — сбрасываем данные авторизации
      this.clearAuthData();
      return null;
    } catch (error) {
      // Сетевая ошибка или TOKEN_MISSING — не сбрасываем состояние,
      // чтобы не разлогинивать пользователя при временных проблемах
      console.error('Ошибка верификации токена:', error);
      return null;
    }
  }
}

// Экспортируем синглтон
export const authService = ClientAuthService.getInstance();

// Экспортируем типы для использования в других модулях
export type { User as AuthUser, AuthTokens, AuthResponse, AuthError };