import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useGetPerformanceDashboard, getGetPerformanceDashboardQueryKey } from "@workspace/api-client-react";
import { useContributions } from "@/hooks/use-workspaces";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, AlertCircle, Clock, Heart, TrendingUp, BarChart3, Plus } from "lucide-react";
import { format } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";

export function Dashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [_, setLocation] = useLocation();
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [workspaceRole, setWorkspaceRole] = useState<string>("");

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
    <div className="space-y-8 pb-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">Dashboard de Rendimiento</h1>
          <p className="text-slate mt-1">
            Revisa tus métricas reales y el progreso de tu equipo. 
            <span className="ml-2 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold uppercase">
              {workspaceRole}
            </span>
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setLocation("/contributions/new")} className="shadow-lg">
            <Plus className="h-4 w-4 mr-2" />
            Registrar Aporte
          </Button>
          {(workspaceRole === "leader" || workspaceRole === "co-leader") && (
            <Button variant="outline" onClick={() => setLocation("/contributions/review")} className="relative">
              Revisar Aportes
              {pendingContributions > 0 && (
                <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                  {pendingContributions}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-monday overflow-hidden border-t-4 border-t-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate">Puntos de Salud</CardTitle>
            <Heart className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{dashboard.healthPoints}</div>
            <Progress value={dashboard.healthPoints} className="h-2 mt-3 bg-green-100 [&>div]:bg-green-500" />
          </CardContent>
        </Card>

        <Card className="card-monday overflow-hidden border-t-4 border-t-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate">Score de Rendimiento</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{Math.round(dashboard.performanceScore)}%</div>
            <Progress value={dashboard.performanceScore} className="h-2 mt-3" />
          </CardContent>
        </Card>

        <Card className="card-monday overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate">Aportes Aprobados</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-ink">{approvedContributions}</div>
            <p className="text-xs text-slate mt-1">Validados por líderes</p>
          </CardContent>
        </Card>

        <Card className="card-monday overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate">Aportes Pendientes</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-ink">{pendingContributions}</div>
            <p className="text-xs text-slate mt-1">Esperando revisión</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        <Card className="md:col-span-4 card-monday">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <BarChart3 className="mr-2 h-5 w-5 text-primary" />
              Aportes de la Semana
            </CardTitle>
            <CardDescription>Volumen real de commits aportados</CardDescription>
          </CardHeader>
          <CardContent>
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
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="aportes" name="Aportes" stroke="#5046e6" strokeWidth={3} fillOpacity={1} fill="url(#colorAportes)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 card-monday">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Activity className="mr-2 h-5 w-5 text-primary" />
              Aportes Recientes del Equipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {contributions?.slice(0, 5).map((contrib: any) => (
                <div key={contrib.id} className="flex items-start gap-4 group">
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-slate-100 flex-shrink-0 border-2 border-white shadow-sm">
                      {contrib.user.avatarUrl ? (
                        <img src={contrib.user.avatarUrl} alt={contrib.user.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-sm font-medium text-slate-500">
                          {contrib.user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <div className="text-sm font-medium text-ink flex items-center gap-2">
                      <span>{contrib.user.name}</span>
                      <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider ${
                        contrib.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' : 
                        contrib.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : 
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {contrib.status === 'approved' ? 'Aprobado' : contrib.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate line-clamp-1">{contrib.commitMessage}</p>
                    <div className="text-xs text-slate/70 flex items-center mt-1">
                      <Clock className="mr-1 h-3 w-3" />
                      {format(new Date(contrib.createdAt), "dd MMM, HH:mm")}
                      <span className="mx-2">•</span>
                      <span className="font-mono bg-slate/10 px-1 rounded">{contrib.commitSha.substring(0, 7)}</span>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
