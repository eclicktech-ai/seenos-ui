"use client";

import React, { useState, useCallback, useMemo, useContext } from "react";
import { 
  FileText, 
  BookOpen, 
  Wrench, 
  Settings2, 
  Activity, 
  Layers, 
  FolderDown,
  Loader2,
  Edit3,
  LayoutGrid,
  Library,
  Files,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FileItem } from "@/app/types/types";
import { FileViewDialog } from "@/app/components/FileViewDialog";
import { PlaybookDialog } from "@/app/components/PlaybookDialog";
import { type Playbook, type PlaybookCategory } from "@/data/playbooks";
import { ChatContext } from "@/providers/ChatProvider";
import { useEditorStore } from "@/app/components/BlockEditor";
import { ContentLibraryPanel } from "@/app/components/ContentLibrary";

interface RightSidebarProps {
  files: Record<string, string> | Record<string, FileItem>;
  setFiles: (files: Record<string, string>) => Promise<void>;
  isLoading: boolean;
  interrupt: unknown;
}

interface PlaybookButton {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const playbooks: PlaybookButton[] = [
  {
    id: "research",
    label: "Research",
    icon: <BookOpen size={24} />,
    description: "Deep research task",
  },
  {
    id: "build",
    label: "Build",
    icon: <Wrench size={24} />,
    description: "Build and create",
  },
  {
    id: "optimize",
    label: "Optimize",
    icon: <Settings2 size={24} />,
    description: "Optimize and improve",
  },
  {
    id: "monitor",
    label: "Monitor",
    icon: <Activity size={24} />,
    description: "Monitor and track",
  },
];

// 获取文件扩展名
const getFileExtension = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return ext || 'file';
};

