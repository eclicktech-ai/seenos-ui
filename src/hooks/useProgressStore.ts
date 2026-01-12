"use client";

/**
 * 进度状态管理 Hook (PROGRESS_EVENTS_FRONTEND_GUIDE.md)
 * 
 * 用于管理工具执行进度和重试状态的临时 UI 状态。
 * 
 * 核心原则：
 * - 进度事件是临时 UI 状态，不是消息内容
 * - 刷新页面后进度状态会丢失，但工具调用结果已保存到数据库
 * - 历史记录显示使用数据库保存的 durationMs，而非实时进度
 */

import { useCallback, useMemo, useReducer } from "react";
import type {
  ToolProgress,
  ModelRetryInfo,
  ToolProgressEventData,
  ToolRetryEventData,
  ModelRetryEventData,
} from "@/types";

// ============ State 类型 ============

interface ProgressState {
  /** 工具执行进度 (toolCallId -> progress) */
  toolProgress: Map<string, ToolProgress>;
  /** 
   * 工具名称到进度的映射 (toolName -> progress)
   * 用于处理后端 toolCallId 不一致的问题
   * tool_call_start 使用后端 UUID，tool_progress 使用 LLM API 的 call_xxx ID
   */
  toolProgressByName: Map<string, ToolProgress>;
  /** 模型是否正在重试 */
  modelRetrying: boolean;
  /** 模型重试信息 */
  modelRetryInfo: ModelRetryInfo | null;
}

const initialState: ProgressState = {
  toolProgress: new Map(),
  toolProgressByName: new Map(),
  modelRetrying: false,
  modelRetryInfo: null,
};

// ============ Actions ============

type ProgressAction =
  | { type: 'TOOL_PROGRESS'; data: ToolProgressEventData }
  | { type: 'TOOL_RETRY'; data: ToolRetryEventData }
  | { type: 'MODEL_RETRY'; data: ModelRetryEventData }
  | { type: 'CLEAR_MODEL_RETRY' }
  | { type: 'CLEAR_TOOL_PROGRESS'; toolCallId: string }
  | { type: 'RESET' };

// ============ Reducer ============

function progressReducer(state: ProgressState, action: ProgressAction): ProgressState {
  switch (action.type) {
    case 'TOOL_PROGRESS': {
      const { toolCallId, toolName, displayName, status, elapsed_ms, message } = action.data;
      console.log('[useProgressStore] TOOL_PROGRESS:', { toolCallId, toolName, displayName, status, elapsed_ms });
      
      const newProgress = new Map(state.toolProgress);
      const newProgressByName = new Map(state.toolProgressByName);
      
      const progressData: ToolProgress = {
        toolName,
        displayName,  // 用于 UI 显示的友好名称
        toolCallId,
        status,
        elapsedMs: elapsed_ms,
        message,
        // 保留重试信息（如果有）
        retryAttempt: newProgress.get(toolCallId)?.retryAttempt,
        maxRetries: newProgress.get(toolCallId)?.maxRetries,
        retryError: newProgress.get(toolCallId)?.retryError,
      };
      
      if (status === 'completed') {
        // 工具完成，清除进度状态
        newProgress.delete(toolCallId);
        newProgressByName.delete(toolName);
        console.log('[useProgressStore] Removed progress for:', toolCallId, 'and toolName:', toolName);
      } else {
        // 更新或添加进度状态 - 同时按 toolCallId 和 toolName 存储
        newProgress.set(toolCallId, progressData);
        newProgressByName.set(toolName, progressData);
        console.log('[useProgressStore] Set progress for toolCallId:', toolCallId, 'and toolName:', toolName, progressData);
      }
      
      return { ...state, toolProgress: newProgress, toolProgressByName: newProgressByName };
    }

    case 'TOOL_RETRY': {
      const { toolCallId, toolName, displayName, attempt, maxRetries, error } = action.data;
      const newProgress = new Map(state.toolProgress);
      const newProgressByName = new Map(state.toolProgressByName);
      
      // 更新工具重试状态
      const existing = newProgress.get(toolCallId);
      const progressData: ToolProgress = {
        toolName,
        displayName,  // 用于 UI 显示的友好名称
        toolCallId,
        status: existing?.status || 'running',
        elapsedMs: existing?.elapsedMs || 0,
        message: existing?.message,
        retryAttempt: attempt,
        maxRetries,
        retryError: error,
      };
      newProgress.set(toolCallId, progressData);
      newProgressByName.set(toolName, progressData);
      
      return { ...state, toolProgress: newProgress, toolProgressByName: newProgressByName };
    }

    case 'MODEL_RETRY': {
      const { attempt, maxRetries, delay, error } = action.data;
      return {
        ...state,
        modelRetrying: true,
        modelRetryInfo: { attempt, maxRetries, delay, error },
      };
    }

    case 'CLEAR_MODEL_RETRY': {
      return {
        ...state,
        modelRetrying: false,
        modelRetryInfo: null,
      };
    }

    case 'CLEAR_TOOL_PROGRESS': {
      const newProgress = new Map(state.toolProgress);
      const newProgressByName = new Map(state.toolProgressByName);
      // 找到对应的 toolName 并清除
      const existingProgress = newProgress.get(action.toolCallId);
      if (existingProgress) {
        newProgressByName.delete(existingProgress.toolName);
      }
      newProgress.delete(action.toolCallId);
      return { ...state, toolProgress: newProgress, toolProgressByName: newProgressByName };
    }

    case 'RESET': {
      return initialState;
    }

    default:
      return state;
  }
}

