import { useAuth } from "@/hooks/use-auth";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Loader2, Home, ListTodo, Users, Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const [location] = useLocation();
  const { data: workspaces } = useWorkspaces();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDarkMode = localStorage.getItem("theme") === "dark" || (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches);
      setIsDark(isDarkMode);
      if (isDarkMode) document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <>{children}</>;
  }

  if (location === "/workspaces") {
    return <>{children}</>;
  }

  const activeWorkspaceId = typeof window !== 'undefined' ? localStorage.getItem("active_workspace_id") : null;
  const activeWorkspace = workspaces?.find((w: any) => w.workspaceId.toString() === activeWorkspaceId);

  // If workspaces are loaded and the active one is missing (user expelled/left)
  if (workspaces !== undefined && activeWorkspaceId && !activeWorkspace && typeof window !== 'undefined') {
    localStorage.removeItem("active_workspace_id");
    localStorage.removeItem("active_workspace_role");
    window.location.href = "/workspaces";
    return null;
  }

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/tasks", label: "Tareas", icon: ListTodo },
    { href: "/team", label: "Equipo", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
        <div className="container max-w-[1200px] mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4 md:gap-8">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <img src="/logo.png" alt="Logo" className="h-8 object-contain dark:invert" />
                <span className="hidden sm:inline-block font-bold text-xl text-primary tracking-tight">TeamFlow</span>
              </Link>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-slate hover:bg-slate-100 hover:text-ink"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {activeWorkspace && (
              <Button variant="ghost" size="sm" className="hidden sm:flex text-xs text-slate hover:text-ink" onClick={() => {
                localStorage.removeItem("active_workspace_id");
                localStorage.removeItem("active_workspace_role");
                window.location.href = "/workspaces";
              }}>
                Cambiar Workspace
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={toggleDark} className="text-slate">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block mx-1"></div>
            <div className="flex items-center gap-2 cursor-default" title={user.name}>
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
            <Button variant="outline" size="sm" className="text-xs" onClick={logout}>
              Salir
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full max-w-[1200px] mx-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
