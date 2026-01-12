# WebSocket Frontend Integration Guide

## Connection

### URL Format

```
ws://{host}/ws/chat?cid={conversation_id}&token={jwt_token}&project_id={project_id}
```

### Connection Flow

```
Client                                Server
  |                                     |
  |-- WS Connect ---------------------->|
  |                                     |
  |<-- connected -----------------------|  (1) Connection confirmed
  |<-- state_update -------------------|  (2) Full history pushed
  |                                     |
  |-- user_message ------------------->|  (3) User sends message
  |<-- message_start ------------------|  (4) Assistant starts
  |<-- message_delta ------------------|  (5) Streaming content
  |<-- tool_call_start ----------------|  (6) Tool execution
  |<-- tool_call_result ---------------|  (7) Tool result
  |<-- todos_updated ------------------|  (8) Todo progress
  |<-- message_end --------------------|  (9) Assistant done
  |<-- done ---------------------------|  (10) Request complete
  |                                     |
```

## Event Types

### Server → Client Events

#### 1. `connected`

Connection established.

```typescript
{
  type: "connected",
  data: {
    cid: string  // Conversation ID
  }
}
```

#### 2. `state_update`

Initial conversation state with pagination. Only loads the most recent N messages.

```typescript
{
  type: "state_update",
  data: {
    messages: Message[],              // Most recent 20 messages (default)
    todos: Todo[],
    files: { [path: string]: string },
    pagination: {                     // New: pagination metadata
      totalCount: number,             // Total messages in conversation
      hasMore: boolean,               // True if older messages exist
      nextCursor: string | null,      // Message ID for loading older messages
      limit: number                   // Initial limit used
    }
  }
}

interface Message {
  id: string;
  cid: string;
  role: "user" | "assistant" | "system";
  
  // New: Unified content blocks (use this for rendering)
  contentBlocks: ContentBlock[];      // Ordered array for correct display
  
  // Legacy fields (for backward compatibility)
  content: string;                    // Plain text content
  contentType: "json" | "markdown" | "text" | "mixed";
  
  // Block statistics
  blockCount: number;
  toolCallCount: number;
  fileRefCount: number;
  subagentCount: number;
  
  // Flat tool call summaries (extracted from contentBlocks)
  toolCalls?: ToolCallSummary[];
  
  promptTokens?: number;
  completionTokens?: number;
  totalCost?: number;
  createdAt: string;
}

// ============================================
// Content Block Types (NEW ARCHITECTURE)
// ============================================

type ContentBlock = 
  | TextBlock 
  | ToolCallBlock 
  | FileRefBlock 
  | SubagentBlock 
  | ImageBlock 
  | CitationBlock;

interface TextBlock {
  id: string;
  type: "text";
  content: string;                    // May contain markdown
}

interface ToolCallBlock {
  id: string;
  type: "tool_call";
  toolCallId: string;                 // Original tool call ID
  toolName: string;                   // e.g., "web_search", "write_file"
  toolDisplayName: string;            // e.g., "网页搜索", "写入文件"
  toolType: "tool" | "subagent";
  args: object;
  argsPreview: string;                // Short preview for collapsed display
  result?: any;                       // Tool result (may be large)
  resultPreview?: string;             // Short preview for collapsed display
  status: "pending" | "running" | "success" | "error";
  durationMs?: number;
  startedAt?: string;
  endedAt?: string;
  error?: string;
}

interface FileRefBlock {
  id: string;
  type: "file_ref";
  fileId: string;                     // Reference to File table
  path: string;
  operation: "create" | "edit" | "read" | "delete";
  language?: string;
  contentPreview?: string;
}

interface SubagentBlock {
  id: string;
  type: "subagent";
  subagentName: string;               // e.g., "researcher", "coder"
  subagentDisplayName: string;        // e.g., "研究员", "程序员"
  taskDescription: string;
  status: "running" | "success" | "error";
  durationMs?: number;
  startedAt?: string;
  endedAt?: string;
  childBlocks: ContentBlock[];        // Nested tool calls within subagent
}

interface ImageBlock {
  id: string;
  type: "image";
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

interface CitationBlock {
  id: string;
  type: "citation";
  filename: string;
  content: string;
  contextId?: string;
  similarity?: number;
}

interface ToolCallSummary {
  id: string;
  name: string;
  type: "tool" | "subagent";
  status: "pending" | "running" | "success" | "error";
  argsPreview?: string;               // e.g., "url: https://..."
  resultPreview?: string;             // e.g., "38/100, Grade D"
  durationMs?: number;
  subagentName?: string;
}

interface Todo {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
}
```

#### Loading Older Messages (Pagination)

When user scrolls up and `hasMore` is true, use REST API to load older messages:

