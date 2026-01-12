/**
 * Block Editor 状态管理
 * 使用 Zustand 管理编辑器状态
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { apiClient } from '@/lib/api/client';
import type {
  StructuredContent,
  ContentBlock,
  BlockType,
  PageType,
  BlockMeta,
  BLOCK_CONFIGS,
} from '../types';

// ============ 类型定义 ============

/** 编辑器模式 */
export type EditorMode = 'view' | 'edit';

/** 设备预设类型 */
export type DeviceType = 'desktop' | 'tablet' | 'mobile';

/** 撤销/重做历史项 */
interface HistoryItem {
  content: StructuredContent;
  timestamp: number;
}

/** 编辑器状态 */
export interface EditorState {
  // 内容数据
  itemId: string | null;
  content: StructuredContent | null;
  contentVersion: number;
  originalContent: StructuredContent | null; // 用于检测变更

  // 编辑状态
  selectedBlockId: string | null;
  mode: EditorMode;
  isDirty: boolean;
  isSaving: boolean;
  isLoading: boolean;
  error: string | null;

  // 预览状态
  previewHtml: string;
  previewDevice: DeviceType;
  isPreviewLoading: boolean;

  // 历史记录 (撤销/重做)
  history: HistoryItem[];
  historyIndex: number;
  maxHistoryLength: number;

  // 面板状态
  isEditorOpen: boolean;
  showPropertyPanel: boolean;
}

/** 编辑器操作 */
export interface EditorActions {
  // 内容操作
  loadContent: (itemId: string) => Promise<void>;
  saveContent: () => Promise<void>;
  resetContent: () => void;

  // Block 操作
  selectBlock: (blockId: string | null) => void;
  updateBlock: (blockId: string, updates: Partial<ContentBlock>) => void;
  addBlock: (type: BlockType, afterBlockId?: string) => void;
  deleteBlock: (blockId: string) => void;
  moveBlock: (fromIndex: number, toIndex: number) => void;
  duplicateBlock: (blockId: string) => void;

  // 历史操作
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  // 预览操作
  setPreviewDevice: (device: DeviceType) => void;
  refreshPreview: () => Promise<void>;

  // 模式操作
  setMode: (mode: EditorMode) => void;
  openEditor: (itemId: string) => void;
  closeEditor: () => void;
  togglePropertyPanel: () => void;

  // 错误处理
  setError: (error: string | null) => void;
  clearError: () => void;
}

export type EditorStore = EditorState & EditorActions;

// ============ 初始状态 ============

const initialState: EditorState = {
  itemId: null,
  content: null,
  contentVersion: 0,
  originalContent: null,

  selectedBlockId: null,
  mode: 'edit',
  isDirty: false,
  isSaving: false,
  isLoading: false,
  error: null,

  previewHtml: '',
  previewDevice: 'desktop',
  isPreviewLoading: false,

  history: [],
  historyIndex: -1,
  maxHistoryLength: 50,

  isEditorOpen: false,
  showPropertyPanel: true,
};

// ============ 辅助函数 ============

