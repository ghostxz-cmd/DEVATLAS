/**
 * Email template generators for DevAtlas support system.
 * Styled to match the website hero: dark surfaces, cyan/blue accents, bold CTA.
 */

type EmailTemplateContext = {
  ticketId: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  status: string;
  priority: string;
  message?: string;
  adminName?: string;
  viewTicketUrl?: string;
};

type StudentVerificationEmailContext = {
  fullName: string;
  email: string;
  verificationCode: string;
  expiresInMinutes: number;
  verifyUrl?: string;
};

type StudentPasswordResetEmailContext = {
  fullName: string;
  email: string;
  resetCode: string;
  expiresInMinutes: number;
  resetUrl?: string;
};

const LOGO_URL = "https://devatlas.website/logos/negru.fara.bg.png";
const WEBSITE_URL = "https://devatlas.website";

const COLOR = {
  bg: "#050816",
  panel: "#0b1024",
  card: "#0f172f",
  border: "#1f2a4d",
  text: "#e6edf5",
  muted: "#a9b6d1",
  white: "#ffffff",
  blue: "#1d4ed8",
  cyan: "#22d3ee",
  cyanDark: "#06b6d4",
};

function prettyStatus(status: string): string {
  return status.replace(/_/g, " ");
}

function getStatusStyle(status: string): string {
  switch (status) {
    case "open":
      return "background:#1e293b;color:#93c5fd;border:1px solid #334155;";
    case "in_progress":
      return "background:#0f2b53;color:#7dd3fc;border:1px solid #1d4ed8;";
    case "waiting_user":
      return "background:#3f1a1a;color:#fca5a5;border:1px solid #7f1d1d;";
    case "resolved":
      return "background:#0b3b2c;color:#86efac;border:1px solid #166534;";
    case "closed":
      return "background:#1f2937;color:#d1d5db;border:1px solid #374151;";
    default:
      return "background:#1e293b;color:#cbd5e1;border:1px solid #334155;";
  }
}

function getPriorityStyle(priority: string): string {
  switch (priority) {
    case "low":
      return "background:#0b3b2c;color:#86efac;border:1px solid #166534;";
    case "normal":
      return "background:#0f2b53;color:#7dd3fc;border:1px solid #1d4ed8;";
    case "high":
      return "background:#3a2d0d;color:#fde68a;border:1px solid #854d0e;";
    case "critical":
      return "background:#3f1a1a;color:#fca5a5;border:1px solid #7f1d1d;";
    default:
      return "background:#1e293b;color:#cbd5e1;border:1px solid #334155;";
  }
}

function buildHeader(title: string): string {
  return `
    <div class="hero-wrap">
      <div class="hero-cyan"></div>
      <div class="hero-blue"></div>
      <div class="hero-content">
        <img src="${LOGO_URL}" alt="DevAtlas" class="logo" />
        <p class="eyebrow">DEVATLAS SUPPORT</p>
        <h1>${title}</h1>
      </div>
    </div>
  `;
}

function buildTicketInfo(context: EmailTemplateContext): string {
  const { ticketId, subject, status, priority, adminName } = context;

  return `
    <div class="info-card">
      <div class="info-row"><span class="label">Ticket ID</span><span class="value"><strong>${ticketId}</strong></span></div>
      <div class="info-row"><span class="label">Subiect</span><span class="value">${subject}</span></div>
      <div class="info-row"><span class="label">Status</span><span class="value"><span class="chip" style="${getStatusStyle(status)}">${prettyStatus(status)}</span></span></div>
      <div class="info-row"><span class="label">Prioritate</span><span class="value"><span class="chip" style="${getPriorityStyle(priority)}">${priority}</span></span></div>
      ${adminName ? `<div class="info-row"><span class="label">Agent</span><span class="value">${adminName}</span></div>` : ""}
    </div>
  `;
}