```typescript
// GET /api/conversations/{cid}/messages?cursor={nextCursor}&limit=20&direction=older
const response = await fetch(
  `/api/conversations/${cid}/messages?cursor=${nextCursor}&limit=20&direction=older`
);
const { messages, pagination } = await response.json();

// Prepend older messages to state
setState(prev => ({
  ...prev,
  messages: [...messages, ...prev.messages],
  pagination
}));
```

#### 3. `message_start`

New assistant message started.

```typescript
{
  type: "message_start",
  data: {
    messageId: string,
    role: "assistant"
  }
}
```

**Frontend action**: Create new message bubble, show typing indicator.

#### 4. `message_delta`

Streaming content chunk.

```typescript
{
  type: "message_delta",
  data: {
    messageId: string,
    delta: string       // Append to message content
  }
}
```

**Frontend action**: Append `delta` to message content, render incrementally.

#### 5. `message_end`

Assistant message complete.

```typescript
{
  type: "message_end",
  data: {
    messageId: string,
    content: string,                  // Full final content
    toolCalls?: ToolCallSummary[],    // Tool call summaries
    metadata?: {
      contentType: "json" | "markdown" | "text" | "mixed",
      usage?: {
        totalTokens: number,
        promptTokens: number,
        completionTokens: number,
        totalCost: number,
        callCount: number,
        byModel: { [modelId: string]: ModelUsage },
        bySource: { [source: string]: SourceUsage }
      },
      todos?: TodosSnapshot
    }
  }
}
```

**Frontend action**: 
- Replace streamed content with final content
- Update token usage display
- Hide typing indicator

#### 6. `tool_call_start`

Tool execution started.

```typescript
{
  type: "tool_call_start",
  data: {
    messageId: string,
    toolCallId: string,
    toolName: string,
    toolType: "tool" | "subagent",
    args: object,                     // Full args (for display during execution)
    subagentName?: string,            // If running inside a subagent
    targetSubagent?: string           // For task() calls
  }
}
```

**Frontend action**: Show tool execution card with spinner.

#### 7. `tool_call_result`

Tool execution complete.

```typescript
{
  type: "tool_call_result",
  data: {
    messageId: string,
    toolCallId: string,
    toolName: string,
    result: any,                      // Formatted result for display
    durationMs: number,
    status: "success" | "error",
    error?: string
  }
}
```

**Frontend action**: Update tool card with result, show duration.

#### 8. `subagent_start`

Sub-agent invocation started.

```typescript
{
  type: "subagent_start",
  data: {
    messageId: string,
    subagentName: string,
    taskDescription: string
  }
}
```

**Frontend action**: Show sub-agent execution group.

#### 9. `subagent_end`

Sub-agent completed.

```typescript
{
  type: "subagent_end",
  data: {
    messageId: string,
    subagentName: string,
    status: "success" | "error"
  }
}
```

**Frontend action**: Update sub-agent group status.

#### 10. `todos_updated`

Todo list changed.

```typescript
{
  type: "todos_updated",
  data: {
    messageId: string,
    todos: Todo[],
    summary: {
      total: number,
      completed: number,
      inProgress: number,
      pending: number,
      failed: number
    }
  }
}
```

**Frontend action**: Update todo list display.

#### 11. `file_operation`

File created/modified/read.

```typescript
{
  type: "file_operation",
  data: {
    operation: "write" | "edit" | "read" | "delete",
    path: string,
    content?: string,
    language?: string,
    toolCallId: string,
    editable: boolean,
    lineStart?: number,
    lineEnd?: number,
    oldContent?: string
  }
}
```

**Frontend action**: Show file preview/editor.

#### 12. `error`

Error occurred.

```typescript
{
  type: "error",
  data: {
    message: string,
    code: string      // "RATE_LIMIT", "API_TIMEOUT_ERROR", etc.
  }
}
```

**Frontend action**: Show error toast/banner.

**Note**: `code` is sent in uppercase (e.g., `RATE_LIMIT`). Stored error codes in the database use lowercase.

#### 13. `done`

Request processing complete.

```typescript
{
  type: "done",
  data: {
    reason?: "cancelled" | "error"    // Only present if not normal completion
  } | null
}
```

**Frontend action**: Re-enable input, hide loading state.

#### 14. `pong`

Response to ping.

```typescript
{
  type: "pong",
  data: null
}
```

### Client → Server Events

#### 1. `user_message`

Send user message.

```typescript
{
  type: "user_message",
  data: {
    content: string,
    attachments?: Attachment[]
  },
  timestamp: number
}
```

#### 2. `stop`

Stop current generation.

```typescript
{
  type: "stop",
  timestamp: number
}
```

#### 3. `ping`

Keep-alive ping.

