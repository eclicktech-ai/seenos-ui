"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api/client";
import type { Playbook, PlaybookCategory } from "@/data/playbooks";
import type { PlaybooksResponse, ApiPlaybook } from "@/lib/api/client";
import { useAuth } from "@/providers/AuthProvider";

// ============ 类型定义 ============

interface UsePlaybooksOptions {
  /** 类别过滤 */
  category?: PlaybookCategory;
  /** 只返回活跃的 playbooks */
  active_only?: boolean;
}

// ============ 数据转换函数 ============

/**
 * 将 API 返回的类别字符串转换为前端的 PlaybookCategory
 */
function normalizeCategory(category: string): PlaybookCategory {
  const lower = category.toLowerCase().trim();
  // 支持多种可能的格式：Research, research, RESEARCH 等
  if (lower === 'research' || lower.startsWith('research')) {
    return 'research';
  }
  if (lower === 'build' || lower.startsWith('build')) {
    return 'build';
  }
  if (lower === 'optimize' || lower.startsWith('optimize')) {
    return 'optimize';
  }
  if (lower === 'monitor' || lower.startsWith('monitor')) {
    return 'monitor';
  }
  // 默认返回 research
  return 'research';
}

/**
 * 将 API 返回的 Playbook 数据转换为前端的 Playbook 类型
 */
function transformApiPlaybook(apiPlaybook: ApiPlaybook, category: PlaybookCategory): Playbook {
  return {
    id: apiPlaybook.id,
    title: apiPlaybook.name,
    description: apiPlaybook.description,
    category: category, // 使用传入的 category（来自 categoryGroup）
    agentName: apiPlaybook.skill_id || apiPlaybook.name, // 使用 skill_id 或 name 作为 agentName
    autoActions: apiPlaybook.auto_actions || [],
    outputs: apiPlaybook.artifacts || [],
    tags: apiPlaybook.tags || [],
    // options 暂时为空，如果 API 后续支持配置选项，可以在这里添加
    options: apiPlaybook.has_configure ? [] : undefined,
  };
}

/**
 * 将 API 响应转换为前端的 Playbook 数组
 */
function transformPlaybooksResponse(response: PlaybooksResponse): Playbook[] {
  const playbooks: Playbook[] = [];
  
  for (const categoryGroup of response.categories) {
    // 使用 categoryGroup 的 category 作为主要类别（这是正确的分组）
    const normalizedCategory = normalizeCategory(categoryGroup.category);
    
    for (const apiPlaybook of categoryGroup.playbooks) {
      // 使用 categoryGroup 的类别，而不是 playbook 自己的 category
      playbooks.push(transformApiPlaybook(apiPlaybook, normalizedCategory));
    }
  }
  
  return playbooks;
}

// ============ Hook: 获取 Playbooks ============

export function usePlaybooks(options: UsePlaybooksOptions = {}) {
  const { isAuthenticated, token } = useAuth();
  const { category, active_only = true } = options;

  const { data, error, isLoading, mutate } = useSWR<Playbook[]>(
    isAuthenticated && token
      ? ['playbooks', category, active_only]
      : null,
    async () => {
      const response = await apiClient.getPlaybooks({
        category,
        active_only,
      });
      return transformPlaybooksResponse(response);
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1分钟内相同请求去重
    }
  );

  return {
    playbooks: data || [],
    isLoading,
    error,
    mutate,
  };
}

