import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("teamflow_token")}`, "Content-Type": "application/json" };
}

// Corporate SVGs
const SprintIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const EmptyIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-slate-300">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 text-slate-400">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export function Sprints() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [isLeader, setIsLeader] = useState(false);
  const { data: workspaces } = useWorkspaces();
  
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("active_workspace_id");
    const role = localStorage.getItem("active_workspace_role");
    if (id) setWorkspaceId(parseInt(id));
    if (role === "leader" || role === "co-leader") setIsLeader(true);
  }, [workspaces]);

  const { data: sprints, isLoading: loadingSprints } = useQuery({
    queryKey: ["sprints", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const res = await fetch(`/api/sprints/workspace/${workspaceId}`, { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Error fetching sprints");
      return res.json();
    },
    enabled: !!workspaceId
  });

  const { data: tasks } = useQuery({
    queryKey: ["workspace_tasks", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const res = await fetch(`/api/workspace-tasks/workspace/${workspaceId}`, { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Error fetching tasks");
      return res.json();
    },
    enabled: !!workspaceId
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/sprints", { method: "POST", headers: getAuthHeader(), body: JSON.stringify(data) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Sprint creado exitosamente" });
      setCreateOpen(false);
      setName(""); setStartDate(""); setEndDate("");
      queryClient.invalidateQueries({ queryKey: ["sprints", workspaceId] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const handleCreate = () => {
    if (!name || !workspaceId) return;
    createMutation.mutate({ workspaceId, name, startDate: startDate || undefined, endDate: endDate || undefined });
  };

  if (loadingSprints) return (
    <div className="h-96 flex items-center justify-center">
      <div className="text-slate-500 text-sm animate-pulse flex items-center gap-2">
        Cargando sprints...
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              <SprintIcon />
            </div>
            Sprints y Ciclos
          </h1>
          <p className="text-slate-500 font-medium mt-2 text-sm">Gestiona el progreso iterativo del equipo</p>
        </div>
        
        {isLeader && (
          <Button onClick={() => setCreateOpen(true)} className="shadow-sm">
            <PlusIcon />
            Nuevo Sprint
          </Button>
        )}
      </div>

      {!workspaceId ? (
        <div className="text-center py-12 text-slate-500 font-medium bg-white border border-slate-200 rounded-lg shadow-sm">
          Selecciona un workspace activo en la barra superior.
        </div>
      ) : (
        <div className="space-y-6">
          {sprints?.length === 0 ? (
            <div className="py-16 flex flex-col items-center text-center bg-white border border-slate-200 border-dashed rounded-lg shadow-sm">
              <EmptyIcon />
              <h3 className="text-lg font-semibold text-slate-900">Sin Sprints Activos</h3>
              <p className="text-slate-500 text-sm mt-1">Comienza creando un ciclo de trabajo para tu equipo.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sprints?.map((sprint: any) => {
                const sprintTasks = tasks?.filter((t: any) => t.sprintId === sprint.id) || [];
                const completedCount = sprintTasks.filter((t: any) => t.status === "completada").length;
                const progress = sprintTasks.length ? Math.round((completedCount / sprintTasks.length) * 100) : 0;
                
                return (
                  <div key={sprint.id} className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col h-full overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <h3 className="text-base text-slate-900 font-semibold truncate pr-2">{sprint.name}</h3>
                      <Badge variant="outline" className={`font-medium px-2 py-0.5 h-6 text-[10px] uppercase tracking-wider
                        ${sprint.status === 'activo' ? 'bg-primary/10 text-primary border-primary/20' : ''}
                        ${sprint.status === 'completado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                        ${sprint.status === 'planificacion' ? 'bg-slate-100 text-slate-600 border-slate-200' : ''}
                      `}>{sprint.status}</Badge>
                    </div>
                    
                    <div className="p-5 space-y-6 flex-1 flex flex-col justify-between">
                      <div>
                        {sprint.startDate && sprint.endDate && (
                          <div className="flex items-center text-sm font-medium text-slate-600 mb-5">
                            <ClockIcon />
                            <span>{format(new Date(sprint.startDate), "d MMM")} - {format(new Date(sprint.endDate), "d MMM", { locale: es })}</span>
                          </div>
                        )}
                        
                        <div>
                          <div className="flex justify-between text-sm mb-2 font-medium">
                            <span className="text-slate-500">Progreso de Tareas</span>
                            <span className={progress === 100 ? "text-emerald-600" : "text-slate-900"}>{progress}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${progress}%` }}></div>
                          </div>
                          <p className="text-xs font-medium text-slate-500 mt-2 text-right">{completedCount} de {sprintTasks.length} completadas</p>
                        </div>
                      </div>
                      
                      {/* Workload */}
                      <div className="pt-5 border-t border-slate-100">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Distribución</p>
                        <div className="flex flex-wrap gap-2">
                          {Array.from(new Set(sprintTasks.map((t: any) => t.assignedTo?.name).filter(Boolean))).map((memberName: any) => {
                            const mTasks = sprintTasks.filter((t: any) => t.assignedTo?.name === memberName);
                            const mCompleted = mTasks.filter((t: any) => t.status === "completada").length;
                            return (
                              <div key={memberName} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 text-xs font-medium text-slate-700">
                                <span>{memberName}</span>
                                <span className="text-slate-500 bg-white px-1.5 rounded-sm border border-slate-100 shadow-sm">{mCompleted}/{mTasks.length}</span>
                              </div>
                            );
                          })}
                          {sprintTasks.length === 0 && <span className="text-xs text-slate-400">No hay tareas asignadas</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Sprint Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Planificar Sprint</DialogTitle>
            <DialogDescription className="text-sm">
              Crea un nuevo ciclo de trabajo para estructurar las tareas del equipo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Nombre del Sprint</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Sprint 1 - MVP" className="focus-visible:ring-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Fecha de Inicio</label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="focus-visible:ring-1" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Fecha de Fin</label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="focus-visible:ring-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button disabled={createMutation.isPending || !name} onClick={handleCreate} className="shadow-sm">
              {createMutation.isPending ? "Creando..." : "Crear Sprint"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
