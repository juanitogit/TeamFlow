import { useState } from "react";
import { useListRoadmapItems, getListRoadmapItemsQueryKey, useCreateRoadmapItem, RoadmapItemStatus, RoadmapItemInputStatus } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Map, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { format, addMonths, subMonths } from "date-fns";

const createRoadmapSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
});

export function Roadmap() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  const { data: items, isLoading } = useListRoadmapItems({ month, year }, {
    query: { queryKey: getListRoadmapItemsQueryKey({ month, year }) }
  });

  const createItem = useCreateRoadmapItem();

  const form = useForm<z.infer<typeof createRoadmapSchema>>({
    resolver: zodResolver(createRoadmapSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const onSubmit = (data: z.infer<typeof createRoadmapSchema>) => {
    createItem.mutate(
      { data: { ...data, month, year, status: RoadmapItemInputStatus.planned } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRoadmapItemsQueryKey({ month, year }) });
          setIsCreateOpen(false);
          form.reset();
        },
      }
    );
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const columns = [
    { id: 'planned', label: 'Planned' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'achieved', label: 'Achieved' },
    { id: 'missed', label: 'Missed' }
  ] as const;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-heading font-light tracking-heading text-ink flex items-center gap-3">
            <Map className="h-8 w-8 text-primary" />
            Roadmap
          </h1>
          <p className="text-slate mt-1">High-level objectives and strategic goals</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-card rounded-md border border-mist p-1 shadow-sm">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-sm" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-4 font-medium text-ink w-32 text-center">
              {format(currentDate, 'MMMM yyyy')}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {user?.role === "leader" && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="btn-pill bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" /> Add Objective
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add Roadmap Objective</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
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
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter className="pt-4">
                      <Button type="submit" className="btn-pill" disabled={createItem.isPending}>
                        {createItem.isPending ? "Adding..." : "Add Objective"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {columns.map(col => {
          const colItems = items?.filter(i => i.status === col.id) || [];
          return (
            <div key={col.id} className="bg-cloud rounded-2xl p-4 min-h-[500px]">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-medium text-ink uppercase tracking-wider text-sm">{col.label}</h3>
                <Badge variant="secondary" className="bg-card">{colItems.length}</Badge>
              </div>
              <div className="space-y-3">
                {colItems.map(item => (
                  <Card key={item.id} className="card-monday border-none hover:shadow-xl-2 transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <h4 className="font-medium text-ink leading-tight mb-2">{item.title}</h4>
                      {item.description && <p className="text-sm text-slate line-clamp-2">{item.description}</p>}
                    </CardContent>
                  </Card>
                ))}
                {colItems.length === 0 && (
                  <div className="py-8 text-center text-slate/60 text-sm border-2 border-dashed border-mist rounded-xl">
                    Empty
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
