

// ============ 配置 ============
const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return 'https://seenos.seokit.tech/api';
};

const API_BASE_URL = getApiBaseUrl();

// ============ 类型定义 ============

/** API 错误 */
export interface ApiError extends Error {
  code?: string;
  status?: number;
}

/** 用户 */
export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  created_at: string;
}

/** 用户设置 */
export interface UserSettings {
  orchestratorModel: string;
  defaultSubagentModel: string;
  subagentModels: Record<string, string>;
  enabledTools: string[];
  theme: 'light' | 'dark';
  // Context (RAG) 设置
  contextEnabled?: boolean;              // 是否启用 Context
  contextMaxChunks?: number;             // 检索的最大块数 (1-20)
  contextSimilarityThreshold?: number;   // 相似度阈值 (0-1)
  showTokenUsage?: boolean;              // 是否显示 token 使用量
}

/** 登录响应 */
export interface LoginResponse {
  token: string;
  user: User;
  settings: UserSettings;
}

/** 注册请求 */
export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
  inviteCode: string;
}

/** 注册响应 */
export interface RegisterResponse {
  success: boolean;
  message: string;
}

/** 当前用户响应 */
export interface AuthMeResponse {
  user: User;
  settings: UserSettings;
  isAdmin: boolean;
}

/** 对话 */
export interface Conversation {
  cid: string;
  title: string;
  status: 'idle' | 'busy' | 'interrupted' | 'error';
  messageCount: number;
  lastMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 对话列表响应 */
export interface ConversationListResponse {
  items: Conversation[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** 消息 */
export interface Message {
  id: string;
  cid: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;  // 后端可能返回 null
  metadata: Record<string, unknown> | null;
  toolCalls: ToolCall[] | null;
  toolCallId: string | null;
  createdAt: string;
}

/** 工具调用 */
export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

/** TODO */
export interface Todo {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
}

/** 对话详情响应 */
export interface ConversationDetailResponse extends Conversation {
  messages: Message[];
  todos: Todo[];
  files: Record<string, string>;
}

/** 模型选项 */
export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  description: string | null;
  context_window: number | null;
  supports_vision: boolean;
  supports_tools: boolean;
}

/** 提供商模型分组 */
export interface ProviderModels {
  providerId: string;
  providerName: string;
  icon: string;
  models: ModelOption[];
}

/** 工具选项 */
export interface ToolOption {
  id: string;
  name: string;
  displayName?: string;
  description: string | null;
  category: string | null;
  isEnabled: boolean;             // 改为 isEnabled (后端格式)
  enabled?: boolean;              // 兼容旧格式
  settings?: object | null;
  usedByAgents: string[];         // 新增：使用此工具的 agent 列表
  usedByOrchestrator: boolean;    // 新增：是否被 orchestrator 直接使用
}

/** Subagent 摘要信息（用于 orchestrator 配置返回） */
export interface SubagentSummary {
  name: string;
  description: string;
  isEnabled: boolean;
  category: string;
  toolCount: number;
}

/** 子代理（从后端获取的基本信息） */
export interface SubAgent {
  name: string;
  description: string;
  category: string;
  tools: string[];
  defaultModel: string;
}

/** 子代理配置 (管理员) */
export interface AgentConfig {
  name: string;
  description: string;
  modelId: string;
  systemPrompt: string;
  tools: string[];
  toolCount: number;              // 新增：工具数量
  isEnabled: boolean;
  category: string;
  isModelOverridden: boolean;
  isPromptOverridden: boolean;
  isToolsOverridden: boolean;
  isDescriptionOverridden: boolean; // 新增：描述是否被覆盖
}

/** 主代理配置 (管理员) */
export interface OrchestratorConfig {
  modelId: string;
  systemPrompt: string;
  tools: string[];                   // orchestrator 直接可用的工具列表
  subagents: SubagentSummary[];      // 新增：所有 subagents 的摘要列表
  enabledSubagentCount: number;      // 新增：启用的 subagent 数量
  hasSubagents: boolean;             // 是否启用 subagents
  isModelOverridden: boolean;
  isPromptOverridden: boolean;
  isToolsOverridden: boolean;        // 工具是否被覆盖
}

/** 主代理配置更新请求 */
export interface OrchestratorConfigUpdate {
  modelId?: string | null;
  systemPrompt?: string | null;
  tools?: string[] | null;           // 可配置 orchestrator 直接工具
}

// ============ 请求选项 ============
interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

// ============ API 客户端 ============
class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /** 获取 API 基础 URL */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /** 设置 API 基础 URL */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  /** 设置认证 token */
  setToken(token: string | null): void {
    this.token = token;
    if (token) {
      // Use the same key as AuthProvider
      localStorage.setItem('deep_agents_token', token);
    } else {
      localStorage.removeItem('deep_agents_token');
    }
  }

  /** 获取当前 token */
  getToken(): string | null {
    return this.token;
  }

  /** 从 localStorage 加载 token */
  loadToken(): void {
    if (typeof window !== 'undefined') {
      // Use the same key as AuthProvider
      this.token = localStorage.getItem('deep_agents_token');
    }
  }

  /** 清除 token */
  clearToken(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      // Use the same key as AuthProvider
      localStorage.removeItem('deep_agents_token');
      // Also clear user and settings to force AuthProvider to re-initialize
      localStorage.removeItem('deep_agents_user');
      localStorage.removeItem('deep_agents_settings');
    }
  }

