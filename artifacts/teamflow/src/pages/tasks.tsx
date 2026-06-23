import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("teamflow_token")}`, "Content-Type": "application/json" };
}

// Brutalist SVG Icons
const TasksIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
    <path d="M9 5H21M9 12H21M9 19H21M3 5H5M3 12H5M3 19H5" />
  </svg>
);

const CheckIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
    <path d="M20 6L9 17l-5-5" />
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
    return <div className="text-center py-12 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">Selecciona un workspace arriba.</div>;
  }

  const myTasks = tasks?.filter((t: any) => t.assignedTo.id === user?.id) || [];
  const teamTasks = tasks || [];

  const renderTaskList = (list: any[], showAssignee = false) => {
    const filtered = list.filter((t: any) => statusFilter === "todos" || t.status === statusFilter);
    if (isLoading) return <div className="h-40 flex items-center justify-center border-2 border-black bg-secondary shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold uppercase tracking-widest">Cargando...</div>;
    if (filtered.length === 0) return <div className="py-16 text-center border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold uppercase tracking-widest text-muted-foreground">¡Sin tareas!</div>;

    return (
      <div className="space-y-6">
        {filtered.map((task: any) => (
          <div key={task.id} className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 transition-all hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                {!showAssignee && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`rounded-none border-2 h-10 w-10 shrink-0 ${task.status === 'completada' ? 'border-primary bg-primary text-primary-foreground' : 'border-black bg-transparent text-black hover:bg-black hover:text-white'}`}
                    onClick={() => task.status !== 'completada' && handleStatusChange(task, 'completada')}
                    disabled={task.status === 'completada' || statusMutation.isPending}
                  >
                    <CheckIcon />
                  </Button>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-widest bg-accent">{task.type}</span>
                    <span className="border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">{task.status.replace("_", " ")}</span>
                    {showAssignee && (
                       <span className="border-2 border-primary text-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ml-auto flex items-center gap-1">
                         <img src={task.assignedTo.avatarUrl || `https://ui-avatars.com/api/?name=${task.assignedTo.name}&background=000&color=fff`} className="w-3 h-3 border border-black" />
                         {task.assignedTo.name}
                       </span>
                    )}
                  </div>
                  <h3 className={`text-2xl font-black uppercase tracking-tight ${task.status === 'completada' ? 'line-through opacity-50' : ''}`}>{task.title}</h3>
                  {task.description && <p className="text-sm font-medium mt-2 border-l-4 border-black pl-3">{task.description}</p>}
                  
                  {completingTask === task.id && !showAssignee && (
                    <div className="mt-4 flex items-center gap-2 bg-secondary p-3 border-2 border-black">
                      <Input placeholder="Commit SHA..." value={commitSha} onChange={e => setCommitSha(e.target.value)} className="border-2 border-black rounded-none h-8 font-mono text-xs" />
                      <Button size="sm" className="rounded-none border-2 border-black h-8 font-bold uppercase text-xs" onClick={() => handleStatusChange(task, 'completada')}>OK</Button>
                      <Button size="sm" variant="ghost" className="rounded-none border-2 border-transparent h-8 font-bold uppercase text-xs" onClick={() => { setCompletingTask(null); setCommitSha(""); }}>X</Button>
                    </div>
                  )}

                  {task.commitSha && (
                    <div className="mt-3 text-xs font-mono font-bold bg-black text-white px-2 py-1 inline-block">SHA: {task.commitSha.substring(0, 7)}</div>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                {task.dueDate ? (
                  <div className="border-2 border-black px-3 py-1 font-bold uppercase text-xs">
                    Vence: {format(new Date(task.dueDate), "d MMM", { locale: es })}
                  </div>
                ) : <div className="border-2 border-transparent px-3 py-1 font-bold uppercase text-xs text-muted-foreground">Sin fecha</div>}

                {showAssignee && isLeader && (
                  <div className="flex gap-2 mt-4">
                    <Dialog open={editingTask?.id === task.id} onOpenChange={(open) => { if (!open) setEditingTask(null); else setEditingTask({...task, dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : ''}); }}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="rounded-none border-2 border-black font-bold uppercase text-xs h-8">Editar</Button>
                      </DialogTrigger>
                      <DialogContent className="border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-black uppercase border-b-2 border-black pb-2">Editar Tarea</DialogTitle>
                        </DialogHeader>
                        {editingTask && (
                          <form onSubmit={handleEditSubmit} className="space-y-4 pt-4">
                            <div>
                              <label className="text-xs font-bold uppercase block mb-1">Título</label>
                              <Input required value={editingTask.title} onChange={e => setEditingTask({...editingTask, title: e.target.value})} className="border-2 border-black rounded-none" />
                            </div>
                            <div>
                              <label className="text-xs font-bold uppercase block mb-1">Descripción</label>
                              <Input value={editingTask.description || ''} onChange={e => setEditingTask({...editingTask, description: e.target.value})} className="border-2 border-black rounded-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs font-bold uppercase block mb-1">Fecha Límite</label>
                                <Input type="datetime-local" value={editingTask.dueDate} onChange={e => setEditingTask({...editingTask, dueDate: e.target.value})} className="border-2 border-black rounded-none" />
                              </div>
                              <div>
                                <label className="text-xs font-bold uppercase block mb-1">Estado</label>
                                <Select value={editingTask.status} onValueChange={v => setEditingTask({...editingTask, status: v})}>
                                  <SelectTrigger className="border-2 border-black rounded-none"><SelectValue /></SelectTrigger>
                                  <SelectContent className="border-2 border-black rounded-none">
                                    <SelectItem value="pendiente">Pendiente</SelectItem>
                                    <SelectItem value="en_progreso">En Progreso</SelectItem>
                                    <SelectItem value="en_revision">En Revisión</SelectItem>
                                    <SelectItem value="completada">Completada</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <Button type="submit" className="w-full rounded-none border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold uppercase mt-4">Guardar</Button>
                          </form>
                        )}
                      </DialogContent>
                    </Dialog>
                    <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(task.id)} className="rounded-none border-2 border-black font-bold uppercase text-xs h-8">Borrar</Button>
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
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-4 border-black pb-4">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter flex items-center gap-3">
            <TasksIcon />
            Tareas
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium uppercase tracking-widest">Gestión de Tareas</p>
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold uppercase text-xs">
            <SelectValue placeholder="Filtro" />
          </SelectTrigger>
          <SelectContent className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <SelectItem value="todos" className="font-bold uppercase text-xs">Todas</SelectItem>
            <SelectItem value="pendiente" className="font-bold uppercase text-xs">Pendientes</SelectItem>
            <SelectItem value="en_progreso" className="font-bold uppercase text-xs">En Progreso</SelectItem>
            <SelectItem value="en_revision" className="font-bold uppercase text-xs">En Revisión</SelectItem>
            <SelectItem value="completada" className="font-bold uppercase text-xs">Completadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLeader ? (
        <Tabs defaultValue="mis_tareas" className="w-full">
          <TabsList className="bg-transparent border-b-2 border-black w-full justify-start rounded-none p-0 h-auto space-x-4 mb-8">
            <TabsTrigger value="mis_tareas" className="rounded-none border-2 border-transparent data-[state=active]:border-black data-[state=active]:border-b-0 data-[state=active]:bg-white data-[state=active]:shadow-[2px_-2px_0px_0px_rgba(0,0,0,1)] px-6 py-3 font-black uppercase text-sm">Mis Tareas</TabsTrigger>
            <TabsTrigger value="equipo" className="rounded-none border-2 border-transparent data-[state=active]:border-black data-[state=active]:border-b-0 data-[state=active]:bg-white data-[state=active]:shadow-[2px_-2px_0px_0px_rgba(0,0,0,1)] px-6 py-3 font-black uppercase text-sm">Equipo (Líder)</TabsTrigger>
          </TabsList>
          <TabsContent value="mis_tareas" className="mt-0 outline-none">
            {renderTaskList(myTasks, false)}
          </TabsContent>
          <TabsContent value="equipo" className="mt-0 outline-none">
            {renderTaskList(teamTasks, true)}
          </TabsContent>
        </Tabs>
      ) : (
        renderTaskList(myTasks, false)
      )}
    </div>
  );
}
