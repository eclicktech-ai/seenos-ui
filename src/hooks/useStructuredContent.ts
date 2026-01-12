"use client";

/**
 * useStructuredContent Hook
 * 
 * 封装结构化内容的加载、保存、预览和发布功能。
 * 基于 STRUCTURED_CONTENT_FRONTEND_GUIDE.md 规范实现。
 * 
 * 功能：
 * - 内容加载/保存/部分更新
 * - 版本冲突处理（乐观锁）
 * - 防抖保存
 * - 自动保存
 * - 监听 WebSocket 事件
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { apiClient } from "@/lib/api/client";
import type {
  StructuredContentData,
  ContentPageType,
  SaveContentResponse,
  PublishContentResponse,
  ContentSavedEventData,
  ContentRenderedEventData,
  ContentPublishedEventData,
} from "@/types";

// ============ 类型定义 ============

/** Hook 配置选项 */
export interface UseStructuredContentOptions {
  /** Content Item ID */
  itemId: string | null;
  /** 错误回调 */
  onError?: (error: Error) => void;
  /** 保存成功回调 */
  onSave?: (response: SaveContentResponse) => void;
  /** 发布成功回调 */
  onPublish?: (response: PublishContentResponse) => void;
  /** 版本冲突回调 */
  onVersionConflict?: (remoteVersion: number, localVersion: number) => void;
  /** 自动保存间隔（毫秒），0 表示禁用 */
  autoSaveInterval?: number;
  /** 防抖延迟（毫秒） */
  debounceDelay?: number;
}

/** Hook 返回值 */
export interface UseStructuredContentReturn {
  /** 结构化内容数据 */
  content: StructuredContentData | null;
  /** 页面类型 */
  pageType: ContentPageType | null;
  /** 内容版本号 */
  version: number;
  /** 内容状态 */
  status: 'draft' | 'published' | 'archived' | null;
  /** 是否正在加载 */
  loading: boolean;
  /** 是否正在保存 */
  saving: boolean;
  /** 是否有未保存的更改 */
  isDirty: boolean;
  /** 错误信息 */
  error: Error | null;
  /** 预览 HTML */
  previewHtml: string;
  /** 预览是否正在加载 */
  previewLoading: boolean;
  /** 保存完整内容 */
  save: (newContent: StructuredContentData) => Promise<void>;
  /** 部分更新字段 */
  patch: (path: string, value: unknown) => Promise<void>;
  /** 发布内容 */
  publish: (force?: boolean) => Promise<PublishContentResponse>;
  /** 刷新内容 */
  refresh: () => Promise<void>;
  /** 刷新预览 */
  refreshPreview: () => Promise<void>;
  /** 设置本地内容（不触发保存） */
  setContent: (content: StructuredContentData | null) => void;
  /** 标记为脏（有未保存更改） */
  markDirty: () => void;
  /** 清除脏标记 */
  clearDirty: () => void;
}

/** 版本冲突错误 */
export class VersionConflictError extends Error {
  constructor(
    message: string,
    public remoteVersion: number,
    public localVersion: number
  ) {
    super(message);
    this.name = "VersionConflictError";
  }
}

// ============ 防抖函数 ============

function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // 保持 callback 引用最新
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  ) as T;

  // 清理
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

// ============ Hook 实现 ============

