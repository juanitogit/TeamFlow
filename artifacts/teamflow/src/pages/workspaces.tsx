import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Plus, Users, FolderKanban, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useWorkspaces, useCreateWorkspace, useJoinWorkspace } from "@/hooks/use-workspaces";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

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
  const [githubRepoUrl, setGithubRepoUrl] = useState("");
  const [joinId, setJoinId] = useState("");

  // Select active workspace in localStorage
  const handleSelectWorkspace = (workspaceId: number, workspaceRole: string) => {
    localStorage.setItem("active_workspace_id", workspaceId.toString());
    localStorage.setItem("active_workspace_role", workspaceRole);
    setLocation("/");
  };

  const handleCreate = async () => {
    if (!name) return;
    createWorkspace.mutate(
      { name, description, githubRepoUrl },
      {
        onSuccess: (newWorkspace) => {
          setIsCreateOpen(false);
          handleSelectWorkspace(newWorkspace.id, "leader");
        },
        onError: (err) => {
          toast({ variant: "destructive", title: "Error", description: err.message });
        }
      }
    );
  };

  const handleJoin = async () => {
    const id = parseInt(joinId);
    if (isNaN(id)) return;
    
    joinWorkspace.mutate(id, {
      onSuccess: () => {
        setIsJoinOpen(false);
        toast({ title: "Joined workspace successfully!" });
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Error", description: err.message });
      }
    });
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading workspaces...</div>;
  }

  return (
    <div className="min-h-screen bg-cloud p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-semibold text-ink leading-tight">Welcome, {user?.name}</h2>
            <p className="text-sm text-slate">Select a workspace to continue</p>
          </div>
        </div>
        <Button variant="ghost" onClick={logout} className="text-slate hover:text-red-500">
          <LogOut className="h-4 w-4 mr-2" /> Logout
        </Button>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
        {workspaces?.map((membership: any) => (
          <motion.div key={membership.workspaceId} whileHover={{ y: -4 }}>
            <Card 
              className="h-full cursor-pointer hover:shadow-lg transition-all card-monday"
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
                    'bg-slate/10 text-slate'
                  }`}>
                    {membership.role}
                  </span>
                </div>
                <CardTitle className="mt-4">{membership.workspace.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {membership.workspace.description || "No description provided."}
                </CardDescription>
              </CardHeader>
              <CardFooter className="pt-4 border-t border-slate/10 text-xs text-slate">
                ID: {membership.workspaceId}
              </CardFooter>
            </Card>
          </motion.div>
        ))}

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <motion.div whileHover={{ y: -4 }} className="h-full">
              <Card className="h-full cursor-pointer border-dashed border-2 bg-transparent hover:bg-slate/5 transition-all flex flex-col items-center justify-center p-8">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium text-ink">Create Workspace</h3>
                <p className="text-sm text-center text-slate mt-2">Start a new project space as a Leader</p>
              </Card>
            </motion.div>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Workspace</DialogTitle>
              <DialogDescription>Create a space for your team to track performance.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Workspace Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Frontend Team" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this workspace for?" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">GitHub Repository URL (Optional)</label>
                <Input value={githubRepoUrl} onChange={(e) => setGithubRepoUrl(e.target.value)} placeholder="https://github.com/org/repo" />
              </div>
            </div>
            <DialogFooter>
              <Button disabled={createWorkspace.isPending} onClick={handleCreate}>
                {createWorkspace.isPending ? "Creating..." : "Create Workspace"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isJoinOpen} onOpenChange={setIsJoinOpen}>
          <DialogTrigger asChild>
            <motion.div whileHover={{ y: -4 }} className="h-full">
              <Card className="h-full cursor-pointer border-dashed border-2 bg-transparent hover:bg-slate/5 transition-all flex flex-col items-center justify-center p-8">
                <div className="h-12 w-12 rounded-full bg-slate/10 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-slate" />
                </div>
                <h3 className="font-medium text-ink">Join Workspace</h3>
                <p className="text-sm text-center text-slate mt-2">Enter an ID to join an existing team</p>
              </Card>
            </motion.div>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Join Workspace</DialogTitle>
              <DialogDescription>Enter the workspace ID provided by your leader.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Workspace ID</label>
                <Input value={joinId} onChange={(e) => setJoinId(e.target.value)} placeholder="e.g. 12" />
              </div>
            </div>
            <DialogFooter>
              <Button disabled={joinWorkspace.isPending} onClick={handleJoin}>
                {joinWorkspace.isPending ? "Joining..." : "Join Workspace"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
