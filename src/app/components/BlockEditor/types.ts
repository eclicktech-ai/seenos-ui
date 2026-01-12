/**
 * Block Editor 类型定义
 * 基于 frontend-development-guide.md 规范
 */

// ============ Block 元数据 ============

/** Block 元数据 */
export interface BlockMeta {
  id: string;           // UUID
  type: BlockType;      // Block 类型
  order: number;        // 排序顺序
  is_ai_generated?: boolean;
  last_edited_at?: string;  // ISO 时间戳
}

/** Block 类型枚举 */
export type BlockType =
  | 'intro'
  | 'product_card'
  | 'comparison_row'
  | 'step'
  | 'feature'
  | 'text_section'
  | 'blog_section'
  | 'conclusion'
  | 'image'
  | 'video'
  | 'quote'
  | 'call_to_action'
  | 'hero'
  | 'testimonial'
  | 'pricing'
  | 'faq';

// ============ 页面元数据 ============

/** 页面元数据 */
export interface PageMeta {
  title: string;
  seo_title?: string;
  seo_description?: string;
  slug?: string;
  target_keyword?: string;
  secondary_keywords?: string[];
  author?: string;
  published_date?: string;
}

/** 全局设置 */
export interface GlobalSettings {
  show_toc?: boolean;
  show_share_buttons?: boolean;
  theme?: string;
  layout?: 'default' | 'wide' | 'narrow';
}

/** 页面类型 */
export type PageType = 'listicle' | 'comparison' | 'guide' | 'landing' | 'blog';

// ============ Block 定义 ============

/** 基础 Block 接口 */
export interface BaseBlock {
  meta: BlockMeta;
}

/** Intro Block */
export interface IntroBlock extends BaseBlock {
  meta: BlockMeta & { type: 'intro' };
  headline?: string;
  content: string;        // Markdown
  hook?: string;
  image_url?: string;
}

/** Product Card Block (用于 Listicle) */
export interface ProductCardBlock extends BaseBlock {
  meta: BlockMeta & { type: 'product_card' };
  name: string;
  tagline?: string;
  rating?: number;        // 0-5
  price?: string;
  pros: string[];
  cons: string[];
  best_for?: string;
  description: string;    // Markdown
  image_url?: string;
  cta_url: string;
  cta_text?: string;
  award_badge?: string;   // e.g., "Best Overall"
}

/** Step Block (用于 Guide) */
export interface StepBlock extends BaseBlock {
  meta: BlockMeta & { type: 'step' };
  step_number: number;
  title: string;
  estimated_time?: string;
  instructions: string;   // Markdown
  checklist?: string[];
  pro_tip?: string;
  warning?: string;
  image_url?: string;
}

/** Feature Block */
export interface FeatureBlock extends BaseBlock {
  meta: BlockMeta & { type: 'feature' };
  title: string;
  description: string;
  icon?: string;
  image_url?: string;
}

/** Text Section Block */
export interface TextSectionBlock extends BaseBlock {
  meta: BlockMeta & { type: 'text_section' };
  heading?: string;
  content: string;        // Markdown
  image_url?: string;
  image_position?: 'left' | 'right' | 'top' | 'bottom';
}

/** Blog Section Block */
export interface BlogSectionBlock extends BaseBlock {
  meta: BlockMeta & { type: 'blog_section' };
  heading: string;
  content: string;        // Markdown
  key_points?: string[];
}

/** Conclusion Block */
export interface ConclusionBlock extends BaseBlock {
  meta: BlockMeta & { type: 'conclusion' };
  summary: string;        // Markdown
  final_recommendation?: string;
  cta_text?: string;
  cta_url?: string;
}

/** Hero Block (用于 Landing) */
export interface HeroBlock extends BaseBlock {
  meta: BlockMeta & { type: 'hero' };
  headline: string;
  subheadline?: string;
  cta_text?: string;
  cta_url?: string;
  background_image?: string;
  video_url?: string;
}

/** Quote Block */
export interface QuoteBlock extends BaseBlock {
  meta: BlockMeta & { type: 'quote' };
  quote: string;
  author?: string;
  title?: string;
  company?: string;
  avatar_url?: string;
}

/** Image Block */
export interface ImageBlock extends BaseBlock {
  meta: BlockMeta & { type: 'image' };
  url: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
}

/** Video Block */
export interface VideoBlock extends BaseBlock {
  meta: BlockMeta & { type: 'video' };
  url: string;
  title?: string;
  thumbnail_url?: string;
  provider?: 'youtube' | 'vimeo' | 'custom';
}

