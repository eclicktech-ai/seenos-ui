// 数据转换：将 Context API 响应格式转换为 ContextData 格式

import { v4 as uuidv4 } from 'uuid';
import type { ContextData, OnSiteContext, OffSiteContext, KnowledgeContext } from '@/app/types/context';

// API 响应类型
interface ContextApiResponse {
  brand?: {
    brand?: { brand_name?: string; tagline?: string };
    hero?: { headline?: string; subheadline?: string };
    contact?: { email?: string; phone?: string; address?: string };
  };
  onsite?: {
    singletons?: Record<string, any>;
    items?: Record<string, any[]>;
    persons?: Record<string, any[]>;
  };
  offsite?: {
    singletons?: Record<string, any>;
    items?: Record<string, any[]>;
    persons?: Record<string, any[]>;
    entities?: Record<string, any[]>;
  };
}

/**
 * 将 Context API 响应转换为 ContextData 格式
 */
export function mapApiResponseToContextData(apiResponse: ContextApiResponse): ContextData {
  const { brand = {}, onsite = {}, offsite = {} } = apiResponse;

  // ============ Helpers ============
  // 后端返回的 singleton 可能是 { data: {...}, version: ... } 或者直接是 {...}
  const unwrapSingleton = (v: any) => {
    if (!v || typeof v !== "object") return v;
    if ("data" in v) return (v as any).data;
    return v;
  };

  const getOnsiteSingleton = (section: string) =>
    unwrapSingleton((onsite as any).singletons?.[section]) || {};
  const getOffsiteSingleton = (section: string) =>
    unwrapSingleton((offsite as any).singletons?.[section]) || {};

  const ensureString = (v: any): string => (typeof v === "string" ? v : v == null ? "" : String(v));
  const ensureStringArray = (v: any): string[] =>
    Array.isArray(v) ? v.filter((x) => typeof x === "string").map((x) => x.trim()).filter(Boolean) : [];

  const normalizeReviewPlatform = (platformOrName: any, profileUrl?: any): string => {
    const raw = ensureString(platformOrName).trim();
    const rawLower = raw.toLowerCase();
    const urlLower = ensureString(profileUrl).toLowerCase();
    const s = `${rawLower} ${urlLower}`;

    // Match by URL/domain first (most reliable)
    if (s.includes("trustpilot")) return "Trustpilot";
    if (s.includes("trustradius")) return "TrustRadius";
    if (s.includes("capterra")) return "Capterra";
    if (s.includes("g2.com") || s === "g2" || s.includes(" g2 ")) return "G2";
    if (s.includes("producthunt") || s.includes("product hunt")) return "Product Hunt";
    if (s.includes("gartner")) return "Gartner";
    if (s.includes("glassdoor")) return "Glassdoor";
    if (s.includes("yelp")) return "Yelp";

    // Match by known names
    const allowed = new Set([
      "G2",
      "Capterra",
      "TrustRadius",
      "Trustpilot",
      "Gartner",
      "Glassdoor",
      "Yelp",
      "Product Hunt",
      "Other",
    ]);

    // Try a simple title-case normalization for inputs like "trustpilot"
    const titleCase = raw
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
    if (allowed.has(titleCase)) return titleCase;
    if (allowed.has(raw)) return raw;

    return "Other";
  };

  const brandAssetsSingleton = getOnsiteSingleton("brand_assets");
  const heroSectionSingleton = getOnsiteSingleton("hero_section");
  const contactInfoSingleton = getOnsiteSingleton("contact_info");
  const monitoringScopeSingleton = getOffsiteSingleton("monitoring_scope");

  // data.json / 部分后端字段兼容：
  // brand.brand.brandName 可能是 string，也可能是 { name, subtitle }
  const brandNameFromAssets =
    typeof brandAssetsSingleton?.brandName === "string"
      ? brandAssetsSingleton.brandName
      : brandAssetsSingleton?.brandName?.name;

  const brandNameFromBrand =
    (brand as any)?.brand?.brand_name ||
    (brand as any)?.brand?.brandName ||
    (brand as any)?.brand?.name;

  const brandTaglineFromBrand =
    (brand as any)?.brand?.tagline ||
    (brand as any)?.brand?.brandSubtitle ||
    (brand as any)?.hero?.subheadline;

  const heroHeadline =
    ensureString((brand as any)?.hero?.headline) ||
    ensureString(heroSectionSingleton?.headline) ||
    ensureString(getOnsiteSingleton("hero_headline")?.headline);

  const heroSubheadline =
    ensureString((brand as any)?.hero?.subheadline) ||
    ensureString(heroSectionSingleton?.subheadline) ||
    ensureString(getOnsiteSingleton("hero_subheadline")?.subheadline);
  
  // 转换 Onsite 数据
  const onSite: OnSiteContext = {
    brandInfo: {
      name: ensureString(brandNameFromBrand || brandNameFromAssets),
      tagline: ensureString(brandTaglineFromBrand || heroSubheadline),
      mission: ensureString(getOnsiteSingleton("about_us")?.mission),
      vision: ensureString(getOnsiteSingleton("about_us")?.vision),
      coreValues: Array.isArray(getOnsiteSingleton("about_us")?.coreValues) ? getOnsiteSingleton("about_us").coreValues : [],
      foundingStory: ensureString(getOnsiteSingleton("about_us")?.companyStory),
      uniqueSellingPoints: heroHeadline ? [heroHeadline] : [],
    },
    brandAssets: [],
    productsServices: (onsite.items?.products_services || []).map((item: any) => ({
      id: uuidv4(),
      name: item.title || item.name || "",
      type: "product" as const,
      url: item.url || undefined,
      description: item.description || "",
      features: (item.extra?.features || item.features || []).map((f: any) => typeof f === 'string' ? f : f.name || f.title || f),
      benefits: (item.extra?.benefits || item.benefits || []).map((b: any) => typeof b === 'string' ? b : b.name || b.title || b),
      howItWorks: (item.extra?.how_it_works || item.howItWorks || []).map((h: any) => typeof h === 'string' ? h : h.name || h.title || h),
      pricingPlans: (item.extra?.pricing_plans || item.pricingPlans || []).map((p: any) => ({
        name: p.name || "",
        price: p.price || "",
        features: (p.features || []).map((f: any) => typeof f === 'string' ? f : f.name || f.title || f),
      })),
    })),
    landingPages: (onsite.items?.landing_pages || []).map((item: any) => ({
      id: uuidv4(),
      name: item.title || item.name || "",
      url: item.url || "",
      type: (item.extra?.type || item.type || "other") as "product" | "campaign" | "event" | "signup" | "download" | "other",
      status: "active" as const,
      description: item.description || "",
      createdAt: item.created_at || new Date().toISOString(),
    })),
    blogPosts: (onsite.items?.blog_posts || []).map((item: any) => ({
      id: uuidv4(),
      title: item.title || item.name || "",
      url: item.url || "",
      category: item.extra?.category || item.category || undefined,
      status: "published" as const,
      publishDate: item.extra?.publishDate || item.publishDate || item.created_at || undefined,
      tags: item.extra?.tags || item.tags || undefined,
    })),
    websiteContent: [
      // ============ Brand Assets -> WebsiteContent (用于 UI 渲染) ============
      ...(ensureString(brandAssetsSingleton?.brandSubtitle) ? [{
        id: uuidv4(),
        name: ensureString(brandAssetsSingleton.brandSubtitle),
        url: "#meta-subtitle",
        type: "other" as const,
      }] : []),
      ...(ensureString((brandAssetsSingleton as any)?.metaDescription || (brand as any)?.brand?.metaDescription) ? [{
        id: uuidv4(),
        name: ensureString((brandAssetsSingleton as any)?.metaDescription || (brand as any)?.brand?.metaDescription),
        url: "#meta-description",
        type: "other" as const,
      }] : []),
      ...(ensureString((brandAssetsSingleton as any)?.logoUrl) ? [{
        id: uuidv4(),
        name: ensureString((brandAssetsSingleton as any)?.logoUrl),
        url: "#brand-logo",
        type: "other" as const,
      }] : []),
      ...(ensureString((brandAssetsSingleton as any)?.toneOfVoice) ? [{
        id: uuidv4(),
        name: ensureString((brandAssetsSingleton as any)?.toneOfVoice),
        url: "#brand-tone",
        type: "other" as const,
      }] : []),

      // ============ Hero Section -> CTA / Metrics / Media ============
      ...(Array.isArray(heroSectionSingleton?.ctas) ? heroSectionSingleton.ctas.map((cta: any) => ({
        id: uuidv4(),
        name: ensureString(cta?.text),
        url: "#cta",
        type: "other" as const,
        description: ensureString(cta?.url),
      })) : []),
      ...(Array.isArray(heroSectionSingleton?.metrics) ? heroSectionSingleton.metrics.map((m: any) => ({
        id: uuidv4(),
        name: ensureString(m?.value && m?.label ? `${m.value} · ${m.label}` : (m?.value || m?.label)),
        url: "#metric",
        type: "other" as const,
      })) : []),

      // ============ Header/Footer/Sitemap Links（直接渲染入口） ============
      ...(((onsite as any).items?.header_links || []) as any[]).map((item: any) => ({
        id: uuidv4(),
        name: ensureString(item.title || item.name || item.url),
        url: "#header-link",
        type: "other" as const,
        description: ensureString(item.url),
      })),
      ...(((onsite as any).items?.footer_links || []) as any[]).map((item: any) => ({
        id: uuidv4(),
        name: ensureString(item.title || item.name || item.url),
        url: "#footer-link",
        type: "other" as const,
        description: ensureString(item.url),
      })),
      ...(((onsite as any).items?.sitemap_urls || []) as any[]).map((item: any) => ({
        id: uuidv4(),
        name: ensureString(item.title || item.name || item.url),
        url: "#sitemap-url",
        type: "other" as const,
        description: ensureString(item.url),
      })),

      // Problem Statement
      ...(getOnsiteSingleton("problem_statement")?.painPoints || []).map((pp: any) => ({
        id: uuidv4(),
        name: pp.title || pp.name || "",
        url: "#problem",
        type: "other" as const,
        description: pp.description || "",
      })),
      // Who We Serve
      ...(getOnsiteSingleton("who_we_serve")?.targetAudiences || []).map((ta: any) => ({
        id: uuidv4(),
        name: ta.name || "",
        url: "#audience",
        type: "other" as const,
        description: ta.description || "",
      })),
      // Use Cases
      ...(onsite.items?.use_cases || []).map((uc: any) => ({
        id: uuidv4(),
        name: uc.title || uc.name || "",
        url: "#use-case",
        type: "other" as const,
        description: uc.description || "",
      })),
      // Industries
      ...(onsite.items?.industries || []).map((ind: any) => ({
        id: uuidv4(),
        name: ind.title || ind.name || "",
        url: "#industry",
        type: "other" as const,
        description: ind.description || "",
      })),
      // Case Studies
      ...(onsite.items?.case_studies || []).map((cs: any) => ({
        id: uuidv4(),
        name: cs.title || cs.name || "",
        url: cs.customerName ? `#case-study-${cs.customerName}` : uuidv4(),
        type: "case_study" as const,
        description: cs.description || "",
      })),
      // Testimonials
      ...(onsite.items?.testimonials || []).map((t: any) => ({
        id: uuidv4(),
        name: t.quote || t.name || "",
        url: "",
        type: "testimonial" as const,
        description: t.description || "",
      })),
      // Trust Badges
      ...(onsite.items?.trust_badges || []).map((tb: any) => ({
        id: uuidv4(),
        name: tb.title || tb.name || "",
        url: "#logo",
        type: "other" as const,
        description: tb.description || "",
      })),
      // FAQs
      ...(onsite.items?.faqs || []).map((faq: any) => ({
        id: uuidv4(),
        name: faq.question || faq.extra?.question || "",
        url: "",
        type: "faq" as const,
        description: faq.answer || faq.extra?.answer || faq.description || "",
      })),
      // Contact Info
      ...(ensureString((brand as any)?.contact?.email || contactInfoSingleton?.email) ? [{
        id: uuidv4(),
        name: ensureString((brand as any)?.contact?.email || contactInfoSingleton?.email),
        url: "#contact-email",
        type: "other" as const,
      }] : []),
      ...(ensureString((brand as any)?.contact?.phone || contactInfoSingleton?.phone) ? [{
        id: uuidv4(),
        name: ensureString((brand as any)?.contact?.phone || contactInfoSingleton?.phone),
        url: "#contact-phone",
        type: "other" as const,
      }] : []),
      ...(ensureString((brand as any)?.contact?.address || contactInfoSingleton?.address) ? [{
        id: uuidv4(),
        name: ensureString((brand as any)?.contact?.address || contactInfoSingleton?.address),
        url: "#contact-address",
        type: "other" as const,
      }] : []),
    ],
    team: (onsite.persons?.leadership_team || []).map((member: any) => ({
      id: uuidv4(),
      name: member.name || "",
      role: member.title || member.role || "",
      bio: member.bio || member.description || "",
      linkedin: member.social_links?.find((sl: any) => sl.platform === "LinkedIn")?.url || member.linkedin,
    })),
  };

  // 转换 Offsite 数据
  const offSite: OffSiteContext = {
    monitoringScope: {
      brandKeywords: ensureStringArray(monitoringScopeSingleton?.brandKeywords),
      domainName: ensureString(monitoringScopeSingleton?.domainName),
      productKeywords: ensureStringArray(monitoringScopeSingleton?.productKeywords),
      hashtags: ensureStringArray(monitoringScopeSingleton?.hashtags),
      keyPersons: ensureStringArray(monitoringScopeSingleton?.keyPersons),
      languages: ensureStringArray(monitoringScopeSingleton?.languages),
      regions: ensureStringArray(monitoringScopeSingleton?.regions),
      requiredKeywords: ensureStringArray(monitoringScopeSingleton?.requiredKeywords),
      excludedKeywords: ensureStringArray(monitoringScopeSingleton?.excludedKeywords),
    },
    socialAccounts: (offsite.entities?.social_profiles || []).map((sp: any) => ({
      id: uuidv4(),
      platform: sp.platform || "",
      accountName: sp.name || "",
      url: sp.url || "",
      isPriority: sp.entity_type === "official",
    })),
    executiveAccounts: [],
    partnerAccounts: [],
    communities: [],
    qaPlatforms: [],
    professionalNetworks: [],
    mediaSources: [],
    videoPlatforms: [],
    podcastNewsletters: [],
    reviewPlatforms: (offsite.entities?.review_platforms || []).map((rp: any) => {
      return {
        id: rp.id || uuidv4(),
        platform: normalizeReviewPlatform(rp.platform || rp.name, rp.url),
        profileUrl: rp.url || "",
        fetchDetails: true,
      };
    }),
    appStores: [],
    verticalReviewSites: [],
    ecommercePlatforms: [],
    competitorConfigs: (offsite.entities?.competitors || []).map((comp: any) => ({
      id: uuidv4(),
      name: comp.name || "",
      brandKeywords: comp.brandKeywords || [],
      domain: comp.url || "",
      socialAccounts: [],
      reviewLinks: [],
      includeInSOV: true,
    })),
    influencerAccounts: (offsite.persons?.kols || []).map((kol: any) => ({
      id: uuidv4(),
      name: kol.name || "",
      platform: kol.platform || "",
      url: kol.url || kol.handle ? `https://${kol.platform}/${kol.handle}` : "",
      role: "kol" as const,
      tier: "1" as const,
    })),
    searchEngineTracking: [],
    serpCompetitors: [],
    directoryListings: [],
    guestPosts: [],
    backlinks: [],
    externalEvents: [],
    metricsConfig: {
      trackMentionsVolume: true,
      trackSentiment: true,
      trackReach: false,
      trackEngagement: false,
      trackShareOfVoice: false,
      trackReputationScore: false,
      trackTopSources: false,
      benchmarkPeriod: '30d',
      trackCompetitorSOV: false,
    },
    alertConfig: {
      channels: [],
      rules: [],
    },
    collectionSettings: {
      frequency: 'daily',
      historicalDepth: '30d',
      excludeBots: false,
      verifiedOnly: false,
      minEngagement: 0,
    },
    // Legacy fields
    officialAccounts: (offsite.entities?.social_profiles || []).map((sp: any) => ({
      id: uuidv4(),
      platform: sp.platform as any,
      accountName: sp.name || "",
      url: sp.url || "",
      verificationStatus: sp.entity_type === "official" ? "verified" as const : "unverified" as const,
    })),
    pressReleases: (offsite.items?.press_coverage || []).map((item: any) => ({
      id: uuidv4(),
      title: item.title || item.name || "",
      url: item.url || "",
      type: (item.extra?.type || item.type || "media_coverage") as "press_release" | "media_coverage" | "interview" | "news_mention",
      source: item.extra?.publication || item.publication || "",
      publishDate: item.extra?.date || item.date || item.created_at || undefined,
      summary: item.description || item.extra?.snippet || undefined,
    })),
    socialMediaContent: [],
    partnerships: [],
    customerReviews: [],
  };

  // Knowledge 数据使用现有的文件上传 API 单独管理，不从 /api/context/all 获取
  const knowledge: KnowledgeContext = {
    sources: [],
    sourceLimit: 50,
    competitors: [],
    audiencePersonas: [],
    marketIntelligence: [],
    userUploads: [],
    agentGenerated: [],
  };

  return {
    onSite,
    offSite,
    knowledge,
    metadata: {
      lastUpdated: new Date().toISOString(),
      version: "2.0.0",
    },
  };
}

