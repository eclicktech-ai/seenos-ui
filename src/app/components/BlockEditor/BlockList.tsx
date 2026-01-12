"use client";

import React, { useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEditorStore } from "./stores/editorStore";
import { BlockItem } from "./BlockItem";
import { BlockTypeMenu } from "./BlockTypeMenu";
import type { ContentBlock } from "./types";

export const BlockList = React.memo(() => {
  const { content, selectedBlockId, addBlock, moveBlock, selectBlock } =
    useEditorStore();

  const [showAddMenu, setShowAddMenu] = React.useState(false);
  const [addAfterBlockId, setAddAfterBlockId] = React.useState<string | null>(
    null
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const blocks = content?.blocks || [];
        const oldIndex = blocks.findIndex((b) => b.meta.id === active.id);
        const newIndex = blocks.findIndex((b) => b.meta.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          moveBlock(oldIndex, newIndex);
        }
      }
    },
    [content?.blocks, moveBlock]
  );

  const handleAddBlock = useCallback(
    (afterBlockId?: string) => {
      setAddAfterBlockId(afterBlockId || null);
      setShowAddMenu(true);
    },
    []
  );

  const handleSelectBlockType = useCallback(
    (type: string) => {
      addBlock(type as ContentBlock["meta"]["type"], addAfterBlockId || undefined);
      setShowAddMenu(false);
      setAddAfterBlockId(null);
    },
    [addBlock, addAfterBlockId]
  );

  const blocks = content?.blocks || [];
  const blockIds = blocks.map((b) => b.meta.id);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-12 flex-shrink-0 items-center justify-between border-b border-border bg-muted/30 px-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">Blocks</span>
          <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-medium text-foreground">
            {blocks.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleAddBlock()}
          className="h-7 px-2 text-xs"
        >
          <Plus size={14} className="mr-1" />
          Add Block
        </Button>
      </div>

      {/* Block List */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-12">
              <p className="mb-4 text-sm text-muted-foreground">
                No blocks yet
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddBlock()}
              >
                <Plus size={14} className="mr-1" />
                Add First Block
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={blockIds}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {blocks.map((block) => (
                    <BlockItem
                      key={block.meta.id}
                      block={block}
                      isSelected={selectedBlockId === block.meta.id}
                      onSelect={() => selectBlock(block.meta.id)}
                      onAddAfter={() => handleAddBlock(block.meta.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </ScrollArea>

      {/* Block Type Menu */}
      <BlockTypeMenu
        open={showAddMenu}
        onOpenChange={setShowAddMenu}
        onSelectType={handleSelectBlockType}
      />
    </div>
  );
});

BlockList.displayName = "BlockList";

export default BlockList;

