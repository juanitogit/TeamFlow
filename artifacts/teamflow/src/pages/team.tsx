import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspaceMembers, useWorkspaces } from "@/hooks/use-workspaces";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Target, Activity, CheckCircle2, AlertCircle, Copy, Trash2, ClipboardList } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("teamflow_token")}`, "Content-Type": "application/json" };
}

export function Team() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const { data: workspaces } = useWorkspaces();
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTo, setAssignTo] = useState<number | null>(null);
  const [assignToName, setAssignToName] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskType, setTaskType] = useState("programacion");
  const [taskDueDate, setTaskDueDate] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("active_workspace_id");
    if (id) setWorkspaceId(parseInt(id));
  }, []);

  const { data: members, isLoading } = useWorkspaceMembers(workspaceId);
  const activeWorkspace = workspaces?.find((w: any) => w.workspaceId === workspaceId);
  const inviteCode = activeWorkspace?.workspace?.inviteCode || "";
  const myRole = activeWorkspace?.role;
  const isLeader = myRole === "leader" || myRole === "co-leader";

  const removeMutation = useMutation({
    mutationFn: async (memberId: number) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, { method: "DELETE", headers: getAuthHeader() });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => { toast({ title: "Miembro eliminado" }); queryClient.invalidateQueries({ queryKey: ["workspace_members"] }); },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const assignMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/workspace-tasks", { method: "POST", headers: getAuthHeader(), body: JSON.stringify(data) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "¡Tarea asignada con éxito!" });
      setAssignOpen(false);
      setTaskTitle(""); setTaskDesc(""); setTaskType("programacion"); setTaskDueDate("");
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const handleAssign = () => {
    if (!taskTitle || !assignTo || !workspaceId) return;
    assignMutation.mutate({ workspaceId, assignedTo: assignTo, title: taskTitle, description: taskDesc, type: taskType, dueDate: taskDueDate || undefined });
  };

  if (isLoading) {
    return (<div className="h-96 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-3">
            <Users className="h-7 w-7 text-primary" />
            Equipo
          </h1>
          <p className="text-slate mt-1 text-sm">Gestiona los miembros de tu workspace</p>
        </div>
        {inviteCode && (
          <div className="flex items-center gap-3 bg-white border px-4 py-3 rounded-lg shadow-sm">
            <div className="text-sm">
              <span className="text-slate block text-[10px] uppercase font-bold tracking-wider">Código de Invitación</span>
              <span className="font-mono font-bold text-lg text-primary tracking-[0.3em]">{inviteCode}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(inviteCode); toast({ title: "¡Código copiado!" }); }}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {!workspaceId ? (
        <div className="text-center py-12 text-slate bg-white rounded-xl shadow-sm border">Selecciona un workspace para ver a tu equipo.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members?.map((member: any) => (
            <Card key={member.id} className="card-monday border-none">
              <CardHeader className="pb-2 border-b border-mist">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                      {member.avatarUrl ? <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" /> : member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-base font-medium text-ink">{member.name}</CardTitle>
                      <span className="text-xs text-slate">{member.id === user?.id ? "(Tú)" : ""}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider ${
                    member.role === 'leader' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                    member.role === 'co-leader' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                    'bg-slate-50 text-slate-700 border-slate-200'
                  }`}>
                    {member.role === 'leader' ? 'Líder' : member.role === 'co-leader' ? 'Co-líder' : 'Miembro'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-slate flex items-center gap-1"><Target className="h-3 w-3" /> Score</span>
                    <span className="text-sm font-bold text-ink">{member.performanceScore}%</span>
                  </div>
                  <Progress value={member.performanceScore} className="h-1.5 [&>div]:bg-primary" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-slate flex items-center gap-1"><Activity className="h-3 w-3" /> Salud</span>
                    <span className={`text-sm font-bold ${member.healthPoints >= 70 ? 'text-emerald-500' : member.healthPoints >= 40 ? 'text-amber-500' : 'text-red-500'}`}>{member.healthPoints}</span>
                  </div>
                  <Progress value={member.healthPoints} className={`h-1.5 ${member.healthPoints >= 70 ? '[&>div]:bg-emerald-500' : member.healthPoints >= 40 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'}`} />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-mist text-center">
                  <div>
                    <div className="text-[10px] text-slate uppercase tracking-wider">Aprobados</div>
                    <div className="text-lg font-bold text-emerald-500">{member.contributions?.approved || 0}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate uppercase tracking-wider">Pendientes</div>
                    <div className="text-lg font-bold text-amber-500">{member.contributions?.pending || 0}</div>
                  </div>
                </div>

                {/* Leader actions */}
                {isLeader && member.id !== user?.id && (
                  <div className="flex gap-2 pt-3 border-t border-mist">
                    <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => {
                      setAssignTo(member.id);
                      setAssignToName(member.name);
                      setAssignOpen(true);
                    }}>
                      <ClipboardList className="h-3 w-3 mr-1" /> Asignar Tarea
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-50 hover:text-red-700 text-xs"
                      onClick={() => { if (confirm(`¿Eliminar a ${member.name} del equipo?`)) removeMutation.mutate(member.id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Assign Task Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Tarea a {assignToName}</DialogTitle>
            <DialogDescription>Crea una tarea y asígnala a este miembro del equipo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Título de la Tarea</label>
              <Input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Ej. Corregir bug en login" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción (Opcional)</label>
              <Textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Detalle de la tarea..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Tarea</label>
                <Select value={taskType} onValueChange={setTaskType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="programacion">💻 Programación</SelectItem>
                    <SelectItem value="documentacion">📄 Documentación</SelectItem>
                    <SelectItem value="investigacion">🔍 Investigación</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha Límite</label>
                <Input type="datetime-local" value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button disabled={assignMutation.isPending || !taskTitle} onClick={handleAssign}>
              {assignMutation.isPending ? "Asignando..." : "Asignar Tarea"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
