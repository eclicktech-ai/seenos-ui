"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Message } from "@/types";
import { extractStringFromMessageContent, formatConversationForLLM } from "@/app/utils/utils";

export interface Suggestion {
  short: string;
  full: string;
}

// Default suggestions when no context is available
const DEFAULT_SUGGESTIONS: Suggestion[] = [
  {
    short: "Research this",
    full: "Please help me conduct thorough research on this topic. I'd like you to explore multiple perspectives, gather relevant data and statistics, identify key experts and sources, and provide a comprehensive overview of the current state of knowledge in this area."
  },
  {
    short: "Summarize points",
    full: "Please summarize the key points from our conversation so far. Highlight the most important insights, decisions made, action items identified, and any outstanding questions that still need to be addressed. Organize the summary in a clear and structured format."
  },
  {
    short: "Next steps",
    full: "Based on our discussion, what are the recommended next steps I should take? Please provide a prioritized list of actions with clear explanations for each, including any dependencies, estimated effort, and potential risks or considerations I should be aware of."
  },
  {
    short: "Explain details",
    full: "Please explain this concept in more detail. Break it down into simpler components, provide relevant examples and analogies, clarify any technical terms, and help me understand both the fundamentals and the nuances of this topic."
  },
  {
    short: "Create plan",
    full: "Help me create a comprehensive plan for this project or goal. Include clear objectives, milestones, timelines, resource requirements, potential challenges and mitigation strategies, and success metrics. Structure the plan in phases if appropriate."
  },
  {
    short: "Find related",
    full: "Please help me find related information, resources, and connections to this topic. Identify relevant articles, studies, tools, communities, or experts that could provide additional insights. Explain how each resource relates to my current needs."
  },
  {
    short: "Compare options",
    full: "Please compare the different options or approaches we've discussed. Create a structured comparison covering pros and cons, costs and benefits, risks and opportunities, and provide a recommendation based on the specific criteria and constraints of my situation."
  },
  {
    short: "Generate ideas",
    full: "Help me brainstorm and generate creative ideas for this challenge. Think outside the box, consider unconventional approaches, draw inspiration from different domains, and provide a diverse range of options from practical to innovative solutions."
  },
  {
    short: "Review improve",
    full: "Please review what we have so far and suggest improvements. Identify areas that could be strengthened, point out any gaps or inconsistencies, recommend specific enhancements, and help me elevate the quality and effectiveness of this work."
  },
  {
    short: "Key questions",
    full: "What are the most important questions I should be asking about this topic or situation? Help me identify blind spots, critical considerations I might have missed, and the key inquiries that will lead to better understanding and decision-making."
  },
  {
    short: "Identify issues",
    full: "Please help me identify potential issues, risks, or problems that could arise. Consider technical, practical, and strategic perspectives. For each issue identified, suggest possible mitigation strategies or preventive measures I could implement."
  },
  {
    short: "Best practices",
    full: "What are the industry best practices and proven approaches for this type of situation? Share relevant frameworks, methodologies, and lessons learned from successful implementations. Help me understand what separates good execution from great execution."
  },
  {
    short: "Simplify this",
    full: "Please help me simplify this concept or process. Break it down into its most essential components, remove unnecessary complexity, and present it in a way that is easier to understand and implement. Focus on clarity and accessibility."
  },
  {
    short: "Provide examples",
    full: "Please provide concrete examples that illustrate this concept or approach. Include real-world scenarios, case studies, or practical demonstrations that help me understand how this applies in different contexts and situations."
  },
  {
    short: "Analyze deeper",
    full: "Help me analyze this topic more deeply. Look beyond the surface level, examine underlying patterns and relationships, consider different angles and perspectives, and provide insights that reveal the deeper significance and implications."
  },
  {
    short: "Create checklist",
    full: "Please create a comprehensive checklist for this task or project. Include all the essential steps, important considerations, quality checks, and verification points that I should address to ensure thorough and successful completion."
  },
  {
    short: "Suggest tools",
    full: "What tools, technologies, or resources would you recommend for this task? Please provide specific suggestions with brief explanations of why each tool is suitable, including any alternatives and considerations for different use cases."
  },
  {
    short: "Estimate effort",
    full: "Help me estimate the time, resources, and effort required for this task or project. Consider different scenarios, identify factors that could affect the timeline, and provide realistic expectations along with any assumptions made."
  },
  {
    short: "Explore alternatives",
    full: "Please explore alternative approaches or solutions to this problem. Present different options I might not have considered, compare their trade-offs, and help me understand which alternatives might work best under different circumstances."
  },
  {
    short: "Validate approach",
    full: "Please help me validate this approach or solution. Review the logic and assumptions, identify potential weaknesses or blind spots, suggest improvements, and confirm whether this is a sound and viable path forward."
  },
];

// LocalStorage key for suggestions cache
const SUGGESTIONS_CACHE_KEY = "seenos-suggestions-cache";

// Helper to get cached suggestions from localStorage
function getCachedSuggestions(cacheKey: string): Suggestion[] | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(SUGGESTIONS_CACHE_KEY);
    if (!cached) return null;
    const cacheMap = JSON.parse(cached) as Record<string, Suggestion[]>;
    return cacheMap[cacheKey] || null;
  } catch {
    return null;
  }
}

