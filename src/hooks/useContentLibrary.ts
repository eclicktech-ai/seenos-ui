"use client";

/**
 * useContentLibrary Hook
 * 
 * Manages content library state: projects, topic clusters, and content items.
 * Based on STRUCTURED_CONTENT_FRONTEND_GUIDE.md specification.
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { apiClient } from "@/lib/api/client";
import type {
  Project,
  TopicClusterResponse,
  ContentItemSummary,
  ContentItemDetailResponse,
} from "@/lib/api/client";

// ============ Types ============

export interface UseContentLibraryOptions {
  /** Default selected project ID */
  projectId?: string;
  /** Whether to auto-load */
  autoLoad?: boolean;
  /** Error callback */
  onError?: (error: Error) => void;
}

export interface UseContentLibraryReturn {
  /** Projects list */
  projects: Project[];
  /** Topic clusters list */
  clusters: TopicClusterResponse[];
  /** Content items list */
  items: ContentItemSummary[];
  /** Selected project ID */
  selectedProject: string | null;
  /** Selected cluster ID */
  selectedCluster: string | null;
  /** Selected content item detail */
  selectedItem: ContentItemDetailResponse | null;
  /** Set selected project */
  setSelectedProject: (id: string | null) => void;
  /** Set selected cluster */
  setSelectedCluster: (id: string | null) => void;
  /** Load content item detail */
  loadItemDetail: (itemId: string) => Promise<void>;
  /** Whether loading */
  loading: boolean;
  /** Error info */
  error: Error | null;
  /** Refresh data */
  refresh: () => Promise<void>;
  /** Refresh content items list */
  refreshItems: () => Promise<void>;
  /** Stats info */
  stats: {
    projectCount: number;
    clusterCount: number;
    itemCount: number;
  };
}

// ============ Hook Implementation ============

export function useContentLibrary({
  projectId: initialProjectId,
  autoLoad = true,
  onError,
}: UseContentLibraryOptions = {}): UseContentLibraryReturn {
  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [clusters, setClusters] = useState<TopicClusterResponse[]>([]);
  const [items, setItems] = useState<ContentItemSummary[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(initialProjectId || null);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ContentItemDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // ============ Load Projects ============

  const loadProjects = useCallback(async () => {
    try {
      const data = await apiClient.getProjects();
      setProjects(data.projects);
      
      // If no project selected, auto-select the first one
      if (!selectedProject && data.projects.length > 0) {
        setSelectedProject(data.projects[0].id);
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error("Failed to load projects");
      setError(err);
      onError?.(err);
    }
  }, [selectedProject, onError]);

  // ============ Load Clusters ============

  const loadClusters = useCallback(async () => {
    if (!selectedProject) {
      setClusters([]);
      return;
    }

    try {
      const data = await apiClient.getProjectClusters(selectedProject);
      setClusters(data.clusters);
    } catch (e) {
      const err = e instanceof Error ? e : new Error("Failed to load clusters");
      setError(err);
      onError?.(err);
    }
  }, [selectedProject, onError]);

  // ============ Load Content Items ============

  const loadItems = useCallback(async () => {
    if (!selectedProject) {
      setItems([]);
      return;
    }

    try {
      let data;
      if (selectedCluster) {
        // Load specific cluster items
        data = await apiClient.getClusterItems(selectedProject, selectedCluster);
      } else {
        // Load all project items
        data = await apiClient.getProjectItems(selectedProject);
      }
      setItems(data.items);
    } catch (e) {
      const err = e instanceof Error ? e : new Error("Failed to load items");
      setError(err);
      onError?.(err);
    }
  }, [selectedProject, selectedCluster, onError]);

  // ============ Load Content Item Detail ============

  const loadItemDetail = useCallback(async (itemId: string) => {
    if (!selectedProject) return;

    try {
      const detail = await apiClient.getContentItemDetail(selectedProject, itemId);
      setSelectedItem(detail);
    } catch (e) {
      const err = e instanceof Error ? e : new Error("Failed to load item detail");
      setError(err);
      onError?.(err);
    }
  }, [selectedProject, onError]);

  // ============ Full Refresh ============

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await loadProjects();
    } finally {
      setLoading(false);
    }
  }, [loadProjects]);

  // ============ Refresh Items ============

  const refreshItems = useCallback(async () => {
    await loadItems();
  }, [loadItems]);

  // ============ Auto Load ============

  // Initial load projects
  useEffect(() => {
    if (autoLoad) {
      refresh();
    }
  }, [autoLoad]); // Only run on mount

  // Load clusters when project changes
  useEffect(() => {
    if (selectedProject) {
      loadClusters();
      // Reset cluster selection
      setSelectedCluster(null);
    }
  }, [selectedProject, loadClusters]);

  // Load items when project or cluster changes
  useEffect(() => {
    if (selectedProject) {
      loadItems();
    }
  }, [selectedProject, selectedCluster, loadItems]);

  // ============ Handle Project Selection ============

  const handleSetSelectedProject = useCallback((id: string | null) => {
    setSelectedProject(id);
    setSelectedCluster(null);
    setSelectedItem(null);
  }, []);

  // ============ Handle Cluster Selection ============

  const handleSetSelectedCluster = useCallback((id: string | null) => {
    setSelectedCluster(id);
    setSelectedItem(null);
  }, []);

  // ============ Stats ============

  const stats = useMemo(() => ({
    projectCount: projects.length,
    clusterCount: clusters.length,
    itemCount: items.length,
  }), [projects.length, clusters.length, items.length]);

  // ============ Return ============

  return useMemo(
    () => ({
      projects,
      clusters,
      items,
      selectedProject,
      selectedCluster,
      selectedItem,
      setSelectedProject: handleSetSelectedProject,
      setSelectedCluster: handleSetSelectedCluster,
      loadItemDetail,
      loading,
      error,
      refresh,
      refreshItems,
      stats,
    }),
    [
      projects,
      clusters,
      items,
      selectedProject,
      selectedCluster,
      selectedItem,
      handleSetSelectedProject,
      handleSetSelectedCluster,
      loadItemDetail,
      loading,
      error,
      refresh,
      refreshItems,
      stats,
    ]
  );
}

export default useContentLibrary;
