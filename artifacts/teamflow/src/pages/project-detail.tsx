import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { 
  useGetProject, getGetProjectQueryKey,
  useListTasks, getListTasksQueryKey,
  useGetProjectSummary, getGetProjectSummaryQueryKey,
  useGetProjectContributions, getGetProjectContributionsQueryKey,
  useCreateTask, useUpdateTask, useCompleteTask, useDeleteProject,
  TaskInputType, TaskStatus
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, CheckCircle2, Clock, Trash2, Github } from "lucide-react";
import { format } from "date-fns";

const createTaskSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  type: z.nativeEnum(TaskInputType),
  assigneeId: z.coerce.number(),
  workloadPct: z.coerce.number().min(0).max(100),
  dueDate: z.string().optional(),
});

export function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const projectId = parseInt(params?.id || "0");
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [contributionPeriod, setContributionPeriod] = useState<"day"|"week"|"month"|"year">("week");

  const { data: project, isLoading: projectLoading } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) }
  });

  const { data: tasks } = useListTasks({ projectId }, {
    query: { enabled: !!projectId, queryKey: getListTasksQueryKey({ projectId }) }
  });

  const { data: summary } = useGetProjectSummary(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectSummaryQueryKey(projectId) }
  });

  const { data: contributions } = useGetProjectContributions(projectId, contributionPeriod, {
    query: { enabled: !!projectId, queryKey: getGetProjectContributionsQueryKey(projectId, contributionPeriod) }
  });

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const completeTask = useCompleteTask();
  const deleteProject = useDeleteProject();

  const form = useForm<z.infer<typeof createTaskSchema>>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      type: TaskInputType.programming,
      assigneeId: user?.id || 0,
      workloadPct: 10,
      dueDate: "",
    },
  });

  const onSubmitTask = (data: z.infer<typeof createTaskSchema>) => {
    createTask.mutate(
      { data: { ...data, projectId } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) });
          queryClient.invalidateQueries({ queryKey: getGetProjectSummaryQueryKey(projectId) });
          setIsCreateOpen(false);
          form.reset();
        },
      }
    );
  };

  const handleCompleteTask = (taskId: number) => {
    completeTask.mutate(
      { taskId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) });
          queryClient.invalidateQueries({ queryKey: getGetProjectSummaryQueryKey(projectId) });
        }
      }
    );
  };

  const handleDeleteProject = () => {
    if (confirm("Are you sure you want to delete this project?")) {
      deleteProject.mutate(
        { projectId },
        {
          onSuccess: () => {
            setLocation("/projects");
          }
        }
      );
    }
  };

  if (projectLoading || !project) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const COLORS = ['#6161ff', '#bcfe90', '#abf0ff', '#ff8940', '#eddff7'];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center gap-4 text-sm text-slate mb-4">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/projects")} className="px-0 hover:bg-transparent">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to projects
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-heading font-light tracking-heading text-ink">
              {project.name}
            </h1>
            <Badge variant="outline" className={`
              ${project.status === 'active' ? 'bg-[#bcfe90] text-[#2a5c4e] border-none' : ''}
              ${project.status === 'completed' ? 'bg-[#e7ecff] text-[#6161ff] border-none' : ''}
              ${project.status === 'paused' ? 'bg-[#f5f6f8] text-[#535768] border-none' : ''}
            `}>
              {project.status}
            </Badge>
          </div>
          <p className="text-slate mt-1">{project.description}</p>
        </div>
        
        <div className="flex items-center gap-2">
          {project.githubRepoUrl && (
            <Button variant="outline" size="sm" className="btn-pill" onClick={() => window.open(project.githubRepoUrl!, '_blank')}>
              <Github className="h-4 w-4 mr-2" /> Repository
            </Button>
          )}
          {user?.role === "leader" && (
            <Button variant="outline" size="icon" className="text-destructive border-destructive" onClick={handleDeleteProject}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          {user?.role === "leader" && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="btn-pill bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" /> Add Task
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create Task</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmitTask)} className="space-y-4 pt-4">
                    <FormField control={form.control} name="title" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="type" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value={TaskInputType.programming}>Programming</SelectItem>
                            <SelectItem value={TaskInputType.documentation}>Documentation</SelectItem>
                            <SelectItem value={TaskInputType.research}>Research</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="workloadPct" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Workload Percentage (1-100)</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="dueDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <DialogFooter className="pt-4">
                      <Button type="submit" className="btn-pill" disabled={createTask.isPending}>
                        {createTask.isPending ? "Creating..." : "Create Task"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card className="card-monday border-none">
            <CardHeader className="border-b border-mist bg-cloud/30 pb-4">
              <CardTitle className="text-lg font-medium text-ink flex justify-between items-center">
                <span>Task Board</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-mist">
                {tasks?.length === 0 ? (
                  <div className="p-8 text-center text-slate">No tasks found.</div>
                ) : (
                  tasks?.map(task => (
                    <div key={task.id} className="flex items-center justify-between p-4 hover:bg-cloud/50 transition-colors">
                      <div className="flex items-start gap-4">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={`rounded-full h-6 w-6 mt-1 ${task.status === 'completed' ? 'text-emerald-500 hover:text-emerald-600 bg-emerald-50' : 'text-slate hover:text-primary hover:bg-primary/10'}`}
                          onClick={() => task.status !== 'completed' && handleCompleteTask(task.id)}
                          disabled={task.status === 'completed'}
                        >
                          <CheckCircle2 className="h-5 w-5" />
                        </Button>
                        <div>
                          <div className={`font-medium ${task.status === 'completed' ? 'text-slate line-through' : 'text-ink'}`}>
                            {task.title}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={`
                              ${task.type === 'programming' ? 'bg-[#e7ecff] text-[#6161ff] border-none text-[10px] px-1 py-0' : ''}
                              ${task.type === 'documentation' ? 'bg-[#bcfe90] text-[#2a5c4e] border-none text-[10px] px-1 py-0' : ''}
                              ${task.type === 'research' ? 'bg-[#eddff7] text-[#9450fd] border-none text-[10px] px-1 py-0' : ''}
                            `}>
                              {task.type}
                            </Badge>
                            {task.status === 'overdue' && (
                              <Badge variant="outline" className="bg-red-50 text-red-500 border-none text-[10px] px-1 py-0">Overdue</Badge>
                            )}
                            <span className="text-xs text-slate">{task.assigneeName} • {task.workloadPct}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-slate flex items-center gap-1">
                        {task.dueDate && <><Clock className="h-3 w-3" /> {format(new Date(task.dueDate), 'MMM d')}</>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-1 space-y-6">
          <Card className="card-monday border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium text-ink">Project Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {summary ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-cloud rounded-xl p-3">
                      <div className="text-xs text-slate uppercase tracking-wider mb-1">Total Tasks</div>
                      <div className="text-2xl font-bold text-ink">{summary.totalTasks}</div>
                    </div>
                    <div className="bg-[#bcfe90]/20 rounded-xl p-3">
                      <div className="text-xs text-[#2a5c4e] uppercase tracking-wider mb-1">Completed</div>
                      <div className="text-2xl font-bold text-[#2a5c4e]">{summary.completedTasks}</div>
                    </div>
                  </div>
                  <div className="bg-cloud rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-ink">On-time Completion</span>
                      <span className="text-sm font-bold text-primary">{summary.onTimePct}%</span>
                    </div>
                    <div className="w-full bg-mist rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: `${summary.onTimePct}%` }}></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate py-4">No data</div>
              )}
            </CardContent>
          </Card>

          <Card className="card-monday border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium text-ink">Workload Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="h-[250px]">
              {summary && summary.memberBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary.memberBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="workloadPct"
                      nameKey="name"
                    >
                      {summary.memberBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${value}%`, 'Workload']}
                      contentStyle={{ borderRadius: '6px', border: '1px solid var(--color-mist)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-slate">No data</div>
              )}
            </CardContent>
          </Card>

          <Card className="card-monday border-none">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-medium text-ink">Contributions</CardTitle>
              <Select value={contributionPeriod} onValueChange={(v: any) => setContributionPeriod(v)}>
                <SelectTrigger className="w-[100px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="h-[200px]">
              {contributions && contributions.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={contributions}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '6px', border: '1px solid var(--color-mist)' }} />
                    <Bar dataKey="commits" fill="#6161ff" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-slate">No commits in this period</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
