import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, XCircle, ExternalLink, GitCommit, Search } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useContributions } from "@/hooks/use-workspaces";
import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function ReviewContributions() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const workspaceId = localStorage.getItem("active_workspace_id");
  const { data: contributions, isLoading } = useContributions(workspaceId ? parseInt(workspaceId) : null);
  
  const [comments, setComments] = useState<Record<number, string>>({});

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, reviewComment }: { id: number, status: "approved" | "rejected", reviewComment?: string }) => {
      const token = localStorage.getItem("teamflow_token");
      const res = await fetch(`/api/contributions/${id}/review`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status, reviewComment }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al revisar el aporte");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      toast({ 
        title: variables.status === "approved" ? "Aporte Aprobado" : "Aporte Rechazado", 
        description: "Se han notificado los cambios y actualizado el score." 
      });
      queryClient.invalidateQueries({ queryKey: ["contributions"] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  });

  const handleReview = (id: number, status: "approved" | "rejected") => {
    reviewMutation.mutate({ id, status, reviewComment: comments[id] });
  };

  const pendingContributions = contributions?.filter((c: any) => c.status === "pending") || [];

  return (
    <div className="max-w-4xl mx-auto py-8">
      <Button variant="ghost" className="mb-6" onClick={() => setLocation("/")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver al Dashboard
      </Button>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-ink">Revisión de Aportes</h1>
        <p className="text-slate mt-1">
          Como líder o co-líder, aquí puedes validar los commits y pruebas de tu equipo.
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate">Cargando aportes pendientes...</div>
      ) : pendingContributions.length === 0 ? (
        <Card className="border-dashed border-2 bg-slate-50 shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckCircle2 className="h-12 w-12 text-green-400 mb-4" />
            <h3 className="text-xl font-semibold text-ink">¡Todo al día!</h3>
            <p className="text-slate mt-2">No hay aportes pendientes de revisión.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {pendingContributions.map((contrib: any) => (
            <Card key={contrib.id} className="card-monday overflow-hidden border-l-4 border-l-amber-500">
              <CardHeader className="bg-slate-50 pb-4 border-b">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-card border shadow-sm">
                      {contrib.user.avatarUrl ? (
                        <img src={contrib.user.avatarUrl} alt={contrib.user.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-sm font-bold text-slate-500">
                          {contrib.user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">{contrib.user.name}</CardTitle>
                      <CardDescription>
                        {format(new Date(contrib.createdAt), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 uppercase tracking-widest text-[10px]">
                    Pendiente
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="mb-4">
                  <h4 className="font-semibold text-ink flex items-center gap-2 mb-2">
                    <GitCommit className="h-4 w-4 text-slate" />
                    Commit: <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-sm font-normal border">{contrib.commitSha}</span>
                  </h4>
                  <p className="text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded border text-sm">
                    {contrib.commitMessage}
                  </p>
                </div>
                
                {(contrib.repoUrl || contrib.evidenceUrls?.length > 0) && (
                  <div className="flex flex-col gap-3 mt-6">
                    <h4 className="font-semibold text-ink text-sm">Enlaces y Evidencias:</h4>
                    {contrib.repoUrl && (
                      <a href={contrib.repoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-primary hover:underline bg-primary/5 p-2 rounded w-fit">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ver en el Repositorio
                      </a>
                    )}
                    {contrib.evidenceUrls?.map((url: string, i: number) => {
                      if (url.startsWith("data:image")) {
                        return (
                          <div key={i} className="mt-2 border rounded-md overflow-hidden max-w-sm">
                            <img src={url} alt="Evidencia adjunta" className="w-full h-auto object-contain bg-slate-50" />
                          </div>
                        );
                      }
                      return (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-emerald-600 hover:underline bg-emerald-50 p-2 rounded w-fit mt-2">
                          <Search className="h-4 w-4 mr-2" />
                          Ver Evidencia Adjunta
                        </a>
                      );
                    })}
                  </div>
                )}

                <div className="mt-6 pt-4 border-t">
                  <label className="text-sm font-medium text-ink mb-2 block">Añadir comentario (Opcional):</label>
                  <Textarea 
                    placeholder="Feedback para el desarrollador..."
                    value={comments[contrib.id] || ""}
                    onChange={(e) => setComments({ ...comments, [contrib.id]: e.target.value })}
                    className="text-sm"
                  />
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50 border-t flex justify-end gap-3 py-4">
                <Button 
                  variant="outline" 
                  className="border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => handleReview(contrib.id, "rejected")}
                  disabled={reviewMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rechazar
                </Button>
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleReview(contrib.id, "approved")}
                  disabled={reviewMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Aprobar Aporte (+10 pt)
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
