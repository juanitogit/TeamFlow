import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

export async function sendEmail(to: string, subject: string, body: string) {
  if (resend) {
    try {
      const data = await resend.emails.send({
        from: `TeamFlow <${fromEmail}>`,
        to,
        subject,
        text: body, // For plain text. Alternatively, use 'html'
      });
      console.log(`[Email] Correo enviado a ${to} a través de Resend. ID: ${data.data?.id}`);
      return true;
    } catch (error) {
      console.error(`[Email] Error enviando correo a ${to} con Resend:`, error);
      // Fallback a console.log si falla
    }
  }

  // Fallback: console.log si no hay llave o falló Resend
  console.log("\n=======================================================");
  console.log(`📧 EMAIL MOCK (Configura RESEND_API_KEY para enviar correo real)`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body:\n${body}`);
  console.log("=======================================================\n");
  
  return true;
}
