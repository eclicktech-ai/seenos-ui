"use client";

import React, { useState } from "react";
import { ImageIcon, FileText, Music, Video, Database, File, Loader2, AlertCircle, Download } from "lucide-react";
import type { AttachmentRefBlock } from "@/types";
import { useChatContext } from "@/providers/ChatProvider";
import { cn } from "@/lib/utils";

interface AttachmentRefBlockViewProps {
  block: AttachmentRefBlock;
}

/**
 * AttachmentRefBlockView - 渲染附件引用块
 * 
 * 基于 IMAGE_UPLOAD_FRONTEND_GUIDE.md 新架构：
 * - 支持多种附件类型（图片、文档、音频、视频等）
 * - previewUrl 直接可用，无需额外请求
 * - 显示文件名和大小信息
 */
export const AttachmentRefBlockView = React.memo<AttachmentRefBlockViewProps>(
  ({ block }) => {
    const { attachmentType, mimeType, filename, fileSize, previewUrl, metadata, attachmentId } = block;
    const { files } = useChatContext(); // Use context to resolve files

    // Resolve URL: priority previewUrl -> files map -> attachmentId (if http)
    const effectivePreviewUrl = React.useMemo(() => {
      // 1. If explicit previewUrl exists, use it
      if (previewUrl) return previewUrl;

      // 2. Try to resolve via attachmentId from files map
      // attachmentId might be an ID or a path/key
      if (attachmentId) {
        const fileItem = files[attachmentId];
        if (fileItem) {
          if (typeof fileItem === "object" && fileItem.downloadUrl) {
            return fileItem.downloadUrl;
          }
          if (typeof fileItem === "string") {
            return fileItem;
          }
        }

        // 3. If attachmentId is already a URL, use it
        if (attachmentId.startsWith("http://") || attachmentId.startsWith("https://") || attachmentId.startsWith("blob:")) {
          return attachmentId;
        }
      }

      return undefined;
    }, [previewUrl, attachmentId, files]);

    // 根据附件类型渲染不同的组件
    switch (attachmentType) {
      case 'image':
        return (
          <ImageAttachment
            previewUrl={effectivePreviewUrl}
            filename={filename}
            width={metadata?.width as number | undefined}
            height={metadata?.height as number | undefined}
          />
        );

      case 'document':
        return (
          <DocumentAttachment
            filename={filename}
            fileSize={fileSize}
            mimeType={mimeType}
            previewUrl={effectivePreviewUrl}
          />
        );

      case 'audio':
        return (
          <AudioAttachment
            previewUrl={effectivePreviewUrl}
            filename={filename}
          />
        );

      case 'video':
        return (
          <VideoAttachment
            previewUrl={effectivePreviewUrl}
            filename={filename}
          />
        );

      case 'data':
        return (
          <DataAttachment
            filename={filename}
            fileSize={fileSize}
            mimeType={mimeType}
          />
        );

      default:
        return (
          <GenericAttachment
            filename={filename}
            fileSize={fileSize}
            mimeType={mimeType}
            previewUrl={effectivePreviewUrl}
          />
        );
    }
  }
);
AttachmentRefBlockView.displayName = "AttachmentRefBlockView";

// ============ 子组件 ============

interface ImageAttachmentProps {
  previewUrl?: string;
  filename?: string;
  width?: number;
  height?: number;
}

const ImageAttachment = React.memo<ImageAttachmentProps>(
  ({ previewUrl, filename, width, height }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    if (!previewUrl) {
      return (
        <div className="attachment-placeholder flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
          <ImageIcon size={16} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">图片加载中...</span>
        </div>
      );
    }

    if (hasError) {
      return (
        <div className="attachment-error flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
          <AlertCircle size={16} className="text-destructive" />
          <span className="text-sm text-destructive">图片加载失败</span>
          {filename && (
            <span className="text-xs text-muted-foreground truncate">({filename})</span>
          )}
        </div>
      );
    }

    return (
      <div className="image-attachment relative inline-block">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-lg">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        )}
        <img
          src={previewUrl}
          alt={filename || "Uploaded image"}
          width={width}
          height={height}
          className={cn(
            "rounded-lg max-w-full max-h-64 object-contain border border-border shadow-sm",
            isLoading && "opacity-0"
          )}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
        {/* {filename && !isLoading && (
          <div className="mt-1 text-xs text-muted-foreground truncate max-w-[300px]">
            {filename}
          </div>
        )} */}
      </div>
    );
  }
);
ImageAttachment.displayName = "ImageAttachment";

