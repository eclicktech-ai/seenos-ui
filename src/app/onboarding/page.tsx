"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Globe, Sun, Moon, User, LogOut, ExternalLink, CheckCircle } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { apiClient, type Project } from "@/lib/api/client";
import { useContextMenu } from "@/providers/ContextProvider";
import { useProject } from "@/providers/ProjectProvider";
import { toast } from "sonner";

// ============ Theme Toggle Hook ============
function useTheme() {
  const [theme, setThemeState] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
    setThemeState(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const applyTheme = (newTheme: "light" | "dark") => {
    const root = document.documentElement;
    if (newTheme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
      root.setAttribute("data-joy-color-scheme", "dark");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
      root.setAttribute("data-joy-color-scheme", "light");
    }
  };

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const newTheme = prev === "light" ? "dark" : "light";
      localStorage.setItem("theme", newTheme);
      applyTheme(newTheme);
      return newTheme;
    });
  }, []);

  return { theme, toggleTheme };
}

export default function OnboardingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { setDeepResearchStatus, reloadContextData } = useContextMenu();
  const { createProject, updateProject, validateUrl, projects, loadProjects } = useProject();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showExistingProjects, setShowExistingProjects] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const faceRef = useRef<HTMLDivElement>(null);
  const [eyePosition, setEyePosition] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const autoCompleteRef = useRef<string>(""); // Track last auto-completed value to avoid loops

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  // Load existing projects when authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadProjects();
    }
  }, [isAuthenticated, authLoading, loadProjects]);

  // Check if user has existing projects
  useEffect(() => {
    if (projects.length > 0 && !showExistingProjects) {
      setShowExistingProjects(true);
    }
  }, [projects, showExistingProjects]);

  // Mount animation
  useEffect(() => {
    setIsMounted(true);
    // Auto focus input after mount
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Track mouse position for eye following
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!faceRef.current) return;
      
      const faceRect = faceRef.current.getBoundingClientRect();
      const faceCenterX = faceRect.left + faceRect.width / 2;
      const faceCenterY = faceRect.top + faceRect.height / 2;
      
      // Calculate angle from face center to mouse
      const deltaX = e.clientX - faceCenterX;
      const deltaY = e.clientY - faceCenterY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // Increased eye movement range (max 4px in each direction) and faster response
      const maxDistance = 4;
      // More sensitive - smaller distance threshold for full movement
      const normalizedDistance = Math.min(distance / 150, 1);
      const eyeDistance = normalizedDistance * maxDistance;
      
      // Calculate eye offset with smoother curve
      const eyeOffsetX = deltaX !== 0 ? (deltaX / distance) * eyeDistance : 0;
      const eyeOffsetY = deltaY !== 0 ? (deltaY / distance) * eyeDistance : 0;
      
      setEyePosition({
        x: eyeOffsetX,
        y: eyeOffsetY,
      });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Blinking mechanism
  useEffect(() => {
    let blinkTimeout: NodeJS.Timeout;
    
    const scheduleBlink = () => {
      // Blink interval: 30 seconds
      const blinkDelay = 5000;
      
      blinkTimeout = setTimeout(() => {
        setIsBlinking(true);
        // Blink duration: 100-150ms
        setTimeout(() => {
          setIsBlinking(false);
          // Schedule next blink
          scheduleBlink();
        }, 100 + Math.random() * 50);
      }, blinkDelay);
    };

    scheduleBlink();

    return () => {
      if (blinkTimeout) clearTimeout(blinkTimeout);
    };
  }, []);


  // Validate URL format - more lenient validation
  const isValidUrl = (urlString: string): boolean => {
    if (!urlString || !urlString.trim()) {
      return false;
    }

    const trimmed = urlString.trim();
    
    // If it already has a protocol, validate with URL constructor
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      try {
        const url = new URL(trimmed);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    }

    // For URLs without protocol, use regex to validate domain format
    // This is more lenient and works for domains like pollo.ai, seopage.ai, etc.
    const domainPattern = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/.*)?$/;
    return domainPattern.test(trimmed);
  };

  const handleLogout = useCallback(async () => {
    await logout();
    router.push("/login");
  }, [logout, router]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      // Validate URL
      if (!url.trim()) {
        setError("Please enter your brand website URL");
        return;
      }

      // Ensure URL has protocol
      let finalUrl = url.trim();
      if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
        finalUrl = `https://${finalUrl}`;
      }

      // More lenient validation - check if it's a valid URL format
      // We'll rely more on backend validation for actual reachability
      if (!isValidUrl(finalUrl)) {
        setError("Please enter a valid URL (e.g., https://example.com or example.com)");
        return;
      }

      setIsLoading(true);

      try {
        // Step 1: Validate URL with backend
        toast.info("Validating URL...");
        const validationResult = await validateUrl(finalUrl);
        
        if (!validationResult) {
          throw new Error("Failed to validate URL");
        }

        // 更宽松的验证逻辑：
        // 1. 如果后端返回了 normalized_url，说明格式基本正确
        // 2. 如果 status_code 存在且不是明显的错误（4xx/5xx），也认为格式正确
        // 3. 只拒绝明显的格式错误（没有 normalized_url 且 is_valid 明确为 false）
        const hasNormalizedUrl = !!validationResult.normalized_url;
        const hasValidStatusCode = validationResult.status_code !== undefined && 
          validationResult.status_code !== 0 && 
          validationResult.status_code < 500; // 允许 4xx（可能是防爬虫）
        
        // 如果后端明确说格式无效，且没有 normalized_url，才拒绝
        const isFormatInvalid = validationResult.is_valid === false && !hasNormalizedUrl;
        
        if (isFormatInvalid && !hasValidStatusCode) {
          console.error("[Onboarding] Backend validation failed - is_valid:", validationResult.is_valid);
          setError(
            validationResult.error || 
            "Invalid URL format. Please check the URL and try again."
          );
          setIsLoading(false);
          return;
        }

        // 如果不可达或状态码不是 2xx，只显示警告但继续执行
        // 因为有些网站可能有防爬虫机制，或者需要特殊处理
        if (!validationResult.reachable || 
            (validationResult.status_code !== undefined && 
             validationResult.status_code >= 400 && 
             validationResult.status_code < 500)) {
          console.warn("URL may not be reachable:", validationResult.error);
          toast.warning("URL may not be reachable", {
            description: "We'll try to proceed anyway.",
          });
        }

        // Use normalized URL from validation
        const normalizedUrl = validationResult.normalized_url || finalUrl;

        // Extract domain from URL and save to localStorage
        try {
          const urlObj = new URL(normalizedUrl);
          const domain = urlObj.hostname.replace(/^www\./, '');
          localStorage.setItem("seenos_onboarding_domain", domain);
        } catch {
          // If URL parsing fails, try to extract domain manually
          const domain = normalizedUrl
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .replace(/\/$/, '');
          localStorage.setItem("seenos_onboarding_domain", domain);
        }

        // Step 2: Create or Update project
        // Extract domain name for project name
        let projectName = "My Website";
        try {
          const urlObj = new URL(normalizedUrl);
          projectName = urlObj.hostname.replace(/^www\./, "");
        } catch (err) {
          console.warn("Failed to extract domain name:", err);
        }

        // Check if user has existing projects
        const hasExistingProject = projects.length > 0;
        let project: Project;

        if (hasExistingProject) {
          // Update existing project
          toast.info("Updating project...");
          const existingProject = projects[0];
          
          const updatedProject = await updateProject(existingProject.id, {
            name: projectName,
            url: normalizedUrl,
          });

          if (!updatedProject) {
            throw new Error("Failed to update project");
          }

          project = updatedProject;
          toast.success("Project updated successfully");
        } else {
          // Create new project (first time)
          toast.info("Creating project...");
          
          const newProject = await createProject({
            name: projectName,
            url: normalizedUrl,
          });

          if (!newProject) {
            throw new Error("Failed to create project");
          }
          
          project = newProject;
        }

        // Save project ID to localStorage
        localStorage.setItem("seenos_current_project_id", project.id);

        // Reload projects list to show the updated/new project
        await loadProjects();
        
        // Step 3: Load context data (now that we have a project_id)
        toast.info("Loading context data...");
        try {
          await reloadContextData();
        } catch (err) {
          console.warn("Failed to load context data, but continuing:", err);
          // 不阻止流程，继续执行
        }

        // Step 4: Start Deep Research
        toast.info("Starting brand analysis...");
        const result = await apiClient.startDeepResearch(normalizedUrl);
        
        // Set deep research status to loading (will be updated when research completes)
        setDeepResearchStatus("loading");
        
        // Show success message
        const actionMessage = hasExistingProject 
          ? "Project updated and analysis started" 
          : "Project created and analysis started";
        
        toast.success(actionMessage, {
          description: "Your brand analysis is in progress. You'll be redirected to the main page.",
        });
        
        // Save onboarding completion status to localStorage
        localStorage.setItem("seenos_onboarding_completed", "true");
        localStorage.setItem("seenos_research_interaction_id", result.interactionId);
        
        // Navigate to main page
        setTimeout(() => {
          router.push("/");
        }, 500);
      } catch (error) {
        console.error("Failed to complete onboarding:", error);
        const errorMessage = error instanceof Error 
          ? error.message 
          : "Failed to start analysis. Please try again.";
        
        setError(errorMessage);
        toast.error("Failed to start analysis", {
          description: errorMessage,
        });
        setIsLoading(false);
      }
    },
    [url, router, setDeepResearchStatus, validateUrl, createProject, updateProject, projects, reloadContextData, loadProjects]
  );

  // Show loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If not authenticated, don't show content (will be redirected)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <Image
            src={theme === "dark" ? "/SeenOS_白色.svg" : "/logo.svg"}
            alt="SeenOS"
            width={120}
            height={120}
            priority
          />
        </div>
        <div className="flex items-center gap-2">
          {/* User Info */}
          {user && (
            <div className="mr-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User size={16} />
              </div>
              <span className="text-sm text-muted-foreground">{user.name || user.email}</span>
            </div>
          )}

          <button
            onClick={toggleTheme}
            className="rounded-md p-2 hover:bg-accent"
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {theme === "light" ? (
              <Sun size={18} className="text-muted-foreground" />
            ) : (
              <Moon size={18} className="text-muted-foreground" />
            )}
          </button>

          <button
            onClick={handleLogout}
            className="rounded-md p-2 hover:bg-accent"
            title="Logout"
          >
            <LogOut size={18} className="text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto flex items-center justify-center px-4 py-12 relative">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-primary/[0.02] pointer-events-none" />
        
        <div className={`w-full max-w-md relative transition-all duration-700 ease-out ${
          isMounted 
            ? "opacity-100 translate-y-0" 
            : "opacity-0 translate-y-4"
        }`}>
          {/* Title */}
          <div className="text-center mb-10">
            <div className={`inline-flex items-center justify-center w-52 h-52 rounded-2xl bg-primary/10 mb-6 transition-all duration-500 ${
              isMounted 
                ? "scale-100 opacity-100" 
                : "scale-90 opacity-0"
            }`}>
              <div className="relative">
                <Image
                  src={theme === "dark" ? "/SeenOS_白色.svg" : "/logo.svg"}
                  alt="SeenOS"
                  width={200}
                  height={200}
                  priority
                  className="animate-[float_3s_ease-in-out_infinite]"
                />
                {/* Pulsing ring effect */}
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-[pulse-ring_2s_ease-out_infinite] -z-10" />
              </div>
            </div>
            <h1 className={`text-4xl font-bold text-foreground mb-3 transition-all duration-700 delay-100 ${
              isMounted 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-2"
            }`}>
              Welcome to Seen
              <span className="relative inline-block mx-0.5">
                <span 
                  ref={faceRef}
                  className="relative inline-flex items-center justify-center w-[0.8em] h-[0.8em] rounded-full border-2 border-foreground"
                >
                  {/* Left eye */}
                  <span 
                    className="absolute rounded-full bg-foreground"
                    style={{
                      left: 'calc(50% - 0.15em - 0.08em)',
                      top: 'calc(50% - 0.08em)',
                      width: '0.15em',
                      height: isBlinking ? '0.02em' : '0.15em',
                      transform: `translate(${eyePosition.x}px, ${eyePosition.y}px)`,
                      transition: 'transform 0.08s cubic-bezier(0.25, 0.1, 0.25, 1), height 0.1s ease-out',
                    }}
                  />
                  {/* Right eye */}
                  <span 
                    className="absolute rounded-full bg-foreground"
                    style={{
                      left: 'calc(50% + 0.08em)',
                      top: 'calc(50% - 0.08em)',
                      width: '0.15em',
                      height: isBlinking ? '0.02em' : '0.15em',
                      transform: `translate(${eyePosition.x}px, ${eyePosition.y}px)`,
                      transition: 'transform 0.08s cubic-bezier(0.25, 0.1, 0.25, 1), height 0.1s ease-out',
                    }}
                  />
                </span>
              </span>
              S
            </h1>
            <p className={`text-muted-foreground transition-all duration-700 delay-200 ${
              isMounted 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-2"
            }`}>
              {projects.length > 0 ? "Create a new project or continue with existing" : "Analyze your brand to get started"}
            </p>
          </div>

          {/* Existing Projects List */}
          {projects.length > 0 && (
            <div className={`mb-6 transition-all duration-700 delay-250 ${
              isMounted 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-4"
            }`}>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground">Your Projects ({projects.length})</h3>
                  <button
                    type="button"
                    onClick={() => {
                      // 确保 onboarding 完成状态已设置
                      localStorage.setItem("seenos_onboarding_completed", "true");
                      router.push("/");
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Go to Dashboard
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-2 rounded-md bg-background hover:bg-accent transition-colors cursor-pointer"
                      onClick={() => {
                        localStorage.setItem("seenos_current_project_id", project.id);
                        // 确保 onboarding 完成状态已设置，否则会被重定向回来
                        localStorage.setItem("seenos_onboarding_completed", "true");
                        router.push("/");
                      }}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">  
                        <CheckCircle size={16} className="text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{project.websiteUrl}</p>
                        </div>
                      </div>
                      <ExternalLink size={14} className="text-muted-foreground flex-shrink-0 ml-2" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Onboarding Form */}
          <form onSubmit={handleSubmit} className={`space-y-4 transition-all duration-700 delay-300 ${
            isMounted 
              ? "opacity-100 translate-y-0" 
              : "opacity-0 translate-y-4"
          }`}>
            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 animate-[slide-in_0.3s_ease-out]">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* URL Input and Button in one row */}
            <div className="flex gap-3">
              <div className="relative flex-1 min-w-0">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  ref={inputRef}
                  id="url"
                  type="text"
                  value={url}
                  onChange={(e) => {
                    let value = e.target.value;
                    
                    // Auto-complete https:// when user types a complete domain
                    // Only if the value doesn't already have a protocol
                    if (value && !value.startsWith("http://") && !value.startsWith("https://")) {
                      const trimmed = value.trim();
                      // Check if it's a complete domain (has dot and valid TLD)
                      if (trimmed.includes('.') && !trimmed.includes(' ')) {
                        const parts = trimmed.split('.');
                        const lastPart = parts[parts.length - 1].split('/')[0];
                        // If the last part (TLD) is at least 2 characters and is letters
                        if (lastPart.length >= 2 && /^[a-zA-Z]{2,}$/.test(lastPart)) {
                          // Use the domain pattern to validate
                          const domainPattern = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/.*)?$/;
                          if (domainPattern.test(trimmed)) {
                            // Only auto-complete if we haven't already auto-completed this value
                            const newValue = `https://${trimmed}`;
                            if (autoCompleteRef.current !== newValue) {
                              autoCompleteRef.current = newValue;
                              value = newValue;
                            }
                          }
                        }
                      }
                    } else if (value.startsWith("https://") || value.startsWith("http://")) {
                      // Reset auto-complete ref when user manually adds protocol
                      autoCompleteRef.current = "";
                    }
                    
                    setUrl(value);
                    // Clear error when user starts typing
                    if (error) {
                      setError(null);
                    }
                  }}
                  onBlur={(e) => {
                    // On blur, auto-complete https:// if it looks like a domain without protocol
                    let value = e.target.value.trim();
                    if (value && !value.startsWith("http://") && !value.startsWith("https://")) {
                      // Check if it looks like a domain (contains dot and has valid TLD)
                      // Simple pattern: domain.tld or domain.tld/path
                      if (value.includes('.') && !value.includes(' ')) {
                        const parts = value.split('.');
                        const lastPart = parts[parts.length - 1].split('/')[0];
                        // If the last part (TLD) is at least 2 characters and is letters, it's likely a domain
                        if (lastPart.length >= 2 && /^[a-zA-Z]{2,}$/.test(lastPart)) {
                          // Use the improved domain pattern to validate
                          const domainPattern = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/.*)?$/;
                          if (domainPattern.test(value)) {
                            value = `https://${value}`;
                            setUrl(value);
                          }
                        }
                      }
                    }
                  }}
                  required
                  placeholder="example.com"
                  className="w-full pl-12 pr-4 py-3 rounded-lg bg-muted/50 focus:bg-background focus:ring-2 focus:ring-primary transition-colors text-foreground placeholder-muted-foreground"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!url.trim() || isLoading}
                className="px-2 py-3 text-foreground font-medium hover:opacity-70 focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2 whitespace-nowrap flex-shrink-0"
              >
                <span>{projects.length > 0 ? "Update & Restart" : "Start Analysis"}</span>
                {isLoading ? (
                  <div className="relative w-4 h-4 flex-shrink-0">
                    <div className="absolute inset-0 border-2 border-foreground/20 rounded-full" />
                    <div 
                      className="absolute inset-0 border-2 border-transparent border-t-foreground rounded-full animate-spin"
                    />
                  </div>
                ) : (
                  <ArrowRight className="h-5 w-5" />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

