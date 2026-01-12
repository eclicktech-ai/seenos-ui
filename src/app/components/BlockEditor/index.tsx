/**
 * Block Editor - 可视化内容块编辑器
 * 
 * 主要组件:
 * - BlockEditorPanel: 滑出式编辑面板容器
 * - BlockList: 可拖拽的 Block 列表
 * - BlockItem: 单个 Block 渲染
 * - PropertyPanel: 属性编辑面板
 * - PreviewPanel: HTML 实时预览
 * 
 * 状态管理:
 * - useEditorStore: Zustand store
 */

// 主组件
export { BlockEditorPanel, default } from './BlockEditorPanel';
export { BlockList } from './BlockList';
export { BlockItem } from './BlockItem';
export { PropertyPanel } from './PropertyPanel';
export { PreviewPanel } from './PreviewPanel';
export { BlockTypeMenu } from './BlockTypeMenu';

// Store
export { 
  useEditorStore, 
  useSelectedBlock,
  useCanUndo,
  useCanRedo,
  useBlockCount,
  type EditorState,
  type EditorActions,
  type EditorStore,
  type EditorMode,
  type DeviceType,
} from './stores/editorStore';

// Hooks
export { useEditorSync } from './hooks/useEditorSync';
export { useEditorEffects, type UseEditorEffectsOptions } from './hooks/useEditorEffects';

// Block Editors
export {
  // 可复用组件
  ListEditor,
  // Block 编辑器
  IntroBlockEditor,
  ProductCardEditor,
  StepBlockEditor,
  TextSectionEditor,
  ConclusionEditor,
  HeroBlockEditor,
  FeatureBlockEditor,
  GenericBlockEditor,
  // 工具函数
  getBlockEditor,
  BLOCK_EDITOR_MAP,
} from './editors';

// 类型
export * from './types';

