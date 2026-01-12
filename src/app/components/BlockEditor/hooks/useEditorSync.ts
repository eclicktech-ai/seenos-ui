"use client";

import { useEffect, useCallback, useRef } from "react";
import { useEditorStore } from "../stores/editorStore";
import type { StreamEvent } from "@/app/types/types";

// ============ 类型定义 ============

/** 编辑器预览更新事件 */
interface EditorPreviewUpdateEvent {
  type: "editor.preview_update";
  data: {
    item_id: string;
    update_type: "block" | "full";
    block_index?: number;
    html_fragment?: string;
    full_html?: string;
  };
}

/** 编辑器生成进度事件 */
interface EditorGenerationProgressEvent {
  type: "editor.generation_progress";
  data: {
    item_id: string;
    progress: number;
    current_section: string;
    message: string;
  };
}

/** 编辑器内容保存确认事件 */
interface EditorContentSavedEvent {
  type: "editor.content_saved";
  data: {
    item_id: string;
    content_version: number;
  };
}

type EditorEvent =
  | EditorPreviewUpdateEvent
  | EditorGenerationProgressEvent
  | EditorContentSavedEvent;

// ============ 配置 ============

/** 预览刷新防抖延迟 (ms) */
const PREVIEW_DEBOUNCE_DELAY = 500;

/** 自动保存延迟 (ms) */
const AUTO_SAVE_DELAY = 2000;

// ============ Hook ============

interface UseEditorSyncOptions {
  /** WebSocket 发送消息函数 */
  sendWsMessage?: (message: unknown) => void;
  /** 是否启用自动保存 */
  enableAutoSave?: boolean;
  /** 是否启用实时预览 */
  enableLivePreview?: boolean;
}

/**
 * 编辑器实时同步 Hook
 * 处理 WebSocket 事件和自动保存逻辑
 */
export function useEditorSync(options: UseEditorSyncOptions = {}) {
  const {
    sendWsMessage,
    enableAutoSave = true,
    enableLivePreview = true,
  } = options;

  const {
    itemId,
    content,
    contentVersion,
    isDirty,
    isEditorOpen,
    saveContent,
  } = useEditorStore();

  // Refs for debouncing
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastContentRef = useRef<string | null>(null);

  /**
   * 请求预览更新
   */
  const requestPreviewUpdate = useCallback(
    (path?: string, value?: unknown) => {
      if (!sendWsMessage || !itemId || !enableLivePreview) return;

      // 清除之前的防抖定时器
      if (previewDebounceRef.current) {
        clearTimeout(previewDebounceRef.current);
      }

      // 防抖发送
      previewDebounceRef.current = setTimeout(() => {
        if (path && value !== undefined) {
          // 部分更新
          sendWsMessage({
            type: "editor.content_update",
            data: {
              item_id: itemId,
              update: { path, value },
            },
          });
        } else {
          // 请求完整预览
          sendWsMessage({
            type: "editor.request_preview",
            data: { item_id: itemId },
          });
        }
      }, PREVIEW_DEBOUNCE_DELAY);
    },
    [sendWsMessage, itemId, enableLivePreview]
  );

  /**
   * 处理 WebSocket 编辑器事件
   */
  const handleEditorEvent = useCallback((event: StreamEvent) => {
    const eventType = (event as { event?: string }).event || "";

    // 只处理编辑器相关事件
    if (!eventType.startsWith("editor.")) return;

    const editorEvent = event as unknown as EditorEvent;
    const { itemId: storeItemId } = useEditorStore.getState();

    switch (editorEvent.type) {
      case "editor.preview_update": {
        const { item_id, update_type, full_html, html_fragment, block_index } =
          editorEvent.data;

        // 确保是当前编辑的内容
        if (item_id !== storeItemId) return;

        if (update_type === "full" && full_html) {
          useEditorStore.setState({
            previewHtml: full_html,
            isPreviewLoading: false,
          });
        } else if (
          update_type === "block" &&
          html_fragment &&
          block_index !== undefined
        ) {
          // 局部更新 - 需要更复杂的 DOM 操作
          // 暂时使用完整刷新
          const state = useEditorStore.getState();
          if (state.itemId) {
            state.refreshPreview();
          }
        }
        break;
      }

      case "editor.generation_progress": {
        const { item_id, progress, message } = editorEvent.data;

        if (item_id !== storeItemId) return;

        // 可以添加进度状态到 store
        console.log(`[EditorSync] Generation progress: ${progress}% - ${message}`);
        break;
      }

      case "editor.content_saved": {
        const { item_id, content_version } = editorEvent.data;

        if (item_id !== storeItemId) return;

        useEditorStore.setState({
          contentVersion: content_version,
          isDirty: false,
          isSaving: false,
        });
        break;
      }
    }
  }, []);

  /**
   * 自动保存逻辑
   */
  useEffect(() => {
    if (!enableAutoSave || !isEditorOpen || !isDirty) return;

    // 清除之前的定时器
    if (autoSaveDebounceRef.current) {
      clearTimeout(autoSaveDebounceRef.current);
    }

    // 防抖自动保存
    autoSaveDebounceRef.current = setTimeout(() => {
      saveContent();
    }, AUTO_SAVE_DELAY);

    return () => {
      if (autoSaveDebounceRef.current) {
        clearTimeout(autoSaveDebounceRef.current);
      }
    };
  }, [enableAutoSave, isEditorOpen, isDirty, content, saveContent]);

  /**
   * 内容变化时请求预览更新
   */
  useEffect(() => {
    if (!isEditorOpen || !content || !enableLivePreview) return;

    const contentStr = JSON.stringify(content);

    // 检查内容是否真的变化了
    if (contentStr === lastContentRef.current) return;
    lastContentRef.current = contentStr;

    // 请求预览更新
    requestPreviewUpdate();
  }, [isEditorOpen, content, enableLivePreview, requestPreviewUpdate]);

  /**
   * 清理
   */
  useEffect(() => {
    return () => {
      if (previewDebounceRef.current) {
        clearTimeout(previewDebounceRef.current);
      }
      if (autoSaveDebounceRef.current) {
        clearTimeout(autoSaveDebounceRef.current);
      }
    };
  }, []);

  return {
    handleEditorEvent,
    requestPreviewUpdate,
  };
}

export default useEditorSync;