function generateBase(title: string, bodyContent: string): string {
  return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 24px 12px;
      background: ${COLOR.bg};
      color: ${COLOR.text};
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
    }
    .container {
      max-width: 640px;
      margin: 0 auto;
      border: 1px solid ${COLOR.border};
      border-radius: 20px;
      overflow: hidden;
      background: linear-gradient(180deg, ${COLOR.panel} 0%, ${COLOR.bg} 100%);
      box-shadow: 0 14px 50px rgba(0, 0, 0, 0.4);
    }
    .hero-wrap {
      position: relative;
      overflow: hidden;
      border-bottom: 1px solid ${COLOR.border};
      background: #05070f;
      padding: 24px;
    }
    .hero-cyan {
      position: absolute;
      right: -100px;
      top: -70px;
      width: 300px;
      height: 180px;
      background: linear-gradient(135deg, ${COLOR.cyan} 0%, ${COLOR.cyanDark} 100%);
      opacity: 0.25;
      border-radius: 20px;
      transform: rotate(-10deg);
    }
    .hero-blue {
      position: absolute;
      right: 40px;
      bottom: -80px;
      width: 220px;
      height: 150px;
      background: ${COLOR.blue};
      opacity: 0.2;
      border-radius: 20px;
      transform: rotate(-10deg);
    }
    .hero-content {
      position: relative;
      z-index: 2;
    }
    .logo {
      max-width: 190px;
      height: auto;
      margin-bottom: 12px;
      display: block;
    }
    .eyebrow {
      margin: 0 0 6px 0;
      font-size: 11px;
      letter-spacing: 0.16em;
      font-weight: 700;
      color: ${COLOR.cyan};
    }
    h1 {
      margin: 0;
      font-size: 28px;
      line-height: 1.15;
      color: ${COLOR.white};
    }
    .body {
      padding: 24px;
    }
    p {
      margin: 0 0 14px 0;
      color: ${COLOR.text};
      font-size: 15px;
    }
    .section-title {
      margin: 20px 0 10px 0;
      color: ${COLOR.cyan};
      font-size: 15px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .info-card {
      background: ${COLOR.card};
      border: 1px solid ${COLOR.border};
      border-radius: 14px;
      padding: 14px;
      margin: 18px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      margin: 8px 0;
      font-size: 14px;
      align-items: center;
    }
    .label {
      color: ${COLOR.muted};
      font-weight: 600;
      min-width: 90px;
    }
    .value {
      color: ${COLOR.white};
      text-align: right;
    }
    .chip {
      display: inline-block;
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .message-content {
      background: #0b142b;
      border: 1px solid ${COLOR.border};
      border-radius: 12px;
      padding: 14px;
      color: ${COLOR.text};
      font-size: 14px;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .verification-code {
      margin: 16px 0;
      padding: 18px 20px;
      border-radius: 16px;
      border: 1px solid ${COLOR.border};
      background: linear-gradient(180deg, #101c37 0%, #0b142b 100%);
      color: ${COLOR.white};
      font-size: 30px;
      font-weight: 800;
      letter-spacing: 0.28em;
      text-align: center;
    }
    .verification-note {
      margin-top: 10px;
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid ${COLOR.border};
      background: #081225;
      color: ${COLOR.muted};
      font-size: 13px;
    }
    .cta-wrap {
      text-align: center;
      margin: 24px 0 10px 0;
    }
    .cta-button {
      display: inline-block;
      text-decoration: none;
      background: linear-gradient(90deg, ${COLOR.blue} 0%, ${COLOR.cyan} 100%);
      color: #001020;
      font-weight: 800;
      border-radius: 999px;
      padding: 12px 24px;
      font-size: 14px;
      letter-spacing: 0.02em;
    }
    .footer {
      padding: 18px 24px 24px;
      border-top: 1px solid ${COLOR.border};
      background: #05070f;
      text-align: center;
    }
    .footer p {
      margin: 4px 0;
      font-size: 12px;
      color: ${COLOR.muted};
    }
    .footer strong {
      color: ${COLOR.white};
    }
    @media (max-width: 640px) {
      .body,
      .hero-wrap,
      .footer {
        padding: 18px;
      }
      h1 {
        font-size: 24px;
      }
      .info-row {
        flex-direction: column;
        align-items: flex-start;
      }
      .value {
        text-align: left;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    ${bodyContent}
  </div>
</body>
</html>
  `;
}

export function generateTicketConfirmationEmail(context: {
  requesterName: string;
  ticketPublicId: string;
  subject: string;
  viewTicketUrl?: string;
}): string {
  const { requesterName, ticketPublicId, subject, viewTicketUrl } = context;

  const content = `
    ${buildHeader("Ticket confirmat")}
    <div class="body">
      <p>Salut ${requesterName},</p>
      <p>Am primit solicitarea ta și am creat cu succes ticket-ul de suport.</p>

      <div class="info-card">
        <div class="info-row"><span class="label">Ticket ID</span><span class="value"><strong>${ticketPublicId}</strong></span></div>
        <div class="info-row"><span class="label">Subiect</span><span class="value">${subject}</span></div>
        <div class="info-row"><span class="label">Status</span><span class="value"><span class="chip" style="${getStatusStyle("open")}">open</span></span></div>
      </div>

      <p class="section-title">Ce urmează</p>
      <p>Echipa DevAtlas va analiza cazul și te va contacta direct din dashboard-ul de suport imediat ce ticket-ul este preluat.</p>

      <div class="cta-wrap">
        <a href="${viewTicketUrl || WEBSITE_URL}" class="cta-button">Vezi detaliile ticketului</a>
      </div>
    </div>
    <div class="footer">
      <p><strong>DevAtlas Support Team</strong></p>
      <p>support@devatlas.website • www.devatlas.website</p>
      <p>© 2026 DevAtlas. Toate drepturile rezervate.</p>
    </div>
  `;

  return generateBase("Ticket confirmat - DevAtlas", content);
}

export function generateTicketClaimedEmail(context: EmailTemplateContext): string {
  const { customerName, viewTicketUrl } = context;

  const content = `
    ${buildHeader("Ticket preluat de echipa DevAtlas")}
    <div class="body">
      <p>Salut ${customerName},</p>
      <p>Ticket-ul tău a fost preluat și este acum în flux activ de analiză. Lucrăm deja la soluție.</p>

      ${buildTicketInfo(context)}

      <p class="section-title">Ce urmează</p>
      <p>Primești automat update-uri pe email la fiecare răspuns sau schimbare importantă de status.</p>

      <div class="cta-wrap">
        <a href="${viewTicketUrl || WEBSITE_URL}" class="cta-button">Vizualizează ticket-ul</a>
      </div>
    </div>
    <div class="footer">
      <p><strong>DevAtlas Support Team</strong></p>
      <p>support@devatlas.website • www.devatlas.website</p>
      <p>© 2026 DevAtlas. Toate drepturile rezervate.</p>
    </div>
  `;

  return generateBase("Ticket preluat - DevAtlas", content);
}

export function generateTicketClosedEmail(context: EmailTemplateContext): string {
  const { customerName, message, viewTicketUrl } = context;

  const content = `
    ${buildHeader("Ticket rezolvat si inchis")}
    <div class="body">
      <p>Salut ${customerName},</p>
      <p>Am finalizat solicitarea ta. Ticket-ul a fost marcat ca închis.</p>

      ${buildTicketInfo({ ...context, status: "closed" })}

      ${
        message
          ? `
        <p class="section-title">Mesaj final din suport</p>
        <div class="message-content">${message}</div>
      `
          : ""
      }

      <div class="cta-wrap">
        <a href="${viewTicketUrl || WEBSITE_URL}" class="cta-button">Vezi detaliile ticket-ului</a>
      </div>
    </div>
    <div class="footer">
      <p><strong>DevAtlas Support Team</strong></p>
      <p>support@devatlas.website • www.devatlas.website</p>
      <p>© 2026 DevAtlas. Toate drepturile rezervate.</p>
    </div>
  `;

  return generateBase("Ticket inchis - DevAtlas", content);
}

export function generateReplyNotificationEmail(context: EmailTemplateContext): string {
  const { customerName, message, viewTicketUrl } = context;

  const content = `
    ${buildHeader("Raspuns nou la ticket-ul tau")}
    <div class="body">
      <p>Salut ${customerName},</p>
      <p>Echipa DevAtlas a adăugat un răspuns nou pe solicitarea ta.</p>

      ${buildTicketInfo(context)}

      ${
        message
          ? `
        <p class="section-title">Mesaj primit</p>
        <div class="message-content">${message}</div>
      `
          : ""
      }

      <div class="cta-wrap">
        <a href="${viewTicketUrl || WEBSITE_URL}" class="cta-button">Deschide conversatia</a>
      </div>
    </div>
    <div class="footer">
      <p><strong>DevAtlas Support Team</strong></p>
      <p>support@devatlas.website • www.devatlas.website</p>
      <p>© 2026 DevAtlas. Toate drepturile rezervate.</p>
    </div>
  `;

  return generateBase("Raspuns nou - DevAtlas", content);
}

export function generateStudentVerificationEmail(context: StudentVerificationEmailContext): string {
  const { fullName, email, verificationCode, expiresInMinutes, verifyUrl } = context;

  const content = `
    ${buildHeader("Verificare cont elev")}
    <div class="body">
      <p>Salut ${fullName},</p>
      <p>Am primit cererea de creare cont pentru adresa ${email}. Folosește codul de mai jos pentru a confirma că acest email îți aparține.</p>

      <div class="info-card">
        <div class="info-row"><span class="label">Email</span><span class="value">${email}</span></div>
        <div class="info-row"><span class="label">Stare</span><span class="value"><span class="chip" style="${getStatusStyle("in_progress")}">în verificare</span></span></div>
        <div class="info-row"><span class="label">Expiră</span><span class="value">în ${expiresInMinutes} minute</span></div>
      </div>

      <p class="section-title">Codul tău</p>
      <div class="verification-code">${verificationCode}</div>
      <div class="verification-note">Dacă nu ai cerut acest cont, poți ignora mesajul. Codul este valabil o singură dată și expiră automat.</div>

      <p class="section-title">Ce urmează</p>
      <p>După ce introduci codul în formular, contul va fi creat și vei putea intra în platformă imediat.</p>

      <div class="cta-wrap">
        <a href="${verifyUrl || WEBSITE_URL}" class="cta-button">Continuă verificarea</a>
      </div>
    </div>
    <div class="footer">
      <p><strong>DevAtlas Team</strong></p>
      <p>support@devatlas.website • www.devatlas.website</p>
      <p>© 2026 DevAtlas. Toate drepturile rezervate.</p>
    </div>
  `;

  return generateBase("Cod verificare cont - DevAtlas", content);
}

export function generateStudentPasswordResetEmail(context: StudentPasswordResetEmailContext): string {
  const { fullName, email, resetCode, expiresInMinutes, resetUrl } = context;

  const content = `
    ${buildHeader("Resetare parolă elev")}
    <div class="body">
      <p>Salut ${fullName},</p>
      <p>Am primit o solicitare de resetare parolă pentru contul ${email}. Introdu codul de mai jos pentru a seta o parolă nouă.</p>

      <div class="info-card">
        <div class="info-row"><span class="label">Email</span><span class="value">${email}</span></div>
        <div class="info-row"><span class="label">Tip cerere</span><span class="value"><span class="chip" style="${getStatusStyle("in_progress")}">resetare parolă</span></span></div>
        <div class="info-row"><span class="label">Expiră</span><span class="value">în ${expiresInMinutes} minute</span></div>
      </div>

      <p class="section-title">Cod resetare</p>
      <div class="verification-code">${resetCode}</div>
      <div class="verification-note">Dacă nu ai cerut resetarea parolei, ignoră acest email. Codul este valabil o singură dată.</div>

      <div class="cta-wrap">
        <a href="${resetUrl || WEBSITE_URL}" class="cta-button">Setează parola nouă</a>
      </div>
    </div>
    <div class="footer">
      <p><strong>DevAtlas Team</strong></p>
      <p>support@devatlas.website • www.devatlas.website</p>
      <p>© 2026 DevAtlas. Toate drepturile rezervate.</p>
    </div>
  `;

  return generateBase("Resetare parolă - DevAtlas", content);
}

export function generateStudentPinResetEmail(context: {
  fullName: string;
  email: string;
  resetCode: string;
  expiresInMinutes: number;
}) {
  const { fullName, email, resetCode, expiresInMinutes } = context;

  const content = `
    ${buildHeader("Resetare PIN")}
    <div class="body">
      <p>Salut ${fullName},</p>
      <p>Am primit o solicitare de resetare PIN pentru contul ${email}. Introdu codul de mai jos în pagina Contul meu ca să setezi un PIN nou.</p>

      <div class="info-card">
        <div class="info-row"><span class="label">Email</span><span class="value">${email}</span></div>
        <div class="info-row"><span class="label">Tip cerere</span><span class="value"><span class="chip" style="${getStatusStyle("in_progress")}">resetare PIN</span></span></div>
        <div class="info-row"><span class="label">Expiră</span><span class="value">în ${expiresInMinutes} minute</span></div>
      </div>

      <p class="section-title">Cod resetare PIN</p>
      <div class="verification-code">${resetCode}</div>
      <div class="verification-note">Dacă nu ai cerut resetarea PIN-ului, ignoră acest email. Codul este valabil o singură dată.</div>

      <p>După validare, vei putea seta un PIN nou fără PIN-ul vechi.</p>
    </div>
    <div class="footer">
      <p><strong>DevAtlas Team</strong></p>
      <p>support@devatlas.website • www.devatlas.website</p>
      <p>© 2026 DevAtlas. Toate drepturile rezervate.</p>
    </div>
  `;

  return generateBase("Resetare PIN - DevAtlas", content);
}

export function generateChatInviteEmail(context: EmailTemplateContext): string {
  const { customerName, viewTicketUrl } = context;

  const content = `
    ${buildHeader("Chat live disponibil pentru ticket")}
    <div class="body">
      <p>Salut ${customerName},</p>
      <p>Am deschis un canal de chat live pentru solicitarea ta. Poți conversa direct cu echipa de suport din browser.</p>

      ${buildTicketInfo({ ...context, status: "in_progress" })}

      <p class="section-title">Acces rapid</p>
      <p>Intră din butonul de mai jos. Dacă ai imagini relevante, le poți trimite direct în conversație.</p>

      <div class="cta-wrap">
        <a href="${viewTicketUrl || WEBSITE_URL}" class="cta-button">Deschide chat-ul</a>
      </div>
    </div>
    <div class="footer">
      <p><strong>DevAtlas Support Team</strong></p>
      <p>support@devatlas.website • www.devatlas.website</p>
      <p>© 2026 DevAtlas. Toate drepturile rezervate.</p>
    </div>
  `;

  return generateBase("Chat suport - DevAtlas", content);
}
