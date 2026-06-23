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

function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("teamflow_token")}`, "Content-Type": "application/json" };
}

// Brutalist SVGs
const SprintIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
    <path d="M4 14l8-10v8h8l-8 10v-8H4z" />
  </svg>
);

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" className="mr-2">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const EmptyIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" className="mb-4 text-black">
    <rect x="3" y="3" width="18" height="18" />
    <path d="M8 12h8" />
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
      toast({ title: "Sprint creado" });
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
      <div className="text-2xl font-black uppercase border-4 border-black p-4 animate-pulse">Cargando</div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-4 border-black pb-4">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-black flex items-center gap-3">
            <SprintIcon />
            Sprints
          </h1>
          <p className="text-black font-bold uppercase tracking-widest mt-1 text-sm">Organiza iteraciones</p>
        </div>
        
        {isLeader && (
          <Button onClick={() => setCreateOpen(true)} className="shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-sm font-black uppercase h-12 px-6">
            <PlusIcon />
            Nuevo Sprint
          </Button>
        )}
      </div>

      {!workspaceId ? (
        <div className="text-center py-12 text-black font-black uppercase bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">Selecciona un workspace arriba.</div>
      ) : (
        <div className="space-y-6">
          {sprints?.length === 0 ? (
            <div className="py-16 flex flex-col items-center text-center bg-white border-4 border-black border-dashed shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <EmptyIcon />
              <h3 className="text-2xl font-black uppercase text-black">Sin Sprints</h3>
              <p className="text-black font-bold uppercase mt-2 text-sm">No hay ciclos de trabajo creados.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sprints?.map((sprint: any) => {
                const sprintTasks = tasks?.filter((t: any) => t.sprintId === sprint.id) || [];
                const completedCount = sprintTasks.filter((t: any) => t.status === "completada").length;
                const progress = sprintTasks.length ? Math.round((completedCount / sprintTasks.length) * 100) : 0;
                
                return (
                  <div key={sprint.id} className="border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all flex flex-col h-full relative">
                    <div className="p-4 border-b-4 border-black bg-white flex items-center justify-between">
                      <h3 className="text-2xl text-black font-black uppercase tracking-tight truncate pr-2">{sprint.name}</h3>
                      <Badge variant="outline" className={`
                        ${sprint.status === 'activo' ? 'bg-primary text-white border-2 border-black' : ''}
                        ${sprint.status === 'completado' ? 'bg-accent text-black border-2 border-black' : ''}
                        ${sprint.status === 'planificacion' ? 'bg-secondary text-black border-2 border-black' : ''}
                      `}>{sprint.status}</Badge>
                    </div>
                    <div className="p-6 space-y-6 flex-1 flex flex-col justify-between">
                      <div>
                        {sprint.startDate && sprint.endDate && (
                          <div className="flex items-center gap-2 text-sm font-bold uppercase text-black bg-secondary border-2 border-black p-2 w-fit mb-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <span className="bg-black text-white px-2 py-0.5 text-xs mr-2">Fechas</span>
                            <span>{format(new Date(sprint.startDate), "d MMM")} - {format(new Date(sprint.endDate), "d MMM", { locale: es })}</span>
                          </div>
                        )}
                        
                        <div>
                          <div className="flex justify-between text-xs mb-2 font-black uppercase tracking-widest">
                            <span className="text-black">Progreso</span>
                            <span className={progress === 100 ? "text-accent" : "text-primary"}>{progress}%</span>
                          </div>
                          <div className="w-full bg-secondary border-2 border-black h-6">
                            <div className={`h-full border-r-2 border-black transition-all ${progress === 100 ? "bg-accent" : "bg-primary"}`} style={{ width: `${progress}%` }}></div>
                          </div>
                          <p className="text-xs font-bold uppercase text-black mt-2 text-right">{completedCount} / {sprintTasks.length} completadas</p>
                        </div>
                      </div>
                      
                      {/* Workload */}
                      <div className="pt-6 border-t-4 border-dashed border-black">
                        <p className="text-xs font-black uppercase tracking-widest text-black mb-3">Carga de Trabajo</p>
                        <div className="flex flex-wrap gap-2">
                          {Array.from(new Set(sprintTasks.map((t: any) => t.assignedTo?.name).filter(Boolean))).map((memberName: any) => {
                            const mTasks = sprintTasks.filter((t: any) => t.assignedTo?.name === memberName);
                            const mCompleted = mTasks.filter((t: any) => t.status === "completada").length;
                            return (
                              <div key={memberName} className="flex items-center gap-2 bg-white border-2 border-black px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-xs font-bold uppercase">
                                <span className="text-black">{memberName}</span>
                                <span className="text-white bg-black px-1.5 py-0.5">{mCompleted}/{mTasks.length}</span>
                              </div>
                            );
                          })}
                          {sprintTasks.length === 0 && <span className="text-xs font-bold uppercase text-muted-foreground">Sin tareas</span>}
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
        <DialogContent className="border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <DialogHeader className="border-b-4 border-black pb-4 mb-4">
            <DialogTitle className="text-3xl font-black uppercase">Nuevo Sprint</DialogTitle>
            <DialogDescription className="font-bold uppercase text-xs mt-2 text-black">Define un ciclo de trabajo para agrupar tareas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase">Nombre del Sprint</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej. MVP V1" className="border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus-visible:ring-black" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase">Fecha Inicio</label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus-visible:ring-black" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase">Fecha Fin</label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus-visible:ring-black" />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button disabled={createMutation.isPending || !name} onClick={handleCreate} className="w-full border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black uppercase h-12">
              {createMutation.isPending ? "Creando..." : "Crear Sprint"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
