/**
 * Skill Form Fields Configuration
 * Defines form fields for each skill based on their agentName or skill_id
 */

export type FormFieldType = 'text' | 'textarea' | 'url' | 'urls' | 'select';

export interface SelectOption {
  label: string;
  value: string;
}

export interface FormField {
  key: string;
  label: string;
  type: FormFieldType;
  placeholder: string;
  required: boolean;
  autoFill?: 'domain' | 'competitorDomains' | 'niche'; // Which field to auto-fill from project/context
  helpText?: string;
  options?: SelectOption[]; // For select type fields
  defaultValue?: string; // Default value for select fields
}

export interface SkillFormConfig {
  fields: FormField[];
}

/**
 * Map of skill identifiers to their form configurations
 * Uses agentName or skill_id to match skills
 */
export const skillFormConfigs: Record<string, SkillFormConfig> = {
  // Keyword Research
  'keyword-research': {
    fields: [
      {
        key: 'targetUrl',
        label: 'Target Website URL',
        type: 'url',
        placeholder: 'e.g., example.com',
        required: true,
        autoFill: 'domain',
        helpText: 'The website you want to analyze for keyword opportunities',
      },
      {
        key: 'focusTopic',
        label: 'Focus Topic / Keywords (Optional)',
        type: 'text',
        placeholder: 'e.g., project management software, sustainable fashion',
        required: false,
      },
      {
        key: 'competitorUrls',
        label: 'Known Competitor URLs (Optional, Comma-separated)',
        type: 'urls',
        placeholder: 'e.g., competitor1.com, competitor2.com',
        required: false,
        autoFill: 'competitorDomains',
      },
    ],
  },
  
  // SERP Analysis
  'serp-analysis': {
    fields: [
      {
        key: 'targetKeyword',
        label: 'Target Keyword',
        type: 'text',
        placeholder: 'e.g. best running shoes',
        required: true,
        helpText: 'e.g. best running shoes',
      },
      {
        key: 'resultsToAnalyze',
        label: 'Results to Analyze',
        type: 'select',
        placeholder: 'Select number of results',
        required: true,
        defaultValue: 'top-3',
        options: [
          { label: 'Top 3 (Fast)', value: 'top-3' },
          { label: 'Top 5', value: 'top-5' },
          { label: 'Top 10', value: 'top-10' },
        ],
        helpText: 'Default: Top 3 (Fast)',
      },
    ],
  },
  
  // SERP Analyst (alternative name)
  'serp-analyst': {
    fields: [
      {
        key: 'targetKeyword',
        label: 'Target Keyword',
        type: 'text',
        placeholder: 'e.g. best running shoes',
        required: true,
        helpText: 'e.g. best running shoes',
      },
      {
        key: 'resultsToAnalyze',
        label: 'Results to Analyze',
        type: 'select',
        placeholder: 'Select number of results',
        required: true,
        defaultValue: 'top-3',
        options: [
          { label: 'Top 3 (Fast)', value: 'top-3' },
          { label: 'Top 5', value: 'top-5' },
          { label: 'Top 10', value: 'top-10' },
        ],
        helpText: 'Default: Top 3 (Fast)',
      },
    ],
  },
  
  // Competitor Analysis
  'competitor-analysis': {
    fields: [
      {
        key: 'productName',
        label: 'Your Product Name',
        type: 'text',
        placeholder: 'e.g., Your Company Name',
        required: true,
        helpText: 'e.g., Your Company Name',
      },
      {
        key: 'websiteUrl',
        label: 'Your Website URL',
        type: 'url',
        placeholder: 'https://example.com',
        required: true,
        autoFill: 'domain',
      },
      {
        key: 'productDescription',
        label: 'Product Description (Optional)',
        type: 'textarea',
        placeholder: 'Brief description of what your product or service does...',
        required: false,
        helpText: 'Brief description of what your product or service does...',
      },
      {
        key: 'knownCompetitors',
        label: 'Known Competitors (Optional)',
        type: 'text',
        placeholder: 'Competitor A, Competitor B, Competitor C',
        required: false,
        helpText: 'Competitor A, Competitor B, Competitor C',
      },
      {
        key: 'competitorUrls',
        label: 'Competitor URLs (Optional)',
        type: 'urls',
        placeholder: 'https://competitor1.com, https://competitor2.com',
        required: false,
        autoFill: 'competitorDomains',
      },
    ],
  },
  
  // Competitor Analyst (alternative name)
  'competitor-analyst': {
    fields: [
      {
        key: 'productName',
        label: 'Your Product Name',
        type: 'text',
        placeholder: 'e.g., Your Company Name',
        required: true,
        helpText: 'e.g., Your Company Name',
      },
      {
        key: 'websiteUrl',
        label: 'Your Website URL',
        type: 'url',
        placeholder: 'https://example.com',
        required: true,
        autoFill: 'domain',
      },
      {
        key: 'productDescription',
        label: 'Product Description (Optional)',
        type: 'textarea',
        placeholder: 'Brief description of what your product or service does...',
        required: false,
        helpText: 'Brief description of what your product or service does...',
      },
      {
        key: 'knownCompetitors',
        label: 'Known Competitors (Optional)',
        type: 'text',
        placeholder: 'Competitor A, Competitor B, Competitor C',
        required: false,
        helpText: 'Competitor A, Competitor B, Competitor C',
      },
      {
        key: 'competitorUrls',
        label: 'Competitor URLs (Optional)',
        type: 'urls',
        placeholder: 'https://competitor1.com, https://competitor2.com',
        required: false,
        autoFill: 'competitorDomains',
      },
    ],
  },
  
  // Content Gap Analysis
  'content-gap-analysis': {
    fields: [
      {
        key: 'targetUrl',
        label: 'Your Website URL',
        type: 'url',
        placeholder: 'e.g., example.com',
        required: true,
        autoFill: 'domain',
      },
      {
        key: 'specificCompetitors',
        label: 'Specific Competitors (Optional)',
        type: 'text',
        placeholder: 'Leave blank to let AI discover them automatically',
        required: false,
        helpText: 'Leave blank to let AI discover them automatically',
        autoFill: 'competitorDomains',
      },
      {
        key: 'targetMarket',
        label: 'Target Market',
        type: 'select',
        placeholder: 'Select target market',
        required: true,
        defaultValue: 'us',
        options: [
          { label: 'United States (US)', value: 'us' },
          { label: 'United Kingdom (UK)', value: 'uk' },
          { label: 'Canada', value: 'ca' },
          { label: 'Australia', value: 'au' },
          { label: 'Germany', value: 'de' },
          { label: 'France', value: 'fr' },
          { label: 'Global', value: 'global' },
        ],
        helpText: 'Default: United States (US)',
      },
    ],
  },
  
  // Gap Analyst / Gap Analysis (alternative names)
  'gap-analyst': {
    fields: [
      {
        key: 'targetUrl',
        label: 'Target Website URL',
        type: 'url',
        placeholder: 'e.g., example.com',
        required: true,
        autoFill: 'domain',
      },
      {
        key: 'competitorUrls',
        label: 'Competitor URLs (Optional, Comma-separated)',
        type: 'urls',
        placeholder: 'e.g., competitor1.com, competitor2.com',
        required: false,
        autoFill: 'competitorDomains',
      },
      {
        key: 'niche',
        label: 'Niche / Industry Focus (Optional)',
        type: 'text',
        placeholder: 'e.g., SaaS, E-commerce, Healthcare',
        required: false,
        autoFill: 'niche',
      },
    ],
  },
  
  'gap-analysis': {
    fields: [
      {
        key: 'targetUrl',
        label: 'Your Website URL',
        type: 'url',
        placeholder: 'e.g., example.com',
        required: true,
        autoFill: 'domain',
      },
      {
        key: 'specificCompetitors',
        label: 'Specific Competitors (Optional)',
        type: 'text',
        placeholder: 'Leave blank to let AI discover them automatically',
        required: false,
        helpText: 'Leave blank to let AI discover them automatically',
        autoFill: 'competitorDomains',
      },
      {
        key: 'targetMarket',
        label: 'Target Market',
        type: 'select',
        placeholder: 'Select target market',
        required: true,
        defaultValue: 'us',
        options: [
          { label: 'United States (US)', value: 'us' },
          { label: 'United Kingdom (UK)', value: 'uk' },
          { label: 'Canada', value: 'ca' },
          { label: 'Australia', value: 'au' },
          { label: 'Germany', value: 'de' },
          { label: 'France', value: 'fr' },
          { label: 'Global', value: 'global' },
        ],
        helpText: 'Default: United States (US)',
      },
    ],
  },

  // Topic Brainstorm
  'topic-brainstorm': {
    fields: [
      {
        key: 'siteGoals',
        label: 'Site Goals / Target Audience',
        type: 'textarea',
        placeholder: 'e.g. Selling SaaS for SEO agencies or Growing a travel blog',
        required: true,
        helpText: 'e.g. Selling SaaS for SEO agencies or Growing a travel blog',
      },
      {
        key: 'seedTopics',
        label: 'Seed Topics or Keywords (Optional)',
        type: 'text',
        placeholder: 'e.g. "AI productivity", "Local SEO". Leave blank if you want AI to suggest everything.',
        required: false,
        helpText: 'e.g. "AI productivity", "Local SEO". Leave blank if you want AI to suggest everything.',
      },
    ],
  },

  // Page Planner
  'page-planner': {
    fields: [
      {
        key: 'clusterTopic',
        label: 'Cluster Topic / Theme',
        type: 'text',
        placeholder: 'e.g. "AI Humanizer Tools" or "Remote Work Security"',
        required: true,
        helpText: 'e.g. "AI Humanizer Tools" or "Remote Work Security"',
      },
      {
        key: 'siteContext',
        label: 'Site Context / Goal (Optional)',
        type: 'text',
        placeholder: 'e.g. Selling a B2B SaaS or Growing an affiliate site',
        required: false,
        helpText: 'e.g. Selling a B2B SaaS or Growing an affiliate site',
      },
    ],
  },

  // SEO Blog Writer - No specific input required
  'seo-blog-writer': {
    fields: [],
  },

  // Landing Page Writer - No specific input required
  'landing-page-writer': {
    fields: [],
  },

  // Comparison Writer - No specific input required
  'comparison-writer': {
    fields: [],
  },

  // Guide Writer - No specific input required
  'guide-writer': {
    fields: [],
  },

  // Listicle Writer - No specific input required
  'listicle-writer': {
    fields: [],
  },

  // Internal Linking Optimizer
  'link-optimizer': {
    fields: [
      {
        key: 'pageToOptimize',
        label: 'PAGE TO OPTIMIZE (URL)',
        type: 'url',
        placeholder: 'e.g., https://example.com/blog/my-post',
        required: true,
        autoFill: 'domain',
      },
      {
        key: 'siteHomepage',
        label: 'SITE HOMEPAGE (FOR SITEMAP)',
        type: 'url',
        placeholder: 'e.g., https://example.com',
        required: true,
        autoFill: 'domain',
      },
    ],
  },

  // Meta Tags Optimizer
  'meta-tags': {
    fields: [
      {
        key: 'pageUrl',
        label: 'PAGE URL',
        type: 'url',
        placeholder: 'https://example.com/page-to-optimize',
        required: true,
        autoFill: 'domain',
      },
      {
        key: 'targetKeyword',
        label: 'Target Keyword (Optional)',
        type: 'text',
        placeholder: 'e.g., ai seo agent',
        required: false,
        helpText: 'e.g., ai seo agent',
      },
    ],
  },

  // Schema Markup Generator
  'schema-generator': {
    fields: [
      {
        key: 'pageUrl',
        label: 'PAGE URL',
        type: 'url',
        placeholder: 'https://example.com/page-to-audit',
        required: true,
        autoFill: 'domain',
      },
      {
        key: 'targetKeyword',
        label: 'Target Keyword (Optional)',
        type: 'text',
        placeholder: 'e.g., how to fix leaky faucet',
        required: false,
        helpText: 'e.g., how to fix leaky faucet',
      },
    ],
  },

  // GEO Content Optimizer - No specific input required
  'geo-content-optimizer': {
    fields: [],
  },

  // GEO Auditor
  'geo-auditor': {
    fields: [
      {
        key: 'pageUrl',
        label: 'PAGE URL',
        type: 'url',
        placeholder: 'https://example.com/page-to-audit',
        required: true,
        autoFill: 'domain',
      },
    ],
  },

  // Technical SEO Checker
  'technical-seo': {
    fields: [
      {
        key: 'targetUrl',
        label: 'TARGET URL',
        type: 'url',
        placeholder: 'https://example.com/page-to-check',
        required: true,
        autoFill: 'domain',
      },
    ],
  },

  // SEO Auditor
  'seo-auditor': {
    fields: [
      {
        key: 'pageUrl',
        label: 'PAGE URL',
        type: 'url',
        placeholder: 'https://example.com/page-to-audit',
        required: true,
        autoFill: 'domain',
      },
    ],
  },

  // Backlink Analyzer
  'backlink-monitor': {
    fields: [
      {
        key: 'domainOrUrl',
        label: 'DOMAIN OR URL',
        type: 'url',
        placeholder: 'e.g., example.com',
        required: true,
        autoFill: 'domain',
      },
    ],
  },

  // Alert Manager
  'alert-manager': {
    fields: [
      {
        key: 'siteUrl',
        label: 'SITE URL',
        type: 'url',
        placeholder: 'sc-domain:example.com',
        required: true,
        autoFill: 'domain',
      },
      {
        key: 'specificUrls',
        label: 'Specific URLs to Check Indexing (Optional)',
        type: 'urls',
        placeholder: 'e.g., https://example.com/page-1, https://example.com/page-2',
        required: false,
        helpText: 'e.g., https://example.com/page-1, https://example.com/page-2',
      },
    ],
  },

  // Performance Reporter
  'performance-monitor': {
    fields: [
      {
        key: 'siteUrl',
        label: 'SITE URL',
        type: 'url',
        placeholder: 'sc-domain:example.com',
        required: true,
        autoFill: 'domain',
      },
      {
        key: 'reportPeriod',
        label: 'REPORT PERIOD',
        type: 'select',
        placeholder: 'Select report period',
        required: true,
        defaultValue: 'last-28-days',
        options: [
          { label: 'Last 7 Days', value: 'last-7-days' },
          { label: 'Last 28 Days', value: 'last-28-days' },
          { label: 'Last 90 Days', value: 'last-90-days' },
          { label: 'Last 12 Months', value: 'last-12-months' },
        ],
        helpText: 'Default: Last 28 Days',
      },
    ],
  },

  // Rank Tracker
  'rank-tracker': {
    fields: [
      {
        key: 'siteUrl',
        label: 'SITE URL',
        type: 'url',
        placeholder: 'sc-domain.example.com',
        required: true,
        autoFill: 'domain',
      },
      {
        key: 'targetKeywords',
        label: 'Target Keywords (Optional)',
        type: 'text',
        placeholder: 'e.g., your product, your service',
        required: false,
        helpText: 'e.g., your product, your service',
      },
    ],
  },
};

