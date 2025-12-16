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
import { apiClient, type ContextFile, type ContextListResponse, type ContextSearchResult, type ContextContentResponse, type ContextChunksResponse } from "@/lib/api/client";
import { useAuth } from "./AuthProvider";
import { ContextData, initialContextData, OnSiteContext, OffSiteContext, KnowledgeContext } from "@/app/types/context";

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
}

const ContextMenuContext = createContext<ContextContextType | undefined>(undefined);

// Context Data Provider Component
function ContextDataProvider({ children }: { children: ReactNode }) {
  const [contextData, setContextDataState] = useState<ContextData>(initialContextData);
  const [isLoaded, setIsLoaded] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedContext = localStorage.getItem("deep-agents-context");
    if (savedContext) {
      try {
        const parsed = JSON.parse(savedContext);
        // Ensure structure matches current types (merge with initial)
        setContextDataState({
          ...initialContextData,
          ...parsed,
          onSite: { ...initialContextData.onSite, ...(parsed.onSite || {}) },
          offSite: { ...initialContextData.offSite, ...(parsed.offSite || {}) },
          knowledge: { ...initialContextData.knowledge, ...(parsed.knowledge || {}) },
        });
      } catch (e) {
        console.error("Failed to parse context data from localStorage", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("deep-agents-context", JSON.stringify(contextData));
    }
  }, [contextData, isLoaded]);

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

  if (!isLoaded) {
    return <>{children}</>; // Return children while loading
  }

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
  const isLoadingRef = useRef(false);

  // 加载文件列表
  const loadFiles = useCallback(async () => {
    if (!isAuthenticated) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response: ContextListResponse = await apiClient.getContextFiles();
      setState((prev) => ({
        ...prev,
        files: response.contexts || [],
        totalSize: response.totalSize || 0,
        maxSize: response.maxSize || 50 * 1024 * 1024,
        isLoading: false,
      }));
    } catch (error) {
      console.error("[ContextProvider] Failed to load files:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load files",
      }));
    }
  }, [isAuthenticated]);

  // 初始加载 - 使用 ref 防止重复调用
  useEffect(() => {
    // 防止重复加载（React Strict Mode 或依赖变化导致的重复执行）
    if (!isAuthenticated || hasLoadedRef.current || isLoadingRef.current) {
      return;
    }

    const doLoad = async () => {
      isLoadingRef.current = true;
      try {
        await loadFiles();
        hasLoadedRef.current = true;
      } finally {
        isLoadingRef.current = false;
      }
    };

    doLoad();
  }, [isAuthenticated, loadFiles]);

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
  }, [state.totalSize, state.maxSize]);

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
      return true;
    } catch (error) {
      console.error("[ContextProvider] Failed to delete file:", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to delete file",
      }));
      return false;
    }
  }, [state.files]);

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

