/**
 * Block Editors - 导出所有 Block 编辑器组件
 * 
 * 用法:
 * import { IntroBlockEditor, ProductCardEditor, ... } from './editors';
 */

// 可复用组件
export { ListEditor, type ListEditorProps } from './ListEditor';

// Block 编辑器
export { IntroBlockEditor, type IntroBlockEditorProps } from './IntroBlockEditor';
export { ProductCardEditor, type ProductCardEditorProps } from './ProductCardEditor';
export { StepBlockEditor, type StepBlockEditorProps } from './StepBlockEditor';
export { TextSectionEditor, type TextSectionEditorProps } from './TextSectionEditor';
export { ConclusionEditor, type ConclusionEditorProps } from './ConclusionEditor';
export { HeroBlockEditor, type HeroBlockEditorProps } from './HeroBlockEditor';
export { FeatureBlockEditor, type FeatureBlockEditorProps } from './FeatureBlockEditor';
export { GenericBlockEditor, type GenericBlockEditorProps } from './GenericBlockEditor';

// Block 编辑器类型映射
import type { ContentBlock, BlockType } from '../types';
import type { ComponentType } from 'react';

import { IntroBlockEditor } from './IntroBlockEditor';
import { ProductCardEditor } from './ProductCardEditor';
import { StepBlockEditor } from './StepBlockEditor';
import { TextSectionEditor } from './TextSectionEditor';
import { ConclusionEditor } from './ConclusionEditor';
import { HeroBlockEditor } from './HeroBlockEditor';
import { FeatureBlockEditor } from './FeatureBlockEditor';
import { GenericBlockEditor } from './GenericBlockEditor';

/** Block 编辑器 Props 基础接口 */
export interface BlockEditorProps<T extends ContentBlock = ContentBlock> {
  block: T;
  onChange: (block: T) => void;
  className?: string;
  disabled?: boolean;
}

/** 获取 Block 类型对应的编辑器组件 */
export function getBlockEditor(
  blockType: BlockType
): ComponentType<BlockEditorProps<any>> {
  switch (blockType) {
    case 'intro':
      return IntroBlockEditor;
    case 'product_card':
      return ProductCardEditor;
    case 'step':
      return StepBlockEditor;
    case 'text_section':
      return TextSectionEditor;
    case 'conclusion':
      return ConclusionEditor;
    case 'hero':
      return HeroBlockEditor;
    case 'feature':
      return FeatureBlockEditor;
    // 以下类型使用通用编辑器
    case 'blog_section':
    case 'image':
    case 'video':
    case 'quote':
    case 'call_to_action':
    case 'testimonial':
    case 'pricing':
    case 'faq':
    case 'comparison_row':
    default:
      return GenericBlockEditor;
  }
}

/** Block 类型到编辑器的映射 */
export const BLOCK_EDITOR_MAP: Record<BlockType, ComponentType<BlockEditorProps<any>>> = {
  intro: IntroBlockEditor,
  product_card: ProductCardEditor,
  step: StepBlockEditor,
  text_section: TextSectionEditor,
  conclusion: ConclusionEditor,
  hero: HeroBlockEditor,
  feature: FeatureBlockEditor,
  blog_section: GenericBlockEditor,
  image: GenericBlockEditor,
  video: GenericBlockEditor,
  quote: GenericBlockEditor,
  call_to_action: GenericBlockEditor,
  testimonial: GenericBlockEditor,
  pricing: GenericBlockEditor,
  faq: GenericBlockEditor,
  comparison_row: GenericBlockEditor,
};

