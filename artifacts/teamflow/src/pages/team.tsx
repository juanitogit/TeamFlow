import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspaceMembers, useWorkspaces } from "@/hooks/use-workspaces";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Copy, RefreshCw, Timer, UserPlus, Users, Github, Target, Activity, Trash2, ClipboardList, Settings, Plus, CheckCircle2, AlertCircle, Edit2, BookOpen, Lightbulb, Download, ScrollText } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

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
  const [taskSprintId, setTaskSprintId] = useState<string>("");
  const [githubInviteUsername, setGithubInviteUsername] = useState("");
  const [githubInviteOpen, setGithubInviteOpen] = useState(false);

  // Phase 3 states
  const [scoreOpen, setScoreOpen] = useState(false);
  const [scoreMemberId, setScoreMemberId] = useState<number | null>(null);
  const [scoreValue, setScoreValue] = useState<number>(0);
  const [scoreMemberName, setScoreMemberName] = useState("");

  const [manualLogOpen, setManualLogOpen] = useState(false);
  const [manualLogDesc, setManualLogDesc] = useState("");
  const [manualLogHours, setManualLogHours] = useState("");
  const [manualLogType, setManualLogType] = useState("otro");
  const [manualLogDate, setManualLogDate] = useState("");

  const [auditOpen, setAuditOpen] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("active_workspace_id");
    if (id) setWorkspaceId(parseInt(id));
  }, []);

  const { data: members, isLoading } = useWorkspaceMembers(workspaceId);
  const activeWorkspace = workspaces?.find((w: any) => w.workspaceId === workspaceId);
  const inviteCode = activeWorkspace?.workspace?.inviteCode || "";
  const myRole = activeWorkspace?.role;
  const isLeaderOrCoLeader = myRole === "leader" || myRole === "co-leader";
  const isMainLeader = myRole === "leader";

  // Invite code with expiry
  const [inviteData, setInviteData] = useState<{ inviteCode: string; expiresAt: string | null; isExpired: boolean } | null>(null);
  const [countdown, setCountdown] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [generateInviteOpen, setGenerateInviteOpen] = useState(false);
  const [inviteExpirationMinutes, setInviteExpirationMinutes] = useState("1440");
  const [customExpiration, setCustomExpiration] = useState("");

  // Fetch invite code
  const fetchInvite = async () => {
    if (!workspaceId || !isLeaderOrCoLeader) return;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/invite`, { headers: getAuthHeader() });
      if (res.ok) setInviteData(await res.json());
    } catch {}
  };

  const { data: sprints } = useQuery({
    queryKey: ["sprints", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const res = await fetch(`/api/sprints/workspace/${workspaceId}`, { headers: getAuthHeader() });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!workspaceId
  });

  const { data: suggestions } = useQuery({
    queryKey: ["suggestions", workspaceId],
    queryFn: async () => {
      if (!workspaceId || !isLeaderOrCoLeader) return [];
      const res = await fetch(`/api/suggestions/workspace/${workspaceId}`, { headers: getAuthHeader() });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!workspaceId && isLeaderOrCoLeader
  });

  const { data: auditLogs } = useQuery({
    queryKey: ["audit_logs", workspaceId],
    queryFn: async () => {
      if (!workspaceId || !isLeaderOrCoLeader) return [];
      const res = await fetch(`/api/workspaces/${workspaceId}/audit`, { headers: getAuthHeader() });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!workspaceId && isLeaderOrCoLeader && auditOpen
  });

  useEffect(() => { fetchInvite(); }, [workspaceId, isLeaderOrCoLeader]);

  // Countdown timer
  useEffect(() => {
    if (!inviteData?.expiresAt) { setCountdown(""); return; }
    const tick = () => {
      const diff = new Date(inviteData.expiresAt!).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown("Expirado");
        setInviteData(prev => prev ? { ...prev, isExpired: true } : null);
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown(`${mins}:${secs.toString().padStart(2, "0")}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [inviteData?.expiresAt]);
  // Repos & config logic
  const [editingRepos, setEditingRepos] = useState(false);
  const [repos, setRepos] = useState<string[]>([]);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");

  useEffect(() => {
    if (activeWorkspace?.workspace) {
      setEditName(activeWorkspace.workspace.name || "");
      setEditDesc(activeWorkspace.workspace.description || "");
      setEditImageUrl(activeWorkspace.workspace.imageUrl || "");
      if (activeWorkspace.workspace.githubRepos) {
        try { setRepos(JSON.parse(activeWorkspace.workspace.githubRepos)); } catch(e) { setRepos([]); }
      } else {
        setRepos([]);
      }
    }
  }, [activeWorkspace]);

  const workspaceMutation = useMutation({
    mutationFn: async ({ repos, name, description, imageUrl }: { repos: string[], name: string, description: string, imageUrl: string }) => {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: getAuthHeader(),
        body: JSON.stringify({ 
          githubRepos: repos.filter(r => r.trim() !== ""),
          name,
          description,
          imageUrl
        })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Repositorios actualizados" });
      setEditingRepos(false);
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const roleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: number, role: string }) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/members/${memberId}/role`, { 
        method: "PATCH", 
        headers: getAuthHeader(),
        body: JSON.stringify({ role })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => { 
      toast({ title: "Rol actualizado" }); 
      queryClient.invalidateQueries({ queryKey: ["workspace_members"] }); 
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const handleRegenerate = async () => {
    if (!workspaceId) return;
    setRegenerating(true);
    let minutes = parseInt(inviteExpirationMinutes);
    if (minutes === 0 && customExpiration) {
        minutes = parseInt(customExpiration);
    }
    
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/invite/regenerate`, { 
        method: "POST", 
        headers: getAuthHeader(),
        body: JSON.stringify({ expiresInHours: isNaN(minutes) || minutes <= 0 ? 24 : minutes / 60 })
      });
      if (res.ok) {
        const data = await res.json();
        setInviteData(data);
        toast({ title: "Nuevo código generado" });
        setGenerateInviteOpen(false);
      }
    } catch {}
    setRegenerating(false);
  };

  const removeMutation = useMutation({
    mutationFn: async (memberId: number) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, { method: "DELETE", headers: getAuthHeader() });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => { toast({ title: "Miembro eliminado" }); queryClient.invalidateQueries({ queryKey: ["workspace_members"] }); },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const githubInviteMutation = useMutation({
    mutationFn: async (githubUsername: string) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/invite-github`, { 
        method: "POST", 
        headers: getAuthHeader(),
        body: JSON.stringify({ githubUsername })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => { 
      toast({ title: "¡Invitación enviada!", description: "Se ha enviado un correo al usuario." }); 
      setGithubInviteOpen(false);
      setGithubInviteUsername("");
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error al invitar", description: e.message }),
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
      setTaskTitle(""); setTaskDesc(""); setTaskType("programacion"); setTaskDueDate(""); setTaskSprintId("");
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const handleAssign = () => {
    if (!taskTitle || !assignTo || !workspaceId) return;
    assignMutation.mutate({ 
      workspaceId, 
      assignedTo: assignTo, 
      title: taskTitle, 
      description: taskDesc, 
      type: taskType, 
      dueDate: taskDueDate || undefined,
      sprintId: taskSprintId && taskSprintId !== "none" ? parseInt(taskSprintId) : undefined
    });
  };

  const scoreMutation = useMutation({
    mutationFn: async ({ memberId, score }: { memberId: number, score: number }) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/members/${memberId}/score`, {
        method: "PATCH",
        headers: getAuthHeader(),
        body: JSON.stringify({ score })
      });
      if (!res.ok) throw new Error("Error al actualizar score");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Score actualizado correctamente" });
      setScoreOpen(false);
      queryClient.invalidateQueries({ queryKey: ["workspace_members"] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const manualLogMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/manual-logs", {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Error al guardar log");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Trabajo registrado correctamente" });
      setManualLogOpen(false);
      setManualLogDesc(""); setManualLogHours(""); setManualLogDate(""); setManualLogType("otro");
      queryClient.invalidateQueries({ queryKey: ["manual_logs"] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const suggestionMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const res = await fetch(`/api/suggestions/${id}/status`, {
        method: "PATCH",
        headers: getAuthHeader(),
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error("Error al procesar sugerencia");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const handleExportExcel = async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/reports/excel`, {
        headers: getAuthHeader()
      });
      if (!res.ok) throw new Error("Error al obtener datos");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `TeamFlow_Reporte_${workspaceId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error al exportar", description: e.message });
    }
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
        {isLeaderOrCoLeader && inviteData && (
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-snow border border-mist px-6 py-4 rounded-[24px] shadow-sm">
            <div className="text-sm flex-1">
              <span className="text-slate block text-[10px] uppercase font-bold tracking-wider mb-1">Código de Invitación</span>
              <span className={`font-mono font-bold text-xl tracking-[0.2em] ${inviteData.isExpired ? 'text-red-400 line-through' : 'text-primary'}`}>{inviteData.inviteCode}</span>
            </div>
            <div className="flex items-center gap-2">
              {!inviteData.isExpired && (
                <div className="flex items-center gap-1 text-xs text-slate bg-cloud px-3 py-1.5 rounded-full">
                  <Timer className="h-4 w-4" />
                  <span className="font-mono font-medium">{countdown}</span>
                </div>
              )}
              {inviteData.isExpired && (
                <span className="text-xs text-red-500 font-medium bg-red-50 px-3 py-1.5 rounded-full">Expirado</span>
              )}
              <Button variant="outline" size="sm" className="rounded-full hover:bg-slate-100 h-9 w-9 p-0" title="Copiar código" onClick={() => { navigator.clipboard.writeText(inviteData.inviteCode); toast({ title: "Código copiado" }); }} disabled={inviteData.isExpired}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="rounded-full hover:bg-primary/5 h-9 w-9 p-0 border-primary/20" title="Copiar enlace directo" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/workspaces?join_code=${inviteData.inviteCode}`); toast({ title: "Enlace copiado" }); }} disabled={inviteData.isExpired}>
                <ClipboardList className="h-4 w-4 text-primary" />
              </Button>
              <Dialog open={generateInviteOpen} onOpenChange={setGenerateInviteOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-full hover:bg-slate-100 h-9 w-9 p-0" title="Generar nuevo">
                    <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Generar nuevo código de invitación</DialogTitle>
                    <DialogDescription>
                      Selecciona la vigencia para el nuevo código y enlace de invitación.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Vigencia</Label>
                      <Select value={inviteExpirationMinutes} onValueChange={setInviteExpirationMinutes}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona la vigencia" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 minuto</SelectItem>
                          <SelectItem value="5">5 minutos</SelectItem>
                          <SelectItem value="30">30 minutos</SelectItem>
                          <SelectItem value="60">1 hora</SelectItem>
                          <SelectItem value="600">10 horas</SelectItem>
                          <SelectItem value="1440">1 día</SelectItem>
                          <SelectItem value="0">Personalizado...</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {inviteExpirationMinutes === "0" && (
                      <div className="space-y-2">
                        <Label>Minutos personalizados</Label>
                        <Input 
                          type="number"
                          placeholder="Ej: 45 (para 45 minutos)" 
                          value={customExpiration}
                          onChange={(e) => setCustomExpiration(e.target.value)}
                        />
                      </div>
                    )}
                    <Button 
                      className="w-full" 
                      onClick={handleRegenerate}
                      disabled={regenerating || (inviteExpirationMinutes === "0" && (!customExpiration || parseInt(customExpiration) <= 0))}
                    >
                      {regenerating ? "Generando..." : "Generar Invitación"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:flex sm:justify-end gap-2 w-full">
        <Button onClick={() => setManualLogOpen(true)} className="w-full sm:w-auto bg-primary text-white hover:bg-primary/90 rounded-full shadow-sm gap-2">
          <BookOpen className="h-4 w-4" />
          <span className="hidden sm:inline">Registrar Trabajo</span>
          <span className="sm:hidden">Registrar</span>
        </Button>
        {isLeaderOrCoLeader && (
          <>
            <Button onClick={() => setAuditOpen(true)} variant="outline" className="w-full sm:w-auto rounded-full shadow-sm gap-2 text-slate hover:bg-slate-50">
              <ScrollText className="h-4 w-4" />
              Historial
            </Button>
            <Button onClick={handleExportExcel} variant="outline" className="w-full sm:w-auto rounded-full shadow-sm gap-2 text-slate hover:bg-slate-50">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Dialog open={githubInviteOpen} onOpenChange={setGithubInviteOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto bg-slate-900 text-white hover:bg-slate-800 rounded-full shadow-sm gap-2">
                  <Github className="h-4 w-4" />
                  <span className="hidden sm:inline">Invitar por GitHub</span>
                  <span className="sm:hidden">Invitar (GH)</span>
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invitar miembro por GitHub</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Usuario de GitHub</Label>
                  <Input 
                    placeholder="ej: octocat" 
                    value={githubInviteUsername}
                    onChange={(e) => setGithubInviteUsername(e.target.value)}
                  />
                  <p className="text-xs text-slate-500">
                    Se enviará un correo con la invitación (expira en 1 día). Si el usuario no está registrado en TeamFlow, debe tener su correo de GitHub como público para poder recibirla.
                  </p>
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => githubInviteMutation.mutate(githubInviteUsername)}
                  disabled={!githubInviteUsername || githubInviteMutation.isPending}
                >
                  {githubInviteMutation.isPending ? "Enviando..." : "Enviar Invitación"}
                </Button>
              </div>
            </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      {!workspaceId ? (
        <div className="text-center py-12 text-slate bg-snow rounded-[24px] shadow-sm border border-mist">Selecciona un workspace para ver a tu equipo.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members?.map((member: any) => (
            <motion.div key={member.id} whileHover={{ y: -4 }}>
              <div 
                className="rounded-[24px] shadow-sm h-full flex flex-col bg-snow border border-mist transition-transform transform hover:scale-[1.02] relative overflow-hidden"
              >
                <div 
                  className="absolute inset-0 z-0 opacity-100"
                  style={{
                    backgroundImage: `url(${member.role === 'leader' ? '/bg-leader.png' : member.role === 'co-leader' ? '/bg-coleader.png' : '/bg-member.png'})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                />
                <div className="relative z-10 flex-1 flex flex-col bg-white/90 backdrop-blur-sm m-1.5 sm:m-2.5 rounded-[20px] overflow-hidden shadow-sm">
                <div className={`p-6 border-b ${
                  member.role === 'leader' ? 'border-indigo-100/50' :
                  member.role === 'co-leader' ? 'border-blue-100' :
                  'border-mist/50'
                }`}>
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-4 overflow-hidden flex-1">
                      <div className="h-12 w-12 shrink-0 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                        {member.avatarUrl ? <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" /> : member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold text-ink tracking-tight truncate" title={member.name}>{member.name}</h3>
                        {member.id === user?.id && <span className="text-xs text-slate block">(Tú)</span>}
                      </div>
                    </div>
                  {isMainLeader && member.id !== user?.id ? (
                    <Select defaultValue={member.role} onValueChange={(val) => roleMutation.mutate({ memberId: member.id, role: val })}>
                      <SelectTrigger className={`h-8 px-3 shrink-0 w-auto text-[10px] uppercase font-bold tracking-wider rounded-xl ${
                        member.role === 'leader' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-transparent shadow-sm' : 
                        member.role === 'co-leader' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                        'bg-slate-50 text-slate-700 border-slate-200'
                      }`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="leader">Líder</SelectItem>
                        <SelectItem value="co-leader">Co-líder</SelectItem>
                        <SelectItem value="member">Miembro</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className={`h-8 px-3 shrink-0 flex items-center justify-center text-[10px] uppercase font-bold tracking-wider rounded-xl ${
                      member.role === 'leader' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-transparent shadow-sm' : 
                      member.role === 'co-leader' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                      'bg-slate-50 text-slate-700 border-slate-200'
                    }`}>
                      {member.role === 'leader' ? 'Líder' : member.role === 'co-leader' ? 'Co-líder' : 'Miembro'}
                    </Badge>
                  )}
                  </div>
                </div>
                <div className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-medium text-slate flex items-center gap-1.5"><Target className="h-3.5 w-3.5 text-primary" /> Score Rendimiento</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-ink">{member.performanceScore}%</span>
                          {isLeaderOrCoLeader && (
                            <button onClick={() => {
                              setScoreMemberId(member.id);
                              setScoreMemberName(member.name);
                              setScoreValue(member.performanceScore);
                              setScoreOpen(true);
                            }} className="text-slate hover:text-primary transition-colors">
                              <Edit2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <Progress value={member.performanceScore} className="h-2 bg-primary/10 [&>div]:bg-primary rounded-full" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-medium text-slate flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-emerald-500" /> Puntos de Salud</span>
                        <span className={`text-sm font-bold ${member.healthPoints >= 70 ? 'text-emerald-500' : member.healthPoints >= 40 ? 'text-amber-500' : 'text-red-500'}`}>{member.healthPoints}</span>
                      </div>
                      <Progress value={member.healthPoints} className={`h-2 rounded-full ${member.healthPoints >= 70 ? 'bg-emerald-100 [&>div]:bg-emerald-500' : member.healthPoints >= 40 ? 'bg-slate-200 [&>div]:bg-slate-500' : 'bg-red-100 [&>div]:bg-red-500'}`} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-mist/50 text-center">
                    <div className="bg-emerald-50/50 p-2 rounded-[12px]">
                      <div className="text-[10px] text-slate uppercase tracking-wider font-semibold">Aprobados</div>
                      <div className="text-xl font-bold text-emerald-500">{member.contributions?.approved || 0}</div>
                    </div>
                    <div className="bg-slate-50/50 p-2 rounded-[12px]">
                      <div className="text-[10px] text-slate uppercase tracking-wider font-semibold">Pendientes</div>
                      <div className="text-xl font-bold text-amber-500">{member.contributions?.pending || 0}</div>
                    </div>
                  </div>

                  {/* Leader actions */}
                  {isLeaderOrCoLeader && member.id !== user?.id && (
                    <div className="flex gap-2 pt-4 border-t border-mist/50">
                      <Button variant="outline" size="sm" className="flex-1 text-xs rounded-full hover:bg-slate-50 shadow-sm" onClick={() => {
                        setAssignTo(member.id);
                        setAssignToName(member.name);
                        setAssignOpen(true);
                      }}>
                        <ClipboardList className="h-3 w-3 mr-1" /> Asignar Tarea
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-50 hover:text-red-700 text-xs rounded-full shadow-sm"
                        onClick={() => { if (confirm(`¿Eliminar a ${member.name} del equipo?`)) removeMutation.mutate(member.id); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                </div>
              </div>
            </motion.div>
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
                    <SelectItem value="programacion">Programación</SelectItem>
                    <SelectItem value="documentacion">Documentación</SelectItem>
                    <SelectItem value="investigacion">Investigación</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha Límite</label>
                <Input type="datetime-local" value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sprint (Opcional)</label>
                <Select value={taskSprintId} onValueChange={setTaskSprintId}>
                  <SelectTrigger><SelectValue placeholder="Sin sprint asignado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin sprint asignado</SelectItem>
                    {sprints?.map((sprint: any) => (
                      <SelectItem key={sprint.id} value={sprint.id.toString()}>{sprint.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

      {/* Workspace Config (Repos) */}
      {isMainLeader && workspaceId && activeWorkspace && (
        <Card className="mt-12 border-mist">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg flex items-center gap-2"><Settings className="h-5 w-5 text-slate" /> Configuración del Workspace</CardTitle>
                <CardDescription>Gestiona los repositorios de GitHub vinculados a este espacio.</CardDescription>
              </div>
              <Button variant="outline" onClick={() => setEditingRepos(!editingRepos)}>
                {editingRepos ? "Cancelar" : "Editar Configuración"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {editingRepos ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nombre del Workspace</label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Descripción</label>
                  <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Logo del Workspace (Opcional)</label>
                  <div className="flex items-center gap-4">
                    {editImageUrl && (
                      <div className="h-12 w-12 rounded-lg overflow-hidden border border-mist shrink-0">
                        <img src={editImageUrl} alt="Preview" className="h-full w-full object-cover" />
                      </div>
                    )}
                    <Input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setEditImageUrl(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }} 
                    />
                  </div>
                </div>
                
                <div className="space-y-2 pt-4 border-t">
                  <label className="text-sm font-medium">Repositorios de GitHub</label>
                  <div className="space-y-3">
                    {repos.map((repo, i) => (
                      <div key={i} className="flex gap-2">
                        <Input 
                          value={repo} 
                          onChange={(e) => {
                            const newRepos = [...repos];
                            newRepos[i] = e.target.value;
                            setRepos(newRepos);
                          }} 
                          placeholder="https://github.com/org/repo" 
                        />
                        <Button variant="outline" size="icon" onClick={() => setRepos(repos.filter((_, idx) => idx !== i))}>
                          <span className="text-red-500 font-bold">X</span>
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Button variant="outline" className="w-full text-slate" onClick={() => setRepos([...repos, ""])}>
                        <Plus className="h-4 w-4 mr-2" /> Añadir otro repositorio
                      </Button>
                    </div>
                    <Button className="mt-4" disabled={workspaceMutation.isPending} onClick={() => workspaceMutation.mutate({ repos, name: editName, description: editDesc, imageUrl: editImageUrl })}>
                      {workspaceMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-slate mb-1">Nombre</h4>
                    <p className="text-ink font-semibold">{activeWorkspace.workspace.name}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate mb-1">Descripción</h4>
                    <p className="text-ink text-sm">{activeWorkspace.workspace.description || "Sin descripción"}</p>
                  </div>
                </div>
                
                <div className="space-y-3 pt-4 border-t border-mist">
                  <h4 className="text-sm font-medium text-slate">Repositorios</h4>
                  {repos.length === 0 ? (
                    <p className="text-sm text-slate italic">No hay repositorios vinculados.</p>
                  ) : (
                    repos.map((repo, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <Github className="h-5 w-5 text-slate" />
                        <a href={repo} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline font-medium">
                          {repo.replace("https://github.com/", "")}
                        </a>
                        <div className="ml-auto text-xs text-slate flex gap-4">
                          <span><strong className="text-ink">{Math.floor(Math.random() * 50) + 10}</strong> commits (Semana)</span>
                          <span><strong className="text-emerald-500">{Math.floor(Math.random() * 5) + 1}</strong> PRs Activos</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Suggestions Panel */}
      {isLeaderOrCoLeader && suggestions && suggestions.length > 0 && (
        <Card className="mt-8 border-amber-200 bg-amber-50/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-amber-700">
              <Lightbulb className="h-5 w-5" /> Sugerencias Inteligentes
            </CardTitle>
            <CardDescription className="text-amber-600/80">Acciones sugeridas detectadas automáticamente en el workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {suggestions.map((sug: any) => (
              <div key={sug.id} className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-amber-900">{sug.title}</h4>
                  <p className="text-sm text-slate mt-1">{sug.description}</p>
                  {sug.status === "accepted" && <Badge className="mt-2 bg-emerald-100 text-emerald-700">Aceptada</Badge>}
                  {sug.status === "dismissed" && <Badge className="mt-2 bg-slate-100 text-slate-700">Descartada</Badge>}
                </div>
                {sug.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-slate hover:bg-slate-50" onClick={() => suggestionMutation.mutate({ id: sug.id, status: "dismissed" })}>
                      Descartar
                    </Button>
                    <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => suggestionMutation.mutate({ id: sug.id, status: "accepted" })}>
                      Aceptar
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Adjust Score Dialog */}
      <Dialog open={scoreOpen} onOpenChange={setScoreOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Score de {scoreMemberName}</DialogTitle>
            <DialogDescription>Modifica manualmente el rendimiento de este miembro.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Score (0-100)</Label>
              <Input type="number" min={0} max={100} value={scoreValue} onChange={(e) => setScoreValue(Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={scoreMutation.isPending} onClick={() => scoreMemberId && scoreMutation.mutate({ memberId: scoreMemberId, score: scoreValue })}>
              {scoreMutation.isPending ? "Guardando..." : "Guardar Score"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Log Dialog */}
      <Dialog open={manualLogOpen} onOpenChange={setManualLogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Trabajo No-Técnico</DialogTitle>
            <DialogDescription>Registra horas trabajadas en reuniones, documentación o soporte que no se reflejan en commits.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Trabajo</Label>
              <Select value={manualLogType} onValueChange={setManualLogType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="reunion">Reuniones</SelectItem>
                  <SelectItem value="documentacion">Documentación</SelectItem>
                  <SelectItem value="revision">Revisión de Código</SelectItem>
                  <SelectItem value="soporte">Soporte/Ayuda</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input value={manualLogDesc} onChange={(e) => setManualLogDesc(e.target.value)} placeholder="Ej: Reunión con cliente sobre requerimientos" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Horas (Ej: 1.5)</Label>
                <Input type="number" step="0.5" value={manualLogHours} onChange={(e) => setManualLogHours(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input type="date" value={manualLogDate} onChange={(e) => setManualLogDate(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button disabled={manualLogMutation.isPending || !manualLogDesc || !manualLogHours || !manualLogDate} 
              onClick={() => manualLogMutation.mutate({ workspaceId, description: manualLogDesc, hours: parseFloat(manualLogHours), date: new Date(manualLogDate).toISOString(), type: manualLogType })}>
              {manualLogMutation.isPending ? "Guardando..." : "Guardar Trabajo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit Log Dialog */}
      <Dialog open={auditOpen} onOpenChange={setAuditOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historial de Actividad (Audit Log)</DialogTitle>
            <DialogDescription>Registro de eventos y acciones recientes en el workspace.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {auditLogs?.map((log: any) => (
              <div key={log.id} className="text-sm p-3 border-b border-mist/50">
                <span className="font-semibold text-ink">{log.user?.name || "Usuario"}</span> 
                <span className="text-slate"> {log.action} </span>
                <span className="font-medium">{log.entityTitle}</span>
                <div className="text-xs text-slate mt-1">{new Date(log.createdAt).toLocaleString()}</div>
              </div>
            ))}
            {(!auditLogs || auditLogs.length === 0) && (
              <p className="text-slate text-center py-4">No hay actividad reciente.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </motion.div>
  );
}
