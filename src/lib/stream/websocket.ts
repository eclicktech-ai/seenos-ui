/**
 * SeenOS WebSocket 流式连接管理 (优化版)
 * 基于 FRONTEND_API_GUIDE.md 实现
 * 
 * 连接地址: ws://localhost:8000/ws/chat?cid={conversation_id}&token={jwt_token}&session_id={session_token}
 * 
 * 优化特性:
 * - 支持预连接（先连接，后绑定 cid）
 * - 支持动态切换 cid
 * - 消息队列缓冲
 * - 自动重连（最多 5 次，指数退避）
 * - 心跳保活（30 秒）
 */

import type { StreamEvent } from '@/app/types/types';

// ============ 类型定义 ============

/** 重连状态 */
export type ReconnectStatus = 'idle' | 'reconnecting' | 'failed' | 'max_attempts_reached';

/** 连接状态 (基于 STRUCTURED_CONTENT_FRONTEND_GUIDE.md) */
export type ConnectionState =
  | 'disconnected'     // 未连接
  | 'connecting'       // 连接中
  | 'connected'        // 已连接
  | 'reconnecting'     // 重连中
  | 'server_restarting' // 服务器正在重启（健康检查失败）
  | 'kicked'           // 被其他连接踢掉（不应自动重连）
  | 'failed';          // 连接失败（达到最大重试次数或被禁止）

/** WebSocket 关闭码 (基于 STRUCTURED_CONTENT_FRONTEND_GUIDE.md) */
export const WS_CLOSE_CODES = {
  NORMAL: 1000,              // 正常关闭
  AUTH_FAILED: 4001,         // 认证失败
  SESSION_REPLACED: 4002,    // 被其他连接踢掉（新会话替换）
  ACCOUNT_BANNED: 4003,      // 账号被封禁
  CONFIG_CHANGED: 4004,      // 配置变更
  RATE_LIMITED: 4429,        // 连接频率限制 (HTTP 429 对应)
} as const;

/** 客户端消息类型 */
export type ClientMessageType =
  | 'user_message'
  | 'resume_interrupt'
  | 'stop'
  | 'ping'
  | 'bind_cid'       // 动态绑定 cid
  | 'retry_message'  // 新增：重试失败的消息 (WEBSOCKET_FRONTEND_GUIDE.md)
  // Block Editor 事件
  | 'editor.content_update'   // 内容更新（触发预览刷新）
  | 'editor.request_preview'; // 请求完整预览

/** 服务端消息类型 (基于 WEBSOCKET_FRONTEND_GUIDE.md & STRUCTURED_CONTENT_FRONTEND_GUIDE.md) */
export type ServerMessageType =
  | 'connected'
  | 'state_update'        // 完整会话状态（连接后推送）
  | 'state'               // 兼容：FRONTEND_API_GUIDE.md 初始状态
  | 'message_start'       // 新消息开始
  | 'message_delta'       // 流式内容增量
  | 'message_end'         // 消息结束
  | 'tool_call_start'     // 工具调用开始
  | 'tool_call_result'    // 工具调用结果
  | 'subagent_start'      // 子代理开始
  | 'subagent_end'        // 子代理结束
  | 'todos_update'        // FRONEND_API_GUIDE.md
  | 'todos_updated'       // Todos 更新
  | 'file_operation'      // 文件操作
  | 'retry_started'       // 新增：重试开始 (WEBSOCKET_FRONTEND_GUIDE.md)
  // 进度通知事件 (PROGRESS_EVENTS_FRONTEND_GUIDE.md)
  | 'tool_progress'       // 工具执行进度（长时间运行工具）
  | 'tool_retry'          // 工具网络重试
  | 'model_retry'         // LLM 模型调用重试
  | 'error'               // 错误
  | 'done'                // 请求完成
  | 'pong'                // 心跳响应
  // 连接管理事件 (STRUCTURED_CONTENT_FRONTEND_GUIDE.md & SESSION_EXPIRATION_FRONTEND_GUIDE.md)
  | 'session_replaced'    // 被其他连接踢掉
  | 'session_expired'     // Session 过期
  | 'force_logout'        // 强制登出
  | 'rate_limited'        // 连接频率限制
  // Block Editor 事件
  | 'editor.preview_update'       // 预览更新
  | 'editor.generation_progress'  // AI 生成进度
  | 'editor.content_saved';       // 内容保存确认

