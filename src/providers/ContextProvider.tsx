"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { 
  apiClient, 
  type ContextFile, 
  type ContextListResponse, 
  type ContextSearchResult, 
  type ContextContentResponse, 
  type ContextChunksResponse,
  type ContextSingleton,
  type ContextItem,
  type ContextItemCreate,
  type ContextPerson,
  type ContextPersonCreate,
  type ContextEntity,
  type ContextEntityCreate,
  type ContextStatsResponse,
  type OnboardingStatus,
} from "@/lib/api/client";
import { useAuth } from "./AuthProvider";
import { ContextData, initialContextData, OnSiteContext, OffSiteContext, KnowledgeContext } from "@/app/types/context";
import { mapApiResponseToContextData } from "@/lib/context/api-mapper";

// ============ 类型定义 ============

interface ContextState {
  files: ContextFile[];
  totalSize: number;
  maxSize: number;
  isLoading: boolean;
  isUploading: boolean;
  error: string | null;
}

interface ContextContextValue extends ContextState {
  // 操作方法
  loadFiles: () => Promise<void>;
  uploadFile: (file: File, filename?: string) => Promise<ContextFile | null>;
  deleteFile: (contextId: string) => Promise<boolean>;
  searchContext: (query: string, options?: {
    top_k?: number;
    similarity_threshold?: number;
  }) => Promise<ContextSearchResult[]>;
  getFileContent: (contextId: string) => Promise<ContextContentResponse | null>;
  getFileChunks: (contextId: string) => Promise<ContextChunksResponse | null>;
  downloadFile: (contextId: string, filename: string) => Promise<void>;
  // 计算属性
  usagePercent: number;
  readyFilesCount: number;
}

// ============ Context ============

const ContextContext = createContext<ContextContextValue | null>(null);

// ============ 常量 ============

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const SUPPORTED_TYPES = [".txt", ".md", ".pdf", ".docx"];

// ============ 辅助函数 ============

/**
 * 从 getContextAll() 的 API 响应中提取文件信息
 */
function extractFilesFromApiResponse(apiResponse: any): ContextListResponse {
  const knowledge = apiResponse?.knowledge || {};
  const sources = knowledge.sources || [];
  
  // 过滤出文件类型的 sources（根据 by_type 中的 file 类型，或 source.type === 'file'）
  const fileSources = sources.filter((source: any) => {
    // 支持多种判断方式
    if (source.type === 'file' || source.sourceType === 'file') return true;
    // 如果有 fileType 字段，也认为是文件
    if (source.fileType) return true;
    return false;
  });
  
  // 转换为 ContextFile 格式
  const contexts: ContextFile[] = fileSources.map((source: any) => ({
    id: source.id || source.contextId || '',
    filename: source.filename || source.name || source.title || '',
    fileType: (source.fileType || source.sourceType || 'txt') as 'txt' | 'md' | 'pdf' | 'docx',
    fileSize: source.fileSize || 0,
    chunkCount: source.chunkCount || 0,
    status: (source.status || 'ready') as 'pending' | 'processing' | 'ready' | 'error',
    errorMessage: source.errorMessage || undefined,
    createdAt: source.createdAt || source.created_at || source.addedAt || new Date().toISOString(),
  }));
  
  // 计算总大小
  const totalSize = contexts.reduce((sum, file) => sum + file.fileSize, 0);
  
  // 尝试从 knowledge 中获取 maxSize，如果没有则使用默认值
  const maxSize = knowledge.maxSize || 50 * 1024 * 1024; // 默认 50MB
  
  return {
    contexts,
    totalSize,
    maxSize,
  };
}

// ============ Context Data Management (for ssrc Layout) ============

interface ContextContextType {
  contextData: ContextData;
  updateOnSite: (data: Partial<OnSiteContext>) => void;
  updateOffSite: (data: Partial<OffSiteContext>) => void;
  updateKnowledge: (data: Partial<KnowledgeContext>) => void;
  setContextData: (data: ContextData) => void;
  isContextEmpty: boolean;
  wizardOpen: boolean;
  setWizardOpen: (open: boolean) => void;
  deepResearchStatus: "loading" | "completed" | "idle";
  setDeepResearchStatus: (status: "loading" | "completed" | "idle") => void;
  onboardingStatus: OnboardingStatus | null;
  setOnboardingStatus: (status: OnboardingStatus | null) => void;
  
