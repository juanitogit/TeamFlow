import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Plus, Users, FolderKanban, LogOut, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useWorkspaces, useCreateWorkspace, useJoinWorkspace } from "@/hooks/use-workspaces";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("teamflow_token")}`, "Content-Type": "application/json" };
}

export function Workspaces() {
  const [_, setLocation] = useLocation();
  const { data: workspaces, isLoading } = useWorkspaces();
  const createWorkspace = useCreateWorkspace();
  const joinWorkspace = useJoinWorkspace();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [githubRepos, setGithubRepos] = useState<string[]>([""]);
  const [joinCode, setJoinCode] = useState("");

  const queryClient = useQueryClient();

  const handleSelectWorkspace = (workspaceId: number, workspaceRole: string) => {
    localStorage.setItem("active_workspace_id", workspaceId.toString());
    localStorage.setItem("active_workspace_role", workspaceRole);
    setLocation("/dashboard");
  };

  const acceptGithubInviteMutation = useMutation({
    mutationFn: async (token: string) => {
      const res = await fetch("/api/workspaces/accept-github-invite", {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error);
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "¡Te uniste al workspace con éxito!" });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      if (data.workspace) {
        handleSelectWorkspace(data.workspace.id, "member");
      }
      // Remove query param from URL
      window.history.replaceState({}, document.title, "/workspaces");
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error al aceptar invitación", description: err.message });
      // Remove query param from URL
      window.history.replaceState({}, document.title, "/workspaces");
    }
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get("accept_github_invite");
    if (token) {
      acceptGithubInviteMutation.mutate(token);
    }
    const jCode = searchParams.get("join_code");
    if (jCode) {
      setJoinCode(jCode);
      setIsJoinOpen(true);
      window.history.replaceState({}, document.title, "/workspaces");
    }
  }, []);

  const handleCreate = async () => {
    if (!name) return;
    const validRepos = githubRepos.filter(r => r.trim() !== "");
    createWorkspace.mutate(
      { name, description, githubRepos: validRepos.length > 0 ? validRepos : undefined } as any,
      {
        onSuccess: (newWorkspace) => {
          setIsCreateOpen(false);
          setName("");
          setDescription("");
          setGithubRepos([""]);
          handleSelectWorkspace(newWorkspace.id, "leader");
          toast({ title: "¡Workspace creado!", description: `Código de invitación: ${newWorkspace.inviteCode}` });
        },
        onError: (err) => {
          toast({ variant: "destructive", title: "Error", description: err.message });
        }
      }
    );
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    
    joinWorkspace.mutate(joinCode, {
      onSuccess: (data) => {
        setIsJoinOpen(false);
        setJoinCode("");
        toast({ title: "¡Te uniste al workspace con éxito!" });
        if (data.workspace) {
          handleSelectWorkspace(data.workspace.id, "member");
        }
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Error", description: err.message });
      }
    });
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando espacios de trabajo...</div>;
  }

  return (
    <div className="min-h-screen bg-cloud p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-semibold text-ink leading-tight">Bienvenido, {user?.name}</h2>
            <p className="text-sm text-slate">Selecciona un Espacio de Trabajo para continuar</p>
          </div>
        </div>
        <Button variant="ghost" onClick={logout} className="text-slate hover:text-red-500">
          <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
        </Button>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
        {workspaces?.map((membership: any) => (
          <motion.div key={membership.workspaceId} whileHover={{ y: -4 }}>
            <Card 
              className="h-full cursor-pointer hover:shadow-lg transition-all card-monday flex flex-col"
              onClick={() => handleSelectWorkspace(membership.workspaceId, membership.role)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <FolderKanban className="h-6 w-6 text-primary" />
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    membership.role === 'leader' ? 'bg-amber-100 text-amber-700' :
                    membership.role === 'co-leader' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {membership.role === 'leader' ? 'Líder' : membership.role === 'co-leader' ? 'Co-líder' : 'Miembro'}
                  </span>
                </div>
                <CardTitle className="mt-4">{membership.workspace.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {membership.workspace.description || "Sin descripción."}
                </CardDescription>
              </CardHeader>
              <div className="flex-1"></div>
              <CardFooter className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <div className="text-xs text-slate">
                  Código: <span className="font-mono font-bold text-ink tracking-wider">{membership.workspace.inviteCode}</span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(membership.workspace.inviteCode);
                  toast({ title: "¡Código copiado!" });
                }}>
                  <Copy className="h-3 w-3" />
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}

        {/* Create Workspace */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <motion.div whileHover={{ y: -4 }} className="h-full">
              <Card className="h-full cursor-pointer border-dashed border-2 bg-transparent hover:bg-slate-50 transition-all flex flex-col items-center justify-center p-8">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium text-ink">Crear Workspace</h3>
                <p className="text-sm text-center text-slate mt-2">Empieza un nuevo proyecto como Líder</p>
              </Card>
            </motion.div>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Workspace</DialogTitle>
              <DialogDescription>Crea un espacio para que tu equipo registre su rendimiento.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre del Workspace</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Equipo Frontend" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Descripción</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="¿Para qué es este espacio?" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Repositorios de GitHub (Opcional)</label>
                {githubRepos.map((repo, i) => (
                  <div key={i} className="flex gap-2">
                    <Input 
                      value={repo} 
                      onChange={(e) => {
                        const newRepos = [...githubRepos];
                        newRepos[i] = e.target.value;
                        setGithubRepos(newRepos);
                      }} 
                      placeholder="https://github.com/org/repo" 
                    />
                    {i === githubRepos.length - 1 ? (
                      <Button variant="outline" size="icon" onClick={() => setGithubRepos([...githubRepos, ""])}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button variant="outline" size="icon" onClick={() => setGithubRepos(githubRepos.filter((_, idx) => idx !== i))}>
                        <span className="text-red-500 font-bold">X</span>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button disabled={createWorkspace.isPending} onClick={handleCreate}>
                {createWorkspace.isPending ? "Creando..." : "Crear Workspace"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Join Workspace */}
        <Dialog open={isJoinOpen} onOpenChange={setIsJoinOpen}>
          <DialogTrigger asChild>
            <motion.div whileHover={{ y: -4 }} className="h-full">
              <Card className="h-full cursor-pointer border-dashed border-2 bg-transparent hover:bg-slate-50 transition-all flex flex-col items-center justify-center p-8">
                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-slate" />
                </div>
                <h3 className="font-medium text-ink">Unirse a un Workspace</h3>
                <p className="text-sm text-center text-slate mt-2">Ingresa el código de invitación</p>
              </Card>
            </motion.div>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Unirse a Workspace</DialogTitle>
              <DialogDescription>Ingresa el código de invitación proporcionado por tu líder.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Código de Invitación</label>
                <Input 
                  value={joinCode} 
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())} 
                  placeholder="Ej. A1B2C3D4" 
                  className="font-mono tracking-widest text-center text-lg"
                  maxLength={8}
                />
              </div>
            </div>
            <DialogFooter>
              <Button disabled={joinWorkspace.isPending || !joinCode.trim()} onClick={handleJoin}>
                {joinWorkspace.isPending ? "Uniéndose..." : "Unirse al Workspace"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
