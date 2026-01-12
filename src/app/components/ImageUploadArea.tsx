"use client";

import React, { useRef, useCallback } from "react";
import { Image as ImageIcon, X, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImageAttachment } from "@/app/types/types";
import { ALLOWED_IMAGE_TYPES } from "@/app/types/types";

// ============ 类型定义 ============

export interface ImageUploadAreaProps {
  attachments: ImageAttachment[];
  isUploading: boolean;
  onAddImages: (files: FileList | File[]) => void;
  onRemoveImage: (id: string) => void;
  onRetryUpload: (id: string) => void;
  disabled?: boolean;
  className?: string;
}

// ============ 单个图片预览组件 ============

interface ImagePreviewProps {
  attachment: ImageAttachment;
  onRemove: () => void;
  onRetry: () => void;
}

const ImagePreview = React.memo(function ImagePreview({
  attachment,
  onRemove,
  onRetry,
}: ImagePreviewProps) {
  return (
    <div className="group relative">
      {/* 图片缩略图 */}
      <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-border bg-muted">
        <img
          src={attachment.preview}
          alt="Attachment preview"
          className={cn(
            "h-full w-full object-cover transition-opacity",
            attachment.status === "uploading" && "opacity-50",
            attachment.status === "error" && "opacity-30"
          )}
        />

        {/* 上传中覆盖层 */}
        {attachment.status === "uploading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="flex flex-col items-center gap-1">
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              {attachment.progress !== undefined && (
                <span className="text-[10px] font-medium text-white">
                  {attachment.progress}%
                </span>
              )}
            </div>
          </div>
        )}

        {/* 错误覆盖层 */}
        {attachment.status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-500/40">
            <button
              onClick={onRetry}
              className="flex flex-col items-center gap-0.5 transition-transform hover:scale-110"
              title={attachment.error || "上传失败，点击重试"}
            >
              <RefreshCw className="h-4 w-4 text-white" />
              <span className="text-[10px] font-medium text-white">重试</span>
            </button>
          </div>
        )}

        {/* 成功指示器 */}
        {attachment.status === "ready" && (
          <div className="absolute bottom-0.5 right-0.5 rounded-full bg-green-500 p-0.5">
            <svg
              className="h-2 w-2 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {/* 删除按钮 */}
      <button
        onClick={onRemove}
        className={cn(
          "absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center",
          "rounded-full bg-destructive text-destructive-foreground shadow-sm",
          "opacity-0 transition-opacity group-hover:opacity-100",
          "hover:bg-destructive/90"
        )}
        title="移除图片"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
});

// ============ 主组件 ============

export const ImageUploadArea = React.memo(function ImageUploadArea({
  attachments,
  isUploading,
  onAddImages,
  onRemoveImage,
  onRetryUpload,
  disabled = false,
  className,
}: ImageUploadAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件选择
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onAddImages(files);
      }
      // 清空 input 以便再次选择相同文件
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [onAddImages]
  );

  // 处理拖放
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (disabled) return;
      
      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith("image/")
      );
      if (files.length > 0) {
        onAddImages(files);
      }
    },
    [disabled, onAddImages]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // 触发文件选择
  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const hasAttachments = attachments.length > 0;
  const hasErrors = attachments.some((a) => a.status === "error");

  // 如果没有附件，只显示上传按钮（紧凑模式）
  if (!hasAttachments) {
    return (
      <>
        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(",")}
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        {/* 紧凑上传按钮 */}
        <button
          type="button"
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          disabled={disabled || isUploading}
          className={cn(
            "flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-normal",
            "text-muted-foreground transition-colors",
            "hover:border-primary/50 hover:bg-accent hover:text-accent-foreground",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>上传中...</span>
            </>
          ) : (
            <>
              <ImageIcon className="h-3.5 w-3.5" />
              <span>参考图</span>
            </>
          )}
        </button>
      </>
    );
  }

  // 有附件时，显示完整的预览区域
  return (
    <div className={cn("space-y-2", className)}>
      {/* 已上传图片预览区 */}
      <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-muted/30 p-2">
        {attachments.map((attachment) => (
          <ImagePreview
            key={attachment.id}
            attachment={attachment}
            onRemove={() => onRemoveImage(attachment.id)}
            onRetry={() => onRetryUpload(attachment.id)}
          />
        ))}
      </div>

      {/* 错误提示 */}
      {hasErrors && (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          <span>部分图片上传失败，点击图片可重试</span>
        </div>
      )}

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* 添加更多图片按钮 */}
      <button
        type="button"
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        disabled={disabled || isUploading}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-normal",
          "text-muted-foreground transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>上传中...</span>
          </>
        ) : (
          <>
            <ImageIcon className="h-3.5 w-3.5" />
            <span>添加更多</span>
          </>
        )}
      </button>
    </div>
  );
});

export default ImageUploadArea;
