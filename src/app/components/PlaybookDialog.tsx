"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Play, Zap, CheckCircle2, ArrowLeft, BarChart, Settings2, Loader2 } from "lucide-react";
import { Playbook, PlaybookCategory } from "@/data/playbooks";
import { usePlaybooks } from "@/hooks/usePlaybooks";

interface PlaybookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: PlaybookCategory | null;
  onRunPlaybook: (playbook: Playbook, customInstructions?: string) => void;
}

export function PlaybookDialog({
  open,
  onOpenChange,
  category,
  onRunPlaybook,
}: PlaybookDialogProps) {
  const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [customInstructions, setCustomInstructions] = useState("");

  // Reset state when dialog closes or category changes
  useEffect(() => {
    if (!open) {
      setSelectedPlaybook(null);
      setSelectedOption(null);
      setCustomInstructions("");
    }
  }, [open, category]);

  // Update custom instructions when option changes
  useEffect(() => {
    if (selectedPlaybook && selectedOption) {
      const option = selectedPlaybook.options?.find(o => o.value === selectedOption);
      if (option) {
        setCustomInstructions(option.defaultPrompt);
      }
    }
  }, [selectedOption, selectedPlaybook]);

  // 获取 playbooks 数据
  const { playbooks: allPlaybooks, isLoading } = usePlaybooks({
    category: category || undefined,
    active_only: true,
  });

  if (!category) return null;

  // 根据类别过滤 playbooks
  const filteredPlaybooks = allPlaybooks.filter((p) => p.category === category);

  const getCategoryLabel = (cat: PlaybookCategory) => {
    switch (cat) {
      case "research":
        return "Deep Research Playbooks";
      case "build":
        return "Build & Content Playbooks";
      case "optimize":
        return "Optimization Playbooks";
      case "monitor":
        return "Monitoring & Decision Playbooks";
      default:
        return "Playbooks";
    }
  };

  const handleRun = () => {
    if (selectedPlaybook) {
      onRunPlaybook(selectedPlaybook, customInstructions);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1200px] h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0 bg-muted/30">
          <div className="flex items-center gap-2">
            {selectedPlaybook && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -ml-2 mr-1"
                onClick={() => {
                  setSelectedPlaybook(null);
                  setSelectedOption(null);
                  setCustomInstructions("");
                }}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                {selectedPlaybook ? (
                  selectedPlaybook.title
                ) : (
                  <>
                    <span className="capitalize">{category}</span>
                    <span className="text-muted-foreground font-normal">
                      / {getCategoryLabel(category)}
                    </span>
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {selectedPlaybook
                  ? "Configure and run this playbook."
                  : "Select a specialized playbook to execute specific tasks."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="text-sm">Loading playbooks...</p>
              </div>
            </div>
          ) : selectedPlaybook ? (
            <div className="max-w-3xl mx-auto space-y-8">
              {/* Playbook Info */}
              <div className="space-y-6">
                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {selectedPlaybook.tags.map(tag => (
                    <Badge key={tag} variant="secondary">##{tag}</Badge>
                  ))}
                </div>
                
                {/* Description */}
                <p className="text-base text-muted-foreground leading-relaxed">
                  {selectedPlaybook.description}
                </p>
                
                {/* Actions and Artifacts - Two separate blocks */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* What this playbook will do */}
                  <div className="text-sm bg-background/50 p-4 rounded-md border border-border/50">
                    <div className="space-y-3">
                      <div className="font-medium text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Zap className="h-3 w-3 text-foreground" />
                        What this playbook will do
                      </div>
                      <ul className="space-y-2">
                        {selectedPlaybook.autoActions.map((action, i) => (
                          <li key={i} className="flex items-start gap-2 text-muted-foreground">
                            <span className="mt-1.5 h-1 w-1 rounded-full bg-primary shrink-0" />
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  {/* What artifacts will be generated */}
                  <div className="text-sm bg-background/50 p-4 rounded-md border border-border/50">
                    <div className="space-y-3">
                      <div className="font-medium text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <BarChart className="h-3 w-3 text-foreground" />
                        What artifacts will be generated along with the playbook
                      </div>
                      <ul className="space-y-2">
                        {selectedPlaybook.outputs.map((output, i) => (
                          <li key={i} className="flex items-start gap-2 text-foreground">
                            <CheckCircle2 className="h-3 w-3 mt-0.5 text-green-500 shrink-0" />
                            <span>{output}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Configuration */}
              <div className="space-y-6">
                {selectedPlaybook.options && selectedPlaybook.options.length > 0 && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Settings2 className="h-4 w-4" />
                      Configuration Options
                    </label>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {selectedPlaybook.options.map((option) => (
                        <div
                          key={option.value}
                          onClick={() => setSelectedOption(option.value)}
                          className={`
                            cursor-pointer rounded-lg border p-4 transition-all hover:bg-accent
                            ${selectedOption === option.value 
                              ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                              : 'border-border bg-card'}
                          `}
                        >
                          <div className="font-medium mb-1">{option.label}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            {option.defaultPrompt}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <label className="text-sm font-medium">
                    Custom Instructions
                  </label>
                  <Textarea
                    placeholder="Add specific instructions, context, or constraints..."
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    className="min-h-[120px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    These instructions will be appended to the agent's system prompt.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setSelectedPlaybook(null)}>
                  Cancel
                </Button>
                <Button onClick={handleRun} className="gap-2 pl-4 pr-6">
                  <Play className="h-4 w-4" />
                  Run Playbook
                </Button>
              </div>
            </div>
          ) : (
            /* List View */
            <div className="grid grid-cols-1 gap-4">
              {filteredPlaybooks.map((playbook) => (
                <div
                  key={playbook.id}
                  className="group relative flex flex-col gap-4 rounded-lg border p-5 hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedPlaybook(playbook);
                    if (playbook.options && playbook.options.length > 0) {
                      setSelectedOption(playbook.options[0].value); // Select first option by default
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        {playbook.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {playbook.description}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="shrink-0 gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Configure
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-sm bg-background/50 p-3 rounded-md border border-border/50">
                      <div className="space-y-1.5">
                        <div className="font-medium text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Zap className="h-3 w-3 text-foreground" />What this playbook will do 
                        </div>
                        <div className="text-muted-foreground line-clamp-2">
                          {playbook.autoActions.slice(0, 2).join(", ")}...
                        </div>
                      </div>
                    </div>
                    <div className="text-sm bg-background/50 p-3 rounded-md border border-border/50">
                      <div className="space-y-1.5">
                        <div className="font-medium text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <BarChart className="h-3 w-3 text-foreground" /> What artifacts will be generated along with the playbook
                        </div>
                        <div className="text-foreground line-clamp-2">
                          {playbook.outputs.slice(0, 2).join(", ")}...
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* <div className="flex flex-wrap gap-2 pt-1">
                    {playbook.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                    {playbook.tags.length > 3 && (
                      <span className="text-xs text-muted-foreground self-center">+{playbook.tags.length - 3}</span>
                    )}
                  </div> */}
                </div>
              ))}

              {filteredPlaybooks.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No playbooks found for this category yet.
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

