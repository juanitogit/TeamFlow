import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Timer, Plus, Clock, Users, FolderKanban } from "lucide-react";
import { IconSprints } from "@/components/ui/custom-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { LogoLoader } from "@/components/ui/logo-loader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("teamflow_token")}`, "Content-Type": "application/json" };
}

export function Sprints() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [isLeader, setIsLeader] = useState(false);
  const { data: workspaces } = useWorkspaces();
  
  const [createOpen, setCreateOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<any>(null);
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

  const editMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/sprints/${data.id}`, { method: "PUT", headers: getAuthHeader(), body: JSON.stringify(data) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Sprint editado exitosamente" });
      setEditingSprint(null);
      queryClient.invalidateQueries({ queryKey: ["sprints", workspaceId] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const handleCreate = () => {
    if (!name || !workspaceId) return;
    createMutation.mutate({ workspaceId, name, startDate: startDate || undefined, endDate: endDate || undefined });
  };

  const handleEdit = () => {
    if (!editingSprint?.name) return;
    editMutation.mutate({ 
      id: editingSprint.id, 
      name: editingSprint.name, 
      startDate: editingSprint.startDate || undefined, 
      endDate: editingSprint.endDate || undefined 
    });
  };

  if (!workspaceId) return <div className="text-center py-12 text-slate bg-white rounded-[24px] border border-mist">Selecciona un workspace arriba.</div>;
  if (loadingSprints) return <div className="py-24 w-full flex items-center justify-center"><LogoLoader className="h-12 w-12" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-2xl">
              <IconSprints className="h-6 w-6" />
            </div>
            Sprints y Ciclos
          </h1>
          <p className="text-slate mt-1 text-sm font-medium">Organiza el trabajo en iteraciones y revisa la carga de tu equipo</p>
        </div>
        
        {isLeader && (
          <Button onClick={() => setCreateOpen(true)} className="bg-primary hover:bg-primary/90 text-white shadow-sm rounded-full">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Sprint
          </Button>
        )}
      </div>

      <div className="space-y-6">
          {sprints?.length === 0 ? (
            <div className="py-16 flex flex-col items-center text-center bg-white rounded-[24px] border border-dashed border-mist">
              <FolderKanban className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-ink">Sin Sprints</h3>
              <p className="text-slate mt-1 text-sm">No hay ciclos de trabajo creados.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sprints?.map((sprint: any) => {
                const sprintTasks = tasks?.filter((t: any) => t.sprintId === sprint.id) || [];
                const completedCount = sprintTasks.filter((t: any) => t.status === "completada").length;
                const progress = sprintTasks.length ? Math.round((completedCount / sprintTasks.length) * 100) : 0;
                const isActive = sprint.status === 'activo';
                const isPast = sprint.status === 'completado';
                
                return (
                  <Card key={sprint.id} className="rounded-[24px] border-mist bg-white shadow-sm overflow-hidden flex flex-col">
                    <CardHeader className="bg-snow border-b border-slate-100 pb-4">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className={`font-medium ${isActive ? 'bg-blue-50 text-blue-600 border-none' : isPast ? 'bg-slate-50 text-slate-500 border-none' : 'bg-orange-50 text-orange-600 border-none'}`}>
                          {isActive ? "Activo" : isPast ? "Terminado" : "Próximo"}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate uppercase tracking-wider">{sprintTasks.length} tareas</span>
                          {isLeader && (
                            <Button variant="ghost" size="sm" className="h-6 text-xs text-blue-500 hover:text-blue-600 hover:bg-blue-50 px-2 rounded-full" onClick={() => {
                              setEditingSprint({
                                ...sprint,
                                startDate: sprint.startDate ? new Date(sprint.startDate).toISOString().split('T')[0] : '',
                                endDate: sprint.endDate ? new Date(sprint.endDate).toISOString().split('T')[0] : '',
                              });
                            }}>Editar</Button>
                          )}
                        </div>
                      </div>
                      <CardTitle className="text-lg text-ink font-semibold">{sprint.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4 flex-1 flex flex-col justify-between">
                      <div>
                        {sprint.startDate && sprint.endDate && (
                          <div className="flex items-center gap-2 text-sm text-slate bg-cloud p-2 rounded-lg mb-4 w-fit">
                            <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                            <span>{format(new Date(sprint.startDate), "d MMM")} - {format(new Date(sprint.endDate), "d MMM", { locale: es })}</span>
                          </div>
                        )}
                        
                        <div>
                          <div className="flex justify-between text-xs mb-1 font-medium">
                            <span className="text-slate">Progreso Tareas</span>
                            <span className={progress === 100 ? "text-emerald-500" : "text-primary"}>{progress}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div className={`h-2 rounded-full ${progress === 100 ? "bg-emerald-400" : "bg-primary"}`} style={{ width: `${progress}%` }}></div>
                          </div>
                          <p className="text-xs text-slate mt-2 text-right">{completedCount} de {sprintTasks.length} completadas</p>
                        </div>
                      </div>
                      
                      {/* Workload */}
                      <div className="pt-4 border-t border-mist/50">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate mb-2">Carga de Trabajo</p>
                        <div className="flex flex-wrap gap-2">
                          {Array.from(new Set(sprintTasks.map((t: any) => t.assignedTo?.name).filter(Boolean))).map((memberName: any) => {
                            const mTasks = sprintTasks.filter((t: any) => t.assignedTo?.name === memberName);
                            const mCompleted = mTasks.filter((t: any) => t.status === "completada").length;
                            return (
                              <div key={memberName} className="flex items-center gap-2 bg-white border border-slate-100 px-2.5 py-1.5 rounded-lg shadow-sm text-xs">
                                <span className="font-medium text-ink">{memberName}</span>
                                <span className="text-slate-400 bg-slate-50 px-1.5 rounded">{mCompleted}/{mTasks.length}</span>
                              </div>
                            );
                          })}
                          {sprintTasks.length === 0 && <span className="text-xs text-slate">Sin tareas asignadas</span>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

      {/* Create Sprint Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Sprint</DialogTitle>
            <DialogDescription>Define un ciclo de trabajo para agrupar tareas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre del Sprint</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Sprint 1 - MVP" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha de Inicio</label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha de Fin</label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button disabled={createMutation.isPending || !name} onClick={handleCreate} className="rounded-full">
              {createMutation.isPending ? "Creando..." : "Crear Sprint"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Sprint Dialog */}
      <Dialog open={!!editingSprint} onOpenChange={(open) => !open && setEditingSprint(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Sprint</DialogTitle>
          </DialogHeader>
          {editingSprint && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre del Sprint</label>
                <Input value={editingSprint.name} onChange={e => setEditingSprint({...editingSprint, name: e.target.value})} placeholder="Ej. Sprint 1 - MVP" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha de Inicio</label>
                  <Input type="date" value={editingSprint.startDate} onChange={e => setEditingSprint({...editingSprint, startDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha de Fin</label>
                  <Input type="date" value={editingSprint.endDate} onChange={e => setEditingSprint({...editingSprint, endDate: e.target.value})} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingSprint(null)} className="rounded-full">Cancelar</Button>
            <Button disabled={editMutation.isPending || !editingSprint?.name} onClick={handleEdit} className="rounded-full">
              {editMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