/** 创建新 Block */
function createNewBlock(type: BlockType, order: number): ContentBlock {
  const meta: BlockMeta = {
    id: uuidv4(),
    type,
    order,
    is_ai_generated: false,
    last_edited_at: new Date().toISOString(),
  };

  // 根据类型返回默认数据
  switch (type) {
    case 'intro':
      return {
        meta: { ...meta, type: 'intro' },
        headline: 'New Section',
        content: 'Enter your content here...',
      } as ContentBlock;
    case 'product_card':
      return {
        meta: { ...meta, type: 'product_card' },
        name: 'Product Name',
        description: 'Product description...',
        pros: [],
        cons: [],
        cta_url: '#',
      } as ContentBlock;
    case 'step':
      return {
        meta: { ...meta, type: 'step' },
        step_number: order + 1,
        title: 'Step Title',
        instructions: 'Enter instructions...',
      } as ContentBlock;
    case 'feature':
      return {
        meta: { ...meta, type: 'feature' },
        title: 'Feature Title',
        description: 'Feature description...',
      } as ContentBlock;
    case 'text_section':
      return {
        meta: { ...meta, type: 'text_section' },
        content: 'Enter your text content here...',
      } as ContentBlock;
    case 'quote':
      return {
        meta: { ...meta, type: 'quote' },
        quote: 'Enter quote...',
      } as ContentBlock;
    case 'call_to_action':
      return {
        meta: { ...meta, type: 'call_to_action' },
        headline: 'Ready to get started?',
        button_text: 'Get Started',
        button_url: '#',
      } as ContentBlock;
    case 'image':
      return {
        meta: { ...meta, type: 'image' },
        url: '',
        alt: 'Image description',
      } as ContentBlock;
    case 'hero':
      return {
        meta: { ...meta, type: 'hero' },
        headline: 'Hero Headline',
        subheadline: 'Subheadline text',
      } as ContentBlock;
    case 'conclusion':
      return {
        meta: { ...meta, type: 'conclusion' },
        summary: 'Enter conclusion...',
      } as ContentBlock;
    default:
      return {
        meta: { ...meta, type: 'text_section' },
        content: '',
      } as ContentBlock;
  }
}

/** 重新计算 Block 顺序 */
function reorderBlocks(blocks: ContentBlock[]): ContentBlock[] {
  return blocks.map((block, index) => {
    // Create a new block with updated order
    const updatedBlock = {
      ...block,
      meta: {
        ...block.meta,
        order: index,
      },
    };
    return updatedBlock as ContentBlock;
  });
}

