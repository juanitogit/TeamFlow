import { useAuth } from "@/hooks/use-auth";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Loader2, Home, ListTodo, Users, Menu, X } from "lucide-react";
import { useState } from "react";
import { LogoLoader } from "@/components/ui/logo-loader";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const [location] = useLocation();
  const { data: workspaces } = useWorkspaces();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <LogoLoader className="h-12 w-12" />
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
                <img src="/logo.png" alt="Logo" className="h-8 object-contain" />
                <span className="font-bold text-xl text-primary tracking-tight">TeamFlow</span>
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
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
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
              <Button variant="ghost" size="sm" className="hidden sm:flex text-xs text-slate-500 hover:text-slate-900" onClick={() => {
                localStorage.removeItem("active_workspace_id");
                localStorage.removeItem("active_workspace_role");
                window.location.href = "/workspaces";
              }}>
                Cambiar Workspace
              </Button>
            )}
            <div className="h-6 w-px bg-slate-200 hidden sm:block mx-1"></div>
            <div className="flex items-center gap-2 cursor-default" title={user.name}>
              <div className="h-8 w-8 shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
            <Button variant="outline" size="sm" className="hidden sm:flex text-xs" onClick={logout}>
              Salir
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t bg-card p-4 space-y-2">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
            <div className="pt-4 border-t mt-4 flex flex-col gap-2">
              {activeWorkspace && (
                <Button variant="outline" className="w-full justify-center" onClick={() => {
                  localStorage.removeItem("active_workspace_id");
                  localStorage.removeItem("active_workspace_role");
                  window.location.href = "/workspaces";
                }}>
                  Cambiar Workspace
                </Button>
              )}
              <Button variant="destructive" className="w-full justify-center" onClick={logout}>
                Cerrar Sesión
              </Button>
            </div>
          </div>
        )}
      </header>
      <main className="flex-1 w-full max-w-[1200px] mx-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
