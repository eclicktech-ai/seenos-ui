"use client";

/**
 * useEditorEffects - 编辑器副作用 Hook
 * 
 * 处理：
 * - 键盘快捷键 (Cmd/Ctrl+S 保存, Cmd/Ctrl+Z 撤销, etc.)
 * - 自动保存
 * - 离开页面提示
 * - WebSocket 事件监听
 */

import { useEffect, useCallback, useRef } from "react";
import { useEditorStore } from "../stores/editorStore";
import type { ContentSavedEventData } from "@/types";

export interface UseEditorEffectsOptions {
  /** 是否启用自动保存 */
  autoSave?: boolean;
  /** 自动保存间隔（毫秒），默认 30000 (30秒) */
  autoSaveInterval?: number;
  /** 是否启用键盘快捷键 */
  enableKeyboardShortcuts?: boolean;
  /** 是否启用离开提示 */
  enableBeforeUnload?: boolean;
}

/**
 * 编辑器副作用 Hook
 * 
 * 在编辑器组件中使用此 Hook 来启用自动保存、键盘快捷键等功能。
 * 
 * @example
 * ```tsx
 * function BlockEditorPanel() {
 *   useEditorEffects({ autoSave: true });
 *   // ...
 * }
 * ```
 */
export function useEditorEffects({
  autoSave = true,
  autoSaveInterval = 30000,
  enableKeyboardShortcuts = true,
  enableBeforeUnload = true,
}: UseEditorEffectsOptions = {}) {
  const {
    isDirty,
    isSaving,
    isEditorOpen,
    itemId,
    saveContent,
    undo,
    redo,
    loadContent,
    refreshPreview,
  } = useEditorStore();

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveAttemptRef = useRef<number>(0);

  // ============ 键盘快捷键 ============

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isEditorOpen) return;

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Cmd/Ctrl + S: 保存
      if (cmdOrCtrl && e.key === "s") {
        e.preventDefault();
        if (isDirty && !isSaving) {
          saveContent();
        }
        return;
      }

      // Cmd/Ctrl + Z: 撤销
      if (cmdOrCtrl && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Cmd/Ctrl + Shift + Z 或 Cmd/Ctrl + Y: 重做
      if ((cmdOrCtrl && e.shiftKey && e.key === "z") || (cmdOrCtrl && e.key === "y")) {
        e.preventDefault();
        redo();
        return;
      }

      // Cmd/Ctrl + R: 刷新预览（不是刷新页面）
      if (cmdOrCtrl && e.key === "r") {
        e.preventDefault();
        refreshPreview();
        return;
      }
    },
    [isEditorOpen, isDirty, isSaving, saveContent, undo, redo, refreshPreview]
  );

  // 绑定键盘事件
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [enableKeyboardShortcuts, handleKeyDown]);

  // ============ 自动保存 ============

  useEffect(() => {
    if (!autoSave || !isEditorOpen || autoSaveInterval <= 0) {
      return;
    }

    // 清理之前的定时器
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }

    // 设置自动保存定时器
    autoSaveTimerRef.current = setInterval(() => {
      const store = useEditorStore.getState();
      
      // 只在有未保存更改且不在保存中时触发
      if (store.isDirty && !store.isSaving) {
        // 避免过于频繁的保存（至少间隔 10 秒）
        const now = Date.now();
        if (now - lastSaveAttemptRef.current >= 10000) {
          console.log("[useEditorEffects] Auto-saving...");
          lastSaveAttemptRef.current = now;
          store.saveContent();
        }
      }
    }, autoSaveInterval);

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [autoSave, autoSaveInterval, isEditorOpen]);

  // ============ 离开页面提示 ============

  useEffect(() => {
    if (!enableBeforeUnload) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const store = useEditorStore.getState();
      if (store.isDirty && store.isEditorOpen) {
        e.preventDefault();
        // 现代浏览器会显示标准提示，不再使用自定义文本
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enableBeforeUnload]);

  // ============ WebSocket 事件监听 ============

  useEffect(() => {
    if (!isEditorOpen || !itemId) return;

    // 监听 content_saved 事件（来自其他会话的保存）
    const handleContentSaved = (e: CustomEvent<ContentSavedEventData>) => {
      if (e.detail.item_id === itemId) {
        const store = useEditorStore.getState();
        
        // 如果远程版本更高，且本地没有未保存更改，则刷新内容
        if (e.detail.content_version > store.contentVersion && !store.isDirty) {
          console.log("[useEditorEffects] Remote content updated, reloading...");
          loadContent(itemId);
        } else if (e.detail.content_version > store.contentVersion && store.isDirty) {
          // 如果有本地更改，显示警告
          console.warn(
            "[useEditorEffects] Remote content updated but local changes exist. Version conflict possible."
          );
        }
      }
    };

    window.addEventListener(
      "seenos:content_saved",
      handleContentSaved as EventListener
    );

    return () => {
      window.removeEventListener(
        "seenos:content_saved",
        handleContentSaved as EventListener
      );
    };
  }, [isEditorOpen, itemId, loadContent]);

  // ============ 返回状态和方法 ============

  return {
    /** 手动触发保存 */
    save: saveContent,
    /** 手动触发撤销 */
    undo,
    /** 手动触发重做 */
    redo,
    /** 手动刷新预览 */
    refreshPreview,
  };
}

export default useEditorEffects;

