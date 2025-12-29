"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Sun, Moon, LogOut, User, ArrowLeft } from "lucide-react";
import { ChatProvider, useChatContext } from "@/providers/ChatProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useContextMenu } from "@/providers/ContextProvider";
import { apiClient, type OnboardingStatus, type DeepResearchResult } from "@/lib/api/client";
import { ChatInterface } from "@/app/components/ChatInterface";
import { LeftSidebar } from "@/app/components/LeftSidebar";
import { RightSidebar } from "@/app/components/RightSidebar";
import { SettingsDialog } from "@/app/components/SettingsDialog";
import { AnalysisStatusCard } from "@/app/components/AnalysisStatusCard";
import { useConversations } from "@/hooks/useConversations";
import { toast } from "sonner";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

// ============ 主题切换 Hook ============
function useTheme() {
  const [theme, setThemeState] = useState<"light" | "dark">("light");

  useEffect(() => {
    // 初始化时读取保存的主题或系统偏好
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

// ============ 主内容组件 ============
function MainContent() {
  const { todos, files, setFiles, isLoading, interrupt } = useChatContext();

  return (
    <ResizablePanelGroup
      direction="horizontal"
      autoSaveId="main-layout"
      className="h-full"
    >
      {/* Left Sidebar */}
      <ResizablePanel
        id="left-sidebar"
        order={1}
        defaultSize={20}
        minSize={15}
      >
        <LeftSidebar todos={todos} />
      </ResizablePanel>

      <ResizableHandle className="relative w-2 bg-transparent hover:bg-border/10 transition-colors cursor-col-resize after:absolute after:inset-y-0 after:left-1/2 after:w-[1px] after:-translate-x-1/2 after:bg-transparent hover:after:bg-border/60" />

      {/* Center - Chat Area */}
      <ResizablePanel
        id="chat-area"
        order={2}
        defaultSize={60}
        minSize={30}
        className="flex flex-col"
      >
        <ChatInterface />
      </ResizablePanel>

      <ResizableHandle className="relative w-2 bg-transparent hover:bg-border/10 transition-colors cursor-col-resize after:absolute after:inset-y-0 after:left-1/2 after:w-[1px] after:-translate-x-1/2 after:bg-transparent hover:after:bg-border/60" />

      {/* Right Sidebar */}
      <ResizablePanel
        id="right-sidebar"
        order={3}
        defaultSize={20}
        minSize={15}
      >
        <RightSidebar
          files={files}
          setFiles={setFiles}
          isLoading={isLoading}
          interrupt={interrupt}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

// ============ 认证后的主页 ============
function AuthenticatedHome() {
  const router = useRouter();
  const { user, logout, token, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { setDeepResearchStatus, setOnboardingStatus, onboardingStatus } = useContextMenu();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // 在顶层使用 useConversations hook，确保 mutate 始终可用
  const { mutate: mutateConversations } = useConversations({
    isAuthenticated,
    token,
  });

  // 初始检查 onboarding 状态
  useEffect(() => {
    // Skip if not authenticated, no token, or already checked
    if (!isAuthenticated || !token || hasCheckedOnboarding) return;

    const checkOnboardingAndFetchResult = async (): Promise<OnboardingStatus | null> => {
      try {
        // 检查 onboarding 状态
        const onboardingStatus: OnboardingStatus = await apiClient.getOnboardingStatus();
        
        // 更新 onboardingStatus 到 Context
        setOnboardingStatus(onboardingStatus);
        
        // 如果状态为完成且有 researchInteractionId，获取结果
        if (
          onboardingStatus.status === "completed" &&
          onboardingStatus.researchStatus === "completed" &&
          onboardingStatus.researchInteractionId
        ) {
          // 检查是否已经获取过结果（避免重复调用）
          const resultFetched = localStorage.getItem(
            `seenos_research_result_fetched_${onboardingStatus.researchInteractionId}`
          );
          
          if (!resultFetched) {
            // 获取 Deep Research 结果
            const result: DeepResearchResult = await apiClient.getDeepResearchResult(
              onboardingStatus.researchInteractionId
            );

            if (result.status === "completed" && result.onsite && result.offsite) {
              // 标记为已获取
              localStorage.setItem(
                `seenos_research_result_fetched_${onboardingStatus.researchInteractionId}`,
                "true"
              );

              // 更新 deep research 状态为完成
              setDeepResearchStatus("completed");

              // 可以在这里处理返回的数据
              // 例如：保存到 Context 或显示通知
              console.log("Deep Research Result:", result);
              console.log("Onsite Data:", result.onsite);
              console.log("Offsite Data:", result.offsite);
              console.log("Citations:", result.citations);

              toast.success("Deep Research completed", {
                description: "Brand analysis data has been loaded.",
              });
            } else if (result.status === "failed") {
              console.error("Deep Research failed:", result.error);
              setDeepResearchStatus("failed");
              toast.error("Deep Research failed", {
                description: result.error || "Failed to analyze brand data.",
              });
            }
          } else {
            // 已经获取过结果，直接设置状态为完成
            setDeepResearchStatus("completed");
          }
        } else if (onboardingStatus.researchStatus === "running") {
          // 研究还在进行中
          setDeepResearchStatus("loading");
        } else if (onboardingStatus.researchStatus === "completed") {
          // 研究已完成，但可能没有 interactionId 或结果已获取
          setDeepResearchStatus("completed");
        } else if (onboardingStatus.researchStatus === "failed") {
          // 研究失败
          setDeepResearchStatus("failed");
        }

        setHasCheckedOnboarding(true);
        return onboardingStatus;
      } catch (error) {
        console.error("Failed to check onboarding status or fetch result:", error);
        // 不阻止用户使用应用，静默失败
        setHasCheckedOnboarding(true);
        return null;
      }
    };

    checkOnboardingAndFetchResult();
  }, [isAuthenticated, token, hasCheckedOnboarding, setDeepResearchStatus, setOnboardingStatus]);

  // 独立的轮询逻辑：基于 onboardingStatus 的状态来决定是否轮询
  useEffect(() => {
    if (!isAuthenticated || !token) return;
    
    // 只有在研究还在进行中时才启动轮询
    if (onboardingStatus?.researchStatus === 'running') {
      // 清除之前的轮询（如果存在）
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      
      pollIntervalRef.current = setInterval(async () => {
        try {
          const status = await apiClient.getOnboardingStatus();
          setOnboardingStatus(status);
          
          // 根据状态更新 deepResearchStatus
          if (status.researchStatus === 'completed') {
            setDeepResearchStatus("completed");
            // 如果已完成且有 interactionId，尝试获取结果
            if (status.researchInteractionId) {
              const resultFetched = localStorage.getItem(
                `seenos_research_result_fetched_${status.researchInteractionId}`
              );
              if (!resultFetched) {
                try {
                  const result = await apiClient.getDeepResearchResult(status.researchInteractionId);
                  if (result.status === "completed" && result.onsite && result.offsite) {
                    localStorage.setItem(
                      `seenos_research_result_fetched_${status.researchInteractionId}`,
                      "true"
                    );
                    toast.success("Deep Research completed", {
                      description: "Brand analysis data has been loaded.",
                    });
                  }
                } catch (error) {
                  console.error("Failed to fetch research result:", error);
                }
              }
            }
            // 完成后停止轮询
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          } else if (status.researchStatus === 'failed') {
            setDeepResearchStatus("failed");
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          } else if (status.researchStatus === 'running') {
            setDeepResearchStatus("loading");
          }
        } catch (error) {
          console.error("Failed to poll onboarding status:", error);
        }
      }, 3000); // 每 3 秒轮询一次
    } else {
      // 如果状态不是 running，停止轮询
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, token, onboardingStatus?.researchStatus, setDeepResearchStatus, setOnboardingStatus]);

  const handleLogout = useCallback(async () => {
    await logout();
    router.push("/login");
  }, [logout, router]);

  return (
    <>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <AnalysisStatusCard />

      <div className="flex h-screen flex-col bg-background">
        {/* Header */}
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <Image
              src={theme === "dark" ? "/logo-dark.svg" : "/logo-icon.svg"}
              alt="SeenOS"
              width={28}
              height={28}
              priority
            />
            <h1 className="text-base font-semibold text-foreground">
              Seen
              <span className="relative inline-block">
                <span className="relative inline-flex items-center justify-center">
                  o
                </span>
              </span>
              S
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* User Info */}
            {user && (
              <div className="mr-2 flex items-center gap-2">
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User size={16} />
                 
                </div>
                <span className="text-sm text-muted-foreground">{user.name || user.email}</span>
              </div>
            )}

            <button
              onClick={() => router.push("/onboarding")}
              className="rounded-md p-2 hover:bg-accent"
              title="Back to Onboarding"
            >
              <ArrowLeft size={18} className="text-muted-foreground" />
            </button>
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
              onClick={() => setSettingsOpen(true)}
              className="rounded-md p-2 hover:bg-accent"
              title="Settings"
            >
              <svg
                className="h-[18px] w-[18px] text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
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
        <div className="flex-1 overflow-hidden pt-2">
          <ChatProvider onHistoryRevalidate={() => mutateConversations()}>
            <MainContent />
          </ChatProvider>
        </div>
      </div>
    </>
  );
}

// ============ 认证检查包装器 ============
function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (hasCheckedRef.current) return;
    
    if (!isLoading && !isAuthenticated) {
      hasCheckedRef.current = true;
      router.replace("/login"); // Use replace instead of push
      return;
    }

    // 检查是否完成 onboarding
    if (!isLoading && isAuthenticated) {
      const onboardingCompleted = localStorage.getItem("seenos_onboarding_completed");
      if (onboardingCompleted !== "true") {
        hasCheckedRef.current = true;
        router.replace("/onboarding"); // Use replace instead of push
        return;
      }
      hasCheckedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading]); // Don't include router in deps

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // 再次检查 onboarding（防止在检查过程中状态变化）
  const onboardingCompleted = localStorage.getItem("seenos_onboarding_completed");
  if (onboardingCompleted !== "true") {
    return null; // 会被重定向到 onboarding
  }

  return <>{children}</>;
}

// ============ 主页内容 ============
function HomePageContent() {
  return (
    <AuthGuard>
      <AuthenticatedHome />
    </AuthGuard>
  );
}

// ============ 导出的主页组件 ============
export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        </div>
      }
    >
      <HomePageContent />
    </Suspense>
  );
}
