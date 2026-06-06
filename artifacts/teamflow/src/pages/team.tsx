import { useState } from "react";
import { useGetTeamPerformance, getGetTeamPerformanceQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Target, Activity, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function Team() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<"day"|"week"|"month"|"year">("week");

  const { data: performance, isLoading } = useGetTeamPerformance({ period }, {
    query: { queryKey: getGetTeamPerformanceQueryKey({ period }) }
  });

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
            Team Performance
          </h1>
          <p className="text-slate mt-1">Health and productivity metrics for your team</p>
        </div>
        
        <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
          <SelectTrigger className="w-[150px] bg-card border-none shadow-sm h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {performance?.map(member => (
          <Card key={member.userId} className="card-monday border-none">
            <CardHeader className="pb-2 border-b border-mist">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <CardTitle className="text-lg font-medium text-ink">{member.name}</CardTitle>
                  <span className="text-sm text-slate">{member.userId === user?.id ? "(You)" : "Team Member"}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-slate flex items-center gap-2"><Target className="h-4 w-4" /> Performance Score</span>
                  <span className="text-lg font-bold text-ink">{member.performanceScore}%</span>
                </div>
                <Progress value={member.performanceScore} className="h-2 [&>div]:bg-primary" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-slate flex items-center gap-2"><Activity className="h-4 w-4" /> Health Points</span>
                  <span className={`text-lg font-bold ${getHealthColor(member.healthPoints)}`}>{member.healthPoints}</span>
                </div>
                <Progress value={member.healthPoints} className={`h-2 [&>div]:${getHealthBg(member.healthPoints)}`} />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-mist">
                <div className="space-y-1">
                  <div className="text-xs text-slate uppercase tracking-wider">Workload</div>
                  <div className="text-xl font-medium text-ink">{member.workloadPercentage}%</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-slate uppercase tracking-wider">Completed</div>
                  <div className="text-xl font-medium text-emerald-500">{member.tasksCompleted}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-slate uppercase tracking-wider">Pending</div>
                  <div className="text-xl font-medium text-slate">{member.tasksPending}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-slate uppercase tracking-wider">Late</div>
                  <div className="text-xl font-medium text-red-500">{member.tasksLate}</div>
                </div>
              </div>
              
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}
