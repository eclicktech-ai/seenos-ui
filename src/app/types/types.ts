// ============ 用户相关 ============
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt?: Date;
  isAdmin?: boolean;  // 是否是管理员
}

export interface UserSettings {
  mainAgentModel: string;
  subAgentModel: string;
  enabledTools: string[];
  theme: 'light' | 'dark';
  // Context (RAG) 设置
  contextEnabled?: boolean;              // 是否启用 Context
  contextMaxChunks?: number;             // 检索的最大块数 (1-20)
  contextSimilarityThreshold?: number;   // 相似度阈值 (0-1)
  showTokenUsage?: boolean;              // 是否显示 token 使用量
}

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  description?: string | null;
  contextWindow?: number | null;
  context_window?: number | null;  // 后端返回的字段名
  maxTokens?: number;
  supports_vision?: boolean;
  supports_tools?: boolean;
}

export interface ToolOption {
  id: string;
  name: string;
  displayName?: string;
  description?: string | null;
  category?: string | null;       // 工具分类
  isEnabled?: boolean;            // 新格式（后端返回）
  enabled?: boolean;              // 兼容旧格式
  settings?: object | null;
  usedByAgents?: string[];        // 使用此工具的 agent 列表
  usedByOrchestrator?: boolean;   // 是否被 orchestrator 直接使用
}

// 模型按提供商分组
export interface ModelsByProvider {
  [provider: string]: ModelOption[];
}

// 工具按分类分组
export interface ToolsByCategory {
  [category: string]: ToolOption[];
}

// ============ 会话相关 ============
export interface Conversation {
  cid: string;                    // 会话 ID（前端使用）
  title: string;
  status: 'idle' | 'busy' | 'interrupted' | 'error';
  createdAt: Date;
  updatedAt: Date;
  messageCount?: number;
  lastMessage?: string;
}

// ============ 消息相关 ============
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface MessageContent {
  type: 'text' | 'image_url' | 'file';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'auto' | 'low' | 'high';
  };
  file_url?: {
    url: string;
  };
  mime_type?: string;
  filename?: string;
}

// ============ 消息反馈 (FEEDBACK_API_FRONTEND_GUIDE.md) ============

/** 反馈类型 */
export type FeedbackType = 'like' | 'dislike';

/** 反馈数据 */
export interface Feedback {
  id: string;
  messageId: string;
  feedbackType: FeedbackType;
  reason: string;
  createdAt: string;
}

/** 创建/更新反馈请求 */
export interface FeedbackRequest {
  feedbackType: FeedbackType;
  reason: string;  // 必填，1-1000 字符
}

/** 反馈错误码 */
export type FeedbackErrorCode =
  | 'VALIDATION_ERROR'    // 参数验证失败（reason 为空）
  | 'MESSAGE_NOT_FOUND'   // 消息不存在
  | 'CONFLICT'            // 已存在反馈（需要用 PUT 修改）
  | 'UNAUTHORIZED';       // 无权访问该消息

// ============ Action Card 类型 (CONTENT_SELECTION_FRONTEND_GUIDE.md) ============
// 用于内容选择交互

/** 页面类型 */
export type ContentPageType = 'blog' | 'guide' | 'comparison' | 'listicle' | 'landing_page';

/** 内容项状态 */
export type ContentItemStatus = 'draft' | 'ready' | 'in_progress' | 'review' | 'published';

/** 内容项角色 */
export type ContentItemRole = 'Pillar' | 'Cluster';

/** Action Card 结果（后端返回） */
export interface ActionCardResult {
  type: 'action_card';
  card_type: 'content_selection';
  /** 卡片标题 */
  title: string;
  /** 卡片描述 */
  description: string;
  /** Topic Cluster 名称 */
  cluster_name: string;
  /** Topic Cluster ID */
  cluster_id: string;
  /** 可选项列表 */
  items: ContentItemOption[];
  /** 消息模板，如 "请生成《{title}》的完整 HTML 页面" */
  action_template: string;
  /** 动作类型 */
  action_type: 'generate_content';
}

