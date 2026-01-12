"use client";

/**
 * ListEditor - 可复用的列表编辑组件
 * 
 * 用于编辑字符串数组，如：
 * - pros/cons (产品优缺点)
 * - checklist (检查清单)
 * - keywords (关键词)
 * - features (功能列表)
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Plus, X, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ============ 类型定义 ============

export interface ListEditorProps {
  /** 列表项 */
  items: string[];
  /** 变更回调 */
  onChange: (items: string[]) => void;
  /** 占位符文本 */
  placeholder?: string;
  /** 新增按钮文本 */
  addButtonText?: string;
  /** 是否可排序 */
  sortable?: boolean;
  /** 最小项数 */
  minItems?: number;
  /** 最大项数 */
  maxItems?: number;
  /** 单项最大长度 */
  maxItemLength?: number;
  /** 自定义类名 */
  className?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 列表项样式变体 */
  variant?: "default" | "compact" | "pill";
  /** 空列表提示文本 */
  emptyText?: string;
}

interface SortableItemProps {
  id: string;
  value: string;
  index: number;
  onChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  placeholder?: string;
  maxItemLength?: number;
  disabled?: boolean;
  sortable?: boolean;
  variant?: "default" | "compact" | "pill";
}

// ============ 可排序列表项组件 ============

const SortableItem = React.memo<SortableItemProps>(
  ({
    id,
    value,
    index,
    onChange,
    onRemove,
    placeholder,
    maxItemLength,
    disabled,
    sortable,
    variant = "default",
  }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id, disabled: !sortable || disabled });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    const inputRef = useRef<HTMLInputElement>(null);

    // 如果是新添加的空项，自动聚焦
    useEffect(() => {
      if (value === "" && inputRef.current) {
        inputRef.current.focus();
      }
    }, [value]);

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "group flex items-center gap-2",
          variant === "compact" && "gap-1",
          variant === "pill" && "gap-1",
          isDragging && "opacity-50 bg-muted rounded-md"
        )}
      >
        {/* 拖拽手柄 */}
        {sortable && !disabled && (
          <button
            type="button"
            className={cn(
              "cursor-grab p-1 text-muted-foreground/50 hover:text-muted-foreground",
              "opacity-0 group-hover:opacity-100 transition-opacity",
              isDragging && "cursor-grabbing"
            )}
            {...attributes}
            {...listeners}
          >
            <GripVertical size={14} />
          </button>
        )}

        {/* 输入框 */}
        {variant === "pill" ? (
          <div
            className={cn(
              "flex items-center gap-1 rounded-full border border-border bg-muted/50 px-3 py-1",
              disabled && "opacity-50"
            )}
          >
            <span className="text-sm">{value}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="ml-1 text-muted-foreground hover:text-destructive"
              >
                <X size={12} />
              </button>
            )}
          </div>
        ) : (
          <>
            <Input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => onChange(index, e.target.value)}
              placeholder={placeholder}
              maxLength={maxItemLength}
              disabled={disabled}
              className={cn(
                "flex-1",
                variant === "compact" && "h-8 text-sm"
              )}
              onKeyDown={(e) => {
                // 按 Enter 添加新项
                if (e.key === "Enter" && value.trim()) {
                  e.preventDefault();
                  // 触发父组件添加新项（通过事件冒泡）
                  const event = new CustomEvent("list-editor-add", {
                    bubbles: true,
                  });
                  e.currentTarget.dispatchEvent(event);
                }
                // 按 Backspace 且为空时删除当前项
                if (e.key === "Backspace" && value === "") {
                  e.preventDefault();
                  onRemove(index);
                }
              }}
            />

            {/* 删除按钮 */}
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemove(index)}
                className={cn(
                  "h-8 w-8 p-0 text-muted-foreground hover:text-destructive",
                  "opacity-0 group-hover:opacity-100 transition-opacity",
                  variant === "compact" && "h-6 w-6"
                )}
              >
                <Trash2 size={variant === "compact" ? 12 : 14} />
              </Button>
            )}
          </>
        )}
      </div>
    );
  }
);

SortableItem.displayName = "SortableItem";

// ============ 主组件 ============

