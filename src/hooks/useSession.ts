"use client";

/**
 * Session 管理 Hook (SESSION_EXPIRATION_FRONTEND_GUIDE.md)
 * 
 * 处理 session 过期的场景：
 * 1. WebSocket: 监听 'session_expired' 事件
 * 2. HTTP API: 检查 'X-Session-Status: expired' 响应头
 * 
 * 触发 session 过期的原因：
 * - 空闲超时: 用户超过 30 分钟无活动
 * - 绝对过期: Session 超过最大有效期（24 小时）
 * - 主动登出: 用户在其他设备登出
 * - 会话数量限制: 超过最大并发会话数（5 个）
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api/client';

// ============ 类型定义 ============

interface Session {
  id: string;
  session_token: string;
  device_type: string;
  started_at: string;
  last_activity_at: string;
  expires_at: string;
}

interface UseSessionReturn {
  /** Session 是否已过期 */
  isExpired: boolean;
  /** 是否正在刷新 session */
  isRefreshing: boolean;
  /** 过期消息 */
  expiredMessage: string | null;
  /** 刷新 session */
  refresh: () => Promise<boolean>;
  /** 清除过期状态（用于关闭提示后） */
  clearExpired: () => void;
}

// ============ Session 服务 ============

class SessionService {
  private sessionToken: string | null = null;
  private refreshPromise: Promise<Session | null> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.sessionToken = localStorage.getItem('deep_agents_session_token');
    }
  }

  /**
   * 获取当前 session token
   */
  getToken(): string | null {
    return this.sessionToken;
  }

  /**
   * 设置 session token
   */
  setToken(token: string | null): void {
    this.sessionToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('deep_agents_session_token', token);
      } else {
        localStorage.removeItem('deep_agents_session_token');
      }
    }
    // 同步到 apiClient
    apiClient.setSessionToken(token);
  }

  /**
   * 检测设备类型
   */
  private detectDeviceType(): string {
    if (typeof navigator === 'undefined') return 'web';
    const ua = navigator.userAgent;
    if (/mobile/i.test(ua)) return 'mobile';
    if (/tablet/i.test(ua)) return 'tablet';
    return 'web';
  }

  /**
   * 创建新 session
   */
  async createSession(): Promise<Session | null> {
    try {
      const response = await apiClient.post<Session>('/sessions', {
        device_type: this.detectDeviceType(),
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      });

      this.setToken(response.session_token);
      return response;
    } catch (error) {
      console.error('[SessionService] Failed to create session:', error);
      return null;
    }
  }

  /**
   * 刷新 session（防止重复刷新）
   */
  async refresh(): Promise<Session | null> {
    // 如果已经在刷新中，返回相同的 Promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefresh();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async doRefresh(): Promise<Session | null> {
    try {
      // 结束旧 session
      if (this.sessionToken) {
        await apiClient.delete('/sessions/current').catch(() => {
          // 忽略结束旧 session 的错误
        });
      }

      // 创建新 session
      return await this.createSession();
    } catch (error) {
      console.error('[SessionService] Failed to refresh session:', error);
      return null;
    }
  }

  /**
   * 结束当前 session
   */
  async endSession(): Promise<void> {
    if (this.sessionToken) {
      await apiClient.delete('/sessions/current').catch(() => {
        // 忽略错误
      });
    }
    this.setToken(null);
  }
}

// 单例
export const sessionService = new SessionService();

// ============ Hook ============

export function useSession(): UseSessionReturn {
  const [isExpired, setIsExpired] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expiredMessage, setExpiredMessage] = useState<string | null>(null);
  
  // 防止重复处理
  const isHandlingRef = useRef(false);

  useEffect(() => {
    const handleExpired = (event: Event) => {
      // 防止重复处理
      if (isHandlingRef.current || isExpired) {
        return;
      }
      
      const customEvent = event as CustomEvent<{ message?: string }>;
      const message = customEvent.detail?.message || 'Your session has expired. Please refresh to continue.';
      
      console.log('[useSession] Session expired:', message);
      setIsExpired(true);
      setExpiredMessage(message);
    };

    window.addEventListener('session:expired', handleExpired);
    return () => window.removeEventListener('session:expired', handleExpired);
  }, [isExpired]);

  const refresh = useCallback(async (): Promise<boolean> => {
    if (isRefreshing) {
      return false;
    }
    
    isHandlingRef.current = true;
    setIsRefreshing(true);
    
    try {
      const session = await sessionService.refresh();
      if (session) {
        setIsExpired(false);
        setExpiredMessage(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[useSession] Failed to refresh session:', error);
      return false;
    } finally {
      setIsRefreshing(false);
      isHandlingRef.current = false;
    }
  }, [isRefreshing]);

  const clearExpired = useCallback(() => {
    setIsExpired(false);
    setExpiredMessage(null);
  }, []);

  return {
    isExpired,
    isRefreshing,
    expiredMessage,
    refresh,
    clearExpired,
  };
}

export default useSession;