// ============ Hook ============

export function useProgressStore() {
  const [state, dispatch] = useReducer(progressReducer, initialState);

  /**
   * 处理 tool_progress 事件
   */
  const handleToolProgress = useCallback((data: ToolProgressEventData) => {
    dispatch({ type: 'TOOL_PROGRESS', data });
  }, []);

  /**
   * 处理 tool_retry 事件
   */
  const handleToolRetry = useCallback((data: ToolRetryEventData) => {
    dispatch({ type: 'TOOL_RETRY', data });
  }, []);

  /**
   * 处理 model_retry 事件
   */
  const handleModelRetry = useCallback((data: ModelRetryEventData) => {
    dispatch({ type: 'MODEL_RETRY', data });
    
    // 延迟后清除模型重试状态
    setTimeout(() => {
      dispatch({ type: 'CLEAR_MODEL_RETRY' });
    }, data.delay * 1000);
  }, []);

  /**
   * 清除指定工具的进度状态
   */
  const clearToolProgress = useCallback((toolCallId: string) => {
    dispatch({ type: 'CLEAR_TOOL_PROGRESS', toolCallId });
  }, []);

  /**
   * 重置所有进度状态
   */
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  /**
   * 获取指定工具的进度信息（按 toolCallId）
   */
  const getToolProgress = useCallback((toolCallId: string): ToolProgress | undefined => {
    return state.toolProgress.get(toolCallId);
  }, [state.toolProgress]);

  /**
   * 获取指定工具的进度信息（按 toolName）
   * 用于处理后端 toolCallId 不一致的问题
   */
  const getToolProgressByName = useCallback((toolName: string): ToolProgress | undefined => {
    return state.toolProgressByName.get(toolName);
  }, [state.toolProgressByName]);

  /**
   * 检查是否有任何工具正在运行
   */
  const hasRunningTools = useMemo(() => {
    return Array.from(state.toolProgress.values()).some(p => p.status === 'running');
  }, [state.toolProgress]);

  /**
   * 获取所有正在运行的工具
   */
  const runningTools = useMemo(() => {
    return Array.from(state.toolProgress.values()).filter(p => p.status === 'running');
  }, [state.toolProgress]);

  return useMemo(() => ({
    // 状态
    toolProgress: state.toolProgress,
    toolProgressByName: state.toolProgressByName,
    modelRetrying: state.modelRetrying,
    modelRetryInfo: state.modelRetryInfo,
    hasRunningTools,
    runningTools,

    // 事件处理器
    handleToolProgress,
    handleToolRetry,
    handleModelRetry,

    // 工具方法
    getToolProgress,
    getToolProgressByName,
    clearToolProgress,
    reset,
  }), [
    state.toolProgress,
    state.toolProgressByName,
    state.modelRetrying,
    state.modelRetryInfo,
    hasRunningTools,
    runningTools,
    handleToolProgress,
    handleToolRetry,
    handleModelRetry,
    getToolProgress,
    getToolProgressByName,
    clearToolProgress,
    reset,
  ]);
}

export type UseProgressStoreReturn = ReturnType<typeof useProgressStore>;

// ============ 工具函数 ============

/**
 * 格式化持续时间显示
 * @param ms 毫秒数
 * @returns 格式化后的字符串，如 "5.2s" 或 "1m 30s"
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    const decimal = Math.floor((ms % 1000) / 100);
    return decimal > 0 ? `${seconds}.${decimal}s` : `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}
