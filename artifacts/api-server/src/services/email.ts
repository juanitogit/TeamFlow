/**
 * Mock Email Service
 * En un entorno real, aquí se integraría Resend, SendGrid o Nodemailer.
 */

export async function sendEmail(to: string, subject: string, body: string) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log("\n=======================================================");
  console.log(`📧 MOCK EMAIL SENT`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body:\n${body}`);
  console.log("=======================================================\n");
  
  // En producción, aquí harías:
  // const resend = new Resend('re_123456789');
  // resend.emails.send({ ... })
  return true;
}