  // ============ Context API CRUD Methods ============
  
  // Stats
  getContextStats: (useCache?: boolean) => Promise<ContextStatsResponse | null>;
  
  // Singleton operations
  getSingleton: (section: string) => Promise<ContextSingleton | null>;
  upsertSingleton: (section: string, data: any, expectedVersion?: number) => Promise<ContextSingleton | null>;
  deleteSingleton: (section: string) => Promise<boolean>;
  
  // Items operations
  getItems: (params?: {
    category?: 'onsite' | 'offsite';
    section?: string;
    limit?: number;
    offset?: number;
    include_deleted?: boolean;
  }) => Promise<{ items: ContextItem[]; total: number } | null>;
  getItem: (itemId: string) => Promise<ContextItem | null>;
  createItem: (data: ContextItemCreate) => Promise<ContextItem | null>;
  updateItem: (itemId: string, data: Partial<ContextItemCreate>, expectedVersion?: number) => Promise<ContextItem | null>;
  deleteItem: (itemId: string) => Promise<boolean>;
  restoreItem: (itemId: string) => Promise<ContextItem | null>;
  bulkDeleteItems: (ids: string[]) => Promise<{ deleted: number; failed: string[] } | null>;
  reorderItems: (category: 'onsite' | 'offsite', section: string, ids: string[]) => Promise<boolean>;
  
  // Persons operations
  getPersons: (params?: {
    category?: 'onsite' | 'offsite';
    section?: string;
    limit?: number;
    offset?: number;
  }) => Promise<{ items: ContextPerson[]; total: number } | null>;
  createPerson: (data: ContextPersonCreate) => Promise<ContextPerson | null>;
  updatePerson: (personId: string, data: Partial<ContextPersonCreate>, expectedVersion?: number) => Promise<ContextPerson | null>;
  deletePerson: (personId: string) => Promise<boolean>;
  
  // Entities operations
  getEntities: (params?: {
    category?: 'onsite' | 'offsite';
    section?: string;
    limit?: number;
    offset?: number;
    include_deleted?: boolean;
  }) => Promise<{ items: ContextEntity[]; total: number } | null>;
  createEntity: (data: ContextEntityCreate) => Promise<ContextEntity | null>;
  updateEntity: (entityId: string, data: Partial<ContextEntityCreate>, expectedVersion?: number) => Promise<ContextEntity | null>;
  deleteEntity: (entityId: string) => Promise<boolean>;
  
  // Reload context data from API
  reloadContextData: () => Promise<void>;
  
  // 共享的文件列表数据（从 getContextAll 中提取）
  filesData: ContextListResponse | null;
  setFilesData: (data: ContextListResponse | null) => void;
}

const ContextMenuContext = createContext<ContextContextType | undefined>(undefined);