interface DocumentAttachmentProps {
  filename?: string;
  fileSize?: number;
  mimeType?: string;
  previewUrl?: string;
}

const DocumentAttachment = React.memo<DocumentAttachmentProps>(
  ({ filename, fileSize, mimeType, previewUrl }) => {
    const formatSize = (bytes?: number) => {
      if (!bytes) return "";
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    };

    return (
      <div className="document-attachment flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <FileText size={20} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">
            {filename || "Document"}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatSize(fileSize)}
            {mimeType && ` • ${mimeType.split('/')[1]?.toUpperCase() || mimeType}`}
          </div>
        </div>
        {previewUrl && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted transition-colors"
          >
            <Download size={16} className="text-muted-foreground" />
          </a>
        )}
      </div>
    );
  }
);
DocumentAttachment.displayName = "DocumentAttachment";

interface AudioAttachmentProps {
  previewUrl?: string;
  filename?: string;
}

const AudioAttachment = React.memo<AudioAttachmentProps>(
  ({ previewUrl, filename }) => {
    if (!previewUrl) {
      return (
        <div className="audio-attachment flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
          <Music size={16} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">音频文件</span>
        </div>
      );
    }

    return (
      <div className="audio-attachment rounded-lg border border-border bg-muted/30 p-3">
        {filename && (
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Music size={14} />
            <span className="truncate">{filename}</span>
          </div>
        )}
        <audio src={previewUrl} controls className="w-full max-w-md" />
      </div>
    );
  }
);
AudioAttachment.displayName = "AudioAttachment";

interface VideoAttachmentProps {
  previewUrl?: string;
  filename?: string;
}

const VideoAttachment = React.memo<VideoAttachmentProps>(
  ({ previewUrl, filename }) => {
    if (!previewUrl) {
      return (
        <div className="video-attachment flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
          <Video size={16} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">视频文件</span>
        </div>
      );
    }

    return (
      <div className="video-attachment">
        {filename && (
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Video size={14} />
            <span className="truncate">{filename}</span>
          </div>
        )}
        <video
          src={previewUrl}
          controls
          className="rounded-lg max-w-full max-h-80 border border-border"
        />
      </div>
    );
  }
);
VideoAttachment.displayName = "VideoAttachment";

interface DataAttachmentProps {
  filename?: string;
  fileSize?: number;
  mimeType?: string;
}

const DataAttachment = React.memo<DataAttachmentProps>(
  ({ filename, fileSize, mimeType }) => {
    const formatSize = (bytes?: number) => {
      if (!bytes) return "";
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    };

    return (
      <div className="data-attachment flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
          <Database size={20} className="text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">
            {filename || "Data file"}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatSize(fileSize)}
            {mimeType && ` • ${mimeType}`}
          </div>
        </div>
      </div>
    );
  }
);
DataAttachment.displayName = "DataAttachment";

interface GenericAttachmentProps {
  filename?: string;
  fileSize?: number;
  mimeType?: string;
  previewUrl?: string;
}

const GenericAttachment = React.memo<GenericAttachmentProps>(
  ({ filename, fileSize, mimeType, previewUrl }) => {
    const formatSize = (bytes?: number) => {
      if (!bytes) return "";
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    };

    return (
      <div className="generic-attachment flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <File size={20} className="text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">
            {filename || "File"}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatSize(fileSize)}
            {mimeType && ` • ${mimeType}`}
          </div>
        </div>
        {previewUrl && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted transition-colors"
          >
            <Download size={16} className="text-muted-foreground" />
          </a>
        )}
      </div>
    );
  }
);
GenericAttachment.displayName = "GenericAttachment";