export const RightSidebar = React.memo<RightSidebarProps>(
  ({ files, setFiles, isLoading, interrupt }) => {
    const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<PlaybookCategory | null>(null);
    
    // Get sendMessage from context (使用可选的 context 避免抛出错误)
    const chatContext = useContext(ChatContext);
    const sendMessage = chatContext?.sendMessage;

    const handleSaveFile = useCallback(
      async (fileName: string, content: string) => {
        // Convert files to Record<string, string> format
        const filesAsStrings: Record<string, string> = {};
        for (const [key, value] of Object.entries(files)) {
          filesAsStrings[key] = typeof value === "string" ? value : (value.content || "");
        }
        await setFiles({ ...filesAsStrings, [fileName]: content });
        setSelectedFile({ path: fileName, content: content });
      },
      [files, setFiles]
    );

    const handlePlaybookClick = (playbookId: string) => {
      setSelectedCategory(playbookId as PlaybookCategory);
      setDialogOpen(true);
    };

    const handleRunPlaybook = (
      playbook: Playbook, 
      formData?: Record<string, string>, 
      customInstructions?: string
    ) => {
      // Build form data section if provided
      let formDataSection = '';
      if (formData && Object.keys(formData).length > 0) {
        const formEntries = Object.entries(formData)
          .filter(([_, value]) => value && value.trim()) // Only include non-empty values
          .map(([key, value]) => {
            // Format field names to be more readable
            const fieldName = key
              .replace(/([A-Z])/g, ' $1')
              .replace(/^./, str => str.toUpperCase())
              .trim();
            return `${fieldName}: ${value.trim()}`;
          });
        
        if (formEntries.length > 0) {
          formDataSection = `\nInput Parameters:\n${formEntries.join('\n')}`;
        }
      }

      const prompt = `Run the "${playbook.title}" agent (${playbook.agentName}).
        
Category: ${playbook.category}
Task: ${playbook.description}

Auto Actions:
${playbook.autoActions.map(a => `- ${a}`).join('\n')}

Expected Outputs:
${playbook.outputs.map(o => `- ${o}`).join('\n')}${formDataSection}

${customInstructions ? `Custom Instructions:\n${customInstructions}` : ''}`;
      
      if (sendMessage) {
        sendMessage(prompt);
      }
    };

    // Filter out internal large_tool_results files
    const visibleFiles = useMemo(() => {
      return Object.keys(files).filter(
        (f) => !f.startsWith("/large_tool_results/")
      );
    }, [files]);

    const getFileContent = useCallback((filePath: string): string => {
      const rawContent = files[filePath];
      if (typeof rawContent === "object" && rawContent !== null && "content" in rawContent) {
        const contentArray = (rawContent as { content: unknown }).content;
        return Array.isArray(contentArray) ? contentArray.join("\n") : String(contentArray || "");
      }
      return String(rawContent || "");
    }, [files]);

    const [isDownloadingAll, setIsDownloadingAll] = useState(false);

    // 检查是否是 S3 URL
    const isS3Url = useCallback((url: string): boolean => {
      return url.includes('s3') && url.includes('amazonaws.com');
    }, []);

    const handleDownloadAll = useCallback(async () => {
      if (visibleFiles.length === 0) return;

      setIsDownloadingAll(true);
      
      try {
        // 逐个下载文件，添加延迟避免请求过快
        for (const filePath of visibleFiles) {
          const rawFile = files[filePath];
          const fileName = filePath.split("/").pop() || filePath;
          
          // 如果是二进制文件，使用代理下载
          if (typeof rawFile === "object" && rawFile !== null && "isBinary" in rawFile && (rawFile as FileItem).isBinary && (rawFile as FileItem).downloadUrl) {
            const downloadUrl = (rawFile as FileItem).downloadUrl!;
            
            // S3 文件：使用代理下载
            if (isS3Url(downloadUrl)) {
              try {
                await apiClient.proxyDownloadS3File(downloadUrl, fileName);
                await new Promise(resolve => setTimeout(resolve, 500));
                continue;
              } catch (error) {
                console.error('[RightSidebar] Proxy download failed:', error);
              }
            }
            
            // 非 S3：尝试 fetch + blob
            try {
              const response = await fetch(downloadUrl, { mode: 'cors' });
              if (response.ok) {
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = blobUrl;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(blobUrl);
                await new Promise(resolve => setTimeout(resolve, 500));
                continue;
              }
            } catch {
              // CORS 失败，打开新标签页
              window.open(downloadUrl, '_blank');
            }
          } else {
            // 文本文件：创建 blob 下载
            const fileContent = getFileContent(filePath);
            const blob = new Blob([fileContent], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      } finally {
        setIsDownloadingAll(false);
      }
    }, [visibleFiles, getFileContent, files, isS3Url]);

    // 当前 Tab 状态
    const [activeTab, setActiveTab] = useState<"content" | "artifacts">("content");

    return (
      <div className="flex h-full flex-col p-2 pl-0">
        <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-background">
          {/* Playbooks Module - Top Section (compact) */}
          <div className="group/playbooks flex-shrink-0">
            <div className="flex h-10 items-center gap-2 px-3 border-b border-border bg-muted/30">
              <Layers size={14} className="text-muted-foreground" />
              <span className="text-xs font-semibold tracking-wide">
                Playbooks
              </span>
            </div>
            <div className="px-3 py-2">
              <div className="grid grid-cols-2 gap-1.5">
                {playbooks.map((playbook) => (
                  <button
                    key={playbook.id}
                    onClick={() => handlePlaybookClick(playbook.id)}
                    className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 transition-all hover:border-primary/50 hover:bg-accent"
                  >
                    <div className="text-muted-foreground">{playbook.icon}</div>
                    <span className="text-xs font-medium truncate">{playbook.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Section - Tabs for Content Library and Artifacts */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "content" | "artifacts")}
            className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden"
          >
            {/* Tab Header */}
            <div className="flex-shrink-0 border-b border-border bg-muted/30 px-4">
              <TabsList className="h-10 w-full justify-start gap-1 bg-transparent p-0">
                <TabsTrigger
                  value="content"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-t-md"
                >
                  <Library size={14} />
                  Content
                </TabsTrigger>
                <TabsTrigger
                  value="artifacts"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-t-md"
                >
                  <Files size={14} />
                  Artifacts
                  {visibleFiles.length > 0 && (
                    <span className="ml-1 rounded-full bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background">
                      {visibleFiles.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Content Library Tab */}
            <TabsContent 
              value="content" 
              className="m-0 min-h-0 overflow-hidden data-[state=inactive]:hidden data-[state=active]:flex-1"
            >
              <ContentLibraryPanel className="h-full" />
            </TabsContent>

            {/* Artifacts Tab */}
            <TabsContent value="artifacts" className="m-0 min-h-0 flex flex-col data-[state=inactive]:hidden data-[state=active]:flex-1">
              <div className="group/artifacts flex min-h-0 flex-1 flex-col">
                {/* Download All Button */}
                <div className="flex-shrink-0 flex items-center justify-end px-4 py-2 border-b border-border">
                  <button
                    type="button"
                    onClick={handleDownloadAll}
                    disabled={isDownloadingAll || visibleFiles.length === 0}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                    title="Download All"
                  >
                    {isDownloadingAll ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <FolderDown size={14} />
                    )}
                    Download All
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-hidden">
                  {visibleFiles.length === 0 ? (
                    <div className="flex h-full items-center justify-center px-4 pb-4">
                      <div className="text-center">
                        <Files size={32} className="mx-auto mb-2 text-muted-foreground/40" />
                        <p className="text-xs text-muted-foreground">
                          No files yet
                        </p>
                      </div>
                    </div>
                  ) : (
                    <ScrollArea className="h-full px-4 py-4">
                      <div className="space-y-1">
                        {visibleFiles.map((filePath) => {
                          const rawFile = files[filePath];
                          const fileName = filePath.split("/").pop() || filePath;

                          // 处理文件项：支持字符串格式和 FileItem 对象格式
                          let fileItem: FileItem;
                          if (typeof rawFile === "object" && rawFile !== null && "path" in rawFile) {
                            // 已经是 FileItem 格式（可能是二进制文件）
                            fileItem = rawFile as FileItem;
                          } else {
                            // 字符串格式或包含 content 的对象
                            const fileContent = getFileContent(filePath);
                            fileItem = {
                              path: filePath,
                              content: fileContent,
                            };
                          }

                          const fileExt = getFileExtension(fileName);

                          return (
                            <div
                              key={filePath}
                              className="group relative flex w-full items-center gap-2 rounded-md border border-transparent px-3 py-2 text-left transition-colors hover:border-border hover:bg-accent"
                            >
                              <button
                                type="button"
                                onClick={() => setSelectedFile(fileItem)}
                                className="flex flex-1 items-center gap-2 min-w-0"
                              >
                                {/* File extension badge - light gray with rounded corners */}
                                <span className="flex-shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium leading-none text-foreground">
                                  .{fileExt}
                                </span>
                                {/* File name with ellipsis truncation - left aligned */}
                                <p className="min-w-0 flex-1 truncate text-left text-sm font-medium text-foreground">
                                  {fileName}
                                </p>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {selectedFile && (
          <FileViewDialog
            file={selectedFile}
            onSaveFile={handleSaveFile}
            onClose={() => setSelectedFile(null)}
            editDisabled={isLoading === true || interrupt !== undefined}
          />
        )}

        <PlaybookDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          category={selectedCategory}
          onRunPlaybook={handleRunPlaybook}
        />
      </div>
    );
  }
);

RightSidebar.displayName = "RightSidebar";
