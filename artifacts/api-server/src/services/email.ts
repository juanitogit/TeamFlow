import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_PORT === "465", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(to: string, subject: string, body: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    // Fallback: console.log si no hay credenciales SMTP
    console.log("\n=======================================================");
    console.log(`📧 EMAIL MOCK (Configura credenciales SMTP para correo real)`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${body}`);
    console.log("=======================================================\n");
    return true;
  }

  try {
    const info = await transporter.sendMail({
      from: `"TeamFlow" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text: body,
    });
    console.log(`[Email] Correo enviado a ${to} usando Nodemailer. ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[Email] Error enviando correo a ${to} con Nodemailer:`, error);
    return false;
  }
}