/** 内容项选项 */
export interface ContentItemOption {
  /** Content Item UUID - 存储但不显示给用户 */
  id: string;
  /** 页面标题 */
  title: string;
  /** 页面类型 - 用于确定激活哪个 Writer Skill */
  page_type: ContentPageType;
  /** 目标关键词 */
  target_keyword: string;
  /** 优先级 1-5 */
  priority: number;
  /** 在 Topic Cluster 中的角色 */
  role: ContentItemRole;
  /** 当前状态 */
  status: ContentItemStatus;
  /** SEO 标题（可选） */
  seo_title?: string;
  /** 关键词搜索量（可选） */
  keyword_volume?: number;
  /** 关键词难度（可选） */
  keyword_difficulty?: number;
}

/** 内容选择消息（前端发送给后端） */
export interface ContentSelectionMessage {
  /** 动作类型 */
  action: 'generate_content';
  /** Content Item UUID */
  item_id: string;
  /** 用户可见的显示文本 */
  display: string;
}

// ============ Content Block 类型 (WEBSOCKET_FRONTEND_GUIDE.md) ============
// 用于按正确时间顺序显示工具调用和文本内容

export type ContentBlock =
  | TextBlock
  | ToolCallBlock
  | FileRefBlock
  | SubagentBlock
  | ImageBlock
  | CitationBlock
  | ActionCardBlock
  | AttachmentRefBlock;

export interface TextBlock {
  id: string;
  type: "text";
  content: string;  // May contain markdown
}

export interface ToolCallBlock {
  id: string;
  type: "tool_call";
  toolCallId: string;                 // Original tool call ID
  toolName: string;                   // e.g., "web_search", "write_file"
  toolDisplayName: string;            // e.g., "Web Search", "Write File"
  toolType: "tool" | "subagent";
  args: Record<string, unknown>;
  argsPreview: string;                // Short preview for collapsed display
  result?: unknown;                   // Tool result (may be large)
  resultPreview?: string;             // Short preview for collapsed display
  status: "pending" | "running" | "success" | "error";
  durationMs?: number;
  startedAt?: string;
  endedAt?: string;
  error?: string;
  sequence?: number;                  // LLM output sequence for ordering
}

export interface FileRefBlock {
  id: string;
  type: "file_ref";
  fileId: string;                     // Reference to File table
  path: string;
  operation: "create" | "edit" | "read" | "delete" | "write";
  language?: string;
  contentPreview?: string;
}

export interface SubagentBlock {
  id: string;
  type: "subagent";
  subagentName: string;               // e.g., "researcher", "coder"
  subagentDisplayName: string;        // e.g., "Researcher", "Coder"
  taskDescription: string;
  status: "running" | "success" | "error";
  durationMs?: number;
  startedAt?: string;
  endedAt?: string;
  childBlocks: ContentBlock[];        // Nested tool calls within subagent
}

export interface PresignedUploadResponse {
  url: string;
  s3Key: string;
  fields: Record<string, string>;
  publicUrl?: string;     // 公开访问 URL (用于即时预览)
  attachmentId: string;   // 附件 ID (用于发送消息)
}

export interface ImageAttachment {
  id: string;             // 临时 ID (前端生成)
  attachmentId?: string;  // 服务端附件 ID (上传成功后获得)
  file: File;
  preview: string;
  status: "uploading" | "ready" | "error";
  progress?: number;
  error?: string;
  s3Key?: string;         // 保留用于兼容
  publicUrl?: string;     // 服务端返回的公开 URL
}

export interface AttachmentRef {
  type: "image";
  s3Key: string;
  mimeType: string;
  purpose: "reference_image";
  previewUrl: string;
  attachmentId?: string;  // 新增：附件 ID
}

