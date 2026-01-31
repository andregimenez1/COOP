const BASE_URL = process.env.BASE_FRONTEND_URL ?? 'http://localhost:8080';
const from = process.env.EMAIL_FROM ?? 'Magistral Connect <noreply@magistral.com>';

let _nodemailer: any = undefined;
let _transporter: any = undefined;

async function getNodemailer(): Promise<any | null> {
  if (_nodemailer === undefined) {
    try {
      const m = await import('nodemailer');
      _nodemailer = m.default;
    } catch {
      _nodemailer = null;
    }
  }
  return _nodemailer;
}

async function getTransporter(): Promise<any | null> {
  if (_transporter === undefined) {
    const nm = await getNodemailer();
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!nm || !host || !user || !pass) {
      _transporter = null;
    } else {
      _transporter = nm.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }
  }
  return _transporter;
}

function layout(title: string, body: string, ctaLabel: string, ctaUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f4f4f5;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.08);">
    <div style="background:linear-gradient(135deg,#0f766e 0%,#14b8a6 100%);padding:24px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:1.25rem;font-weight:600;">Magistral Connect</h1>
    </div>
    <div style="padding:32px 24px;">
      <h2 style="margin:0 0 16px;color:#18181b;font-size:1.125rem;">${title}</h2>
      <p style="margin:0 0 24px;color:#52525b;line-height:1.6;font-size:0.9375rem;">${body}</p>
      <p style="margin:0;">
        <a href="${ctaUrl}" style="display:inline-block;background:#14b8a6;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:0.9375rem;">${ctaLabel}</a>
      </p>
    </div>
    <div style="padding:16px 24px;background:#f4f4f5;text-align:center;">
      <p style="margin:0;color:#71717a;font-size:0.75rem;">Este e-mail foi enviado pela Cooperativa Magistral. Não responda.</p>
    </div>
  </div>
</body>
</html>`;
}

/** Flash Deal publicado */
export async function sendFlashDealPublished(
  to: string,
  productName: string,
  flashDealId: string
): Promise<boolean> {
  const transporter = await getTransporter();
  if (!transporter) return false;
  const url = `${BASE_URL}/estoque-inteligente#flash-deals`;
  const html = layout(
    'Novo Flash Deal disponível',
    `Um novo Flash Deal foi publicado: <strong>${productName}</strong>. Aproveite o preço especial por tempo limitado.`,
    'Ver Oportunidade',
    url
  );
  try {
    await transporter.sendMail({
      from,
      to,
      subject: `[Magistral] Novo Flash Deal: ${productName}`,
      html,
    });
    return true;
  } catch (e) {
    console.error('[EmailService] sendFlashDealPublished:', e);
    return false;
  }
}

/** Reserva Estratégica acabando (insumo que o cooperado costuma comprar) */
export async function sendReserveRunningLow(
  to: string,
  productName: string,
  remaining: number,
  unit: string
): Promise<boolean> {
  const transporter = await getTransporter();
  if (!transporter) return false;
  const url = `${BASE_URL}/estoque-inteligente#reservas`;
  const html = layout(
    'Reserva Estratégica acabando',
    `A reserva estratégica de <strong>${productName}</strong> está acabando. Restam apenas <strong>${remaining} ${unit}</strong>. Resgate sua cota antes que acabe.`,
    'Ver Oportunidade',
    url
  );
  try {
    await transporter.sendMail({
      from,
      to,
      subject: `[Magistral] Reserva acabando: ${productName}`,
      html,
    });
    return true;
  } catch (e) {
    console.error('[EmailService] sendReserveRunningLow:', e);
    return false;
  }
}

/** Crédito de Hub Logístico (aluguel de prateleira) depositado */
export async function sendHubCreditDeposited(
  to: string,
  amount: number
): Promise<boolean> {
  const transporter = await getTransporter();
  if (!transporter) return false;
  const url = `${BASE_URL}/perfil`;
  const valor = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
  const html = layout(
    'Crédito de Hub Logístico depositado',
    `Foi depositado <strong>${valor}</strong> em sua conta referente ao crédito de Hub Logístico (aluguel de prateleira).`,
    'Ver conta',
    url
  );
  try {
    await transporter.sendMail({
      from,
      to,
      subject: `[Magistral] Crédito Hub depositado: ${valor}`,
      html,
    });
    return true;
  } catch (e) {
    console.error('[EmailService] sendHubCreditDeposited:', e);
    return false;
  }
}

export function isEmailConfigured(): boolean {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  return !!(host && user && pass);
}
