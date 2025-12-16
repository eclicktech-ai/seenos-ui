export type PlaybookCategory = 'research' | 'build' | 'optimize' | 'monitor';

export interface PlaybookOption {
  label: string;
  value: string;
  defaultPrompt: string;
}

export interface Playbook {
  id: string;
  title: string;
  description: string;
  category: PlaybookCategory;
  agentName: string;
  autoActions: string[];
  outputs: string[];
  complexity: 'easy' | 'medium' | 'hard';
  tags: string[];
  options?: PlaybookOption[];
}

export const playbooks: Playbook[] = [
  // --- Research Category (13) ---
  {
    id: 'cross-model-benchmark',
    title: 'AI Visibility Benchmark',
    description: 'Compare how your brand appears across major AI models (GPT-4, Claude, Gemini). It analyzes visibility, sentiment, and citation frequency to see where you stand.',
    category: 'research',
    agentName: 'Cross-Model Benchmark Agent',
    autoActions: [
      'Query multiple LLM APIs (GPT-4, Claude, Gemini)',
      'Analyze sentiment and brand mentions',
      'Compare response quality and citations'
    ],
    outputs: ['Cross-Model Comparison Report', 'Sentiment Analysis', 'Brand Mention Stats'],
    complexity: 'easy',
    tags: ['benchmark', 'llm', 'analysis'],
    options: [
      { label: 'Standard Brand Audit', value: 'standard', defaultPrompt: 'Conduct a standard brand visibility audit across major LLMs for [Brand Name].' },
      { label: 'Competitor Comparison', value: 'competitor', defaultPrompt: 'Compare brand visibility and sentiment between [Brand Name] and its top 3 competitors.' },
      { label: 'Crisis Management Check', value: 'crisis', defaultPrompt: 'Check for any negative sentiment or crisis-related keywords associated with [Brand Name] on AI models.' }
    ]
  },
  {
    id: 'negative-hallucination-risk',
    title: 'Brand Reputation Protector',
    description: 'Protect your brand by scanning for fake news, hallucinations, or negative associations in AI responses using specific risk keywords.',
    category: 'research',
    agentName: 'Risk Scanning Agent',
    autoActions: [
      'Periodic scanning with negative keywords',
      'Detect hallucinated content',
      'Trigger alerts for risks'
    ],
    outputs: ['Risk Alert Report', 'Hallucination Logs'],
    complexity: 'medium',
    tags: ['risk', 'security', 'monitoring'],
    options: [
      { label: 'General Risk Scan', value: 'general', defaultPrompt: 'Scan for general negative associations and hallucinations related to [Brand Name].' },
      { label: 'Fake Feature Detection', value: 'fake_features', defaultPrompt: 'Check if AI models are attributing fake features or pricing to [Brand Name].' },
      { label: 'Scam/Fraud Association', value: 'scam', defaultPrompt: 'Ensure [Brand Name] is not being associated with scams or fraudulent activities in AI outputs.' }
    ]
  },
  {
    id: 'zero-result-mining',
    title: 'Unanswered Query Finder',
    description: 'Identify questions that potential customers are asking but AI models (and competitors) are failing to answer correctly.',
    category: 'research',
    agentName: 'Opportunity Mining Agent',
    autoActions: [
      'Analyze SEO keywords vs AI responses',
      'Identify low-quality AI answers',
      'Generate opportunity list'
    ],
    outputs: ['GEO Opportunity List', 'Content Gap Analysis'],
    complexity: 'medium',
    tags: ['seo', 'geo', 'mining'],
    options: [
      { label: 'Broad Topic Discovery', value: 'broad', defaultPrompt: 'Find unanswered questions related to [Industry/Topic] in general.' },
      { label: 'Specific Product Gaps', value: 'product', defaultPrompt: 'Identify gaps in AI knowledge specifically about [Product Category] user questions.' }
    ]
  },
  {
    id: 'competitor-citation-reverse',
    title: 'Competitor Source Analyzer',
    description: 'Discover where your competitors are getting their authority. This agent maps out the blogs, PDFs, and docs that AI models cite when talking about them.',
    category: 'research',
    agentName: 'Competitor Analysis Agent',
    autoActions: [
      'Extract competitor citations',
      'Classify source types (Blog, PDF, etc.)',
      'Map competitor strategy'
    ],
    outputs: ['Competitor Strategy Radar', 'Citation Source List'],
    complexity: 'medium',
    tags: ['competitor', 'reverse-engineering'],
    options: [
      { label: 'Top Competitor Deep Dive', value: 'deep_dive', defaultPrompt: 'Deeply analyze citation sources for [Competitor Name].' },
      { label: 'Industry Wide Scan', value: 'industry', defaultPrompt: 'Scan the top 5 competitors in [Industry] to find common high-authority citation sources.' }
    ]
  },
  {
    id: 'persona-role-play',
    title: 'Audience Persona Simulator',
    description: 'Test how AI explains your brand to different people. See how the explanation changes for a CTO versus a beginner, and find gaps in your messaging.',
    category: 'research',
    agentName: 'Persona Testing Agent',
    autoActions: [
      'Simulate multiple personas (CTO, Newbie, etc.)',
      'Compare answer depth and tone',
      'Analyze recommendation bias'
    ],
    outputs: ['Persona Variance Report', 'Content Strategy Recommendations'],
    complexity: 'easy',
    tags: ['persona', 'testing', 'simulation'],
    options: [
      { label: 'B2B Decision Makers', value: 'b2b', defaultPrompt: 'Simulate CTO, CFO, and Procurement Manager personas asking about [Brand Name].' },
      { label: 'Consumer & Beginner', value: 'b2c', defaultPrompt: 'Simulate a total beginner and an advanced hobbyist asking about [Brand Name].' }
    ]
  },
  {
    id: 'user-prompt-intent',
    title: 'User Intent Analyzer',
    description: 'Go beyond keywords. Group real user questions to understand the underlying problems they are trying to solve, helping you write more relevant content.',
    category: 'research',
    agentName: 'Intent Clustering Agent',
    autoActions: [
      'Embed user prompts',
      'Cluster similar intents',
      'Identify common query patterns'
    ],
    outputs: ['Prompt Pattern Genealogy', 'Typical Query List'],
    complexity: 'medium',
    tags: ['intent', 'clustering', 'data-analysis'],
    options: [
      { label: 'General Intent Clustering', value: 'general', defaultPrompt: 'Cluster the provided list of user queries to find main intent groups.' },
      { label: 'Purchase Intent Focus', value: 'purchase', defaultPrompt: 'Identify queries that indicate a high intent to purchase or convert.' }
    ]
  },
  {
    id: 'competitor-geo-monitor',
    title: 'Competitor Activity Tracker',
    description: 'Keep a close eye on competitors. Get alerts when they update their wikis, add new technical docs, or change their site structure.',
    category: 'research',
    agentName: 'Competitor Monitor Agent',
    autoActions: [
      'Monitor competitor site changes',
      'Detect Schema/Wiki updates',
      'Timeline generation'
    ],
    outputs: ['Competitor Update Timeline', 'GEO Activity Alert'],
    complexity: 'medium',
    tags: ['competitor', 'monitoring'],
    options: [
      { label: 'Weekly Change Report', value: 'weekly', defaultPrompt: 'Summarize competitor site changes over the last week.' },
      { label: 'Schema & Tech Updates', value: 'technical', defaultPrompt: 'Focus specifically on technical SEO and Schema markup changes by competitors.' }
    ]
  },
  {
    id: 'semantic-gap-analysis',
    title: 'Content Gap Detector',
    description: 'Find the "missing pieces" in your content strategy. It compares user questions against your existing articles to see what you haven\'t covered yet.',
    category: 'research',
    agentName: 'Semantic Gap Analysis Agent',
    autoActions: [
      'Compare user query vectors with content',
      'Identify uncovered semantic areas',
      'Score gaps by commercial value'
    ],
    outputs: ['Content Gap Report', 'High-Value Topic List'],
    complexity: 'hard',
    tags: ['semantics', 'gap-analysis', 'content-strategy'],
    options: [
      { label: 'Standard Gap Analysis', value: 'standard', defaultPrompt: 'Analyze content gaps between user queries and [Your Domain].' }
    ]
  },
  {
    id: 'industry-authority-graph',
    title: 'Industry Influencer Mapper',
    description: 'Build a map of the most trusted voices in your field. Identify the domains and authors that AI models treat as the "ground truth" for your industry.',
    category: 'research',
    agentName: 'Industry Authority Graph Agent',
    autoActions: [
      'Scan AI answers and citations',
      'Map authoritative domains/authors',
      'Prioritize outreach targets'
    ],
    outputs: ['Authority Network Graph', 'PR/BD Target List'],
    complexity: 'medium',
    tags: ['graph', 'authority', 'pr'],
    options: [
      { label: 'Domain Authority Map', value: 'domain', defaultPrompt: 'Map out the top authoritative domains in the [Industry] space.' }
    ]
  },
  {
    id: 'serp-sge-trigger',
    title: 'AI Overview Trigger Hunter',
    description: 'Identify which keywords trigger AI summaries (SGE) in search results, helping you target the most high-impact search terms.',
    category: 'research',
    agentName: 'SERP & SGE Trigger Agent',
    autoActions: [
      'Batch query keywords',
      'Analyze SERP/SGE structure',
      'Identify AI Overview triggers'
    ],
    outputs: ['SGE Trigger Keyword List', 'SERP Feature Analysis'],
    complexity: 'medium',
    tags: ['seo', 'sge', 'serp'],
    options: [
      { label: 'SGE Trigger Check', value: 'check', defaultPrompt: 'Check which of these keywords trigger an SGE snapshot.' }
    ]
  },
  {
    id: 'multi-language-audit',
    title: 'Global Brand Audit',
    description: 'Check your global presence. See how your brand is represented by AI models across different languages (e.g., English, Chinese, Japanese).',
    category: 'research',
    agentName: 'Multi-language Audit Agent',
    autoActions: [
      'Test queries in multiple languages',
      'Compare cross-lingual model performance',
      'Map regional brand visibility'
    ],
    outputs: ['Regional GEO Discrepancy Map', 'Localization Quality Report'],
    complexity: 'medium',
    tags: ['localization', 'global', 'audit'],
    options: [
      { label: 'EN/CN/JP Audit', value: 'standard', defaultPrompt: 'Audit brand presence in English, Chinese, and Japanese.' }
    ]
  },
  {
    id: 'community-sentiment',
    title: 'Community Pulse Tracker',
    description: 'Listen to the real conversations. Analyze discussions on Reddit, Quora, and forums to understand what real users are saying about your topic.',
    category: 'research',
    agentName: 'Community Sentiment Agent',
    autoActions: [
      'Scrape top threads from forums',
      'Extract topics and opinions',
      'Analyze AI training alignment'
    ],
    outputs: ['Community Trend Report', 'AI Learning Analysis'],
    complexity: 'medium',
    tags: ['community', 'sentiment', 'social-listening'],
    options: [
      { label: 'Reddit & Quora Scan', value: 'standard', defaultPrompt: 'Analyze sentiment on Reddit and Quora regarding [Topic].' }
    ]
  },
  {
    id: 'outdated-data-check',
    title: 'Information Freshness Check',
    description: 'Ensure AI models aren\'t using old data. Check if they have the current prices, version numbers, and specs for your products.',
    category: 'research',
    agentName: 'Outdated Data Check Agent',
    autoActions: [
      'Query time-sensitive data (prices, versions)',
      'Compare AI answers with real-time data',
      'Measure model lag'
    ],
    outputs: ['Model Lag Report', 'Data Freshness Scorecard'],
    complexity: 'easy',
    tags: ['data-integrity', 'monitoring', 'freshness'],
    options: [
      { label: 'Pricing & Version Check', value: 'standard', defaultPrompt: 'Check if AI models have the latest pricing and version info for [Product].' }
    ]
  },


  // --- Build Category (9) ---
  {
    id: 'direct-answer-generator',
    title: 'Instant Answer Generator',
    description: 'Create concise "Direct Answer" blocks from your content. These short summaries are perfect for AI models to quote directly.',
    category: 'build',
    agentName: 'Direct Answer Agent',
    autoActions: [
      'Extract core answers from long text',
      'Generate TL;DR blocks',
      'Format for GEO standards'
    ],
    outputs: ['Direct Answer Blocks', 'HTML Snippets'],
    complexity: 'easy',
    tags: ['content', 'generation', 'seo'],
    options: [
      { label: 'Standard Summary', value: 'summary', defaultPrompt: 'Generate a direct answer summary for the provided text.' },
      { label: 'Step-by-Step List', value: 'steps', defaultPrompt: 'Extract a step-by-step how-to list from the content.' }
    ]
  },
  {
    id: 'schema-markup-auto',
    title: 'Structured Data Builder',
    description: 'Help machines understand your site. Automatically generate the code (Schema Markup) needed for FAQs, Articles, and Product pages.',
    category: 'build',
    agentName: 'Schema Automation Agent',
    autoActions: [
      'Analyze content structure',
      'Generate JSON-LD Schema',
      'Validate markup'
    ],
    outputs: ['Schema Markup Code', 'Validation Report'],
    complexity: 'easy',
    tags: ['schema', 'technical-seo', 'coding'],
    options: [
      { label: 'FAQ Schema', value: 'faq', defaultPrompt: 'Generate FAQPage schema for the content.' },
      { label: 'Article/Blog Schema', value: 'article', defaultPrompt: 'Generate Article schema.' }
    ]
  },
  {
    id: 'multi-persona-content',
    title: 'Content Tailoring Agent',
    description: 'One topic, many voices. Automatically rewrite your content to suit different readers, like a simplified version for beginners or a technical one for devs.',
    category: 'build',
    agentName: 'Content Variant Agent',
    autoActions: [
      'Rewrite content for specific personas',
      'Adjust tone and complexity',
      'Generate multiple versions'
    ],
    outputs: ['Persona-Specific Content Drafts'],
    complexity: 'medium',
    tags: ['content', 'persona', 'writing'],
    options: [
      { label: 'Simplify for Beginners', value: 'simple', defaultPrompt: 'Rewrite this content for a complete beginner audience.' },
      { label: 'Technical Deep Dive', value: 'tech', defaultPrompt: 'Rewrite this for a technical expert audience.' }
    ]
  },
  {
    id: 'authority-glossary',
    title: 'Industry Glossary Creator',
    description: 'Become the definition of your industry. Build a comprehensive glossary of terms to signal authority to search engines and AI models.',
    category: 'build',
    agentName: 'Glossary Builder Agent',
    autoActions: [
      'Extract industry terms',
      'Generate definitions and examples',
      'Build glossary structure'
    ],
    outputs: ['Glossary Entries', 'Structured Data'],
    complexity: 'medium',
    tags: ['content', 'glossary', 'knowledge-base'],
    options: [
      { label: 'Extract & Define', value: 'extract', defaultPrompt: 'Extract key terms from the text and provide definitions.' }
    ]
  },
  {
    id: 'structure-comparison-matrix',
    title: 'Product Comparison Builder',
    description: 'Win the comparison battle. Extract features from competitor docs and build detailed, objective comparison tables that buyers love.',
    category: 'build',
    agentName: 'Comparison Matrix Agent',
    autoActions: [
      'Extract features from docs and competitor pages',
      'Generate feature comparison matrix',
      'Output HTML/Table code'
    ],
    outputs: ['Comparison Matrix HTML', 'Feature Analysis Table'],
    complexity: 'medium',
    tags: ['content', 'comparison', 'product-marketing'],
    options: [
      { label: 'Feature Comparison', value: 'feature', defaultPrompt: 'Create a feature-by-feature comparison table.' }
    ]
  },
  {
    id: 'citation-magnet-content',
    title: 'Viral Research Drafter',
    description: 'Create content that begs to be cited. Draft outlines for data-driven articles, industry insights, and unique research.',
    category: 'build',
    agentName: 'Citation Magnet Agent',
    autoActions: [
      'Identify high-citation topics',
      'Draft content structure',
      'Generate research-backed drafts'
    ],
    outputs: ['Viral Content Drafts', 'Citation Strategy Plan'],
    complexity: 'hard',
    tags: ['content-strategy', 'link-building', 'research'],
    options: [
      { label: 'Data Report Outline', value: 'report', defaultPrompt: 'Draft an outline for a data-driven industry report.' }
    ]
  },
  {
    id: 'conversational-faq',
    title: 'Chat-Ready FAQ Converter',
    description: 'Transform rigid FAQs into natural conversations. Rewrite Q&A pairs to sound more like a helpful chat, optimized for voice search.',
    category: 'build',
    agentName: 'Conversational FAQ Agent',
    autoActions: [
      'Rewrite standard FAQ into conversational style',
      'Generate follow-up questions',
      'Optimize for voice/chat search'
    ],
    outputs: ['Conversational FAQ JSON', 'Follow-up Question List'],
    complexity: 'easy',
    tags: ['content', 'faq', 'voice-search'],
    options: [
      { label: 'Conversational Rewrite', value: 'rewrite', defaultPrompt: 'Rewrite these FAQs to be more conversational.' }
    ]
  },
  {
    id: 'fact-sheet-generator',
    title: 'Correction Fact Sheet Creator',
    description: 'Set the record straight. Draft official fact sheets to correct common misconceptions AI models might have about your brand.',
    category: 'build',
    agentName: 'Fact Sheet Agent',
    autoActions: [
      'Aggregate common AI misconceptions',
      'Draft official fact sheets',
      'Format for media distribution'
    ],
    outputs: ['Official Fact Sheet', 'Correction Guidelines'],
    complexity: 'easy',
    tags: ['pr', 'fact-checking', 'brand-protection'],
    options: [
      { label: 'Misconception Correction', value: 'correct', defaultPrompt: 'Create a fact sheet addressing common misconceptions about [Topic].' }
    ]
  },
  {
    id: 'geo-style-guide',
    title: 'AI-Optimized Style Guide',
    description: 'Standardize your voice. Create a writing guide that defines your terminology and tone, helping all your content perform better in AI search.',
    category: 'build',
    agentName: 'Style Guide Agent',
    autoActions: [
      'Analyze successful content patterns',
      'Define terminology and tone guidelines',
      'Generate checklist for writers'
    ],
    outputs: ['GEO Style Guide PDF', 'Content Checklist'],
    complexity: 'medium',
    tags: ['guidelines', 'standardization', 'quality-control'],
    options: [
      { label: 'Tone & Voice Guide', value: 'tone', defaultPrompt: 'Draft a tone and voice guide for AI optimization.' }
    ]
  },


  // --- Optimize Category (9) ---
  {
    id: 'conversational-headline',
    title: 'Question-Based Headline Optimizer',
    description: 'Turn statements into questions. Rewrite headlines to match the actual questions users ask, making them more likely to be picked up by AI.',
    category: 'optimize',
    agentName: 'Headline Rewriter Agent',
    autoActions: [
      'Analyze current headlines',
      'Rewrite as questions/commands',
      'Optimize for voice search'
    ],
    outputs: ['Optimized Headlines List'],
    complexity: 'easy',
    tags: ['optimization', 'copywriting', 'voice-search'],
    options: [
      { label: 'Question Format', value: 'question', defaultPrompt: 'Rewrite these headlines as questions.' }
    ]
  },
  {
    id: 'content-fluency',
    title: 'Readability Improver',
    description: 'Smooth out your writing. Fix long, confusing sentences and logical gaps to make your content easy for both humans and AI to understand.',
    category: 'optimize',
    agentName: 'Fluency Rewriter Agent',
    autoActions: [
      'Detect complex sentences',
      'Suggest natural rewrites',
      'Fix logic gaps'
    ],
    outputs: ['Rewritten Content Suggestions', 'Readability Score'],
    complexity: 'easy',
    tags: ['optimization', 'editing', 'readability'],
    options: [
      { label: 'Simplify Sentences', value: 'simplify', defaultPrompt: 'Simplify complex sentences in this text.' }
    ]
  },
  {
    id: 'token-economy',
    title: 'Content Condenser',
    description: 'Pack more value into fewer words. Remove fluff and redundancy so AI models can process your key information more efficiently.',
    category: 'optimize',
    agentName: 'Token Optimizer Agent',
    autoActions: [
      'Analyze token usage',
      'Remove fluff/redundancy',
      'Compress text without data loss'
    ],
    outputs: ['Compressed Content', 'Token Savings Report'],
    complexity: 'easy',
    tags: ['optimization', 'llm', 'efficiency'],
    options: [
      { label: 'Maximize Compression', value: 'max', defaultPrompt: 'Compress this text as much as possible without losing key info.' }
    ]
  },
  {
    id: 'citation-attribution',
    title: 'Source Credibility Booster',
    description: 'Back up your claims. Find vague statements like "studies show" and replace them with specific citations to trusted sources.',
    category: 'optimize',
    agentName: 'Citation Completer Agent',
    autoActions: [
      'Identify vague citations',
      'Search for authoritative sources',
      'Suggest specific attributions'
    ],
    outputs: ['Citation Suggestions', 'Source Links'],
    complexity: 'medium',
    tags: ['optimization', 'fact-checking', 'credibility'],
    options: [
      { label: 'Find Citations', value: 'find', defaultPrompt: 'Find authoritative citations for claims in this text.' }
    ]
  },
  {
    id: 'entity-density',
    title: 'Keyword & Entity Enricher',
    description: 'Speak the language of the experts. Add relevant technical terms and concepts to your content to signal depth and expertise.',
    category: 'optimize',
    agentName: 'Entity Density Agent',
    autoActions: [
      'Analyze entity frequency',
      'Suggest relevant entity insertions',
      'Maintain readability balance'
    ],
    outputs: ['Entity Enhancement Suggestions', 'Content Density Report'],
    complexity: 'medium',
    tags: ['seo', 'entities', 'optimization'],
    options: [
      { label: 'Enrich Entities', value: 'enrich', defaultPrompt: 'Suggest relevant entities to add to this text.' }
    ]
  },
  {
    id: 'soft-cta-implant',
    title: 'Contextual Nudge Inserter',
    description: 'Stop shouting "Buy Now". Replace aggressive sales pitches with helpful, educational suggestions that naturally lead users to your product.',
    category: 'optimize',
    agentName: 'Soft CTA Agent',
    autoActions: [
      'Audit existing CTAs',
      'Generate educational/contextual alternatives',
      'Smooth user journey transitions'
    ],
    outputs: ['Soft CTA Suggestions', 'User Flow Optimization'],
    complexity: 'easy',
    tags: ['cro', 'copywriting', 'ux'],
    options: [
      { label: 'Soften CTAs', value: 'soften', defaultPrompt: 'Rewrite hard CTAs to be more contextual and educational.' }
    ]
  },
  {
    id: 'compliance-clean',
    title: 'Brand Safety Polisher',
    description: 'Keep it safe. Identify and rewrite risky words or phrases that might trigger content safety filters in AI models.',
    category: 'optimize',
    agentName: 'Compliance Cleaning Agent',
    autoActions: [
      'Scan for sensitive/flagged terms',
      'Suggest compliant alternatives',
      'Generate compliance report'
    ],
    outputs: ['Compliance Risk Report', 'Safe Content Rewrites'],
    complexity: 'medium',
    tags: ['compliance', 'risk', 'legal'],
    options: [
      { label: 'Safety Scan', value: 'scan', defaultPrompt: 'Scan for risky content.' }
    ]
  },
  {
    id: 'localization-calibration',
    title: 'Native Language Polisher',
    description: 'Fix the "translated" feel. Polish machine-translated content to ensure it sounds natural and culturally appropriate for local readers.',
    category: 'optimize',
    agentName: 'Localization Calibration Agent',
    autoActions: [
      'Compare machine translation vs local usage',
      'Suggest natural phrasing',
      'Fix cultural nuances'
    ],
    outputs: ['Localization Quality Audit', 'Rewrite Suggestions'],
    complexity: 'medium',
    tags: ['localization', 'translation', 'quality'],
    options: [
      { label: 'Polish Translation', value: 'polish', defaultPrompt: 'Polish this translation to sound native.' }
    ]
  },
  {
    id: 'internal-link-anchor',
    title: 'Link Context Optimizer',
    description: 'Fix "Click Here" links. Replace generic link text with descriptive phrases that tell search engines exactly what the linked page is about.',
    category: 'optimize',
    agentName: 'Internal Link Anchor Agent',
    autoActions: [
      'Scan for generic anchor text',
      'Suggest semantic alternatives',
      'Optimize link structure'
    ],
    outputs: ['Anchor Text Optimization Report', 'Link Structure Plan'],
    complexity: 'easy',
    tags: ['seo', 'internal-linking', 'ux'],
    options: [
      { label: 'Optimize Anchors', value: 'optimize', defaultPrompt: 'Optimize internal link anchor text.' }
    ]
  },


  // --- Monitor Category (9) ---
  {
    id: 'share-of-model',
    title: 'AI Market Share Monitor',
    description: 'Track your visibility. See how often your brand is mentioned compared to competitors across major AI models.',
    category: 'monitor',
    agentName: 'SOM Monitor Agent',
    autoActions: [
      'Run query sets on models',
      'Calculate brand share of voice',
      'Update SOM dashboard'
    ],
    outputs: ['Share of Model Report', 'Trend Dashboard'],
    complexity: 'medium',
    tags: ['analytics', 'monitoring', 'som'],
    options: [
      { label: 'Brand SOM Check', value: 'som', defaultPrompt: 'Check Share of Model for [Brand Name] vs Competitors.' }
    ]
  },
  {
    id: 'brand-sentiment',
    title: 'Brand Sentiment Analyzer',
    description: 'Read the room. Analyze the emotional tone of AI answers about your brand to see if they are positive, negative, or neutral.',
    category: 'monitor',
    agentName: 'Sentiment Monitor Agent',
    autoActions: [
      'Scrape brand mentions',
      'Analyze sentiment',
      'Generate adjective cloud'
    ],
    outputs: ['Sentiment Report', 'Word Cloud'],
    complexity: 'medium',
    tags: ['analytics', 'sentiment', 'branding'],
    options: [
      { label: 'Sentiment Analysis', value: 'sentiment', defaultPrompt: 'Analyze the sentiment of recent AI mentions of [Brand Name].' }
    ]
  },
  {
    id: 'hallucination-alert',
    title: 'False Information Alert',
    description: 'Stop rumors fast. Get alerted immediately if an AI model starts inventing fake features, prices, or clients for your brand.',
    category: 'monitor',
    agentName: 'Hallucination Alert Agent',
    autoActions: [
      'Monitor for factual errors',
      'Check against blacklist/truth-base',
      'Send immediate alerts'
    ],
    outputs: ['Hallucination Alerts', 'Correction Tasks'],
    complexity: 'medium',
    tags: ['monitoring', 'risk', 'compliance'],
    options: [
      { label: 'Hallucination Check', value: 'check', defaultPrompt: 'Check for hallucinations about [Brand Name].' }
    ]
  },
  {
    id: 'ai-citation-rate',
    title: 'Reference Tracker',
    description: 'Count your citations. Track exactly which of your pages and links are being cited as sources in AI answers.',
    category: 'monitor',
    agentName: 'Citation Tracker Agent',
    autoActions: [
      'Extract URLs from AI answers',
      'Match against owned properties',
      'Calculate citation metrics'
    ],
    outputs: ['Citation Rate Report', 'Link Distribution Map'],
    complexity: 'medium',
    tags: ['analytics', 'seo', 'tracking'],
    options: [
      { label: 'Track Citations', value: 'track', defaultPrompt: 'Track citation rate for [Domain/URL].' }
    ]
  },
  {
    id: 'brand-association-cloud',
    title: 'Brand Perception Cloud',
    description: 'Visualize your brand image. See a word cloud of the concepts and adjectives that AI models most frequently associate with you.',
    category: 'monitor',
    agentName: 'Association Monitor Agent',
    autoActions: [
      'Extract co-occurring terms',
      'Analyze semantic association',
      'Generate association cloud'
    ],
    outputs: ['Brand Association Cloud', 'Perception Analysis'],
    complexity: 'medium',
    tags: ['analytics', 'branding', 'nlp'],
    options: [
      { label: 'Association Cloud', value: 'cloud', defaultPrompt: 'Generate a brand association cloud for [Brand Name].' }
    ]
  },
  {
    id: 'content-decay-monitor',
    title: 'Content Relevance Watchdog',
    description: 'Don\'t let content rot. Get notified when your previously popular articles start getting cited less frequently by AI.',
    category: 'monitor',
    agentName: 'Content Decay Monitor Agent',
    autoActions: [
      'Track citation frequency over time',
      'Detect rapid drop-offs',
      'Flag content for update'
    ],
    outputs: ['Citation Decay Alerts', 'Content Refresh Queue'],
    complexity: 'medium',
    tags: ['analytics', 'content-lifecycle', 'monitoring'],
    options: [
      { label: 'Decay Check', value: 'decay', defaultPrompt: 'Check for content decay on [Domain].' }
    ]
  },
  {
    id: 'competitor-link-growth',
    title: 'Competitor Backlink Spy',
    description: 'Watch your rivals. See when competitors gain new high-quality links from universities, governments, or major publications.',
    category: 'monitor',
    agentName: 'Competitor Link Scout Agent',
    autoActions: [
      'Monitor new competitor backlinks',
      'Filter for high-authority domains',
      'Analyze link building patterns'
    ],
    outputs: ['New Backlink Alert', 'Competitor Link Strategy Report'],
    complexity: 'medium',
    tags: ['competitor', 'seo', 'backlinks'],
    options: [
      { label: 'Monitor Backlinks', value: 'monitor', defaultPrompt: 'Monitor new backlinks for [Competitor].' }
    ]
  },
  {
    id: 'pr-response-speed',
    title: 'Crisis Update Speedometer',
    description: 'Measure the lag. After a major event, see how long it takes for AI models to update their answers with the new information.',
    category: 'monitor',
    agentName: 'PR Response Speed Agent',
    autoActions: [
      'Poll AI models after PR events',
      'Track answer updates',
      'Calculate latency metrics'
    ],
    outputs: ['AI Update Latency Report', 'Crisis Response Timeline'],
    complexity: 'easy',
    tags: ['pr', 'crisis-management', 'monitoring'],
    options: [
      { label: 'Check Update Speed', value: 'check', defaultPrompt: 'Check AI update speed for recent event: [Event Name].' }
    ]
  },
  {
    id: 'long-tail-coverage',
    title: 'Niche Topic Tracker',
    description: 'Own the details. Track your success in capturing and answering specific, long-tail questions that users are asking.',
    category: 'monitor',
    agentName: 'Long-tail Coverage Agent',
    autoActions: [
      'Match long-tail queries to content',
      'Check AI adoption status',
      'Track coverage growth'
    ],
    outputs: ['Coverage Growth Report', 'Gap Filling Progress'],
    complexity: 'medium',
    tags: ['seo', 'long-tail', 'analytics'],
    options: [
      { label: 'Long-tail Check', value: 'check', defaultPrompt: 'Track coverage for long-tail keywords in [Topic].' }
    ]
  }
];