export interface ImageBlock {
  id: string;
  type: "image";
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface CitationBlock {
  id: string;
  type: "citation";
  filename: string;
  content: string;
  contextId?: string;
  similarity?: number;
}

/** Action Card Block - 用于内容选择交互 */
export interface ActionCardBlock {
  id: string;
  type: "action_card";
  cardType: "content_selection";
  title: string;
  description: string;
  clusterName: string;
  clusterId: string;
  items: ContentItemOption[];
  actionTemplate: string;
  actionType: "generate_content";
}

/** 附件引用 Block - 用于消息历史中显示用户上传的附件 (IMAGE_UPLOAD_FRONTEND_GUIDE.md) */
export type AttachmentType = 'image' | 'document' | 'audio' | 'video' | 'data' | 'other';

export interface AttachmentRefBlock {
  id: string;
  type: "attachment_ref";
  attachmentId: string;                    // 附件 ID
  attachmentType?: AttachmentType;         // 附件类型
  mimeType?: string;                       // MIME 类型
  filename?: string;                       // 文件名
  fileSize?: number;                       // 文件大小（字节）
  purpose?: string;                        // 用途: reference_image, context, input, analysis
  previewUrl?: string;                     // 公开访问 URL（直接可用于渲染）
  metadata?: Record<string, unknown>;      // 元数据（如图片尺寸等）
}

// ToolCall 摘要（用于 message_end 事件）
export interface ToolCallSummary {
  id: string;
  name: string;
  type: "tool" | "subagent";
  status: "pending" | "running" | "success" | "error";
  argsPreview?: string;               // e.g., "url: https://..."
  resultPreview?: string;             // e.g., "38/100, Grade D"
  durationMs?: number;
  subagentName?: string;
}

export interface Message {
  id: string;
  cid?: string;                    // 所属会话
  role: MessageRole;

  // 新架构：内容块（用于正确排序显示）- WEBSOCKET_FRONTEND_GUIDE.md
  contentBlocks?: ContentBlock[];     // Ordered array for correct display

  // 内容类型
  contentType?: "json" | "markdown" | "text" | "mixed";

  // 统计信息
  blockCount?: number;
  toolCallCount?: number;
  fileRefCount?: number;
  subagentCount?: number;

  // 旧架构字段（向后兼容）
  content: string | MessageContent[] | null;  // 后端可能返回 null
  createdAt?: Date | string;
  updatedAt?: Date | string;
  // 子代理消息相关
  parentMessageId?: string;        // 父消息 ID（子代理消息）
  subagentName?: string;           // 子代理名称
  // 元数据（包含 todos 快照、citations、usage、feedback）
  metadata?: {
    model?: string;
    tokens?: number;
    contentType?: "json" | "markdown" | "text" | "mixed";
    todos?: {                      // Todos 快照
      items: Array<{
        id: string;
        content: string;
        status: 'pending' | 'in_progress' | 'completed' | 'failed';
        startedAt?: string;
        endedAt?: string;
        durationMs?: number;
        error?: string;
      }>;
      summary?: {
        total: number;
        pending: number;
        inProgress: number;
        completed: number;
        failed: number;
      };
    };
    citations?: ContextSearchResult[];  // 引用来源 (RAG)
    usage?: TokenUsageSummary;          // Token 使用量统计
    feedback?: Feedback | null;         // 用户反馈（点赞/踩）
    [key: string]: unknown;
  };
  // AI 消息可能包含工具调用
  toolCalls?: ToolCall[];          // 新格式
  tool_calls?: {                   // 兼容旧格式
    id: string;
    name: string;
    args: Record<string, unknown>;
  }[];
}

// ============ 工具调用 ============
// 根据 FRONTEND_API_GUIDE.md 定义
export type ToolCallType = 'tool' | 'subagent' | 'function';  // function 是兼容旧格式
export type ToolCallStatus = 'pending' | 'running' | 'success' | 'completed' | 'error' | 'interrupted';

export interface ToolCall {
  id: string;
  name: string;
  type?: ToolCallType;              // Type: regular tool or subagent call
  args: Record<string, unknown>;
  result?: unknown;                 // Execution result (can be any type)
  status: ToolCallStatus;
  startedAt?: string | Date;        // Start time (ISO)
  endedAt?: string | Date;          // End time (ISO)
  completedAt?: Date;               // Legacy field compatibility
  durationMs?: number;              // Execution duration (ms)
  error?: string;                   // Error message

  // LLM output sequence for ordering (WEBSOCKET_EVENTS_FRONTEND_GUIDE.md)
  sequence?: number;

  // Subagent context (FRONTEND_API_GUIDE.md)
  subagentName?: string;            // Subagent name executing this tool (null = main agent)
  targetSubagent?: string;          // Only for type='subagent': called subagent name
}

// ============ 子 Agent ============
export interface SubAgent {
  id: string;
  name: string;
  subAgentName: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: 'pending' | 'active' | 'running' | 'completed' | 'success' | 'error';
}

// ============ 任务 ============
export interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';  // 添加 in_progress 和 failed 状态
  createdAt?: Date;
  updatedAt?: Date;
  // FRONTEND_API_GUIDE.md 定义的额外字段
  startedAt?: string;              // 开始时间 (ISO)
  endedAt?: string;                // 结束时间 (ISO)
  durationMs?: number;             // 耗时（毫秒）
  error?: string;                  // 错误信息
}

