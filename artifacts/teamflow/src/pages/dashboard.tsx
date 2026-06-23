import { useEffect, useState, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useGetPerformanceDashboard, getGetPerformanceDashboardQueryKey } from "@workspace/api-client-react";
import { useContributions, useWorkspaces } from "@/hooks/use-workspaces";
import { motion } from "framer-motion";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";

// Corporate / Clean SVGs
const BriefcaseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
  </svg>
);

const HealthIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

const TrendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const AlertCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const ChartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export function Dashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [_, setLocation] = useLocation();
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [workspaceRole, setWorkspaceRole] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (containerRef.current) {
      gsap.from(".gsap-fade-up", {
        y: 20,
        opacity: 0,
        duration: 0.5,
        stagger: 0.1,
        ease: "power2.out",
        clearProps: "all"
      });
    }
  }, { scope: containerRef });

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        setLocation("/login");
        return;
      }
      
      const id = localStorage.getItem("active_workspace_id");
      const role = localStorage.getItem("active_workspace_role");
      if (!id) {
        setLocation("/workspaces");
      } else {
        setWorkspaceId(parseInt(id));
        setWorkspaceRole(role || "member");
      }
    }
  }, [authLoading, isAuthenticated, setLocation]);

  const { data: workspaces } = useWorkspaces();
  const activeWorkspace = workspaces?.find((w: any) => w.workspaceId === workspaceId);

  const { data: dashboard, isLoading: dashboardLoading } = useGetPerformanceDashboard({
    query: {
      enabled: !!user && !!workspaceId,
      queryKey: getGetPerformanceDashboardQueryKey(),
    }
  });

  const { data: contributions, isLoading: contributionsLoading } = useContributions(workspaceId);

  const chartData = useMemo(() => {
    if (!contributions) return [];
    
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const data = days.map(day => ({ name: day, aportes: 0 }));
    
    contributions.forEach((c: any) => {
      const date = new Date(c.createdAt);
      const dayIndex = date.getDay();
      data[dayIndex].aportes += 1;
    });
    
    const sun = data.shift()!;
    data.push(sun);
    
    return data;
  }, [contributions]);

  if (authLoading || !isAuthenticated || dashboardLoading || !dashboard || contributionsLoading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <div className="text-slate-500 text-sm animate-pulse flex items-center gap-2">
          <ChartIcon /> Cargando información...
        </div>
      </div>
    );
  }

  const pendingContributions = contributions?.filter((c: any) => c.status === "pending").length || 0;
  const approvedContributions = contributions?.filter((c: any) => c.status === "approved").length || 0;

  return (
    <div ref={containerRef} className="space-y-8 animate-in fade-in duration-500 pb-20 md:pb-0 font-sans">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Dashboard Overview</h1>
          <div className="flex items-center gap-3 mt-2">
            {activeWorkspace && (
              <span className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-md">
                {activeWorkspace.workspace.imageUrl ? (
                  <img src={activeWorkspace.workspace.imageUrl} alt="Workspace Logo" className="h-5 w-5 rounded-sm object-cover" />
                ) : (
                  <BriefcaseIcon />
                )}
                {activeWorkspace.workspace.name}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setLocation("/contributions/new")} className="shadow-sm">
            <PlusIcon />
            Nuevo Aporte
          </Button>
          {(workspaceRole === "leader" || workspaceRole === "co-leader") && (
            <Button variant="outline" onClick={() => setLocation("/contributions/review")} className="relative shadow-sm bg-white">
              Revisar Tareas
              {pendingContributions > 0 && (
                <span className="absolute -top-2 -right-2 h-5 w-5 bg-primary text-white text-[10px] flex items-center justify-center rounded-full font-medium shadow-sm">
                  {pendingContributions}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div whileHover={{ y: -2 }} className="gsap-fade-up bg-white p-5 rounded-lg border border-slate-200 shadow-sm transition-all relative">
          <div className="flex flex-row items-center justify-between pb-2">
            <span className="text-sm font-medium text-slate-500">Salud del Equipo</span>
            <div className="text-emerald-500 bg-emerald-50 p-1.5 rounded-md">
              <HealthIcon />
            </div>
          </div>
          <div>
            <div className="text-3xl font-semibold text-slate-900">{dashboard.healthPoints}</div>
            <p className="text-xs text-slate-500 mt-1">Puntos de constancia</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="gsap-fade-up bg-white p-5 rounded-lg border border-slate-200 shadow-sm transition-all relative">
          <div className="flex flex-row items-center justify-between pb-2">
            <span className="text-sm font-medium text-slate-500">Rendimiento</span>
            <div className="text-blue-500 bg-blue-50 p-1.5 rounded-md">
              <TrendIcon />
            </div>
          </div>
          <div>
            <div className="text-3xl font-semibold text-slate-900">{Math.round(dashboard.performanceScore)}%</div>
            <p className="text-xs text-slate-500 mt-1">Score global</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="gsap-fade-up bg-white p-5 rounded-lg border border-slate-200 shadow-sm transition-all relative">
          <div className="flex flex-row items-center justify-between pb-2">
            <span className="text-sm font-medium text-slate-500">Aportes Aprobados</span>
            <div className="text-slate-600 bg-slate-100 p-1.5 rounded-md">
              <CheckCircleIcon />
            </div>
          </div>
          <div>
            <div className="text-3xl font-semibold text-slate-900">{approvedContributions}</div>
            <p className="text-xs text-slate-500 mt-1">Validados en el ciclo</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="gsap-fade-up bg-white p-5 rounded-lg border border-slate-200 shadow-sm transition-all relative">
          <div className="flex flex-row items-center justify-between pb-2">
            <span className="text-sm font-medium text-slate-500">Pendientes</span>
            <div className="text-amber-500 bg-amber-50 p-1.5 rounded-md">
              <AlertCircleIcon />
            </div>
          </div>
          <div>
            <div className="text-3xl font-semibold text-slate-900">{pendingContributions}</div>
            <p className="text-xs text-slate-500 mt-1">Esperando revisión</p>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="gsap-fade-up bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 p-5 border-b border-slate-100">
            <div className="text-slate-400"><ChartIcon /></div>
            <h3 className="text-base font-semibold text-slate-900">Actividad de Aportes</h3>
          </div>
          <div className="p-5 flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAportes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '6px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#0F172A', fontWeight: 500 }}
                />
                <Area type="monotone" dataKey="aportes" name="Aportes" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#colorAportes)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="gsap-fade-up bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-900">Aportes Recientes</h3>
          </div>
          <div className="p-0 flex-1">
            <div className="divide-y divide-slate-100">
              {contributions?.slice(0, 5).map((contrib: any) => (
                <div key={contrib.id} className="flex items-start gap-4 p-5 hover:bg-slate-50 transition-colors">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-200">
                    {contrib.user.avatarUrl ? (
                      <img src={contrib.user.avatarUrl} alt={contrib.user.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-medium text-slate-600 text-sm">{contrib.user.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex flex-col space-y-1 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-900 text-sm truncate">{contrib.user.name}</span>
                      <Badge variant="outline" className={`font-normal text-[10px] px-2 py-0 h-5 ${
                        contrib.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                        contrib.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : 
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {contrib.status === 'approved' ? 'Aprobado' : contrib.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 truncate">{contrib.commitMessage}</p>
                    <div className="text-xs text-slate-400 flex items-center justify-between pt-1">
                      <span>{format(new Date(contrib.createdAt), "dd MMM, HH:mm")}</span>
                      <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{contrib.commitSha.substring(0, 7)}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {(!contributions || contributions.length === 0) && (
                <div className="text-center py-12 text-slate-500 text-sm">
                  <p>No hay aportes recientes en este workspace.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
