import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { motion } from "framer-motion";
import { IconCircleCheck, IconClock, IconListCheck } from "@tabler/icons-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LogoLoader } from "@/components/ui/logo-loader";

function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("teamflow_token")}`, "Content-Type": "application/json" };
}

export function Tasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: workspaces } = useWorkspaces();
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [commitSha, setCommitSha] = useState("");
  const [completingTask, setCompletingTask] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<any>(null);

  useEffect(() => {
    const id = localStorage.getItem("active_workspace_id");
    if (id) setWorkspaceId(parseInt(id));
  }, []);

  const role = typeof window !== 'undefined' ? localStorage.getItem("active_workspace_role") : null;
  const isLeader = role === "leader" || role === "co-leader";

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

  const handleComplete = (task: any) => {
    handleStatusChange(task, "completada");
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    
    // Ensure empty strings are sent as null for the backend
    const finalDueDate = editingTask.dueDate === '' ? null : editingTask.dueDate;
    
    editMutation.mutate({ taskId: editingTask.id, data: { title: editingTask.title, description: editingTask.description, status: editingTask.status, dueDate: finalDueDate } });
  };

  const getLocalDatetimeLocal = (dateString: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  if (!workspaceId) {
    return <div className="text-center py-12 text-slate bg-white rounded-[24px] shadow-sm border border-mist">Selecciona un workspace arriba.</div>;
  }

  const myTasks = tasks?.filter((t: any) => t.assignedTo.id === user?.id) || [];
  const teamTasks = tasks || [];

  const renderTaskList = (list: any[], showAssignee = false) => {
    const filteredTasks = list.filter((t: any) => statusFilter === "todos" || t.status === statusFilter);
    if (isLoading) return <div className="py-24 w-full flex items-center justify-center"><LogoLoader className="h-12 w-12" /></div>;
    if (filteredTasks.length === 0) return (
      <div className="py-16 flex flex-col items-center justify-center text-center bg-white rounded-[24px] border border-dashed border-mist shadow-sm">
        <IconCircleCheck className="h-16 w-16 text-emerald-200 mb-6" />
        <h3 className="text-xl font-semibold text-ink">¡Todo al día!</h3>
        <p className="text-slate mt-2">No hay tareas para el filtro seleccionado.</p>
      </div>
    );

    return (
      <div className="space-y-4">
        {filteredTasks.map((task: any) => {
          const daysLeft = task.dueDate ? differenceInDays(new Date(task.dueDate), new Date()) : null;
          
          return (
            <motion.div key={task.id} whileHover={{ y: -4 }}>
              <div className="bg-white border border-mist rounded-[24px] shadow-sm overflow-hidden p-6 transition-all">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="flex items-start gap-4 flex-1">
                    {!showAssignee && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={`rounded-full h-8 w-8 mt-0.5 shrink-0 ${task.status === 'completada' ? 'text-emerald-500 bg-emerald-50' : 'text-slate hover:text-primary hover:bg-primary/10 bg-slate-50'}`}
                        onClick={() => task.status !== 'completada' && handleComplete(task)}
                        disabled={task.status === 'completada' || statusMutation.isPending}
                      >
                        <IconCircleCheck className="h-6 w-6" />
                      </Button>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                        <span className={`text-[10px] uppercase font-bold tracking-widest ${
                          task.type === 'programacion' ? 'text-blue-500' :
                          task.type === 'documentacion' ? 'text-emerald-500' :
                          'text-purple-500'
                        }`}>
                          {task.type}
                        </span>
                        
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>

                        <span className={`text-[10px] uppercase font-bold tracking-widest ${
                          task.status === 'completada' ? 'text-emerald-500' :
                          task.status === 'en_progreso' ? 'text-blue-500' :
                          task.status === 'en_revision' ? 'text-orange-500' :
                          'text-slate-400'
                        }`}>
                          {task.status.replace('_', ' ')}
                        </span>

                        {showAssignee && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <div className="flex items-center gap-1.5 ml-auto text-xs font-medium text-slate-500">
                              <img src={task.assignedTo.avatarUrl || `https://ui-avatars.com/api/?name=${task.assignedTo.name}&background=fff`} className="w-4 h-4 rounded-full bg-slate-100" />
                              {task.assignedTo.name}
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <h3 className={`text-lg font-bold ${task.status === 'completada' ? 'text-slate-400 line-through' : 'text-ink'}`}>
                          {task.title}
                        </h3>
                        {!showAssignee && (
                          <Select value={task.status} onValueChange={(val) => handleStatusChange(task, val)}>
                            <SelectTrigger className="h-7 text-xs px-2 bg-slate-50 border-slate-200 ml-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendiente">Pendiente</SelectItem>
                              <SelectItem value="en_progreso">En Progreso</SelectItem>
                              <SelectItem value="en_revision">En Revisión</SelectItem>
                              <SelectItem value="completada">Completada</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-slate mt-1 whitespace-pre-wrap">{task.description}</p>
                      )}

                      {completingTask === task.id && !showAssignee && (
                        <div className="mt-4 flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <Input 
                            placeholder="Commit SHA de GitHub..." 
                            value={commitSha} 
                            onChange={e => setCommitSha(e.target.value)}
                            className="h-8 text-sm bg-white"
                          />
                          <Button size="sm" className="h-8 shrink-0 rounded-full" onClick={() => handleComplete(task)}>Confirmar</Button>
                          <Button size="sm" variant="ghost" className="h-8 shrink-0 text-slate rounded-full" onClick={() => { setCompletingTask(null); setCommitSha(""); }}>Cancelar</Button>
                        </div>
                      )}

                      {task.commitSha && (
                        <div className="mt-3 text-xs text-slate flex items-center gap-1">
                          <span className="font-semibold">Commit SHA:</span> 
                          <code className="bg-slate-100 px-1 py-0.5 rounded text-primary">{task.commitSha.substring(0, 7)}</code>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-start md:items-end gap-2 pl-12 md:pl-0 shrink-0">
                    <div className="flex items-center text-sm font-medium">
                      {task.dueDate ? (
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${daysLeft !== null && daysLeft < 0 ? 'bg-red-50 text-red-600' : daysLeft === 0 ? 'bg-slate-50 text-slate-600' : 'bg-blue-50/50 text-blue-600'}`}>
                          <IconClock className="h-3.5 w-3.5" />
                          <span className="text-xs">
                            {daysLeft !== null && daysLeft < 0 ? 'Vencida' : daysLeft === 0 ? 'Para hoy' : `En ${daysLeft} días`}
                          </span>
                          <span className="opacity-40 text-xs border-l pl-1.5 border-current">
                            {format(new Date(task.dueDate), "d MMM", { locale: es })}
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 font-normal px-3 py-1.5 rounded-full bg-slate-50/50">Sin fecha límite</div>
                      )}
                    </div>
                    
                    {showAssignee && isLeader && (
                      <div className="flex gap-2 mt-2 w-full md:w-auto">
                        <Dialog open={editingTask?.id === task.id} onOpenChange={(open) => { if (!open) setEditingTask(null); else setEditingTask({...task, dueDate: getLocalDatetimeLocal(task.dueDate)}); }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="h-7 text-xs rounded-full">Editar</Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <DialogTitle>Editar Tarea</DialogTitle>
                            </DialogHeader>
                            {editingTask && (
                              <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
                                <div>
                                  <label className="text-sm font-medium block mb-1.5">Título</label>
                                  <Input required value={editingTask.title} onChange={e => setEditingTask({...editingTask, title: e.target.value})} className="rounded-xl" />
                                </div>
                                <div>
                                  <label className="text-sm font-medium block mb-1.5">Descripción</label>
                                  <Input value={editingTask.description || ''} onChange={e => setEditingTask({...editingTask, description: e.target.value})} className="rounded-xl" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium block mb-1.5">Fecha Límite</label>
                                    <Input type="datetime-local" value={editingTask.dueDate} onChange={e => setEditingTask({...editingTask, dueDate: e.target.value})} className="rounded-xl" />
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium block mb-1.5">Estado</label>
                                    <Select value={editingTask.status} onValueChange={v => setEditingTask({...editingTask, status: v})}>
                                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
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
                                  <Button type="button" variant="ghost" onClick={() => setEditingTask(null)} className="rounded-full">Cancelar</Button>
                                  <Button type="submit" className="rounded-full">Guardar</Button>
                                </div>
                              </form>
                            )}
                          </DialogContent>
                        </Dialog>
                        <Button size="sm" variant="ghost" onClick={() => {
                          if(window.confirm("¿Seguro que deseas eliminar esta tarea?")) {
                            deleteMutation.mutate(task.id);
                          }
                        }} className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full">Borrar</Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-2xl">
              <IconListCheck className="h-6 w-6 text-[#fe81e4]" />
            </div>
            Tareas de Proyecto
          </h1>
          <p className="text-slate mt-1 text-sm font-medium">Gestiona tu backlog y actividades</p>
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-white rounded-full border-mist shadow-sm text-sm font-medium text-slate">
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
        <Tabs defaultValue="mis_tareas" className="w-full mt-4">
          <TabsList className="bg-white border border-mist shadow-sm p-1 rounded-full inline-flex mb-6 h-12">
            <TabsTrigger value="mis_tareas" className="rounded-full px-6 py-2 text-sm font-medium data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all text-slate">Mis Tareas</TabsTrigger>
            <TabsTrigger value="equipo" className="rounded-full px-6 py-2 text-sm font-medium data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all text-slate">Equipo (Líder)</TabsTrigger>
          </TabsList>
          <TabsContent value="mis_tareas" className="mt-0 outline-none">
            {renderTaskList(myTasks, false)}
          </TabsContent>
          <TabsContent value="equipo" className="mt-0 outline-none">
            {renderTaskList(teamTasks, true)}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="mt-6">
          {renderTaskList(myTasks, false)}
        </div>
      )}
    </motion.div>
  );
}
