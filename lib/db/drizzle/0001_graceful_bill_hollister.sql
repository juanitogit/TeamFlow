CREATE TYPE "public"."sprint_status" AS ENUM('planificacion', 'activo', 'completado');--> statement-breakpoint
CREATE TYPE "public"."log_type" AS ENUM('reunion', 'documentacion', 'revision', 'soporte', 'otro');--> statement-breakpoint
CREATE TYPE "public"."suggestion_status" AS ENUM('pending', 'accepted', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."suggestion_type" AS ENUM('pr_merged', 'task_overdue', 'member_inactive');--> statement-breakpoint
ALTER TYPE "public"."ws_task_status" ADD VALUE 'en_revision' BEFORE 'completada';--> statement-breakpoint
CREATE TABLE "sprints" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"name" text NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"status" "sprint_status" DEFAULT 'planificacion' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manual_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"description" text NOT NULL,
	"hours" numeric(5, 2) NOT NULL,
	"type" "log_type" DEFAULT 'otro' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"type" "suggestion_type" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"data" jsonb,
	"status" "suggestion_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "workspace_tasks" ADD COLUMN "sprint_id" integer;--> statement-breakpoint
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_logs" ADD CONSTRAINT "manual_logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_logs" ADD CONSTRAINT "manual_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;