  /** 构建请求头 */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  /** 发送请求 */
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, ...fetchOptions } = options;

    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        ...this.getHeaders(),
        ...fetchOptions.headers,
      },
    });

    if (!response.ok) {
      // Token 过期处理
      if (response.status === 401) {
        this.clearToken();
        // Don't use window.location.href - it causes page reload loops
        // Let AuthProvider and React Router handle navigation
        console.warn('[ApiClient] 401 Unauthorized - token cleared');
      }

      let errorData: { error?: { code?: string; message?: string }; message?: string; detail?: string } = {};
      try {
        errorData = await response.json();
      } catch {
        // 忽略 JSON 解析错误
      }

      const errorMessage = errorData.error?.message || errorData.message || errorData.detail || `HTTP ${response.status}`;
      const error: ApiError = new Error(errorMessage);
      error.code = errorData.error?.code;
      error.status = response.status;
      throw error;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return {} as T;
  }

  /** 是否为 404 Not Found（用于新旧端点回退） */
  private isNotFoundError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && (error as ApiError).status === 404;
  }

  /** GET 请求 */
  get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  /** POST 请求 */
  post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /** PUT 请求 */
  put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /** PATCH 请求 */
  patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /** DELETE 请求 */
  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // ============ 认证 API ============

  /** 用户登录 */
  async login(email: string, password: string): Promise<LoginResponse> {
    const data = await this.post<LoginResponse>('/auth/login', { email, password });
    this.setToken(data.token);
    return data;
  }

  /** 用户注册 */
  async register(request: RegisterRequest): Promise<RegisterResponse> {
    return this.post<RegisterResponse>('/auth/register', request);
  }

  /** 退出登录 */
  async logout(): Promise<void> {
    await this.post('/auth/logout');
    this.clearToken();
  }

  /** 获取当前用户 */
  async getCurrentUser(): Promise<AuthMeResponse> {
    return this.get<AuthMeResponse>('/auth/me');
  }

  /** 更新用户资料 */
  async updateProfile(data: { name?: string; avatar?: string }): Promise<User> {
    return this.put<User>('/auth/profile', data);
  }

  /** 修改密码 */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    return this.post('/auth/password', { oldPassword, newPassword });
  }

  /** 获取 OAuth 提供商 */
  async getOAuthProviders(): Promise<Record<string, boolean>> {
    return this.get<Record<string, boolean>>('/auth/oauth/providers');
  }

  /** Google OAuth 回调 */
  async googleOAuthCallback(code: string, redirectUri: string): Promise<LoginResponse & { isNewUser: boolean }> {
    const data = await this.post<LoginResponse & { isNewUser: boolean }>('/auth/oauth/google', {
      code,
      redirect_uri: redirectUri,
    });
    this.setToken(data.token);
    return data;
  }

  // ============ 对话 API ============

  /** 获取对话列表 */
  async getConversations(options?: {
    offset?: number;
    limit?: number;
    status?: 'idle' | 'busy' | 'interrupted' | 'error';
  }): Promise<ConversationListResponse> {
    const params: Record<string, string> = {};
    if (options?.offset !== undefined) params.offset = String(options.offset);
    if (options?.limit !== undefined) params.limit = String(options.limit);
    if (options?.status) params.status = options.status;
    return this.get<ConversationListResponse>('/conversations', params);
  }

  /** 创建对话 */
  async createConversation(title?: string): Promise<{ cid: string; conversation: Conversation }> {
    return this.post<{ cid: string; conversation: Conversation }>('/conversations', { title });
  }

  /** 获取对话详情 */
  async getConversation(cid: string): Promise<ConversationDetailResponse> {
    return this.get<ConversationDetailResponse>(`/conversations/${cid}`);
  }

  /** 更新对话 */
  async updateConversation(cid: string, data: { title?: string; status?: string }): Promise<Conversation> {
    return this.patch<Conversation>(`/conversations/${cid}`, data);
  }

  /** 删除对话 */
  async deleteConversation(cid: string): Promise<void> {
    return this.delete(`/conversations/${cid}`);
  }

  /** 更新对话文件 */
  async updateConversationFiles(cid: string, files: Record<string, string>): Promise<void> {
    return this.put(`/conversations/${cid}/files`, { files });
  }

  /** 下载对话文件 */
  async downloadConversationFile(cid: string, path: string, filename?: string): Promise<void> {
    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const url = `${this.baseUrl}/conversations/${cid}/files/download?path=${encodeURIComponent(path)}`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
      let errorData: { error?: { code?: string; message?: string }; message?: string; detail?: string } = {};
      try {
        errorData = await response.json();
      } catch {
        // 忽略 JSON 解析错误
      }
      const errorMessage = errorData.error?.message || errorData.message || errorData.detail || `HTTP ${response.status}`;
      const error: ApiError = new Error(errorMessage);
      error.code = errorData.error?.code;
      error.status = response.status;
      throw error;
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    // 触发下载
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename || path.split('/').pop() || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  }

  /** 继续对话 */
  async continueConversation(cid: string): Promise<void> {
    return this.post(`/conversations/${cid}/continue`);
  }

  /** 标记对话完成 */
  async resolveConversation(cid: string): Promise<void> {
    return this.post(`/conversations/${cid}/resolve`);
  }

  // ============ 聊天 API (SSE 模式) ============

  /** 发送消息 (SSE 模式) */
  async sendMessage(cid: string, content: string, attachments?: unknown[]): Promise<void> {
    return this.post(`/chat/${cid}/messages`, { content, attachments });
  }

  /** 停止生成 (SSE 模式) */
  async stopGeneration(cid: string): Promise<void> {
    return this.post(`/chat/${cid}/stop`);
  }

  /** 恢复中断 (SSE 模式) */
  async resumeInterrupt(cid: string, interruptId: string, decision: unknown): Promise<void> {
    return this.post(`/chat/${cid}/interrupt/resume`, { interruptId, decision });
  }

  // ============ 模型 API ============

  /** 获取模型列表 (扁平) */
  async getModels(): Promise<{ models: ModelOption[] }> {
    return this.get<{ models: ModelOption[] }>('/models');
  }

  /** 获取模型列表 (按提供商分组) */
  async getModelsGrouped(): Promise<{ providers: ProviderModels[] }> {
    return this.get<{ providers: ProviderModels[] }>('/models/grouped');
  }

  /** 获取默认模型 */
  async getDefaultModels(): Promise<{ orchestratorModel: string; defaultSubagentModel: string }> {
    return this.get<{ orchestratorModel: string; defaultSubagentModel: string }>('/models/defaults');
  }

  /** 获取子代理列表 */
  async getSubAgents(): Promise<{ subagents: SubAgent[] }> {
    return this.get<{ subagents: SubAgent[] }>('/models/subagents');
  }

  // ============ 工具 API ============

  /** 获取工具列表 */
  async getTools(): Promise<{ tools: ToolOption[] }> {
    return this.get<{ tools: ToolOption[] }>('/tools');
  }

  // ============ 设置 API ============

  /** 获取用户设置 */
  async getSettings(): Promise<UserSettings> {
    return this.get<UserSettings>('/settings');
  }

  /** 更新用户设置 */
  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    return this.put<UserSettings>('/settings', settings);
  }

  // ============ 配置 API (管理员) ============

  /** 获取所有子代理配置 */
  async getAgentConfigs(): Promise<AgentConfig[]> {
    return this.get<AgentConfig[]>('/config/agents');
  }

  /** 获取单个子代理配置 */
  async getAgentConfig(agentName: string): Promise<AgentConfig> {
    return this.get<AgentConfig>(`/config/agents/${agentName}`);
  }

  /** 更新子代理配置 (管理员) */
  async updateAgentConfig(agentName: string, config: Partial<AgentConfig>): Promise<AgentConfig> {
    return this.put<AgentConfig>(`/config/agents/${agentName}`, config);
  }

  /** 切换子代理启用状态 (管理员) - 简化的启用/禁用 API */
  async toggleAgentEnabled(agentName: string, isEnabled: boolean): Promise<AgentConfig> {
    return this.patch<AgentConfig>(`/config/agents/${agentName}/toggle`, { isEnabled });
  }

  /** 重置子代理配置 (管理员) */
  async resetAgentConfig(agentName: string): Promise<void> {
    return this.delete(`/config/agents/${agentName}`);
  }

  /** 获取主代理配置 */
  async getOrchestratorConfig(): Promise<OrchestratorConfig> {
    return this.get<OrchestratorConfig>('/config/orchestrator');
  }

  /** 更新主代理配置 (管理员) */
  async updateOrchestratorConfig(config: OrchestratorConfigUpdate): Promise<OrchestratorConfig> {
    return this.put<OrchestratorConfig>('/config/orchestrator', config);
  }

  /** 重置主代理配置 (管理员) */
  async resetOrchestratorConfig(): Promise<void> {
    return this.delete('/config/orchestrator');
  }

  /** 获取工具配置 */
  async getToolConfigs(): Promise<unknown[]> {
    return this.get<unknown[]>('/config/tools');
  }

  /** 更新工具配置 (管理员) */
  async updateToolConfig(toolName: string, config: { isEnabled: boolean }): Promise<void> {
    return this.put(`/config/tools/${toolName}`, config);
  }

  /** 切换工具启用状态 (管理员) - 简化的启用/禁用 API */
  async toggleToolEnabled(toolName: string, isEnabled: boolean): Promise<ToolOption> {
    return this.patch<ToolOption>(`/config/tools/${toolName}/toggle`, { isEnabled });
  }

  /** 获取默认提示词模板 */
  async getDefaultPrompts(): Promise<Array<{ name: string; content: string }>> {
    return this.get<Array<{ name: string; content: string }>>('/config/prompts/defaults');
  }

  /** 获取管理员列表 (管理员) */
  async getAdmins(): Promise<User[]> {
    return this.get<User[]>('/config/admins');
  }

  // ============ Context API (RAG) ============

  /** 获取用户上下文文件列表 - 从 /api/context/all 中提取文件信息 */
  async getContextFiles(): Promise<ContextListResponse> {
    // 优先使用 FRONTEND_API_GUIDE.md 的新端点：GET /context
    try {
      return await this.get<ContextListResponse>('/context');
    } catch (error) {
      // 旧后端没有该端点时，回退到 /context/all 的解析逻辑
      if (!this.isNotFoundError(error)) throw error;
    }

    // 回退：从 /context/all 获取所有数据，然后提取 knowledge 部分的文件信息
    const allData = await this.getContextAll();
    const knowledge = allData?.knowledge || {};
    const sources = knowledge.sources || [];

    // 过滤出文件类型的 sources（根据 by_type 中的 file 类型，或 source.type === 'file'）
    const fileSources = sources.filter((source: any) => {
      if (source.type === 'file' || source.sourceType === 'file') return true;
      if (source.fileType) return true;
      return false;
    });

    const contexts: ContextFile[] = fileSources.map((source: any) => ({
      id: source.id || source.contextId || '',
      filename: source.filename || source.name || source.title || '',
      fileType: (source.fileType || source.sourceType || 'txt') as 'txt' | 'md' | 'pdf' | 'docx',
      fileSize: source.fileSize || 0,
      chunkCount: source.chunkCount || 0,
      status: (source.status || 'ready') as 'pending' | 'processing' | 'ready' | 'error',
      errorMessage: source.errorMessage || undefined,
      createdAt: source.createdAt || source.created_at || source.addedAt || new Date().toISOString(),
    }));

    const totalSize = contexts.reduce((sum, file) => sum + file.fileSize, 0);
    const maxSize = knowledge.maxSize || 50 * 1024 * 1024; // 默认 50MB

    return { contexts, totalSize, maxSize };
  }

  /** 上传上下文文件 */
  async uploadContextFile(file: File, filename?: string): Promise<ContextFile> {
    const formData = new FormData();
    formData.append('file', file);
    if (filename) {
      formData.append('filename', filename);
    }

    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // 优先新端点：POST /context/upload（FRONTEND_API_GUIDE.md）
    let response = await fetch(`${this.baseUrl}/context/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    // 旧端点回退：POST /context/files/upload
    if (response.status === 404) {
      response = await fetch(`${this.baseUrl}/context/files/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });
    }

    if (!response.ok) {
      let errorData: { error?: { code?: string; message?: string }; message?: string; detail?: string } = {};
      try {
        errorData = await response.json();
      } catch {
        // 忽略 JSON 解析错误
      }
      const errorMessage = errorData.error?.message || errorData.message || errorData.detail || `HTTP ${response.status}`;
      const error: ApiError = new Error(errorMessage);
      error.code = errorData.error?.code;
      error.status = response.status;
      throw error;
    }

    return response.json();
  }

  /** 删除上下文文件 */
  async deleteContextFile(contextId: string): Promise<void> {
    try {
      // 新端点：DELETE /context/{id}
      return await this.delete(`/context/${contextId}`);
    } catch (error) {
      if (!this.isNotFoundError(error)) throw error;
      // 旧端点回退
      return this.delete(`/context/files/${contextId}`);
    }
  }

  /** 获取文件内容 */
  async getContextFileContent(contextId: string): Promise<ContextContentResponse> {
    try {
      // 新端点：GET /context/{id}/content
      return await this.get<ContextContentResponse>(`/context/${contextId}/content`);
    } catch (error) {
      if (!this.isNotFoundError(error)) throw error;
      return this.get<ContextContentResponse>(`/context/files/${contextId}/content`);
    }
  }

  /** 获取文件分块 */
  async getContextFileChunks(contextId: string): Promise<ContextChunksResponse> {
    try {
      // 新端点：GET /context/{id}/chunks
      return await this.get<ContextChunksResponse>(`/context/${contextId}/chunks`);
    } catch (error) {
      if (!this.isNotFoundError(error)) throw error;
      return this.get<ContextChunksResponse>(`/context/files/${contextId}/chunks`);
    }
  }

  /** 下载原始文件 */
  async downloadContextFile(contextId: string, filename: string): Promise<void> {
    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // 优先新端点：GET /context/{id}/download
    let response = await fetch(`${this.baseUrl}/context/${contextId}/download`, { headers });
    // 旧端点回退：GET /context/files/{id}/download
    if (response.status === 404) {
      response = await fetch(`${this.baseUrl}/context/files/${contextId}/download`, { headers });
    }

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    // 触发下载
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /** 搜索上下文 */
  async searchContext(query: string, options?: {
    top_k?: number;
    similarity_threshold?: number;
  }): Promise<{ results: ContextSearchResult[] }> {
    try {
      // 新端点：POST /context/search
      return await this.post<{ results: ContextSearchResult[] }>('/context/search', {
        query,
        ...options,
      });
    } catch (error) {
      if (!this.isNotFoundError(error)) throw error;
      // 旧端点回退：POST /context/files/search
      return this.post<{ results: ContextSearchResult[] }>('/context/files/search', {
        query,
        ...options,
      });
    }
  }

  /** 获取所有 Context 数据 */
  async getContextAll(): Promise<any> {
    return this.get<any>('/context/all');
  }

  /** 获取 Context 统计数据 */
  async getContextStats(useCache: boolean = true): Promise<ContextStatsResponse> {
    return this.get<ContextStatsResponse>('/context/stats', { use_cache: useCache.toString() });
  }

  // ============ Singleton 操作 ============

  /** 获取 Singleton */
  async getSingleton(section: string): Promise<ContextSingleton> {
    return this.get<ContextSingleton>(`/context/singletons/${section}`);
  }

  /** 创建/更新 Singleton (Upsert) */
  async upsertSingleton(section: string, data: any, expectedVersion?: number): Promise<ContextSingleton> {
    const body: any = { data };
    if (expectedVersion !== undefined) {
      body.expected_version = expectedVersion;
    }
    return this.put<ContextSingleton>(`/context/singletons/${section}`, body);
  }

  /** 删除 Singleton */
  async deleteSingleton(section: string): Promise<void> {
    return this.delete(`/context/singletons/${section}`);
  }

  // ============ Items 操作 ============

  /** 获取 Items 列表 */
  async getItems(params?: {
    category?: 'onsite' | 'offsite';
    section?: string;
    limit?: number;
    offset?: number;
    include_deleted?: boolean;
  }): Promise<ContextItemsResponse> {
    const queryParams: Record<string, string> = {};
    if (params?.category) queryParams.category = params.category;
    if (params?.section) queryParams.section = params.section;
    if (params?.limit !== undefined) queryParams.limit = params.limit.toString();
    if (params?.offset !== undefined) queryParams.offset = params.offset.toString();
    if (params?.include_deleted !== undefined) queryParams.include_deleted = params.include_deleted.toString();
    return this.get<ContextItemsResponse>('/context/items', Object.keys(queryParams).length > 0 ? queryParams : undefined);
  }

  /** 获取单个 Item */
  async getItem(itemId: string): Promise<ContextItem> {
    return this.get<ContextItem>(`/context/items/${itemId}`);
  }

  /** 创建 Item */
  async createItem(data: ContextItemCreate): Promise<ContextItem> {
    return this.post<ContextItem>('/context/items', data);
  }

  /** 更新 Item */
  async updateItem(itemId: string, data: Partial<ContextItemCreate>, expectedVersion?: number): Promise<ContextItem> {
    const body: any = { ...data };
    if (expectedVersion !== undefined) {
      body.expected_version = expectedVersion;
    }
    return this.put<ContextItem>(`/context/items/${itemId}`, body);
  }

  /** 删除 Item */
  async deleteItem(itemId: string): Promise<void> {
    return this.delete(`/context/items/${itemId}`);
  }

  /** 恢复 Item */
  async restoreItem(itemId: string): Promise<ContextItem> {
    return this.post<ContextItem>(`/context/items/${itemId}/restore`);
  }

  /** 批量删除 Items */
  async bulkDeleteItems(ids: string[]): Promise<{ deleted: number; failed: string[] }> {
    return this.post<{ deleted: number; failed: string[] }>('/context/items/bulk-delete', { ids });
  }

  /** 重新排序 Items */
  async reorderItems(category: 'onsite' | 'offsite', section: string, ids: string[]): Promise<void> {
    return this.post('/context/items/reorder', { category, section, ids });
  }

  // ============ Persons 操作 ============

  /** 获取 Persons 列表 */
  async getPersons(params?: {
    category?: 'onsite' | 'offsite';
    section?: string;
    limit?: number;
    offset?: number;
  }): Promise<ContextPersonsResponse> {
    const queryParams: Record<string, string> = {};
    if (params?.category) queryParams.category = params.category;
    if (params?.section) queryParams.section = params.section;
    if (params?.limit !== undefined) queryParams.limit = params.limit.toString();
    if (params?.offset !== undefined) queryParams.offset = params.offset.toString();
    return this.get<ContextPersonsResponse>('/context/persons', Object.keys(queryParams).length > 0 ? queryParams : undefined);
  }

  /** 创建 Person */
  async createPerson(data: ContextPersonCreate): Promise<ContextPerson> {
    return this.post<ContextPerson>('/context/persons', data);
  }

  /** 更新 Person */
  async updatePerson(personId: string, data: Partial<ContextPersonCreate>, expectedVersion?: number): Promise<ContextPerson> {
    const body: any = { ...data };
    if (expectedVersion !== undefined) {
      body.expected_version = expectedVersion;
    }
    return this.put<ContextPerson>(`/context/persons/${personId}`, body);
  }

  /** 删除 Person */
  async deletePerson(personId: string): Promise<void> {
    return this.delete(`/context/persons/${personId}`);
  }

  // ============ Entities 操作 ============

  /** 获取 Entities 列表 */
  async getEntities(params?: {
    category?: 'onsite' | 'offsite';
    section?: string;
    limit?: number;
    offset?: number;
    include_deleted?: boolean;
  }): Promise<ContextEntitiesResponse> {
    const queryParams: Record<string, string> = {};
    if (params?.category) queryParams.category = params.category;
    if (params?.section) queryParams.section = params.section;
    if (params?.limit !== undefined) queryParams.limit = params.limit.toString();
    if (params?.offset !== undefined) queryParams.offset = params.offset.toString();
    if (params?.include_deleted !== undefined) queryParams.include_deleted = params.include_deleted.toString();
    return this.get<ContextEntitiesResponse>('/context/entities', Object.keys(queryParams).length > 0 ? queryParams : undefined);
  }

  /** 创建 Entity */
  async createEntity(data: ContextEntityCreate): Promise<ContextEntity> {
    return this.post<ContextEntity>('/context/entities', data);
  }

  /** 更新 Entity */
  async updateEntity(entityId: string, data: Partial<ContextEntityCreate>, expectedVersion?: number): Promise<ContextEntity> {
    const body: any = { ...data };
    if (expectedVersion !== undefined) {
      body.expected_version = expectedVersion;
    }
    return this.put<ContextEntity>(`/context/entities/${entityId}`, body);
  }

  /** 删除 Entity */
  async deleteEntity(entityId: string): Promise<void> {
    return this.delete(`/context/entities/${entityId}`);
  }

  // ============ Onboarding API ============

  /** 获取 Onboarding 状态 */
  async getOnboardingStatus(projectId?: string): Promise<OnboardingStatus> {
    const params: Record<string, string> = {};
    // 如果未传入 projectId，从 localStorage 读取
    let finalProjectId = projectId;
    if (!finalProjectId && typeof window !== 'undefined') {
      finalProjectId = localStorage.getItem('seenos_current_project_id') || undefined;
    }
    if (finalProjectId) {
      params.project_id = finalProjectId;
    }
    const response = await this.get<any>('/onboarding/status', Object.keys(params).length > 0 ? params : undefined);
    return {
      status: response.status,
      currentStep: response.current_step,
      completedSteps: response.completed_steps || [],
      message: response.message,
      navigationStats: response.navigation_stats ? {
        sitemapTotal: response.navigation_stats.sitemap_total,
        sitemapFiltered: response.navigation_stats.sitemap_filtered,
        headerLinks: response.navigation_stats.header_links,
        footerLinks: response.navigation_stats.footer_links,
      } : undefined,
      error: response.error,
      researchInteractionId: response.research_interaction_id,
      researchStatus: response.research_status,
      researchUrl: response.research_url,
      researchData: response.research_data,
      startedAt: response.started_at,
      completedAt: response.completed_at,
      lastUpdatedAt: response.last_updated_at,
    } as OnboardingStatus;
  }

  /** 启动 Deep Research（品牌分析） */
  async startDeepResearch(
    url: string,
    options?: {
      stage?: 'onsite' | 'offsite' | 'both';
      onsite_mode?: 'search' | 'deep' | 'hybrid';
      offsite_mode?: 'search' | 'deep' | 'hybrid';
    }
  ): Promise<DeepResearchResponse> {
    return this.post<DeepResearchResponse>('/onboarding/research', {
      url,
      ...(options || {}),
    });
  }

  /** 获取 Deep Research 结果 */
  async getDeepResearchResult(interactionId: string): Promise<DeepResearchResult> {
    return this.get<DeepResearchResult>(`/onboarding/research/${interactionId}`);
  }

  /** 搜索品牌数据 */
  async searchOnboardingData(query?: string, scope: 'all' | 'onsite' | 'offsite' = 'all'): Promise<OnboardingSearchResponse> {
    const params: Record<string, string> = {};
    if (query) params.query = query;
    params.scope = scope;
    return this.get<OnboardingSearchResponse>('/onboarding/search', params);
  }

  /** 获取品牌摘要 */
  async getOnboardingSummary(): Promise<OnboardingSummary> {
    return this.get<OnboardingSummary>('/onboarding/summary');
  }

  /** 重置用户 Onboarding 状态 (管理员) */
  async resetOnboardingStatus(userId: string, projectId?: string): Promise<{ status: string; message: string }> {
    const body: any = {};
    if (projectId) {
      body.project_id = projectId;
    }
    return this.post<{ status: string; message: string }>(`/onboarding/admin/${userId}/reset`, body);
  }

  // ============ Projects API ============

  /** 获取项目列表 */
  async getProjects(): Promise<ProjectListResponse> {
    return this.get<ProjectListResponse>('/projects');
  }

  /** 创建项目 */
  async createProject(data: CreateProjectRequest): Promise<Project> {
    return this.post<Project>('/projects', data);
  }

  /** 获取项目详情 */
  async getProject(projectId: string): Promise<Project> {
    return this.get<Project>(`/projects/${projectId}`);
  }

  /** 更新项目 */
  async updateProject(projectId: string, data: UpdateProjectRequest): Promise<Project> {
    return this.put<Project>(`/projects/${projectId}`, data);
  }

  /** 验证项目 URL */
  async validateProjectUrl(url: string): Promise<ValidateUrlResponse> {
    return this.post<ValidateUrlResponse>('/projects/validate-url', { url });
  }

  /** 清除项目上下文 (管理员) - 通过本地API路由代理以避免CORS问题 */
  async clearProjectContext(projectId: string): Promise<{ message: string }> {
    // 使用本地API路由代理，避免CORS问题
    const response = await fetch(`/api/admin/clear-project-context?projectId=${encodeURIComponent(projectId)}`, {
      method: 'DELETE',
      headers: {
        ...this.getHeaders(),
      },
    });

    if (!response.ok) {
      let errorData: { error?: { code?: string; message?: string }; message?: string; detail?: string } = {};
      try {
        errorData = await response.json();
      } catch {
        // 忽略 JSON 解析错误
      }

      const errorMessage = errorData.error?.message || errorData.message || errorData.detail || `HTTP ${response.status}`;
      const error: ApiError = new Error(errorMessage);
      error.code = errorData.error?.code;
      error.status = response.status;
      throw error;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return { message: 'Project context cleared successfully' };
  }

  // ============ Playbooks API ============

  /** 获取 Playbooks 列表（按类别分组） */
  async getPlaybooks(options?: {
    category?: 'research' | 'build' | 'optimize' | 'monitor';
    active_only?: boolean;
  }): Promise<PlaybooksResponse> {
    const params: Record<string, string> = {};
    if (options?.category) {
      // 直接使用小写格式
      params.category = options.category;
    }
    if (options?.active_only !== undefined) {
      params.active_only = String(options.active_only);
    }
    return this.get<PlaybooksResponse>('/playbooks', Object.keys(params).length > 0 ? params : undefined);
  }
}

// ============ Context 类型定义 ============

/** 上下文文件 */
export interface ContextFile {
  id: string;
  filename: string;
  fileType: 'txt' | 'md' | 'pdf' | 'docx';
  fileSize: number;
  chunkCount: number;
  status: 'pending' | 'processing' | 'ready' | 'error';
  errorMessage?: string;
  createdAt: string;
}

/** 上下文列表响应 */
export interface ContextListResponse {
  contexts: ContextFile[];
  totalSize: number;   // 当前已用存储（字节）
  maxSize: number;     // 最大存储限制（字节）
}

/** 上下文搜索结果 */
export interface ContextSearchResult {
  contextId: string;
  filename: string;
  chunkIndex: number;
  content: string;
  similarity: number;
}

/** 文件内容响应 */
export interface ContextContentResponse {
  id: string;
  filename: string;
  fileType: string;
  content: string;  // 提取的文本内容
}

/** 文件分块 */
export interface ContextChunk {
  index: number;
  content: string;
}

/** 文件分块响应 */
export interface ContextChunksResponse {
  id: string;
  filename: string;
  chunkCount: number;
  chunks: ContextChunk[];
}

// ============ Context API 类型定义 ============

/** Context 统计数据响应 */
export interface ContextStatsResponse {
  onsite: {
    total: number;
    sections: Record<string, { count: number; has_data: boolean }>;
  };
  offsite: {
    total: number;
    sections: Record<string, { count: number; has_data: boolean }>;
  };
  knowledge: {
    total: number;
    sections: Record<string, { count: number; has_data: boolean }>;
  };
}

/** Singleton 响应 */
export interface ContextSingleton {
  user_id: string;
  section: string;
  data: Record<string, any>;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** Item 响应 */
export interface ContextItem {
  id: string;
  user_id: string;
  category: 'onsite' | 'offsite';
  section: string;
  title: string | null;
  description: string | null;
  url: string | null;
  image_url: string | null;
  notes: string | null;
  extra: Record<string, any>;
  sequence: number;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** Items 列表响应 */
export interface ContextItemsResponse {
  items: ContextItem[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

/** Item 创建请求 */
export interface ContextItemCreate {
  category: 'onsite' | 'offsite';
  section: string;
  title?: string | null;
  description?: string | null;
  url?: string | null;
  image_url?: string | null;
  notes?: string | null;
  extra?: Record<string, any>;
}

/** Person 响应 */
export interface ContextPerson {
  id: string;
  user_id: string;
  category: 'onsite' | 'offsite';
  section: string;
  name: string;
  title: string | null;
  bio: string | null;
  photo_url: string | null;
  platform: string | null;
  handle: string | null;
  url: string | null;
  role: string | null;
  social_links: Array<{ platform: string; url: string }>;
  notes: string | null;
  extra: Record<string, any>;
  sequence: number;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** Persons 列表响应 */
export interface ContextPersonsResponse {
  items: ContextPerson[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

/** Person 创建请求 */
export interface ContextPersonCreate {
  category: 'onsite' | 'offsite';
  section: string;
  name: string;
  title?: string | null;
  bio?: string | null;
  photo_url?: string | null;
  platform?: string | null;
  handle?: string | null;
  url?: string | null;
  role?: string | null;
  social_links?: Array<{ platform: string; url: string }>;
  notes?: string | null;
  extra?: Record<string, any>;
}

/** Entity 响应 */
export interface ContextEntity {
  id: string;
  user_id: string;
  category: 'onsite' | 'offsite';
  section: string;
  name: string;
  platform: string | null;
  handle: string | null;
  url: string | null;
  entity_type: string | null;
  event_date: string | null;
  location: string | null;
  notes: string | null;
  extra: Record<string, any>;
  sequence: number;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** Entities 列表响应 */
export interface ContextEntitiesResponse {
  items: ContextEntity[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

/** Entity 创建请求 */
export interface ContextEntityCreate {
  category: 'onsite' | 'offsite';
  section: string;
  name: string;
  platform?: string | null;
  handle?: string | null;
  url?: string | null;
  entity_type?: string | null;
  event_date?: string | null;
  location?: string | null;
  notes?: string | null;
  extra?: Record<string, any>;
}

// ============ Onboarding 类型定义 ============

/** Onboarding 状态类型 */
export type OnboardingStatusType = 'not_started' | 'in_progress' | 'researching' | 'completed' | 'failed';

/** Onboarding 状态 */
export interface OnboardingStatus {
  status: OnboardingStatusType;
  currentStep?: string;
  completedSteps: string[];
  message?: string;
  navigationStats?: {
    sitemapTotal: number;
    sitemapFiltered: number;
    headerLinks: number;
    footerLinks: number;
    [key: string]: any;
  };
  error?: string;
  researchInteractionId?: string;
  researchStatus?: 'pending' | 'running' | 'completed' | 'failed';
  researchUrl?: string;
  researchData?: ContextExtractionData;
  startedAt?: string;
  completedAt?: string;
  lastUpdatedAt?: string;
}

/** 结构化数据 */
export interface ContextExtractionData {
  onsite?: OnsiteData;
  offsite?: OffsiteData;
}

/** Onsite 数据 */
export interface OnsiteData {
  brandAssets?: BrandAssets;
  heroSection?: HeroSection;
  problemStatement?: { painPoints: Array<{ title: string; description?: string }> };
  whoWeServe?: { targetAudiences: Array<{ name: string; description?: string }> };
  useCases?: Array<{ title: string; description?: string }>;
  industries?: Array<{ title: string; description?: string }>;
  productsAndServices?: Array<{ title: string; description?: string; url?: string }>;
  features?: Array<{ title: string; description?: string }>;
  trustBadges?: Array<{ title: string; description?: string; imageUrl?: string }>;
  caseStudies?: Array<{ title: string; customerName?: string; industry?: string }>;
  testimonials?: Array<{ quote: string; author?: string; title?: string; company?: string }>;
  leadershipTeam?: Array<{ name: string; title?: string; bio?: string; photoUrl?: string }>;
  aboutUs?: { companyStory?: string; mission?: string; vision?: string; coreValues?: string[] };
  faqs?: Array<{ question: string; answer: string; category?: string }>;
  contactInfo?: { email?: string; phone?: string; address?: string; socialLinks?: Record<string, string> };
}

/** Offsite 数据 */
export interface OffsiteData {
  monitoringScope?: { brandKeywords?: string[]; productKeywords?: string[]; hashtags?: string[] };
  targetKeywords?: Array<{ keyword: string; description?: string }>;
  competitors?: Array<{ name: string; url?: string; competitorType?: string; notes?: string }>;
  socialProfiles?: Array<{ name: string; platform: string; handle?: string; url?: string }>;
  reviewPlatforms?: Array<{ name: string; platform: string; url?: string; rating?: number }>;
  communityForums?: Array<{ name: string; platform: string; url?: string }>;
  mediaOutlets?: Array<{ name: string; url?: string; mediaType?: string }>;
  pressCoverage?: Array<{ title: string; publication: string; url?: string }>;
  kols?: Array<{ name: string; platform?: string; handle?: string; role?: string }>;
}

/** 品牌资产 */
export interface BrandAssets {
  brandName: { name: string; subtitle?: string };
  metaDescription?: string;
  logoUrl?: string;
  brandColors?: { primary?: string; secondary?: string };
  toneOfVoice?: string;
}

/** Hero 区 */
export interface HeroSection {
  headline: string;
  subheadline?: string;
  ctas?: Array<{ text: string; url?: string; style?: string }>;
  metrics?: Array<{ label: string; value: string }>;
}

/** Deep Research 响应 */
export interface DeepResearchResponse {
  interactionId: string;
  status: string;
  message?: string;
  stage?: 'onsite' | 'offsite' | 'both' | string;
}

/** Deep Research 结果 */
export interface DeepResearchResult {
  interactionId: string;
  status: string;
  onsite?: OnsiteData;
  offsite?: OffsiteData;
  citations: Array<{ title: string; url: string; snippet?: string }>;
  error?: string;
}

/** Onboarding 搜索结果 */
export interface OnboardingSearchResult {
  id: string;
  type: 'singleton' | 'item' | 'person' | 'entity';
  category: string;
  section: string;
  title?: string;
  description?: string;
  data: Record<string, any>;
  relevance: number;
}

/** Onboarding 搜索响应 */
export interface OnboardingSearchResponse {
  status: OnboardingStatus;
  query?: string;
  scope: string;
  totalResults: number;
  results: OnboardingSearchResult[];
  onsite: Record<string, OnboardingSearchResult[]>;
  offsite: Record<string, OnboardingSearchResult[]>;
}

/** 品牌摘要 */
export interface OnboardingSummary {
  status: OnboardingStatus;
  brandName?: string;
  tagline?: string;
  description?: string;
  onsite: Record<string, any>;
  offsite: Record<string, any>;
  stats: Record<string, number>;
  researchReport?: string;
}

// ============ Projects 类型定义 ============

/** 项目 */
export interface Project {
  id: string;
  name: string;
  domain?: string;
  websiteUrl: string;
  settings?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/** 项目列表响应 */
export interface ProjectListResponse {
  projects: Project[];
  total: number;
}

/** 创建项目请求 */
export interface CreateProjectRequest {
  name: string;
  url: string;
  settings?: Record<string, unknown>;
}

/** 更新项目请求 */
export interface UpdateProjectRequest {
  name?: string;
  url?: string;
  settings?: Record<string, unknown>;
}

/** URL 验证响应 */
export interface ValidateUrlResponse {
  input_url: string;      // 原始输入
  normalized_url: string; // 标准化后的 URL
  is_valid: boolean;      // 是否有效
  reachable: boolean;     // 是否可访问
  status_code: number;    // HTTP 状态码
  final_url: string;      // 最终 URL（可能重定向）
  error?: string;         // 错误信息
}

// ============ Playbooks 类型定义 ============

/** API 返回的 Playbook 数据 */
export interface ApiPlaybook {
  id: string;
  skill_id: string;
  name: string;
  description: string;
  difficulty: string;
  tags: string[];
  auto_actions: string[];
  artifacts: string[];
  has_configure: boolean;
  category: string;
}

/** API 返回的类别分组 */
export interface PlaybookCategoryGroup {
  category: string;
  category_name: string;
  playbooks: ApiPlaybook[];
}

/** Playbooks API 响应 */
export interface PlaybooksResponse {
  categories: PlaybookCategoryGroup[];
}

// 导出单例实例
export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;
export { ApiClient, API_BASE_URL };