/** 客户端消息 */
export interface ClientMessage<T = unknown> {
  type: ClientMessageType;
  data?: T;
  timestamp?: number;
}

/** 附件引用类型 (IMAGE_UPLOAD_FRONTEND_GUIDE.md) */
export interface MessageAttachmentRef {
  type: 'image' | 'file';
  s3Key: string;
  mimeType: string;
  purpose?: 'reference_image' | 'context' | 'other';
  attachmentId?: string;  // 新增：附件 ID
  publicUrl?: string;     // 新增：公开访问 URL
}

/** 用户消息数据 */
export interface UserMessageData {
  content: string;
  attachments?: MessageAttachmentRef[];
  attachmentIds?: string[]; // 新增：直接发送附件 ID 列表
}

/** 恢复中断数据 */
export interface ResumeInterruptData {
  interruptId: string;
  decision: InterruptDecision;
}

/** 中断决策 */
export interface InterruptDecision {
  action: 'approve' | 'reject' | 'modify';
  reason?: string | null;
  modifiedArgs?: Record<string, unknown> | null;
}

/** 重试消息数据 (WEBSOCKET_FRONTEND_GUIDE.md) */
export interface RetryMessageData {
  turn_id: string;  // The ID of the failed turn to retry
}

/** WebSocket 错误 */
export interface WSError {
  code: string;
  message: string;
}

type EventHandler = (event: StreamEvent) => void;

/** 最大重连次数到达事件数据 */
export interface MaxReconnectReachedData {
  attempts: number;
  canManualRetry: boolean;
}

/** WebSocket 连接选项 */
interface WebSocketStreamOptions {
  /** WebSocket URL (不含查询参数) */
  url: string;
  /** 认证 token */
  token: string;
  /** 会话 token（用于在线时长统计） */
  sessionToken?: string;
  /** 会话 ID (可选，支持后续绑定) */
  cid?: string | null;
  /** 事件处理回调 */
  onEvent: EventHandler;
  /** 连接成功回调 */
  onConnect?: () => void;
  /** 断开连接回调 */
  onDisconnect?: (code?: number, reason?: string) => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
  /** 重连状态变化回调 */
  onReconnectStatusChange?: (status: ReconnectStatus, attempt: number, maxAttempts: number) => void;
  /** 连接状态变化回调 */
  onConnectionStateChange?: (state: ConnectionState) => void;
  /** 服务器不可用回调（健康检查失败） */
  onServerUnavailable?: () => void;
  /** 达到最大重连次数回调 */
  onMaxReconnectReached?: (data: MaxReconnectReachedData) => void;
}

// ============ 消息队列 ============

interface QueuedMessage {
  message: ClientMessage;
  resolve: () => void;
  reject: (error: Error) => void;
}

// ============ WebSocket 流式连接类 ============

export class WebSocketStream {
  private ws: WebSocket | null = null;
  private options: WebSocketStreamOptions;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isManualClose = false;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private connectionState: ConnectionState = 'disconnected';

  // 当前绑定的 cid
  private currentCid: string | null = null;

  // 消息队列：在连接建立前缓存消息
  private messageQueue: QueuedMessage[] = [];

  // 是否已收到服务端的 connected 确认
  private isServerReady = false;

  // 是否正在卸载（页面刷新/关闭）
  private isUnloading = false;

  // 是否已触发过错误（避免重复触发）
  private hasErrored = false;

  // 是否被其他连接踢掉（不应自动重连）
  private isKicked = false;