```typescript
{
  type: "ping",
  timestamp: number
}
```

#### 4. `resume_interrupt`

Resume from interrupt (human-in-the-loop).

```typescript
{
  type: "resume_interrupt",
  data: {
    interruptId: string,
    decision: {
      action: "approve" | "reject" | "modify",
      reason?: string,
      modifiedArgs?: object
    }
  },
  timestamp: number
}
```

#### 5. `retry_message`

Retry a failed message. See [Message Retry Guide](#message-retry) for details.

```typescript
{
  type: "retry_message",
  data: {
    turn_id: string    // The ID of the failed turn to retry
  },
  timestamp: number
}
```

## Message Retry

### Overview

When a message fails to execute (due to network errors, API timeouts, etc.), users can retry the message. The system supports up to **3 retries** per message by default.

### Key Concepts

#### What is a Turn?

A **Turn** (or `ChatTurn`) represents a complete **user input → assistant response** cycle. Every time a user sends a message, a new turn is created to track:

| Field | Description |
|-------|-------------|
| `id` | Unique turn identifier (UUID) - **this is the `turn_id`** |
| `user_message_id` | Reference to the user's message |
| `assistant_message_id` | Reference to the assistant's response |
| `status` | Current status: `pending`, `processing`, `completed`, `failed`, `cancelled` |
| `error_code` | Error classification (e.g., `rate_limit`, `api_timeout_error`, `api_connection_error`) |
| `error_message` | Human-readable error description |
| `retry_count` | Number of retry attempts made |
| `max_retries` | Maximum allowed retries (default: 3) |
| `can_retry` | Whether retry is still possible |
| `partial_content` | Any partial response generated before failure |

#### Error Codes

| Code | Description |
|------|-------------|
| `rate_limit` | Rate limit exceeded |
| `context_overflow` | Context too long |
| `content_filter` | Content filtered |
| `auth_error` | Authentication failed |
| `quota_exceeded` | Quota exceeded |
| `bad_request` | Bad request |
| `internal_server_error` | Model internal error |
| `api_connection_error` | API connection error |
| `api_timeout_error` | Request timeout |
| `database_error` | Database error |
| `unknown` | Unknown error |

#### Turn ID vs Message ID

- **Message ID**: Identifies a single message (user or assistant)
- **Turn ID**: Identifies the complete request-response cycle, linking user message to assistant response

When retrying, you use the **turn_id**, not the message_id.

### Getting Failed Turns

Use the REST API to fetch failed turns that can be retried:

```typescript
// GET /api/sessions/turns/conversation/{cid}/failed?retryable_only=true

interface FailedTurnsResponse {
  turns: TurnResponse[];
  retryable_count: number;
}

interface TurnResponse {
  id: string;                    // This is the turn_id
  cid: string;
  user_message_id: string | null;
  assistant_message_id: string | null;
  user_input_preview: string | null;  // Sanitized preview of user input
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  error_code: string | null;     // e.g., "rate_limit", "api_timeout_error", "api_connection_error"
  error_message: string | null;
  partial_content: string | null;
  content_preserved: boolean;
  retry_count: number;
  max_retries: number;
  can_retry: boolean;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  tokens_used: { [key: string]: number } | null;
  created_at: string;
}
```

### Sending Retry Request

```typescript
// WebSocket message to retry a failed turn
ws.send(JSON.stringify({
  type: "retry_message",
  data: {
    turn_id: "550e8400-e29b-41d4-a716-446655440000"  // UUID of the failed turn
  },
  timestamp: Date.now()
}));
```

### Server Events for Retry

#### `retry_started`

Sent when retry begins.

```typescript
{
  type: "retry_started",
  data: {
    turnId: string,       // Turn being retried
    attempt: number,      // Current attempt number (1-3)
    maxRetries: number    // Maximum retries allowed
  }
}
```

After `retry_started`, the normal message flow events follow (`message_start`, `message_delta`, etc.).

### Error Codes

When a retry request fails, you'll receive an error event:

```typescript
{
  type: "error",
  data: {
    message: string,
    code: "VALIDATION_ERROR" | "NOT_FOUND" | "FORBIDDEN" | 
          "INVALID_REQUEST" | "RETRY_LIMIT_EXCEEDED" | 
          "MESSAGE_NOT_FOUND" | "RETRY_FAILED" | "CONVERSATION_BUSY"
  }
}
```

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Missing or invalid turn_id |
| `NOT_FOUND` | Turn does not exist |
| `FORBIDDEN` | User doesn't own this turn |
| `INVALID_REQUEST` | Turn doesn't belong to current conversation |
| `RETRY_LIMIT_EXCEEDED` | Max retries (3) already reached |
| `MESSAGE_NOT_FOUND` | Original user message was deleted |
| `RETRY_FAILED` | Internal error preparing retry |
| `CONVERSATION_BUSY` | Another request is in progress |

### Frontend Implementation

```typescript
import { useState, useCallback } from 'react';

interface FailedTurn {
  id: string;
  userInputPreview: string;
  errorMessage: string;
  retryCount: number;
  maxRetries: number;
  canRetry: boolean;
}

export function useMessageRetry(cid: string, ws: WebSocket | null) {
  const [failedTurns, setFailedTurns] = useState<FailedTurn[]>([]);
  const [retryingTurnId, setRetryingTurnId] = useState<string | null>(null);

  // Fetch failed turns from API
  const fetchFailedTurns = useCallback(async () => {
    const response = await fetch(
      `/api/sessions/turns/conversation/${cid}/failed?retryable_only=true`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();
    setFailedTurns(data.turns.map((t: TurnResponse) => ({
      id: t.id,
      userInputPreview: t.user_input_preview,
      errorMessage: t.error_message,
      retryCount: t.retry_count,
      maxRetries: t.max_retries,
      canRetry: t.can_retry,
    })));
  }, [cid]);

  // Send retry request
  const retryMessage = useCallback((turnId: string) => {
    if (ws?.readyState === WebSocket.OPEN) {
      setRetryingTurnId(turnId);
      ws.send(JSON.stringify({
        type: "retry_message",
        data: { turn_id: turnId },
        timestamp: Date.now(),
      }));
    }
  }, [ws]);

  // Handle WebSocket events
  const handleWSMessage = useCallback((event: MessageEvent) => {
    const { type, data } = JSON.parse(event.data);
    
    switch (type) {
      case 'retry_started':
        console.log(`Retrying turn ${data.turnId}, attempt ${data.attempt}/${data.maxRetries}`);
        break;
        
      case 'done':
        // Retry completed, refresh failed turns list
        setRetryingTurnId(null);
        fetchFailedTurns();
        break;
        
      case 'error':
        if (data.code === 'RETRY_LIMIT_EXCEEDED') {
          toast.error('Maximum retry attempts reached');
        } else if (data.code === 'CONVERSATION_BUSY') {
          toast.error('Please wait for current request to complete');
        }
        setRetryingTurnId(null);
        break;
    }
  }, [fetchFailedTurns]);

  return {
    failedTurns,
    retryingTurnId,
    retryMessage,
    fetchFailedTurns,
    handleWSMessage,
  };
}
```

### UI Component Example

```tsx
function FailedMessageBanner({ 
  turn, 
  onRetry, 
  isRetrying 
}: { 
  turn: FailedTurn; 
  onRetry: (turnId: string) => void;
  isRetrying: boolean;
}) {
  return (
    <div className="failed-message-banner">
      <div className="error-icon">⚠️</div>
      
      <div className="error-content">
        <p className="error-message">{turn.errorMessage}</p>
        <p className="user-input-preview">
          Message: "{turn.userInputPreview}"
        </p>
      </div>
      
      {turn.canRetry ? (
        <button 
          onClick={() => onRetry(turn.id)}
          disabled={isRetrying}
          className="retry-button"
        >
          {isRetrying ? (
            <Spinner />
          ) : (
            <>
              🔄 Retry ({turn.retryCount}/{turn.maxRetries})
            </>
          )}
        </button>
      ) : (
        <span className="retry-exhausted">
          Max retries reached
        </span>
      )}
    </div>
  );
}

// Usage in message list
function MessageList({ messages, failedTurns, onRetry, retryingTurnId }) {
  return (
    <div className="message-list">
      {messages.map(msg => (
        <React.Fragment key={msg.id}>
          <MessageBubble message={msg} />
          
          {/* Show retry banner for failed messages */}
          {msg.role === 'assistant' && 
           failedTurns.find(t => t.assistantMessageId === msg.id) && (
            <FailedMessageBanner
              turn={failedTurns.find(t => t.assistantMessageId === msg.id)!}
              onRetry={onRetry}
              isRetrying={retryingTurnId !== null}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
```

### Complete Flow Diagram

```
User                    Frontend                   Backend
  |                        |                          |
  |-- Click Retry -------->|                          |
  |                        |-- retry_message -------->|
  |                        |   {turn_id: "xxx"}       |
  |                        |                          |
  |                        |<-- retry_started --------|
  |                        |   {attempt: 2/3}         |
  |                        |                          |
  |                        |<-- message_start --------|
  |<-- Show typing --------|                          |
  |                        |                          |
  |                        |<-- message_delta --------|
  |<-- Stream content -----|   (streaming...)         |
  |                        |                          |
  |                        |<-- message_end ----------|
  |<-- Show response ------|                          |
  |                        |                          |
  |                        |<-- done -----------------|
  |<-- Enable input -------|                          |
  |                        |                          |
```

### Best Practices

1. **Show Retry Count**: Display `retry_count/max_retries` so users know attempts remaining
2. **Disable During Processing**: Disable retry button while any request is in progress
3. **Preserve Partial Content**: If `partial_content` exists, show it with a "continues below" indicator
4. **Error Classification**: Use `error_code` to show appropriate error icons/messages
5. **Auto-Refresh**: Refresh failed turns list after each retry attempt
6. **Timeout Warning**: For `api_timeout_error` errors, suggest trying a simpler request

## Frontend Implementation Example

### React Hook

```typescript
import { useEffect, useRef, useState, useCallback } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  contentType: 'json' | 'markdown' | 'text' | 'mixed';
  toolCalls?: ToolCallSummary[];
  isStreaming?: boolean;
}

interface UseWebSocketOptions {
  cid: string;
  token: string;
  projectId?: string;
  onError?: (error: string) => void;
}

export function useChatWebSocket({ cid, token, projectId, onError }: UseWebSocketOptions) {
  const ws = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [files, setFiles] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);

  useEffect(() => {
    const projectParam = projectId ? `&project_id=${projectId}` : '';
    const url = `ws://${window.location.host}/ws/chat?cid=${cid}&token=${token}${projectParam}`;
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.current.onmessage = (event) => {
      const { type, data } = JSON.parse(event.data);
      
      switch (type) {
        case 'connected':
          setConnected(true);
          break;
          
        case 'state_update':
          // Full history received
          setMessages(data.messages);
          setTodos(data.todos);
          setFiles(data.files);
          break;
          
        case 'message_start':
          setIsProcessing(true);
          setCurrentMessageId(data.messageId);
          setMessages(prev => [...prev, {
            id: data.messageId,
            role: 'assistant',
            content: '',
            contentType: 'text',
            isStreaming: true,
          }]);
          break;
          
        case 'message_delta':
          setMessages(prev => prev.map(msg => 
            msg.id === data.messageId
              ? { ...msg, content: msg.content + data.delta }
              : msg
          ));
          break;
          
        case 'message_end':
          setMessages(prev => prev.map(msg => 
            msg.id === data.messageId
              ? {
                  ...msg,
                  content: data.content,
                  contentType: data.metadata?.contentType || 'text',
                  toolCalls: data.toolCalls,
                  isStreaming: false,
                }
              : msg
          ));
          break;
          
        case 'tool_call_start':
          // Update message with new tool call
          setMessages(prev => prev.map(msg => 
            msg.id === data.messageId
              ? {
                  ...msg,
                  toolCalls: [...(msg.toolCalls || []), {
                    id: data.toolCallId,
                    name: data.toolName,
                    type: data.toolType,
                    status: 'running',
                    argsPreview: formatArgsPreview(data.args),
                  }],
                }
              : msg
          ));
          break;
          
        case 'tool_call_result':
          setMessages(prev => prev.map(msg => 
            msg.id === data.messageId
              ? {
                  ...msg,
                  toolCalls: msg.toolCalls?.map(tc =>
                    tc.id === data.toolCallId
                      ? {
                          ...tc,
                          status: data.status,
                          resultPreview: formatResultPreview(data.result),
                          durationMs: data.durationMs,
                        }
                      : tc
                  ),
                }
              : msg
          ));
          break;
          
        case 'todos_updated':
          setTodos(data.todos);
          break;
          
        case 'error':
          onError?.(data.message);
          break;
          
        case 'done':
          setIsProcessing(false);
          setCurrentMessageId(null);
          break;
      }
    };

    ws.current.onclose = () => {
      setConnected(false);
    };

    ws.current.onerror = () => {
      onError?.('WebSocket connection error');
    };

    return () => {
      ws.current?.close();
    };
  }, [cid, token, onError]);

  const sendMessage = useCallback((content: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      // Add user message immediately
      const userMsgId = crypto.randomUUID();
      setMessages(prev => [...prev, {
        id: userMsgId,
        role: 'user',
        content,
        contentType: 'text',
      }]);
      
      // Send to server
      ws.current.send(JSON.stringify({
        type: 'user_message',
        data: { content },
        timestamp: Date.now(),
      }));
    }
  }, []);

  const stopGeneration = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'stop',
        timestamp: Date.now(),
      }));
    }
  }, []);

  return {
    connected,
    messages,
    todos,
    files,
    isProcessing,
    sendMessage,
    stopGeneration,
  };
}