/**
 * Default form configuration for skills without specific configuration
 * Provides a common set of fields that most research skills need
 */
const defaultFormConfig: SkillFormConfig = {
  fields: [
    {
      key: 'targetUrl',
      label: 'Target Website URL',
      type: 'url',
      placeholder: 'e.g., example.com',
      required: true,
      autoFill: 'domain',
      helpText: 'The website you want to analyze',
    },
    {
      key: 'competitorUrls',
      label: 'Competitor URLs (Optional, Comma-separated)',
      type: 'urls',
      placeholder: 'e.g., competitor1.com, competitor2.com',
      required: false,
      autoFill: 'competitorDomains',
    },
    {
      key: 'additionalContext',
      label: 'Additional Context (Optional)',
      type: 'text',
      placeholder: 'e.g., specific focus areas, industry, or requirements',
      required: false,
    },
  ],
};

/**
 * Get form configuration for a skill by its agentName, skill_id, title, or tags
 * Returns default config if no specific config is found
 */
export function getSkillFormConfig(
  agentName: string, 
  skillId?: string, 
  title?: string, 
  tags?: string[]
): SkillFormConfig {
  // Normalize the name for matching
  const normalize = (str: string) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  
  // Try to match by skill_id first (if provided)
  if (skillId) {
    const normalizedId = normalize(skillId);
    if (skillFormConfigs[normalizedId]) {
      return skillFormConfigs[normalizedId];
    }
  }
  
  // Try to match by agentName (normalized to lowercase with hyphens)
  const normalizedName = normalize(agentName);
  if (skillFormConfigs[normalizedName]) {
    return skillFormConfigs[normalizedName];
  }
  
  // Try to match by title if provided
  if (title) {
    const normalizedTitle = normalize(title);
    if (skillFormConfigs[normalizedTitle]) {
      return skillFormConfigs[normalizedTitle];
    }
  }
  
  // Try to match by tags if provided
  if (tags && tags.length > 0) {
    for (const tag of tags) {
      const normalizedTag = normalize(tag.replace(/^#+/, '')); // Remove leading # symbols
      if (skillFormConfigs[normalizedTag]) {
        return skillFormConfigs[normalizedTag];
      }
    }
  }
  
  // Try partial matching for common patterns
  // Check if any key is contained in the normalized name or vice versa
  for (const [key, config] of Object.entries(skillFormConfigs)) {
    // Check if key words match (e.g., "keyword" and "research" in "keyword-research")
    const keyWords = key.split('-');
    const nameWords = normalizedName.split('-');
    
    // If all key words are found in the name, it's a match
    const allWordsMatch = keyWords.every(kw => 
      nameWords.some(nw => nw.includes(kw) || kw.includes(nw))
    );
    
    if (allWordsMatch || normalizedName.includes(key) || key.includes(normalizedName)) {
      return config;
    }
  }
  
  // Also check title if provided
  if (title) {
    const normalizedTitle = normalize(title);
    for (const [key, config] of Object.entries(skillFormConfigs)) {
      if (normalizedTitle.includes(key) || key.includes(normalizedTitle)) {
        return config;
      }
    }
  }
  
  // Enhanced keyword matching - check for key terms in name/title
  const searchText = `${normalizedName} ${title ? normalize(title) : ''}`.toLowerCase();
  
  // Special case: if name contains "gap" and "analysis" (or "analyst"), match to gap-analysis config
  if (searchText.includes('gap')) {
    if (searchText.includes('analysis') || searchText.includes('analyst') || searchText.includes('content')) {
      return skillFormConfigs['gap-analysis'] || skillFormConfigs['content-gap-analysis'] || skillFormConfigs['gap-analyst'];
    }
  }
  
  // Special case: if name contains "keyword" and "research", match to keyword-research
  if (searchText.includes('keyword') && searchText.includes('research')) {
    return skillFormConfigs['keyword-research'];
  }
  
  // Special case: if name contains "serp" and "analysis" or "analyst", match to serp-analysis
  if (searchText.includes('serp')) {
    if (searchText.includes('analysis') || searchText.includes('analyst')) {
      return skillFormConfigs['serp-analysis'] || skillFormConfigs['serp-analyst'];
    }
  }
  
  // Special case: if name contains "competitor" and "analysis" or "analyst", match to competitor-analysis
  if (searchText.includes('competitor')) {
    if (searchText.includes('analysis') || searchText.includes('analyst')) {
      return skillFormConfigs['competitor-analysis'] || skillFormConfigs['competitor-analyst'];
    }
  }
  
  // Special case: if name contains "content" and "gap", match to content-gap-analysis
  if (searchText.includes('content') && searchText.includes('gap')) {
    return skillFormConfigs['content-gap-analysis'] || skillFormConfigs['gap-analysis'];
  }
  
  // Special case: if name contains "topic" and "brainstorm", match to topic-brainstorm
  if (searchText.includes('topic') && searchText.includes('brainstorm')) {
    return skillFormConfigs['topic-brainstorm'];
  }
  
  // Special case: if name contains "page" and "planner", match to page-planner
  if (searchText.includes('page') && searchText.includes('planner')) {
    return skillFormConfigs['page-planner'];
  }
  
  // Special case: if name contains "seo" and "blog" and "writer", match to seo-blog-writer
  if (searchText.includes('seo') && searchText.includes('blog') && searchText.includes('writer')) {
    return skillFormConfigs['seo-blog-writer'];
  }
  
  // Special case: if name contains "landing" and "page" and "writer", match to landing-page-writer
  if (searchText.includes('landing') && searchText.includes('page') && searchText.includes('writer')) {
    return skillFormConfigs['landing-page-writer'];
  }
  
  // Special case: if name contains "comparison" and "writer", match to comparison-writer
  if (searchText.includes('comparison') && searchText.includes('writer')) {
    return skillFormConfigs['comparison-writer'];
  }
  
  // Special case: if name contains "guide" and "writer", match to guide-writer
  if (searchText.includes('guide') && searchText.includes('writer')) {
    return skillFormConfigs['guide-writer'];
  }
  
  // Special case: if name contains "listicle" and "writer", match to listicle-writer
  if (searchText.includes('listicle') && searchText.includes('writer')) {
    return skillFormConfigs['listicle-writer'];
  }
  
  // Special case: if name contains "internal" and "linking", match to internal-linking-optimizer
  if (searchText.includes('internal') && searchText.includes('linking')) {
    return skillFormConfigs['internal-linking-optimizer'];
  }
  
  // Special case: if name contains "meta" and "tags", match to meta-tags-optimizer
  if (searchText.includes('meta') && searchText.includes('tags')) {
    return skillFormConfigs['meta-tags-optimizer'];
  }
  
  // Special case: if name contains "schema" and "markup", match to schema-markup-generator
  if (searchText.includes('schema') && searchText.includes('markup')) {
    return skillFormConfigs['schema-markup-generator'];
  }
  
  // Special case: if name contains "geo" and "content", match to geo-content-optimizer
  if (searchText.includes('geo') && searchText.includes('content')) {
    return skillFormConfigs['geo-content-optimizer'];
  }
  
  // Special case: if name contains "geo" and "auditor", match to geo-auditor
  if (searchText.includes('geo') && searchText.includes('auditor')) {
    return skillFormConfigs['geo-auditor'];
  }
  
  // Special case: if name contains "technical" and "seo", match to technical-seo-checker
  if (searchText.includes('technical') && searchText.includes('seo')) {
    return skillFormConfigs['technical-seo-checker'];
  }
  
  // Special case: if name contains "seo" and "auditor" (but not "geo"), match to seo-auditor
  if (searchText.includes('seo') && searchText.includes('auditor') && !searchText.includes('geo')) {
    return skillFormConfigs['seo-auditor'];
  }
  
  // Special case: if name contains "backlink" and "analyzer", match to backlink-analyzer
  if (searchText.includes('backlink') && searchText.includes('analyzer')) {
    return skillFormConfigs['backlink-analyzer'];
  }
  
  // Special case: if name contains "alert" and "manager", match to alert-manager
  if (searchText.includes('alert') && searchText.includes('manager')) {
    return skillFormConfigs['alert-manager'];
  }
  
  // Special case: if name contains "performance" and "reporter", match to performance-reporter
  if (searchText.includes('performance') && searchText.includes('reporter')) {
    return skillFormConfigs['performance-reporter'];
  }
  
  // Special case: if name contains "rank" and "tracker", match to rank-tracker
  if (searchText.includes('rank') && searchText.includes('tracker')) {
    return skillFormConfigs['rank-tracker'];
  }
  
  // Return default config for skills without specific configuration
  // This ensures all skills will have at least a basic form
  return defaultFormConfig;
}

