"use client";

import React, { useState } from "react";
import { ImageIcon, Loader2, AlertCircle } from "lucide-react";
import type { ImageBlock } from "@/types";
import { useChatContext } from "@/providers/ChatProvider";
import { cn } from "@/lib/utils";

interface ImageBlockViewProps {
  block: ImageBlock;
}

/**
 * ImageBlockView - 渲染图片块
 * 
 * 基于 WEBSOCKET_FRONTEND_GUIDE.md 新架构：
 * - 显示图片 URL
 * - 支持图片加载状态和错误处理
 * - 支持自定义宽高
 */
export const ImageBlockView = React.memo<ImageBlockViewProps>(
  ({ block }) => {
    const { url, alt, width, height } = block;
    const { files } = useChatContext(); // Use context to resolve files
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    // Resolve URL
    const resolvedUrl = React.useMemo(() => {
      // If it's a full URL (http/https/blob), use it directly
      if (url.startsWith("http") || url.startsWith("blob:")) {
        return url;
      }

      // Otherwise, try to find it in files map
      // The file map keys might keys or paths
      const fileItem = files[url];

      if (fileItem) {
        // If it's a FileItem object with downloadUrl
        if (typeof fileItem === "object" && fileItem.downloadUrl) {
          return fileItem.downloadUrl;
        }
        // If it's a string (legacy compatibility)
        if (typeof fileItem === "string") {
          return fileItem;
        }
      }

      // If we can't resolve it, return the original and hope for the best (or it will fail and show error)
      return url;
    }, [url, files]);

    const handleLoad = () => {
      setIsLoading(false);
    };

    const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      console.error("[ImageBlockView] Failed to load image:", {
        originalUrl: url,
        resolvedUrl,
        fileFound: !!files[url]
      });
      setIsLoading(false);
      setHasError(true);
    };

    if (hasError) {
      return (
        <div className="image-block rounded-lg border border-border bg-muted/30 p-4 flex items-center gap-2">
          <AlertCircle size={16} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            图片加载失败
          </span>
          <span className="text-xs text-muted-foreground/50 max-w-[200px] truncate" title={resolvedUrl}>
            ({url})
          </span>
        </div>
      );
    }

    return (
      <div className="image-block relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-lg" style={{ width: width || '100%', height: height || 200 }}>
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        )}
        <img
          src={resolvedUrl}
          alt={alt || "Generated image"}
          width={width}
          height={height}
          className={cn(
            "rounded-lg max-w-full h-auto",
            isLoading && "opacity-0"
          )}
          style={{
            // Ensure specific dimensions are respected if provided
            width: width ? `${width}px` : undefined,
            height: height ? `${height}px` : undefined
          }}
          onLoad={handleLoad}
          onError={handleError}
        />
        {alt && !isLoading && (
          <div className="mt-1 text-xs text-muted-foreground text-center">
            {alt}
          </div>
        )}
      </div>
    );
  }
);
ImageBlockView.displayName = "ImageBlockView";

