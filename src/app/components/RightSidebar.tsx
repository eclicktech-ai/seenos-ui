"use client";

import React, { useState, useCallback, useMemo } from "react";
import { FileText, BookOpen, Wrench, Settings2, Activity, Layers, FolderDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FileItem } from "@/app/types/types";
import { FileViewDialog } from "@/app/components/FileViewDialog";
import { PlaybookDialog } from "@/app/components/PlaybookDialog";
import { type Playbook, type PlaybookCategory } from "@/data/playbooks";
import { useChatContext } from "@/providers/ChatProvider";

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

export const RightSidebar = React.memo<RightSidebarProps>(
  ({ files, setFiles, isLoading, interrupt }) => {
    const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<PlaybookCategory | null>(null);
    
    // Get sendMessage from context
    const { sendMessage } = useChatContext();

    const handleSaveFile = useCallback(
      async (fileName: string, content: string) => {
        // Convert files to Record<string, string> format
        const filesAsStrings: Record<string, string> = {};
        for (const [key, value] of Object.entries(files)) {
          filesAsStrings[key] = typeof value === "string" ? value : value.content;
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

    const handleRunPlaybook = (playbook: Playbook, customInstructions?: string) => {
      const prompt = `Run the "${playbook.title}" agent (${playbook.agentName}).
        
Category: ${playbook.category}
Task: ${playbook.description}

Auto Actions:
${playbook.autoActions.map(a => `- ${a}`).join('\n')}

Expected Outputs:
${playbook.outputs.map(o => `- ${o}`).join('\n')}

${customInstructions ? `Custom Instructions:\n${customInstructions}` : ''}`;
      
      sendMessage(prompt);
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

    const handleDownloadAll = useCallback(() => {
      if (visibleFiles.length === 0) return;

      visibleFiles.forEach((filePath) => {
        const fileContent = getFileContent(filePath);
        const fileName = filePath.split("/").pop() || filePath;
        
        // Create a blob and download
        const blob = new Blob([fileContent], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
    }, [visibleFiles, getFileContent]);

    return (
      <div className="flex h-full flex-col p-2 pl-0">
        <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-background">
          {/* Playbooks Module - Top Section (fixed height) */}
          <div className="group/playbooks flex-shrink-0">
            <div className="flex h-12 items-center gap-2 px-4 border-b border-border bg-muted/30">
              <Layers size={16} className="text-muted-foreground" />
              <span className="text-sm font-semibold tracking-wide">
                Playbooks
              </span>
            </div>
            <div className="px-4 py-4">
              <div className="grid grid-cols-2 gap-2">
                {playbooks.map((playbook) => (
                  <button
                    key={playbook.id}
                    onClick={() => handlePlaybookClick(playbook.id)}
                    className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/50 hover:bg-accent"
                  >
                    <div className="text-muted-foreground">{playbook.icon}</div>
                    <span className="text-sm font-medium">{playbook.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Artifacts Module - Bottom Section (fills remaining space) */}
          <div className="group/artifacts flex min-h-0 flex-1 flex-col">
            <div className="flex h-12 flex-shrink-0 items-center justify-between gap-2 px-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-muted-foreground" />
                <span className="text-sm font-semibold tracking-wide">
                  Artifacts
                </span>
                {visibleFiles.length > 0 && (
                  <span className="rounded-full bg-foreground px-2 py-0.5 text-xs font-medium text-background">
                    {visibleFiles.length}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleDownloadAll}
                className="opacity-0 group-hover/artifacts:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                title="Download All"
              >
                <FolderDown size={16} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              {visibleFiles.length === 0 ? (
                <div className="flex h-full items-center justify-center px-4 pb-4">
                  <p className="text-xs text-muted-foreground">
                    No artifacts created yet
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-full px-4 py-4">
                  <div className="space-y-1">
                    {visibleFiles.map((filePath) => {
                      const fileContent = getFileContent(filePath);
                      const fileName = filePath.split("/").pop() || filePath;

                      const fileItem: FileItem = {
                        path: filePath,
                        content: fileContent,
                      };

                      return (
                        <div
                          key={filePath}
                          className="group relative flex w-full items-center gap-3 rounded-md border border-transparent px-3 py-2 text-left transition-colors hover:border-border hover:bg-accent"
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedFile(fileItem)}
                            className="flex flex-1 items-center gap-3 min-w-0"
                          >
                            <FileText
                              size={16}
                              className="flex-shrink-0 text-muted-foreground"
                            />
                            <p className="min-w-0 flex-1 truncate text-sm font-medium text-left">
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
