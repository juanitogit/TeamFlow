import { useEffect, useState, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useGetPerformanceDashboard, getGetPerformanceDashboardQueryKey } from "@workspace/api-client-react";
import { useContributions, useWorkspaces } from "@/hooks/use-workspaces";
import { motion } from "framer-motion";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, AlertCircle, Clock, Heart, TrendingUp, BarChart3, Plus, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";

export function Dashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [_, setLocation] = useLocation();
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [workspaceRole, setWorkspaceRole] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (containerRef.current) {
      gsap.from(".gsap-fade-up", {
        y: 40,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "power3.out",
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

  // Generate chart data from real contributions
  const chartData = useMemo(() => {
    if (!contributions) return [];
    
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const data = days.map(day => ({ name: day, aportes: 0 }));
    
    contributions.forEach((c: any) => {
      const date = new Date(c.createdAt);
      const dayIndex = date.getDay();
      data[dayIndex].aportes += 1;
    });
    
    // Shift array to start from Monday
    const sun = data.shift()!;
    data.push(sun);
    
    return data;
  }, [contributions]);

  if (authLoading || !isAuthenticated || dashboardLoading || !dashboard || contributionsLoading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Activity className="h-8 w-8 animate-spin text-primary opacity-50" />
      </div>
    );
  }

  const pendingContributions = contributions?.filter((c: any) => c.status === "pending").length || 0;
  const approvedContributions = contributions?.filter((c: any) => c.status === "approved").length || 0;

  return (
    <div ref={containerRef} className="space-y-8 animate-in fade-in duration-500 pb-20 md:pb-0">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">Dashboard de Rendimiento</h1>
          <div className="flex items-center gap-3 mt-2">
            {activeWorkspace && (
              <span className="flex items-center gap-2.5 text-xl font-semibold text-slate dark:text-slate-300">
                {activeWorkspace.workspace.imageUrl ? (
                  <div className="h-10 w-10 rounded-full overflow-hidden border border-mist shadow-sm flex items-center justify-center bg-white">
                    <img src={activeWorkspace.workspace.imageUrl} alt="Workspace Logo" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <Briefcase className="h-6 w-6 text-primary" />
                )}
                {activeWorkspace.workspace.name}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setLocation("/contributions/new")} className="btn-pill bg-primary hover:bg-primary/90 text-white shadow-xl-2 px-6">
            <Plus className="h-4 w-4 mr-2" />
            Registrar Aporte
          </Button>
          {(workspaceRole === "leader" || workspaceRole === "co-leader") && (
            <Button variant="outline" onClick={() => setLocation("/contributions/review")} className="btn-pill relative px-6 border-mist hover:bg-white shadow-sm">
              Revisar Aportes
              {pendingContributions > 0 && (
                <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold shadow-md">
                  {pendingContributions}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <motion.div whileHover={{ y: -4 }} className="gsap-fade-up bg-white rounded-[24px] p-6 transition-all border border-mist shadow-sm relative overflow-hidden">
          <div className="flex flex-row items-center justify-between pb-2">
            <span className="text-sm font-medium text-slate">Puntos de Salud</span>
            <div className="bg-white p-2 rounded-full shadow-sm">
              <Heart className="h-4 w-4 text-emerald-500" />
            </div>
          </div>
          <div>
            <div className="text-4xl font-bold text-emerald-500">{dashboard.healthPoints}</div>
            <p className="text-xs text-slate mt-1 leading-tight">Mide la constancia y calidad de tus aportes recientes.</p>
            <Progress value={dashboard.healthPoints} className="h-2 mt-4 bg-emerald-100 [&>div]:bg-emerald-500 rounded-full" />
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="gsap-fade-up bg-white rounded-[24px] p-6 transition-all border border-mist shadow-sm relative overflow-hidden">
          <div className="flex flex-row items-center justify-between pb-2">
            <span className="text-sm font-medium text-slate">Score de Rendimiento</span>
            <div className="bg-white p-2 rounded-full shadow-sm">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div>
            <div className="text-4xl font-bold text-primary">{Math.round(dashboard.performanceScore)}%</div>
            <p className="text-xs text-slate mt-1 leading-tight">Evaluación global de tu desempeño y tareas completadas.</p>
            <Progress value={dashboard.performanceScore} className="h-2 mt-4 bg-primary/10 [&>div]:bg-primary rounded-full" />
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="gsap-fade-up bg-white rounded-[24px] p-6 transition-all border border-mist shadow-sm relative overflow-hidden">
          <div className="flex flex-row items-center justify-between pb-2">
            <span className="text-sm font-medium text-slate">Aportes Aprobados</span>
            <div className="bg-white p-2 rounded-full shadow-sm">
              <CheckCircle2 className="h-4 w-4 text-[#fe81e4]" />
            </div>
          </div>
          <div>
            <div className="text-4xl font-bold text-ink mt-2">{approvedContributions}</div>
            <p className="text-xs text-slate mt-1">Validados por líderes</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="gsap-fade-up bg-white rounded-[24px] p-6 transition-all border border-mist shadow-sm relative overflow-hidden">
          <div className="flex flex-row items-center justify-between pb-2">
            <span className="text-sm font-medium text-slate">Aportes Pendientes</span>
            <div className="bg-white p-2 rounded-full shadow-sm">
              <AlertCircle className="h-4 w-4 text-[#fda900]" />
            </div>
          </div>
          <div>
            <div className="text-4xl font-bold text-ink mt-2">{pendingContributions}</div>
            <p className="text-xs text-slate mt-1">Esperando revisión</p>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="gsap-fade-up bg-white rounded-[24px] p-6 transition-all border border-mist shadow-sm">
          <div className="flex flex-col mb-6">
            <h3 className="flex items-center text-xl font-semibold text-ink tracking-tight">
              <BarChart3 className="mr-3 h-6 w-6 text-primary" />
              Aportes de la Semana
            </h3>
            <p className="text-slate mt-1">Volumen real de commits aportados</p>
          </div>
          <div>
            <div className="h-[250px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAportes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5046e6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#5046e6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px -2px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="aportes" name="Aportes" stroke="#5046e6" strokeWidth={3} fillOpacity={1} fill="url(#colorAportes)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="gsap-fade-up bg-white rounded-[24px] p-6 md:p-8 border border-mist shadow-sm">
          <div className="flex flex-col mb-6">
            <h3 className="flex items-center text-xl font-semibold text-ink tracking-tight">
              <Activity className="mr-3 h-6 w-6 text-primary" />
              Aportes Recientes del Equipo
            </h3>
          </div>
          <div>
            <div className="space-y-6">
              {contributions?.slice(0, 5).map((contrib: any) => (
                <div key={contrib.id} className="flex items-start gap-4 group hover:bg-slate-50 p-2 -mx-2 rounded-[16px] transition-colors">
                  <div className="relative">
                    <div className="h-10 w-10 rounded-[12px] overflow-hidden bg-slate-100 flex-shrink-0 border-2 border-white shadow-sm">
                      {contrib.user.avatarUrl ? (
                        <img src={contrib.user.avatarUrl} alt={contrib.user.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-sm font-bold text-primary bg-primary/10">
                          {contrib.user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <div className="text-sm font-medium text-ink flex items-center gap-2">
                      <span>{contrib.user.name}</span>
                      <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider rounded-full ${
                        contrib.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                        contrib.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : 
                        'bg-slate-50 text-slate-700 border-slate-200'
                      }`}>
                        {contrib.status === 'approved' ? 'Aprobado' : contrib.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate line-clamp-1">{contrib.commitMessage}</p>
                    <div className="text-xs text-slate/70 flex items-center mt-1">
                      <Clock className="mr-1 h-3 w-3" />
                      {format(new Date(contrib.createdAt), "dd MMM, HH:mm")}
                      <span className="mx-2">•</span>
                      <span className="font-mono bg-cloud px-1.5 py-0.5 rounded-md text-slate-500">{contrib.commitSha.substring(0, 7)}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {(!contributions || contributions.length === 0) && (
                <div className="text-center py-8 text-slate">
                  <p>No hay aportes registrados aún en este workspace.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