/** Call to Action Block */
export interface CTABlock extends BaseBlock {
  meta: BlockMeta & { type: 'call_to_action' };
  headline: string;
  description?: string;
  button_text: string;
  button_url: string;
  style?: 'primary' | 'secondary' | 'minimal';
}

/** Testimonial Block */
export interface TestimonialBlock extends BaseBlock {
  meta: BlockMeta & { type: 'testimonial' };
  quote: string;
  author: string;
  title?: string;
  company?: string;
  avatar_url?: string;
  rating?: number;
}

/** Pricing Block */
export interface PricingBlock extends BaseBlock {
  meta: BlockMeta & { type: 'pricing' };
  plan_name: string;
  price: string;
  billing_period?: string;
  features: string[];
  cta_text?: string;
  cta_url?: string;
  is_popular?: boolean;
}

/** FAQ Block */
export interface FAQBlock extends BaseBlock {
  meta: BlockMeta & { type: 'faq' };
  question: string;
  answer: string;
  category?: string;
}

/** Comparison Row Block */
export interface ComparisonRowBlock extends BaseBlock {
  meta: BlockMeta & { type: 'comparison_row' };
  feature: string;
  values: Record<string, string | boolean | number>;
}

// ============ Block Union Type ============

export type ContentBlock =
  | IntroBlock
  | ProductCardBlock
  | StepBlock
  | FeatureBlock
  | TextSectionBlock
  | BlogSectionBlock
  | ConclusionBlock
  | HeroBlock
  | QuoteBlock
  | ImageBlock
  | VideoBlock
  | CTABlock
  | TestimonialBlock
  | PricingBlock
  | FAQBlock
  | ComparisonRowBlock;

// ============ 结构化内容 ============

/** 结构化内容 (通用接口) */
export interface StructuredContent {
  page_type: PageType;
  meta: PageMeta;
  intro?: IntroBlock;
  conclusion?: ConclusionBlock;
  global_settings: GlobalSettings;
  blocks: ContentBlock[];
}

/** Listicle 页面 */
export interface ListicleContent extends StructuredContent {
  page_type: 'listicle';
  best_overall?: string;
  best_value?: string;
  ranking_criteria?: string[];
  list_items: ProductCardBlock[];
}

/** Comparison 页面 */
export interface ComparisonContent extends StructuredContent {
  page_type: 'comparison';
  comparison_items: ProductCardBlock[];
  features: ComparisonRowBlock[];
  winner?: string;
}

/** Guide 页面 */
export interface GuideContent extends StructuredContent {
  page_type: 'guide';
  prerequisites?: string[];
  estimated_total_time?: string;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  steps: StepBlock[];
  faq?: FAQBlock[];
}

/** Landing 页面 */
export interface LandingContent extends StructuredContent {
  page_type: 'landing';
  hero: HeroBlock;
  features: FeatureBlock[];
  testimonials?: TestimonialBlock[];
  pricing?: PricingBlock[];
  final_cta: CTABlock;
}

/** Blog 页面 */
export interface BlogContent extends StructuredContent {
  page_type: 'blog';
  key_takeaways?: string[];
  sections: BlogSectionBlock[];
}

// ============ API 响应类型 ============

/** 内容项响应 */
export interface ContentItemResponse {
  item_id: string;
  title: string;
  page_type: PageType;
  status: 'draft' | 'published' | 'archived';
  content_version: number;
  structured_content: StructuredContent;
  created_at: string;
  updated_at: string;
}

/** 保存结构化内容请求 */
export interface SaveContentRequest {
  structured_content: StructuredContent;
  expected_version?: number;  // 乐观锁版本号
}

/** 保存结构化内容响应 */
export interface SaveContentResponse {
  success: boolean;
  item_id: string;
  content_version: number;
  updated_at: string;
}

/** 部分更新请求 */
export interface PatchContentRequest {
  path: string;
  value: unknown;
}

/** 部分更新响应 */
export interface PatchContentResponse {
  success: boolean;
  path: string;
  content_version: number;
}

/** 发布请求 */
export interface PublishContentRequest {
  force?: boolean;  // 是否强制发布 (跳过验证警告)
}

/** 发布响应 */
export interface PublishContentResponse {
  success: boolean;
  item_id: string;
  status: 'published';
  html_length: number;
  published_at: string;
  validation_warnings: string[];
}

/** 预览区块响应 */
export interface PreviewSectionResponse {
  section_index: number;
  block_type: BlockType;
  html: string;
}

// ============ WebSocket 事件类型 ============