export const ListEditor = React.memo<ListEditorProps>(
  ({
    items,
    onChange,
    placeholder = "输入内容...",
    addButtonText = "添加",
    sortable = true,
    minItems = 0,
    maxItems = Infinity,
    maxItemLength,
    className,
    disabled = false,
    variant = "default",
    emptyText = "暂无内容",
  }) => {
    const [newItemValue, setNewItemValue] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    // 拖拽传感器
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

    // 生成唯一 ID（用于拖拽）
    const itemIds = items.map((_, index) => `item-${index}`);

    // 拖拽结束处理
    const handleDragEnd = useCallback(
      (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
          const oldIndex = itemIds.indexOf(active.id as string);
          const newIndex = itemIds.indexOf(over.id as string);

          if (oldIndex !== -1 && newIndex !== -1) {
            onChange(arrayMove(items, oldIndex, newIndex));
          }
        }
      },
      [items, itemIds, onChange]
    );

    // 更新单项
    const handleItemChange = useCallback(
      (index: number, value: string) => {
        const newItems = [...items];
        newItems[index] = value;
        onChange(newItems);
      },
      [items, onChange]
    );

    // 删除单项
    const handleItemRemove = useCallback(
      (index: number) => {
        if (items.length <= minItems) return;
        const newItems = items.filter((_, i) => i !== index);
        onChange(newItems);
      },
      [items, minItems, onChange]
    );

    // 添加新项
    const handleAddItem = useCallback(() => {
      if (items.length >= maxItems) return;

      const valueToAdd = newItemValue.trim();
      if (valueToAdd) {
        onChange([...items, valueToAdd]);
        setNewItemValue("");
      } else {
        // 添加空项让用户编辑
        onChange([...items, ""]);
      }
    }, [items, maxItems, newItemValue, onChange]);

    // 监听子组件的添加事件
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const handleAddEvent = () => {
        handleAddItem();
      };

      container.addEventListener("list-editor-add", handleAddEvent);
      return () => {
        container.removeEventListener("list-editor-add", handleAddEvent);
      };
    }, [handleAddItem]);

    const canAdd = items.length < maxItems && !disabled;
    const canRemove = items.length > minItems && !disabled;

    return (
      <div ref={containerRef} className={cn("space-y-2", className)}>
        {/* 列表项 */}
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">{emptyText}</p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={itemIds}
              strategy={verticalListSortingStrategy}
            >
              <div
                className={cn(
                  "space-y-2",
                  variant === "compact" && "space-y-1",
                  variant === "pill" && "flex flex-wrap gap-2"
                )}
              >
                {items.map((item, index) => (
                  <SortableItem
                    key={itemIds[index]}
                    id={itemIds[index]}
                    value={item}
                    index={index}
                    onChange={handleItemChange}
                    onRemove={canRemove ? handleItemRemove : () => {}}
                    placeholder={placeholder}
                    maxItemLength={maxItemLength}
                    disabled={disabled}
                    sortable={sortable}
                    variant={variant}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* 添加新项 */}
        {canAdd && variant !== "pill" && (
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={newItemValue}
              onChange={(e) => setNewItemValue(e.target.value)}
              placeholder={placeholder}
              maxLength={maxItemLength}
              className={cn(
                "flex-1",
                variant === "compact" && "h-8 text-sm"
              )}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddItem();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size={variant === "compact" ? "sm" : "default"}
              onClick={handleAddItem}
              className={cn(variant === "compact" && "h-8 px-2 text-xs")}
            >
              <Plus size={variant === "compact" ? 12 : 14} className="mr-1" />
              {addButtonText}
            </Button>
          </div>
        )}

        {/* Pill 模式的添加按钮 */}
        {canAdd && variant === "pill" && (
          <div className="flex items-center gap-2 mt-2">
            <Input
              type="text"
              value={newItemValue}
              onChange={(e) => setNewItemValue(e.target.value)}
              placeholder={placeholder}
              maxLength={maxItemLength}
              className="h-8 text-sm w-48"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddItem();
                }
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAddItem}
              className="h-8 px-2"
            >
              <Plus size={14} />
            </Button>
          </div>
        )}
      </div>
    );
  }
);

ListEditor.displayName = "ListEditor";

export default ListEditor;

