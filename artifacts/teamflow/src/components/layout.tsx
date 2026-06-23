import { useAuth } from "@/hooks/use-auth";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { IconLoader2, IconMenu2, IconX, IconArrowsLeftRight, IconLayoutDashboard, IconListCheck, IconUsers, IconFlame, IconVideo, IconArrowsExchange, IconLogout, IconBrandGithub } from "@tabler/icons-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { LogoLoader } from "@/components/ui/logo-loader";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const [location] = useLocation();
  const { data: workspaces } = useWorkspaces();

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
    { href: "/dashboard", label: "Dashboard", icon: IconLayoutDashboard },
    { href: "/tasks", label: "Tareas", icon: IconListCheck },
    { href: "/team", label: "Equipo", icon: IconUsers },
    { href: "/github-stats", label: "GitHub", icon: IconBrandGithub },
    { href: "/sprints", label: "Sprints", icon: IconFlame },
    { href: "/meetings", label: "Reuniones", icon: IconVideo },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans text-ink" style={{ backgroundImage: "url('/bg-pattern.png')", backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}>
      <header className="sticky top-0 z-50 w-full bg-card border-b border-mist shadow-sm">
        <div className="container max-w-[1200px] mx-auto flex h-20 items-center justify-between px-4">
          <div className="flex items-center gap-4 md:gap-8">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <img src="/logo.png" alt="Logo" className="h-10 object-contain drop-shadow-sm" />
                <span className="font-bold text-2xl text-primary tracking-tight">TeamFlow</span>
              </Link>
            </div>
            <nav className="hidden md:flex items-center gap-2">
              {navItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        isActive
                          ? "bg-primary/10 text-primary shadow-sm"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </motion.div>
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {activeWorkspace && (
              <Button variant="ghost" size="icon" className="hidden sm:flex text-slate-500 hover:text-primary hover:bg-primary/5 rounded-full" onClick={() => {
                localStorage.removeItem("active_workspace_id");
                localStorage.removeItem("active_workspace_role");
                window.location.href = "/workspaces";
              }} title="Cambiar Workspace">
                <IconArrowsExchange className="h-5 w-5" />
              </Button>
            )}
            <div className="h-8 w-px bg-slate-200 hidden sm:block mx-1"></div>
            <div className="flex items-center gap-2 cursor-default" title={user.name}>
              <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-tr from-primary to-[#fe81e4] p-[2px] shadow-sm">
                <div className="h-full w-full rounded-full bg-snow flex items-center justify-center text-primary font-bold text-sm overflow-hidden">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="hidden sm:flex text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-full transition-all" onClick={logout} title="Salir">
              <IconLogout className="h-5 w-5" />
            </Button>
            <div className="md:hidden flex items-center gap-1">
              {activeWorkspace && (
                <Button variant="ghost" size="icon" className="text-slate-500 hover:text-primary hover:bg-primary/5 rounded-full" onClick={() => {
                  localStorage.removeItem("active_workspace_id");
                  localStorage.removeItem("active_workspace_role");
                  window.location.href = "/workspaces";
                }} title="Cambiar Workspace">
                  <IconArrowsExchange className="h-5 w-5" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full" onClick={logout} title="Salir">
                <IconLogout className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-mist pb-safe">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-slate-400 hover:text-slate-900"
                }`}
              >
                <motion.div whileTap={{ scale: 0.9 }} className="relative">
                  <item.icon className={`h-6 w-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                  {isActive && (
                    <motion.div layoutId="navIndicator" className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </div>
      </nav>
      <main className="flex-1 w-full max-w-[1200px] mx-auto p-4 pb-24 md:p-8 md:pb-8">
        {children}
      </main>
    </div>
  );
}
