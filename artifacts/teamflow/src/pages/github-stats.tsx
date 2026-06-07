import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GitCommit, BarChart3, Calendar, Users, TrendingUp, Github, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useQuery } from "@tanstack/react-query";

function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("teamflow_token")}`, "Content-Type": "application/json" };
}

const CHART_COLORS = [
  "#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6",
  "#ec4899", "#14b8a6", "#f97316", "#8b5cf6", "#06b6d4",
];

const PERIOD_LABELS: Record<string, string> = {
  day: "Hoy",
  week: "Esta Semana",
  month: "Este Mes",
  year: "Este Año",
  custom: "Personalizado",
};

export function GithubStats() {
  const { user } = useAuth();
  const { data: workspaces } = useWorkspaces();
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<string>("all");
  const [period, setPeriod] = useState("week");
  const [customSince, setCustomSince] = useState("");
  const [customUntil, setCustomUntil] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("active_workspace_id");
    if (id) setWorkspaceId(parseInt(id));
  }, []);

  const activeWorkspace = workspaces?.find((w: any) => w.workspaceId === workspaceId);
  const repos: string[] = useMemo(() => {
    if (!activeWorkspace?.workspace?.githubRepos) return [];
    try { return JSON.parse(activeWorkspace.workspace.githubRepos); } catch { return []; }
  }, [activeWorkspace]);

  // Build query params
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedRepo !== "all") params.set("repo", selectedRepo);
    if (period === "custom" && customSince && customUntil) {
      params.set("since", new Date(customSince).toISOString());
      params.set("until", new Date(customUntil + "T23:59:59").toISOString());
      params.set("period", "custom");
    } else {
      params.set("period", period);
    }
    return params.toString();
  }, [selectedRepo, period, customSince, customUntil]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["github-commits", workspaceId, queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/github-commits?${queryParams}`, {
        headers: getAuthHeader(),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error");
      }
      return res.json();
    },
    enabled: !!workspaceId && repos.length > 0 && (period !== "custom" || (!!customSince && !!customUntil)),
    staleTime: 60_000,
  });

  const chartData = useMemo(() => {
    if (!data?.authors) return [];
    return data.authors.map((a: any, i: number) => ({
      name: a.name.length > 15 ? a.name.substring(0, 14) + "…" : a.name,
      fullName: a.name,
      login: a.login,
      commits: a.commits,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [data]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink flex items-center gap-3">
          <Github className="h-7 w-7 text-primary" />
          Estadísticas de GitHub
        </h1>
        <p className="text-slate-500 mt-1 text-sm">Compara los commits de cada integrante en los repositorios del workspace</p>
      </div>

      {/* Filters */}
      <Card className="card-monday border-none">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-end">
            {/* Repo selector */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-slate-500 mb-1 block">Repositorio</label>
              <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                <SelectTrigger className="bg-white shadow-sm">
                  <SelectValue placeholder="Selecciona un repo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Repositorios</SelectItem>
                  {repos.map((r: string) => (
                    <SelectItem key={r} value={r}>{r.replace("https://github.com/", "")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Period selector */}
            <div className="min-w-[160px]">
              <label className="text-xs font-medium text-slate-500 mb-1 block">Período</label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="bg-white shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Hoy</SelectItem>
                  <SelectItem value="week">Última Semana</SelectItem>
                  <SelectItem value="month">Último Mes</SelectItem>
                  <SelectItem value="year">Último Año</SelectItem>
                  <SelectItem value="custom">Fechas Personalizadas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom date range */}
            {period === "custom" && (
              <>
                <div className="min-w-[150px]">
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Desde</label>
                  <Input type="date" value={customSince} onChange={e => setCustomSince(e.target.value)} className="bg-white shadow-sm" />
                </div>
                <div className="min-w-[150px]">
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Hasta</label>
                  <Input type="date" value={customUntil} onChange={e => setCustomUntil(e.target.value)} className="bg-white shadow-sm" />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {repos.length === 0 ? (
        <Card className="card-monday border-none">
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <Github className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-ink">Sin repositorios vinculados</h3>
            <p className="text-slate-500 mt-1 text-sm">Agrega repositorios de GitHub en la sección de Equipo para ver estadísticas.</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card className="card-monday border-none">
          <CardContent className="py-16 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="text-slate-500 text-sm">Consultando GitHub API...</p>
          </CardContent>
        </Card>
      ) : isError ? (
        <Card className="card-monday border-none">
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <Github className="h-12 w-12 text-red-300 mb-4" />
            <h3 className="text-lg font-medium text-red-600">Error al obtener datos</h3>
            <p className="text-slate-500 mt-1 text-sm">Verifica que los repositorios sean públicos o que la configuración de GitHub sea correcta.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card className="card-monday overflow-hidden border-t-4 border-t-primary">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-500">Total Commits</CardTitle>
                <GitCommit className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-ink">{data?.totalCommits || 0}</div>
                <p className="text-xs text-slate-400 mt-1">{PERIOD_LABELS[period] || period}</p>
              </CardContent>
            </Card>

            <Card className="card-monday overflow-hidden border-t-4 border-t-emerald-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-500">Contribuyentes</CardTitle>
                <Users className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-ink">{data?.authors?.length || 0}</div>
                <p className="text-xs text-slate-400 mt-1">Autores activos</p>
              </CardContent>
            </Card>

            <Card className="card-monday overflow-hidden border-t-4 border-t-amber-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-500">Top Contribuyente</CardTitle>
                <TrendingUp className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-ink truncate">{data?.authors?.[0]?.name || "—"}</div>
                <p className="text-xs text-slate-400 mt-1">{data?.authors?.[0]?.commits || 0} commits</p>
              </CardContent>
            </Card>

            <Card className="card-monday overflow-hidden border-t-4 border-t-violet-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-500">Repositorios</CardTitle>
                <BarChart3 className="h-4 w-4 text-violet-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-ink">{data?.repos?.length || 0}</div>
                <p className="text-xs text-slate-400 mt-1">Analizados</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <Card className="card-monday border-none">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <BarChart3 className="mr-2 h-5 w-5 text-primary" />
                  Commits por Integrante
                </CardTitle>
                <CardDescription>
                  {data?.repos?.map((r: string) => r).join(", ")} — {PERIOD_LABELS[period] || `${customSince} a ${customUntil}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        angle={-35}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 24px rgba(0,0,0,0.12)" }}
                        formatter={(value: number, _name: string, props: any) => [
                          `${value} commits`,
                          props.payload.fullName,
                        ]}
                        labelFormatter={(label: string) => ""}
                      />
                      <Bar dataKey="commits" radius={[8, 8, 0, 0]} maxBarSize={60}>
                        {chartData.map((entry: any, index: number) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ranking table */}
          {data?.authors?.length > 0 && (
            <Card className="card-monday border-none">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Users className="mr-2 h-5 w-5 text-primary" />
                  Ranking de Contribuyentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.authors.map((author: any, i: number) => (
                    <div
                      key={author.login}
                      className="flex items-center gap-4 p-3 rounded-xl bg-slate-50/80 hover:bg-slate-100 transition-colors"
                    >
                      <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                        i === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600' : 
                        i === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500' : 
                        i === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                        'bg-slate-200 text-slate-600'
                      }`}>
                        {i + 1}
                      </div>
                      <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden bg-slate-200">
                        {author.avatar ? (
                          <img src={author.avatar} alt={author.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-sm font-medium text-slate-500">
                            {author.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-ink truncate">{author.name}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1">
                          <Github className="h-3 w-3" />
                          @{author.login}
                          {author.memberId && (
                            <Badge variant="outline" className="ml-1 text-[9px] px-1.5 py-0 bg-primary/5 text-primary border-primary/20">Miembro</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-bold text-ink">{author.commits}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">commits</div>
                      </div>
                      {/* Mini bar */}
                      <div className="hidden sm:block w-24 shrink-0">
                        <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${(author.commits / (data.authors[0]?.commits || 1)) * 100}%`,
                              backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {chartData.length === 0 && (
            <Card className="card-monday border-none">
              <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                <GitCommit className="h-12 w-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-ink">Sin commits en este período</h3>
                <p className="text-slate-500 mt-1 text-sm">No se encontraron commits para el rango de fechas seleccionado.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </motion.div>
  );
}