/** 生成 Demo 预览 HTML */
function generateDemoPreviewHtml(content: StructuredContent): string {
  const blocksHtml = content.blocks.map((block) => {
    switch (block.meta.type) {
      case 'intro': {
        const intro = block as { headline?: string; content?: string; hook?: string };
        return `
          <section class="intro" style="margin-bottom: 2rem; padding: 2rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px;">
            ${intro.hook ? `<p style="font-style: italic; opacity: 0.9; margin-bottom: 1rem;">"${intro.hook}"</p>` : ''}
            <h1 style="font-size: 2rem; font-weight: bold; margin-bottom: 1rem;">${intro.headline || 'Untitled'}</h1>
            <p style="line-height: 1.6;">${intro.content || ''}</p>
          </section>
        `;
      }
      case 'product_card': {
        const product = block as { name?: string; tagline?: string; rating?: number; price?: string; pros?: string[]; cons?: string[]; description?: string; award_badge?: string; cta_text?: string };
        return `
          <article class="product-card" style="margin-bottom: 1.5rem; padding: 1.5rem; border: 1px solid #e2e8f0; border-radius: 12px; background: white;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
              <div>
                ${product.award_badge ? `<span style="display: inline-block; background: #f59e0b; color: white; font-size: 0.75rem; padding: 0.25rem 0.5rem; border-radius: 4px; margin-bottom: 0.5rem;">🏆 ${product.award_badge}</span>` : ''}
                <h2 style="font-size: 1.5rem; font-weight: bold; color: #1a202c;">${product.name || 'Product'}</h2>
                ${product.tagline ? `<p style="color: #718096;">${product.tagline}</p>` : ''}
              </div>
              <div style="text-align: right;">
                ${product.rating ? `<div style="color: #f59e0b; font-size: 1.25rem;">★ ${product.rating}</div>` : ''}
                ${product.price ? `<div style="font-weight: bold; color: #2d3748;">${product.price}</div>` : ''}
              </div>
            </div>
            <p style="color: #4a5568; margin-bottom: 1rem;">${product.description || ''}</p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div>
                <h4 style="color: #38a169; font-weight: 600; margin-bottom: 0.5rem;">✓ Pros</h4>
                <ul style="list-style: none; padding: 0; margin: 0;">
                  ${(product.pros || []).map(p => `<li style="color: #4a5568; margin-bottom: 0.25rem;">• ${p}</li>`).join('')}
                </ul>
              </div>
              <div>
                <h4 style="color: #e53e3e; font-weight: 600; margin-bottom: 0.5rem;">✗ Cons</h4>
                <ul style="list-style: none; padding: 0; margin: 0;">
                  ${(product.cons || []).map(c => `<li style="color: #4a5568; margin-bottom: 0.25rem;">• ${c}</li>`).join('')}
                </ul>
              </div>
            </div>
            ${product.cta_text ? `<button style="margin-top: 1rem; padding: 0.75rem 1.5rem; background: #4299e1; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">${product.cta_text}</button>` : ''}
          </article>
        `;
      }
      case 'step': {
        const step = block as { step_number?: number; title?: string; instructions?: string; pro_tip?: string; estimated_time?: string };
        return `
          <div class="step" style="margin-bottom: 1.5rem; padding: 1.5rem; border-left: 4px solid #4299e1; background: #f7fafc;">
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
              <span style="display: flex; align-items: center; justify-content: center; width: 2.5rem; height: 2.5rem; background: #4299e1; color: white; border-radius: 50%; font-weight: bold;">${step.step_number || 1}</span>
              <h3 style="font-size: 1.25rem; font-weight: bold; color: #1a202c;">${step.title || 'Step'}</h3>
              ${step.estimated_time ? `<span style="font-size: 0.875rem; color: #718096;">⏱ ${step.estimated_time}</span>` : ''}
            </div>
            <p style="color: #4a5568; white-space: pre-line;">${step.instructions || ''}</p>
            ${step.pro_tip ? `<div style="margin-top: 1rem; padding: 1rem; background: #c6f6d5; border-radius: 8px; color: #22543d;"><strong>💡 Pro Tip:</strong> ${step.pro_tip}</div>` : ''}
          </div>
        `;
      }
      case 'conclusion': {
        const conclusion = block as { summary?: string; final_recommendation?: string; cta_text?: string };
        return `
          <section class="conclusion" style="margin-top: 2rem; padding: 2rem; background: #edf2f7; border-radius: 12px;">
            <h2 style="font-size: 1.5rem; font-weight: bold; color: #1a202c; margin-bottom: 1rem;">Conclusion</h2>
            <p style="color: #4a5568; margin-bottom: 1rem;">${conclusion.summary || ''}</p>
            ${conclusion.final_recommendation ? `<p style="font-weight: 600; color: #2d3748; padding: 1rem; background: white; border-radius: 8px;">📌 ${conclusion.final_recommendation}</p>` : ''}
            ${conclusion.cta_text ? `<button style="margin-top: 1rem; padding: 1rem 2rem; background: #48bb78; color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 1rem; cursor: pointer;">${conclusion.cta_text}</button>` : ''}
          </section>
        `;
      }
      default:
        return `<div style="padding: 1rem; border: 1px dashed #cbd5e0; margin-bottom: 1rem; color: #718096;">Block: ${block.meta.type}</div>`;
    }
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${content.meta.title || 'Preview'}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #1a202c; background: #fff; }
        .container { max-width: 800px; margin: 0 auto; padding: 2rem; }
      </style>
    </head>
    <body>
      <div class="container">
        ${blocksHtml}
      </div>
    </body>
    </html>
  `;
}

/** 创建 Demo 内容（用于开发测试） */
function createDemoContent(): StructuredContent {
  return {
    page_type: 'listicle',
    meta: {
      title: 'Top 5 Best Project Management Tools in 2025',
      seo_title: 'Best Project Management Tools 2025 - Complete Guide',
      seo_description: 'Discover the top project management tools for teams. Compare features, pricing, and find the perfect solution.',
      target_keyword: 'best project management tools',
    },
    global_settings: {
      show_toc: true,
      show_share_buttons: true,
      layout: 'default',
    },
    blocks: [
      {
        meta: {
          id: 'demo-intro-1',
          type: 'intro',
          order: 0,
          is_ai_generated: true,
        },
        headline: 'Finding the Right Project Management Tool',
        content: 'In today\'s fast-paced business environment, having the right project management tool can make or break your team\'s productivity. We\'ve tested and reviewed the top solutions to help you make an informed decision.',
        hook: 'Managing projects shouldn\'t feel like a project itself.',
      } as ContentBlock,
      {
        meta: {
          id: 'demo-product-1',
          type: 'product_card',
          order: 1,
          is_ai_generated: true,
        },
        name: 'Monday.com',
        tagline: 'Work OS for modern teams',
        rating: 4.8,
        price: '$10/user/month',
        pros: ['Intuitive interface', 'Powerful automations', 'Great integrations'],
        cons: ['Can be expensive for large teams', 'Learning curve for advanced features'],
        best_for: 'Teams that want flexibility and visual project management',
        description: 'Monday.com is a versatile work operating system that helps teams plan, track, and deliver projects efficiently.',
        cta_url: 'https://monday.com',
        cta_text: 'Try Monday.com',
        award_badge: 'Best Overall',
      } as ContentBlock,
      {
        meta: {
          id: 'demo-product-2',
          type: 'product_card',
          order: 2,
          is_ai_generated: true,
        },
        name: 'Asana',
        tagline: 'Move work forward',
        rating: 4.6,
        price: '$13/user/month',
        pros: ['Clean design', 'Excellent task management', 'Free tier available'],
        cons: ['Limited reporting in free plan', 'Mobile app could be better'],
        best_for: 'Teams focused on task and workflow management',
        description: 'Asana helps teams orchestrate their work, from daily tasks to strategic initiatives.',
        cta_url: 'https://asana.com',
        cta_text: 'Try Asana',
        award_badge: 'Best for Teams',
      } as ContentBlock,
      {
        meta: {
          id: 'demo-step-1',
          type: 'step',
          order: 3,
        },
        step_number: 1,
        title: 'Define Your Requirements',
        estimated_time: '30 minutes',
        instructions: 'Before choosing a tool, list your team\'s specific needs:\n\n- Team size and structure\n- Key workflows to support\n- Integration requirements\n- Budget constraints',
        pro_tip: 'Involve key stakeholders in this process to ensure buy-in.',
      } as ContentBlock,
      {
        meta: {
          id: 'demo-conclusion-1',
          type: 'conclusion',
          order: 4,
        },
        summary: 'Choosing the right project management tool depends on your team\'s specific needs, budget, and workflow preferences. We recommend starting with free trials to get hands-on experience before committing.',
        final_recommendation: 'For most teams, Monday.com offers the best balance of features, usability, and value.',
        cta_text: 'Start Your Free Trial',
        cta_url: '#get-started',
      } as ContentBlock,
    ],
  };
}

// ============ Store 创建 ============

export const useEditorStore = create<EditorStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...initialState,

      // ============ 内容操作 ============

      loadContent: async (itemId: string) => {
        set({ isLoading: true, error: null, itemId });

        try {
          // 检查是否是 Demo 模式
          if (itemId.startsWith('demo-')) {
            // 使用 Demo 数据
            const demoContent = createDemoContent();
            set({
              content: demoContent,
              contentVersion: 1,
              originalContent: JSON.parse(JSON.stringify(demoContent)),
              isLoading: false,
              isDirty: false,
              history: [{ content: JSON.parse(JSON.stringify(demoContent)), timestamp: Date.now() }],
              historyIndex: 0,
            });
            // 生成 Demo 预览
            setTimeout(() => get().refreshPreview(), 100);
            return;
          }

          const response = await apiClient.getStructuredContent(itemId);
          const content = response.structured_content as unknown as StructuredContent;

          set({
            content,
            contentVersion: response.content_version,
            originalContent: JSON.parse(JSON.stringify(content)),
            isLoading: false,
            isDirty: false,
            history: [{ content: JSON.parse(JSON.stringify(content)), timestamp: Date.now() }],
            historyIndex: 0,
          });

          // 加载预览
          get().refreshPreview();
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load content',
          });
        }
      },

      saveContent: async () => {
        const { itemId, content, contentVersion } = get();
        if (!itemId || !content) return;

        set({ isSaving: true, error: null });

        // Demo 模式：模拟保存
        if (itemId.startsWith('demo-')) {
          await new Promise((resolve) => setTimeout(resolve, 500)); // 模拟网络延迟
          set({
            contentVersion: contentVersion + 1,
            originalContent: JSON.parse(JSON.stringify(content)),
            isDirty: false,
            isSaving: false,
          });
          // 刷新预览
          get().refreshPreview();
          return;
        }

        try {
          const response = await apiClient.saveStructuredContent(
            itemId,
            content as unknown as Parameters<typeof apiClient.saveStructuredContent>[1],
            contentVersion
          );

          set({
            contentVersion: response.content_version,
            originalContent: JSON.parse(JSON.stringify(content)),
            isDirty: false,
            isSaving: false,
          });
        } catch (error) {
          set({
            isSaving: false,
            error: error instanceof Error ? error.message : 'Failed to save content',
          });
        }
      },

      resetContent: () => {
        const { originalContent } = get();
        if (originalContent) {
          set({
            content: JSON.parse(JSON.stringify(originalContent)),
            isDirty: false,
            selectedBlockId: null,
          });
        }
      },

      // ============ Block 操作 ============

      selectBlock: (blockId: string | null) => {
        set({ selectedBlockId: blockId });
      },

      updateBlock: (blockId: string, updates: Partial<ContentBlock>) => {
        const { content } = get();
        if (!content) return;

        const blockIndex = content.blocks.findIndex((b) => b.meta.id === blockId);
        if (blockIndex === -1) return;

        // 保存历史
        get().pushHistory();

        const updatedBlocks = [...content.blocks];
        updatedBlocks[blockIndex] = {
          ...updatedBlocks[blockIndex],
          ...updates,
          meta: {
            ...updatedBlocks[blockIndex].meta,
            ...(updates.meta || {}),
            last_edited_at: new Date().toISOString(),
          },
        } as ContentBlock;

        set({
          content: { ...content, blocks: updatedBlocks },
          isDirty: true,
        });
      },

      addBlock: (type: BlockType, afterBlockId?: string) => {
        const { content } = get();
        if (!content) return;

        get().pushHistory();

        let insertIndex = content.blocks.length;
        if (afterBlockId) {
          const afterIndex = content.blocks.findIndex((b) => b.meta.id === afterBlockId);
          if (afterIndex !== -1) {
            insertIndex = afterIndex + 1;
          }
        }

        const newBlock = createNewBlock(type, insertIndex);
        const updatedBlocks = [...content.blocks];
        updatedBlocks.splice(insertIndex, 0, newBlock);

        set({
          content: { ...content, blocks: reorderBlocks(updatedBlocks) },
          isDirty: true,
          selectedBlockId: newBlock.meta.id,
        });
      },

      deleteBlock: (blockId: string) => {
        const { content, selectedBlockId } = get();
        if (!content) return;

        get().pushHistory();

        const updatedBlocks = content.blocks.filter((b) => b.meta.id !== blockId);

        set({
          content: { ...content, blocks: reorderBlocks(updatedBlocks) },
          isDirty: true,
          selectedBlockId: selectedBlockId === blockId ? null : selectedBlockId,
        });
      },

      moveBlock: (fromIndex: number, toIndex: number) => {
        const { content } = get();
        if (!content) return;
        if (fromIndex === toIndex) return;
        if (fromIndex < 0 || fromIndex >= content.blocks.length) return;
        if (toIndex < 0 || toIndex >= content.blocks.length) return;

        get().pushHistory();

        const updatedBlocks = [...content.blocks];
        const [movedBlock] = updatedBlocks.splice(fromIndex, 1);
        updatedBlocks.splice(toIndex, 0, movedBlock);

        set({
          content: { ...content, blocks: reorderBlocks(updatedBlocks) },
          isDirty: true,
        });
      },

      duplicateBlock: (blockId: string) => {
        const { content } = get();
        if (!content) return;

        const blockIndex = content.blocks.findIndex((b) => b.meta.id === blockId);
        if (blockIndex === -1) return;

        get().pushHistory();

        const originalBlock = content.blocks[blockIndex];
        const duplicatedBlock: ContentBlock = {
          ...JSON.parse(JSON.stringify(originalBlock)),
          meta: {
            ...originalBlock.meta,
            id: uuidv4(),
            order: blockIndex + 1,
            last_edited_at: new Date().toISOString(),
          },
        };

        const updatedBlocks = [...content.blocks];
        updatedBlocks.splice(blockIndex + 1, 0, duplicatedBlock);

        set({
          content: { ...content, blocks: reorderBlocks(updatedBlocks) },
          isDirty: true,
          selectedBlockId: duplicatedBlock.meta.id,
        });
      },

      // ============ 历史操作 ============

      pushHistory: () => {
        const { content, history, historyIndex, maxHistoryLength } = get();
        if (!content) return;

        // 截断历史到当前位置
        const newHistory = history.slice(0, historyIndex + 1);

        // 添加新历史项
        newHistory.push({
          content: JSON.parse(JSON.stringify(content)),
          timestamp: Date.now(),
        });

        // 限制历史长度
        if (newHistory.length > maxHistoryLength) {
          newHistory.shift();
        }

        set({
          history: newHistory,
          historyIndex: newHistory.length - 1,
        });
      },

      undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex <= 0) return;

        const newIndex = historyIndex - 1;
        const historyItem = history[newIndex];

        set({
          content: JSON.parse(JSON.stringify(historyItem.content)),
          historyIndex: newIndex,
          isDirty: true,
        });
      },

      redo: () => {
        const { history, historyIndex } = get();
        if (historyIndex >= history.length - 1) return;

        const newIndex = historyIndex + 1;
        const historyItem = history[newIndex];

        set({
          content: JSON.parse(JSON.stringify(historyItem.content)),
          historyIndex: newIndex,
          isDirty: true,
        });
      },

      // ============ 预览操作 ============

      setPreviewDevice: (device: DeviceType) => {
        set({ previewDevice: device });
      },

      refreshPreview: async () => {
        const { itemId, content } = get();
        if (!itemId) return;

        set({ isPreviewLoading: true });

        // Demo 模式：生成本地预览
        if (itemId.startsWith('demo-') && content) {
          const demoHtml = generateDemoPreviewHtml(content);
          set({ previewHtml: demoHtml, isPreviewLoading: false });
          return;
        }

        try {
          const html = await apiClient.getContentPreview(itemId);
          set({ previewHtml: html, isPreviewLoading: false });
        } catch (error) {
          set({
            isPreviewLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load preview',
          });
        }
      },

      // ============ 模式操作 ============

      setMode: (mode: EditorMode) => {
        set({ mode });
      },

      openEditor: (itemId: string) => {
        set({ isEditorOpen: true });
        get().loadContent(itemId);
      },

      closeEditor: () => {
        const { isDirty } = get();

        // 如果有未保存的更改，可以在这里添加确认逻辑
        if (isDirty) {
          // 暂时直接关闭，可以后续添加确认对话框
          console.warn('Closing editor with unsaved changes');
        }

        set({
          ...initialState,
          isEditorOpen: false,
        });
      },

      togglePropertyPanel: () => {
        set((state) => ({ showPropertyPanel: !state.showPropertyPanel }));
      },

      // ============ 错误处理 ============

      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },
    })),
    { name: 'editor-store' }
  )
);

// ============ 选择器 ============

/** 获取选中的 Block */
export const useSelectedBlock = () => {
  return useEditorStore((state) => {
    if (!state.content || !state.selectedBlockId) return null;
    return state.content.blocks.find((b) => b.meta.id === state.selectedBlockId) || null;
  });
};

/** 获取是否可以撤销 */
export const useCanUndo = () => {
  return useEditorStore((state) => state.historyIndex > 0);
};

/** 获取是否可以重做 */
export const useCanRedo = () => {
  return useEditorStore((state) => state.historyIndex < state.history.length - 1);
};

/** 获取 Block 数量 */
export const useBlockCount = () => {
  return useEditorStore((state) => state.content?.blocks.length || 0);
};

export default useEditorStore;