  // 连接超时定时器
  private connectTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly connectTimeoutMs = 10000; // 10 秒连接超时

  // 最大重连延迟 (ms)
  private readonly maxReconnectDelay = 30000;

  // 健康检查超时 (ms)
  private readonly healthCheckTimeout = 3000;

  // 服务器不可用时的额外延迟 (ms)
  private serverUnavailableDelay = 2000;

  // 是否服务器不可用（健康检查失败）
  private isServerUnavailable = false;

  constructor(options: WebSocketStreamOptions) {
    this.options = options;
    this.currentCid = options.cid || null;

    // 监听页面卸载事件
    if (typeof window !== 'undefined') {
      this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
      window.addEventListener('beforeunload', this.handleBeforeUnload);
    }
  }

  /**
   * 处理页面卸载
   */
  private handleBeforeUnload(): void {
    this.isUnloading = true;
    // 静默关闭连接，不触发重连
    this.isManualClose = true;
    if (this.ws) {
      this.ws.close(WS_CLOSE_CODES.NORMAL, 'Page unloading');
    }
  }

  /**
   * 获取当前连接状态
   */
  get state(): ConnectionState {
    return this.connectionState;
  }

  /**
   * 获取当前 cid
   */
  get cid(): string | null {
    return this.currentCid;
  }

  /**
   * 是否已连接且就绪
   */
  get isReady(): boolean {
    return this.connectionState === 'connected' && this.isServerReady;
  }

  /**
   * 是否被其他连接踢掉
   */
  get wasKicked(): boolean {
    return this.isKicked;
  }

  /**
   * 从 WebSocket URL 获取 HTTP 基础 URL（不含 /api 前缀）
   * ws://localhost:8000/ws/chat -> http://localhost:8000
   * wss://api.example.com/ws/chat -> https://api.example.com
   */
  private getHttpBaseUrl(): string {
    const wsUrl = this.options.url;
    return wsUrl
      .replace(/^wss:/, 'https:')
      .replace(/^ws:/, 'http:')
      .replace(/\/ws\/chat$/, '');
  }

