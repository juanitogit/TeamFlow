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
import { LogoLoader } from "@/components/logo-loader";
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
  const [imageUrl, setImageUrl] = useState("");
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
      { name, description, imageUrl, githubRepos: validRepos.length > 0 ? validRepos : undefined } as any,
      {
        onSuccess: (newWorkspace) => {
          setIsCreateOpen(false);
          setName("");
          setDescription("");
          setImageUrl("");
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
    return <LogoLoader text="Cargando espacios de trabajo..." />;
  }

  return (
    <div className="min-h-screen bg-cloud p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold overflow-hidden shadow-sm">
            {user?.avatarUrl ? (
              <img src={user?.avatarUrl} alt={user?.name} className="h-full w-full object-cover" />
            ) : (
              user?.name?.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h2 className="font-semibold text-ink leading-tight text-lg">Bienvenido, {user?.name}</h2>
            <p className="text-sm text-slate">Selecciona un Espacio de Trabajo para continuar</p>
          </div>
        </div>
        <Button variant="ghost" onClick={logout} className="text-slate hover:text-red-500 self-end sm:self-auto">
          <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
        </Button>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
        {workspaces?.map((membership: any) => (
          <motion.div key={membership.workspaceId} whileHover={{ y: -6 }}>
            <div 
              className="h-full cursor-pointer hover:shadow-xl transition-all flex flex-col bg-snow rounded-[24px] border border-mist overflow-hidden relative group"
              onClick={() => handleSelectWorkspace(membership.workspaceId, membership.role)}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="p-6 flex-1 relative z-10">
                <div className="flex justify-between items-start">
                  <div className="h-12 w-12 shrink-0 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 shadow-sm rounded-2xl flex items-center justify-center overflow-hidden">
                    {membership.workspace.imageUrl ? (
                      <img src={membership.workspace.imageUrl} alt="Logo" className="h-full w-full object-cover" />
                    ) : (
                      <FolderKanban className="h-6 w-6 text-primary drop-shadow-sm" />
                    )}
                  </div>
                  <span className={`text-[11px] px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                    membership.role === 'leader' ? 'bg-gradient-to-r from-[#8b5cf6] to-[#4f46e5] text-white shadow-md' :
                    membership.role === 'co-leader' ? 'bg-primary/10 text-primary border border-primary/20' :
                    'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {membership.role === 'leader' ? 'Líder' : membership.role === 'co-leader' ? 'Co-líder' : 'Miembro'}
                  </span>
                </div>
                <h3 className="mt-6 text-xl font-semibold text-ink tracking-tight">{membership.workspace.name}</h3>
                <p className="mt-2 text-slate text-sm line-clamp-2">
                  {membership.workspace.description || "Sin descripción."}
                </p>
              </div>
              <div className="p-4 border-t border-mist bg-cloud/50 flex justify-between items-center relative z-10">
                <div className="text-xs text-slate font-medium flex items-center">
                  <Users className="h-3.5 w-3.5 mr-1.5 opacity-70" />
                  ID: {membership.workspaceId}
                </div>
                <div className="flex items-center gap-2">
                  {membership.role === "leader" && (
                    <Button variant="ghost" size="sm" className="h-8 text-xs hover:bg-primary/10 hover:text-primary transition-colors border border-transparent hover:border-primary/20" onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(membership.workspace.inviteCode);
                      toast({ title: "¡Invitación copiada!" });
                    }}>
                      <Copy className="h-3 w-3 mr-1.5" /> Código
                    </Button>
                  )}
                  <Button size="sm" className="h-8 text-xs rounded-lg shadow-sm" onClick={(e) => {
                    e.stopPropagation();
                    handleSelectWorkspace(membership.workspaceId, membership.role);
                  }}>
                    Entrar
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Create Workspace */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <motion.div whileHover={{ y: -6 }} className="h-full">
              <div className="h-full cursor-pointer border-dashed border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all flex flex-col items-center justify-center p-8 rounded-[24px] group">
                <div className="h-16 w-16 rounded-[16px] bg-white shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-primary tracking-tight">Crear Workspace</h3>
                <p className="text-sm text-center text-primary/70 mt-2 font-medium">Empieza un nuevo proyecto como Líder</p>
              </div>
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
                <label className="text-sm font-medium">Logo del Workspace (Opcional)</label>
                <div className="flex items-center gap-4">
                  {imageUrl && (
                    <div className="h-12 w-12 rounded-lg overflow-hidden border border-mist shrink-0">
                      <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" />
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
                          setImageUrl(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }} 
                  />
                </div>
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
              <Button disabled={createWorkspace.isPending} onClick={handleCreate} className="btn-pill">
                {createWorkspace.isPending ? "Creando..." : "Crear Workspace"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Join Workspace */}
        <Dialog open={isJoinOpen} onOpenChange={setIsJoinOpen}>
          <DialogTrigger asChild>
            <motion.div whileHover={{ y: -6 }} className="h-full">
              <div className="h-full cursor-pointer border-dashed border-2 border-mist bg-snow/50 hover:bg-snow hover:shadow-md transition-all flex flex-col items-center justify-center p-8 rounded-[24px]">
                <div className="h-16 w-16 rounded-[16px] bg-sky/20 flex items-center justify-center mb-6">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-ink tracking-tight">Unirse a Workspace</h3>
                <p className="text-sm text-center text-slate mt-2">Ingresa el código de invitación</p>
              </div>
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
              <Button disabled={joinWorkspace.isPending || !joinCode.trim()} onClick={handleJoin} className="btn-pill">
                {joinWorkspace.isPending ? "Uniéndose..." : "Unirse al Workspace"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
