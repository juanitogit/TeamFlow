import nodemailer from "nodemailer";
import fs from "node:fs";
import path from "node:path";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Get the app URL for links
function getAppUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://team-flow-seven.vercel.app";
}

function emailLayout(content: string): string {
  const appUrl = getAppUrl();
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f5f6f8;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f6f8;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 2px 48px rgba(205,208,223,0.4);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#2f72ce 0%,#4b8eeb 100%);padding:32px 40px;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="display:inline-block;vertical-align:middle;margin-right:12px;">
                <tr>
                  <td align="center" valign="middle" bgcolor="#ffffff" style="width:40px;height:40px;border-radius:50%;background-color:#ffffff;text-align:center;vertical-align:middle;">
                    <img src="cid:logo" alt="TeamFlow Logo" width="28" height="28" style="display:block;margin:0 auto;border:0;outline:none;" />
                  </td>
                </tr>
              </table>
              <span style="display:inline-block;vertical-align:middle;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">TeamFlow</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:1px solid #d0d4e4;padding-top:24px;text-align:center;">
                    <p style="margin:0 0 8px;font-size:13px;color:#808080;">
                      Este correo fue enviado automáticamente por TeamFlow.
                    </p>
                    <p style="margin:0;font-size:13px;color:#808080;">
                      <a href="${appUrl}" style="color:#2f72ce;text-decoration:none;font-weight:500;">Ir a la plataforma</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <!-- Below card -->
        <p style="margin-top:24px;font-size:12px;color:#808080;text-align:center;">
          © ${new Date().getFullYear()} TeamFlow Inc. Todos los derechos reservados.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function badge(text: string, color: string = "#2f72ce"): string {
  return `<span style="display:inline-block;padding:4px 14px;background-color:${color}15;color:${color};border-radius:160px;font-size:13px;font-weight:600;border:1px solid ${color}30;">${text}</span>`;
}

function button(text: string, url: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
    <tr>
      <td style="background-color:#2f72ce;border-radius:160px;padding:14px 32px;">
        <a href="${url}" style="color:#ffffff;text-decoration:none;font-size:16px;font-weight:500;display:inline-block;">${text}</a>
      </td>
    </tr>
  </table>`;
}

// ─── Email Templates ────────────────────────────────────────

export function welcomeEmail(userName: string, isGitHub: boolean = false): { subject: string; html: string } {
  const appUrl = getAppUrl();
  const method = isGitHub ? "tu cuenta de GitHub" : "correo electrónico";
  const content = `
    <h1 style="margin:0 0 8px;font-size:28px;font-weight:300;color:#333333;letter-spacing:-0.5px;">¡Bienvenido, ${userName}!</h1>
    <p style="margin:0 0 24px;font-size:16px;color:#535768;line-height:1.6;">
      Te has registrado exitosamente en <strong style="color:#333333;">TeamFlow</strong> usando ${method}.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:#e7f1ff;border-radius:16px;padding:20px 24px;">
          <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#2f72ce;">¿Qué puedes hacer ahora?</p>
          <table cellpadding="0" cellspacing="0">
            <tr><td style="padding:4px 0;font-size:14px;color:#535768;">✦ Crear o unirte a un workspace de equipo</td></tr>
            <tr><td style="padding:4px 0;font-size:14px;color:#535768;">✦ Conectar tus repositorios de GitHub</td></tr>
            <tr><td style="padding:4px 0;font-size:14px;color:#535768;">✦ Rastrear aportes y rendimiento en tiempo real</td></tr>
          </table>
        </td>
      </tr>
    </table>

    ${button("Ir a TeamFlow", appUrl + "/dashboard")}
  `;
  return { subject: "¡Bienvenido a TeamFlow!", html: emailLayout(content) };
}

export function joinedWorkspaceEmail(userName: string, workspaceName: string): { subject: string; html: string } {
  const appUrl = getAppUrl();
  const content = `
    <h1 style="margin:0 0 8px;font-size:28px;font-weight:300;color:#333333;letter-spacing:-0.5px;">¡Te uniste a un equipo!</h1>
    <p style="margin:0 0 24px;font-size:16px;color:#535768;line-height:1.6;">
      Hola <strong style="color:#333333;">${userName}</strong>, te has unido exitosamente al workspace:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:#bcfe9020;border:1px solid #bcfe9060;border-radius:16px;padding:20px 24px;text-align:center;">
          <p style="margin:0;font-size:24px;font-weight:600;color:#333333;">${workspaceName}</p>
          <p style="margin:6px 0 0;font-size:14px;color:#535768;">Workspace activo</p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-size:15px;color:#535768;line-height:1.6;">
      Ya puedes ver las tareas asignadas, registrar aportes y consultar el rendimiento de tu equipo.
    </p>

    ${button("Ver mi Workspace", appUrl + "/dashboard")}
  `;
  return { subject: `Te uniste al workspace "${workspaceName}"`, html: emailLayout(content) };
}

export function taskAssignedEmail(userName: string, taskTitle: string, taskType: string, dueDate?: string): { subject: string; html: string } {
  const appUrl = getAppUrl();
  const typeLabels: Record<string, string> = { programacion: "Programación", documentacion: "Documentación", investigacion: "Investigación" };
  const typeColors: Record<string, string> = { programacion: "#2f72ce", documentacion: "#4b8eeb", investigacion: "#3ac9ff" };

  const content = `
    <h1 style="margin:0 0 8px;font-size:28px;font-weight:300;color:#333333;letter-spacing:-0.5px;">Nueva tarea asignada</h1>
    <p style="margin:0 0 24px;font-size:16px;color:#535768;line-height:1.6;">
      Hola <strong style="color:#333333;">${userName}</strong>, se te ha asignado una nueva tarea:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:#ffffff;border:1px solid #d0d4e4;border-radius:16px;padding:24px;">
          <p style="margin:0 0 12px;font-size:20px;font-weight:600;color:#333333;">${taskTitle}</p>
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-right:12px;">${badge(typeLabels[taskType] || taskType, typeColors[taskType] || "#2f72ce")}</td>
              ${dueDate ? `<td>${badge("📅 " + new Date(dueDate).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }), "#e98dfe")}</td>` : ""}
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${button("Ver mis Tareas", appUrl + "/tasks")}
  `;
  return { subject: `Nueva tarea: "${taskTitle}"`, html: emailLayout(content) };
}

export function taskCompletedEmail(leaderName: string, memberName: string, taskTitle: string, commitSha?: string): { subject: string; html: string } {
  const appUrl = getAppUrl();
  const content = `
    <h1 style="margin:0 0 8px;font-size:28px;font-weight:300;color:#333333;letter-spacing:-0.5px;">Tarea completada</h1>
    <p style="margin:0 0 24px;font-size:16px;color:#535768;line-height:1.6;">
      Hola <strong style="color:#333333;">${leaderName}</strong>, un miembro de tu equipo ha completado una tarea:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:#bcfe9020;border:1px solid #bcfe9060;border-radius:16px;padding:24px;">
          <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#333333;">${taskTitle}</p>
          <p style="margin:0 0 12px;font-size:15px;color:#535768;">Completada por <strong>${memberName}</strong></p>
          ${commitSha ? `<p style="margin:0;font-size:13px;color:#808080;font-family:monospace;background:#f5f6f8;padding:6px 12px;border-radius:6px;display:inline-block;">SHA: ${commitSha}</p>` : ""}
        </td>
      </tr>
    </table>

    ${button("Revisar en TeamFlow", appUrl + "/tasks")}
  `;
  return { subject: `${memberName} completó: "${taskTitle}"`, html: emailLayout(content) };
}

export function roleChangedEmail(userName: string, newRole: string, workspaceName: string): { subject: string; html: string } {
  const appUrl = getAppUrl();
  const roleLabels: Record<string, string> = { leader: "Líder", "co-leader": "Co-Líder", member: "Miembro" };
  const roleColors: Record<string, string> = { leader: "#2f72ce", "co-leader": "#4b8eeb", member: "#3ac9ff" };

  const content = `
    <h1 style="margin:0 0 8px;font-size:28px;font-weight:300;color:#333333;letter-spacing:-0.5px;">Tu rol ha cambiado</h1>
    <p style="margin:0 0 24px;font-size:16px;color:#535768;line-height:1.6;">
      Hola <strong style="color:#333333;">${userName}</strong>, tu rol en el workspace <strong>"${workspaceName}"</strong> ha sido actualizado:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="text-align:center;padding:24px;background-color:#e7f1ff;border-radius:16px;">
          <p style="margin:0 0 12px;font-size:14px;color:#535768;">Tu nuevo rol es:</p>
          <p style="margin:0;font-size:32px;font-weight:600;color:${roleColors[newRole] || "#2f72ce"};">${roleLabels[newRole] || newRole}</p>
        </td>
      </tr>
    </table>

    ${button("Ir a mi Workspace", appUrl + "/dashboard")}
  `;
  return { subject: `Nuevo rol: ${roleLabels[newRole] || newRole} en "${workspaceName}"`, html: emailLayout(content) };
}

export function memberRemovedEmail(userName: string, workspaceName: string): { subject: string; html: string } {
  const content = `
    <h1 style="margin:0 0 8px;font-size:28px;font-weight:300;color:#333333;letter-spacing:-0.5px;">Has sido removido</h1>
    <p style="margin:0 0 24px;font-size:16px;color:#535768;line-height:1.6;">
      Hola <strong style="color:#333333;">${userName}</strong>, te informamos que has sido removido del workspace:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="text-align:center;padding:20px 24px;background-color:#fcd0f830;border:1px solid #fcd0f860;border-radius:16px;">
          <p style="margin:0;font-size:20px;font-weight:600;color:#333333;">${workspaceName}</p>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:15px;color:#535768;line-height:1.6;">
      Si crees que esto fue un error, contacta al líder del equipo.
    </p>
  `;
  return { subject: `Fuiste removido del workspace "${workspaceName}"`, html: emailLayout(content) };
}

// ─── Main Send Function ─────────────────────────────────────
export async function sendEmail(to: string, subject: string, body: string, html?: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log("\n=======================================================");
    console.log(`📧 EMAIL MOCK (Configura credenciales SMTP para correo real)`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log("=======================================================\n");
    return true;
  }

  let attachments: any[] = [];
  let processedHtml = html;

  try {
    const logoPath = path.resolve(__dirname, "../../teamflow/public/logo.png");
    if (fs.existsSync(logoPath)) {
      attachments.push({
        filename: "logo.png",
        path: logoPath,
        cid: "logo",
      });
    } else {
      console.warn(`[Email] Logo no encontrado en la ruta local: ${logoPath}. Usando URL pública.`);
      if (processedHtml) {
        processedHtml = processedHtml.replace("cid:logo", `${getAppUrl()}/logo.png`);
      }
    }
  } catch (err) {
    console.error("[Email] Error al procesar el adjunto del logo:", err);
    if (processedHtml) {
      processedHtml = processedHtml.replace("cid:logo", `${getAppUrl()}/logo.png`);
    }
  }

  try {
    const info = await transporter.sendMail({
      from: `"TeamFlow" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text: body,
      html: processedHtml || undefined,
      attachments,
    });
    console.log(`[Email] Correo enviado a ${to}. ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[Email] Error enviando correo a ${to}:`, error);
    return false;
  }
}
