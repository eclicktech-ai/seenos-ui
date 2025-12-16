"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Sun, Moon, LogOut, User } from "lucide-react";
import { ChatProvider, useChatContext } from "@/providers/ChatProvider";
import { useAuth } from "@/providers/AuthProvider";
import { ChatInterface } from "@/app/components/ChatInterface";
import { LeftSidebar } from "@/app/components/LeftSidebar";
import { RightSidebar } from "@/app/components/RightSidebar";
import { SettingsDialog } from "@/app/components/SettingsDialog";
import { useConversations } from "@/hooks/useConversations";
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // 在顶层使用 useConversations hook，确保 mutate 始终可用
  const { mutate: mutateConversations } = useConversations({
    isAuthenticated,
    token,
  });

  const handleLogout = useCallback(async () => {
    await logout();
    router.push("/login");
  }, [logout, router]);

  return (
    <>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      <div className="flex h-screen flex-col bg-background">
        {/* Header */}
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <Image
              src="/logo-icon.svg"
              alt="SeenOS"
              width={28}
              height={28}
              priority
            />
            <h1 className="text-base font-semibold text-foreground">SeenOS</h1>
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

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

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
