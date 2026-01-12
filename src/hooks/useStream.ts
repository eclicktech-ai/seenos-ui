"use client";

import { useEffect, useCallback, useRef, useMemo, useReducer } from "react";
import { WebSocketStream, type InterruptDecision, type ConnectionState } from "@/lib/stream/websocket";
import { apiClient } from "@/lib/api/client";
import type {
  Message,
  MessageContent,
  ToolCall,
  TodoItem,
  FileItem,
  InterruptData,
  StreamEvent,
  MessageStartEventData,
  MessageEndEventData,
  ToolCallStartEventData,
  ToolCallResultEventData,
  FileOperationEventData,
  PaginationInfo,
  TurnResponse,
  RetryStartedEventData,
  ContentBlock,
  TextBlock,
  ToolCallBlock,
  SubagentBlock,
  FileRefBlock,
  AttachmentRefBlock,
  ToolCallSummary,
  SubAgentStartEventData,
  SubAgentEndEventData,
  ActionCardBlock,
  ActionCardResult,
  ContentItemOption,
  // Structured content event types (STRUCTURED_CONTENT_FRONTEND_GUIDE.md)
  ContentSavedEventData,
  ContentRenderedEventData,
  ContentPublishedEventData,
  // Progress notification event types (PROGRESS_EVENTS_FRONTEND_GUIDE.md)
  ToolProgressEventData,
  ToolRetryEventData,
  ModelRetryEventData,
} from "@/types";

// ============ Configuration ============

function getWsUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }

  const apiBaseUrl = apiClient.getBaseUrl();
  const baseWithoutApi = apiBaseUrl.replace(/\/api$/, '');
  const wsUrl = baseWithoutApi
    .replace(/^https:/, "wss:")
    .replace(/^http:/, "ws:");

  return `${wsUrl}/ws/chat`;
}

// ============ 类型定义 ============

export type StreamTransport = "websocket" | "sse";

interface UseStreamOptions {
  cid: string | null;
  token: string;
  sessionToken?: string | null;
  transport?: StreamTransport;
  wsUrl?: string;
  enabled?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onMessageComplete?: (message: Message) => void;
  onFileOperation?: (data: FileOperationEventData) => void;
  onDone?: () => void;
  // 进度事件回调 (PROGRESS_EVENTS_FRONTEND_GUIDE.md)
  onToolProgress?: (data: ToolProgressEventData) => void;
  onToolRetry?: (data: ToolRetryEventData) => void;
  onModelRetry?: (data: ModelRetryEventData) => void;
}

// ============ State 类型 ============

interface StreamState {
  messages: Message[];
  toolCalls: Map<string, ToolCall>;
  todos: TodoItem[];
  files: Record<string, FileItem>;
  interrupt: InterruptData | null;
  connectionState: ConnectionState;
  isLoading: boolean;
  error: Error | null;
  isServerReady: boolean;  // 跟踪服务端是否已确认连接
  // 新增：分页相关 (WEBSOCKET_FRONTEND_GUIDE.md)
  pagination: PaginationInfo | null;
  // 新增：重试相关 (WEBSOCKET_FRONTEND_GUIDE.md)
  retryingTurnId: string | null;
  retryAttempt: number;
}

const initialState: StreamState = {
  messages: [],
  toolCalls: new Map(),
  todos: [],
  files: {},
  interrupt: null,
  connectionState: 'disconnected',
  isLoading: false,
  error: null,
  isServerReady: false,
  pagination: null,
  retryingTurnId: null,
  retryAttempt: 0,
};

// ============ Actions ============

type StreamAction =
  | { type: 'SET_CONNECTION_STATE'; state: ConnectionState }
  | { type: 'SET_SERVER_READY'; isReady: boolean }
  | { type: 'SET_ERROR'; error: Error | null }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'RESET' }
  | { type: 'RESET_CONVERSATION' }  // 只重置会话，保留连接
  | { type: 'SET_INITIAL_STATE'; messages: Message[]; todos: TodoItem[]; files: Record<string, string | FileItem>; pagination?: PaginationInfo | null }
  | { type: 'PREPEND_MESSAGES'; messages: Message[]; pagination: PaginationInfo }
  | { type: 'ADD_USER_MESSAGE'; messageId: string; content: string; cid: string; attachments?: Array<{ type: 'image' | 'file'; s3Key: string; mimeType: string; purpose?: string; previewUrl?: string; attachmentId?: string }> }
  | { type: 'MESSAGE_START'; messageId: string; cid: string; role: string; parentMessageId?: string; subagentName?: string }
  | { type: 'MESSAGE_DELTA'; messageId: string; delta: string }
  | { type: 'MESSAGE_END'; messageId: string; content?: string; message?: Message }
  | { type: 'TOOL_CALL_START'; toolCall: ToolCall; messageId?: string; toolDisplayName?: string }
  | { type: 'TOOL_CALL_END'; toolCallId: string; messageId?: string; result: unknown; status: ToolCall['status']; endedAt?: string; durationMs?: number; error?: string }
  | { type: 'SUBAGENT_START'; messageId?: string; subagentName: string; subagentDisplayName?: string; taskDescription: string }
  | { type: 'SUBAGENT_END'; messageId?: string; subagentName: string; status: 'success' | 'error'; durationMs?: number }
  | { type: 'TODOS_UPDATE'; todos: TodoItem[] }
  | {
    type: 'FILE_OPERATION';
    messageId?: string;
    operation: string;
    path: string;
    content?: string;
    language?: string;
    editable?: boolean;
    toolCallId?: string;
    lineStart?: number;
    lineEnd?: number;
    oldContent?: string;
    // 二进制文件支持
    isBinary?: boolean;
    downloadUrl?: string;
    fileSize?: number;
  }
  | { type: 'SET_INTERRUPT'; interrupt: InterruptData | null }
  | { type: 'RETRY_STARTED'; turnId: string; attempt: number; maxRetries: number }
  | { type: 'RETRY_COMPLETED' }
  | { type: 'RETRY_FAILED'; error: Error };

// ============ 辅助函数 ============

/**
 * 从 toolCalls 和 content 构建 contentBlocks
 * 用于将旧格式消息转换为新的 contentBlocks 格式
 * 
 * 注意：对于历史消息，我们无法完美重建时间顺序。
 * 策略：根据工具调用的 startedAt 时间戳排序，文本内容放在最后（通常是总结）
 */
function buildContentBlocksFromMessage(
  msgId: string,
  content: string | MessageContent[] | null | undefined,
  toolCalls: ToolCall[]
): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  // 过滤并排序工具调用
  const filteredToolCalls = toolCalls
    .filter(tc => !tc.name?.includes('todo'))
    .sort((a, b) => {
      // 按 startedAt 时间排序
      const aTime = a.startedAt ? new Date(a.startedAt as string).getTime() : 0;
      const bTime = b.startedAt ? new Date(b.startedAt as string).getTime() : 0;
      return aTime - bTime;
    });

  // 添加工具调用块
  filteredToolCalls.forEach((tc, idx) => {
    const toolCallBlock: ToolCallBlock = {
      id: `tc-${tc.id || `${msgId}-${idx}`}`,
      type: 'tool_call',
      toolCallId: tc.id,
      toolName: tc.name,
      toolDisplayName: tc.name,
      toolType: tc.type === 'subagent' ? 'subagent' : 'tool',
      args: tc.args || {},
      argsPreview: JSON.stringify(tc.args || {}).slice(0, 50),
      result: tc.result,
      resultPreview: tc.result ? JSON.stringify(tc.result).slice(0, 100) : undefined,
      status: (tc.status === 'completed' || tc.status === 'success') ? 'success' :
        tc.status === 'error' ? 'error' :
          tc.status === 'running' ? 'running' : 'pending',
      durationMs: tc.durationMs,
      startedAt: typeof tc.startedAt === 'string' ? tc.startedAt : undefined,
      endedAt: typeof tc.endedAt === 'string' ? tc.endedAt : undefined,
      error: tc.error,
    };
    blocks.push(toolCallBlock);
  });

  // 处理 content：可能是字符串或数组
  if (Array.isArray(content)) {
    // 从数组中提取附件和文本
    content.forEach((item, idx) => {
      if (item && typeof item === 'object') {
        // 处理 image_url 类型的附件
        if (item.type === 'image_url' && item.image_url?.url) {
          const attachmentBlock: AttachmentRefBlock = {
            id: `attachment-${msgId}-${idx}`,
            type: 'attachment_ref',
            attachmentId: item.image_url.url, // 使用 URL 作为 ID
            attachmentType: 'image',
            mimeType: 'image/jpeg', // 默认，无法从 URL 准确判断
            previewUrl: item.image_url.url, // ⭐ 关键：设置 previewUrl
          };
          blocks.push(attachmentBlock);
        }
        // 处理文档类型的附件（如 docx、pdf 等）
        // 格式可能是: { type: 'file', file_url: { url: '...' }, mime_type: '...' }
        else if (item.type === 'file' && (item as { file_url?: { url: string } }).file_url?.url) {
          const fileItem = item as { file_url: { url: string }; mime_type?: string; filename?: string };
          const url = fileItem.file_url.url;
          const mimeType = fileItem.mime_type || 'application/octet-stream';

          // 根据 mimeType 判断附件类型
          const getAttachmentType = (mime: string): 'image' | 'document' | 'audio' | 'video' | 'data' | 'other' => {
            if (mime.startsWith('image/')) return 'image';
            if (mime.startsWith('audio/')) return 'audio';
            if (mime.startsWith('video/')) return 'video';
            if (mime.includes('pdf') || mime.includes('document') || mime.includes('word') || mime.includes('text')) return 'document';
            if (mime.includes('json') || mime.includes('csv') || mime.includes('xml') || mime.includes('spreadsheet') || mime.includes('excel')) return 'data';
            return 'other';
          };

          const attachmentBlock: AttachmentRefBlock = {
            id: `attachment-${msgId}-${idx}`,
            type: 'attachment_ref',
            attachmentId: url,
            attachmentType: getAttachmentType(mimeType),
            mimeType: mimeType,
            filename: fileItem.filename,
            previewUrl: url, // ⭐ 关键：设置 previewUrl
          };
          blocks.push(attachmentBlock);
        }
        // 处理文本类型
        else if (item.type === 'text' && item.text) {
          const textBlock: TextBlock = {
            id: `text-${msgId}-${idx}`,
            type: 'text',
            content: item.text,
          };
          blocks.push(textBlock);
        }
      }
    });
  } else if (content && typeof content === 'string' && content.trim()) {
    // 字符串内容：添加文本块 - 对于历史消息，文本通常是最终总结，放在最后
    const textBlock: TextBlock = {
      id: `text-${msgId}-final`,
      type: 'text',
      content: content,
    };
    blocks.push(textBlock);
  }

  return blocks;
}

