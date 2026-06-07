import { useAuth } from "@/hooks/use-auth";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, Home, ListTodo, Users, Map, LayoutDashboard } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const [location] = useLocation();
  const { data: workspaces } = useWorkspaces();

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

  const navItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/projects", label: "Proyectos", icon: LayoutDashboard },
    { href: "/tasks", label: "Mis Tareas", icon: ListTodo },
    { href: "/team", label: "Equipo", icon: Users },
    { href: "/roadmap", label: "Roadmap", icon: Map },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-card">
        <div className="container max-w-[1200px] mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary tracking-tight">
              <CheckCircle2 className="h-6 w-6" />
              TeamFlow
            </Link>
            {activeWorkspace && (
              <div className="hidden md:flex items-center bg-slate-100 px-3 py-1 rounded-md text-sm font-medium text-slate-700 border">
                {activeWorkspace.workspace.name}
              </div>
            )}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-nav text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-slate hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-foreground hidden sm:inline-block">
                {user.name}
              </span>
            </div>
            <Button variant="outline" className="btn-pill" onClick={logout}>
              Log out
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
