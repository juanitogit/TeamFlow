import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("teamflow_token")}`, "Content-Type": "application/json" };
}

// Corporate SVGs
const TasksIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </svg>
);

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const EmptyIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-slate-300">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export function Tasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { workspaces } = useWorkspaces();
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [commitSha, setCommitSha] = useState("");
  const [completingTask, setCompletingTask] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<any>(null);

  useEffect(() => {
    const id = localStorage.getItem("active_workspace_id");
    if (id) setWorkspaceId(parseInt(id));
  }, []);

  const activeWorkspaceRole = workspaces?.find(w => w.workspace.id === workspaceId)?.role;
  const isLeader = activeWorkspaceRole === "leader" || activeWorkspaceRole === "co-leader";

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["workspace_tasks", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const res = await fetch(`/api/workspace-tasks/workspace/${workspaceId}`, { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Error fetching tasks");
      return res.json();
    },
    enabled: !!workspaceId
  });

  const statusMutation = useMutation({
    mutationFn: async ({ taskId, status, sha }: { taskId: number, status: string, sha?: string }) => {
      const res = await fetch(`/api/workspace-tasks/${taskId}/status`, {
        method: "PATCH",
        headers: getAuthHeader(),
        body: JSON.stringify({ status, commitSha: sha })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: (data, variables) => {
      toast({ title: variables.status === "completada" ? "¡Tarea completada!" : "Estado actualizado" });
      setCompletingTask(null);
      setCommitSha("");
      queryClient.invalidateQueries({ queryKey: ["workspace_tasks", workspaceId] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const editMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: number, data: any }) => {
      const res = await fetch(`/api/workspace-tasks/${taskId}`, {
        method: "PUT",
        headers: getAuthHeader(),
        body: JSON.stringify(data)
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Tarea editada exitosamente" });
      setEditingTask(null);
      queryClient.invalidateQueries({ queryKey: ["workspace_tasks", workspaceId] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await fetch(`/api/workspace-tasks/${taskId}`, { method: "DELETE", headers: getAuthHeader() });
      if (!res.ok) throw new Error("Error deleting task");
    },
    onSuccess: () => {
      toast({ title: "Tarea eliminada." });
      queryClient.invalidateQueries({ queryKey: ["workspace_tasks", workspaceId] });
    }
  });

  const handleStatusChange = (task: any, newStatus: string) => {
    if (newStatus === "completada" && task.type === "programacion" && !commitSha && !task.commitSha) {
      setCompletingTask(task.id);
      return;
    }
    statusMutation.mutate({ taskId: task.id, status: newStatus, sha: commitSha || task.commitSha });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    editMutation.mutate({ taskId: editingTask.id, data: { title: editingTask.title, description: editingTask.description, status: editingTask.status, dueDate: editingTask.dueDate } });
  };

  if (!workspaceId) {
    return <div className="text-center py-12 text-slate-500 font-medium bg-white border border-slate-200 rounded-lg shadow-sm">Selecciona un workspace arriba.</div>;
  }

  const myTasks = tasks?.filter((t: any) => t.assignedTo.id === user?.id) || [];
  const teamTasks = tasks || [];

  const renderTaskList = (list: any[], showAssignee = false) => {
    const filtered = list.filter((t: any) => statusFilter === "todos" || t.status === statusFilter);
    if (isLoading) return <div className="h-40 flex items-center justify-center text-slate-500 text-sm bg-slate-50 rounded-lg border border-slate-100">Cargando tareas...</div>;
    if (filtered.length === 0) return (
      <div className="py-16 flex flex-col items-center text-center bg-white border border-slate-200 border-dashed rounded-lg shadow-sm">
        <EmptyIcon />
        <h3 className="text-lg font-semibold text-slate-900">¡Sin tareas!</h3>
        <p className="text-slate-500 text-sm mt-1">No hay tareas que coincidan con los filtros.</p>
      </div>
    );

    return (
      <div className="flex flex-col space-y-3">
        {filtered.map((task: any) => (
          <div key={task.id} className={`bg-white border rounded-lg p-5 transition-all shadow-sm hover:shadow-md ${task.status === 'completada' ? 'border-slate-100 bg-slate-50/50 opacity-80' : 'border-slate-200'}`}>
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                {!showAssignee && (
                  <button 
                    className={`flex items-center justify-center h-6 w-6 rounded-full border transition-colors flex-shrink-0 mt-0.5 ${
                      task.status === 'completada' 
                        ? 'border-emerald-500 bg-emerald-500 text-white' 
                        : 'border-slate-300 text-transparent hover:border-emerald-500 hover:text-emerald-500/20'
                    }`}
                    onClick={() => task.status !== 'completada' && handleStatusChange(task, 'completada')}
                    disabled={task.status === 'completada' || statusMutation.isPending}
                  >
                    <CheckIcon />
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <Badge variant="outline" className="font-normal text-[10px] px-2 py-0 h-5 bg-slate-100 text-slate-600 border-slate-200 uppercase tracking-wider">{task.type}</Badge>
                    <Badge variant="outline" className={`font-normal text-[10px] px-2 py-0 h-5 uppercase tracking-wider ${
                      task.status === 'completada' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      task.status === 'en_progreso' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      task.status === 'en_revision' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>{task.status.replace("_", " ")}</Badge>
                    {showAssignee && (
                       <span className="flex items-center gap-1.5 ml-auto text-xs font-medium text-slate-700 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                         <img src={task.assignedTo.avatarUrl || `https://ui-avatars.com/api/?name=${task.assignedTo.name}&background=f8fafc&color=334155`} className="w-4 h-4 rounded-full border border-slate-200 object-cover" />
                         {task.assignedTo.name}
                       </span>
                    )}
                  </div>
                  <h3 className={`text-base font-semibold text-slate-900 ${task.status === 'completada' ? 'line-through text-slate-500' : ''}`}>{task.title}</h3>
                  {task.description && <p className="text-sm text-slate-500 mt-1">{task.description}</p>}
                  
                  {completingTask === task.id && !showAssignee && (
                    <div className="mt-3 flex items-center gap-2 bg-slate-50 p-2 rounded-md border border-slate-200">
                      <Input placeholder="Commit SHA..." value={commitSha} onChange={e => setCommitSha(e.target.value)} className="h-8 text-sm font-mono focus-visible:ring-1" />
                      <Button size="sm" className="h-8 shadow-sm" onClick={() => handleStatusChange(task, 'completada')}>Confirmar</Button>
                      <Button size="sm" variant="ghost" className="h-8 px-2 text-slate-400 hover:text-slate-600" onClick={() => { setCompletingTask(null); setCommitSha(""); }}>Cancelar</Button>
                    </div>
                  )}

                  {task.commitSha && (
                    <div className="mt-3 text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded inline-flex items-center border border-slate-200">
                      <span className="font-semibold text-slate-600 mr-1">SHA:</span> {task.commitSha.substring(0, 7)}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-start md:items-end gap-2 shrink-0 ml-10 md:ml-0">
                {task.dueDate ? (
                  <div className={`text-xs font-medium px-2.5 py-1 rounded-md ${
                    new Date(task.dueDate) < new Date() && task.status !== 'completada' 
                      ? 'bg-red-50 text-red-700 border border-red-100' 
                      : 'text-slate-500 border border-transparent'
                  }`}>
                    Vence: {format(new Date(task.dueDate), "d MMM", { locale: es })}
                  </div>
                ) : <div className="text-xs text-slate-400 px-2.5 py-1">Sin fecha</div>}

                {showAssignee && isLeader && (
                  <div className="flex gap-2 mt-2 w-full md:w-auto">
                    <Dialog open={editingTask?.id === task.id} onOpenChange={(open) => { if (!open) setEditingTask(null); else setEditingTask({...task, dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : ''}); }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="h-7 text-xs flex-1 md:flex-none">Editar</Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle className="text-lg">Editar Tarea</DialogTitle>
                        </DialogHeader>
                        {editingTask && (
                          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
                            <div>
                              <label className="text-sm font-medium text-slate-700 block mb-1.5">Título</label>
                              <Input required value={editingTask.title} onChange={e => setEditingTask({...editingTask, title: e.target.value})} className="focus-visible:ring-1" />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-slate-700 block mb-1.5">Descripción</label>
                              <Input value={editingTask.description || ''} onChange={e => setEditingTask({...editingTask, description: e.target.value})} className="focus-visible:ring-1" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-slate-700 block mb-1.5">Fecha Límite</label>
                                <Input type="datetime-local" value={editingTask.dueDate} onChange={e => setEditingTask({...editingTask, dueDate: e.target.value})} className="focus-visible:ring-1" />
                              </div>
                              <div>
                                <label className="text-sm font-medium text-slate-700 block mb-1.5">Estado</label>
                                <Select value={editingTask.status} onValueChange={v => setEditingTask({...editingTask, status: v})}>
                                  <SelectTrigger className="focus-visible:ring-1"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pendiente">Pendiente</SelectItem>
                                    <SelectItem value="en_progreso">En Progreso</SelectItem>
                                    <SelectItem value="en_revision">En Revisión</SelectItem>
                                    <SelectItem value="completada">Completada</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="pt-4 flex gap-2 justify-end">
                              <Button type="button" variant="outline" onClick={() => setEditingTask(null)}>Cancelar</Button>
                              <Button type="submit" className="shadow-sm">Guardar cambios</Button>
                            </div>
                          </form>
                        )}
                      </DialogContent>
                    </Dialog>
                    <Button size="sm" variant="destructive" onClick={() => {
                      if(window.confirm("¿Seguro que deseas eliminar esta tarea?")) {
                        deleteMutation.mutate(task.id);
                      }
                    }} className="h-7 text-xs flex-1 md:flex-none opacity-80 hover:opacity-100">Borrar</Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              <TasksIcon />
            </div>
            Tareas
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Gestiona y supervisa las tareas del proyecto</p>
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-white text-sm focus-visible:ring-1 shadow-sm">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas las tareas</SelectItem>
            <SelectItem value="pendiente">Pendientes</SelectItem>
            <SelectItem value="en_progreso">En Progreso</SelectItem>
            <SelectItem value="en_revision">En Revisión</SelectItem>
            <SelectItem value="completada">Completadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLeader ? (
        <Tabs defaultValue="mis_tareas" className="w-full">
          <TabsList className="bg-slate-100 p-1 rounded-lg inline-flex mb-6 h-auto">
            <TabsTrigger value="mis_tareas" className="rounded-md px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all text-slate-500">Mis Tareas</TabsTrigger>
            <TabsTrigger value="equipo" className="rounded-md px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all text-slate-500">Equipo (Líder)</TabsTrigger>
          </TabsList>
          <TabsContent value="mis_tareas" className="mt-0 outline-none">
            {renderTaskList(myTasks, false)}
          </TabsContent>
          <TabsContent value="equipo" className="mt-0 outline-none">
            {renderTaskList(teamTasks, true)}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="pt-2">
          {renderTaskList(myTasks, false)}
        </div>
      )}
    </div>
  );
}