// Context Data Provider Component
function ContextDataProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth(); // Check if user is logged in
  const [contextData, setContextDataState] = useState<ContextData>(initialContextData);
  const [isLoaded, setIsLoaded] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [deepResearchStatus, setDeepResearchStatus] = useState<"loading" | "completed" | "idle">("loading");
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [filesData, setFilesData] = useState<ContextListResponse | null>(null);

  // Load context data from API (合并调用，同时提取文件信息)
  const loadContextData = useCallback(async () => {
    // 追踪调用来源
    console.log('[ContextProvider] loadContextData called, stack:', new Error().stack);

    try {
      // 只调用一次 getContextAll()
      const apiResponse = await apiClient.getContextAll();

      // 同时处理 Context 数据和文件信息
      const data = mapApiResponseToContextData(apiResponse);
      setContextDataState(data);
      
      // 从同一个 API 响应中提取文件信息
      const filesInfo = extractFilesFromApiResponse(apiResponse);
      setFilesData(filesInfo);
      
      setIsLoaded(true);
      return true;
    } catch (error) {
      console.error("[ContextProvider] Failed to load context data from API:", error);
      // Keep initial data on error
      setFilesData(null);
      setIsLoaded(true);
      return false;
    }
  }, []);

  // Initial load: DISABLED - 在 onboarding 完成后手动调用
  // 这样可以避免在没有 project_id 的情况下调用 API
  const hasInitialLoadedRef = useRef(false);
  useEffect(() => {
    // 只在用户登出时重置状态
    if (!isAuthenticated && hasInitialLoadedRef.current) {
      hasInitialLoadedRef.current = false;
      setIsLoaded(false);
      setContextDataState(initialContextData);
      setFilesData(null);
    }
  }, [isAuthenticated]);

  const updateOnSite = (data: Partial<OnSiteContext>) => {
    setContextDataState((prev) => ({
      ...prev,
      onSite: { ...prev.onSite, ...data },
      metadata: { ...prev.metadata, lastUpdated: new Date().toISOString() },
    }));
  };

  const updateOffSite = (data: Partial<OffSiteContext>) => {
    setContextDataState((prev) => ({
      ...prev,
      offSite: { ...prev.offSite, ...data },
      metadata: { ...prev.metadata, lastUpdated: new Date().toISOString() },
    }));
  };

  const updateKnowledge = (data: Partial<KnowledgeContext>) => {
    setContextDataState((prev) => ({
      ...prev,
      knowledge: { ...prev.knowledge, ...data },
      metadata: { ...prev.metadata, lastUpdated: new Date().toISOString() },
    }));
  };

  const setContextData = (data: ContextData) => {
    setContextDataState(data);
  };

  // Check if context is effectively empty
  const isContextEmpty = React.useMemo(() => {
    const { onSite, offSite, knowledge } = contextData;

    const hasOnSite =
      !!onSite.brandInfo.name ||
      onSite.landingPages.length > 0 ||
      onSite.blogPosts.length > 0;

    const hasOffSite =
      offSite.officialAccounts.length > 0 ||
      offSite.pressReleases.length > 0;

    const hasKnowledge =
      knowledge.competitors.length > 0 ||
      knowledge.userUploads.length > 0 ||
      knowledge.sources.length > 0;

    return !hasOnSite && !hasOffSite && !hasKnowledge;
  }, [contextData]);

  // ============ Context API CRUD Methods ============

  // Stats
  const getContextStats = useCallback(async (useCache: boolean = true): Promise<ContextStatsResponse | null> => {
    try {
      return await apiClient.getContextStats(useCache);
    } catch (error) {
      console.error("[ContextProvider] Failed to get context stats:", error);
      return null;
    }
  }, []);

  // Singleton operations
  const getSingleton = useCallback(async (section: string): Promise<ContextSingleton | null> => {
    try {
      return await apiClient.getSingleton(section);
    } catch (error) {
      console.error(`[ContextProvider] Failed to get singleton ${section}:`, error);
      return null;
    }
  }, []);

  const upsertSingleton = useCallback(async (
    section: string, 
    data: any, 
    expectedVersion?: number
  ): Promise<ContextSingleton | null> => {
    try {
      const result = await apiClient.upsertSingleton(section, data, expectedVersion);
      // Reload context data after update
      await loadContextData();
      return result;
    } catch (error) {
      console.error(`[ContextProvider] Failed to upsert singleton ${section}:`, error);
      return null;
    }
  }, [loadContextData]);

  const deleteSingletonMethod = useCallback(async (section: string): Promise<boolean> => {
    try {
      await apiClient.deleteSingleton(section);
      // Reload context data after delete
      await loadContextData();
      return true;
    } catch (error) {
      console.error(`[ContextProvider] Failed to delete singleton ${section}:`, error);
      return false;
    }
  }, [loadContextData]);

  // Items operations
  const getItems = useCallback(async (params?: {
    category?: 'onsite' | 'offsite';
    section?: string;
    limit?: number;
    offset?: number;
    include_deleted?: boolean;
  }): Promise<{ items: ContextItem[]; total: number } | null> => {
    try {
      const response = await apiClient.getItems(params);
      return { items: response.items, total: response.total };
    } catch (error) {
      console.error("[ContextProvider] Failed to get items:", error);
      return null;
    }
  }, []);

  const getItem = useCallback(async (itemId: string): Promise<ContextItem | null> => {
    try {
      return await apiClient.getItem(itemId);
    } catch (error) {
      console.error(`[ContextProvider] Failed to get item ${itemId}:`, error);
      return null;
    }
  }, []);

  const createItem = useCallback(async (data: ContextItemCreate): Promise<ContextItem | null> => {
    try {
      const result = await apiClient.createItem(data);
      // Reload context data after create
      await loadContextData();
      return result;
    } catch (error) {
      console.error("[ContextProvider] Failed to create item:", error);
      return null;
    }
  }, [loadContextData]);

  const updateItem = useCallback(async (
    itemId: string, 
    data: Partial<ContextItemCreate>, 
    expectedVersion?: number
  ): Promise<ContextItem | null> => {
    try {
      const result = await apiClient.updateItem(itemId, data, expectedVersion);
      // Reload context data after update
      await loadContextData();
      return result;
    } catch (error) {
      console.error(`[ContextProvider] Failed to update item ${itemId}:`, error);
      return null;
    }
  }, [loadContextData]);

  const deleteItem = useCallback(async (itemId: string): Promise<boolean> => {
    try {
      await apiClient.deleteItem(itemId);
      // Reload context data after delete
      await loadContextData();
      return true;
    } catch (error) {
      console.error(`[ContextProvider] Failed to delete item ${itemId}:`, error);
      return false;
    }
  }, [loadContextData]);

  const restoreItem = useCallback(async (itemId: string): Promise<ContextItem | null> => {
    try {
      const result = await apiClient.restoreItem(itemId);
      // Reload context data after restore
      await loadContextData();
      return result;
    } catch (error) {
      console.error(`[ContextProvider] Failed to restore item ${itemId}:`, error);
      return null;
    }
  }, [loadContextData]);

  const bulkDeleteItems = useCallback(async (ids: string[]): Promise<{ deleted: number; failed: string[] } | null> => {
    try {
      const result = await apiClient.bulkDeleteItems(ids);
      // Reload context data after bulk delete
      await loadContextData();
      return result;
    } catch (error) {
      console.error("[ContextProvider] Failed to bulk delete items:", error);
      return null;
    }
  }, [loadContextData]);

  const reorderItems = useCallback(async (
    category: 'onsite' | 'offsite', 
    section: string, 
    ids: string[]
  ): Promise<boolean> => {
    try {
      await apiClient.reorderItems(category, section, ids);
      // Reload context data after reorder
      await loadContextData();
      return true;
    } catch (error) {
      console.error("[ContextProvider] Failed to reorder items:", error);
      return false;
    }
  }, [loadContextData]);

  // Persons operations
  const getPersons = useCallback(async (params?: {
    category?: 'onsite' | 'offsite';
    section?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: ContextPerson[]; total: number } | null> => {
    try {
      const response = await apiClient.getPersons(params);
      return { items: response.items, total: response.total };
    } catch (error) {
      console.error("[ContextProvider] Failed to get persons:", error);
      return null;
    }
  }, []);

  const createPerson = useCallback(async (data: ContextPersonCreate): Promise<ContextPerson | null> => {
    try {
      const result = await apiClient.createPerson(data);
      // Reload context data after create
      await loadContextData();
      return result;
    } catch (error) {
      console.error("[ContextProvider] Failed to create person:", error);
      return null;
    }
  }, [loadContextData]);

  const updatePerson = useCallback(async (
    personId: string, 
    data: Partial<ContextPersonCreate>, 
    expectedVersion?: number
  ): Promise<ContextPerson | null> => {
    try {
      const result = await apiClient.updatePerson(personId, data, expectedVersion);
      // Reload context data after update
      await loadContextData();
      return result;
    } catch (error) {
      console.error(`[ContextProvider] Failed to update person ${personId}:`, error);
      return null;
    }
  }, [loadContextData]);

  const deletePerson = useCallback(async (personId: string): Promise<boolean> => {
    try {
      await apiClient.deletePerson(personId);
      // Reload context data after delete
      await loadContextData();
      return true;
    } catch (error) {
      console.error(`[ContextProvider] Failed to delete person ${personId}:`, error);
      return false;
    }
  }, [loadContextData]);

  // Entities operations
  const getEntities = useCallback(async (params?: {
    category?: 'onsite' | 'offsite';
    section?: string;
    limit?: number;
    offset?: number;
    include_deleted?: boolean;
  }): Promise<{ items: ContextEntity[]; total: number } | null> => {
    try {
      const response = await apiClient.getEntities(params);
      return { items: response.items, total: response.total };
    } catch (error) {
      console.error("[ContextProvider] Failed to get entities:", error);
      return null;
    }
  }, []);

  const createEntity = useCallback(async (data: ContextEntityCreate): Promise<ContextEntity | null> => {
    try {
      const result = await apiClient.createEntity(data);
      // Reload context data after create
      await loadContextData();
      return result;
    } catch (error) {
      console.error("[ContextProvider] Failed to create entity:", error);
      return null;
    }
  }, [loadContextData]);

  const updateEntity = useCallback(async (
    entityId: string, 
    data: Partial<ContextEntityCreate>, 
    expectedVersion?: number
  ): Promise<ContextEntity | null> => {
    try {
      const result = await apiClient.updateEntity(entityId, data, expectedVersion);
      // Reload context data after update
      await loadContextData();
      return result;
    } catch (error) {
      console.error(`[ContextProvider] Failed to update entity ${entityId}:`, error);
      return null;
    }
  }, [loadContextData]);

  const deleteEntity = useCallback(async (entityId: string): Promise<boolean> => {
    try {
      await apiClient.deleteEntity(entityId);
      // Reload context data after delete
      await loadContextData();
      return true;
    } catch (error) {
      console.error(`[ContextProvider] Failed to delete entity ${entityId}:`, error);
      return false;
    }
  }, [loadContextData]);

  // Reload context data
  const reloadContextData = useCallback(async (): Promise<void> => {
    console.log('[ContextProvider] reloadContextData called');
    await loadContextData();
  }, [loadContextData]);

  // Auto-refresh context data periodically - DISABLED
  // 禁用自动刷新，避免频繁调用 API
  // 可以通过手动调用 reloadContextData() 来刷新
  useEffect(() => {
    // DISABLED: 不再自动刷新
    // 如果需要刷新，请手动调用 reloadContextData()
    
    // 只保留页面可见性变化时的刷新（但增加节流）
    if (!isLoaded || !isAuthenticated) return;

    let lastRefreshTime = Date.now();
    const minRefreshInterval = 300000; // 最少 30 秒才能刷新一次

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastRefreshTime >= minRefreshInterval) {
          lastRefreshTime = now;
          console.log('[ContextProvider] Page became visible, refreshing context data');
          loadContextData().catch(error => {
            console.error("[ContextProvider] Visibility refresh failed:", error);
          });
        } else {
          console.log('[ContextProvider] Skipping refresh, too soon since last refresh');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isAuthenticated]); // Depend on both isLoaded and isAuthenticated

  // Refresh immediately when deep research completes
  const lastResearchStatusRef = useRef(deepResearchStatus);
  useEffect(() => {
    // Only trigger when status changes to "completed" AND user is authenticated
    if (isAuthenticated && deepResearchStatus === "completed" && lastResearchStatusRef.current !== "completed") {
      lastResearchStatusRef.current = "completed";
      loadContextData().catch(error => {
        console.error("[ContextProvider] Post-research refresh failed:", error);
      });
    } else if (deepResearchStatus !== "completed") {
      lastResearchStatusRef.current = deepResearchStatus;
    }
  }, [deepResearchStatus, isAuthenticated, loadContextData]);

  // Always provide context, even when loading
  return (
    <ContextMenuContext.Provider
      value={{
        contextData,
        updateOnSite,
        updateOffSite,
        updateKnowledge,
        setContextData,
        isContextEmpty,
        wizardOpen,
        setWizardOpen,
        deepResearchStatus,
        setDeepResearchStatus,
        onboardingStatus,
        setOnboardingStatus,
        // Context API CRUD Methods
        getContextStats,
        getSingleton,
        upsertSingleton,
        deleteSingleton: deleteSingletonMethod,
        getItems,
        getItem,
        createItem,
        updateItem,
        deleteItem,
        restoreItem,
        bulkDeleteItems,
        reorderItems,
        getPersons,
        createPerson,
        updatePerson,
        deletePerson,
        getEntities,
        createEntity,
        updateEntity,
        deleteEntity,
        reloadContextData,
        // 共享的文件列表数据
        filesData,
        setFilesData,
      }}
    >
      {children}
    </ContextMenuContext.Provider>
  );
}

