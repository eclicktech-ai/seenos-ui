"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  StandaloneConfig,
  ApiProvider,
  ModelOverrides,
  OpenRouterConfig,
  validateAndFetchModels,
} from "@/lib/config";
import { CheckCircle, XCircle, Loader2, Link, Key, Cpu, ExternalLink, Power, Wrench } from "lucide-react";

interface ConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: StandaloneConfig) => void;
  initialConfig?: StandaloneConfig;
}

interface ApiKeyFieldProps {
  id: string;
  provider: ApiProvider;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  isActive: boolean;
  onToggle: () => void;
  models: string[];
  selectedModel: string;
  onModelSelect: (model: string) => void;
  onValidate: () => void;
  isValidating: boolean;
  validationStatus: "idle" | "success" | "error";
  validationError?: string;
  showModelSelect: boolean;
  keyUrl?: string;
}

function ApiKeyField({
  id,
  provider,
  label,
  placeholder,
  value,
  onChange,
  isActive,
  onToggle,
  models,
  selectedModel,
  onModelSelect,
  onValidate,
  isValidating,
  validationStatus,
  validationError,
  showModelSelect,
  keyUrl,
}: ApiKeyFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <div
      className="grid gap-2 rounded-lg border p-3"
      style={{
        borderColor: isActive ? "var(--color-primary)" : "var(--color-border)",
        backgroundColor: isActive
          ? "rgba(var(--color-primary-rgb), 0.05)"
          : "transparent",
      }}
    >
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="flex items-center gap-2">
          {label}
          {keyUrl && (
            <a
              href={keyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Get API Key"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {isActive && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
              Active
            </span>
          )}
          {validationStatus === "success" && (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
          {validationStatus === "error" && (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
        </Label>
        <Switch
          checked={isActive}
          onCheckedChange={onToggle}
          aria-label={`Enable ${label}`}
        />
      </div>

      <div className="flex gap-2">
        <Input
          id={id}
          type={isFocused ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="flex-1"
        />
          <Button
            variant="outline"
            size="sm"
            onClick={onValidate}
            disabled={!value || isValidating}
            className="whitespace-nowrap"
          >
            {isValidating ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify"
            )}
          </Button>
      </div>

      {validationError && isActive && (
        <p className="text-xs text-red-500">{validationError}</p>
      )}

      {showModelSelect && models.length > 0 && isActive && (
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">Model:</Label>
          <Select value={selectedModel} onValueChange={onModelSelect}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

type TabId = "general" | "api-keys" | "model-config" | "tools";

export function ConfigDialog({
  open,
  onOpenChange,
  onSave,
  initialConfig,
}: ConfigDialogProps) {
  const [deploymentUrl, setDeploymentUrl] = useState(
    initialConfig?.deploymentUrl || "http://127.0.0.1:2024"
  );
  const [assistantId, setAssistantId] = useState(
    initialConfig?.assistantId || "agent"
  );
  const [isRestarting, setIsRestarting] = useState(false);
  const [isBackendRunning, setIsBackendRunning] = useState(false);
  const [openaiApiKey, setOpenaiApiKey] = useState(
    initialConfig?.openaiApiKey || ""
  );
  const [anthropicApiKey, setAnthropicApiKey] = useState(
    initialConfig?.anthropicApiKey || ""
  );
  const [googleApiKey, setGoogleApiKey] = useState(
    initialConfig?.googleApiKey || ""
  );
  const [serpApiKey, setSerpApiKey] = useState(
    initialConfig?.serpApiKey || ""
  );
  const [exaApiKey, setExaApiKey] = useState(
    initialConfig?.exaApiKey || ""
  );
  const [tavilyApiKey, setTavilyApiKey] = useState(
    initialConfig?.tavilyApiKey || ""
  );
  const [perplexityApiKey, setPerplexityApiKey] = useState(
    initialConfig?.perplexityApiKey || ""
  );
  
  // Tool enable/disable state (default all to true)
  const [enabledTools, setEnabledTools] = useState({
    fetch_url: initialConfig?.enabledTools?.fetch_url ?? true,
    // SerpAPI tools
    serpapi_search: initialConfig?.enabledTools?.serpapi_search ?? true,
    // Exa tools
    exa_search: initialConfig?.enabledTools?.exa_search ?? true,
    exa_contents: initialConfig?.enabledTools?.exa_contents ?? true,
    exa_find_similar: initialConfig?.enabledTools?.exa_find_similar ?? true,
    exa_answer: initialConfig?.enabledTools?.exa_answer ?? true,
    exa_research: initialConfig?.enabledTools?.exa_research ?? true,
    // Tavily tools
    tavily_search: initialConfig?.enabledTools?.tavily_search ?? true,
    tavily_extract: initialConfig?.enabledTools?.tavily_extract ?? true,
    tavily_map: initialConfig?.enabledTools?.tavily_map ?? true,
    tavily_crawl: initialConfig?.enabledTools?.tavily_crawl ?? true,
    perplexity_search: initialConfig?.enabledTools?.perplexity_search ?? true,
    perplexity_chat: initialConfig?.enabledTools?.perplexity_chat ?? true,
  });
  // OpenAI Compatible API configuration (OpenRouter, Together, Groq, etc.)
  const [openRouterConfig, setOpenRouterConfig] = useState<OpenRouterConfig>(
    initialConfig?.openRouterConfig || { baseUrl: "", apiKey: "" }
  );
  // Store API keys for each OpenAI Compatible provider separately
  const [openAICompatibleApiKeys, setOpenAICompatibleApiKeys] = useState<Record<string, string>>(
    initialConfig?.openAICompatibleApiKeys || {}
  );
  
  // Focus states for API key fields (show plaintext when focused, password when not)
  const [openRouterKeyFocused, setOpenRouterKeyFocused] = useState(false);
  const [serpKeyFocused, setSerpKeyFocused] = useState(false);
  const [exaKeyFocused, setExaKeyFocused] = useState(false);
  const [tavilyKeyFocused, setTavilyKeyFocused] = useState(false);
  const [perplexityKeyFocused, setPerplexityKeyFocused] = useState(false);
  // Preset providers for OpenAI Compatible API
  const openAICompatiblePresets = [
    { name: "OpenRouter", url: "https://openrouter.ai/api/v1", keyUrl: "https://openrouter.ai/settings/keys" },
    { name: "DeerAPI", url: "https://api.deerapi.com/v1", keyUrl: "https://api.deerapi.com/token" },
    { name: "ZenMux", url: "https://zenmux.ai/api/v1", keyUrl: "https://zenmux.ai/settings/keys" },
    { name: "Together AI", url: "https://api.together.xyz/v1", keyUrl: "https://api.together.xyz/settings/api-keys" },
    { name: "Groq", url: "https://api.groq.com/openai/v1", keyUrl: "https://console.groq.com/keys" },
    { name: "Fireworks", url: "https://api.fireworks.ai/inference/v1", keyUrl: "https://fireworks.ai/account/api-keys" },
    { name: "Ollama (Local)", url: "http://localhost:11434/v1", keyUrl: "" },
    { name: "Custom", url: "", keyUrl: "" },
  ];
  const [selectedPreset, setSelectedPreset] = useState<string>(() => {
    // Find matching preset based on saved baseUrl
    const saved = initialConfig?.openRouterConfig?.baseUrl || "";
    if (!saved) return "";
    const match = openAICompatiblePresets.find(p => p.url === saved);
    return match ? match.name : "Custom";
  });
  const [activeProvider, setActiveProvider] = useState<ApiProvider>(
    initialConfig?.activeProvider || null
  );
  // Store selected model for each provider separately
  // For OpenAI Compatible (openrouter), keys can be "openrouter:DeerAPI", "openrouter:ZenMux", etc.
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>(() => {
    const saved = initialConfig?.selectedModels || {};
    
    // Migrate legacy "openrouter" key to "openrouter:${preset}" format
    if (saved.openrouter && initialConfig?.activeProvider === "openrouter") {
      const savedUrl = initialConfig?.openRouterConfig?.baseUrl || "";
      const match = openAICompatiblePresets.find(p => p.url === savedUrl);
      const presetName = match ? match.name : "Custom";
      const newKey = `openrouter:${presetName}`;
      
      // Only migrate if the new key doesn't exist
      if (!saved[newKey]) {
        saved[newKey] = saved.openrouter;
      }
    }
    
    return saved;
  });

  // Models state for each provider
  const [openaiModels, setOpenaiModels] = useState<string[]>([]);
  const [anthropicModels, setAnthropicModels] = useState<string[]>([]);
  const [googleModels, setGoogleModels] = useState<string[]>([]);
  const [openRouterModels, setOpenRouterModels] = useState<string[]>([]);

  // Advanced model overrides state - stored per provider
  // Migrate legacy global modelOverrides to per-provider structure
  const [modelOverridesByProvider, setModelOverridesByProvider] = useState<Record<string, ModelOverrides>>(() => {
    let result: Record<string, ModelOverrides> = {};
    
    // If new structure exists, use it as base
    if (initialConfig?.modelOverridesByProvider) {
      result = { ...initialConfig.modelOverridesByProvider };
    }
    
    // Migrate legacy global modelOverrides to current activeProvider
    if (initialConfig?.modelOverrides && initialConfig?.activeProvider) {
      let targetKey: string = initialConfig.activeProvider;
      
      // For openrouter, use the full key with preset name
      if (initialConfig.activeProvider === "openrouter") {
        const savedUrl = initialConfig?.openRouterConfig?.baseUrl || "";
        const match = openAICompatiblePresets.find(p => p.url === savedUrl);
        const presetName = match ? match.name : "Custom";
        targetKey = `openrouter:${presetName}`;
      }
      
      // Only migrate if the new key doesn't exist
      if (!result[targetKey]) {
        result[targetKey] = initialConfig.modelOverrides;
      }
    }
    
    // Also migrate "openrouter" key to "openrouter:${preset}" format
    if (result.openrouter && initialConfig?.activeProvider === "openrouter") {
      const savedUrl = initialConfig?.openRouterConfig?.baseUrl || "";
      const match = openAICompatiblePresets.find(p => p.url === savedUrl);
      const presetName = match ? match.name : "Custom";
      const newKey = `openrouter:${presetName}`;
      
      // Always copy if not exists or if the new key is empty
      if (!result[newKey] || Object.keys(result[newKey]).length === 0) {
        result[newKey] = { ...result.openrouter };
      }
    }
    
    return result;
  });
  
  // Get the effective provider key (for openrouter, include the sub-provider preset)
  const getProviderKey = useCallback(() => {
    if (activeProvider === "openrouter" && selectedPreset) {
      return `openrouter:${selectedPreset}`;
    }
    return activeProvider || "";
  }, [activeProvider, selectedPreset]);
  
  // Get current provider's model overrides (use useMemo to track dependencies correctly)
  const providerKey = getProviderKey();
  const modelOverrides: ModelOverrides = providerKey
    ? (modelOverridesByProvider[providerKey] || {})
    : {};
  
  // Update model overrides for current provider
  const setModelOverrides = (updater: ModelOverrides | ((prev: ModelOverrides) => ModelOverrides)) => {
    const key = getProviderKey();
    if (!key) return;
    setModelOverridesByProvider(prev => ({
      ...prev,
      [key]: typeof updater === 'function' ? updater(prev[key] || {}) : updater
    }));
  };

  // Validation state
  const [validatingProvider, setValidatingProvider] =
    useState<ApiProvider>(null);
  const [validationStatus, setValidationStatus] = useState<
    Record<string, "idle" | "success" | "error">
  >({});
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Tab navigation state
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const contentRef = useRef<HTMLDivElement>(null);
  const generalRef = useRef<HTMLDivElement>(null);
  const apiKeysRef = useRef<HTMLDivElement>(null);
  const modelConfigRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);

  const scrollToSection = useCallback((tabId: TabId) => {
    const refs: Record<TabId, React.RefObject<HTMLDivElement | null>> = {
      "general": generalRef,
      "api-keys": apiKeysRef,
      "model-config": modelConfigRef,
      "tools": toolsRef,
    };
    const targetRef = refs[tabId];
    if (targetRef.current && contentRef.current) {
      targetRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setActiveTab(tabId);
  }, []);

  // Handle scroll to update active tab
  const handleScroll = useCallback(() => {
    if (!contentRef.current) return;

    const container = contentRef.current;
    const scrollTop = container.scrollTop;
    const containerTop = container.getBoundingClientRect().top;

    const sections: { id: TabId; ref: React.RefObject<HTMLDivElement | null> }[] = [
      { id: "general", ref: generalRef },
      { id: "api-keys", ref: apiKeysRef },
      { id: "model-config", ref: modelConfigRef },
      { id: "tools", ref: toolsRef },
    ];

    let currentSection: TabId = "general";
    for (const section of sections) {
      if (section.ref.current) {
        const rect = section.ref.current.getBoundingClientRect();
        const relativeTop = rect.top - containerTop;
        if (relativeTop <= 50) {
          currentSection = section.id;
        }
      }
    }
    setActiveTab(currentSection);
  }, []);

  useEffect(() => {
    if (open) {
      setDeploymentUrl(initialConfig?.deploymentUrl || "http://127.0.0.1:2024");
      setAssistantId(initialConfig?.assistantId || "agent");
      setOpenaiApiKey(initialConfig?.openaiApiKey || "");
      setAnthropicApiKey(initialConfig?.anthropicApiKey || "");
      setGoogleApiKey(initialConfig?.googleApiKey || "");
      setTavilyApiKey(initialConfig?.tavilyApiKey || "");
      setPerplexityApiKey(initialConfig?.perplexityApiKey || "");
      setActiveProvider(initialConfig?.activeProvider || null);
      setSelectedModels(initialConfig?.selectedModels || {});
      
      // Sync modelOverridesByProvider with proper migration
      const savedUrl = initialConfig?.openRouterConfig?.baseUrl || "";
      const match = openAICompatiblePresets.find(p => p.url === savedUrl);
      const presetName = match ? match.name : "Custom";
      
      let newOverrides: Record<string, ModelOverrides> = {};
      if (initialConfig?.modelOverridesByProvider) {
        newOverrides = { ...initialConfig.modelOverridesByProvider };
      }
      // Migrate legacy "openrouter" key to "openrouter:${preset}" format
      if (newOverrides.openrouter && initialConfig?.activeProvider === "openrouter") {
        const newKey = `openrouter:${presetName}`;
        if (!newOverrides[newKey] || Object.keys(newOverrides[newKey]).length === 0) {
          newOverrides[newKey] = { ...newOverrides.openrouter };
        }
      }
      setModelOverridesByProvider(newOverrides);
    }
  }, [open, initialConfig]);

  // Check backend status
  const checkBackendStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/backend/restart", { method: "GET" });
      const data = await response.json();
      setIsBackendRunning(data.running);
    } catch {
      setIsBackendRunning(false);
    }
  }, []);

  // Check backend status when dialog opens
  useEffect(() => {
    if (open) {
      checkBackendStatus();
    }
  }, [open, checkBackendStatus]);

  const handleToggleProvider = (provider: ApiProvider) => {
    if (activeProvider === provider) {
      setActiveProvider(null);
    } else {
      setActiveProvider(provider);
    }
  };

  // Helper to get selected model for current provider
  const getSelectedModelForProvider = (provider: ApiProvider): string => {
    if (!provider) return "";
    return selectedModels[provider] || "";
  };

  // Helper to set selected model for a provider
  // For openrouter, we need to include the sub-provider preset in the key
  const setSelectedModelForProvider = (provider: ApiProvider, model: string, subPreset?: string) => {
    if (!provider) return;
    const key = provider === "openrouter" && subPreset 
      ? `openrouter:${subPreset}` 
      : provider;
    setSelectedModels((prev) => ({ ...prev, [key]: model }));
  };

  const handleValidate = async (provider: ApiProvider) => {
    if (!provider) return;

    let apiKey = "";
    switch (provider) {
      case "openai":
        apiKey = openaiApiKey;
        break;
      case "anthropic":
        apiKey = anthropicApiKey;
        break;
      case "google":
        apiKey = googleApiKey;
        break;
      case "openrouter":
        // OpenRouter uses its own config object
        break;
      default:
        return;
    }

    setValidatingProvider(provider);
    setValidationStatus((prev) => ({ ...prev, [provider]: "idle" }));
    setValidationErrors((prev) => ({ ...prev, [provider]: "" }));

    try {
      const result = await validateAndFetchModels(
        provider, 
        apiKey,
        undefined,
        undefined,
        provider === "openrouter" ? openRouterConfig : undefined
      );

      if (result.valid) {
        setValidationStatus((prev) => ({ ...prev, [provider]: "success" }));

        // Update models list (always update, even for non-active providers)
        const currentSelection = selectedModels[provider];
        const isActiveProvider = activeProvider === provider;
        
        switch (provider) {
          case "openai":
            setOpenaiModels(result.models);
            // Only set default model if this is the active provider and no previous selection
            if (isActiveProvider && result.models.length > 0 && (!currentSelection || !result.models.includes(currentSelection))) {
              const defaultModel =
                result.models.find((m) => m === "gpt-4o") || result.models[0];
              setSelectedModelForProvider(provider, defaultModel);
            }
            break;
          case "google":
            setGoogleModels(result.models);
            if (isActiveProvider && result.models.length > 0 && (!currentSelection || !result.models.includes(currentSelection))) {
              const defaultModel =
                result.models.find((m) => m.includes("gemini-2.0-flash")) ||
                result.models[0];
              setSelectedModelForProvider(provider, defaultModel);
            }
            break;
          case "anthropic":
            setAnthropicModels(result.models);
            if (isActiveProvider && result.models.length > 0 && (!currentSelection || !result.models.includes(currentSelection))) {
              const defaultModel =
                result.models.find((m) => m.includes("claude-sonnet-4")) ||
                result.models.find((m) => m.includes("claude-3-5-sonnet")) ||
                result.models[0];
              setSelectedModelForProvider(provider, defaultModel);
            }
            break;
          case "openrouter":
            setOpenRouterModels(result.models);
            if (isActiveProvider && result.models.length > 0 && (!currentSelection || !result.models.includes(currentSelection))) {
              const defaultModel =
                result.models.find((m) => m.includes("claude-3.5-sonnet")) ||
                result.models.find((m) => m.includes("gpt-4o")) ||
                result.models[0];
              setSelectedModelForProvider(provider, defaultModel, selectedPreset);
            }
            break;
        }
      } else {
        setValidationStatus((prev) => ({ ...prev, [provider]: "error" }));
        setValidationErrors((prev) => ({
          ...prev,
          [provider]: result.error || "Validation failed",
        }));
      }
    } catch (error) {
      setValidationStatus((prev) => ({ ...prev, [provider]: "error" }));
      setValidationErrors((prev) => ({
        ...prev,
        [provider]:
          error instanceof Error ? error.message : "Validation failed",
      }));
    } finally {
      setValidatingProvider(null);
    }
  };

  const getModelsForProvider = (provider: ApiProvider): string[] => {
    switch (provider) {
      case "openai":
        return openaiModels;
      case "anthropic":
        return anthropicModels;
      case "google":
        return googleModels;
      case "openrouter":
        return openRouterModels;
      default:
        return [];
    }
  };

  // Get current active provider's models for override selectors
  const getActiveProviderModels = (): string[] => {
    return getModelsForProvider(activeProvider);
  };
  
  // Get the selected model for current provider (including sub-provider for openrouter)
  const getSelectedModelForCurrentProvider = (): string => {
    const key = getProviderKey();
    return selectedModels[key] || "";
  };

  // Helper to update model overrides
  const updateSubagentOverride = (name: string, value: string | null) => {
    setModelOverrides((prev) => ({
      ...prev,
      subagents: {
        ...prev.subagents,
        [name]: value,
      },
    }));
  };

  const updateSuggestionsOverride = (value: string | null) => {
    setModelOverrides((prev) => ({
      ...prev,
      suggestions: value,
    }));
  };

  // Check if API is validated (models loaded)
  const isApiValidated = getActiveProviderModels().length > 0;

  // Save config to backend model_config.json (via local API route)
  const saveToConfigServer = async (config: {
    provider: string;
    model: string;
    api_key: string;
    base_url: string | null;
    model_overrides: ModelOverrides | null;
    serp_api_key?: string;
    exa_api_key?: string;
    tavily_api_key?: string;
    perplexity_api_key?: string;
    enabled_tools?: typeof enabledTools;
  }) => {
    try {
      // Use local API route to save directly to model_config.json
      const response = await fetch("/api/backend/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("[CONFIG] Saved to model_config.json:", data.config?.provider, data.config?.model);
      } else {
        const errorData = await response.json();
        console.warn("[CONFIG] Failed to save config:", errorData.error);
      }
    } catch (error) {
      console.error("[CONFIG] Error saving config:", error);
    }
  };


  const handleRestart = async () => {
    setIsRestarting(true);
    try {
      // Use local API route to start/restart backend
      const response = await fetch("/api/backend/restart", {
        method: "POST",
      });
      const data = await response.json();
      if (data.success) {
        console.log(`[CONFIG] Backend ${data.action || 'restarted'} successfully`);
        setIsBackendRunning(true);
      } else {
        console.warn("[CONFIG] Failed to start/restart backend:", data.message);
        alert(data.message || "Failed to start backend. Please start manually.");
      }
    } catch (error) {
      console.error("[CONFIG] Error triggering restart:", error);
      alert("Failed to start backend. Please start manually:\ncd deepagents && source .venv/bin/activate && langgraph dev --port 2024");
    } finally {
      setIsRestarting(false);
    }
  };

  const handleSave = async () => {
    if (!deploymentUrl || !assistantId) {
      alert("Please fill in all required fields");
      return;
    }

    // Get the selected model for the active provider (including sub-provider)
    const currentSelectedModel = getSelectedModelForCurrentProvider() || undefined;

    // Save to localStorage (existing behavior)
    onSave({
      deploymentUrl,
      assistantId,
      openaiApiKey,
      anthropicApiKey,
      googleApiKey,
      serpApiKey,
      exaApiKey,
      tavilyApiKey,
      perplexityApiKey,
      openRouterConfig,
      // Save all OpenAI Compatible provider API keys (including current one)
      openAICompatibleApiKeys: {
        ...openAICompatibleApiKeys,
        ...(selectedPreset && openRouterConfig.apiKey ? { [selectedPreset]: openRouterConfig.apiKey } : {}),
      },
      activeProvider,
      selectedModel: currentSelectedModel,
      selectedModels,
      modelOverridesByProvider,
      enabledTools,
    });

    // Also save to backend config server for hot reload
    if (activeProvider && currentSelectedModel) {
      let apiKey = "";
      let baseUrl: string | null = null;

      if (activeProvider === "openai") {
        apiKey = openaiApiKey;
      } else if (activeProvider === "anthropic") {
        apiKey = anthropicApiKey;
      } else if (activeProvider === "google") {
        apiKey = googleApiKey;
      } else if (activeProvider === "openrouter") {
        apiKey = openRouterConfig.apiKey;
        baseUrl = openRouterConfig.baseUrl;
      }

      await saveToConfigServer({
        provider: activeProvider,
        model: currentSelectedModel,
        api_key: apiKey,
        base_url: baseUrl,
        model_overrides: modelOverrides,
        serp_api_key: serpApiKey || undefined,
        exa_api_key: exaApiKey || undefined,
        tavily_api_key: tavilyApiKey || undefined,
        perplexity_api_key: perplexityApiKey || undefined,
        enabled_tools: enabledTools,
      });
    }

    // Close dialog after saving
    // Note: Backend restart is needed to apply model changes (use Restart button)
    console.log("[CONFIG] Config saved. Restart backend to apply model changes.");
    onOpenChange(false);
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: "Backend", icon: <Link className="h-4 w-4" /> },
    { id: "api-keys", label: "API Keys", icon: <Key className="h-4 w-4" /> },
    { id: "model-config", label: "Models", icon: <Cpu className="h-4 w-4" /> },
    { id: "tools", label: "Tools", icon: <Wrench className="h-4 w-4" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] h-[85vh] p-0 overflow-hidden flex flex-row">
        {/* Left Sidebar - Fixed */}
        <div className="w-[150px] border-r bg-muted/30 flex flex-col py-6 px-2 shrink-0">
          <div className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => scrollToSection(tab.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.icon}
                <span className="truncate">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Content - Scrollable */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle>Configuration</DialogTitle>
          <DialogDescription className="sr-only">
            Settings
          </DialogDescription>
        </DialogHeader>

          <div
            ref={contentRef}
            className="flex-1 overflow-y-auto px-6 py-4"
            onScroll={handleScroll}
          >
              <div className="grid gap-6">
                {/* Backend Section */}
                <div ref={generalRef} className="scroll-mt-4">
                  <Label className="text-base font-semibold mb-3 block">Backend</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold shrink-0">URL</span>
            <Input
              id="deploymentUrl"
                      placeholder="http://127.0.0.1:2024"
              value={deploymentUrl}
              onChange={(e) => setDeploymentUrl(e.target.value)}
                      className="flex-1"
            />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRestart}
                      disabled={isRestarting}
                      className={`gap-1.5 shrink-0 ${
                        isBackendRunning
                          ? "text-red-600 hover:text-red-700 border-red-300 hover:border-red-400 hover:bg-red-50"
                          : "text-green-600 hover:text-green-700 border-green-300 hover:border-green-400 hover:bg-green-50"
                      }`}
                    >
                      {isRestarting ? (
                        <>
                          <Power className="h-3.5 w-3.5 animate-pulse" />
                          {isBackendRunning ? "Restarting..." : "Starting..."}
                        </>
                      ) : (
                        <>
                          <Power className="h-3.5 w-3.5" />
                          {isBackendRunning ? "Restart" : "Start"}
                        </>
                      )}
                    </Button>
          </div>
          </div>

          {/* API Keys Section */}
                <div ref={apiKeysRef} className="scroll-mt-4">
            <Label className="text-base font-semibold mb-3 block">
              API Keys
            </Label>
            <div className="grid gap-3">
              {/* Model API Section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-muted-foreground">Model API</Label>
              <ApiKeyField
                id="openaiApiKey"
                provider="openai"
                label="OpenAI API Key"
                placeholder="sk-..."
                value={openaiApiKey}
                onChange={setOpenaiApiKey}
                isActive={activeProvider === "openai"}
                onToggle={() => handleToggleProvider("openai")}
                models={openaiModels}
                selectedModel={selectedModels.openai || ""}
                onModelSelect={(model) => setSelectedModelForProvider("openai", model)}
                onValidate={() => handleValidate("openai")}
                isValidating={validatingProvider === "openai"}
                validationStatus={validationStatus["openai"] || "idle"}
                validationError={validationErrors["openai"]}
                      showModelSelect={false}
                      keyUrl="https://platform.openai.com/account/api-keys"
              />
              <ApiKeyField
                id="anthropicApiKey"
                provider="anthropic"
                label="Anthropic API Key"
                placeholder="sk-ant-..."
                value={anthropicApiKey}
                onChange={setAnthropicApiKey}
                isActive={activeProvider === "anthropic"}
                onToggle={() => handleToggleProvider("anthropic")}
                models={anthropicModels}
                selectedModel={selectedModels.anthropic || ""}
                onModelSelect={(model) => setSelectedModelForProvider("anthropic", model)}
                onValidate={() => handleValidate("anthropic")}
                isValidating={validatingProvider === "anthropic"}
                validationStatus={validationStatus["anthropic"] || "idle"}
                validationError={validationErrors["anthropic"]}
                      showModelSelect={false}
                      keyUrl="https://console.anthropic.com/settings/keys"
              />
              <ApiKeyField
                id="googleApiKey"
                provider="google"
                label="Google API Key"
                placeholder="AIza..."
                value={googleApiKey}
                onChange={setGoogleApiKey}
                isActive={activeProvider === "google"}
                onToggle={() => handleToggleProvider("google")}
                models={googleModels}
                selectedModel={selectedModels.google || ""}
                onModelSelect={(model) => setSelectedModelForProvider("google", model)}
                onValidate={() => handleValidate("google")}
                isValidating={validatingProvider === "google"}
                validationStatus={validationStatus["google"] || "idle"}
                validationError={validationErrors["google"]}
                      showModelSelect={false}
                      keyUrl="https://aistudio.google.com/app/apikey"
                    />

                    {/* OpenAI Compatible API (OpenRouter, Together, Groq, etc.) */}
                    <div
                      className="grid gap-2 rounded-lg border p-3"
                      style={{
                        borderColor: activeProvider === "openrouter" ? "var(--color-primary)" : "var(--color-border)",
                        backgroundColor: activeProvider === "openrouter"
                          ? "rgba(var(--color-primary-rgb), 0.05)"
                          : "transparent",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2 flex-wrap">
                          <span>OpenAI Compatible</span>
                          {activeProvider === "openrouter" && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                              Active
                            </span>
                          )}
                          {validationStatus["openrouter"] === "success" && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          {validationStatus["openrouter"] === "error" && (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </Label>
                        <Switch
                          checked={activeProvider === "openrouter"}
                          onCheckedChange={() => handleToggleProvider("openrouter")}
                          aria-label="Enable OpenAI Compatible API"
                        />
                      </div>
                      <div className="grid gap-2">
                        <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                          <Label className="text-sm text-muted-foreground">Provider</Label>
                          <div className="flex items-center gap-2">
                            <Select
                              value={selectedPreset}
                              onValueChange={(value) => {
                                // Save current provider's API key before switching
                                if (selectedPreset && openRouterConfig.apiKey) {
                                  setOpenAICompatibleApiKeys(prev => ({
                                    ...prev,
                                    [selectedPreset]: openRouterConfig.apiKey
                                  }));
                                }
                                setSelectedPreset(value);
                                const preset = openAICompatiblePresets.find(p => p.name === value);
                                if (preset) {
                                  // Load the new provider's API key (or empty if not set)
                                  const savedKey = openAICompatibleApiKeys[value] || "";
                                  // For Custom, url is empty string, which clears the field
                                  setOpenRouterConfig({ baseUrl: preset.url, apiKey: savedKey });
                                  // Reset validation status when switching providers
                                  setValidationStatus(prev => ({ ...prev, openrouter: "idle" }));
                                  setValidationErrors(prev => ({ ...prev, openrouter: "" }));
                                }
                              }}
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Select provider" />
                              </SelectTrigger>
                              <SelectContent>
                                {openAICompatiblePresets.map((preset) => (
                                  <SelectItem key={preset.name} value={preset.name}>
                                    {preset.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {(() => {
                              const currentPreset = openAICompatiblePresets.find(p => p.name === selectedPreset);
                              return currentPreset?.keyUrl ? (
                                <a
                                  href={currentPreset.keyUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`text-muted-foreground hover:text-foreground transition-colors ${activeProvider !== "openrouter" ? "opacity-50 pointer-events-none" : ""}`}
                                  title={`Get ${currentPreset.name} API Key`}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              ) : null;
                            })()}
                          </div>
                        </div>
                        <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                          <Label className="text-sm text-muted-foreground">Base URL</Label>
                          <Input
                            placeholder="https://your-api.com/v1"
                            value={openRouterConfig.baseUrl}
                            onChange={(e) => {
                              setOpenRouterConfig({ ...openRouterConfig, baseUrl: e.target.value });
                              // If URL no longer matches the preset, switch to Custom
                              const matchingPreset = openAICompatiblePresets.find(p => p.url === e.target.value);
                              if (!matchingPreset && selectedPreset !== "Custom") {
                                setSelectedPreset("Custom");
                              } else if (matchingPreset && matchingPreset.name !== selectedPreset) {
                                setSelectedPreset(matchingPreset.name);
                              }
                            }}
                          />
                        </div>
                        <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                          <Label className="text-sm text-muted-foreground">API Key</Label>
                          <div className="flex gap-2">
                            <Input
                              type={openRouterKeyFocused ? "text" : "password"}
                              placeholder="API Key"
                              value={openRouterConfig.apiKey}
                              onChange={(e) => setOpenRouterConfig({ ...openRouterConfig, apiKey: e.target.value })}
                              onFocus={() => setOpenRouterKeyFocused(true)}
                              onBlur={() => setOpenRouterKeyFocused(false)}
                              className="flex-1"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleValidate("openrouter")}
                              disabled={!openRouterConfig.baseUrl || !openRouterConfig.apiKey || validatingProvider === "openrouter"}
                              className="whitespace-nowrap"
                            >
                              {validatingProvider === "openrouter" ? (
                                <>
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  Verifying...
                                </>
                              ) : (
                                "Verify"
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                      {validationErrors["openrouter"] && activeProvider === "openrouter" && (
                        <p className="text-xs text-red-500">{validationErrors["openrouter"]}</p>
                      )}
                    </div>
              </div>

              {/* Other API Section */}
              <div className="space-y-3 mt-2">
                <Label className="text-sm font-medium text-muted-foreground">Other API</Label>
                    {/* SerpAPI Key for Google Search */}
                    <div className="grid gap-2 rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="serpApiKey" className="flex items-center gap-2">
                          SerpAPI Key
                          <a
                            href="https://serpapi.com/manage-api-key"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Get SerpAPI Key"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                          <span className="text-xs text-muted-foreground">(Google Search)</span>
                        </Label>
                      </div>
                      <Input
                        id="serpApiKey"
                        type={serpKeyFocused ? "text" : "password"}
                        placeholder="your-serpapi-key"
                        value={serpApiKey}
                        onChange={(e) => setSerpApiKey(e.target.value)}
                        onFocus={() => setSerpKeyFocused(true)}
                        onBlur={() => setSerpKeyFocused(false)}
                      />
                    </div>

                    {/* Exa API Key for Neural Search */}
                    <div className="grid gap-2 rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="exaApiKey" className="flex items-center gap-2">
                          Exa API Key
                          <a
                            href="https://dashboard.exa.ai/api-keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Get Exa API Key"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                          <span className="text-xs text-muted-foreground">(Neural Search)</span>
                        </Label>
                      </div>
                      <Input
                        id="exaApiKey"
                        type={exaKeyFocused ? "text" : "password"}
                        placeholder="exa-..."
                        value={exaApiKey}
                        onChange={(e) => setExaApiKey(e.target.value)}
                        onFocus={() => setExaKeyFocused(true)}
                        onBlur={() => setExaKeyFocused(false)}
                      />
                    </div>

                    {/* Tavily API Key for Web Search */}
                    <div className="grid gap-2 rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="tavilyApiKey" className="flex items-center gap-2">
                          Tavily API Key
                          <a
                            href="https://app.tavily.com/home"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Get Tavily API Key"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                          <span className="text-xs text-muted-foreground">(Web Search)</span>
                        </Label>
                      </div>
                      <Input
                        id="tavilyApiKey"
                        type={tavilyKeyFocused ? "text" : "password"}
                        placeholder="tvly-..."
                        value={tavilyApiKey}
                        onChange={(e) => setTavilyApiKey(e.target.value)}
                        onFocus={() => setTavilyKeyFocused(true)}
                        onBlur={() => setTavilyKeyFocused(false)}
                      />
                    </div>

                    {/* Perplexity API Key for AI-powered Search */}
                    <div className="grid gap-2 rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="perplexityApiKey" className="flex items-center gap-2">
                          Perplexity API Key
                          <a
                            href="https://www.perplexity.ai/settings/api"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Get Perplexity API Key"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                          <span className="text-xs text-muted-foreground">(AI Search)</span>
                        </Label>
                      </div>
                      <Input
                        id="perplexityApiKey"
                        type={perplexityKeyFocused ? "text" : "password"}
                        placeholder="pplx-..."
                        value={perplexityApiKey}
                        onChange={(e) => setPerplexityApiKey(e.target.value)}
                        onFocus={() => setPerplexityKeyFocused(true)}
                        onBlur={() => setPerplexityKeyFocused(false)}
                      />
                    </div>

              </div>
                  </div>
                </div>

                {/* Model Configuration Section */}
                <div ref={modelConfigRef} className="scroll-mt-4">
                  <Label className="text-base font-semibold mb-3 block">
                    Model Configuration
                  </Label>
                  {!isApiValidated && (
                    <p className="text-sm text-muted-foreground italic mb-3">
                      API Key must be verified before selecting or changing models.
                    </p>
                  )}

                  <div className="space-y-4">
                    {/* Internal Function Configuration */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium">Internal</Label>
                      </div>
                      <div className="rounded-lg border p-3 space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <Label className="text-sm">Chat</Label>
                            <p className="text-xs text-muted-foreground">
                              Main model for direct user interaction
                            </p>
                          </div>
                          {isApiValidated ? (
                            <Select
                              value={getSelectedModelForCurrentProvider()}
                              onValueChange={(model) => {
                                if (activeProvider) {
                                  setSelectedModelForProvider(activeProvider, model, activeProvider === "openrouter" ? selectedPreset : undefined);
                                }
                              }}
                            >
                              <SelectTrigger className="w-[220px]">
                                <SelectValue placeholder="Select model" />
                              </SelectTrigger>
                              <SelectContent>
                                {getActiveProviderModels().map((model) => (
                                  <SelectItem key={model} value={model}>
                                    {model}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="w-[220px] h-10 px-3 py-2 rounded-md border bg-muted/50 text-sm text-muted-foreground flex items-center truncate">
                              {getSelectedModelForCurrentProvider() || "Not configured"}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <Label className="text-sm">Suggestion</Label>
                            <p className="text-xs text-muted-foreground">
                              Follow-up suggestion generation (can use cheaper model)
                            </p>
                          </div>
                          {isApiValidated ? (
                            <Select
                              value={
                                // Use saved override only if it's valid for current provider, otherwise inherit from Chat
                                (modelOverrides.suggestions && getActiveProviderModels().includes(modelOverrides.suggestions))
                                  ? modelOverrides.suggestions
                                  : getSelectedModelForCurrentProvider()
                              }
                              onValueChange={(value) =>
                                updateSuggestionsOverride(
                                  value === getSelectedModelForCurrentProvider() ? null : value
                                )
                              }
                            >
                              <SelectTrigger className="w-[220px]">
                                <SelectValue placeholder="" />
                              </SelectTrigger>
                              <SelectContent>
                                {getActiveProviderModels().map((model) => (
                                  <SelectItem key={model} value={model}>
                                    {model}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="w-[220px] h-10 px-3 py-2 rounded-md border bg-muted/50 text-sm text-muted-foreground flex items-center truncate">
                              {modelOverrides.suggestions || getSelectedModelForCurrentProvider() || "Inherit from Chat"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Subagent Configuration */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium">Subagent</Label>
                      </div>
                      <div className="rounded-lg border p-3 space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <Label className="text-sm">General Purpose</Label>
                            <p className="text-xs text-muted-foreground">
                              Handles complex multi-step tasks
                            </p>
                          </div>
                          {isApiValidated ? (
                            <Select
                              value={
                                // Use saved override only if it's valid for current provider, otherwise inherit from Chat
                                (modelOverrides.subagents?.["general-purpose"] && getActiveProviderModels().includes(modelOverrides.subagents["general-purpose"]))
                                  ? modelOverrides.subagents["general-purpose"]
                                  : getSelectedModelForCurrentProvider()
                              }
                              onValueChange={(value) =>
                                updateSubagentOverride(
                                  "general-purpose",
                                  value === getSelectedModelForCurrentProvider() ? null : value
                                )
                              }
                            >
                              <SelectTrigger className="w-[220px]">
                                <SelectValue placeholder="" />
                              </SelectTrigger>
                              <SelectContent>
                                {getActiveProviderModels().map((model) => (
                                  <SelectItem key={model} value={model}>
                                    {model}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="w-[220px] h-10 px-3 py-2 rounded-md border bg-muted/50 text-sm text-muted-foreground flex items-center truncate">
                              {modelOverrides.subagents?.["general-purpose"] || getSelectedModelForCurrentProvider() || "Inherit from Chat"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tools Section */}
                <div ref={toolsRef} className="scroll-mt-4">
                  <Label className="text-base font-semibold mb-3 block">
                    Tools
                  </Label>
                  <div className="space-y-3">
                    {/* Filesystem Tools */}
                    <div className="grid gap-2 rounded-lg border p-3">
                      <Label className="text-sm font-medium">Filesystem</Label>
                      <div className="space-y-3">
                        {/* Read & Write */}
                        <div>
                          <div className="text-[10px] text-muted-foreground mb-1">Read & Write</div>
                          <div className="space-y-2">
                            <div className="flex divide-x">
                              <div className="flex-1 flex items-center justify-between pr-2">
                                <Tooltip><TooltipTrigger asChild><code className="text-[10px] bg-muted px-1.5 py-0.5 rounded cursor-help">ls</code></TooltipTrigger><TooltipContent className="bg-zinc-900 text-white shadow-lg">List directory contents</TooltipContent></Tooltip>
                                <Switch checked={true} disabled className="opacity-50" />
                              </div>
                              <div className="flex-1 flex items-center justify-between pl-2">
                                <Tooltip><TooltipTrigger asChild><code className="text-[10px] bg-muted px-1.5 py-0.5 rounded cursor-help">read_file</code></TooltipTrigger><TooltipContent className="bg-zinc-900 text-white shadow-lg">Read file contents</TooltipContent></Tooltip>
                                <Switch checked={true} disabled className="opacity-50" />
                              </div>
                            </div>
                            <div className="flex divide-x">
                              <div className="flex-1 flex items-center justify-between pr-2">
                                <Tooltip><TooltipTrigger asChild><code className="text-[10px] bg-muted px-1.5 py-0.5 rounded cursor-help">write_file</code></TooltipTrigger><TooltipContent className="bg-zinc-900 text-white shadow-lg">Write content to file</TooltipContent></Tooltip>
                                <Switch checked={true} disabled className="opacity-50" />
                              </div>
                              <div className="flex-1 flex items-center justify-between pl-2">
                                <Tooltip><TooltipTrigger asChild><code className="text-[10px] bg-muted px-1.5 py-0.5 rounded cursor-help">edit_file</code></TooltipTrigger><TooltipContent className="bg-zinc-900 text-white shadow-lg">Edit file with search/replace</TooltipContent></Tooltip>
                                <Switch checked={true} disabled className="opacity-50" />
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Search & Execute */}
                        <div>
                          <div className="text-[10px] text-muted-foreground mb-1">Search & Execute</div>
                          <div className="space-y-2">
                            <div className="flex divide-x">
                              <div className="flex-1 flex items-center justify-between pr-2">
                                <Tooltip><TooltipTrigger asChild><code className="text-[10px] bg-muted px-1.5 py-0.5 rounded cursor-help">glob</code></TooltipTrigger><TooltipContent className="bg-zinc-900 text-white shadow-lg">Find files by pattern</TooltipContent></Tooltip>
                                <Switch checked={true} disabled className="opacity-50" />
                              </div>
                              <div className="flex-1 flex items-center justify-between pl-2">
                                <Tooltip><TooltipTrigger asChild><code className="text-[10px] bg-muted px-1.5 py-0.5 rounded cursor-help">grep</code></TooltipTrigger><TooltipContent className="bg-zinc-900 text-white shadow-lg">Search text in files</TooltipContent></Tooltip>
                                <Switch checked={true} disabled className="opacity-50" />
                              </div>
                            </div>
                            <div className="flex divide-x">
                              <div className="flex-1 flex items-center justify-between pr-2">
                                <Tooltip><TooltipTrigger asChild><code className="text-[10px] bg-muted px-1.5 py-0.5 rounded cursor-help">execute</code></TooltipTrigger><TooltipContent className="bg-zinc-900 text-white shadow-lg">Run shell commands</TooltipContent></Tooltip>
                                <Switch checked={true} disabled className="opacity-50" />
                              </div>
                              <div className="flex-1 pl-2"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Built-in Tools */}
                    <div className="grid gap-2 rounded-lg border p-3">
                      <Label className="text-sm font-medium">Built-in</Label>
                      <div className="space-y-2">
                        <div className="flex divide-x">
                          <div className="flex-1 flex items-center justify-between pr-2">
                            <Tooltip><TooltipTrigger asChild><code className="text-[10px] bg-muted px-1.5 py-0.5 rounded cursor-help">write_todos</code></TooltipTrigger><TooltipContent className="bg-zinc-900 text-white shadow-lg">Create and manage task list</TooltipContent></Tooltip>
                            <Switch checked={true} disabled className="opacity-50" />
                          </div>
                          <div className="flex-1 flex items-center justify-between pl-2">
                            <Tooltip><TooltipTrigger asChild><code className="text-[10px] bg-muted px-1.5 py-0.5 rounded cursor-help">task</code></TooltipTrigger><TooltipContent className="bg-zinc-900 text-white shadow-lg">Launch subagent for isolated tasks</TooltipContent></Tooltip>
                            <Switch checked={true} disabled className="opacity-50" />
                          </div>
                        </div>
                        <div className="flex divide-x">
                          <div className="flex-1 flex items-center justify-between pr-2">
                            <Tooltip><TooltipTrigger asChild><code className={`text-[10px] px-1.5 py-0.5 rounded cursor-help ${enabledTools.fetch_url ? 'bg-muted' : 'bg-muted/50 text-muted-foreground line-through'}`}>fetch_url</code></TooltipTrigger><TooltipContent className="bg-zinc-900 text-white shadow-lg">Fetch URL content as markdown</TooltipContent></Tooltip>
                            <Switch checked={enabledTools.fetch_url} onCheckedChange={(checked) => setEnabledTools(prev => ({ ...prev, fetch_url: checked }))} />
                          </div>
                          <div className="flex-1 pl-2"></div>
                        </div>
                      </div>
                    </div>

                    {/* SerpAPI Tools */}
                    <div className="grid gap-2 rounded-lg border p-3">
                      <Label className="text-sm font-medium">SerpAPI</Label>
                      <div className="flex divide-x">
                        <div className="flex-1 flex items-center justify-between pr-2">
                          <Tooltip><TooltipTrigger asChild><code className={`text-[10px] px-1.5 py-0.5 rounded cursor-help ${serpApiKey && enabledTools.serpapi_search ? 'bg-muted' : 'bg-muted/50 text-muted-foreground'} ${!enabledTools.serpapi_search ? 'line-through' : ''}`}>search</code></TooltipTrigger><TooltipContent className="bg-zinc-900 text-white shadow-lg">Google/Bing/YouTube search via engine parameter</TooltipContent></Tooltip>
                          <Switch checked={serpApiKey ? enabledTools.serpapi_search : false} onCheckedChange={(checked) => setEnabledTools(prev => ({ ...prev, serpapi_search: checked }))} disabled={!serpApiKey} className={!serpApiKey ? 'opacity-50' : ''} />
                        </div>
                        <div className="flex-1 pl-2"></div>
                      </div>
                    </div>

                    {/* Exa Tools */}
                    <div className="grid gap-2 rounded-lg border p-3">
                      <Label className="text-sm font-medium">Exa</Label>
                      <div className="space-y-2">
                        <div className="flex divide-x">
                          <div className="flex-1 flex items-center justify-between pr-2">
                            <Tooltip><TooltipTrigger asChild><code className={`text-[10px] px-1.5 py-0.5 rounded cursor-help ${exaApiKey && enabledTools.exa_search ? 'bg-muted' : 'bg-muted/50 text-muted-foreground'} ${!enabledTools.exa_search ? 'line-through' : ''}`}>search</code></TooltipTrigger><TooltipContent className="bg-zinc-900 text-white shadow-lg">Neural/keyword search for web pages</TooltipContent></Tooltip>
                            <Switch checked={exaApiKey ? enabledTools.exa_search : false} onCheckedChange={(checked) => setEnabledTools(prev => ({ ...prev, exa_search: checked }))} disabled={!exaApiKey} className={!exaApiKey ? 'opacity-50' : ''} />
                          </div>
                          <div className="flex-1 flex items-center justify-between pl-2">
                            <Tooltip><TooltipTrigger asChild><code className={`text-[10px] px-1.5 py-0.5 rounded cursor-help ${exaApiKey && enabledTools.exa_contents ? 'bg-muted' : 'bg-muted/50 text-muted-foreground'} ${!enabledTools.exa_contents ? 'line-through' : ''}`}>contents</code></TooltipTrigger><TooltipContent className="bg-zinc-900 text-white shadow-lg">Get clean content from URLs</TooltipContent></Tooltip>
                            <Switch checked={exaApiKey ? enabledTools.exa_contents : false} onCheckedChange={(checked) => setEnabledTools(prev => ({ ...prev, exa_contents: checked }))} disabled={!exaApiKey} className={!exaApiKey ? 'opacity-50' : ''} />
                          </div>
                        </div>
                        <div className="flex divide-x">
                          <div className="flex-1 flex items-center justify-between pr-2">
                            <Tooltip><TooltipTrigger asChild><code className={`text-[10px] px-1.5 py-0.5 rounded cursor-help ${exaApiKey && enabledTools.exa_find_similar ? 'bg-muted' : 'bg-muted/50 text-muted-foreground'} ${!enabledTools.exa_find_similar ? 'line-through' : ''}`}>find_similar</code></TooltipTrigger><TooltipContent className="bg-zinc-900 text-white shadow-lg">Find semantically similar pages</TooltipContent></Tooltip>
                            <Switch checked={exaApiKey ? enabledTools.exa_find_similar : false} onCheckedChange={(checked) => setEnabledTools(prev => ({ ...prev, exa_find_similar: checked }))} disabled={!exaApiKey} className={!exaApiKey ? 'opacity-50' : ''} />
                          </div>
                          <div className="flex-1 flex items-center justify-between pl-2">
                            <Tooltip><TooltipTrigger asChild><code className={`text-[10px] px-1.5 py-0.5 rounded cursor-help ${exaApiKey && enabledTools.exa_answer ? 'bg-muted' : 'bg-muted/50 text-muted-foreground'} ${!enabledTools.exa_answer ? 'line-through' : ''}`}>answer</code></TooltipTrigger><TooltipContent className="bg-zinc-900 text-white shadow-lg">Get direct answers with citations</TooltipContent></Tooltip>
                            <Switch checked={exaApiKey ? enabledTools.exa_answer : false} onCheckedChange={(checked) => setEnabledTools(prev => ({ ...prev, exa_answer: checked }))} disabled={!exaApiKey} className={!exaApiKey ? 'opacity-50' : ''} />
                          </div>
                        </div>
                        <div className="flex divide-x">
                          <div className="flex-1 flex items-center justify-between pr-2">
                            <Tooltip><TooltipTrigger asChild><code className={`text-[10px] px-1.5 py-0.5 rounded cursor-help ${exaApiKey && enabledTools.exa_research ? 'bg-muted' : 'bg-muted/50 text-muted-foreground'} ${!enabledTools.exa_research ? 'line-through' : ''}`}>research</code></TooltipTrigger><TooltipContent className="bg-zinc-900 text-white shadow-lg">Automate in-depth web research with citations</TooltipContent></Tooltip>
                            <Switch checked={exaApiKey ? enabledTools.exa_research : false} onCheckedChange={(checked) => setEnabledTools(prev => ({ ...prev, exa_research: checked }))} disabled={!exaApiKey} className={!exaApiKey ? 'opacity-50' : ''} />
                          </div>
                          <div className="flex-1 pl-2"></div>
                        </div>
                      </div>
                    </div>

                    {/* Tavily Tools */}
                    <div className="grid gap-2 rounded-lg border p-3">
                      <Label className="text-sm font-medium">Tavily</Label>
                      <div className="space-y-2">
                        <div className="flex divide-x">
                          <div className="flex-1 flex items-center justify-between pr-2">
                            <Tooltip><TooltipTrigger asChild><code className={`text-[10px] px-1.5 py-0.5 rounded cursor-help ${tavilyApiKey && enabledTools.tavily_search ? 'bg-muted' : 'bg-muted/50 text-muted-foreground'} ${!enabledTools.tavily_search ? 'line-through' : ''}`}>search</code></TooltipTrigger><TooltipContent className="bg-zinc-900 text-white shadow-lg">/search - Search the web</TooltipContent></Tooltip>
                            <Switch checked={tavilyApiKey ? enabledTools.tavily_search : false} onCheckedChange={(checked) => setEnabledTools(prev => ({ ...prev, tavily_search: checked }))} disabled={!tavilyApiKey} className={!tavilyApiKey ? 'opacity-50' : ''} />
                          </div>
                          <div className="flex-1 flex items-center justify-between pl-2">
                            <Tooltip><TooltipTrigger asChild><code className={`text-[10px] px-1.5 py-0.5 rounded cursor-help ${tavilyApiKey && enabledTools.tavily_extract ? 'bg-muted' : 'bg-muted/50 text-muted-foreground'} ${!enabledTools.tavily_extract ? 'line-through' : ''}`}>extract</code></TooltipTrigger><TooltipContent className="bg-zinc-900 text-white shadow-lg">/extract - Extract content from URLs</TooltipContent></Tooltip>
                            <Switch checked={tavilyApiKey ? enabledTools.tavily_extract : false} onCheckedChange={(checked) => setEnabledTools(prev => ({ ...prev, tavily_extract: checked }))} disabled={!tavilyApiKey} className={!tavilyApiKey ? 'opacity-50' : ''} />
                          </div>
                        </div>
                        <div className="flex divide-x">
                          <div className="flex-1 flex items-center justify-between pr-2">
                            <Tooltip><TooltipTrigger asChild><code className={`text-[10px] px-1.5 py-0.5 rounded cursor-help ${tavilyApiKey && enabledTools.tavily_map ? 'bg-muted' : 'bg-muted/50 text-muted-foreground'} ${!enabledTools.tavily_map ? 'line-through' : ''}`}>map</code></TooltipTrigger><TooltipContent className="bg-zinc-900 text-white shadow-lg">/map - Discover site URLs</TooltipContent></Tooltip>
                            <Switch checked={tavilyApiKey ? enabledTools.tavily_map : false} onCheckedChange={(checked) => setEnabledTools(prev => ({ ...prev, tavily_map: checked }))} disabled={!tavilyApiKey} className={!tavilyApiKey ? 'opacity-50' : ''} />
                          </div>
                          <div className="flex-1 flex items-center justify-between pl-2">
                            <Tooltip><TooltipTrigger asChild><code className={`text-[10px] px-1.5 py-0.5 rounded cursor-help ${tavilyApiKey && enabledTools.tavily_crawl ? 'bg-muted' : 'bg-muted/50 text-muted-foreground'} ${!enabledTools.tavily_crawl ? 'line-through' : ''}`}>crawl</code></TooltipTrigger><TooltipContent className="bg-zinc-900 text-white shadow-lg">/crawl - Crawl site, extract pages</TooltipContent></Tooltip>
                            <Switch checked={tavilyApiKey ? enabledTools.tavily_crawl : false} onCheckedChange={(checked) => setEnabledTools(prev => ({ ...prev, tavily_crawl: checked }))} disabled={!tavilyApiKey} className={!tavilyApiKey ? 'opacity-50' : ''} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Perplexity Tools */}
                    <div className="grid gap-2 rounded-lg border p-3">
                      <Label className="text-sm font-medium">Perplexity</Label>
                      <div className="flex divide-x">
                        <div className="flex-1 flex items-center justify-between pr-2">
                          <Tooltip><TooltipTrigger asChild><code className={`text-[10px] px-1.5 py-0.5 rounded cursor-help ${perplexityApiKey && enabledTools.perplexity_search ? 'bg-muted' : 'bg-muted/50 text-muted-foreground'} ${!enabledTools.perplexity_search ? 'line-through' : ''}`}>search</code></TooltipTrigger><TooltipContent className="bg-zinc-900 text-white shadow-lg">/search - Raw search results (URLs)</TooltipContent></Tooltip>
                          <Switch checked={perplexityApiKey ? enabledTools.perplexity_search : false} onCheckedChange={(checked) => setEnabledTools(prev => ({ ...prev, perplexity_search: checked }))} disabled={!perplexityApiKey} className={!perplexityApiKey ? 'opacity-50' : ''} />
                        </div>
                        <div className="flex-1 flex items-center justify-between pl-2">
                          <Tooltip><TooltipTrigger asChild><code className={`text-[10px] px-1.5 py-0.5 rounded cursor-help ${perplexityApiKey && enabledTools.perplexity_chat ? 'bg-muted' : 'bg-muted/50 text-muted-foreground'} ${!enabledTools.perplexity_chat ? 'line-through' : ''}`}>chat</code></TooltipTrigger><TooltipContent className="bg-zinc-900 text-white shadow-lg">/chat/completions - AI answer with model param</TooltipContent></Tooltip>
                          <Switch checked={perplexityApiKey ? enabledTools.perplexity_chat : false} onCheckedChange={(checked) => setEnabledTools(prev => ({ ...prev, perplexity_chat: checked }))} disabled={!perplexityApiKey} className={!perplexityApiKey ? 'opacity-50' : ''} />
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
          </div>
        </div>

          <DialogFooter className="px-6 py-4 border-t shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
