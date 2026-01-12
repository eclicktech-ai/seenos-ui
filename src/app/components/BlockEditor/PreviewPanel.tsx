"use client";

import React, { useCallback, useEffect, useRef } from "react";
import {
  Monitor,
  Tablet,
  Smartphone,
  RefreshCw,
  Loader2,
  ExternalLink,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEditorStore, type DeviceType } from "./stores/editorStore";
import { DEVICE_PRESETS } from "./types";

interface PreviewPanelProps {
  className?: string;
}

const DEVICE_ICONS: Record<DeviceType, React.ReactNode> = {
  desktop: <Monitor size={16} />,
  tablet: <Tablet size={16} />,
  mobile: <Smartphone size={16} />,
};

export const PreviewPanel = React.memo<PreviewPanelProps>(({ className }) => {
  const {
    previewHtml,
    previewDevice,
    isPreviewLoading,
    setPreviewDevice,
    refreshPreview,
    itemId,
  } = useEditorStore();

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 更新 iframe 内容
  useEffect(() => {
    if (iframeRef.current && previewHtml) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(previewHtml);
        doc.close();
      }
    }
  }, [previewHtml]);

  const handleRefresh = useCallback(() => {
    refreshPreview();
  }, [refreshPreview]);

  const handleOpenInNewTab = useCallback(() => {
    if (previewHtml) {
      const blob = new Blob([previewHtml], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      // 延迟释放 URL
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }, [previewHtml]);

  const devicePreset = DEVICE_PRESETS[previewDevice];

  return (
    <div className={cn("flex h-full flex-col bg-muted/20", className)}>
      {/* Header */}
      <div className="flex h-12 flex-shrink-0 items-center justify-between border-b border-border bg-muted/30 px-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">Preview</span>
          <span className="text-xs text-muted-foreground">
            {devicePreset.label}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Device Selector */}
          <div className="flex rounded-md border border-border bg-background">
            {(Object.keys(DEVICE_PRESETS) as DeviceType[]).map((device) => (
              <Button
                key={device}
                variant="ghost"
                size="sm"
                onClick={() => setPreviewDevice(device)}
                className={cn(
                  "h-7 w-8 p-0 first:rounded-r-none last:rounded-l-none",
                  previewDevice === device && "bg-muted"
                )}
                title={DEVICE_PRESETS[device].label}
              >
                {DEVICE_ICONS[device]}
              </Button>
            ))}
          </div>

          <div className="mx-1 h-4 w-px bg-border" />

          {/* Actions */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isPreviewLoading}
            className="h-7 w-7 p-0"
            title="Refresh Preview"
          >
            {isPreviewLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenInNewTab}
            disabled={!previewHtml}
            className="h-7 w-7 p-0"
            title="Open in New Tab"
          >
            <ExternalLink size={14} />
          </Button>
        </div>
      </div>

      {/* Preview Container */}
      <div
        ref={containerRef}
        className="flex flex-1 items-center justify-center overflow-auto p-4"
      >
        {isPreviewLoading && !previewHtml ? (
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading preview...</p>
          </div>
        ) : !previewHtml ? (
          <div className="text-center">
            <Monitor className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              No Preview Available
            </p>
            <p className="text-xs text-muted-foreground">
              Save your changes to generate a preview
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="mt-4"
            >
              <RefreshCw size={14} className="mr-1.5" />
              Load Preview
            </Button>
          </div>
        ) : (
          <div
            className={cn(
              "relative overflow-hidden rounded-lg border border-border bg-white shadow-lg transition-all duration-300",
              previewDevice !== "desktop" && "max-h-full"
            )}
            style={{
              width: devicePreset.width,
              height:
                previewDevice === "desktop" ? "100%" : devicePreset.height,
              maxWidth: "100%",
              maxHeight: "100%",
            }}
          >
            {/* Device Frame Header (for mobile/tablet) */}
            {previewDevice !== "desktop" && (
              <div className="flex h-6 items-center justify-center border-b border-gray-200 bg-gray-100">
                <div className="h-1.5 w-12 rounded-full bg-gray-300" />
              </div>
            )}

            {/* iframe */}
            <iframe
              ref={iframeRef}
              title="Content Preview"
              className={cn(
                "w-full bg-white",
                previewDevice === "desktop"
                  ? "h-full"
                  : `h-[calc(100%-24px)]` // 减去设备头部高度
              )}
              sandbox="allow-same-origin allow-scripts"
            />

            {/* Loading Overlay */}
            {isPreviewLoading && previewHtml && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

PreviewPanel.displayName = "PreviewPanel";

export default PreviewPanel;

