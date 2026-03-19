import { env } from '$env/dynamic/private';

/**
 * Send invoice email to client via Brevo transactional API.
 * @param to - recipient email address
 * @param toName - recipient name
 * @param invoiceNumber - e.g. "wmw-2026-2"
 * @param publicUrl - full URL to public invoice page
 * @param ownerName - sender display name
 */
export async function sendInvoiceEmail(
  to: string,
  toName: string,
  invoiceNumber: string,
  publicUrl: string,
  ownerName: string
): Promise<void> {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: ownerName, email: env.BREVO_SENDER_EMAIL },
      to: [{ email: to, name: toName }],
      bcc: [{ email: env.BREVO_SENDER_EMAIL, name: ownerName }],
      subject: `Invoice ${invoiceNumber} from ${ownerName}`,
      htmlContent: `
        <p>Hi ${toName},</p>
        <p>Please find your invoice <strong>${invoiceNumber}</strong> at the link below.</p>
        <p><a href="${publicUrl}">${publicUrl}</a></p>
        <p>${ownerName}</p>
      `
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo send failed: ${err}`);
  }
}