// ============ 文件 ============
export interface FileItem {
  path: string;
  content?: string;                // 文本内容（对于二进制文件可能为空）
  language?: string;
  editable?: boolean;              // 是否可编辑
  lastModified?: string;           // 最后修改时间 (ISO)
  updatedAt?: Date;                // 兼容旧格式
  // 二进制文件相关
  isBinary?: boolean;              // 是否为二进制文件
  downloadUrl?: string;            // 二进制文件的下载 URL
  fileSize?: number;               // 文件大小（字节）
  // 编辑相关
  lineStart?: number;              // 编辑起始行
  lineEnd?: number;                // 编辑结束行
  oldContent?: string;             // 原内容（用于 diff 显示）
}

// ============ 中断 ============
export interface InterruptData {
  id?: string;
  value: unknown;
  reason?: string;
  ns?: string[];
  scope?: string;
  actionRequests?: ActionRequest[];
  reviewConfigs?: ReviewConfig[];
}

export interface ActionRequest {
  name: string;
  args: Record<string, unknown>;
  description?: string;
}

export interface ReviewConfig {
  actionName: string;
  allowedDecisions?: string[];
}

export interface ToolApprovalInterruptData {
  action_requests: ActionRequest[];
  review_configs?: ReviewConfig[];
}

// ============ 分页相关 (WEBSOCKET_FRONTEND_GUIDE.md) ============
export interface PaginationInfo {
  totalCount: number;          // Total messages in conversation
  hasMore: boolean;            // True if older messages exist
  nextCursor: string | null;   // Message ID for loading older messages
  limit: number;               // Initial limit used
}

// ============ 消息重试 Turn 相关 (WEBSOCKET_FRONTEND_GUIDE.md) ============
export type TurnStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

export type TurnErrorCode =
  | "rate_limit"
  | "context_overflow"
  | "content_filter"
  | "auth_error"
  | "quota_exceeded"
  | "bad_request"
  | "internal_server_error"
  | "api_connection_error"
  | "api_timeout_error"
  | "database_error"
  | "unknown";

export interface TurnResponse {
  id: string;                      // This is the turn_id
  cid: string;
  userMessageId: string | null;
  assistantMessageId: string | null;
  userInputPreview: string | null;  // Sanitized preview of user input
  status: TurnStatus;
  errorCode: TurnErrorCode | null;
  errorMessage: string | null;
  partialContent: string | null;
  contentPreserved: boolean;
  retryCount: number;
  maxRetries: number;              // Default: 3
  canRetry: boolean;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  tokensUsed: Record<string, number> | null;
  createdAt: string;
}

export interface FailedTurnsResponse {
  turns: TurnResponse[];
  retryableCount: number;
}

