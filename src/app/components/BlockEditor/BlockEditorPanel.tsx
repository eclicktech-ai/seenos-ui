"use client";

import React, { useCallback, useEffect } from "react";
import {
  X,
  Save,
  Undo2,
  Redo2,
  Eye,
  Edit3,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { useEditorStore, useCanUndo, useCanRedo } from "./stores/editorStore";
import { BlockList } from "./BlockList";
import { PropertyPanel } from "./PropertyPanel";
import { PreviewPanel } from "./PreviewPanel";

interface BlockEditorPanelProps {
  className?: string;
}

export const BlockEditorPanel = React.memo<BlockEditorPanelProps>(
  ({ className }) => {
    const {
      isEditorOpen,
      content,
      isLoading,
      isSaving,
      isDirty,
      error,
      mode,
      showPropertyPanel,
      closeEditor,
      saveContent,
      undo,
      redo,
      setMode,
      togglePropertyPanel,
      clearError,
    } = useEditorStore();

    const canUndo = useCanUndo();
    const canRedo = useCanRedo();

    // 键盘快捷键
    useEffect(() => {
      if (!isEditorOpen) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        // Cmd/Ctrl + S: 保存
        if ((e.metaKey || e.ctrlKey) && e.key === "s") {
          e.preventDefault();
          if (isDirty && !isSaving) {
            saveContent();
          }
        }
        // Cmd/Ctrl + Z: 撤销
        if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
          e.preventDefault();
          if (canUndo) undo();
        }
        // Cmd/Ctrl + Shift + Z: 重做
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "z") {
          e.preventDefault();
          if (canRedo) redo();
        }
        // Escape: 关闭编辑器
        if (e.key === "Escape") {
          e.preventDefault();
          closeEditor();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [
      isEditorOpen,
      isDirty,
      isSaving,
      canUndo,
      canRedo,
      saveContent,
      undo,
      redo,
      closeEditor,
    ]);

    const handleSave = useCallback(() => {
      if (isDirty && !isSaving) {
        saveContent();
      }
    }, [isDirty, isSaving, saveContent]);

    if (!isEditorOpen) {
      return null;
    }

    return (
      <div
        className={cn(
          "flex h-full flex-col bg-background border-l border-border",
          "animate-in slide-in-from-right duration-300",
          className
        )}
      >
        {/* Header */}
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-foreground">
              Block Editor
            </h2>
            {content && (
              <span className="text-xs text-muted-foreground">
                {content.meta.title}
              </span>
            )}
            {isDirty && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                Unsaved
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* 撤销/重做 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={undo}
              disabled={!canUndo}
              className="h-8 w-8 p-0"
              title="Undo (Cmd+Z)"
            >
              <Undo2 size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={redo}
              disabled={!canRedo}
              className="h-8 w-8 p-0"
              title="Redo (Cmd+Shift+Z)"
            >
              <Redo2 size={16} />
            </Button>

            <div className="mx-2 h-4 w-px bg-border" />

            {/* 模式切换 */}
            <div className="flex rounded-md border border-border bg-muted/30">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode("edit")}
                className={cn(
                  "h-8 rounded-r-none px-3",
                  mode === "edit" && "bg-background shadow-sm"
                )}
              >
                <Edit3 size={14} className="mr-1.5" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode("view")}
                className={cn(
                  "h-8 rounded-l-none px-3",
                  mode === "view" && "bg-background shadow-sm"
                )}
              >
                <Eye size={14} className="mr-1.5" />
                Preview
              </Button>
            </div>

            <div className="mx-2 h-4 w-px bg-border" />

            {/* 属性面板切换 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePropertyPanel}
              className="h-8 w-8 p-0"
              title={showPropertyPanel ? "Hide Properties" : "Show Properties"}
            >
              {showPropertyPanel ? (
                <PanelRightClose size={16} />
              ) : (
                <PanelRightOpen size={16} />
              )}
            </Button>

            {/* 保存按钮 */}
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className="h-8 px-3"
            >
              {isSaving ? (
                <Loader2 size={14} className="mr-1.5 animate-spin" />
              ) : (
                <Save size={14} className="mr-1.5" />
              )}
              Save
            </Button>

            {/* 关闭按钮 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={closeEditor}
              className="ml-2 h-8 w-8 p-0"
              title="Close (Esc)"
            >
              <X size={18} />
            </Button>
          </div>
        </header>

        {/* 错误提示 */}
        {error && (
          <div className="flex items-center gap-2 border-b border-red-200 bg-red-50 px-4 py-2 dark:border-red-900/50 dark:bg-red-900/20">
            <AlertCircle size={16} className="text-red-600 dark:text-red-400" />
            <span className="flex-1 text-sm text-red-700 dark:text-red-300">
              {error}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearError}
              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
            >
              <X size={14} />
            </Button>
          </div>
        )}

        {/* 主内容区 */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Loading content...
                </p>
              </div>
            </div>
          ) : !content ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <AlertCircle className="mx-auto mb-4 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No content loaded
                </p>
              </div>
            </div>
          ) : (
            <ResizablePanelGroup
              direction="horizontal"
              autoSaveId="editor-layout"
              className="h-full"
            >
              {/* Block Editor 区域 */}
              <ResizablePanel
                id="block-editor"
                order={1}
                defaultSize={showPropertyPanel ? 40 : 50}
                minSize={30}
              >
                <BlockList />
              </ResizablePanel>

              <ResizableHandle className="relative w-2 bg-transparent hover:bg-border/30 transition-colors cursor-col-resize after:absolute after:inset-y-0 after:left-1/2 after:w-[1px] after:-translate-x-1/2 after:bg-border/50" />

              {/* 预览区域 */}
              <ResizablePanel
                id="preview-panel"
                order={2}
                defaultSize={showPropertyPanel ? 35 : 50}
                minSize={25}
              >
                <PreviewPanel />
              </ResizablePanel>

              {/* 属性面板 */}
              {showPropertyPanel && (
                <>
                  <ResizableHandle className="relative w-2 bg-transparent hover:bg-border/30 transition-colors cursor-col-resize after:absolute after:inset-y-0 after:left-1/2 after:w-[1px] after:-translate-x-1/2 after:bg-border/50" />
                  <ResizablePanel
                    id="property-panel"
                    order={3}
                    defaultSize={25}
                    minSize={20}
                    maxSize={35}
                  >
                    <PropertyPanel />
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          )}
        </div>
      </div>
    );
  }
);

BlockEditorPanel.displayName = "BlockEditorPanel";

export default BlockEditorPanel;

