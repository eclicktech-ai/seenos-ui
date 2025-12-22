"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import {
  apiClient,
  type Project,
  type CreateProjectRequest,
  type UpdateProjectRequest,
  type ValidateUrlResponse,
} from "@/lib/api/client";
import { useAuth } from "./AuthProvider";

// ============ 类型定义 ============

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  total: number;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

interface ProjectContextValue extends ProjectState {
  // 操作方法
  loadProjects: () => Promise<void>;
  createProject: (data: CreateProjectRequest) => Promise<Project | null>;
  getProject: (projectId: string) => Promise<Project | null>;
  updateProject: (projectId: string, data: UpdateProjectRequest) => Promise<Project | null>;
  validateUrl: (url: string) => Promise<ValidateUrlResponse | null>;
  setCurrentProject: (project: Project | null) => void;
  // 辅助方法
  clearError: () => void;
}

// ============ Context ============

const ProjectContext = createContext<ProjectContextValue | null>(null);

// ============ Provider 组件 ============

interface ProjectProviderProps {
  children: ReactNode;
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const { isAuthenticated } = useAuth();

  // 状态
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============ 加载项目列表 ============
  const loadProjects = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.getProjects();
      setProjects(response.projects);
      setTotal(response.total);
    } catch (err: any) {
      console.error("[ProjectProvider] Failed to load projects:", err);
      setError(err.message || "Failed to load projects");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // ============ 创建项目 ============
  const createProject = useCallback(async (data: CreateProjectRequest): Promise<Project | null> => {
    if (!isAuthenticated) {
      setError("Not authenticated");
      return null;
    }

    setIsSaving(true);
    setError(null);

    try {
      const project = await apiClient.createProject(data);
      setProjects((prev) => [project, ...prev]);
      setTotal((prev) => prev + 1);
      setCurrentProject(project);
      return project;
    } catch (err: any) {
      console.error("[ProjectProvider] Failed to create project:", err);
      setError(err.message || "Failed to create project");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [isAuthenticated]);

  // ============ 获取项目详情 ============
  const getProject = useCallback(async (projectId: string): Promise<Project | null> => {
    if (!isAuthenticated) {
      setError("Not authenticated");
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const project = await apiClient.getProject(projectId);
      setCurrentProject(project);
      return project;
    } catch (err: any) {
      console.error("[ProjectProvider] Failed to get project:", err);
      setError(err.message || "Failed to get project");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // ============ 更新项目 ============
  const updateProject = useCallback(async (
    projectId: string,
    data: UpdateProjectRequest
  ): Promise<Project | null> => {
    if (!isAuthenticated) {
      setError("Not authenticated");
      return null;
    }

    setIsSaving(true);
    setError(null);

    try {
      const updatedProject = await apiClient.updateProject(projectId, data);
      
      // 更新列表中的项目
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? updatedProject : p))
      );
      
      // 更新当前项目（如果是当前项目）
      if (currentProject?.id === projectId) {
        setCurrentProject(updatedProject);
      }
      
      return updatedProject;
    } catch (err: any) {
      console.error("[ProjectProvider] Failed to update project:", err);
      setError(err.message || "Failed to update project");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [isAuthenticated, currentProject]);

  // ============ 验证 URL ============
  const validateUrl = useCallback(async (url: string): Promise<ValidateUrlResponse | null> => {
    if (!isAuthenticated) {
      setError("Not authenticated");
      return null;
    }

    setError(null);

    try {
      const response = await apiClient.validateProjectUrl(url);
      return response;
    } catch (err: any) {
      console.error("[ProjectProvider] Failed to validate URL:", err);
      setError(err.message || "Failed to validate URL");
      return null;
    }
  }, [isAuthenticated]);

  // ============ 清除错误 ============
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============ 初始化：自动加载项目 ============
  useEffect(() => {
    if (isAuthenticated) {
      loadProjects();
    } else {
      // 未登录时清空状态
      setProjects([]);
      setCurrentProject(null);
      setTotal(0);
      setError(null);
    }
  }, [isAuthenticated, loadProjects]);

  // ============ Context Value ============
  const value: ProjectContextValue = {
    projects,
    currentProject,
    total,
    isLoading,
    isSaving,
    error,
    loadProjects,
    createProject,
    getProject,
    updateProject,
    validateUrl,
    setCurrentProject,
    clearError,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

// ============ Hook ============

/**
 * useProject - 获取项目管理功能
 * 
 * @example
 * ```tsx
 * const { projects, createProject, isLoading } = useProject();
 * 
 * // 创建项目
 * const newProject = await createProject({
 *   name: "My Website",
 *   url: "https://example.com"
 * });
 * ```
 */
export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within ProjectProvider");
  }
  return context;
}

