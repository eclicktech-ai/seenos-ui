"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { apiClient } from "@/lib/api/client";
import type { User, UserSettings, LoginResponse, ModelOption, ToolOption } from "@/app/types/types";

// ============ 类型定义 ============
interface AuthState {
  user: User | null;
  settings: UserSettings | null;
  token: string | null;
  sessionToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  /** 登录，返回包含 isAdmin 的用户信息 */
  login: (email: string, password: string) => Promise<User>;
  /** 注册 */
  register: (email: string, password: string, inviteCode: string, name?: string) => Promise<void>;
  /** 登出 */
  logout: () => Promise<void>;
  /** 更新用户设置 */
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  /** 更新用户资料（用户名等） */
  updateProfile: (data: { name?: string; avatar?: string }) => Promise<void>;
  /** 修改密码 */
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  /** 获取可用模型列表 */
  getAvailableModels: () => Promise<ModelOption[]>;
  /** 获取可用工具列表 */
  getAvailableTools: () => Promise<ToolOption[]>;
  /** 刷新用户信息 */
  refreshUser: () => Promise<void>;
}

// ============ 常量 ============
const TOKEN_KEY = "deep_agents_token";
const SESSION_TOKEN_KEY = "deep_agents_session_token";
const USER_KEY = "deep_agents_user";
const SETTINGS_KEY = "deep_agents_settings";

// ============ Context ============
const AuthContext = createContext<AuthContextValue | null>(null);