export function useStructuredContent({
  itemId,
  onError,
  onSave,
  onPublish,
  onVersionConflict,
  autoSaveInterval = 0,
  debounceDelay = 1000,
}: UseStructuredContentOptions): UseStructuredContentReturn {
  // 状态
  const [content, setContent] = useState<StructuredContentData | null>(null);
  const [pageType, setPageType] = useState<ContentPageType | null>(null);
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState<'draft' | 'published' | 'archived' | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  // Refs
  const versionRef = useRef(version);
  const contentRef = useRef(content);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 保持 refs 同步
  useEffect(() => {
    versionRef.current = version;
  }, [version]);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  // ============ 加载内容 ============

  const loadContent = useCallback(async () => {
    if (!itemId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.getStructuredContent(itemId);
      setContent(response.structured_content);
      setPageType(response.page_type);
      setVersion(response.content_version);
      setStatus(response.status);
      setIsDirty(false);
    } catch (e) {
      const err = e instanceof Error ? e : new Error("加载失败");
      setError(err);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  }, [itemId, onError]);

  // 初始加载
  useEffect(() => {
    if (itemId) {
      loadContent();
    } else {
      // 清空状态
      setContent(null);
      setPageType(null);
      setVersion(0);
      setStatus(null);
      setIsDirty(false);
      setPreviewHtml("");
    }
  }, [itemId, loadContent]);

  // ============ 保存内容 ============

  const saveContent = useCallback(
    async (newContent: StructuredContentData) => {
      if (!itemId) return;

      setSaving(true);
      setError(null);

      try {
        const response = await apiClient.saveStructuredContent(
          itemId,
          newContent,
          versionRef.current
        );

        setContent(newContent);
        setVersion(response.content_version);
        setIsDirty(false);
        onSave?.(response);
      } catch (e) {
        const err = e instanceof Error ? e : new Error("保存失败");

        // 检查是否是版本冲突
        if (err.message.includes("conflict") || err.message.includes("version")) {
          // 尝试获取远程版本
          try {
            const remote = await apiClient.getStructuredContent(itemId);
            const conflictError = new VersionConflictError(
              "内容已被其他会话修改",
              remote.content_version,
              versionRef.current
            );
            setError(conflictError);
            onVersionConflict?.(remote.content_version, versionRef.current);
          } catch {
            setError(err);
          }
        } else {
          setError(err);
        }
        onError?.(err);
      } finally {
        setSaving(false);
      }
    },
    [itemId, onError, onSave, onVersionConflict]
  );

  // 防抖保存
  const debouncedSave = useDebouncedCallback(saveContent, debounceDelay);

  // ============ 部分更新 ============

  const patchContent = useCallback(
    async (path: string, value: unknown) => {
      if (!itemId) return;

      setSaving(true);
      setError(null);

      try {
        const response = await apiClient.patchStructuredContent(
          itemId,
          path,
          value,
          versionRef.current // 使用当前版本号进行乐观锁验证
        );
        setVersion(response.content_version);
        setIsDirty(false);
      } catch (e) {
        const err = e instanceof Error ? e : new Error("更新失败");
        
        // 检查是否是版本冲突
        if (err.message.includes("conflict") || err.message.includes("version")) {
          onVersionConflict?.(0, versionRef.current);
        }
        
        setError(err);
        onError?.(err);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [itemId, onError, onVersionConflict]
  );

  // ============ 发布内容 ============

  const publishContent = useCallback(
    async (force = false): Promise<PublishContentResponse> => {
      if (!itemId) {
        throw new Error("No item ID");
      }

      setSaving(true);
      setError(null);

      try {
        const response = await apiClient.publishContent(itemId, force);
        setStatus("published");
        onPublish?.(response);
        return response;
      } catch (e) {
        const err = e instanceof Error ? e : new Error("发布失败");
        setError(err);
        onError?.(err);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [itemId, onError, onPublish]
  );

  // ============ 预览 ============

  const refreshPreview = useCallback(async () => {
    if (!itemId) return;

    setPreviewLoading(true);

    try {
      const html = await apiClient.getContentPreview(itemId);
      setPreviewHtml(html);
    } catch (e) {
      console.error("[useStructuredContent] Preview error:", e);
      // 预览失败不设置 error，只是清空预览
      setPreviewHtml("");
    } finally {
      setPreviewLoading(false);
    }
  }, [itemId]);

  // ============ 自动保存 ============

  useEffect(() => {
    if (autoSaveInterval > 0 && isDirty && content && itemId) {
      autoSaveTimerRef.current = setInterval(() => {
        if (contentRef.current) {
          saveContent(contentRef.current);
        }
      }, autoSaveInterval);

      return () => {
        if (autoSaveTimerRef.current) {
          clearInterval(autoSaveTimerRef.current);
        }
      };
    }
  }, [autoSaveInterval, isDirty, content, itemId, saveContent]);

  // ============ WebSocket 事件监听 ============

  useEffect(() => {
    if (!itemId) return;

    const handleContentSaved = (e: CustomEvent<ContentSavedEventData>) => {
      if (e.detail.item_id === itemId) {
        console.log("[useStructuredContent] Content saved event received");
        // 如果远程版本更高，刷新内容
        if (e.detail.content_version > versionRef.current) {
          loadContent();
        }
      }
    };

    const handleContentRendered = (e: CustomEvent<ContentRenderedEventData>) => {
      if (e.detail.item_id === itemId) {
        console.log("[useStructuredContent] Content rendered event received");
        refreshPreview();
      }
    };

    const handleContentPublished = (e: CustomEvent<ContentPublishedEventData>) => {
      if (e.detail.item_id === itemId) {
        console.log("[useStructuredContent] Content published event received");
        setStatus("published");
      }
    };

    // 添加事件监听
    window.addEventListener(
      "seenos:content_saved",
      handleContentSaved as EventListener
    );
    window.addEventListener(
      "seenos:content_rendered",
      handleContentRendered as EventListener
    );
    window.addEventListener(
      "seenos:content_published",
      handleContentPublished as EventListener
    );

    return () => {
      window.removeEventListener(
        "seenos:content_saved",
        handleContentSaved as EventListener
      );
      window.removeEventListener(
        "seenos:content_rendered",
        handleContentRendered as EventListener
      );
      window.removeEventListener(
        "seenos:content_published",
        handleContentPublished as EventListener
      );
    };
  }, [itemId, loadContent, refreshPreview]);

  // ============ 公开方法 ============

  const save = useCallback(
    async (newContent: StructuredContentData) => {
      await saveContent(newContent);
    },
    [saveContent]
  );

  const patch = useCallback(
    async (path: string, value: unknown) => {
      await patchContent(path, value);
    },
    [patchContent]
  );

  const publish = useCallback(
    async (force = false) => {
      return publishContent(force);
    },
    [publishContent]
  );

  const refresh = useCallback(async () => {
    await loadContent();
  }, [loadContent]);

  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  const clearDirty = useCallback(() => {
    setIsDirty(false);
  }, []);

  // ============ 返回值 ============

  return useMemo(
    () => ({
      content,
      pageType,
      version,
      status,
      loading,
      saving,
      isDirty,
      error,
      previewHtml,
      previewLoading,
      save,
      patch,
      publish,
      refresh,
      refreshPreview,
      setContent,
      markDirty,
      clearDirty,
    }),
    [
      content,
      pageType,
      version,
      status,
      loading,
      saving,
      isDirty,
      error,
      previewHtml,
      previewLoading,
      save,
      patch,
      publish,
      refresh,
      refreshPreview,
      markDirty,
      clearDirty,
    ]
  );
}

export default useStructuredContent;