// ============ 流式事件类型 ============
// 基于 WEBSOCKET_FRONTEND_GUIDE.md 和 STRUCTURED_CONTENT_FRONTEND_GUIDE.md 定义
export type StreamEventType =
  // 连接相关
  | 'connected'          // 连接确认
  | 'pong'               // 心跳响应
  // 连接管理事件 (STRUCTURED_CONTENT_FRONTEND_GUIDE.md)
  | 'session_replaced'   // 被其他连接踢掉
  | 'session_expired'    // Session 过期 (SESSION_EXPIRATION_FRONTEND_GUIDE.md)
  | 'force_logout'       // 强制登出
  | 'rate_limited'       // 连接频率限制
  // 初始状态（连接成功后立即收到）
  | 'state'              // 兼容旧格式
  | 'state_update'       // 完整会话状态
  // 消息相关
  | 'message_start'      // 新消息开始
  | 'message_delta'      // 流式内容增量
  | 'content_delta'      // 兼容旧格式
  | 'message_end'        // 消息结束（包含完整内容和 metadata）
  | 'message_complete'   // 兼容旧格式
  | 'token'              // 兼容旧格式
  // 工具调用相关
  | 'tool_call_start'    // 工具调用开始
  | 'tool_call_args_delta' // 兼容旧格式
  | 'tool_call_result'   // 工具调用结果
  | 'tool_call_end'      // 兼容旧格式
  // 子代理相关
  | 'subagent_start'     // 子代理开始
  | 'subagent_update'    // 兼容旧格式
  | 'subagent_end'       // 子代理结束
  // 状态更新
  | 'todo_update'        // 兼容旧格式
  | 'todos_update'       // 兼容旧格式
  | 'todos_updated'      // Todos 更新
  | 'file_update'        // 兼容旧格式
  | 'file_operation'     // 文件操作
  // 重试相关 (新增)
  | 'retry_started'      // 重试开始
  // 进度通知相关 (PROGRESS_EVENTS_FRONTEND_GUIDE.md)
  | 'tool_progress'      // 工具执行进度（长时间运行工具）
  | 'tool_retry'         // 工具网络重试
  | 'model_retry'        // LLM 模型调用重试
  // 内容相关 (STRUCTURED_CONTENT_FRONTEND_GUIDE.md)
  | 'content_saved'      // 结构化内容已保存
  | 'content_rendered'   // 预览 HTML 已生成
  | 'content_published'  // 内容已发布
  // 中断和错误
  | 'interrupt'          // 中断（人机交互）
  | 'error'              // 错误
  | 'done';              // 请求完成

export interface StreamEvent<T = unknown> {
  type: StreamEventType;
  data: T;
  timestamp?: number;
}

// 具体事件数据类型

// Session 过期事件数据 (SESSION_EXPIRATION_FRONTEND_GUIDE.md)
export interface SessionExpiredEventData {
  message: string;
}

// 初始状态事件（连接成功后立即收到）
export interface StateEventData {
  conversation: Conversation;
  messages: Message[];
}

export interface MessageStartEventData {
  messageId: string;
  role: MessageRole;
  parentMessageId?: string;   // 如果是子代理消息
  subagentName?: string;      // 子代理名称
}

// content_delta 和 message_delta 使用相同的数据结构
export interface MessageDeltaEventData {
  messageId: string;
  delta: string;
}
export type ContentDeltaEventData = MessageDeltaEventData;

export interface MessageEndEventData {
  messageId: string;
  content?: string;
  // WEBSOCKET_FRONTEND_GUIDE.md：message_end 里会带格式化后的 toolCalls / metadata
  toolCalls?: ToolCallSummary[];
  metadata?: {
    contentType?: "json" | "markdown" | "text" | "mixed";
    usage?: TokenUsageSummary;
    todos?: TodosSnapshot;
    [key: string]: unknown;
  };
  // 部分后端会直接返回完整 message（包含所有 toolCalls、contentBlocks 和 metadata）
  message?: Message;
}

export interface ToolCallStartEventData {
  /** Associated message ID */
  messageId?: string;

  toolCall?: {
    id: string;
    name: string;
    type: 'function' | 'subagent';
    arguments?: Record<string, unknown>;
    startedAt?: string;
    status?: 'running';
    /** Tool display name */
    displayName?: string;
    display_name?: string;
    /** LLM output sequence (for ordering) */
    sequence?: number;
  };

  /**
   * Flat format compatibility:
   * toolCallId / toolName / args
   */
  toolCallId?: string;
  toolName?: string;
  /** Tool display name - from backend tool_handler.py */
  displayName?: string;
  /** Tool display name - other format compatibility */
  toolDisplayName?: string;
  display_name?: string;
  type?: 'function' | 'subagent';       // Legacy field: function or subagent
  toolType?: 'tool' | 'subagent';       // Legacy field: tool/subagent
  args?: Record<string, unknown>;       // Legacy field: arguments
  startedAt?: string;                   // Start time (ISO)
  status?: 'running';

  /** LLM output sequence for ordering tool calls (WEBSOCKET_EVENTS_FRONTEND_GUIDE.md) */
  sequence?: number;

  /** Subagent context */
  subagentName?: string;                // If running within a subagent
  targetSubagent?: string;              // For task() calls
}

// tool_call_end 和 tool_call_result 使用相同的数据结构
export interface ToolCallResultEventData {
  messageId?: string;
  toolCallId: string;
  toolName?: string;          // 工具名称
  result: unknown;            // 格式化的结果（用于显示）
  endedAt?: string;           // 结束时间 (ISO)
  durationMs?: number;        // 执行耗时（毫秒）
  status?: 'success' | 'error' | 'completed' | 'failed';
  error?: string;
}
export type ToolCallEndEventData = ToolCallResultEventData;