// Helper functions
function formatArgsPreview(args: Record<string, any>): string {
  return Object.entries(args)
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${String(v).slice(0, 30)}`)
    .join(', ');
}

function formatResultPreview(result: any): string {
  if (typeof result === 'string') return result.slice(0, 100);
  if (result?.error) return `Error: ${result.error}`;
  if (result?.message) return result.message;
  return JSON.stringify(result).slice(0, 100);
}
```

### Message Rendering

```tsx
function MessageList({ messages }: { messages: Message[] }) {
  return (
    <div className="message-list">
      {messages.map(msg => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  return (
    <div className={`message ${message.role}`}>
      {/* Tool calls (collapsed by default) */}
      {message.toolCalls && message.toolCalls.length > 0 && (
        <ToolCallsPanel toolCalls={message.toolCalls} />
      )}
      
      {/* Message content */}
      <MessageContent 
        content={message.content}
        contentType={message.contentType}
        isStreaming={message.isStreaming}
      />
    </div>
  );
}

function MessageContent({ content, contentType, isStreaming }) {
  if (isStreaming) {
    return <StreamingText text={content} />;
  }
  
  switch (contentType) {
    case 'json':
      return <JsonViewer data={JSON.parse(content)} />;
    case 'markdown':
      return <MarkdownRenderer content={content} />;
    case 'mixed':
      return <MixedContentRenderer content={content} />;
    default:
      return <pre>{content}</pre>;
  }
}

function ToolCallsPanel({ toolCalls }: { toolCalls: ToolCallSummary[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  
  return (
    <div className="tool-calls">
      {toolCalls.map(tc => (
        <ToolCallCard 
          key={tc.id}
          toolCall={tc}
          isExpanded={expanded === tc.id}
          onToggle={() => setExpanded(expanded === tc.id ? null : tc.id)}
        />
      ))}
    </div>
  );
}

function ToolCallCard({ toolCall, isExpanded, onToggle }) {
  const [details, setDetails] = useState(null);
  
  // Load full details on expand
  useEffect(() => {
    if (isExpanded && !details) {
      api.getToolCallDetail(toolCall.id).then(setDetails);
    }
  }, [isExpanded, toolCall.id, details]);
  
  return (
    <div className="tool-call-card">
      <div className="tool-call-header" onClick={onToggle}>
        <StatusIcon status={toolCall.status} />
        <span className="tool-name">{toolCall.name}</span>
        {toolCall.durationMs && (
          <span className="duration">{toolCall.durationMs}ms</span>
        )}
      </div>
      
      {/* Preview (always visible) */}
      <div className="tool-call-preview">
        {toolCall.argsPreview && <div>Args: {toolCall.argsPreview}</div>}
        {toolCall.resultPreview && <div>Result: {toolCall.resultPreview}</div>}
      </div>
      
      {/* Full details (loaded on demand) */}
      {isExpanded && details && (
        <div className="tool-call-details">
          <h4>Arguments</h4>
          <JsonViewer data={details.args} />
          <h4>Result</h4>
          <JsonViewer data={details.result} />
        </div>
      )}
    </div>
  );
}
```

## API Endpoints for On-Demand Loading

### Get Tool Call Details

```
GET /api/conversations/{cid}/messages/{messageId}/tool-calls/{toolCallId}
```

Response:
```json
{
  "id": "uuid",
  "name": "evaluate_page_eeat_core",
  "args": { "url": "https://...", "options": {...} },
  "result": { "score": 38, "grade": "D", ... },
  "status": "success",
  "durationMs": 4572,
  "startedAt": "2024-01-01T00:00:00Z",
  "endedAt": "2024-01-01T00:00:04Z"
}
```

### Get Citation Content

```
GET /api/conversations/{cid}/messages/{messageId}/citations/{citationId}
```

Response:
```json
{
  "id": "uuid",
  "filename": "document.md",
  "chunkIndex": 3,
  "similarity": 0.89,
  "content": "Full citation content..."
}
```

## Error Handling

### Connection Errors

```typescript
ws.current.onerror = () => {
  // Show reconnection UI
  setConnectionError(true);
  
  // Auto-reconnect with exponential backoff
  setTimeout(() => reconnect(), backoffMs);
};

ws.current.onclose = (event) => {
  if (event.code === 4001) {
    // Unauthorized - redirect to login
    router.push('/login');
  } else if (event.code === 4004) {
    // Conversation not found
    showError('Conversation not found');
  }
};
```

### Message Processing Errors

```typescript
case 'error':
  toast.error(data.message);
  setIsProcessing(false);
  break;
  
case 'done':
  if (data?.reason === 'error') {
    // Error occurred but request completed
    toast.warning('Request completed with errors');
  }
  setIsProcessing(false);
  break;
```

## Content Block Rendering (NEW)

The new architecture uses `contentBlocks` for correct display order of text and tool calls.

### Key Principle

**Tool calls and subagent blocks appear inline with text in the correct time order.**

```
Old architecture (wrong order):        New architecture (correct order):
┌────────────────────────────┐        ┌────────────────────────────┐
│ 🔧 tool_call (at top)      │        │ Let me search for info...  │
│ ────────────────────────── │   →    │ ────────────────────────── │
│ Let me search for info...  │        │ 🔧 web_search (inline)     │
│ Based on the results...    │        │ ────────────────────────── │
└────────────────────────────┘        │ Based on the results...    │
                                      └────────────────────────────┘
```

### Content Block Renderer

```tsx
/**
 * Renders message content blocks in correct order.
 * Use this instead of the old content + toolCalls approach.
 */
function ContentBlocksRenderer({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="content-blocks">
      {blocks.map(block => (
        <ContentBlockItem key={block.id} block={block} />
      ))}
    </div>
  );
}

function ContentBlockItem({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'text':
      return <TextBlockView block={block} />;
    case 'tool_call':
      return <ToolCallBlockView block={block} />;
    case 'subagent':
      return <SubagentBlockView block={block} />;
    case 'file_ref':
      return <FileRefBlockView block={block} />;
    case 'image':
      return <ImageBlockView block={block} />;
    case 'citation':
      return <CitationBlockView block={block} />;
    default:
      return null;
  }
}

function TextBlockView({ block }: { block: TextBlock }) {
  return (
    <div className="text-block">
      <MarkdownRenderer content={block.content} />
    </div>
  );
}

function ToolCallBlockView({ block }: { block: ToolCallBlock }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className={`tool-call-block status-${block.status}`}>
      <div className="tool-header" onClick={() => setExpanded(!expanded)}>
        <StatusIcon status={block.status} />
        <span className="tool-name">{block.toolDisplayName}</span>
        {block.durationMs && (
          <span className="duration">{block.durationMs}ms</span>
        )}
        <ChevronIcon expanded={expanded} />
      </div>
      
      {/* Preview (always visible) */}
      {!expanded && block.resultPreview && (
        <div className="result-preview">{block.resultPreview}</div>
      )}
      
      {/* Full details (on expand) */}
      {expanded && (
        <div className="tool-details">
          <div className="args-section">
            <h4>参数</h4>
            <JsonViewer data={block.args} />
          </div>
          {block.result && (
            <div className="result-section">
              <h4>结果</h4>
              <JsonViewer data={block.result} />
            </div>
          )}
          {block.error && (
            <div className="error-section">
              <h4>错误</h4>
              <pre className="error">{block.error}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Subagent block with nested child blocks.
 * Renders as a collapsible section containing tool calls.
 */
function SubagentBlockView({ block }: { block: SubagentBlock }) {
  const [expanded, setExpanded] = useState(true);
  
  return (
    <div className={`subagent-block status-${block.status}`}>
      <div className="subagent-header" onClick={() => setExpanded(!expanded)}>
        <AgentIcon />
        <span className="subagent-name">{block.subagentDisplayName}</span>
        <span className="task-desc">{block.taskDescription}</span>
        {block.durationMs && (
          <span className="duration">{(block.durationMs / 1000).toFixed(1)}s</span>
        )}
        <ChevronIcon expanded={expanded} />
      </div>
      
      {/* Nested content blocks */}
      {expanded && block.childBlocks.length > 0 && (
        <div className="subagent-content">
          {block.childBlocks.map(child => (
            <ContentBlockItem key={child.id} block={child} />
          ))}
        </div>
      )}
    </div>
  );
}

function FileRefBlockView({ block }: { block: FileRefBlock }) {
  return (
    <div className={`file-ref-block operation-${block.operation}`}>
      <FileIcon />
      <span className="file-path">{block.path}</span>
      <span className="operation-badge">{block.operation}</span>
      {block.contentPreview && (
        <pre className="content-preview">{block.contentPreview}</pre>
      )}
    </div>
  );
}
```

### Message Bubble with Content Blocks

```tsx
function MessageBubble({ message }: { message: Message }) {
  // Use contentBlocks if available (new architecture)
  // Fall back to legacy content field
  const hasContentBlocks = message.contentBlocks && message.contentBlocks.length > 0;
  
  return (
    <div className={`message ${message.role}`}>
      {hasContentBlocks ? (
        <ContentBlocksRenderer blocks={message.contentBlocks} />
      ) : (
        // Legacy fallback
        <>
          {message.toolCalls && message.toolCalls.length > 0 && (
            <ToolCallsPanel toolCalls={message.toolCalls} />
          )}
          <MessageContent 
            content={message.content}
            contentType={message.contentType}
          />
        </>
      )}
      
      {/* Token usage footer */}
      {message.promptTokens && (
        <div className="usage-footer">
          {message.promptTokens + (message.completionTokens || 0)} tokens
        </div>
      )}
    </div>
  );
}
```

### Streaming with Content Blocks

During streaming, build content blocks incrementally:

```tsx
function useStreamingMessage() {
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [currentTextBlock, setCurrentTextBlock] = useState<TextBlock | null>(null);
  
  const handleMessageDelta = (delta: string) => {
    setCurrentTextBlock(prev => {
      if (!prev) {
        const newBlock: TextBlock = {
          id: `blk-${Date.now()}`,
          type: 'text',
          content: delta,
        };
        setBlocks(b => [...b, newBlock]);
        return newBlock;
      }
      // Update existing text block
      const updated = { ...prev, content: prev.content + delta };
      setBlocks(b => b.map(bl => bl.id === prev.id ? updated : bl));
      return updated;
    });
  };
  
  const handleToolCallStart = (data: ToolCallBlock) => {
    // Finalize current text block
    setCurrentTextBlock(null);
    // Add tool call block
    setBlocks(b => [...b, data]);
  };
  
  const handleToolCallResult = (toolCallId: string, result: any, status: string) => {
    setBlocks(b => b.map(bl => 
      bl.type === 'tool_call' && bl.toolCallId === toolCallId
        ? { ...bl, result, status, resultPreview: formatResultPreview(result) }
        : bl
    ));
  };
  
  const handleSubagentStart = (data: SubagentBlock) => {
    setCurrentTextBlock(null);
    setBlocks(b => [...b, { ...data, childBlocks: [] }]);
  };
  
  return { blocks, handleMessageDelta, handleToolCallStart, handleToolCallResult, handleSubagentStart };
}
```

### CSS for Content Blocks

```css
.content-blocks {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.text-block {
  line-height: 1.6;
}

.tool-call-block {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.tool-call-block.status-running {
  border-color: var(--primary-color);
  animation: pulse 1s infinite;
}

.tool-call-block.status-success {
  border-color: var(--success-color);
}

.tool-call-block.status-error {
  border-color: var(--error-color);
}

.tool-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  cursor: pointer;
}

.tool-name {
  font-weight: 500;
}

.duration {
  margin-left: auto;
  color: var(--text-muted);
  font-size: 0.85em;
}

.subagent-block {
  border-left: 3px solid var(--primary-color);
  margin-left: 8px;
  padding-left: 12px;
}

.subagent-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  cursor: pointer;
}

.subagent-content {
  padding-left: 16px;
  border-left: 1px dashed var(--border-color);
}

.file-ref-block {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-code);
  border-radius: 6px;
  font-family: monospace;
}

.operation-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75em;
  text-transform: uppercase;
}

.operation-badge.create { background: var(--success-bg); }
.operation-badge.edit { background: var(--warning-bg); }
.operation-badge.delete { background: var(--error-bg); }
```

### Virtual Scrolling for Long Conversations

For conversations with many messages, use virtual scrolling:

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualMessageList({ messages }: { messages: Message[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      // Estimate height based on content
      const msg = messages[index];
      const blocks = msg.contentBlocks?.length || 0;
      return 100 + blocks * 50;
    },
    overscan: 5,
  });
  
  // Handle loading more on scroll to top
  const handleScroll = useCallback(() => {
    if (!parentRef.current) return;
    const { scrollTop } = parentRef.current;
    
    if (scrollTop < 200 && pagination.hasMore && !isLoading) {
      loadOlderMessages();
    }
  }, [pagination, isLoading]);
  
  return (
    <div
      ref={parentRef}
      className="message-list-container"
      onScroll={handleScroll}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map(virtualItem => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <MessageBubble message={messages[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Rendering Optimization Tips

1. **Delayed Markdown rendering**: During streaming, render as plain text. Switch to Markdown after `message_end`.

2. **requestAnimationFrame for batched updates**: Buffer multiple delta events and update in animation frame.

3. **Memoize components**: Use `React.memo` for message components to avoid re-renders.

4. **CSS cursor animation**: Show typing cursor with CSS instead of JavaScript.

```css
.streaming-cursor::after {
  content: '▌';
  animation: blink 0.7s infinite;
}

@keyframes blink {
  50% { opacity: 0; }
}
```

## Best Practices

1. **Optimistic Updates**: Add user message to UI immediately, don't wait for server
2. **Streaming Display**: Render content incrementally as `message_delta` arrives
3. **Lazy Load Details**: Only fetch tool call args/result when user expands
4. **Handle Disconnects**: Implement reconnection with exponential backoff
5. **Debounce Renders**: Batch rapid `message_delta` updates to avoid jank
6. **Preserve Scroll**: Auto-scroll to bottom during streaming, but respect user scroll
