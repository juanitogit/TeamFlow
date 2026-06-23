import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("teamflow_token")}`, "Content-Type": "application/json" };
}

// Custom Abstract SVG for meetings
const MeetingIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" className="text-primary">
    <rect x="2" y="4" width="20" height="16" />
    <path d="M6 8h12M6 12h8M6 16h4" />
  </svg>
);

export function Meetings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { workspaces } = useWorkspaces();
  const activeWorkspaceId = parseInt(localStorage.getItem("active_workspace_id") || "0");
  const activeWorkspaceRole = workspaces?.find(w => w.workspace.id === activeWorkspaceId)?.role;
  const isLeader = activeWorkspaceRole === "leader" || activeWorkspaceRole === "co-leader";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetLink, setMeetLink] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const { data: meetings, isLoading } = useQuery({
    queryKey: ["meetings", activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) return [];
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}/meetings`, { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Error fetching meetings");
      return res.json();
    },
    enabled: !!activeWorkspaceId
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}/meetings`, {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify(data)
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "¡Reunión agendada! Invitaciones enviadas por correo." });
      setIsModalOpen(false);
      setTitle("");
      setDescription("");
      setMeetLink("");
      setStartTime("");
      setEndTime("");
      queryClient.invalidateQueries({ queryKey: ["meetings", activeWorkspaceId] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/meetings/${id}`, { method: "DELETE", headers: getAuthHeader() });
      if (!res.ok) throw new Error("Error deleting meeting");
    },
    onSuccess: () => {
      toast({ title: "Reunión eliminada." });
      queryClient.invalidateQueries({ queryKey: ["meetings", activeWorkspaceId] });
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ title, description, meetLink, startTime: new Date(startTime).toISOString(), endTime: new Date(endTime).toISOString() });
  };

  if (!activeWorkspaceId) {
    return <div className="text-center py-12 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">Selecciona un workspace arriba.</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-4 border-black pb-4">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter flex items-center gap-3">
            <MeetingIcon />
            Reuniones
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium uppercase tracking-widest">Sincronización de Equipo</p>
        </div>
        
        {isLeader && (
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all font-bold uppercase rounded-none">
                Agendar Reunión
              </Button>
            </DialogTrigger>
            <DialogContent className="border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase border-b-2 border-black pb-2">Nueva Reunión</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-1 block">Título</label>
                  <Input required value={title} onChange={e => setTitle(e.target.value)} className="border-2 border-black rounded-none" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-1 block">Descripción</label>
                  <Input value={description} onChange={e => setDescription(e.target.value)} className="border-2 border-black rounded-none" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider mb-1 block">Enlace (Meet, Zoom, etc)</label>
                  <Input type="url" value={meetLink} onChange={e => setMeetLink(e.target.value)} className="border-2 border-black rounded-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider mb-1 block">Inicio</label>
                    <Input required type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className="border-2 border-black rounded-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider mb-1 block">Fin</label>
                    <Input required type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} className="border-2 border-black rounded-none" />
                  </div>
                </div>
                <Button type="submit" disabled={createMutation.isPending} className="w-full border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all font-bold uppercase rounded-none mt-4">
                  {createMutation.isPending ? "Enviando invitaciones..." : "Agendar y Notificar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="h-40 flex items-center justify-center border-2 border-black bg-secondary shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold uppercase tracking-widest">
          Cargando...
        </div>
      ) : meetings?.length === 0 ? (
        <div className="py-16 text-center border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <p className="font-bold uppercase tracking-widest text-muted-foreground">No hay reuniones programadas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {meetings?.map((m: any) => (
            <div key={m.id} className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 relative group">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground border-b-2 border-l-2 border-black px-3 py-1 font-bold text-xs uppercase">
                {format(new Date(m.startTime), "MMM d", { locale: es })}
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight mb-2 pr-12">{m.title}</h3>
              <p className="text-sm font-medium mb-4">{format(new Date(m.startTime), "HH:mm")} - {format(new Date(m.endTime), "HH:mm")}</p>
              
              {m.description && <p className="text-sm border-l-4 border-black pl-3 mb-4">{m.description}</p>}
              
              <div className="flex items-center justify-between mt-6 pt-4 border-t-2 border-black border-dashed">
                {m.meetLink ? (
                  <a href={m.meetLink} target="_blank" rel="noopener noreferrer" className="text-primary font-bold uppercase text-sm hover:underline flex items-center gap-1">
                    Unirse a la llamada ↗
                  </a>
                ) : <span className="text-muted-foreground text-sm font-bold uppercase">Presencial / TBD</span>}

                {(isLeader || m.organizer.id === user?.id) && (
                  <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(m.id)} className="border-2 border-black rounded-none h-8 px-2 font-bold uppercase text-xs">
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
