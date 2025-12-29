/**
 * Context Section 映射配置
 * 将 UI TreeItem 映射到 API section 和数据类型
 */

export type DataType = 'singleton' | 'items' | 'persons' | 'entities';
export type Category = 'onsite' | 'offsite';

export interface SectionConfig {
  section: string;
  category: Category;
  dataType: DataType;
  label: string;
}

/**
 * Section 映射表
 * key: UI TreeItem 的 label（用于匹配）
 */
export const SECTION_MAPPING: Record<string, SectionConfig> = {
  // ============ Onsite ============
  // Brand Assets
  'Meta Info': { section: 'brand_assets', category: 'onsite', dataType: 'singleton', label: 'Meta Info' },
  'Logo URL': { section: 'brand_assets', category: 'onsite', dataType: 'singleton', label: 'Logo URL' },
  'Colors': { section: 'brand_assets', category: 'onsite', dataType: 'singleton', label: 'Colors' },
  'Typography': { section: 'brand_assets', category: 'onsite', dataType: 'singleton', label: 'Typography' },
  'Tone': { section: 'brand_assets', category: 'onsite', dataType: 'singleton', label: 'Tone' },
  'Languages': { section: 'brand_assets', category: 'onsite', dataType: 'singleton', label: 'Languages' },
  'Brand Assets': { section: 'brand_assets', category: 'onsite', dataType: 'singleton', label: 'Brand Assets' },

  // Hero Section
  'Headline': { section: 'hero_headline', category: 'onsite', dataType: 'singleton', label: 'Headline' },
  'Subheadline': { section: 'hero_subheadline', category: 'onsite', dataType: 'singleton', label: 'Subheadline' },
  'Call to Action': { section: 'hero_ctas', category: 'onsite', dataType: 'items', label: 'Call to Action' },
  'Media': { section: 'hero_media', category: 'onsite', dataType: 'items', label: 'Media' },
  'Metrics': { section: 'hero_metrics', category: 'onsite', dataType: 'items', label: 'Metrics' },
  'Hero Section': { section: 'hero_headline', category: 'onsite', dataType: 'singleton', label: 'Hero Section' },

  // Pages
  'Core Pages': { section: 'core_pages', category: 'onsite', dataType: 'items', label: 'Core Pages' },
  'Product Pages': { section: 'product_pages', category: 'onsite', dataType: 'items', label: 'Product Pages' },
  'Resources': { section: 'resources', category: 'onsite', dataType: 'items', label: 'Resources' },
  'Legal & Updates': { section: 'core_pages', category: 'onsite', dataType: 'items', label: 'Legal & Updates' },
  'Key Website Pages': { section: 'core_pages', category: 'onsite', dataType: 'items', label: 'Key Website Pages' },
  'Key Pages': { section: 'core_pages', category: 'onsite', dataType: 'items', label: 'Key Pages' },
  'Landing Pages': { section: 'landing_pages', category: 'onsite', dataType: 'items', label: 'Landing Pages' },
  'Blog & Resources': { section: 'blog_posts', category: 'onsite', dataType: 'items', label: 'Blog & Resources' },
  'Blog Posts': { section: 'blog_posts', category: 'onsite', dataType: 'items', label: 'Blog Posts' },

  // Content
  'Problem Statement': { section: 'problem_statement', category: 'onsite', dataType: 'singleton', label: 'Problem Statement' },
  'Who We Serve': { section: 'who_we_serve', category: 'onsite', dataType: 'singleton', label: 'Who We Serve' },
  'Use Cases': { section: 'use_cases', category: 'onsite', dataType: 'items', label: 'Use Cases' },
  'Industries': { section: 'industries', category: 'onsite', dataType: 'items', label: 'Industries' },
  'Products & Services': { section: 'products_services', category: 'onsite', dataType: 'items', label: 'Products & Services' },

  // Social Proof
  'Testimonials': { section: 'testimonials', category: 'onsite', dataType: 'items', label: 'Testimonials' },
  'Case Studies': { section: 'case_studies', category: 'onsite', dataType: 'items', label: 'Case Studies' },
  'Badges': { section: 'trust_badges', category: 'onsite', dataType: 'items', label: 'Badges' },
  'Awards': { section: 'trust_badges', category: 'onsite', dataType: 'items', label: 'Awards' },
  'Guarantees': { section: 'trust_badges', category: 'onsite', dataType: 'items', label: 'Guarantees' },
  'Integrations': { section: 'trust_badges', category: 'onsite', dataType: 'items', label: 'Integrations' },
  'Social Proof & Trust': { section: 'testimonials', category: 'onsite', dataType: 'items', label: 'Social Proof & Trust' },

  // Team & About
  'Leadership Team': { section: 'leadership_team', category: 'onsite', dataType: 'persons', label: 'Leadership Team' },
  'Company Story': { section: 'about_us', category: 'onsite', dataType: 'singleton', label: 'Company Story' },
  'Mission & Vision': { section: 'about_us', category: 'onsite', dataType: 'singleton', label: 'Mission & Vision' },
  'Core Values': { section: 'about_us', category: 'onsite', dataType: 'singleton', label: 'Core Values' },
  'About Us': { section: 'about_us', category: 'onsite', dataType: 'singleton', label: 'About Us' },

  // FAQ & Contact
  'FAQ': { section: 'faqs', category: 'onsite', dataType: 'items', label: 'FAQ' },
  'Primary Contact': { section: 'contact_info', category: 'onsite', dataType: 'singleton', label: 'Primary Contact' },
  'Location & Hours': { section: 'contact_info', category: 'onsite', dataType: 'singleton', label: 'Location & Hours' },
  'Support Channels': { section: 'contact_info', category: 'onsite', dataType: 'singleton', label: 'Support Channels' },
  'Additional': { section: 'contact_info', category: 'onsite', dataType: 'singleton', label: 'Additional' },
  'Contact Information': { section: 'contact_info', category: 'onsite', dataType: 'singleton', label: 'Contact Information' },
  'Contact Info': { section: 'contact_info', category: 'onsite', dataType: 'singleton', label: 'Contact Info' },

  // ============ Offsite ============
  // Monitoring
  'Monitoring Scope': { section: 'monitoring_scope', category: 'offsite', dataType: 'singleton', label: 'Monitoring Scope' },
  
  // Social Profiles
  'Official Channels': { section: 'social_profiles', category: 'offsite', dataType: 'entities', label: 'Official Channels' },
  'Executive Accounts': { section: 'social_profiles', category: 'offsite', dataType: 'entities', label: 'Executive Accounts' },
  'Owned Presence': { section: 'social_profiles', category: 'offsite', dataType: 'entities', label: 'Owned Presence' },
  
  'Reviews': { section: 'review_platforms', category: 'offsite', dataType: 'entities', label: 'Reviews' },
  'Directories': { section: 'review_platforms', category: 'offsite', dataType: 'entities', label: 'Directories' },
  'Storefronts': { section: 'review_platforms', category: 'offsite', dataType: 'entities', label: 'Storefronts' },
  'Reviews & Listings': { section: 'review_platforms', category: 'offsite', dataType: 'entities', label: 'Reviews & Listings' },
  
  'Forums': { section: 'community_forums', category: 'offsite', dataType: 'entities', label: 'Forums' },
  'Q&A': { section: 'community_forums', category: 'offsite', dataType: 'entities', label: 'Q&A' },
  'Groups': { section: 'community_forums', category: 'offsite', dataType: 'entities', label: 'Groups' },
  'Community': { section: 'community_forums', category: 'offsite', dataType: 'entities', label: 'Community' },
  'Community Forums': { section: 'community_forums', category: 'offsite', dataType: 'entities', label: 'Community Forums' },
  
  'Channels': { section: 'media_outlets', category: 'offsite', dataType: 'entities', label: 'Channels' },
  'Coverage': { section: 'press_coverage', category: 'offsite', dataType: 'items', label: 'Coverage' },
  'Events': { section: 'press_coverage', category: 'offsite', dataType: 'items', label: 'Events' },
  'Press Coverage': { section: 'press_coverage', category: 'offsite', dataType: 'items', label: 'Press Coverage' },
  'Media Outlets': { section: 'media_outlets', category: 'offsite', dataType: 'entities', label: 'Media Outlets' },
  'Target Keywords': { section: 'target_keywords', category: 'offsite', dataType: 'items', label: 'Target Keywords' },
  
  'Creators': { section: 'kols', category: 'offsite', dataType: 'persons', label: 'Creators' },
  'Experts': { section: 'kols', category: 'offsite', dataType: 'persons', label: 'Experts' },
  'Press': { section: 'kols', category: 'offsite', dataType: 'persons', label: 'Press' },
  'KOLs': { section: 'kols', category: 'offsite', dataType: 'persons', label: 'KOLs' },
};

/**
 * 根据 label 获取 section 配置
 */
export function getSectionConfig(label: string): SectionConfig | null {
  return SECTION_MAPPING[label] || null;
}

/**
 * 获取所有 section 配置
 */
export function getAllSectionConfigs(): SectionConfig[] {
  return Object.values(SECTION_MAPPING);
}


