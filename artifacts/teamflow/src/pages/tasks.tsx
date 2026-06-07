import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Clock, ListTodo, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("teamflow_token")}`, "Content-Type": "application/json" };
}

export function Tasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [commitSha, setCommitSha] = useState("");
  const [completingTask, setCompletingTask] = useState<number | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("active_workspace_id");
    if (id) setWorkspaceId(parseInt(id));
  }, []);

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

  const completeMutation = useMutation({
    mutationFn: async ({ taskId, sha }: { taskId: number, sha?: string }) => {
      const res = await fetch(`/api/workspace-tasks/${taskId}/complete`, {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify({ commitSha: sha })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "¡Tarea completada!" });
      setCompletingTask(null);
      setCommitSha("");
      queryClient.invalidateQueries({ queryKey: ["workspace_tasks", workspaceId] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const handleComplete = (task: any) => {
    if (task.type === "programacion" && !commitSha) {
      setCompletingTask(task.id);
      return;
    }
    completeMutation.mutate({ taskId: task.id, sha: commitSha });
  };

  if (isLoading) {
    return (<div className="h-96 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>);
  }

  // Filter tasks assigned to ME
  const myTasks = tasks?.filter((t: any) => t.assignedTo.id === user?.id) || [];
  const filteredTasks = myTasks.filter((t: any) => statusFilter === "todos" || t.status === statusFilter);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-3">
            <ListTodo className="h-7 w-7 text-primary" />
            Mis Tareas
          </h1>
          <p className="text-slate mt-1 text-sm">Gestiona el trabajo que te han asignado en este workspace</p>
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-card shadow-sm">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            <SelectItem value="pendiente">Pendientes</SelectItem>
            <SelectItem value="completada">Completadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!workspaceId ? (
        <div className="text-center py-12 text-slate bg-card rounded-xl shadow-sm border">Selecciona un workspace arriba.</div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center bg-card rounded-xl border border-dashed border-mist shadow-sm">
              <CheckCircle2 className="h-12 w-12 text-slate/30 mb-4" />
              <h3 className="text-lg font-medium text-ink">¡Estás al día!</h3>
              <p className="text-slate mt-1">No hay tareas para el filtro seleccionado.</p>
            </div>
          ) : (
            filteredTasks.map((task: any) => {
              const daysLeft = task.dueDate ? differenceInDays(new Date(task.dueDate), new Date()) : null;
              
              return (
                <Card key={task.id} className="card-monday border-none">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={`rounded-full h-8 w-8 mt-0.5 shrink-0 ${task.status === 'completada' ? 'text-emerald-500 bg-emerald-50' : 'text-slate hover:text-primary hover:bg-primary/10 bg-slate-50'}`}
                          onClick={() => task.status !== 'completada' && handleComplete(task)}
                          disabled={task.status === 'completada' || completeMutation.isPending}
                        >
                          <CheckCircle2 className="h-6 w-6" />
                        </Button>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant="outline" className={`
                              ${task.type === 'programacion' ? 'bg-blue-50 text-blue-600 border-none' : ''}
                              ${task.type === 'documentacion' ? 'bg-emerald-50 text-emerald-600 border-none' : ''}
                              ${task.type === 'investigacion' ? 'bg-purple-50 text-purple-600 border-none' : ''}
                              text-[10px] px-2 py-0 uppercase tracking-wider
                            `}>
                              {task.type}
                            </Badge>
                            {task.status === 'completada' && (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-500 border-none text-[10px] px-2 py-0 uppercase tracking-wider">Completada</Badge>
                            )}
                          </div>
                          <h3 className={`text-lg font-medium ${task.status === 'completada' ? 'text-slate line-through' : 'text-ink'}`}>
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className="text-sm text-slate mt-1 whitespace-pre-wrap">{task.description}</p>
                          )}

                          {completingTask === task.id && (
                            <div className="mt-4 flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                              <Input 
                                placeholder="Pega el Commit SHA de GitHub aquí..." 
                                value={commitSha} 
                                onChange={e => setCommitSha(e.target.value)}
                                className="h-8 text-sm"
                              />
                              <Button size="sm" className="h-8 shrink-0" onClick={() => handleComplete(task)}>
                                Confirmar
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 shrink-0 text-slate" onClick={() => { setCompletingTask(null); setCommitSha(""); }}>
                                Cancelar
                              </Button>
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
                      
                      <div className="flex items-center justify-between md:flex-col md:items-end gap-2 pl-12 md:pl-0 shrink-0">
                        <div className="flex items-center text-sm">
                          {task.dueDate ? (
                            <Badge variant="outline" className={`flex items-center gap-1.5 px-2.5 py-1 font-medium ${daysLeft !== null && daysLeft < 0 ? 'border-red-200 bg-red-50 text-red-600' : daysLeft === 0 ? 'border-amber-200 bg-amber-50 text-amber-600' : 'border-blue-200 bg-blue-50 text-blue-600'}`}>
                              <Clock className="h-3.5 w-3.5" />
                              <span>
                                {daysLeft !== null && daysLeft < 0 ? 'Vencida' : daysLeft === 0 ? 'Para hoy' : `En ${daysLeft} días`}
                              </span>
                              <span className="opacity-70 ml-0.5 border-l pl-1.5 border-current">
                                {format(new Date(task.dueDate), "d MMM", { locale: es })}
                              </span>
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-slate-100 bg-slate-50 text-slate-400 font-normal px-2.5 py-1">Sin fecha límite</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </motion.div>
  );
}
