import { useListTasks, getListTasksQueryKey, useCompleteTask, ListTasksStatus } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Clock, ListTodo } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";

export function Tasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ListTasksStatus | "all">("all");

  const { data: tasks, isLoading } = useListTasks(
    { assigneeId: user?.id, ...(statusFilter !== "all" ? { status: statusFilter } : {}) },
    { query: { enabled: !!user, queryKey: getListTasksQueryKey({ assigneeId: user?.id, ...(statusFilter !== "all" ? { status: statusFilter } : {}) }) } }
  );

  const completeTask = useCompleteTask();

  const handleCompleteTask = (taskId: number) => {
    completeTask.mutate(
      { taskId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-heading font-light tracking-heading text-ink flex items-center gap-3">
            <ListTodo className="h-8 w-8 text-primary" />
            My Tasks
          </h1>
          <p className="text-slate mt-1">Manage your assigned work across all projects</p>
        </div>
        
        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
          <SelectTrigger className="w-[180px] bg-card border-none shadow-sm h-10">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {tasks?.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center bg-cloud rounded-3xl border border-dashed border-mist">
            <CheckCircle2 className="h-12 w-12 text-slate/50 mb-4" />
            <h3 className="text-lg font-medium text-ink">You're all caught up!</h3>
            <p className="text-slate mt-1">No tasks found for the selected filter.</p>
          </div>
        ) : (
          tasks?.map(task => {
            const daysLeft = task.dueDate ? differenceInDays(new Date(task.dueDate), new Date()) : null;
            
            return (
              <Card key={task.id} className="card-monday border-none hover:shadow-xl-2 transition-all">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={`rounded-full h-8 w-8 mt-0.5 ${task.status === 'completed' ? 'text-emerald-500 bg-emerald-50' : 'text-slate hover:text-primary hover:bg-primary/10 bg-cloud'}`}
                        onClick={() => task.status !== 'completed' && handleCompleteTask(task.id)}
                        disabled={task.status === 'completed' || completeTask.isPending}
                      >
                        <CheckCircle2 className="h-6 w-6" />
                      </Button>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-slate font-medium">{task.projectName}</span>
                          <Badge variant="outline" className={`
                            ${task.type === 'programming' ? 'bg-[#e7ecff] text-[#6161ff] border-none text-[10px] px-2 py-0' : ''}
                            ${task.type === 'documentation' ? 'bg-[#bcfe90] text-[#2a5c4e] border-none text-[10px] px-2 py-0' : ''}
                            ${task.type === 'research' ? 'bg-[#eddff7] text-[#9450fd] border-none text-[10px] px-2 py-0' : ''}
                          `}>
                            {task.type}
                          </Badge>
                          {task.status === 'overdue' && (
                            <Badge variant="outline" className="bg-red-50 text-red-500 border-none text-[10px] px-2 py-0">Overdue</Badge>
                          )}
                        </div>
                        <h3 className={`text-lg font-medium ${task.status === 'completed' ? 'text-slate line-through' : 'text-ink'}`}>
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-sm text-slate mt-1 line-clamp-2 max-w-2xl">{task.description}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between md:flex-col md:items-end gap-2 pl-12 md:pl-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-slate bg-cloud px-2 py-1 rounded-md font-medium">{task.workloadPct}% workload</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm">
                        {task.dueDate ? (
                          <>
                            <Clock className={`h-4 w-4 ${daysLeft && daysLeft < 0 ? 'text-red-500' : 'text-slate'}`} />
                            <span className={`font-medium ${daysLeft && daysLeft < 0 ? 'text-red-500' : 'text-slate'}`}>
                              {daysLeft && daysLeft < 0 ? 'Overdue' : daysLeft === 0 ? 'Due today' : `Due in ${daysLeft} days`}
                            </span>
                            <span className="text-slate/70 ml-1">({format(new Date(task.dueDate), 'MMM d')})</span>
                          </>
                        ) : (
                          <span className="text-slate">No due date</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
