"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ExternalLink,
  X,
  Monitor,
  Tablet,
  Smartphone,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";

interface PreviewDialogProps {
  itemId: string | null;
  onClose: () => void;
}

type ViewMode = "desktop" | "tablet" | "mobile";

const VIEW_MODES: Record<ViewMode, { width: number; label: string; icon: React.ElementType }> = {
  desktop: { width: 1280, label: "Desktop", icon: Monitor },
  tablet: { width: 768, label: "Tablet", icon: Tablet },
  mobile: { width: 375, label: "Mobile", icon: Smartphone },
};

export const PreviewDialog: React.FC<PreviewDialogProps> = ({
  itemId,
  onClose,
}) => {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!itemId) {
      setHtml(null);
      setError(null);
      return;
    }

    const fetchPreview = async () => {
      setLoading(true);
      setError(null);
      try {
        const previewHtml = await apiClient.getContentPreview(itemId);
        setHtml(previewHtml);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load preview");
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [itemId]);

  // 计算缩放比例，让内容适应容器
  const calculateScale = useCallback(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth - 32; // 减去 padding
    const deviceWidth = VIEW_MODES[viewMode].width;
    const newScale = Math.min(containerWidth / deviceWidth, 1);
    setScale(newScale);
  }, [viewMode]);

  useEffect(() => {
    calculateScale();
    window.addEventListener("resize", calculateScale);
    return () => window.removeEventListener("resize", calculateScale);
  }, [calculateScale, html, isFullscreen]);

  const handleOpenInNewTab = () => {
    if (html) {
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };

  const currentMode = VIEW_MODES[viewMode];

  // 只注入 viewport meta，不覆盖原有样式
  const enhancedHtml = html
    ? html.replace(
        /<head>/i,
        `<head>
          <meta name="viewport" content="width=${currentMode.width}, initial-scale=1">`
      )
    : null;

  const scaledHeight = 800 / scale; // iframe 实际高度，确保缩放后能填满

  return (
    <Dialog open={!!itemId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className={`flex flex-col p-0 ${
          isFullscreen
            ? "!max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] rounded-none"
            : "!max-w-[98vw] w-[98vw] h-[94vh] max-h-[94vh]"
        }`}
      >
        <DialogHeader className="flex-shrink-0 px-4 py-2 border-b bg-muted/40">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-sm font-medium">Content Preview</DialogTitle>

            {/* View Mode Selector */}
            <div className="flex items-center gap-0.5 bg-background rounded-md p-0.5 border">
              {(Object.keys(VIEW_MODES) as ViewMode[]).map((mode) => {
                const { icon: Icon, label, width } = VIEW_MODES[mode];
                return (
                  <Button
                    key={mode}
                    variant={viewMode === mode ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode(mode)}
                    className="h-7 px-2.5 gap-1.5"
                    title={`${label} (${width}px)`}
                  >
                    <Icon size={14} />
                    <span className="text-xs hidden md:inline">{label}</span>
                  </Button>
                );
              })}
            </div>

            {/* Width & Scale indicator */}
            <span className="text-xs text-muted-foreground tabular-nums">
              {currentMode.width}px · {Math.round(scale * 100)}%
            </span>

            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-7 px-2"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInNewTab}
                disabled={!html}
                className="h-7 gap-1"
              >
                <ExternalLink size={14} />
                <span className="hidden sm:inline text-xs">Open in New Tab</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose} className="h-7 px-2">
                <X size={14} />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div 
          ref={containerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden bg-neutral-100 dark:bg-neutral-900 p-4"
        >
          {loading ? (
            <div className="flex h-full items-center justify-center w-full">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Loading preview...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 w-full">
              <div className="text-center">
                <p className="text-destructive font-medium mb-2">Failed to load</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          ) : enhancedHtml ? (
            <div className="flex justify-center">
              {/* 缩放容器 - 使用 transform 缩放整个 iframe */}
              <div
                className="bg-white shadow-xl rounded-lg overflow-hidden origin-top"
                style={{
                  width: currentMode.width * scale,
                  height: scaledHeight * scale,
                }}
              >
                <iframe
                  srcDoc={enhancedHtml}
                  className="border-0 bg-white origin-top-left"
                  title="Content Preview"
                  sandbox="allow-same-origin allow-scripts"
                  style={{
                    width: currentMode.width,
                    height: scaledHeight,
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};

