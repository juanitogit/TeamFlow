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

// Corporate SVGs
const MeetingIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14v-4z" />
    <rect x="3" y="6" width="12" height="12" rx="2" ry="2" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 text-slate-400">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const LinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
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
      toast({ title: "¡Reunión agendada! Invitaciones enviadas." });
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
      toast({ title: "Reunión cancelada." });
      queryClient.invalidateQueries({ queryKey: ["meetings", activeWorkspaceId] });
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ title, description, meetLink, startTime: new Date(startTime).toISOString(), endTime: new Date(endTime).toISOString() });
  };

  if (!activeWorkspaceId) {
    return <div className="text-center py-12 text-slate-500 font-medium bg-white border border-slate-200 rounded-lg shadow-sm">Selecciona un workspace arriba.</div>;
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              <MeetingIcon />
            </div>
            Reuniones
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Sincronización y agenda de equipo</p>
        </div>
        
        {isLeader && (
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-sm">
                Agendar Reunión
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-xl">Nueva Reunión</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Título</label>
                  <Input required value={title} onChange={e => setTitle(e.target.value)} className="focus-visible:ring-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Descripción</label>
                  <Input value={description} onChange={e => setDescription(e.target.value)} className="focus-visible:ring-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Enlace (Meet, Zoom, etc)</label>
                  <Input type="url" value={meetLink} onChange={e => setMeetLink(e.target.value)} className="focus-visible:ring-1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">Inicio</label>
                    <Input required type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className="focus-visible:ring-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">Fin</label>
                    <Input required type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} className="focus-visible:ring-1" />
                  </div>
                </div>
                <div className="pt-4 flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={createMutation.isPending} className="shadow-sm">
                    {createMutation.isPending ? "Enviando..." : "Agendar y Notificar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="h-40 flex items-center justify-center text-slate-500 text-sm">
          Cargando agenda...
        </div>
      ) : meetings?.length === 0 ? (
        <div className="py-16 text-center bg-white border border-slate-200 border-dashed rounded-lg shadow-sm">
          <p className="text-slate-500 text-sm">No hay reuniones programadas próximas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {meetings?.map((m: any) => (
            <div key={m.id} className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-all p-5 relative flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-slate-900 leading-tight pr-4">{m.title}</h3>
                <div className="bg-blue-50 text-blue-700 text-xs font-medium px-2 py-1 rounded-md flex-shrink-0">
                  {format(new Date(m.startTime), "MMM d", { locale: es })}
                </div>
              </div>
              
              <div className="flex items-center text-sm font-medium text-slate-600 mb-3">
                <CalendarIcon />
                <span>{format(new Date(m.startTime), "HH:mm")} - {format(new Date(m.endTime), "HH:mm")}</span>
              </div>
              
              {m.description && <p className="text-sm text-slate-500 mb-4 flex-1 line-clamp-2">{m.description}</p>}
              
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                {m.meetLink ? (
                  <a href={m.meetLink} target="_blank" rel="noopener noreferrer" className="text-primary text-sm font-medium hover:underline flex items-center">
                    <LinkIcon /> Unirse a la llamada
                  </a>
                ) : <span className="text-slate-400 text-sm font-medium">Presencial / TBD</span>}

                {(isLeader || m.organizer.id === user?.id) && (
                  <Button variant="ghost" size="sm" onClick={() => {
                    if(window.confirm("¿Seguro que deseas cancelar esta reunión?")) {
                      deleteMutation.mutate(m.id);
                    }
                  }} className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50">
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
