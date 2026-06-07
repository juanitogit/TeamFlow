import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, GitCommit, Link as LinkIcon, UploadCloud, CheckCircle2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function NewContribution() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const workspaceId = localStorage.getItem("active_workspace_id");
  
  const [commitSha, setCommitSha] = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem("teamflow_token");
      const res = await fetch("/api/contributions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al enviar el aporte");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "¡Aporte enviado con éxito!", description: "Tu líder de equipo lo revisará pronto." });
      queryClient.invalidateQueries({ queryKey: ["contributions"] });
      setLocation("/");
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) {
      toast({ variant: "destructive", title: "Error", description: "No has seleccionado un workspace activo." });
      return;
    }
    
    submitMutation.mutate({
      workspaceId: parseInt(workspaceId),
      commitSha,
      commitMessage,
      repoUrl,
      evidenceUrls: evidenceUrl ? [evidenceUrl] : [],
    });
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Button variant="ghost" className="mb-6" onClick={() => setLocation("/")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver al Dashboard
      </Button>
      
      <Card className="card-monday border-t-4 border-t-primary shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-primary" />
            Registrar Nuevo Aporte
          </CardTitle>
          <CardDescription>
            Sube la evidencia de tu trabajo. Pega el enlace o el hash de tu commit de GitHub y añade pruebas visuales de que funciona.
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="commitMessage">Descripción del Aporte</Label>
                <Textarea 
                  id="commitMessage" 
                  placeholder="Ej. Se implementó la nueva pasarela de pago en el checkout..."
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  required
                  className="min-h-[100px]"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="commitSha" className="flex items-center gap-2">
                    <GitCommit className="h-4 w-4 text-slate" />
                    Commit SHA
                  </Label>
                  <Input 
                    id="commitSha" 
                    placeholder="Ej. a1b2c3d" 
                    value={commitSha}
                    onChange={(e) => setCommitSha(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="repoUrl" className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-slate" />
                    Enlace al Repositorio / Pull Request
                  </Label>
                  <Input 
                    id="repoUrl" 
                    type="url"
                    placeholder="https://github.com/..." 
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="evidenceUrl" className="flex items-center gap-2">
                  <UploadCloud className="h-4 w-4 text-slate" />
                  URL de la Evidencia (Imagen o Video)
                </Label>
                <Input 
                  id="evidenceUrl" 
                  type="url"
                  placeholder="https://imgur.com/... o enlace de Loom" 
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                />
                <p className="text-xs text-slate">
                  Pega un enlace directo a una captura de pantalla, un video de Loom, o un GIF mostrando tu código en acción.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 border-t flex justify-end py-4 rounded-b-xl">
            <Button type="button" variant="ghost" className="mr-2" onClick={() => setLocation("/")}>Cancelar</Button>
            <Button type="submit" disabled={submitMutation.isPending} className="px-8">
              {submitMutation.isPending ? "Enviando..." : "Enviar Aporte"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