// ============ Reducer ============

function streamReducer(state: StreamState, action: StreamAction): StreamState {
  switch (action.type) {
    case 'SET_CONNECTION_STATE':
      // 如果断开连接，同时重置 isServerReady
      if (action.state === 'disconnected') {
        return { ...state, connectionState: action.state, isServerReady: false };
      }
      return { ...state, connectionState: action.state };

    case 'SET_SERVER_READY':
      return { ...state, isServerReady: action.isReady };

    case 'SET_ERROR':
      return { ...state, error: action.error };

    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading };

    case 'RESET':
      // 完全重置，包括连接状态
      return { ...initialState, isServerReady: false };

    case 'RESET_CONVERSATION':
      // 只重置会话相关状态，保留连接状态
      return {
        ...state,
        messages: [],
        toolCalls: new Map(),
        todos: [],
        files: {},
        interrupt: null,
        isLoading: false,
        error: null,
        pagination: null,
        retryingTurnId: null,
        retryAttempt: 0,
        // 保留 connectionState 和 isServerReady
      };

    case 'SET_INITIAL_STATE': {
      // 规范化消息格式，包括 tool_calls -> toolCalls 的转换
      const normalizedMessages = action.messages.map(msg => {
        // 处理 tool_calls 到 toolCalls 的转换
        // 后端可能返回 ToolCallSummary 格式（只有 argsPreview/resultPreview）
        const rawToolCalls = (msg as { tool_calls?: ToolCall[] }).tool_calls || msg.toolCalls;
        const toolCalls = rawToolCalls?.map(tc => {
          // 处理后端返回的 ToolCallSummary 格式
          const tcAny = tc as ToolCall & {
            argsPreview?: string;
            resultPreview?: string;
          };

          // 处理 args：如果没有完整的 args，使用 argsPreview
          let args = tc.args;
          if (!args || Object.keys(args).length === 0) {
            if (tcAny.argsPreview) {
              // 将 argsPreview 包装成对象，方便后续处理
              args = { _preview: tcAny.argsPreview };
            } else {
              args = {};
            }
          }

          // 处理 result：如果没有完整的 result，使用 resultPreview
          let result = tc.result;
          if (result === undefined || result === null) {
            if (tcAny.resultPreview) {
              // 将 resultPreview 包装成对象，方便后续处理
              result = { _preview: tcAny.resultPreview };
            }
          }

          return {
            ...tc,
            // 确保 status 有默认值
            status: tc.status || 'completed',
            args,
            result,
          };
        }) || [];

        // 获取消息内容
        const contentStr = typeof msg.content === 'string' ? msg.content :
          Array.isArray(msg.content) ? msg.content.map(c => c.text || '').join('') : '';

        // 为旧消息构建 contentBlocks（如果没有）
        const role = msg.role || (msg as { type?: string }).type || 'assistant';
        let contentBlocks = msg.contentBlocks;

        if (!contentBlocks || contentBlocks.length === 0) {
          // 用户消息不需要 contentBlocks，只有 assistant/ai 消息需要
          if (role === 'assistant' || (role as string) === 'ai') {
            contentBlocks = buildContentBlocksFromMessage(msg.id, contentStr, toolCalls);
          }
        }

        return {
          ...msg,
          role,
          content: contentStr,
          toolCalls,
          contentBlocks,
        };
      });

      // 从最新消息提取 todos
      let currentTodos = action.todos;
      if (currentTodos.length === 0) {
        for (let i = normalizedMessages.length - 1; i >= 0; i--) {
          const todos = normalizedMessages[i].metadata?.todos;
          if (todos?.items) {
            currentTodos = todos.items;
            break;
          }
        }
      }

      // 转换 files - 首先从 action.files 获取
      const files: Record<string, FileItem> = {};
      for (const [path, content] of Object.entries(action.files)) {
        // 支持多种格式：字符串、FileItem 对象、或包含 content 的对象
        if (typeof content === 'string') {
          // 旧格式：直接是字符串内容
          files[path] = {
            path,
            content,
            language: 'text',
            editable: true,
          };
        } else if (content && typeof content === 'object') {
          // 新格式：FileItem 对象或包含文件信息的对象
          const contentObj = content as FileItem | Record<string, unknown>;

          // 检查是否已经是 FileItem 格式（有 path 字段）
          if ('path' in contentObj && typeof contentObj.path === 'string') {
            // 已经是 FileItem 格式，直接使用
            files[path] = contentObj as FileItem;
          } else {
            // 需要转换的对象格式
            let fileContent: string | undefined;
            let language = 'text';

            // 尝试从不同字段获取内容
            if (typeof contentObj.content === 'string') {
              fileContent = contentObj.content;
            } else if (Array.isArray(contentObj.content)) {
              fileContent = contentObj.content.join('\n');
            }

            if (typeof contentObj.language === 'string') {
              language = contentObj.language;
            }

            // 检查是否是二进制文件
            const isBinary = contentObj.isBinary === true || contentObj.downloadUrl !== undefined;

            files[path] = {
              path,
              content: fileContent,
              language,
              editable: !isBinary, // 二进制文件不可编辑
              isBinary: isBinary ? true : undefined,
              downloadUrl: typeof contentObj.downloadUrl === 'string' ? contentObj.downloadUrl : undefined,
              fileSize: typeof contentObj.fileSize === 'number' ? contentObj.fileSize : undefined,
            };
          }
        }
      }

      // 从历史消息的 tool_calls 中提取文件
      // 支持多种格式:
      // 1. result.files: { "/path": { content: "...", language: "..." } }
      // 2. result.result.files: 同上
      // 3. write_file 工具: 从 args.file_path 和 args.content 提取
      for (const msg of normalizedMessages) {
        // 使用类型断言来处理不同的 tool_calls 格式
        const toolCalls = (msg.toolCalls || msg.tool_calls) as Array<{
          id?: string;
          name?: string;
          args?: Record<string, unknown>;
          result?: unknown;
          status?: string;
        }> | undefined;

        if (toolCalls && Array.isArray(toolCalls)) {
          for (const tc of toolCalls) {
            // 处理 write_file 工具调用 - 从 args 中提取文件信息
            if (tc.name === 'write_file' && tc.args && (tc.status === 'success' || tc.status === 'completed')) {
              const filePath = tc.args.file_path as string | undefined;
              const content = tc.args.content as string | undefined;
              if (filePath && content) {
                // 根据文件扩展名推断语言
                const ext = filePath.split('.').pop()?.toLowerCase() || '';
                const languageMap: Record<string, string> = {
                  'md': 'markdown',
                  'js': 'javascript',
                  'ts': 'typescript',
                  'tsx': 'typescript',
                  'jsx': 'javascript',
                  'py': 'python',
                  'json': 'json',
                  'html': 'html',
                  'css': 'css',
                  'yaml': 'yaml',
                  'yml': 'yaml',
                };
                files[filePath] = {
                  path: filePath,
                  content,
                  language: languageMap[ext] || 'text',
                  editable: true,
                };
              }
            }

            // 处理其他格式的文件结果
            const result = tc.result as Record<string, unknown> | null | undefined;
            if (result && typeof result === 'object') {
              // 尝试从 result.files 或 result.result.files 获取
              const filesData = (result.files || (result.result as Record<string, unknown>)?.files) as Record<string, unknown> | undefined;
              if (filesData && typeof filesData === 'object') {
                for (const [filePath, fileData] of Object.entries(filesData)) {
                  if (fileData && typeof fileData === 'object') {
                    const file = fileData as Record<string, unknown>;
                    if (file.content && typeof file.content === 'string') {
                      files[filePath] = {
                        path: filePath,
                        content: file.content,
                        language: typeof file.language === 'string' ? file.language : 'text',
                        editable: true,
                      };
                    }
                  }
                }
              }
            }
          }
        }
      }

      return {
        ...state,
        messages: normalizedMessages,
        todos: currentTodos,
        files,
        toolCalls: new Map(),
        pagination: action.pagination || null,
      };
    }

    // 新增：加载历史消息（分页）
    case 'PREPEND_MESSAGES': {
      // 将旧消息添加到列表开头，并构建 contentBlocks
      const normalizedOldMessages = action.messages.map(msg => {
        const rawToolCalls = (msg as { tool_calls?: ToolCall[] }).tool_calls || msg.toolCalls;
        const toolCalls = rawToolCalls?.map(tc => ({
          ...tc,
          status: tc.status || 'completed',
          args: tc.args || {},
        })) || [];

        const role = msg.role || (msg as { type?: string }).type || 'assistant';
        const contentStr = typeof msg.content === 'string' ? msg.content :
          Array.isArray(msg.content) ? msg.content.map(c => c.text || '').join('') : '';

        // 构建 contentBlocks（如果没有）
        let contentBlocks = msg.contentBlocks;
        if (!contentBlocks || contentBlocks.length === 0) {
          // 只有 assistant/ai 消息需要 contentBlocks
          if (role === 'assistant' || (role as string) === 'ai') {
            contentBlocks = buildContentBlocksFromMessage(msg.id, contentStr, toolCalls);
          }
        }

        return {
          ...msg,
          role,
          content: contentStr,
          toolCalls,
          contentBlocks,
        };
      });

      return {
        ...state,
        messages: [...normalizedOldMessages, ...state.messages],
        pagination: action.pagination,
      };
    }

    case 'ADD_USER_MESSAGE': {
      // 构建 contentBlocks：文本 + 附件
      const contentBlocks: ContentBlock[] = [];

      // 添加文本 block（如果有内容）
      if (action.content && action.content.trim()) {
        const textBlock: TextBlock = {
          id: `text-${action.messageId}`,
          type: 'text',
          content: action.content,
        };
        contentBlocks.push(textBlock);
      }

      // 添加附件 blocks (IMAGE_UPLOAD_FRONTEND_GUIDE.md)
      if (action.attachments && action.attachments.length > 0) {
        action.attachments.forEach((att, idx) => {
          // 根据 mimeType 判断附件类型
          const getAttachmentType = (mimeType: string): 'image' | 'document' | 'audio' | 'video' | 'data' | 'other' => {
            if (mimeType.startsWith('image/')) return 'image';
            if (mimeType.startsWith('audio/')) return 'audio';
            if (mimeType.startsWith('video/')) return 'video';
            if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'document';
            if (mimeType.includes('json') || mimeType.includes('csv') || mimeType.includes('xml')) return 'data';
            return 'other';
          };

          const attachmentBlock: AttachmentRefBlock = {
            id: `attachment-${action.messageId}-${idx}`,
            type: 'attachment_ref',
            attachmentId: att.attachmentId || att.s3Key, // 优先使用 attachmentId，否则回退到 s3Key
            attachmentType: getAttachmentType(att.mimeType),
            mimeType: att.mimeType,
            purpose: att.purpose,
            previewUrl: att.previewUrl, // 本地预览 URL
          };
          contentBlocks.push(attachmentBlock);
        });
      }

      const userMessage: Message = {
        id: action.messageId,
        cid: action.cid,
        role: 'user',
        content: action.content,
        contentBlocks: contentBlocks.length > 0 ? contentBlocks : undefined,
        createdAt: new Date(),
      };
      return {
        ...state,
        messages: [...state.messages, userMessage],
      };
    }

    case 'MESSAGE_START': {
      console.log('[Reducer] MESSAGE_START:', action.messageId);
      const newMessage: Message = {
        id: action.messageId,
        cid: action.cid,
        role: action.role as Message['role'],
        content: '',
        createdAt: new Date(),
        parentMessageId: action.parentMessageId,
        subagentName: action.subagentName,
        // 初始化 contentBlocks 为空数组
        contentBlocks: [],
      };
      return {
        ...state,
        isLoading: true,
        messages: [...state.messages, newMessage],
      };
    }

    case 'MESSAGE_DELTA': {
      // 获取当前消息的 blocks 用于日志
      const currentMsg = state.messages.find(m => m.id === action.messageId);
      console.log('[Reducer] MESSAGE_DELTA:', action.messageId, 'existing blocks:', currentMsg?.contentBlocks?.length || 0, 'delta:', action.delta.slice(0, 30));
      return {
        ...state,
        messages: state.messages.map(msg => {
          if (msg.id !== action.messageId) return msg;

          // 更新 content（兼容）
          const newContent = (typeof msg.content === 'string' ? msg.content : '') + action.delta;

          // 更新 contentBlocks - 追加到最后一个 TextBlock 或创建新的
          const blocks = msg.contentBlocks || [];
          const lastBlock = blocks[blocks.length - 1];

          let newBlocks: ContentBlock[];
          if (lastBlock && lastBlock.type === 'text') {
            // 更新最后一个 TextBlock
            newBlocks = [
              ...blocks.slice(0, -1),
              { ...lastBlock, content: lastBlock.content + action.delta }
            ];
          } else {
            // 创建新的 TextBlock
            const textBlock: TextBlock = {
              id: `text-${msg.id}-${blocks.length}`,
              type: 'text',
              content: action.delta,
            };
            newBlocks = [...blocks, textBlock];
          }

          return { ...msg, content: newContent, contentBlocks: newBlocks };
        }),
      };
    }

    case 'MESSAGE_END': {
      // 日志：查看 MESSAGE_END 时的 contentBlocks 状态
      const msgForEnd = state.messages.find(m => m.id === action.messageId);
      console.log('[Reducer] MESSAGE_END:', action.messageId, {
        existingBlockTypes: msgForEnd?.contentBlocks?.map(b => b.type) || [],
        existingBlockCount: msgForEnd?.contentBlocks?.length || 0,
        finalMessageHasBlocks: !!(action.message?.contentBlocks?.length),
        finalBlockTypes: action.message?.contentBlocks?.map(b => b.type) || [],
        finalContentLength: action.message?.content?.toString().length || action.content?.length || 0,
      });

      const finalMessage = action.message;
      let newTodos = state.todos;

      // 从完整消息中提取 todos
      if (finalMessage?.metadata?.todos?.items) {
        newTodos = finalMessage.metadata.todos.items;
      }

      return {
        ...state,
        messages: state.messages.map(msg => {
          if (msg.id === action.messageId) {
            if (finalMessage) {
              // 合并 toolCalls：优先保留之前通过 TOOL_CALL_START/END 收集的完整数据
              // 因为 message_end 中的 toolCalls 可能只是预览数据
              const existingToolCalls = msg.toolCalls || [];
              const finalToolCalls = finalMessage.toolCalls || [];

              // 创建一个 Map 来合并 toolCalls，以 id 为 key
              const toolCallsMap = new Map<string, ToolCall>();

              // 先添加 finalMessage 中的 toolCalls（可能是预览数据）
              finalToolCalls.forEach(tc => {
                toolCallsMap.set(tc.id, tc);
              });

              // 然后用 existing toolCalls 覆盖（这些是完整数据）
              existingToolCalls.forEach(tc => {
                const existing = toolCallsMap.get(tc.id);
                if (existing) {
                  // 合并：保留 existing 的完整数据，但更新状态等字段
                  toolCallsMap.set(tc.id, {
                    ...existing,
                    ...tc,
                    // 如果 existing 有完整的 args/result，保留它们
                    args: tc.args && Object.keys(tc.args).length > 0 ? tc.args : existing.args,
                    result: tc.result !== undefined ? tc.result : existing.result,
                  });
                } else {
                  toolCallsMap.set(tc.id, tc);
                }
              });

              const mergedToolCalls = Array.from(toolCallsMap.values());

              // 保留实时构建的 contentBlocks，不要被 finalMessage 覆盖
              // 除非 finalMessage 有更完整的 contentBlocks
              let existingBlocks = msg.contentBlocks || [];
              const finalBlocks = finalMessage.contentBlocks || [];

              // 获取最终内容
              const finalContent = typeof finalMessage.content === 'string'
                ? finalMessage.content
                : action.content || (typeof msg.content === 'string' ? msg.content : '');

              // 检查是否需要在 MESSAGE_END 时添加 TextBlock
              // 场景：后端没有发送中间的 message_delta，只在结束时发送完整内容
              const hasTextBlock = existingBlocks.some(b => b.type === 'text');
              if (!hasTextBlock && finalContent && finalContent.trim()) {
                // 添加最终文本到 contentBlocks
                const textBlock: TextBlock = {
                  id: `text-${msg.id}-final`,
                  type: 'text',
                  content: finalContent,
                };
                existingBlocks = [...existingBlocks, textBlock];
              } else if (hasTextBlock && finalContent) {
                // 更新最后一个 TextBlock 的内容（确保与最终内容一致）
                const lastTextIdx = existingBlocks.findIndex(b => b.type === 'text');
                if (lastTextIdx !== -1) {
                  const existingText = existingBlocks[lastTextIdx] as TextBlock;
                  // 只有当最终内容更长时才更新（防止截断）
                  if (finalContent.length > existingText.content.length) {
                    existingBlocks = [
                      ...existingBlocks.slice(0, lastTextIdx),
                      { ...existingText, content: finalContent },
                      ...existingBlocks.slice(lastTextIdx + 1),
                    ];
                  }
                }
              }

              // 优先使用实时构建的 contentBlocks，只在没有任何 blocks 时才使用 finalBlocks
              // 因为实时构建的 blocks 保持了正确的时间顺序
              const contentBlocks = existingBlocks.length > 0
                ? existingBlocks
                : finalBlocks;

              console.log('[Reducer] MESSAGE_END - using:', existingBlocks.length > 0 ? 'existingBlocks' : 'finalBlocks',
                'count:', (existingBlocks.length > 0 ? existingBlocks : finalBlocks).length);

              return {
                ...msg,
                ...finalMessage,
                content: finalContent,
                // 使用合并后的 toolCalls
                toolCalls: mergedToolCalls.length > 0 ? mergedToolCalls : undefined,
                // 保留实时构建的 contentBlocks
                contentBlocks,
              };
            }
            return { ...msg, content: action.content || msg.content };
          }
          return msg;
        }),
        todos: newTodos,
      };
    }

    case 'TOOL_CALL_START': {
      // Get current message blocks for logging
      const currentMsgForTool = state.messages.find(m => m.id === action.messageId);
      console.log('[Reducer] TOOL_CALL_START:', action.toolCall.name, 'messageId:', action.messageId, 'sequence:', action.toolCall.sequence, 'existing blocks:', currentMsgForTool?.contentBlocks?.length || 0);

      const newToolCalls = new Map(state.toolCalls);
      newToolCalls.set(action.toolCall.id, action.toolCall);

      // If messageId exists, update corresponding message's toolCalls and contentBlocks
      let updatedMessages = state.messages;
      if (action.messageId) {
        updatedMessages = state.messages.map(msg => {
          if (msg.id !== action.messageId) return msg;

          const existing = msg.toolCalls || [];
          const blocks = msg.contentBlocks || [];

          // Check if already exists
          if (existing.some(tc => tc.id === action.toolCall.id)) {
            return msg;
          }

          // Create ToolCallBlock with sequence for ordering
          const toolCallBlock: ToolCallBlock = {
            id: `tc-${action.toolCall.id}`,
            type: 'tool_call',
            toolCallId: action.toolCall.id,
            toolName: action.toolCall.name,
            toolDisplayName: action.toolDisplayName || action.toolCall.name,
            toolType: action.toolCall.type === 'subagent' ? 'subagent' : 'tool',
            args: action.toolCall.args || {},
            argsPreview: JSON.stringify(action.toolCall.args || {}).slice(0, 50),
            status: 'running',
            startedAt: typeof action.toolCall.startedAt === 'string'
              ? action.toolCall.startedAt
              : new Date().toISOString(),
            sequence: action.toolCall.sequence,
          };

          // Add new block and sort by sequence (WEBSOCKET_EVENTS_FRONTEND_GUIDE.md)
          const newBlocks = [...blocks, toolCallBlock];
          const sortedBlocks = newBlocks.sort((a, b) => {
            // Only sort tool_call blocks by sequence, keep others in original order
            if (a.type === 'tool_call' && b.type === 'tool_call') {
              const seqA = (a as ToolCallBlock).sequence ?? Infinity;
              const seqB = (b as ToolCallBlock).sequence ?? Infinity;
              return seqA - seqB;
            }
            return 0; // Keep relative order for non-tool_call blocks
          });

          return {
            ...msg,
            toolCalls: [...existing, action.toolCall],
            contentBlocks: sortedBlocks,
          };
        });
      }

      return { ...state, toolCalls: newToolCalls, messages: updatedMessages };
    }

    case 'TOOL_CALL_END': {
      const newToolCalls = new Map(state.toolCalls);
      const existing = newToolCalls.get(action.toolCallId);
      if (existing) {
        newToolCalls.set(action.toolCallId, {
          ...existing,
          result: action.result,
          status: action.status,
          endedAt: action.endedAt,
          durationMs: action.durationMs,
          error: action.error,
        });
      }

      // 格式化结果预览
      const formatResultPreview = (res: unknown): string => {
        if (typeof res === 'string') return res.slice(0, 100);
        if (res && typeof res === 'object') {
          const obj = res as Record<string, unknown>;
          if (obj.error) return `Error: ${obj.error}`;
          if (obj.message) return String(obj.message).slice(0, 100);
        }
        return JSON.stringify(res).slice(0, 100);
      };

      // 更新消息中的 toolCalls 和 contentBlocks
      const updatedMessages = state.messages.map(msg => {
        // 更新 toolCalls
        let updatedToolCalls = msg.toolCalls;
        if (msg.toolCalls) {
          const idx = msg.toolCalls.findIndex(tc => tc.id === action.toolCallId);
          if (idx !== -1) {
            const updated = [...msg.toolCalls];
            updated[idx] = {
              ...updated[idx],
              result: action.result,
              status: action.status,
              endedAt: action.endedAt,
              durationMs: action.durationMs,
              error: action.error,
            };
            updatedToolCalls = updated;
          }
        }

        // 更新 contentBlocks 中对应的 ToolCallBlock
        let updatedBlocks = msg.contentBlocks;
        if (msg.contentBlocks) {
          const blockIdx = msg.contentBlocks.findIndex(
            b => b.type === 'tool_call' && (b as ToolCallBlock).toolCallId === action.toolCallId
          );
          if (blockIdx !== -1) {
            const block = msg.contentBlocks[blockIdx] as ToolCallBlock;

            // 检查结果是否是 action_card 类型
            const resultObj = action.result as Record<string, unknown> | null;
            const isActionCard = resultObj &&
              resultObj.type === 'action_card' &&
              resultObj.card_type === 'content_selection';

            if (isActionCard) {
              // 将 action_card 结果转换为 ActionCardBlock
              const actionCardResult = resultObj as unknown as ActionCardResult;
              const actionCardBlock: ActionCardBlock = {
                id: `action-card-${action.toolCallId}`,
                type: 'action_card',
                cardType: 'content_selection',
                title: actionCardResult.title,
                description: actionCardResult.description,
                clusterName: actionCardResult.cluster_name,
                clusterId: actionCardResult.cluster_id,
                items: actionCardResult.items as ContentItemOption[],
                actionTemplate: actionCardResult.action_template,
                actionType: 'generate_content',
              };

              console.log('[Reducer] TOOL_CALL_END - Converting to ActionCardBlock:', actionCardBlock.title);

              // 替换 ToolCallBlock 为 ActionCardBlock
              updatedBlocks = [
                ...msg.contentBlocks.slice(0, blockIdx),
                actionCardBlock,
                ...msg.contentBlocks.slice(blockIdx + 1),
              ];
            } else {
              // 正常更新 ToolCallBlock
              const updatedBlock: ToolCallBlock = {
                ...block,
                result: action.result,
                resultPreview: formatResultPreview(action.result),
                status: action.status === 'completed' || action.status === 'success' ? 'success' :
                  action.status === 'error' ? 'error' : block.status,
                endedAt: action.endedAt,
                durationMs: action.durationMs,
                error: action.error,
              };
              updatedBlocks = [
                ...msg.contentBlocks.slice(0, blockIdx),
                updatedBlock,
                ...msg.contentBlocks.slice(blockIdx + 1),
              ];
            }
          }
        }

        if (updatedToolCalls !== msg.toolCalls || updatedBlocks !== msg.contentBlocks) {
          return { ...msg, toolCalls: updatedToolCalls, contentBlocks: updatedBlocks };
        }
        return msg;
      });

      // 从工具调用结果中提取文件内容
      // 支持多种格式:
      // 1. { files: { "/path": { content: "...", path: "..." } } }
      // 2. { result: { files: { ... } } }
      // 3. { images: [{ url: "...", path: "..." }] }  // 图片生成工具
      // 4. 二进制文件: { files: { "/path": { downloadUrl: "...", isBinary: true } } }
      let newFiles = state.files;
      const result = action.result as Record<string, unknown> | null | undefined;

      // 调试日志：查看工具调用结果结构
      console.log('[useStream] TOOL_CALL_END -', existing?.name, '- result keys:', result ? Object.keys(result) : 'null');

      if (result && typeof result === 'object') {
        // 尝试多个可能的位置提取 files
        let filesData: Record<string, unknown> | undefined;

        // 1. result.files (直接在顶层)
        if (result.files && typeof result.files === 'object') {
          filesData = result.files as Record<string, unknown>;
          console.log('[useStream] Found files in result.files');
        }
        // 2. result.result.files (嵌套在 result 中)
        else if (result.result && typeof result.result === 'object') {
          const nested = result.result as Record<string, unknown>;
          if (nested.files && typeof nested.files === 'object') {
            filesData = nested.files as Record<string, unknown>;
            console.log('[useStream] Found files in result.result.files');
          }
        }
        // 3. result.images (图片生成工具特殊格式)
        else if (result.images && Array.isArray(result.images)) {
          console.log('[useStream] Found images array:', result.images.length);
          filesData = {};
          for (const img of result.images) {
            if (img && typeof img === 'object') {
              const imgObj = img as Record<string, unknown>;
              const url = imgObj.url || imgObj.downloadUrl;
              const path = imgObj.path || imgObj.filename || `/generated-image-${Date.now()}.png`;
              if (url && typeof url === 'string') {
                filesData[path as string] = {
                  path,
                  downloadUrl: url,
                  isBinary: true,
                  language: 'image',
                  fileSize: imgObj.fileSize,
                };
              }
            }
          }
        }

        if (filesData && typeof filesData === 'object' && Object.keys(filesData).length > 0) {
          console.log('[useStream] Extracting files:', Object.keys(filesData));
          newFiles = { ...state.files };

          for (const [filePath, fileData] of Object.entries(filesData)) {
            if (fileData && typeof fileData === 'object') {
              const file = fileData as Record<string, unknown>;

              // 检查是否是二进制文件（有 downloadUrl 或 isBinary 标志）
              const hasDownloadUrl = file.downloadUrl && typeof file.downloadUrl === 'string';
              const isBinary = file.isBinary === true || hasDownloadUrl;

              console.log(`[useStream] Processing: ${filePath}`, { isBinary, hasDownloadUrl, hasContent: !!file.content });

              // 文本文件需要有 content，二进制文件需要有 downloadUrl
              if ((file.content && typeof file.content === 'string') || hasDownloadUrl) {
                newFiles[filePath] = {
                  path: filePath,
                  content: typeof file.content === 'string' ? file.content : undefined,
                  language: typeof file.language === 'string' ? file.language : (isBinary ? 'image' : 'text'),
                  editable: !isBinary, // 二进制文件不可编辑
                  isBinary: isBinary ? true : undefined,
                  downloadUrl: hasDownloadUrl ? (file.downloadUrl as string) : undefined,
                  fileSize: typeof file.fileSize === 'number' ? file.fileSize : undefined,
                };
                console.log(`[useStream] ✅ Added file to artifacts: ${filePath}`);
              } else {
                console.warn(`[useStream] ⚠️ Skipped file (no content/downloadUrl): ${filePath}`, file);
              }
            }
          }
        } else {
          console.log('[useStream] No files/images found in tool result');
        }
      }

      // 从 write_todos 工具调用结果中提取 todos
      let newTodos = state.todos;
      if (existing?.name === 'write_todos' && action.result) {
        // 尝试从结果中提取 todos
        // 格式1: { todos: [...] }
        // 格式2: 字符串 "Updated todo list to [...]"
        // 格式3: 直接是数组
        const resultData = action.result as Record<string, unknown> | TodoItem[] | string;

        if (Array.isArray(resultData)) {
          // 直接是数组
          newTodos = resultData as TodoItem[];
        } else if (typeof resultData === 'object' && resultData !== null) {
          // 对象格式
          if (Array.isArray((resultData as Record<string, unknown>).todos)) {
            newTodos = (resultData as Record<string, unknown>).todos as TodoItem[];
          } else if (Array.isArray((resultData as Record<string, unknown>).items)) {
            newTodos = (resultData as Record<string, unknown>).items as TodoItem[];
          }
        } else if (typeof resultData === 'string') {
          // 字符串格式，尝试解析
          // 格式: "Updated todo list to [{'content': '...', 'status': '...'}, ...]"
          const match = resultData.match(/\[[\s\S]*\]/);
          if (match) {
            try {
              // 将 Python 风格的字典转换为 JSON
              const jsonStr = match[0]
                .replace(/'/g, '"')
                .replace(/True/g, 'true')
                .replace(/False/g, 'false')
                .replace(/None/g, 'null');
              const parsed = JSON.parse(jsonStr);
              if (Array.isArray(parsed)) {
                newTodos = parsed as TodoItem[];
              }
            } catch {
              // 解析失败，保持原状
            }
          }
        }
      }

      return { ...state, toolCalls: newToolCalls, messages: updatedMessages, files: newFiles, todos: newTodos };
    }

    case 'SUBAGENT_START': {
      // 添加 SubagentBlock 到消息的 contentBlocks
      if (!action.messageId) return state;

      const updatedMessages = state.messages.map(msg => {
        if (msg.id !== action.messageId) return msg;

        const blocks = msg.contentBlocks || [];

        // 创建 SubagentBlock
        const subagentBlock: SubagentBlock = {
          id: `sa-${action.subagentName}-${Date.now()}`,
          type: 'subagent',
          subagentName: action.subagentName,
          subagentDisplayName: action.subagentDisplayName || action.subagentName,
          taskDescription: action.taskDescription,
          status: 'running',
          startedAt: new Date().toISOString(),
          childBlocks: [],
        };

        return {
          ...msg,
          contentBlocks: [...blocks, subagentBlock],
        };
      });

      return { ...state, messages: updatedMessages };
    }

    case 'SUBAGENT_END': {
      // 更新 SubagentBlock 状态
      if (!action.messageId) return state;

      const updatedMessages = state.messages.map(msg => {
        if (msg.id !== action.messageId || !msg.contentBlocks) return msg;

        const blockIdx = msg.contentBlocks.findIndex(
          b => b.type === 'subagent' && (b as SubagentBlock).subagentName === action.subagentName
        );

        if (blockIdx === -1) return msg;

        const block = msg.contentBlocks[blockIdx] as SubagentBlock;
        const updatedBlock: SubagentBlock = {
          ...block,
          status: action.status,
          endedAt: new Date().toISOString(),
          durationMs: action.durationMs,
        };

        return {
          ...msg,
          contentBlocks: [
            ...msg.contentBlocks.slice(0, blockIdx),
            updatedBlock,
            ...msg.contentBlocks.slice(blockIdx + 1),
          ],
        };
      });

      return { ...state, messages: updatedMessages };
    }

    case 'TODOS_UPDATE':
      return { ...state, todos: action.todos };

    case 'FILE_OPERATION': {
      const newFiles = { ...state.files };
      if (action.operation === 'delete') {
        delete newFiles[action.path];
      } else {
        // ⚠️ 调试：打印 FILE_OPERATION 数据
        console.log('[Reducer] FILE_OPERATION:', {
          path: action.path,
          isBinary: action.isBinary,
          hasDownloadUrl: !!action.downloadUrl,
          fileSize: action.fileSize,
        });

        newFiles[action.path] = {
          path: action.path,
          content: action.content || '',
          language: action.language || 'text',
          editable: action.editable ?? true,
          lineStart: action.lineStart,
          lineEnd: action.lineEnd,
          oldContent: action.oldContent,
          // ⭐ 修复：保存二进制文件相关字段
          isBinary: action.isBinary,
          downloadUrl: action.downloadUrl,
          fileSize: action.fileSize,
        };
      }

      // 添加 FileRefBlock 到消息的 contentBlocks
      let updatedMessages = state.messages;
      if (action.messageId) {
        updatedMessages = state.messages.map(msg => {
          if (msg.id !== action.messageId) return msg;

          const blocks = msg.contentBlocks || [];

          // 创建 FileRefBlock
          const fileRefBlock: FileRefBlock = {
            id: `file-${action.path.replace(/\//g, '-')}-${Date.now()}`,
            type: 'file_ref',
            fileId: action.toolCallId || action.path,
            path: action.path,
            operation: action.operation as 'create' | 'edit' | 'read' | 'delete' | 'write',
            language: action.language,
            contentPreview: action.content?.slice(0, 200),
          };

          return {
            ...msg,
            contentBlocks: [...blocks, fileRefBlock],
          };
        });
      }

      return { ...state, files: newFiles, messages: updatedMessages };
    }

    case 'SET_INTERRUPT':
      return { ...state, interrupt: action.interrupt, isLoading: false };

    // 新增：重试相关 (WEBSOCKET_FRONTEND_GUIDE.md)
    case 'RETRY_STARTED':
      return {
        ...state,
        retryingTurnId: action.turnId,
        retryAttempt: action.attempt,
        isLoading: true,
        error: null,
      };

    case 'RETRY_COMPLETED':
      return {
        ...state,
        retryingTurnId: null,
        retryAttempt: 0,
      };

    case 'RETRY_FAILED':
      return {
        ...state,
        retryingTurnId: null,
        retryAttempt: 0,
        error: action.error,
        isLoading: false,
      };

    default:
      return state;
  }
}

