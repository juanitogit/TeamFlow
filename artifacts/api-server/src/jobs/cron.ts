import cron from "node-cron";
import { db, workspaceTasksTable, usersTable, workspacesTable } from "@workspace/db";
import { eq, and, isNull, lt, ne } from "drizzle-orm";
import { sendEmail } from "../services/email";

export function initCronJobs() {
  console.log("Inicializando tareas en segundo plano (Cron)...");

  // Se ejecuta cada minuto
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // 1. Verificar tareas próximas a vencer (menos de 24h)
      const tasksToWarn = await db.select({
        task: workspaceTasksTable,
        user: usersTable,
        workspace: workspacesTable
      })
      .from(workspaceTasksTable)
      .innerJoin(usersTable, eq(workspaceTasksTable.assignedTo, usersTable.id))
      .innerJoin(workspacesTable, eq(workspaceTasksTable.workspaceId, workspacesTable.id))
      .where(
        and(
          ne(workspaceTasksTable.status, "completada"),
          ne(workspaceTasksTable.status, "vencida"),
          isNull(workspaceTasksTable.warningEmailSentAt),
          lt(workspaceTasksTable.dueDate, next24h)
        )
      );

      for (const row of tasksToWarn) {
        if (!row.task.dueDate || row.task.dueDate < now) continue;

        console.log(`Enviando advertencia a ${row.user.email} por tarea ${row.task.title}`);
        
        await db.update(workspaceTasksTable)
          .set({ warningEmailSentAt: now })
          .where(eq(workspaceTasksTable.id, row.task.id));

        const html = `
          <h2>Aviso de Vencimiento de Tarea</h2>
          <p>Hola ${row.user.name},</p>
          <p>Tu tarea <strong>"${row.task.title}"</strong> en el workspace <strong>${row.workspace.name}</strong> está próxima a vencer.</p>
          <p>Tienes menos de 24 horas para completarla. Recuerda que no completarla a tiempo reducirá tus puntos de salud.</p>
        `;

        await sendEmail(row.user.email, `⚠️ Tu tarea está a punto de vencer: ${row.task.title}`, "Aviso de tarea", html);
      }

      // 2. Verificar tareas vencidas
      const expiredTasks = await db.select({
        task: workspaceTasksTable,
        user: usersTable,
        workspace: workspacesTable
      })
      .from(workspaceTasksTable)
      .innerJoin(usersTable, eq(workspaceTasksTable.assignedTo, usersTable.id))
      .innerJoin(workspacesTable, eq(workspaceTasksTable.workspaceId, workspacesTable.id))
      .where(
        and(
          ne(workspaceTasksTable.status, "completada"),
          ne(workspaceTasksTable.status, "vencida"),
          isNull(workspaceTasksTable.penaltyAppliedAt),
          lt(workspaceTasksTable.dueDate, now)
        )
      );

      for (const row of expiredTasks) {
        if (!row.task.dueDate) continue;

        console.log(`Aplicando penalidad a ${row.user.email} por tarea vencida ${row.task.title}`);

        const newHealthPoints = Math.max(0, row.user.healthPoints - 10);

        await db.update(usersTable)
          .set({ healthPoints: newHealthPoints })
          .where(eq(usersTable.id, row.user.id));

        await db.update(workspaceTasksTable)
          .set({ status: "vencida", penaltyAppliedAt: now })
          .where(eq(workspaceTasksTable.id, row.task.id));

        const html = `
          <h2>Tarea Vencida - Penalización</h2>
          <p>Hola ${row.user.name},</p>
          <p>Tu tarea <strong>"${row.task.title}"</strong> en el workspace <strong>${row.workspace.name}</strong> ha vencido.</p>
          <p style="color: red; font-weight: bold;">Se han reducido 10 Puntos de Salud de tu perfil.</p>
          <p>Intenta organizar mejor tu tiempo y comunicarte con tu líder si necesitas ayuda.</p>
        `;

        await sendEmail(row.user.email, `❌ Tarea vencida: ${row.task.title} - Penalización aplicada`, "Tarea vencida", html);
      }

    } catch (error) {
      console.error("Error ejecutando cron jobs:", error);
    }
  });
}