// 子代理开始事件（WEBSOCKET_FRONTEND_GUIDE.md 格式）
export interface SubAgentStartEventData {
  messageId?: string;
  subagentName: string;       // 注意：小写 a
  taskDescription: string;
}

// 子代理结束事件（WEBSOCKET_FRONTEND_GUIDE.md 格式）
export interface SubAgentEndEventData {
  messageId?: string;
  subagentName: string;
  status: 'success' | 'error';
}

// 兼容旧格式
export interface LegacySubAgentStartEventData {
  subAgentId: string;
  subAgentName: string;
  input: Record<string, unknown>;
}

export interface LegacySubAgentEndEventData {
  subAgentId: string;
  output?: Record<string, unknown>;
  error?: string;
}

// Todos 快照（嵌入在消息的 metadata 中）
export interface TodosSnapshot {
  items: TodoItem[];
  summary: TodosSummary;
}

export interface TodosSummary {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
}

// todos_update 事件数据
export interface TodosUpdateEventData {
  messageId: string;
  todos: TodosSnapshot;
}

// 兼容旧格式
export interface TodoUpdateEventData {
  todos: TodoItem[];
}

export interface FileUpdateEventData {
  path: string;
  content: string;
  language?: string;
}

// file_operation 事件数据 (FRONTEND_API_GUIDE.md)
export type FileOperationType = 'write' | 'edit' | 'read' | 'delete';

export interface FileOperationEventData {
  operation: FileOperationType;
  path: string;                    // 文件路径
  content?: string;                // 文件内容（write/edit/read 时）
  language: string;                // 语言类型（用于语法高亮）
  toolCallId: string;              // 关联的工具调用 ID
  editable: boolean;               // 是否可编辑（write/edit 为 true）
  lineStart?: number;              // 编辑起始行（edit 时）
  lineEnd?: number;                // 编辑结束行（edit 时）
  oldContent?: string;             // 原内容（edit 时，用于 diff 显示）
}

export interface InterruptEventData {
  interruptId: string;
  reason: string;
  actionRequests?: ActionRequest[];
  reviewConfigs?: ReviewConfig[];
  value?: unknown;
}

export interface StateUpdateEventData {
  messages?: Message[];
  todos?: TodoItem[];
  files?: Record<string, string | FileItem>;
  pagination?: PaginationInfo;  // 分页信息 (WEBSOCKET_FRONTEND_GUIDE.md)
}

// 重试开始事件数据 (WEBSOCKET_FRONTEND_GUIDE.md)
export interface RetryStartedEventData {
  turnId: string;       // Turn being retried
  attempt: number;      // Current attempt number (1-3)
  maxRetries: number;   // Maximum retries allowed
}

// ============ 结构化内容事件数据 (STRUCTURED_CONTENT_FRONTEND_GUIDE.md) ============

/** content_saved 事件数据 - 结构化内容已保存到数据库 */
export interface ContentSavedEventData {
  item_id: string;           // Content Item UUID
  title: string;             // 内容标题
  page_type: string;         // "blog" | "listicle" | "comparison" | "guide" | "landing"
  status: string;            // "draft"
  content_version: number;   // 版本号
  action: 'structured_content_generated';
}

/** content_rendered 事件数据 - 预览 HTML 已生成 */
export interface ContentRenderedEventData {
  item_id: string;           // Content Item UUID
  title: string;             // 内容标题
  page_type: string;         // 页面类型
  preview_url: string;       // 预览 URL: /api/content/{item_id}/preview
  html_length: number;       // 生成的 HTML 长度
  action: 'preview_ready';
}

/** content_published 事件数据 - 内容已发布 */
export interface ContentPublishedEventData {
  item_id: string;           // Content Item UUID
  title: string;             // 内容标题
  page_type: string;         // 页面类型
  status: 'published';       // 固定为 "published"
  html_length: number;       // 生成的 HTML 长度
  published_at: string;      // ISO 时间戳
  action: 'content_published';
}

