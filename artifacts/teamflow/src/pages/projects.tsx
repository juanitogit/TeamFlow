import { useListProjects, getListProjectsQueryKey, useCreateProject, ProjectInputStatus, Project } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Plus, Github, FolderOpen, MoreHorizontal, Users, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

const createProjectSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  githubRepoUrl: z.string().url().optional().or(z.literal("")),
});

export function Projects() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  const { data: projects, isLoading } = useListProjects({
    query: {
      queryKey: getListProjectsQueryKey(),
    }
  });

  const createProject = useCreateProject();

  const form = useForm<z.infer<typeof createProjectSchema>>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      githubRepoUrl: "",
    },
  });

  const onSubmit = (data: z.infer<typeof createProjectSchema>) => {
    createProject.mutate(
      { data: { ...data, status: ProjectInputStatus.active } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          setIsCreateOpen(false);
          form.reset();
        },
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
            <LayoutDashboard className="h-8 w-8 text-primary" />
            Projects
          </h1>
          <p className="text-slate mt-1">Manage and track your team's initiatives</p>
        </div>
        
        {user?.role === "leader" && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="btn-pill bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" /> New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Website Redesign" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Brief overview of the project" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="githubRepoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GitHub Repository URL (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://github.com/org/repo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="pt-4">
                    <Button type="submit" className="btn-pill" disabled={createProject.isPending}>
                      {createProject.isPending ? "Creating..." : "Create Project"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects?.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`}>
            <Card className="card-monday hover:shadow-xl-2 transition-shadow cursor-pointer border-none h-full flex flex-col">
              <CardContent className="p-6 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-4">
                  <Badge variant="outline" className={`
                    ${project.status === 'active' ? 'bg-[#bcfe90] text-[#2a5c4e] border-none' : ''}
                    ${project.status === 'completed' ? 'bg-[#e7ecff] text-[#6161ff] border-none' : ''}
                    ${project.status === 'paused' ? 'bg-[#f5f6f8] text-[#535768] border-none' : ''}
                  `}>
                    {project.status}
                  </Badge>
                  {project.githubRepoUrl && (
                    <div className="h-8 w-8 rounded-full bg-cloud flex items-center justify-center text-slate">
                      <Github className="h-4 w-4" />
                    </div>
                  )}
                </div>
                
                <h3 className="text-xl font-medium text-ink mb-2 line-clamp-1">{project.name}</h3>
                <p className="text-slate text-sm line-clamp-2 mb-6 flex-1">
                  {project.description || "No description provided."}
                </p>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-mist">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate uppercase tracking-wider mb-1 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Tasks</span>
                    <span className="font-medium text-ink">{project.completedTaskCount || 0} / {project.taskCount || 0}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-slate uppercase tracking-wider mb-1 flex items-center gap-1"><Users className="h-3 w-3" /> Team</span>
                    <span className="font-medium text-ink">{project.memberCount || 0} members</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

        {projects?.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-center bg-cloud rounded-3xl border border-dashed border-mist">
            <FolderOpen className="h-12 w-12 text-slate/50 mb-4" />
            <h3 className="text-lg font-medium text-ink">No projects yet</h3>
            <p className="text-slate max-w-md mt-1 mb-6">Create a project to start organizing tasks and tracking team progress.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