// ============ Hook ============

export function useStream(options: UseStreamOptions) {
  const {
    cid,
    token,
    sessionToken = null,
    wsUrl,
    enabled = true,
    onConnect,
    onDisconnect,
    onError,
    onMessageComplete,
    onFileOperation,
    onDone,
    // 进度事件回调 (PROGRESS_EVENTS_FRONTEND_GUIDE.md)
    onToolProgress,
    onToolRetry,
    onModelRetry,
  } = options;

  const [state, dispatch] = useReducer(streamReducer, initialState);

  // Refs
  const wsRef = useRef<WebSocketStream | null>(null);
  const currentMessageIdRef = useRef<string | null>(null);
  const cidRef = useRef<string | null>(cid);
  const callbacksRef = useRef({
    onConnect, onDisconnect, onError, onMessageComplete, onFileOperation, onDone,
    onToolProgress, onToolRetry, onModelRetry,
  });

  // 更新 refs
  useEffect(() => {
    cidRef.current = cid;
  }, [cid]);

  useEffect(() => {
    callbacksRef.current = {
      onConnect, onDisconnect, onError, onMessageComplete, onFileOperation, onDone,
      onToolProgress, onToolRetry, onModelRetry,
    };
  }, [onConnect, onDisconnect, onError, onMessageComplete, onFileOperation, onDone, onToolProgress, onToolRetry, onModelRetry]);

  // 事件处理 (基于 WEBSOCKET_FRONTEND_GUIDE.md)
  const handleEvent = useCallback((event: StreamEvent) => {
    const currentCid = cidRef.current;

    switch (event.type) {
      // 连接确认
      case 'connected': {
        dispatch({ type: 'SET_SERVER_READY', isReady: true });
        break;
      }

      // 完整会话状态（连接后推送）- 兼容 state 和 state_update
      case 'state':
      case 'state_update': {
        dispatch({ type: 'SET_SERVER_READY', isReady: true });

        const data = event.data as {
          messages?: Message[];
          todos?: TodoItem[];
          files?: Record<string, unknown>;
          pagination?: PaginationInfo;  // 新增：分页信息 (WEBSOCKET_FRONTEND_GUIDE.md)
        };

        if (data.messages) {
          // 转换 files 为正确格式
          // 支持字符串格式（旧格式）和 FileItem 对象格式（新格式，包括二进制文件）
          const normalizedFiles: Record<string, string | FileItem> = {};
          if (data.files) {
            for (const [path, value] of Object.entries(data.files)) {
              if (typeof value === 'string') {
                // 旧格式：直接是字符串内容
                normalizedFiles[path] = value;
              } else if (value && typeof value === 'object') {
                const obj = value as Record<string, unknown>;
                // 检查是否是二进制文件（有 downloadUrl 或 isBinary 为 true）
                if (obj.downloadUrl || obj.isBinary === true) {
                  // ⚠️ 调试：检查二进制文件是否缺少 downloadUrl
                  if (obj.isBinary === true && !obj.downloadUrl) {
                    console.warn(`[useStream] ⚠️ Binary file without downloadUrl:`, {
                      path,
                      isBinary: obj.isBinary,
                      hasContent: !!obj.content,
                      fileSize: obj.fileSize,
                      allKeys: Object.keys(obj),
                    });
                  }

                  // 二进制文件：保存为 FileItem 对象
                  normalizedFiles[path] = {
                    path,
                    content: typeof obj.content === 'string' ? obj.content : undefined,
                    language: typeof obj.language === 'string' ? obj.language : undefined,
                    isBinary: true,
                    downloadUrl: typeof obj.downloadUrl === 'string' ? obj.downloadUrl : undefined,
                    fileSize: typeof obj.fileSize === 'number' ? obj.fileSize : undefined,
                    editable: false, // 二进制文件不可编辑
                  };
                } else if (typeof obj.content === 'string') {
                  // 文本文件：提取 content 字符串（保持向后兼容）
                  normalizedFiles[path] = obj.content;
                } else if (Array.isArray(obj.content)) {
                  // 内容可能是数组格式
                  normalizedFiles[path] = obj.content.join('\n');
                } else {
                  // 未知格式，但不一定是错误（可能是空文件或其他格式）
                  // 只对明显异常的情况发出警告
                  if (obj.content !== null && obj.content !== undefined) {
                    console.warn('[useStream] Unknown file format for path:', path, value);
                  }
                }
              }
            }
          }

          dispatch({
            type: 'SET_INITIAL_STATE',
            messages: data.messages,
            todos: data.todos || [],
            files: normalizedFiles,
            pagination: data.pagination || null,
          });
        }
        break;
      }

      // 新消息开始
      case 'message_start': {
        const data = event.data as MessageStartEventData;
        currentMessageIdRef.current = data.messageId;
        dispatch({
          type: 'MESSAGE_START',
          messageId: data.messageId,
          cid: currentCid || '',
          role: data.role || 'assistant',
          parentMessageId: data.parentMessageId,
          subagentName: data.subagentName,
        });
        break;
      }

      // 流式内容增量 - 兼容 content_delta 和 message_delta
      case 'content_delta':
      case 'message_delta': {
        const data = event.data as { messageId: string; delta: string };
        // 调试日志：跟踪事件顺序
        console.log('[useStream] message_delta - delta length:', data.delta?.length || 0);
        dispatch({ type: 'MESSAGE_DELTA', messageId: data.messageId, delta: data.delta || '' });
        break;
      }

      // 消息结束 - 包含完整内容、toolCalls 和 metadata（含 usage）
      case 'message_end': {
        // 扩展 MessageEndEventData 以包含可能的额外字段
        interface ExtendedToolCallSummary extends ToolCallSummary {
          args?: Record<string, unknown>;
          result?: unknown;
          targetSubagent?: string;
        }

        const data = event.data as Omit<MessageEndEventData, 'toolCalls'> & {
          toolCalls?: ExtendedToolCallSummary[];
          metadata?: {
            contentType?: string;
            usage?: {
              totalTokens: number;
              promptTokens: number;
              completionTokens: number;
              totalCost: number;
              callCount: number;
              byModel?: Record<string, unknown>;
              bySource?: Record<string, unknown>;
            };
            todos?: { items: TodoItem[]; summary?: { total: number; pending: number; inProgress: number; completed: number; failed: number } };
          };
        };

        // 如果后端返回了完整消息，直接使用
        let finalMessage: Message;
        if (data.message) {
          finalMessage = data.message;
        } else {
          // 否则构建消息对象
          finalMessage = {
            id: data.messageId,
            cid: currentCid || '',
            role: 'assistant',
            content: data.content || '',
            toolCalls: data.toolCalls?.map(tc => ({
              id: tc.id,
              name: tc.name,
              type: tc.type as ToolCall['type'],
              args: tc.args || {},
              result: tc.result,
              status: tc.status as ToolCall['status'],
              durationMs: tc.durationMs,
              subagentName: tc.subagentName,
              targetSubagent: tc.targetSubagent,
            })),
            metadata: data.metadata as Message['metadata'],
          };
        }

        dispatch({
          type: 'MESSAGE_END',
          messageId: data.messageId,
          content: data.content,
          message: finalMessage,
        });
        currentMessageIdRef.current = null;

        callbacksRef.current.onMessageComplete?.(finalMessage);
        break;
      }

      // Tool call start
      case 'tool_call_start': {
        const data = event.data as ToolCallStartEventData;

        // Debug log - view complete data from backend
        console.log('[useStream] 🟢 tool_call_start received!');
        console.log('[useStream] tool_call_start raw data:', JSON.stringify(data, null, 2));

        // FRONTEND_API_GUIDE.md: data.toolCall = { id, name, type: 'function' | 'subagent', arguments, startedAt }
        const nested = data.toolCall;

        const toolCallId =
          nested?.id ||
          data.toolCallId ||
          `tool-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const toolName = nested?.name || data.toolName || 'unknown_tool';

        // Extract tool display name (support multiple formats)
        // Backend tool_handler.py sends field name as displayName
        const toolDisplayName =
          data.displayName ||             // 后端发送的主要字段
          nested?.displayName ||
          nested?.display_name ||
          data.toolDisplayName ||
          data.display_name;

        console.log('[useStream] tool_call_start key fields:', {
          toolCallId,
          toolName,
          toolDisplayName,
          'from nested.id': nested?.id,
          'from data.toolCallId': data.toolCallId,
          'from data.displayName': data.displayName,
        });

        // Event toolCall.type is 'function'|'subagent', while message ToolCall.type is 'tool'|'subagent'
        const rawType = nested?.type || data.toolType || data.type;
        const toolType: ToolCall['type'] =
          rawType === 'subagent' ? 'subagent' : 'tool';

        const args = nested?.arguments || data.args || {};

        // Extract sequence for ordering (WEBSOCKET_EVENTS_FRONTEND_GUIDE.md)
        const sequence = nested?.sequence ?? data.sequence;

        const toolCall: ToolCall = {
          id: toolCallId,
          name: toolName,
          type: toolType,
          args,
          status: 'running',
          startedAt: nested?.startedAt || data.startedAt,
          subagentName: data.subagentName,
          targetSubagent: data.targetSubagent,
          sequence,
        };
        dispatch({
          type: 'TOOL_CALL_START',
          toolCall,
          messageId: data.messageId || currentMessageIdRef.current || undefined,
          toolDisplayName,
        });
        break;
      }

      // Tool call result - compatible with tool_call_end and tool_call_result
      case 'tool_call_end':
      case 'tool_call_result': {
        const data = event.data as ToolCallResultEventData & { toolName?: string };
        const status: ToolCall['status'] = data.error ? 'error' : (data.status as ToolCall['status']) || 'completed';
        dispatch({
          type: 'TOOL_CALL_END',
          toolCallId: data.toolCallId,
          messageId: data.messageId || currentMessageIdRef.current || undefined,
          result: data.result,
          status,
          endedAt: data.endedAt,
          durationMs: data.durationMs,
          error: data.error,
        });
        break;
      }

      // Subagent start
      case 'subagent_start': {
        const data = event.data as SubAgentStartEventData & { messageId?: string };
        const messageId = data.messageId || currentMessageIdRef.current || undefined;

        // Use new SUBAGENT_START action to add SubagentBlock
        dispatch({
          type: 'SUBAGENT_START',
          messageId,
          subagentName: data.subagentName,
          taskDescription: data.taskDescription,
        });
        break;
      }

      // Subagent end
      case 'subagent_end': {
        const data = event.data as SubAgentEndEventData & { messageId?: string };
        const messageId = data.messageId || currentMessageIdRef.current || undefined;

        // 使用新的 SUBAGENT_END action 更新 SubagentBlock
        dispatch({
          type: 'SUBAGENT_END',
          messageId,
          subagentName: data.subagentName,
          status: data.status,
        });
        break;
      }

      // Todos 更新 - 兼容 todos_update 和 todos_updated
      case 'todos_update':
      case 'todos_updated': {
        const data = event.data as {
          messageId?: string;
          // FRONTEND_API_GUIDE.md: todos: { items, summary }
          todos?: { items?: TodoItem[]; summary?: unknown } | TodoItem[];
          // 兼容：直接 items/summary 顶层
          items?: TodoItem[];
          summary?: unknown;
        };

        const todos =
          Array.isArray(data.todos)
            ? data.todos
            : data.todos?.items || data.items;

        if (todos && Array.isArray(todos)) {
          dispatch({ type: 'TODOS_UPDATE', todos });
        }
        break;
      }

      // 文件操作
      case 'file_operation': {
        const data = event.data as FileOperationEventData & {
          messageId?: string;
          isBinary?: boolean;
          downloadUrl?: string;
          fileSize?: number;
        };
        console.log('[useStream] file_operation event:', JSON.stringify(data, null, 2));
        dispatch({
          type: 'FILE_OPERATION',
          messageId: data.messageId || currentMessageIdRef.current || undefined,
          operation: data.operation,
          path: data.path,
          content: data.content,
          language: data.language,
          editable: data.editable,
          toolCallId: data.toolCallId,
          lineStart: data.lineStart,
          lineEnd: data.lineEnd,
          oldContent: data.oldContent,
          // ⭐ 修复：传递二进制文件相关字段
          isBinary: data.isBinary,
          downloadUrl: data.downloadUrl,
          fileSize: data.fileSize,
        });
        callbacksRef.current.onFileOperation?.(data);
        break;
      }

      // 中断（人机交互）
      case 'interrupt': {
        const data = event.data as InterruptData;
        dispatch({ type: 'SET_INTERRUPT', interrupt: data });
        break;
      }

      // 新增：重试开始 (WEBSOCKET_FRONTEND_GUIDE.md)
      case 'retry_started': {
        const data = event.data as RetryStartedEventData;
        console.log(`[useStream] Retrying turn ${data.turnId}, attempt ${data.attempt}/${data.maxRetries}`);
        dispatch({
          type: 'RETRY_STARTED',
          turnId: data.turnId,
          attempt: data.attempt,
          maxRetries: data.maxRetries,
        });
        break;
      }

      // ============ 进度通知事件 (PROGRESS_EVENTS_FRONTEND_GUIDE.md) ============

      // 工具执行进度（长时间运行工具）
      case 'tool_progress': {
        const data = event.data as ToolProgressEventData;
        // 调试日志 - 查看完整的进度事件数据
        console.log('[useStream] 🔵 tool_progress received!');
        console.log('[useStream] tool_progress raw data:', JSON.stringify(data, null, 2));
        console.log('[useStream] tool_progress key fields:', {
          toolCallId: data.toolCallId,
          toolName: data.toolName,
          displayName: data.displayName,
          status: data.status,
          elapsed_ms: data.elapsed_ms,
        });

        if (data.status === 'completed') {
          console.log(`[useStream] Tool ${data.displayName || data.toolName} completed after ${data.elapsed_ms}ms`);
        } else {
          console.log(`[useStream] Tool ${data.displayName || data.toolName} running for ${data.elapsed_ms}ms`);
        }
        // 通过回调通知上层组件
        console.log('[useStream] Calling onToolProgress callback, has callback:', !!callbacksRef.current.onToolProgress);
        callbacksRef.current.onToolProgress?.(data);
        // 发送全局事件（供 Toast 等全局组件使用）
        window.dispatchEvent(new CustomEvent('seenos:tool_progress', { detail: data }));
        break;
      }

      // 工具网络重试
      case 'tool_retry': {
        const data = event.data as ToolRetryEventData;
        console.warn(`[useStream] Tool ${data.displayName || data.toolName} retrying (${data.attempt}/${data.maxRetries}): ${data.error}`);
        // 通过回调通知上层组件
        callbacksRef.current.onToolRetry?.(data);
        // 发送全局事件（供 Toast 组件显示通知）
        window.dispatchEvent(new CustomEvent('seenos:tool_retry', { detail: data }));
        break;
      }

      // LLM 模型调用重试
      case 'model_retry': {
        const data = event.data as ModelRetryEventData;
        console.warn(`[useStream] Model retrying (${data.attempt}/${data.maxRetries}): ${data.error}`);
        // 通过回调通知上层组件
        callbacksRef.current.onModelRetry?.(data);
        // 发送全局事件（供全局 loading 指示器使用）
        window.dispatchEvent(new CustomEvent('seenos:model_retry', { detail: data }));
        break;
      }

      // ============ 结构化内容事件 (STRUCTURED_CONTENT_FRONTEND_GUIDE.md) ============

      // 结构化内容已保存到数据库
      case 'content_saved': {
        const data = event.data as ContentSavedEventData;
        console.log(`[useStream] Content saved: ${data.title} (${data.page_type}), version ${data.content_version}`);
        // 通知编辑器刷新内容 - 通过全局事件或状态管理
        window.dispatchEvent(new CustomEvent('seenos:content_saved', { detail: data }));
        break;
      }

      // 预览 HTML 已生成
      case 'content_rendered': {
        const data = event.data as ContentRenderedEventData;
        console.log(`[useStream] Content rendered: ${data.title}, preview URL: ${data.preview_url}`);
        // 通知预览面板刷新 - 通过全局事件
        window.dispatchEvent(new CustomEvent('seenos:content_rendered', { detail: data }));
        break;
      }

      // 内容已发布
      case 'content_published': {
        const data = event.data as ContentPublishedEventData;
        console.log(`[useStream] Content published: ${data.title} at ${data.published_at}`);
        // 通知 UI 更新发布状态 - 通过全局事件
        window.dispatchEvent(new CustomEvent('seenos:content_published', { detail: data }));
        break;
      }

      // 连接被其他会话替换 (STRUCTURED_CONTENT_FRONTEND_GUIDE.md)
      case 'session_replaced': {
        const data = event.data as { reason?: string; message?: string };
        console.warn('[useStream] Session replaced:', data.message || 'Another session started');
        dispatch({ type: 'SET_CONNECTION_STATE', state: 'kicked' });
        dispatch({ type: 'SET_SERVER_READY', isReady: false });
        // 通知 UI 显示被踢提示
        window.dispatchEvent(new CustomEvent('seenos:session_replaced', { detail: data }));
        break;
      }

      // 强制登出 (STRUCTURED_CONTENT_FRONTEND_GUIDE.md)
      case 'force_logout': {
        const data = event.data as { reason?: string; message?: string };
        console.warn('[useStream] Force logout:', data.message || 'You have been logged out');
        dispatch({ type: 'SET_CONNECTION_STATE', state: 'failed' });
        dispatch({ type: 'SET_SERVER_READY', isReady: false });
        // 通知 UI 处理登出
        window.dispatchEvent(new CustomEvent('seenos:force_logout', { detail: data }));
        break;
      }

      // 连接频率限制 (STRUCTURED_CONTENT_FRONTEND_GUIDE.md)
      case 'rate_limited': {
        const data = event.data as { message?: string; retry_after?: number };
        console.warn('[useStream] Rate limited:', data.message || 'Too many connection attempts');
        dispatch({ type: 'SET_CONNECTION_STATE', state: 'failed' });
        dispatch({ type: 'SET_SERVER_READY', isReady: false });
        const error = new Error(data.message || 'Connection rate limited, please try again later');
        dispatch({ type: 'SET_ERROR', error });
        callbacksRef.current.onError?.(error);
        // 通知 UI 显示限流提示
        window.dispatchEvent(new CustomEvent('seenos:rate_limited', { detail: data }));
        break;
      }

      // 错误
      case 'error': {
        const data = event.data as { message?: string; code?: string };
        const error = new Error(data.message || 'Unknown error');

        // 检查是否是重试相关的错误
        if (data.code === 'RETRY_LIMIT_EXCEEDED' ||
          data.code === 'RETRY_FAILED' ||
          data.code === 'MESSAGE_NOT_FOUND') {
          dispatch({ type: 'RETRY_FAILED', error });
        } else {
          dispatch({ type: 'SET_ERROR', error });
        }
        callbacksRef.current.onError?.(error);
        break;
      }

      // 请求完成
      case 'done': {
        const data = event.data as { reason?: 'cancelled' | 'error' } | null;
        dispatch({ type: 'SET_LOADING', isLoading: false });
        // 如果正在重试，标记重试完成
        dispatch({ type: 'RETRY_COMPLETED' });
        if (data?.reason === 'error') {
          console.warn('[useStream] Request completed with errors');
        }
        callbacksRef.current.onDone?.();
        break;
      }
    }
  }, []);

  // 保存 handleEvent 到 ref，避免 effect 依赖变化
  const handleEventRef = useRef(handleEvent);
  useEffect(() => {
    handleEventRef.current = handleEvent;
  }, [handleEvent]);

  // WebSocket 连接管理 - 只在 enabled/token 变化时重建
  useEffect(() => {
    if (!enabled || !token) {
      return;
    }

    const url = wsUrl || getWsUrl();

    // 创建 WebSocket 实例，使用 ref 来调用 handleEvent
    const ws = new WebSocketStream({
      url,
      token,
      sessionToken: sessionToken || undefined,
      cid: cidRef.current || undefined, // 使用 ref 获取当前 cid
      onEvent: (event) => handleEventRef.current(event),
      onConnect: () => {
        dispatch({ type: 'SET_CONNECTION_STATE', state: 'connected' });
        callbacksRef.current.onConnect?.();
      },
      onDisconnect: () => {
        dispatch({ type: 'SET_CONNECTION_STATE', state: 'disconnected' });
        dispatch({ type: 'SET_SERVER_READY', isReady: false });
        callbacksRef.current.onDisconnect?.();
      },
      onError: (error) => {
        dispatch({ type: 'SET_ERROR', error });
        callbacksRef.current.onError?.(error);
      },
      onConnectionStateChange: (connectionState) => {
        dispatch({ type: 'SET_CONNECTION_STATE', state: connectionState });
        // 如果断开连接或失败状态，重置服务端就绪状态
        if (connectionState === 'disconnected' || connectionState === 'kicked' || connectionState === 'failed') {
          dispatch({ type: 'SET_SERVER_READY', isReady: false });
        }
      },
      onServerUnavailable: () => {
        // 服务器不可用（可能正在重启），触发全局事件
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('seenos:server_unavailable', {
            detail: { message: '服务器正在重启中，请稍候...' }
          }));
        }
      },
      onMaxReconnectReached: (data) => {
        // 达到最大重连次数，触发全局事件
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('seenos:max_reconnect_reached', {
            detail: data
          }));
        }
      },
    });

    wsRef.current = ws;

    // 如果有 cid，立即连接
    const currentCid = cidRef.current;
    if (currentCid) {
      ws.connect(currentCid);
    }

    return () => {
      // 使用 destroy 而不是 close，确保清理所有资源
      ws.destroy();
      wsRef.current = null;
    };
  }, [enabled, token, sessionToken, wsUrl]);

  // 同步 cid 到 ref（不触发 WebSocket 操作，由 connectToCid 手动控制）
  useEffect(() => {
    cidRef.current = cid || null;
  }, [cid]);

  // 发送消息
  // overrideCid: 可选参数，用于确保使用正确的 cid（解决新会话创建时的时序问题）
  // attachments: 可选参数，用于发送附件 (IMAGE_UPLOAD_FRONTEND_GUIDE.md)
  const sendMessage = useCallback(async (
    content: string,
    overrideCid?: string,
    attachments?: Array<{
      type: 'image' | 'file';
      s3Key: string;
      mimeType: string;
      purpose?: 'reference_image' | 'context' | 'other';
      previewUrl?: string;  // 本地预览 URL，用于即时显示
      attachmentId?: string; // 新增：附件 ID
    }>
  ) => {
    if (!wsRef.current) {
      // 触发全局事件，让 UI 处理
      window.dispatchEvent(new CustomEvent('seenos:connection_error', {
        detail: { message: 'WebSocket not initialized', canRetry: true }
      }));
      return;
    }

    // 检查是否被踢或失败状态（不应该发送消息）
    const currentState = wsRef.current.state;
    if (currentState === 'kicked') {
      // 触发 session_replaced 事件（如果还没触发过）
      window.dispatchEvent(new CustomEvent('seenos:session_replaced', {
        detail: { message: '您的会话已在其他地方登录，请刷新页面' }
      }));
      return; // 不抛出错误，优雅返回
    }
    if (currentState === 'failed') {
      // 触发连接失败事件
      window.dispatchEvent(new CustomEvent('seenos:connection_error', {
        detail: { message: '连接失败，请刷新页面重试', canRetry: true }
      }));
      return; // 不抛出错误，优雅返回
    }

    // 优先使用传入的 overrideCid，否则使用 cidRef.current
    const currentCid = overrideCid || cidRef.current;

    // 如果传入了 overrideCid，同步更新 cidRef（确保后续操作使用正确的值）
    if (overrideCid && overrideCid !== cidRef.current) {
      console.log('[useStream] Syncing cidRef from override:', overrideCid);
      cidRef.current = overrideCid;
    }

    // 检查连接状态
    if (currentState === 'disconnected') {
      if (currentCid) {
        console.log('[useStream] WebSocket disconnected, reconnecting...');
        wsRef.current.connect(currentCid);

        // 等待连接就绪
        const maxWait = 5000;
        const checkInterval = 50;
        let waited = 0;
        while (!wsRef.current.isReady && waited < maxWait) {
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          waited += checkInterval;
        }

        if (!wsRef.current.isReady) {
          throw new Error('WebSocket connection timeout');
        }
      } else {
        throw new Error('No conversation ID available');
      }
    }

    // 立即添加用户消息到本地状态（乐观更新）
    const userMessageId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log('[useStream] Adding user message with cid:', currentCid, 'attachments:', attachments?.length || 0);
    dispatch({
      type: 'ADD_USER_MESSAGE',
      messageId: userMessageId,
      content,
      cid: currentCid || '',
      attachments: attachments?.map(att => ({
        type: att.type,
        s3Key: att.s3Key,
        mimeType: att.mimeType,
        purpose: att.purpose,
        previewUrl: att.previewUrl,
        attachmentId: att.attachmentId,
      })),
    });
    dispatch({ type: 'SET_LOADING', isLoading: true });
    dispatch({ type: 'SET_ERROR', error: null });

    try {
      // sendUserMessage 会自动处理 isReady 状态
      // 如果 WebSocket 已连接但服务端未确认，消息会被加入队列
      // 提取 attachmentIds
      const attachmentIds = attachments?.map(att => att.attachmentId!).filter(Boolean);
      await wsRef.current.sendUserMessage(content, attachments, attachmentIds);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', error: error instanceof Error ? error : new Error('Failed to send message') });
      dispatch({ type: 'SET_LOADING', isLoading: false });
      throw error;
    }
  }, []);

  // 恢复中断
  const resumeInterrupt = useCallback(async (decision: InterruptDecision) => {
    if (!wsRef.current || !state.interrupt) {
      return;
    }

    dispatch({ type: 'SET_LOADING', isLoading: true });

    try {
      await wsRef.current.resumeInterrupt(state.interrupt.id || '', decision);
      dispatch({ type: 'SET_INTERRUPT', interrupt: null });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', error: error instanceof Error ? error : new Error('Failed to resume') });
      dispatch({ type: 'SET_LOADING', isLoading: false });
    }
  }, [state.interrupt]);

  // 停止生成
  const stop = useCallback(async () => {
    if (!wsRef.current) return;

    try {
      await wsRef.current.stop();
    } catch (error) {
      console.error('Failed to stop:', error);
    }
    dispatch({ type: 'SET_LOADING', isLoading: false });
  }, []);

  // 重置状态（不关闭 WebSocket 连接）
  // 完全重置（包括连接状态）
  const reset = useCallback(() => {
    console.log('[useStream] Resetting all state');
    dispatch({ type: 'RESET' });
    currentMessageIdRef.current = null;
  }, []);

  // 只重置会话状态（保留连接）
  const resetConversation = useCallback(() => {
    console.log('[useStream] Resetting conversation state (keeping connection)');
    dispatch({ type: 'RESET_CONVERSATION' });
    currentMessageIdRef.current = null;
  }, []);

  // 设置初始状态
  const setInitialState = useCallback((data: {
    messages: Message[];
    todos: TodoItem[];
    files: Record<string, string | FileItem>;
  }) => {
    dispatch({
      type: 'SET_INITIAL_STATE',
      messages: data.messages,
      todos: data.todos,
      files: data.files,
    });
  }, []);

  // 重新连接
  const reconnect = useCallback(() => {
    wsRef.current?.reconnect();
  }, []);

  // 手动重连（用于用户点击重试按钮）
  const manualReconnect = useCallback(() => {
    wsRef.current?.manualReconnect();
  }, []);

  // 连接到新的 cid（同步操作，不阻塞）
  // 注意：后端要求 cid 必须在连接 URL 中，不支持 bind_cid 消息
  // 因此切换 cid 时需要断开并重新连接
  const connectToCid = useCallback((newCid: string): void => {
    console.log('[useStream] Connecting to cid:', newCid);
    // 更新 ref
    cidRef.current = newCid;

    if (wsRef.current) {
      const currentWsCid = wsRef.current.cid;

      if (wsRef.current.state === 'disconnected') {
        // 未连接，直接连接到新 cid
        console.log('[useStream] WebSocket disconnected, connecting to:', newCid);
        wsRef.current.connect(newCid);
      } else if (wsRef.current.state === 'connected') {
        // 已连接，检查是否需要切换 cid
        if (currentWsCid === newCid) {
          // 已经连接到正确的 cid，标记为就绪
          console.log('[useStream] Already connected to cid:', newCid);
          dispatch({ type: 'SET_SERVER_READY', isReady: true });
        } else {
          // 需要切换 cid，断开并重新连接到新 cid
          console.log('[useStream] Switching from cid:', currentWsCid, 'to:', newCid);
          wsRef.current.reconnect(newCid);
        }
      } else {
        // 正在连接中（connecting 或 reconnecting），断开并重新连接到新 cid
        wsRef.current.reconnect(newCid);
      }
    } else {
      console.warn('[useStream] WebSocket not initialized');
    }
  }, []);

  // 获取 WebSocket 是否就绪（直接检查 WebSocket 实例状态）
  // 这个方法可以在异步代码中调用，获取最新状态
  const checkIsReady = useCallback((): boolean => {
    return wsRef.current?.isReady ?? false;
  }, []);

  // 新增：加载历史消息（分页）(WEBSOCKET_FRONTEND_GUIDE.md)
  const loadMoreMessages = useCallback(async (): Promise<boolean> => {
    const currentCid = cidRef.current;
    if (!currentCid || !state.pagination?.hasMore || !state.pagination?.nextCursor) {
      return false;
    }

    try {
      const response = await apiClient.get<{
        messages: Message[];
        pagination: PaginationInfo;
      }>(`/conversations/${currentCid}/messages?cursor=${state.pagination.nextCursor}&limit=20&direction=older`);

      if (response.messages && response.messages.length > 0) {
        dispatch({
          type: 'PREPEND_MESSAGES',
          messages: response.messages,
          pagination: response.pagination,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('[useStream] Failed to load more messages:', error);
      return false;
    }
  }, [state.pagination]);

  // 新增：重试失败的消息 (WEBSOCKET_FRONTEND_GUIDE.md)
  const retryMessage = useCallback(async (turnId: string): Promise<void> => {
    if (!wsRef.current) {
      throw new Error('WebSocket not initialized');
    }

    try {
      await wsRef.current.retryMessage(turnId);
    } catch (error) {
      dispatch({
        type: 'RETRY_FAILED',
        error: error instanceof Error ? error : new Error('Failed to retry message')
      });
      throw error;
    }
  }, []);

  // 返回值
  return useMemo(() => ({
    // 状态
    messages: state.messages,
    toolCalls: Array.from(state.toolCalls.values()),
    todos: state.todos,
    files: state.files,
    interrupt: state.interrupt,
    isConnected: state.connectionState === 'connected',
    connectionState: state.connectionState,
    isLoading: state.isLoading,
    error: state.error,
    // WebSocket 是否完全就绪（已连接且服务端已确认）
    isReady: state.connectionState === 'connected' && state.isServerReady,
    // 新增：分页信息 (WEBSOCKET_FRONTEND_GUIDE.md)
    pagination: state.pagination,
    // 新增：重试状态 (WEBSOCKET_FRONTEND_GUIDE.md)
    retryingTurnId: state.retryingTurnId,
    retryAttempt: state.retryAttempt,

    // 方法
    sendMessage,
    resumeInterrupt,
    stop,
    reset,
    resetConversation,
    setInitialState,
    reconnect,
    manualReconnect,
    connectToCid,
    checkIsReady,
    // 新增方法 (WEBSOCKET_FRONTEND_GUIDE.md)
    loadMoreMessages,
    retryMessage,
  }), [
    state,
    sendMessage,
    resumeInterrupt,
    stop,
    reset,
    resetConversation,
    setInitialState,
    reconnect,
    manualReconnect,
    connectToCid,
    checkIsReady,
    loadMoreMessages,
    retryMessage,
  ]);
}

export type UseStreamReturn = ReturnType<typeof useStream>;