// ============ Provider ============

interface ContextProviderProps {
  children: ReactNode;
}

export function ContextProvider({ children }: ContextProviderProps) {
  // Wrap children with ContextDataProvider for ssrc layout support
  return (
    <ContextDataProvider>
      <ContextProviderInner>{children}</ContextProviderInner>
    </ContextDataProvider>
  );
}

// Inner provider for file upload functionality
function ContextProviderInner({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const contextMenuData = useContext(ContextMenuContext);

  const [state, setState] = useState<ContextState>({
    files: [],
    totalSize: 0,
    maxSize: 50 * 1024 * 1024, // 50 MB default
    isLoading: false,
    isUploading: false,
    error: null,
  });

  // 防止重复加载的 ref
  const hasLoadedRef = useRef(false);

  // 加载文件列表 - 使用共享的数据而不是再次调用 API
  const loadFiles = useCallback(async () => {
    if (!isAuthenticated || !contextMenuData) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      // 如果 ContextDataProvider 已经加载了文件数据，直接使用
      const filesData = contextMenuData.filesData;
      if (filesData) {
        setState((prev) => ({
          ...prev,
          files: filesData.contexts || [],
          totalSize: filesData.totalSize || 0,
          maxSize: filesData.maxSize || 50 * 1024 * 1024,
          isLoading: false,
        }));
      } else {
        // 如果还没有数据，触发 ContextDataProvider 加载（它会同时加载 Context 数据和文件信息）
        // 这里不直接调用 API，而是等待 ContextDataProvider 加载完成
        setState((prev) => ({
          ...prev,
          isLoading: false,
        }));
      }
    } catch (error) {
      console.error("[ContextProvider] Failed to load files:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load files",
      }));
    }
  }, [isAuthenticated, contextMenuData]);

  // 初始加载 - 使用共享的数据
  useEffect(() => {
    if (!isAuthenticated || !contextMenuData || hasLoadedRef.current) {
      return;
    }

    // 如果 ContextDataProvider 已经提供了文件数据，直接使用
    const filesData = contextMenuData.filesData;
    if (filesData) {
      setState((prev) => ({
        ...prev,
        files: filesData.contexts || [],
        totalSize: filesData.totalSize || 0,
        maxSize: filesData.maxSize || 50 * 1024 * 1024,
      }));
      hasLoadedRef.current = true;
    }
  }, [isAuthenticated, contextMenuData]);

  // 监听 filesData 的变化，自动更新文件列表
  useEffect(() => {
    if (contextMenuData?.filesData) {
      setState((prev) => ({
        ...prev,
        files: contextMenuData.filesData!.contexts || [],
        totalSize: contextMenuData.filesData!.totalSize || 0,
        maxSize: contextMenuData.filesData!.maxSize || 50 * 1024 * 1024,
      }));
    }
  }, [contextMenuData?.filesData]);

  // 上传文件
  const uploadFile = useCallback(async (file: File, filename?: string): Promise<ContextFile | null> => {
    // 验证文件类型
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!SUPPORTED_TYPES.includes(ext)) {
      setState((prev) => ({
        ...prev,
        error: `Unsupported file type. Supported: ${SUPPORTED_TYPES.join(", ")}`,
      }));
      return null;
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      setState((prev) => ({
        ...prev,
        error: `File too large. Maximum size: 5 MB`,
      }));
      return null;
    }

    // 检查存储空间
    if (state.totalSize + file.size > state.maxSize) {
      setState((prev) => ({
        ...prev,
        error: `Not enough storage space`,
      }));
      return null;
    }

    setState((prev) => ({ ...prev, isUploading: true, error: null }));
    try {
      const newFile = await apiClient.uploadContextFile(file, filename);
      setState((prev) => ({
        ...prev,
        files: [...prev.files, newFile],
        totalSize: prev.totalSize + file.size,
        isUploading: false,
      }));
      
      // 同步更新共享的文件数据
      if (contextMenuData?.setFilesData && contextMenuData.filesData) {
        contextMenuData.setFilesData({
          ...contextMenuData.filesData,
          contexts: [...contextMenuData.filesData.contexts, newFile],
          totalSize: contextMenuData.filesData.totalSize + file.size,
        });
      }
      
      return newFile;
    } catch (error) {
      console.error("[ContextProvider] Failed to upload file:", error);
      setState((prev) => ({
        ...prev,
        isUploading: false,
        error: error instanceof Error ? error.message : "Failed to upload file",
      }));
      return null;
    }
  }, [state.totalSize, state.maxSize, contextMenuData]);

  // 删除文件
  const deleteFile = useCallback(async (contextId: string): Promise<boolean> => {
    try {
      await apiClient.deleteContextFile(contextId);
      const deletedFile = state.files.find((f) => f.id === contextId);
      setState((prev) => ({
        ...prev,
        files: prev.files.filter((f) => f.id !== contextId),
        totalSize: deletedFile ? prev.totalSize - deletedFile.fileSize : prev.totalSize,
      }));
      
      // 同步更新共享的文件数据
      if (contextMenuData?.setFilesData && contextMenuData.filesData) {
        const updatedFiles = contextMenuData.filesData.contexts.filter((f) => f.id !== contextId);
        contextMenuData.setFilesData({
          ...contextMenuData.filesData,
          contexts: updatedFiles,
          totalSize: deletedFile ? contextMenuData.filesData.totalSize - deletedFile.fileSize : contextMenuData.filesData.totalSize,
        });
      }
      
      return true;
    } catch (error) {
      console.error("[ContextProvider] Failed to delete file:", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to delete file",
      }));
      return false;
    }
  }, [state.files, contextMenuData]);

  // 搜索上下文
  const searchContext = useCallback(async (
    query: string,
    options?: { top_k?: number; similarity_threshold?: number }
  ): Promise<ContextSearchResult[]> => {
    try {
      const response = await apiClient.searchContext(query, options);
      return response.results;
    } catch (error) {
      console.error("[ContextProvider] Failed to search context:", error);
      return [];
    }
  }, []);

  // 获取文件内容
  const getFileContent = useCallback(async (contextId: string): Promise<ContextContentResponse | null> => {
    try {
      return await apiClient.getContextFileContent(contextId);
    } catch (error) {
      console.error("[ContextProvider] Failed to get file content:", error);
      return null;
    }
  }, []);

  // 获取文件分块
  const getFileChunks = useCallback(async (contextId: string): Promise<ContextChunksResponse | null> => {
    try {
      return await apiClient.getContextFileChunks(contextId);
    } catch (error) {
      console.error("[ContextProvider] Failed to get file chunks:", error);
      return null;
    }
  }, []);

  // 下载文件
  const downloadFile = useCallback(async (contextId: string, filename: string): Promise<void> => {
    try {
      await apiClient.downloadContextFile(contextId, filename);
    } catch (error) {
      console.error("[ContextProvider] Failed to download file:", error);
      throw error;
    }
  }, []);

  // 计算属性
  const usagePercent = useMemo(() => {
    return state.maxSize > 0 ? (state.totalSize / state.maxSize) * 100 : 0;
  }, [state.totalSize, state.maxSize]);

  const readyFilesCount = useMemo(() => {
    return state.files.filter((f) => f.status === "ready").length;
  }, [state.files]);

  // Context value
  const value = useMemo<ContextContextValue>(() => ({
    ...state,
    loadFiles,
    uploadFile,
    deleteFile,
    searchContext,
    getFileContent,
    getFileChunks,
    downloadFile,
    usagePercent,
    readyFilesCount,
  }), [state, loadFiles, uploadFile, deleteFile, searchContext, getFileContent, getFileChunks, downloadFile, usagePercent, readyFilesCount]);

  return (
    <ContextContext.Provider value={value}>
      {children}
    </ContextContext.Provider>
  );
}

// ============ Hook ============

export function useContextFiles(): ContextContextValue {
  const context = useContext(ContextContext);
  if (!context) {
    throw new Error("useContextFiles must be used within ContextProvider");
  }
  return context;
}

// Hook for Context Menu (ssrc layout)
export function useContextMenu() {
  const context = useContext(ContextMenuContext);
  if (context === undefined) {
    throw new Error("useContextMenu must be used within a ContextProvider");
  }
  return context;
}