// ============ Provider ============
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    settings: null,
    token: null,
    sessionToken: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // 防止重复初始化的 ref
  const hasInitializedRef = useRef(false);
  const isInitializingRef = useRef(false);

  // 从本地存储恢复状态
  useEffect(() => {
    // 防止重复初始化（React Strict Mode 或组件重新挂载）
    if (hasInitializedRef.current || isInitializingRef.current) {
      console.log("[AuthProvider] Skipping init - already initialized");
      return;
    }

    console.log("[AuthProvider] Starting auth initialization...");
    const initAuth = async () => {
      isInitializingRef.current = true;
      
      try {
        const token = localStorage.getItem(TOKEN_KEY);
        const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
        const userJson = localStorage.getItem(USER_KEY);
        const settingsJson = localStorage.getItem(SETTINGS_KEY);

        if (token) {
          apiClient.setToken(token);
          apiClient.setSessionToken(sessionToken);
          // Sync token to cookie for server-side API routes
          document.cookie = `auth_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;

          // 尝试从本地存储恢复用户信息
          let user: User | null = null;
          let settings: UserSettings | null = null;

          if (userJson) {
            try {
              const parsed = JSON.parse(userJson);
              // 确保 isAdmin 字段存在，默认为 false
              user = { ...parsed, isAdmin: parsed.isAdmin ?? false };
            } catch {
              // 忽略解析错误
            }
          }

          if (settingsJson) {
            try {
              settings = JSON.parse(settingsJson);
            } catch {
              // 忽略解析错误
            }
          }

          // 先用本地存储的数据设置状态（包含 isAdmin）
          // 这样可以避免首次渲染时 isAdmin 为 undefined
          if (user && settings) {
            setState({
              user,
              settings,
              token,
              sessionToken,
              isLoading: true, // 仍然标记为 loading，等待 API 验证
              isAuthenticated: true,
            });
          }

          // 验证 token 并获取最新用户信息
          try {
            const response = await apiClient.get<{ user: User; settings: UserSettings; isAdmin?: boolean }>(
              "/auth/me"
            );
            // 将 isAdmin 合并到 user 对象中
            user = { ...response.user, isAdmin: response.isAdmin ?? false };
            settings = response.settings;

            // 更新本地存储（确保 isAdmin 被保存）
            localStorage.setItem(USER_KEY, JSON.stringify(user));
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

            // 标记初始化完成
            hasInitializedRef.current = true;

            setState({
              user,
              settings,
              token,
              sessionToken,
              isLoading: false,
              isAuthenticated: true,
            });
          } catch (error) {
            // Token 无效，清除本地存储
            console.warn("Token validation failed:", error);
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(SESSION_TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            localStorage.removeItem(SETTINGS_KEY);
            document.cookie = "auth_token=; path=/; max-age=0";
            apiClient.setToken(null);
            apiClient.setSessionToken(null);

            hasInitializedRef.current = true;

            setState({
              user: null,
              settings: null,
              token: null,
              sessionToken: null,
              isLoading: false,
              isAuthenticated: false,
            });
            return;
          }
        } else {
          hasInitializedRef.current = true;
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        hasInitializedRef.current = true;
        setState((prev) => ({ ...prev, isLoading: false }));
      } finally {
        isInitializingRef.current = false;
      }
    };

    initAuth();
  }, []);

  // 监听 settings-updated 事件，从 localStorage 重新加载设置
  // 这样当 SettingsContext 保存设置后，AuthProvider 的状态会自动同步
  useEffect(() => {
    const handleSettingsUpdated = () => {
      const settingsJson = localStorage.getItem(SETTINGS_KEY);
      if (settingsJson) {
        try {
          const settings = JSON.parse(settingsJson);
          setState((prev) => ({ ...prev, settings }));
        } catch {
          // 忽略解析错误
        }
      }
    };

    window.addEventListener("settings-updated", handleSettingsUpdated);
    return () => {
      window.removeEventListener("settings-updated", handleSettingsUpdated);
    };
  }, []);

  // 登录
  const login = useCallback(async (email: string, password: string): Promise<User> => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await apiClient.post<LoginResponse>("/auth/login", {
        email,
        password,
      });

      const { token, sessionToken, user } = response;

      // 设置 API 客户端 token（需要在调用 /auth/me 之前设置）
      apiClient.setToken(token);
      apiClient.setSessionToken(sessionToken ?? null);

      // 登录响应可能不包含完整信息（如 isAdmin），调用 /auth/me 获取完整数据
      // /auth/me 返回的 settings 更完整，包含 showTokenUsage 等字段
      let isAdmin = false;
      let settings = response.settings;
      try {
        const meResponse = await apiClient.get<{ user: User; settings: UserSettings; isAdmin?: boolean }>(
          "/auth/me"
        );
        isAdmin = meResponse.isAdmin ?? false;
        // 使用 /auth/me 返回的 settings，它包含更完整的字段
        settings = meResponse.settings;
      } catch (err) {
        console.warn('[AuthProvider] Failed to get data from /auth/me:', err);
      }

      // 将 isAdmin 合并到 user 对象中
      const userWithAdmin: User = { ...user, isAdmin };

      // 保存到本地存储
      localStorage.setItem(TOKEN_KEY, token);
      if (sessionToken) {
        localStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
      } else {
        localStorage.removeItem(SESSION_TOKEN_KEY);
      }
      localStorage.setItem(USER_KEY, JSON.stringify(userWithAdmin));
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      
      // Also store token in cookie for server-side API routes
      document.cookie = `auth_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;

      setState({
        user: userWithAdmin,
        settings,
        token,
        sessionToken: sessionToken ?? null,
        isLoading: false,
        isAuthenticated: true,
      });

      // 返回完整的用户信息（包含 isAdmin），供调用者立即使用
      return userWithAdmin;
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  // 注册（注册成功后不自动登录，需要用户手动登录）
  const register = useCallback(async (email: string, password: string, inviteCode: string, name?: string) => {
    // 调用注册 API，成功后返回，失败会抛出错误
    await apiClient.register({
      email,
      password,
      inviteCode,
      name,
    });
  }, []);

  // 登出
  const logout = useCallback(async () => {
    try {
      // 尝试调用后端登出接口
      await apiClient.post("/auth/logout").catch(() => {
        // 忽略登出 API 错误
      });
    } finally {
      // 清除本地存储
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(SESSION_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(SETTINGS_KEY);
      document.cookie = "auth_token=; path=/; max-age=0";

      // 清除 API 客户端 token
      apiClient.setToken(null);
      apiClient.setSessionToken(null);

      setState({
        user: null,
        settings: null,
        token: null,
        sessionToken: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  // 更新设置
  const updateSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
    try {
      const updated = await apiClient.put<UserSettings>("/settings", newSettings);

      // 更新本地存储
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));

      // 触发自定义事件，通知同一页面内的其他组件设置已更新
      window.dispatchEvent(new CustomEvent("settings-updated"));

      setState((prev) => ({ ...prev, settings: updated }));
    } catch (error) {
      console.error("Failed to update settings:", error);
      throw error;
    }
  }, []);

  // 获取可用模型
  const getAvailableModels = useCallback(async (): Promise<ModelOption[]> => {
    try {
      const response = await apiClient.get<{ models: ModelOption[] }>("/models");
      return response.models;
    } catch (error) {
      console.error("Failed to get models:", error);
      return [];
    }
  }, []);

  // 获取可用工具
  const getAvailableTools = useCallback(async (): Promise<ToolOption[]> => {
    try {
      const response = await apiClient.get<{ tools: ToolOption[] }>("/tools");
      return response.tools;
    } catch (error) {
      console.error("Failed to get tools:", error);
      return [];
    }
  }, []);

  // 刷新用户信息
  const refreshUser = useCallback(async () => {
    if (!state.token) return;

    try {
      const response = await apiClient.get<{ user: User; settings: UserSettings; isAdmin?: boolean }>(
        "/auth/me"
      );

      // 确保 isAdmin 被保留
      const userWithAdmin = { ...response.user, isAdmin: response.isAdmin ?? state.user?.isAdmin ?? false };

      localStorage.setItem(USER_KEY, JSON.stringify(userWithAdmin));
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(response.settings));

      setState((prev) => ({
        ...prev,
        user: userWithAdmin,
        settings: response.settings,
      }));
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  }, [state.token, state.user?.isAdmin]);

  // 更新用户资料
  const updateProfile = useCallback(async (data: { name?: string; avatar?: string }) => {
    try {
      const updatedUser = await apiClient.updateProfile(data);
      
      // 保留 isAdmin 字段，确保类型兼容
      const userWithAdmin: User = { 
        ...updatedUser, 
        name: updatedUser.name || '',
        avatar: updatedUser.avatar ?? undefined,
        isAdmin: state.user?.isAdmin ?? false 
      };
      
      // 更新本地存储
      localStorage.setItem(USER_KEY, JSON.stringify(userWithAdmin));

      setState((prev) => ({ ...prev, user: userWithAdmin }));
    } catch (error) {
      console.error("Failed to update profile:", error);
      throw error;
    }
  }, [state.user?.isAdmin]);

  // 修改密码
  const changePassword = useCallback(async (oldPassword: string, newPassword: string) => {
    try {
      await apiClient.changePassword(oldPassword, newPassword);
    } catch (error) {
      console.error("Failed to change password:", error);
      throw error;
    }
  }, []);

  // 构建 context value
  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      register,
      logout,
      updateSettings,
      updateProfile,
      changePassword,
      getAvailableModels,
      getAvailableTools,
      refreshUser,
    }),
    [state, login, register, logout, updateSettings, updateProfile, changePassword, getAvailableModels, getAvailableTools, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============ Hook ============
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

// ============ 辅助 Hook ============
/**
 * 获取当前用户
 */
export function useUser(): User | null {
  const { user } = useAuth();
  return user;
}

/**
 * 获取用户设置
 */
export function useUserSettings(): UserSettings | null {
  const { settings } = useAuth();
  return settings;
}

/**
 * 检查是否已认证
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}