// Helper to save suggestions to localStorage cache
function saveSuggestionsToCache(cacheKey: string, suggestions: Suggestion[]): void {
  if (typeof window === "undefined") return;
  try {
    const cached = localStorage.getItem(SUGGESTIONS_CACHE_KEY);
    const cacheMap: Record<string, Suggestion[]> = cached ? JSON.parse(cached) : {};
    cacheMap[cacheKey] = suggestions;
    
    // Limit cache size to prevent localStorage from growing too large (keep last 50 entries)
    const keys = Object.keys(cacheMap);
    if (keys.length > 50) {
      const keysToRemove = keys.slice(0, keys.length - 50);
      keysToRemove.forEach(key => delete cacheMap[key]);
    }
    
    localStorage.setItem(SUGGESTIONS_CACHE_KEY, JSON.stringify(cacheMap));
  } catch (error) {
    console.warn("Failed to save suggestions to cache:", error);
  }
}

interface UseSuggestionsProps {
  cid: string | null;
  messages: Message[];
  isLoading: boolean;
  /** Suggestions from agent response (if available) */
  agentSuggestions?: Suggestion[];
}

export function useSuggestions({
  cid,
  messages,
  isLoading,
  agentSuggestions,
}: UseSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>(DEFAULT_SUGGESTIONS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const prevIsLoadingRef = useRef(isLoading);
  const lastMessageIdRef = useRef<string | null>(null);
  const prevAgentSuggestionsRef = useRef<Suggestion[] | undefined>(undefined);

  // Use agent suggestions if available
  useEffect(() => {
    if (agentSuggestions && agentSuggestions.length > 0) {
      // Only update if agent suggestions actually changed
      if (JSON.stringify(agentSuggestions) !== JSON.stringify(prevAgentSuggestionsRef.current)) {
        console.log("Using suggestions from agent response:", agentSuggestions.length);
        setSuggestions(agentSuggestions);
        prevAgentSuggestionsRef.current = agentSuggestions;
        
        // Also cache them for future use
        const cacheKey = cid || "new";
        const lastAIMessage = messages.find((m) => m.role === "assistant");
        if (lastAIMessage?.id) {
          saveSuggestionsToCache(`${cacheKey}_${lastAIMessage.id}`, agentSuggestions);
        }
      }
    }
  }, [agentSuggestions, cid, messages]);

  // Get the last AI message content for context
  const getLastAIMessageContext = useCallback(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        return {
          id: messages[i].id,
          content: extractStringFromMessageContent(messages[i]),
        };
      }
    }
    return null;
  }, [messages]);

  // Load cached suggestions when thread changes or messages are loaded
  useEffect(() => {
    const cacheKey = cid || "new";
    const lastAIMessage = getLastAIMessageContext();
    
    if (lastAIMessage) {
      const cachedKey = `${cacheKey}_${lastAIMessage.id}`;
      
      // Check localStorage cache first
      const cachedSuggestions = getCachedSuggestions(cachedKey);
      if (cachedSuggestions) {
        console.log("Thread loaded, using cached suggestions");
        setSuggestions(cachedSuggestions);
        lastMessageIdRef.current = lastAIMessage.id || null;
        return;
      }
      
      // If not cached and we have messages, use defaults for now
      // (In a full implementation, you could generate suggestions via API)
      if (lastAIMessage.id !== lastMessageIdRef.current && !isLoading) {
        lastMessageIdRef.current = lastAIMessage.id || null;
        // For now, just use defaults - can be enhanced later with API call
        setSuggestions(DEFAULT_SUGGESTIONS);
        return;
      }
    }
    
    // Reset to defaults for new threads with no messages
    if (messages.length === 0) {
      setSuggestions(DEFAULT_SUGGESTIONS);
      lastMessageIdRef.current = null;
    }
  }, [cid, messages.length, getLastAIMessageContext, isLoading]);

  // Watch for loading state changes (agent finished responding)
  useEffect(() => {
    const wasLoading = prevIsLoadingRef.current;
    prevIsLoadingRef.current = isLoading;

    // Detect when loading transitions from true to false (agent finished)
    if (wasLoading && !isLoading && messages.length > 0) {
      const lastAIMessage = getLastAIMessageContext();
      
      // Only refresh if the last AI message changed AND not already cached
      if (lastAIMessage && lastAIMessage.id !== lastMessageIdRef.current) {
        const cacheKey = cid || "new";
        const cachedKey = `${cacheKey}_${lastAIMessage.id}`;
        
        // Check cache first before triggering load
        const cachedSuggestions = getCachedSuggestions(cachedKey);
        if (cachedSuggestions) {
          console.log("Agent finished, using cached suggestions");
          setSuggestions(cachedSuggestions);
          lastMessageIdRef.current = lastAIMessage.id || null;
        } else {
          lastMessageIdRef.current = lastAIMessage.id || null;
          // For now, just use defaults - can be enhanced later with API call
          setSuggestions(DEFAULT_SUGGESTIONS);
        }
      }
    }
  }, [isLoading, messages.length, cid, getLastAIMessageContext]);

  return {
    suggestions,
    isRefreshing,
  };
}

