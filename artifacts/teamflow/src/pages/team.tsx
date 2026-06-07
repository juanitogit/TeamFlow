import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspaceMembers } from "@/hooks/use-workspaces";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Target, Activity, CheckCircle2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export function Team() {
  const { user } = useAuth();
  
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("active_workspace_id");
    if (id) {
      setWorkspaceId(parseInt(id));
    }
  }, []);

  const { data: members, isLoading } = useWorkspaceMembers(workspaceId);

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getHealthColor = (points: number) => {
    if (points >= 70) return "text-emerald-500";
    if (points >= 40) return "text-amber-500";
    return "text-red-500";
  };

  const getHealthBg = (points: number) => {
    if (points >= 70) return "bg-emerald-500";
    if (points >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-heading font-light tracking-heading text-ink flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            Rendimiento del Equipo
          </h1>
          <p className="text-slate mt-1">Métricas de salud y productividad reales de tu workspace</p>
        </div>
      </div>

      {!workspaceId ? (
        <div className="text-center py-12 text-slate bg-white rounded-xl shadow-sm border border-slate-200">
          Selecciona un workspace para ver a tu equipo.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members?.map((member: any) => (
            <Card key={member.id} className="card-monday border-none">
              <CardHeader className="pb-2 border-b border-mist">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" />
                      ) : (
                        member.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg font-medium text-ink">{member.name}</CardTitle>
                      <span className="text-sm text-slate">{member.id === user?.id ? "(Tú)" : "Miembro del Equipo"}</span>
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
              <CardContent className="p-6 space-y-6">
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate flex items-center gap-2"><Target className="h-4 w-4" /> Score General</span>
                    <span className="text-lg font-bold text-ink">{member.performanceScore}%</span>
                  </div>
                  <Progress value={member.performanceScore} className="h-2 [&>div]:bg-primary" />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate flex items-center gap-2"><Activity className="h-4 w-4" /> Puntos de Salud</span>
                    <span className={`text-lg font-bold ${getHealthColor(member.healthPoints)}`}>{member.healthPoints}</span>
                  </div>
                  <Progress value={member.healthPoints} className={`h-2 [&>div]:${getHealthBg(member.healthPoints)}`} />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-mist">
                  <div className="space-y-1">
                    <div className="text-xs text-slate uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Aprobados
                    </div>
                    <div className="text-xl font-medium text-emerald-500">{member.contributions.approved}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-slate uppercase tracking-wider flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 text-amber-500" /> Pendientes
                    </div>
                    <div className="text-xl font-medium text-amber-500">{member.contributions.pending}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-slate uppercase tracking-wider">Rechazados</div>
                    <div className="text-xl font-medium text-red-500">{member.contributions.rejected}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-slate uppercase tracking-wider">Total Commits</div>
                    <div className="text-xl font-medium text-slate-700">{member.contributions.total}</div>
                  </div>
                </div>
                
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}
