import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useGetPerformanceDashboard, getGetPerformanceDashboardQueryKey } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, AlertCircle, Clock, Heart, TrendingUp, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const mockContributionData = [
  { name: 'Mon', commits: 4, tasks: 2 },
  { name: 'Tue', commits: 7, tasks: 3 },
  { name: 'Wed', commits: 2, tasks: 1 },
  { name: 'Thu', commits: 8, tasks: 4 },
  { name: 'Fri', commits: 5, tasks: 2 },
  { name: 'Sat', commits: 1, tasks: 0 },
  { name: 'Sun', commits: 0, tasks: 0 },
];

export function Dashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [_, setLocation] = useLocation();

  const { data: dashboard, isLoading: dashboardLoading } = useGetPerformanceDashboard({
    query: {
      enabled: isAuthenticated,
      queryKey: getGetPerformanceDashboardQueryKey(),
    }
  });

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        setLocation("/login");
        return;
      }
      
      const activeWorkspaceId = localStorage.getItem("active_workspace_id");
      if (!activeWorkspaceId) {
        setLocation("/workspaces");
      }
    }
  }, [authLoading, isAuthenticated, setLocation]);

  if (authLoading || !isAuthenticated || dashboardLoading || !dashboard) {
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
      className="space-y-12"
    >
      <section className="space-y-4">
        <h1 className="text-display font-light tracking-display leading-display text-ink">
          Welcome back, <span className="font-medium bg-clip-text text-transparent" style={{ backgroundImage: 'var(--gradient-apricot)' }}>{user?.name}</span>
        </h1>
        <p className="text-subheading text-slate">Here's what's happening with your team today.</p>
      </section>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card-monday border-none">
          <CardContent className="p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-slate font-medium uppercase tracking-wider text-xs flex items-center gap-2">
                <Heart className="h-4 w-4" /> Health Points
              </span>
            </div>
            <div>
              <div className={`text-5xl font-bold tracking-tight ${getHealthColor(dashboard.healthPoints)}`}>
                {dashboard.healthPoints}
              </div>
              <Progress value={dashboard.healthPoints} className={`h-2 mt-4 [&>div]:${getHealthBg(dashboard.healthPoints)}`} />
            </div>
          </CardContent>
        </Card>

        <Card className="card-monday border-none">
          <CardContent className="p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-slate font-medium uppercase tracking-wider text-xs flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Performance Score
              </span>
            </div>
            <div>
              <div className="text-5xl font-bold tracking-tight text-primary">
                {dashboard.performanceScore}%
              </div>
              <Progress value={dashboard.performanceScore} className="h-2 mt-4 [&>div]:bg-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-monday border-none">
          <CardContent className="p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-slate font-medium uppercase tracking-wider text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Active Tasks
              </span>
            </div>
            <div className="text-5xl font-bold tracking-tight text-ink">
              {dashboard.activeTasksCount}
            </div>
            <div className="text-sm text-slate">
              <span className="font-medium text-emerald-500">{dashboard.completedThisWeek} completed</span> this week
            </div>
          </CardContent>
        </Card>

        <Card className="card-monday border-none">
          <CardContent className="p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-slate font-medium uppercase tracking-wider text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> Overdue Tasks
              </span>
            </div>
            <div className={`text-5xl font-bold tracking-tight ${dashboard.overdueTasksCount > 0 ? 'text-destructive' : 'text-slate'}`}>
              {dashboard.overdueTasksCount}
            </div>
            <div className="text-sm text-slate">
              Requires immediate attention
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="col-span-3 lg:col-span-3 card-monday border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-ink font-medium">
              <BarChart3 className="h-5 w-5 text-primary" /> Aportes de la Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockContributionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#222222" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#222222" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e57373" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#e57373" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#888888', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888888', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="commits" stroke="#222222" fillOpacity={1} fill="url(#colorCommits)" name="Commits en GitHub" strokeWidth={2} />
                  <Area type="monotone" dataKey="tasks" stroke="#e57373" fillOpacity={1} fill="url(#colorTasks)" name="Tareas Completadas" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="col-span-2 card-monday border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-ink font-medium">
              <Clock className="h-5 w-5 text-primary" /> Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.upcomingDeadlines.length === 0 ? (
              <div className="py-8 text-center text-slate">No upcoming deadlines. Great job!</div>
            ) : (
              <div className="space-y-4">
                {dashboard.upcomingDeadlines.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-4 rounded-xl border border-mist bg-cloud/50 hover:bg-cloud transition-colors">
                    <div className="space-y-1">
                      <div className="font-medium text-ink">{task.title}</div>
                      <div className="text-sm text-slate">{task.projectName}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className={`
                        ${task.type === 'programming' ? 'bg-[#e7ecff] text-[#6161ff] border-none' : ''}
                        ${task.type === 'documentation' ? 'bg-[#bcfe90] text-[#2a5c4e] border-none' : ''}
                        ${task.type === 'research' ? 'bg-[#eddff7] text-[#9450fd] border-none' : ''}
                      `}>
                        {task.type}
                      </Badge>
                      <div className="text-sm font-medium text-slate">
                        {task.dueDate ? format(new Date(task.dueDate), 'MMM d') : 'No date'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 card-monday border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-ink font-medium">
              <Activity className="h-5 w-5 text-primary" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {dashboard.recentActivity.map(activity => (
                <div key={activity.id} className="flex gap-4">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center text-primary font-medium text-xs">
                    {activity.userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-ink">
                      <span className="font-medium">{activity.userName}</span> {activity.action}{" "}
                      <span className="font-medium">{activity.entityTitle}</span>
                    </p>
                    <p className="text-xs text-slate">
                      {format(new Date(activity.createdAt), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
              {dashboard.recentActivity.length === 0 && (
                <div className="text-sm text-slate text-center py-4">No recent activity</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
