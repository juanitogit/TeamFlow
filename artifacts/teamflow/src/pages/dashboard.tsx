import { useEffect, useState, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useGetPerformanceDashboard, getGetPerformanceDashboardQueryKey } from "@workspace/api-client-react";
import { useContributions, useWorkspaces } from "@/hooks/use-workspaces";
import { motion } from "framer-motion";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";

// Neo-Brutalist Abstract SVGs
const BriefcaseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
    <rect x="2" y="7" width="20" height="14" />
    <path d="M16 7V3H8v4" />
  </svg>
);

const HealthIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
    <path d="M12 21l-8-8a5 5 0 017-7l1 1 1-1a5 5 0 017 7l-8 8z" />
    <path d="M12 9v4M10 11h4" />
  </svg>
);

const TrendIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
    <path d="M3 17l6-6 4 4 8-8" />
    <path d="M14 7h7v7" />
  </svg>
);

const CheckSquareIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
    <rect x="3" y="3" width="18" height="18" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const AlertSquareIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
    <rect x="3" y="3" width="18" height="18" />
    <path d="M12 8v4M12 16h.01" />
  </svg>
);

const ChartIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
    <rect x="4" y="14" width="4" height="6" />
    <rect x="10" y="8" width="4" height="12" />
    <rect x="16" y="4" width="4" height="16" />
    <path d="M2 20h20" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" className="mr-2">
    <path d="M12 5v14M5 12h14" />
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
        <div className="text-2xl font-black uppercase tracking-widest animate-pulse border-4 border-black p-4">Cargando</div>
      </div>
    );
  }

  const pendingContributions = contributions?.filter((c: any) => c.status === "pending").length || 0;
  const approvedContributions = contributions?.filter((c: any) => c.status === "approved").length || 0;

  return (
    <div ref={containerRef} className="space-y-12 animate-in fade-in duration-500 pb-20 md:pb-0">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b-4 border-black pb-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-black">Dashboard</h1>
          <div className="flex items-center gap-3 mt-4">
            {activeWorkspace && (
              <span className="flex items-center gap-3 text-xl font-bold uppercase tracking-wider text-black bg-accent px-4 py-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                {activeWorkspace.workspace.imageUrl ? (
                  <div className="h-8 w-8 border-2 border-black bg-white flex items-center justify-center">
                    <img src={activeWorkspace.workspace.imageUrl} alt="Workspace Logo" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <BriefcaseIcon />
                )}
                {activeWorkspace.workspace.name}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-4">
          <Button onClick={() => setLocation("/contributions/new")} className="shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg h-12">
            <PlusIcon />
            Aporte
          </Button>
          {(workspaceRole === "leader" || workspaceRole === "co-leader") && (
            <Button variant="outline" onClick={() => setLocation("/contributions/review")} className="relative shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg h-12">
              Revisar
              {pendingContributions > 0 && (
                <span className="absolute -top-3 -right-3 h-8 w-8 border-2 border-black bg-destructive text-white text-sm flex items-center justify-center font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  {pendingContributions}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <motion.div whileHover={{ y: -4, boxShadow: "8px 8px 0px 0px rgba(0,0,0,1)" }} className="gsap-fade-up bg-white p-6 transition-all border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative">
          <div className="flex flex-row items-center justify-between pb-4 border-b-2 border-black mb-4">
            <span className="text-sm font-black uppercase tracking-widest text-black">Salud</span>
            <div className="bg-primary text-white p-2 border-2 border-black">
              <HealthIcon />
            </div>
          </div>
          <div>
            <div className="text-5xl font-black text-black">{dashboard.healthPoints}</div>
            <p className="text-xs font-bold uppercase text-muted-foreground mt-2">Constancia de aportes</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4, boxShadow: "8px 8px 0px 0px rgba(0,0,0,1)" }} className="gsap-fade-up bg-white p-6 transition-all border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative">
          <div className="flex flex-row items-center justify-between pb-4 border-b-2 border-black mb-4">
            <span className="text-sm font-black uppercase tracking-widest text-black">Rendimiento</span>
            <div className="bg-accent text-black p-2 border-2 border-black">
              <TrendIcon />
            </div>
          </div>
          <div>
            <div className="text-5xl font-black text-black">{Math.round(dashboard.performanceScore)}%</div>
            <p className="text-xs font-bold uppercase text-muted-foreground mt-2">Evaluación Global</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4, boxShadow: "8px 8px 0px 0px rgba(0,0,0,1)" }} className="gsap-fade-up bg-white p-6 transition-all border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative">
          <div className="flex flex-row items-center justify-between pb-4 border-b-2 border-black mb-4">
            <span className="text-sm font-black uppercase tracking-widest text-black">Aprobados</span>
            <div className="bg-white text-black p-2 border-2 border-black">
              <CheckSquareIcon />
            </div>
          </div>
          <div>
            <div className="text-5xl font-black text-black mt-2">{approvedContributions}</div>
            <p className="text-xs font-bold uppercase text-muted-foreground mt-2">Validados por líderes</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4, boxShadow: "8px 8px 0px 0px rgba(0,0,0,1)" }} className="gsap-fade-up bg-white p-6 transition-all border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative bg-secondary">
          <div className="flex flex-row items-center justify-between pb-4 border-b-2 border-black mb-4">
            <span className="text-sm font-black uppercase tracking-widest text-black">Pendientes</span>
            <div className="bg-destructive text-white p-2 border-2 border-black">
              <AlertSquareIcon />
            </div>
          </div>
          <div>
            <div className="text-5xl font-black text-black mt-2">{pendingContributions}</div>
            <p className="text-xs font-bold uppercase text-black mt-2">Esperando revisión</p>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="gsap-fade-up bg-white p-8 transition-all border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex flex-col mb-8 border-b-4 border-black pb-4">
            <h3 className="flex items-center text-3xl font-black uppercase text-black tracking-tighter">
              <span className="mr-3 p-2 bg-primary text-white border-2 border-black"><ChartIcon /></span>
              Aportes (Semana)
            </h3>
          </div>
          <div>
            <div className="h-[300px] w-full mt-4 border-2 border-black bg-secondary p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="0" vertical={false} stroke="#000" strokeWidth={2} />
                  <XAxis dataKey="name" axisLine={{stroke: '#000', strokeWidth: 4}} tickLine={false} tick={{ fontSize: 14, fontWeight: '900', fill: '#000' }} dy={10} />
                  <YAxis axisLine={{stroke: '#000', strokeWidth: 4}} tickLine={false} tick={{ fontSize: 14, fontWeight: '900', fill: '#000' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '0px', border: '4px solid #000', boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)', fontWeight: '900', textTransform: 'uppercase' }}
                  />
                  <Area type="step" dataKey="aportes" name="Aportes" stroke="#000" strokeWidth={4} fillOpacity={1} fill="#0000ff" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="gsap-fade-up bg-white p-8 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex flex-col mb-8 border-b-4 border-black pb-4">
            <h3 className="flex items-center text-3xl font-black uppercase text-black tracking-tighter">
              Aportes Recientes
            </h3>
          </div>
          <div>
            <div className="space-y-4">
              {contributions?.slice(0, 5).map((contrib: any) => (
                <div key={contrib.id} className="flex items-start gap-4 p-4 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all bg-white">
                  <div className="relative">
                    <div className="h-12 w-12 border-2 border-black bg-accent flex-shrink-0 flex items-center justify-center">
                      {contrib.user.avatarUrl ? (
                        <img src={contrib.user.avatarUrl} alt={contrib.user.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="font-black text-xl">{contrib.user.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-black uppercase">{contrib.user.name}</span>
                      <Badge variant="outline" className={`border-2 border-black font-black uppercase ${
                        contrib.status === 'approved' ? 'bg-primary text-white' : 
                        contrib.status === 'rejected' ? 'bg-destructive text-white' : 
                        'bg-accent text-black'
                      }`}>
                        {contrib.status === 'approved' ? 'OK' : contrib.status === 'rejected' ? 'NO' : 'WAIT'}
                      </Badge>
                    </div>
                    <p className="text-sm font-bold truncate">{contrib.commitMessage}</p>
                    <div className="text-xs font-bold uppercase flex items-center mt-2 justify-between">
                      <span>{format(new Date(contrib.createdAt), "dd MMM, HH:mm")}</span>
                      <span className="bg-black text-white px-2 py-1">SHA: {contrib.commitSha.substring(0, 7)}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {(!contributions || contributions.length === 0) && (
                <div className="text-center py-8 font-black uppercase border-4 border-dashed border-black">
                  <p>No hay aportes.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
