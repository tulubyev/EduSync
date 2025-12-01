import { apiRequest } from "./queryClient";
import { configService } from "../services/configService";
import type { 
  User, 
  AuthTokens,
  AiChatSession 
} from "../types";

// Helper to get endpoints from config with fallback
const getEndpoints = async (): Promise<any> => {
  try {
    const config = await configService.getConfig();
    return config.api.endpoints;
  } catch (error) {
    console.warn('Failed to load config endpoints, using fallback');
    return {
      auth: {
        register: '/api/auth/register',
        login: '/api/auth/login',
        refresh: '/api/auth/refresh',
        logout: '/api/auth/logout',
        gosuslugi: '/api/auth/gosuslugi',
        verify: '/api/auth/verify'
      },
      profile: {
        uploadImage: '/api/profile/upload-image'
      },
      verification: {
        sendSms: '/api/verification/send-sms',
        sendEmail: '/api/verification/send-email',
        verifySms: '/api/verification/verify-sms',
        verifyEmail: '/api/verification/verify-email'
      },
      ai: '/api/ai',
      esia: {
        auth: '/api/auth/esia'
      }
    };
  }
};

// Auth API
export const authAPI = {
  register: async (data: {
    email?: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
  }): Promise<{ user: User; accessToken: string }> => {
    const endpoints: any = await getEndpoints();
    const res = await apiRequest("POST", endpoints.auth.register, data);
    return await res.json();
  },

  login: async (identifier: string, password: string): Promise<{ user: User; accessToken: string }> => {
    const endpoints: any = await getEndpoints();
    const res = await apiRequest("POST", endpoints.auth.login, { identifier, password });
    return await res.json();
  },

  refreshToken: async (): Promise<{ accessToken: string; user: User }> => {
    const endpoints: any = await getEndpoints();
    const res = await apiRequest("POST", endpoints.auth.refresh);
    return await res.json();
  },

  logout: async (): Promise<void> => {
    const endpoints: any = await getEndpoints();
    await apiRequest("POST", endpoints.auth.logout);
  },

  gosuslugiAuth: async (code: string): Promise<{ user: User; accessToken: string }> => {
    const endpoints: any = await getEndpoints();
    const res = await apiRequest("POST", endpoints.auth.gosuslugi, { code });
    return await res.json();
  },
};


// AI API
export const aiAPI = {
  createChatSession: async (): Promise<AiChatSession> => {
    const res = await apiRequest("POST", "/api/ai/chat/session");
    return await res.json();
  },

  sendMessage: async (sessionId: string, message: string): Promise<{ reply: string }> => {
    const res = await apiRequest("POST", "/api/ai/chat/message", { sessionId, message });
    return await res.json();
  },

  getInsights: async (): Promise<{ insights: string }> => {
    const res = await apiRequest("GET", "/api/ai/insights");
    return await res.json();
  },

  getChatSessions: async (): Promise<AiChatSession[]> => {
    const res = await apiRequest("GET", "/api/ai/chat/sessions");
    return await res.json();
  },
};
