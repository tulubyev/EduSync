import { apiRequest } from "./queryClient";
import type { 
  User, 
  AuthTokens, 
  BankConnection, 
  Account, 
  Transaction, 
  SavingsGoal, 
  Budget, 
  DashboardStats, 
  SpendingCategory,
  AiChatSession 
} from "../types";

// Auth API
export const authAPI = {
  register: async (data: {
    email?: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
  }): Promise<{ user: User; accessToken: string }> => {
    const res = await apiRequest("POST", "/api/auth/register", data);
    return await res.json();
  },

  login: async (identifier: string, password: string): Promise<{ user: User; accessToken: string }> => {
    const res = await apiRequest("POST", "/api/auth/login", { identifier, password });
    return await res.json();
  },

  refreshToken: async (): Promise<{ accessToken: string; user: User }> => {
    const res = await apiRequest("POST", "/api/auth/refresh");
    return await res.json();
  },

  logout: async (): Promise<void> => {
    await apiRequest("POST", "/api/auth/logout");
  },

  gosuslugiAuth: async (code: string): Promise<{ user: User; accessToken: string }> => {
    const res = await apiRequest("POST", "/api/auth/gosuslugi", { code });
    return await res.json();
  },
};

// Dashboard API
export const dashboardAPI = {
  getStats: async (): Promise<DashboardStats> => {
    const res = await apiRequest("GET", "/api/dashboard/stats");
    return await res.json();
  },

  getSpendingCategories: async (): Promise<SpendingCategory[]> => {
    const res = await apiRequest("GET", "/api/dashboard/spending-categories");
    return await res.json();
  },
};

// Bank API
export const bankAPI = {
  getConnections: async (): Promise<BankConnection[]> => {
    const res = await apiRequest("GET", "/api/banks/connections");
    return await res.json();
  },

  initiateConnection: async (bankCode: string): Promise<{ redirectUrl: string; consentId: string }> => {
    const res = await apiRequest("POST", "/api/banks/connect", { bankCode });
    return await res.json();
  },

  handleOAuthCallback: async (consentId: string, authCode: string): Promise<{ success: boolean; connectionId: string }> => {
    const res = await apiRequest("POST", "/api/banks/oauth-callback", { consentId, authCode });
    return await res.json();
  },

  disconnectBank: async (connectionId: string): Promise<void> => {
    await apiRequest("DELETE", `/api/banks/connections/${connectionId}`);
  },
};

// Account API
export const accountAPI = {
  getAccounts: async (): Promise<Account[]> => {
    const res = await apiRequest("GET", "/api/accounts");
    return await res.json();
  },
};

// Transaction API
export const transactionAPI = {
  getTransactions: async (limit?: number): Promise<Transaction[]> => {
    const url = limit ? `/api/transactions?limit=${limit}` : "/api/transactions";
    const res = await apiRequest("GET", url);
    return await res.json();
  },
};

// Savings Goals API
export const savingsAPI = {
  getGoals: async (): Promise<SavingsGoal[]> => {
    const res = await apiRequest("GET", "/api/savings-goals");
    return await res.json();
  },

  createGoal: async (data: {
    name: string;
    description?: string;
    targetAmount: string;
    targetDate?: string;
  }): Promise<SavingsGoal> => {
    const res = await apiRequest("POST", "/api/savings-goals", data);
    return await res.json();
  },

  updateGoal: async (goalId: string, updates: Partial<SavingsGoal>): Promise<SavingsGoal> => {
    const res = await apiRequest("PATCH", `/api/savings-goals/${goalId}`, updates);
    return await res.json();
  },
};

// Budget API
export const budgetAPI = {
  getBudgets: async (month?: number, year?: number): Promise<Budget[]> => {
    let url = "/api/budgets";
    if (month && year) {
      url += `?month=${month}&year=${year}`;
    }
    const res = await apiRequest("GET", url);
    return await res.json();
  },

  createBudget: async (data: {
    category: string;
    monthlyLimit: string;
    month: number;
    year: number;
  }): Promise<Budget> => {
    const res = await apiRequest("POST", "/api/budgets", data);
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