/** 编辑器 WebSocket 事件 */
export type EditorWebSocketEvent =
  | EditorContentUpdateEvent
  | EditorPreviewRequestEvent
  | EditorPreviewUpdateEvent
  | EditorGenerationProgressEvent
  | EditorContentSavedEvent;

/** 内容更新事件 (客户端 → 服务器) */
export interface EditorContentUpdateEvent {
  type: 'editor.content_update';
  data: {
    item_id: string;
    update: {
      path: string;
      value: unknown;
    };
  };
}

/** 请求完整预览 (客户端 → 服务器) */
export interface EditorPreviewRequestEvent {
  type: 'editor.request_preview';
  data: {
    item_id: string;
  };
}

/** 预览更新事件 (服务器 → 客户端) */
export interface EditorPreviewUpdateEvent {
  type: 'editor.preview_update';
  data: {
    item_id: string;
    update_type: 'block' | 'full';
    block_index?: number;
    html_fragment?: string;
    full_html?: string;
  };
}

/** 生成进度事件 (服务器 → 客户端) */
export interface EditorGenerationProgressEvent {
  type: 'editor.generation_progress';
  data: {
    item_id: string;
    progress: number;
    current_section: string;
    message: string;
  };
}

/** 内容保存确认 (服务器 → 客户端) */
export interface EditorContentSavedEvent {
  type: 'editor.content_saved';
  data: {
    item_id: string;
    content_version: number;
  };
}

// ============ 编辑器状态 ============

/** 编辑器模式 */
export type EditorMode = 'view' | 'edit' | 'preview';

/** 设备预设 */
export interface DevicePreset {
  width: string;
  height: string;
  label: string;
}

/** 设备预设常量 */
export const DEVICE_PRESETS: Record<string, DevicePreset> = {
  desktop: { width: '100%', height: '100%', label: 'Desktop' },
  tablet: { width: '768px', height: '1024px', label: 'Tablet' },
  mobile: { width: '375px', height: '667px', label: 'Mobile' },
};

/** Block 操作类型 */
export type BlockAction =
  | 'select'
  | 'edit'
  | 'delete'
  | 'duplicate'
  | 'move_up'
  | 'move_down';

/** Block 配置映射 */
export interface BlockConfig {
  type: BlockType;
  label: string;
  icon: string;
  description: string;
  defaultData: Partial<ContentBlock>;
}

/** Block 类型配置 */
export const BLOCK_CONFIGS: BlockConfig[] = [
  {
    type: 'intro',
    label: 'Intro',
    icon: 'FileText',
    description: 'Introduction section with headline and content',
    defaultData: {
      headline: 'New Section',
      content: 'Enter your content here...',
    },
  },
  {
    type: 'product_card',
    label: 'Product Card',
    icon: 'Package',
    description: 'Product showcase with pros, cons, and rating',
    defaultData: {
      name: 'Product Name',
      description: 'Product description...',
      pros: [],
      cons: [],
      cta_url: '#',
    },
  },
  {
    type: 'step',
    label: 'Step',
    icon: 'ListOrdered',
    description: 'Tutorial step with instructions',
    defaultData: {
      step_number: 1,
      title: 'Step Title',
      instructions: 'Enter instructions...',
    },
  },
  {
    type: 'feature',
    label: 'Feature',
    icon: 'Zap',
    description: 'Feature highlight with icon',
    defaultData: {
      title: 'Feature Title',
      description: 'Feature description...',
    },
  },
  {
    type: 'text_section',
    label: 'Text Section',
    icon: 'AlignLeft',
    description: 'Rich text content section',
    defaultData: {
      content: 'Enter your text content here...',
    },
  },
  {
    type: 'quote',
    label: 'Quote',
    icon: 'Quote',
    description: 'Testimonial or quote',
    defaultData: {
      quote: 'Enter quote...',
    },
  },
  {
    type: 'call_to_action',
    label: 'Call to Action',
    icon: 'MousePointer',
    description: 'CTA button with headline',
    defaultData: {
      headline: 'Ready to get started?',
      button_text: 'Get Started',
      button_url: '#',
    },
  },
  {
    type: 'image',
    label: 'Image',
    icon: 'Image',
    description: 'Image with caption',
    defaultData: {
      url: '',
      alt: 'Image description',
    },
  },
  {
    type: 'hero',
    label: 'Hero',
    icon: 'Layout',
    description: 'Hero section with headline',
    defaultData: {
      headline: 'Hero Headline',
      subheadline: 'Subheadline text',
    },
  },
  {
    type: 'conclusion',
    label: 'Conclusion',
    icon: 'CheckCircle',
    description: 'Conclusion with summary',
    defaultData: {
      summary: 'Enter conclusion...',
    },
  },
];