  /**
   * 检查服务器健康状态
   * 用于重连前检测后端是否可用
   * 健康检查端点: /health (不带 /api 前缀)
   */
  private async checkServerHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.healthCheckTimeout);

      const response = await fetch(`${this.getHttpBaseUrl()}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 更新连接状态
   */
  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.options.onConnectionStateChange?.(state);
    }
  }

  /**
   * 建立 WebSocket 连接
   */
  connect(cid?: string): void {
    // 如果页面正在卸载，不建立新连接
    if (this.isUnloading) {
      console.log('[WebSocket] Page is unloading, skip connect');
      return;
    }

    // 检查是否需要绑定新的 cid
    const previousCid = this.currentCid;
    if (cid) {
      this.currentCid = cid;
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      console.warn('[WebSocket] Already connected');
      // 如果已连接但 cid 变了，发送 bind_cid 消息
      if (cid && cid !== previousCid) {
        this.bindCid(cid);
      }
      return;
    }

    if (this.ws?.readyState === WebSocket.CONNECTING) {
      console.warn('[WebSocket] Connection already in progress');
      return;
    }

    const { url, token, sessionToken } = this.options;

    // 构建 URL，cid 可选
    let wsUrl = `${url}?token=${encodeURIComponent(token)}`;
    if (this.currentCid) {
      wsUrl += `&cid=${encodeURIComponent(this.currentCid)}`;
    }
    if (sessionToken) {
      wsUrl += `&session_id=${encodeURIComponent(sessionToken)}`;
    }

    console.log('[WebSocket] Connecting to:', wsUrl.replace(/token=[^&]+/, 'token=***'));
    this.setConnectionState('connecting');
    this.hasErrored = false; // 重置错误标志

    try {
      this.ws = new WebSocket(wsUrl);
      this.isManualClose = false;
      this.isServerReady = false;
      this.setupEventHandlers();

      // 设置连接超时
      this.connectTimeout = setTimeout(() => {
        if (this.connectionState === 'connecting') {
          console.error('[WebSocket] Connection timeout');
          this.setConnectionState('disconnected');
          this.options.onError?.(new Error('WebSocket connection timeout'));
          // 关闭连接
          if (this.ws) {
            this.ws.close();
            this.ws = null;
          }
        }
      }, this.connectTimeoutMs);
    } catch (error) {
      console.error('[WebSocket] Failed to create connection:', error);
      this.setConnectionState('disconnected');
      this.options.onError?.(error instanceof Error ? error : new Error('Failed to create WebSocket'));
    }
  }

  /**
   * 动态绑定 cid（用于切换会话场景）
   * 发送 bind_cid 消息，不等待确认，直接标记为就绪
   */
  bindCid(cid: string): void {
    const previousCid = this.currentCid;
    this.currentCid = cid;

    if (this.ws?.readyState === WebSocket.OPEN) {
      // 只有 cid 真的变化了才发送
      if (cid !== previousCid) {
        console.log('[WebSocket] Binding cid:', cid);
        try {
          this.sendImmediate({ type: 'bind_cid', data: { cid } });
        } catch (error) {
          console.error('[WebSocket] Failed to send bind_cid:', error);
        }
      }
      // 直接标记为就绪，不等待确认
      this.isServerReady = true;
      this.flushMessageQueue();
    } else {
      console.log('[WebSocket] Will bind cid after connection:', cid);
    }
  }

  /**
   * 设置 WebSocket 事件处理器
   */
  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('[WebSocket] Connected successfully');

      // 清除连接超时定时器
      if (this.connectTimeout) {
        clearTimeout(this.connectTimeout);
        this.connectTimeout = null;
      }

      this.reconnectAttempts = 0;
      this.setConnectionState('connected');
      this.options.onReconnectStatusChange?.('idle', 0, this.maxReconnectAttempts);
      this.startHeartbeat();

      // 连接成功后，短暂等待服务端确认，如果没有收到则直接标记为就绪
      setTimeout(() => {
        if (!this.isServerReady && this.connectionState === 'connected') {
          console.log('[WebSocket] No server confirmation, assuming ready');
          this.isServerReady = true;
          this.options.onConnect?.();
          this.flushMessageQueue();
        }
      }, 200);
    };

    this.ws.onmessage = (event) => {
      try {
        const message: StreamEvent = JSON.parse(event.data);
        if (!message.timestamp) {
          message.timestamp = Date.now();
        }
        this.handleMessage(message);
      } catch (e) {
        console.error('[WebSocket] Failed to parse message:', e, event.data);
      }
    };

    this.ws.onclose = (event) => {
      console.log('[WebSocket] Connection closed:', event.code, event.reason);
      this.stopHeartbeat();
      this.isServerReady = false;

      // 页面卸载时静默处理
      if (this.isUnloading) {
        this.setConnectionState('disconnected');
        return;
      }

      this.options.onDisconnect?.(event.code, event.reason);

      // 根据 close code 判断是否重连 (STRUCTURED_CONTENT_FRONTEND_GUIDE.md)
      switch (event.code) {
        case WS_CLOSE_CODES.SESSION_REPLACED:
          // 被其他连接踢掉，不重连
          console.warn('[WebSocket] Session replaced by another connection');
          this.isKicked = true;
          this.setConnectionState('kicked');
          this.rejectQueuedMessages(new Error('Session replaced by another connection'));
          return;

        case WS_CLOSE_CODES.AUTH_FAILED:
          // 认证失败，需要重新登录
          console.error('[WebSocket] Authentication failed');
          this.setConnectionState('failed');
          this.rejectQueuedMessages(new Error('Authentication failed'));
          this.options.onError?.(new Error('WebSocket authentication failed'));
          return;

        case WS_CLOSE_CODES.ACCOUNT_BANNED:
          // 账号被封禁，不重连
          console.error('[WebSocket] Account banned');
          this.setConnectionState('failed');
          this.rejectQueuedMessages(new Error('Account banned'));
          this.options.onError?.(new Error('Account has been banned'));
          return;

        case WS_CLOSE_CODES.RATE_LIMITED:
          // 频率限制，不自动重连
          console.warn('[WebSocket] Rate limited');
          this.setConnectionState('failed');
          this.rejectQueuedMessages(new Error('Rate limited'));
          this.options.onError?.(new Error('Connection rate limited, please try again later'));
          return;

        case WS_CLOSE_CODES.CONFIG_CHANGED:
          console.warn('[WebSocket] Configuration changed, reconnection may be needed');
          this.setConnectionState('disconnected');
          this.rejectQueuedMessages(new Error('Configuration changed'));
          this.options.onError?.(new Error('Server configuration changed, please refresh'));
          return;

        case WS_CLOSE_CODES.NORMAL:
          // 正常关闭，不重连
          this.setConnectionState('disconnected');
          return;

        default:
          // 其他情况：如果是被踢状态，不重连
          if (this.isKicked) {
            this.setConnectionState('kicked');
            return;
          }

          // 非手动关闭时尝试重连
          if (!this.isManualClose) {
            // 如果之前触发过 onerror，说明是连接失败
            if (this.hasErrored) {
              this.options.onError?.(new Error('WebSocket connection failed'));
            }

            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              this.scheduleReconnect();
            } else {
              this.setConnectionState('failed');
              this.options.onReconnectStatusChange?.('max_attempts_reached', this.reconnectAttempts, this.maxReconnectAttempts);
              this.rejectQueuedMessages(new Error('Max reconnect attempts reached'));
              // 触发最大重连次数到达回调，允许用户手动重试
              this.options.onMaxReconnectReached?.({
                attempts: this.reconnectAttempts,
                canManualRetry: true,
              });
              this.options.onError?.(new Error(`WebSocket connection failed after ${this.maxReconnectAttempts} attempts`));
            }
          } else {
            this.setConnectionState('disconnected');
          }
      }
    };

    this.ws.onerror = (event) => {
      // 页面卸载或手动关闭时不报告错误
      if (this.isUnloading || this.isManualClose) {
        console.log('[WebSocket] Error during close, ignoring');
        return;
      }

      // 避免重复报告错误（onerror 通常伴随 onclose）
      if (this.hasErrored) {
        return;
      }
      this.hasErrored = true;

      console.error('[WebSocket] Connection error:', event);
      // 注意：不在这里调用 onError，让 onclose 统一处理
      // 因为 onerror 后总是会触发 onclose
    };
  }

  /**
   * 处理服务端消息
   */
  private handleMessage(message: StreamEvent): void {
    // 处理 connected 和 state_update 确认（兼容旧格式 state）
    if (message.type === 'connected' || message.type === 'state_update' || message.type === 'state') {
      this.isServerReady = true;
      this.options.onConnect?.();

      // 处理队列中的消息
      this.flushMessageQueue();
    }

    // 处理被踢事件 (STRUCTURED_CONTENT_FRONTEND_GUIDE.md)
    // 后端在发送 session_replaced 后会关闭连接，这里先标记状态
    if (message.type === 'session_replaced') {
      console.warn('[WebSocket] Session replaced by another connection');
      this.isKicked = true;
      this.setConnectionState('kicked');
      // 不要在这里关闭，等待后端发送 close 事件
      this.options.onEvent(message);
      return;
    }

    // 处理 Session 过期事件 (SESSION_EXPIRATION_FRONTEND_GUIDE.md)
    if (message.type === 'session_expired') {
      console.warn('[WebSocket] Session expired:', message.data);
      // 触发全局事件，让 UI 层处理
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('session:expired', {
          detail: message.data
        }));
      }
      this.options.onEvent(message);
      return;
    }

    // 处理强制登出事件
    if (message.type === 'force_logout') {
      console.warn('[WebSocket] Force logout:', message.data);
      this.isKicked = true;
      this.setConnectionState('failed');
      this.options.onEvent(message);
      return;
    }

    // 处理频率限制事件
    if (message.type === 'rate_limited') {
      console.warn('[WebSocket] Rate limited:', message.data);
      this.setConnectionState('failed');
      this.options.onEvent(message);
      // 不自动重连，让用户处理
      return;
    }

    // 转发给事件处理器
    this.options.onEvent(message);

    // 特殊处理
    if (message.type === 'error') {
      console.error('[WebSocket] Server error:', message.data);
    }
  }

  /**
   * 发送队列中的消息
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const queued = this.messageQueue.shift()!;
      try {
        this.sendImmediate(queued.message);
        queued.resolve();
      } catch (error) {
        queued.reject(error instanceof Error ? error : new Error('Failed to send message'));
      }
    }
  }

  /**
   * 拒绝队列中的所有消息
   */
  private rejectQueuedMessages(error: Error): void {
    while (this.messageQueue.length > 0) {
      const queued = this.messageQueue.shift()!;
      queued.reject(error);
    }
  }

  /**
   * 计算重连延迟（指数退避 + 随机抖动）
   * 基于 STRUCTURED_CONTENT_FRONTEND_GUIDE.md
   */
  private getReconnectDelay(): number {
    // 指数退避: 1s, 2s, 4s, 8s, 16s...
    const exponentialDelay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);

    // 添加随机抖动 (±25%) 避免多客户端同时重连（thundering herd）
    const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);

    // 限制最大延迟
    return Math.min(exponentialDelay + jitter, this.maxReconnectDelay);
  }

  /**
   * 安排重连（带健康检查）
   */
  private async scheduleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    // 如果被踢掉，不自动重连
    if (this.isKicked) {
      console.log('[WebSocket] Connection was kicked, not reconnecting');
      return;
    }

    this.reconnectAttempts++;

    // 先检查服务器健康状态
    const isHealthy = await this.checkServerHealth();

    if (!isHealthy) {
      // 服务器不可用，可能正在重启
      console.log('[WebSocket] Server health check failed, server may be restarting');
      this.isServerUnavailable = true;
      this.setConnectionState('server_restarting');
      this.options.onServerUnavailable?.();

      // 使用更长的延迟
      const delay = Math.min(
        this.serverUnavailableDelay * Math.pow(1.5, this.reconnectAttempts - 1),
        this.maxReconnectDelay
      );

      console.log(`[WebSocket] Waiting ${Math.round(delay)}ms before retry (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.options.onReconnectStatusChange?.('reconnecting', this.reconnectAttempts, this.maxReconnectAttempts);

      this.reconnectTimeout = setTimeout(() => {
        this.scheduleReconnect();
      }, delay);
    } else {
      // 服务器可用，立即重连
      if (this.isServerUnavailable) {
        console.log('[WebSocket] Server is back online, reconnecting...');
        this.isServerUnavailable = false;
      }

      this.setConnectionState('reconnecting');
      const delay = this.getReconnectDelay();

      console.log(`[WebSocket] Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.options.onReconnectStatusChange?.('reconnecting', this.reconnectAttempts, this.maxReconnectAttempts);

      this.reconnectTimeout = setTimeout(() => {
        this.connect();
      }, delay);
    }
  }

  /**
   * 启动心跳
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      this.sendImmediate({ type: 'ping' });
    }, 30000);
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * 立即发送消息（不经过队列）
   */
  private sendImmediate(message: ClientMessage): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    const payload = {
      ...message,
      timestamp: message.timestamp ?? Date.now(),
    };

    this.ws.send(JSON.stringify(payload));
  }

  /**
   * 发送消息（如果未就绪则加入队列）
   */
  send(message: ClientMessage): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isReady) {
        // 完全就绪，立即发送
        try {
          this.sendImmediate(message);
          resolve();
        } catch (error) {
          reject(error);
        }
      } else if (this.connectionState === 'connected' && !this.isServerReady) {
        // WebSocket 已连接但服务端尚未确认（可能正在 bindCid）
        // 加入队列等待服务端确认
        console.log('[WebSocket] Connected but not ready, queueing message');
        this.messageQueue.push({ message, resolve, reject });
      } else if (this.connectionState === 'connecting' || this.connectionState === 'reconnecting') {
        // 正在连接中，加入队列等待
        this.messageQueue.push({ message, resolve, reject });
      } else {
        reject(new Error('WebSocket is not connected'));
      }
    });
  }

  /**
   * 发送用户消息
   */
  async sendUserMessage(content: string, attachments?: UserMessageData['attachments'], attachmentIds?: string[]): Promise<void> {
    const message: ClientMessage<UserMessageData> = {
      type: 'user_message',
      data: {
        content,
        attachments,
        attachmentIds: attachmentIds || attachments?.map(a => a.attachmentId!).filter(Boolean)
      },
      timestamp: Date.now(),
    };
    await this.send(message);
  }

  /**
   * 恢复中断
   */
  async resumeInterrupt(interruptId: string, decision: InterruptDecision): Promise<void> {
    const message: ClientMessage<ResumeInterruptData> = {
      type: 'resume_interrupt',
      data: { interruptId, decision },
    };
    await this.send(message);
  }

  /**
   * 停止生成
   */
  async stop(): Promise<void> {
    await this.send({ type: 'stop' });
  }

  /**
   * 重试失败的消息 (WEBSOCKET_FRONTEND_GUIDE.md)
   * @param turnId 要重试的 turn ID
   */
  async retryMessage(turnId: string): Promise<void> {
    const message: ClientMessage<RetryMessageData> = {
      type: 'retry_message',
      data: { turn_id: turnId },
    };
    await this.send(message);
  }

  /**
   * 关闭连接
   */
  close(): void {
    this.isManualClose = true;
    this.stopHeartbeat();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.connectTimeout) {
      clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }

    this.rejectQueuedMessages(new Error('Connection closed'));

    if (this.ws) {
      // 移除事件处理器，避免触发不必要的回调
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;

      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(WS_CLOSE_CODES.NORMAL, 'Client closed');
      }
      this.ws = null;
    }

    this.setConnectionState('disconnected');
  }

  /**
   * 重置连接（用于切换会话）
   */
  reset(): void {
    this.close();
    this.reconnectAttempts = 0;
    this.currentCid = null;
    this.isServerReady = false;
    this.hasErrored = false;
    this.isKicked = false;
    this.isServerUnavailable = false;
  }

  /**
   * 销毁实例（清理所有资源）
   */
  destroy(): void {
    // 移除页面卸载监听
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }
    this.close();
  }

  /**
   * 重新连接
   * @param newCid 可选的新 cid，如果提供则使用新 cid 连接
   */
  reconnect(newCid?: string): void {
    this.close();
    this.reconnectAttempts = 0;
    if (newCid) {
      this.currentCid = newCid;
    }
    setTimeout(() => this.connect(), 100);
  }

  /**
   * 手动重连（用于用户点击重试按钮）
   * 重置重连计数器并立即尝试重连
   */
  manualReconnect(): void {
    console.log('[WebSocket] Manual reconnect triggered');
    this.reconnectAttempts = 0;
    this.hasErrored = false;
    this.isServerUnavailable = false;
    this.isKicked = false;

    // 取消任何正在进行的重连
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // 关闭现有连接并重连
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(WS_CLOSE_CODES.NORMAL, 'Manual reconnect');
      }
      this.ws = null;
    }

    this.setConnectionState('connecting');
    this.connect();
  }
}
