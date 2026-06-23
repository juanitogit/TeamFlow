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
import { IconVideo, IconClock, IconUsers, IconX, IconCalendar } from "@tabler/icons-react";
import { motion } from "framer-motion";
import { LogoLoader } from "@/components/ui/logo-loader";

function getAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("teamflow_token")}`, "Content-Type": "application/json" };
}

export function Meetings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: workspaces } = useWorkspaces();
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(parseInt(localStorage.getItem("active_workspace_id") || "0"));
  const role = typeof window !== 'undefined' ? localStorage.getItem("active_workspace_role") : null;
  const isLeader = role === "leader" || role === "co-leader";

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
      const res = await fetch(`/api/meetings/workspaces/${activeWorkspaceId}`, { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Error fetching meetings");
      return res.json();
    },
    enabled: !!activeWorkspaceId
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/meetings/workspaces/${activeWorkspaceId}`, {
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
    return <div className="text-center py-12 text-slate bg-white rounded-[24px] shadow-sm border border-mist">Selecciona un workspace arriba.</div>;
  }

  if (isLoading) return <div className="py-24 w-full flex items-center justify-center"><LogoLoader className="h-12 w-12" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-2xl">
              <IconVideo className="h-6 w-6 text-primary" />
            </div>
            Reuniones
          </h1>
          <p className="text-slate mt-1 text-sm font-medium">Sincronización y agenda del equipo</p>
        </div>
        
        {isLeader && (
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full shadow-sm hover:shadow-md transition-all">
                <IconVideo className="mr-2 h-4 w-4" />
                Agendar Reunión
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-[24px]">
              <DialogHeader>
                <DialogTitle className="text-xl">Agendar Nueva Reunión</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium text-slate block mb-1.5">Título de la reunión</label>
                  <Input required value={title} onChange={e => setTitle(e.target.value)} className="rounded-xl" placeholder="Ej. Daily Standup" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate block mb-1.5">Descripción (opcional)</label>
                  <Input value={description} onChange={e => setDescription(e.target.value)} className="rounded-xl" placeholder="Temas a tratar..." />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate block mb-1.5">Enlace a la videollamada</label>
                  <Input type="url" value={meetLink} onChange={e => setMeetLink(e.target.value)} className="rounded-xl" placeholder="https://meet.google.com/..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate block mb-1.5">Inicio</label>
                    <Input required type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className="rounded-xl" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate block mb-1.5">Fin</label>
                    <Input required type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} className="rounded-xl" />
                  </div>
                </div>
                <div className="pt-4 flex gap-2 justify-end">
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-full">Cancelar</Button>
                  <Button type="submit" disabled={createMutation.isPending} className="rounded-full shadow-sm">
                    {createMutation.isPending ? "Enviando..." : "Agendar y Notificar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {meetings?.length === 0 ? (
        <div className="py-16 flex flex-col items-center text-center bg-white rounded-[24px] border border-dashed border-mist shadow-sm">
          <IconVideo className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-ink">Sin Reuniones</h3>
          <p className="text-slate mt-1 text-sm">No hay reuniones agendadas por el momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {meetings?.map((m: any) => (
            <motion.div key={m.id} whileHover={{ y: -4 }}>
              <div className="bg-snow border border-mist rounded-[24px] shadow-sm p-6 relative flex flex-col h-full overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>
                
                <div className="flex items-start justify-between mb-4 z-10">
                  <div className="flex items-center gap-2">
                    <IconCalendar className="h-4 w-4 opacity-50" />
                    {format(new Date(m.startTime), "EEEE, d 'de' MMMM", { locale: es })}
                  </div>
                  <IconUsers className="w-5 h-5 text-slate opacity-50" />
                </div>
                
                <h3 className="text-xl font-semibold text-ink leading-tight mb-2 z-10">{m.title}</h3>
                
                <div className="flex items-center text-sm font-medium text-slate mb-4 z-10">
                  <IconClock className="w-4 h-4 mr-1.5 text-primary/60" />
                  <span>{format(new Date(m.startTime), "HH:mm")} - {format(new Date(m.endTime), "HH:mm")}</span>
                </div>
                
                {m.description && <p className="text-sm text-slate mb-6 flex-1 z-10">{m.description}</p>}
                
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-mist/50 z-10">
                  {m.meetLink ? (
                    <a href={m.meetLink} target="_blank" rel="noopener noreferrer" className="text-primary text-sm font-semibold hover:underline flex items-center gap-1.5 bg-primary/5 px-3 py-1.5 rounded-full">
                      <IconVideo className="w-4 h-4" /> Unirse a la sala
                    </a>
                  ) : <span className="text-slate text-sm font-medium flex items-center gap-1.5"><IconUsers className="w-4 h-4"/> Presencial</span>}

                  {(isLeader || m.organizer?.id === user?.id) && (
                    <Button variant="ghost" size="icon" onClick={() => {
                      if(window.confirm("¿Seguro que deseas cancelar esta reunión?")) {
                        deleteMutation.mutate(m.id);
                      }
                    }} className="h-8 w-8 rounded-full text-red-400 hover:text-red-600 hover:bg-red-50">
                      <IconX className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
