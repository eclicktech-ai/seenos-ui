"use client";

/**
 * ProductCardEditor - 产品卡片编辑器
 * 
 * 用于 Listicle 页面的产品展示，包含：
 * - 产品名称、标语
 * - 评分、价格
 * - 优点、缺点
 * - 最适合人群
 * - 描述 (Markdown)
 * - CTA 按钮
 * - 奖章徽章
 */

import React, { useCallback } from "react";
import { Package, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ListEditor } from "./ListEditor";
import type { ProductCardBlock } from "../types";

export interface ProductCardEditorProps {
  /** Block 数据 */
  block: ProductCardBlock;
  /** 变更回调 */
  onChange: (block: ProductCardBlock) => void;
  /** 自定义类名 */
  className?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

const AWARD_BADGES = [
  { value: "", label: "无" },
  { value: "Best Overall", label: "Best Overall" },
  { value: "Best Value", label: "Best Value" },
  { value: "Editor's Choice", label: "Editor's Choice" },
  { value: "Top Pick", label: "Top Pick" },
  { value: "Budget Pick", label: "Budget Pick" },
];

export const ProductCardEditor = React.memo<ProductCardEditorProps>(
  ({ block, onChange, className, disabled = false }) => {
    // 更新字段的通用方法
    const updateField = useCallback(
      <K extends keyof ProductCardBlock>(field: K, value: ProductCardBlock[K]) => {
        onChange({ ...block, [field]: value });
      },
      [block, onChange]
    );

    return (
      <div className={cn("space-y-4", className)}>
        {/* 头部标识 */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Package size={16} />
          <span className="text-xs font-medium uppercase tracking-wide">
            Product Card
          </span>
        </div>

        {/* 基本信息 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 产品名称 */}
          <div className="space-y-2">
            <Label htmlFor="name">产品名称 *</Label>
            <Input
              id="name"
              type="text"
              value={block.name || ""}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="产品名称"
              disabled={disabled}
            />
          </div>

          {/* 标语 */}
          <div className="space-y-2">
            <Label htmlFor="tagline">标语</Label>
            <Input
              id="tagline"
              type="text"
              value={block.tagline || ""}
              onChange={(e) => updateField("tagline", e.target.value)}
              placeholder="简短的产品描述"
              disabled={disabled}
            />
          </div>
        </div>

        {/* 评分和价格 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 评分 */}
          <div className="space-y-2">
            <Label htmlFor="rating" className="flex items-center gap-1">
              <Star size={14} className="text-yellow-500" />
              评分 (0-5)
            </Label>
            <Input
              id="rating"
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={block.rating || 0}
              onChange={(e) => updateField("rating", parseFloat(e.target.value) || 0)}
              disabled={disabled}
            />
          </div>

          {/* 价格 */}
          <div className="space-y-2">
            <Label htmlFor="price">价格</Label>
            <Input
              id="price"
              type="text"
              value={block.price || ""}
              onChange={(e) => updateField("price", e.target.value)}
              placeholder="$99/月"
              disabled={disabled}
            />
          </div>
        </div>

        {/* 优缺点 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 优点 */}
          <div className="space-y-2">
            <Label className="text-green-600">优点 (Pros)</Label>
            <ListEditor
              items={block.pros || []}
              onChange={(pros) => updateField("pros", pros)}
              placeholder="添加优点..."
              addButtonText="添加"
              variant="compact"
              disabled={disabled}
              emptyText="暂无优点"
            />
          </div>

          {/* 缺点 */}
          <div className="space-y-2">
            <Label className="text-red-600">缺点 (Cons)</Label>
            <ListEditor
              items={block.cons || []}
              onChange={(cons) => updateField("cons", cons)}
              placeholder="添加缺点..."
              addButtonText="添加"
              variant="compact"
              disabled={disabled}
              emptyText="暂无缺点"
            />
          </div>
        </div>

        {/* 最适合人群 */}
        <div className="space-y-2">
          <Label htmlFor="best_for">最适合人群</Label>
          <Input
            id="best_for"
            type="text"
            value={block.best_for || ""}
            onChange={(e) => updateField("best_for", e.target.value)}
            placeholder="适合需要...的用户"
            disabled={disabled}
          />
        </div>

        {/* 描述 */}
        <div className="space-y-2">
          <Label htmlFor="description">详细描述</Label>
          <Textarea
            id="description"
            value={block.description || ""}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="输入产品详细描述... (支持 Markdown)"
            rows={4}
            disabled={disabled}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            支持 Markdown 格式
          </p>
        </div>

        {/* CTA 按钮 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cta_text">CTA 文本</Label>
            <Input
              id="cta_text"
              type="text"
              value={block.cta_text || ""}
              onChange={(e) => updateField("cta_text", e.target.value)}
              placeholder="立即购买"
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cta_url">CTA 链接 *</Label>
            <Input
              id="cta_url"
              type="url"
              value={block.cta_url || ""}
              onChange={(e) => updateField("cta_url", e.target.value)}
              placeholder="https://example.com/buy"
              disabled={disabled}
            />
          </div>
        </div>

        {/* 图片 URL */}
        <div className="space-y-2">
          <Label htmlFor="image_url">产品图片 URL</Label>
          <Input
            id="image_url"
            type="url"
            value={block.image_url || ""}
            onChange={(e) => updateField("image_url", e.target.value)}
            placeholder="https://example.com/product.jpg"
            disabled={disabled}
          />
        </div>

        {/* 奖章徽章 */}
        <div className="space-y-2">
          <Label htmlFor="award_badge">奖章徽章</Label>
          <Select
            value={block.award_badge || ""}
            onValueChange={(value) => updateField("award_badge", value || undefined)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择徽章..." />
            </SelectTrigger>
            <SelectContent>
              {AWARD_BADGES.map((badge) => (
                <SelectItem key={badge.value} value={badge.value || "none"}>
                  {badge.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 图片预览 */}
        {block.image_url && (
          <div className="mt-4">
            <Label>图片预览</Label>
            <div className="mt-2 rounded-lg border border-border overflow-hidden bg-muted/20 w-32 h-32">
              <img
                src={block.image_url}
                alt={block.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }
);

ProductCardEditor.displayName = "ProductCardEditor";

export default ProductCardEditor;

