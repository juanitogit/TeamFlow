// @ts-nocheck
import nodemailer from "nodemailer";
import { logger } from "./logger";

// Configuración SMTP estándar (el equivalente a PHPMailer en Node.js)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_PORT === "465", // true para 465, false para 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.info({ to, subject }, "Credenciales SMTP no configuradas. Simulando envío de correo.");
    return { id: "mock-email-id" };
  }

  try {
    const info = await transporter.sendMail({
      from: `"TeamFlow" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    logger.info({ to, subject, messageId: info.messageId }, "Correo enviado exitosamente");
    return info;
  } catch (err) {
    logger.error({ err, to, subject }, "Error al enviar el correo");
    return null;
  }
}