// 重试相关错误码
export type RetryErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "INVALID_REQUEST"
  | "RETRY_LIMIT_EXCEEDED"
  | "MESSAGE_NOT_FOUND"
  | "RETRY_FAILED"
  | "CONVERSATION_BUSY";

// ============ 进度通知事件数据 (PROGRESS_EVENTS_FRONTEND_GUIDE.md) ============

/** 工具执行进度状态 */
export type ToolProgressStatus = "running" | "completed";

/** tool_progress 事件数据 - 长时间运行工具的进度通知 */
export interface ToolProgressEventData {
  toolName: string;                    // 工具代码名 (e.g., "generate_images")
  displayName: string;                 // 用户友好名称 (e.g., "Generate Images")
  toolCallId: string;                  // 工具调用 ID
  status: ToolProgressStatus;          // 状态: running | completed
  elapsed_ms: number;                  // 已执行时间（毫秒）
  message?: string;                    // 可选消息，如 "Generate Images is still running..."
}

/** tool_retry 事件数据 - 工具网络重试通知 */
export interface ToolRetryEventData {
  toolName: string;                    // 工具代码名 (e.g., "web_search")
  displayName: string;                 // 用户友好名称 (e.g., "Web Search")
  toolCallId: string;                  // 工具调用 ID
  attempt: number;                     // 当前重试次数 (1-based)
  maxRetries: number;                  // 最大重试次数
  delay: number;                       // 重试延迟（秒）
  error: string;                       // 错误摘要（截断至 200 字符）
}

/** model_retry 事件数据 - LLM 模型调用重试通知 */
export interface ModelRetryEventData {
  attempt: number;                     // 当前重试次数
  maxRetries: number;                  // 最大重试次数
  delay: number;                       // 重试延迟（秒）
  error: string;                       // 错误摘要
}

// ============ 进度状态管理类型 (PROGRESS_EVENTS_FRONTEND_GUIDE.md) ============

/** 工具进度信息（用于 UI 显示） */
export interface ToolProgress {
  toolName: string;                    // 工具代码名
  displayName: string;                 // 用户友好名称（用于 UI 显示）
  toolCallId: string;
  status: ToolProgressStatus;
  elapsedMs: number;
  message?: string;
  // 重试信息（可选）
  retryAttempt?: number;
  maxRetries?: number;
  retryError?: string;
}

/** 模型重试信息 */
export interface ModelRetryInfo {
  attempt: number;
  maxRetries: number;
  delay: number;
  error?: string;
}

export interface ErrorEventData {
  message: string;
  code?: string;
  details?: unknown;
}

// ============ API 响应类型 ============
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface LoginResponse {
  token: string;
  sessionToken?: string;
  user: User;
  settings: UserSettings;
  isAdmin?: boolean;  // 是否是管理员
}

export interface ConversationDetailResponse extends Conversation {
  messages: Message[];
  todos?: TodoItem[];
  files?: Record<string, string>;
}

// ============ Context (RAG) 相关 ============

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
  downloadUrl?: string; // S3 公开下载链接
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

/** Token 使用量统计 */
export interface TokenUsageSummary {
  totalTokens: number;           // 总 token 数
  promptTokens: number;          // 输入 token 数
  completionTokens: number;      // 输出 token 数
  totalCost: number;             // 总成本（USD）
  callCount: number;             // LLM 调用次数
  byModel?: Record<string, ModelUsage>;   // 按模型分组
  bySource?: Record<string, SourceUsage>; // 按来源分组
}

export interface ModelUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  callCount: number;
}

export interface SourceUsage {
  totalTokens: number;
  cost: number;
  callCount: number;
}

// ============ Project 相关 ============

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

/** URL 验证请求 */
export interface ValidateUrlRequest {
  url: string;
}

/** URL 验证响应 */
export interface ValidateUrlResponse {
  inputUrl: string;       // 原始输入
  normalizedUrl: string;  // 标准化后的 URL
  isValid: boolean;       // 是否有效
  reachable: boolean;     // 是否可访问
  statusCode: number;     // HTTP 状态码
  finalUrl: string;       // 最终 URL（可能重定向）
  error?: string;         // 错误信息
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



/** 允许的图片 MIME 类型 */
export const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
] as const;

export type AllowedImageType = typeof ALLOWED_IMAGE_TYPES[number];

/** 图片大小限制 (10MB) */
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;


