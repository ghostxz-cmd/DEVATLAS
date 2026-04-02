/**
 * Email template generators for DevAtlas support system
 * All templates return HTML string ready to send via Resend/Email service
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

const LOGO_URL = "https://devatlas.website/logos/devatlas-logo.png";
const BRAND_COLOR = "#4f46e5";
const BRAND_COLOR_DARK = "#3730a3";

function generateBase(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, ${BRAND_COLOR} 0%, ${BRAND_COLOR_DARK} 100%);
      padding: 30px 20px;
      text-align: center;
      color: white;
    }
    .header img {
      height: 40px;
      margin-bottom: 10px;
    }
    .header h1 {
      font-size: 24px;
      font-weight: 600;
      margin: 10px 0 0 0;
    }
    .body {
      padding: 30px 20px;
    }
    .section {
      margin-bottom: 25px;
    }
    .section h2 {
      font-size: 16px;
      color: ${BRAND_COLOR};
      margin-bottom: 10px;
      font-weight: 600;
    }
    .info-box {
      background-color: #f8f8f8;
      border-left: 4px solid ${BRAND_COLOR};
      padding: 15px;
      margin: 15px 0;
      border-radius: 4px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin: 8px 0;
      font-size: 14px;
    }
    .info-label {
      font-weight: 600;
      color: #666;
    }
    .info-value {
      color: #333;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin-right: 8px;
    }
    .badge-status-open {
      background-color: #fef3c7;
      color: #92400e;
    }
    .badge-status-in_progress {
      background-color: #dbeafe;
      color: #0c4a6e;
    }
    .badge-status-waiting_user {
      background-color: #fee2e2;
      color: #7f1d1d;
    }
    .badge-status-resolved {
      background-color: #d1fae5;
      color: #065f46;
    }
    .badge-status-closed {
      background-color: #e5e7eb;
      color: #374151;
    }
    .badge-priority-low {
      background-color: #d1fae5;
      color: #065f46;
    }
    .badge-priority-normal {
      background-color: #dbeafe;
      color: #0c4a6e;
    }
    .badge-priority-high {
      background-color: #fef3c7;
      color: #92400e;
    }
    .badge-priority-critical {
      background-color: #fee2e2;
      color: #7f1d1d;
    }
    .cta-button {
      display: inline-block;
      background-color: ${BRAND_COLOR};
      color: white;
      padding: 12px 30px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      margin: 15px 0;
      transition: background-color 0.3s;
    }
    .cta-button:hover {
      background-color: ${BRAND_COLOR_DARK};
    }
    .message-content {
      background-color: #fafafa;
      padding: 15px;
      border-radius: 6px;
      border: 1px solid #e0e0e0;
      font-size: 14px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-wrap: break-word;
      color: #333;
    }
    .footer {
      background-color: #f8f8f8;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #999;
      border-top: 1px solid #e0e0e0;
    }
    .footer p {
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    ${content}
  </div>
</body>
</html>
  `;
}

export function generateTicketClaimedEmail(context: EmailTemplateContext): string {
  const { ticketId, customerName, subject, status, priority, adminName, viewTicketUrl } = context;

  const content = `
    <div class="header">
      <h1>🎫 Ticket-ul tău a fost preluat</h1>
    </div>
    <div class="body">
      <p>Salut ${customerName},</p>
      
      <p>Te informez că ticket-ul tău a fost preluat de echipa noastră de suport și este acum în procesare activă.</p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Ticket ID:</span>
          <span class="info-value"><strong>${ticketId}</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">Subiect:</span>
          <span class="info-value">${subject}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Status:</span>
          <span class="info-value">
            <span class="badge badge-status-${status}">${status.replace("_", " ")}</span>
          </span>
        </div>
        <div class="info-row">
          <span class="info-label">Prioritate:</span>
          <span class="info-value">
            <span class="badge badge-priority-${priority}">${priority}</span>
          </span>
        </div>
        ${adminName ? `<div class="info-row"><span class="info-label">Agent:</span><span class="info-value">${adminName}</span></div>` : ""}
      </div>

      <div class="section">
        <h2>📝 Status updat</h2>
        <p>Ticket-ul tău este acum în stare <strong>"In Progress"</strong>. Membrul echipei noastre analizează detaliile și lucrează la o soluție.</p>
        <p>Vei primi o notificare imediat ce va exista un răspuns din partea noastră.</p>
      </div>

      <div class="section" style="text-align: center;">
        <a href="${viewTicketUrl || "https://devatlas.website"}" class="cta-button">Vizualizează Ticket-ul</a>
      </div>

      <div class="section">
        <h2>❓ Ceva întrebări?</h2>
        <p>Răspunde direct la acest email sau accesează panoul de suport pentru a vedea toate comunicațiile referitoare la ticket-ul tău.</p>
      </div>
    </div>
    <div class="footer">
      <p><strong>DevAtlas Support Team</strong></p>
      <p>support@devatlas.website | www.devatlas.website</p>
      <p>© 2026 DevAtlas. Toate drepturile rezervate.</p>
    </div>
  `;

  return generateBase("Ticket Preluat - DevAtlas Support", content);
}

export function generateTicketClosedEmail(context: EmailTemplateContext): string {
  const { ticketId, customerName, subject, message, adminName, viewTicketUrl } = context;

  const content = `
    <div class="header">
      <h1>✅ Ticket-ul tău a fost rezolvat</h1>
    </div>
    <div class="body">
      <p>Salut ${customerName},</p>
      
      <p>Suntem bucuroși să te informez că ticket-ul tău a fost rezolvat și închis.</p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Ticket ID:</span>
          <span class="info-value"><strong>${ticketId}</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">Subiect:</span>
          <span class="info-value">${subject}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Status:</span>
          <span class="info-value">
            <span class="badge badge-status-closed">Closed</span>
          </span>
        </div>
        ${adminName ? `<div class="info-row"><span class="info-label">Rezolvat de:</span><span class="info-value">${adminName}</span></div>` : ""}
      </div>

      ${
        message
          ? `
        <div class="section">
          <h2>💬 Mesaj final din suport:</h2>
          <div class="message-content">${message}</div>
        </div>
      `
          : ""
      }

      <div class="section">
        <h2>🙌 Mulțumim!</h2>
        <p>Apreciem că ai apelat la echipa DevAtlas Support. Feedback-ul tău este important pentru noi.</p>
      </div>

      <div class="section" style="text-align: center;">
        <a href="${viewTicketUrl || "https://devatlas.website"}" class="cta-button">Vezi Detaliile Ticket-ului</a>
      </div>

      <div class="section">
        <h2>❓ Ai nevoie de ajutor din nou?</h2>
        <p>Dacă problema revine sau ai alte vorbe despre ticket-ul rezolvat, poți răspunde la acest email și vom redeschide ticket-ul.</p>
      </div>
    </div>
    <div class="footer">
      <p><strong>DevAtlas Support Team</strong></p>
      <p>support@devatlas.website | www.devatlas.website</p>
      <p>© 2026 DevAtlas. Toate drepturile rezervate.</p>
    </div>
  `;

  return generateBase("Ticket Rezolvat - DevAtlas Support", content);
}

export function generateReplyNotificationEmail(context: EmailTemplateContext): string {
  const { ticketId, customerName, subject, message, adminName, viewTicketUrl } = context;

  const content = `
    <div class="header">
      <h1>💬 Răspuns nou la ticket-ul tău</h1>
    </div>
    <div class="body">
      <p>Salut ${customerName},</p>
      
      <p>Echipa DevAtlas a adăugat un răspuns la ticket-ul tău.</p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Ticket ID:</span>
          <span class="info-value"><strong>${ticketId}</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">Subiect:</span>
          <span class="info-value">${subject}</span>
        </div>
        ${adminName ? `<div class="info-row"><span class="info-label">De la:</span><span class="info-value">${adminName}</span></div>` : ""}
      </div>

      ${
        message
          ? `
        <div class="section">
          <h2>📝 Mesaj:</h2>
          <div class="message-content">${message}</div>
        </div>
      `
          : ""
      }

      <div class="section" style="text-align: center;">
        <a href="${viewTicketUrl || "https://devatlas.website"}" class="cta-button">Vizualizează Răspunsul Complet</a>
      </div>

      <div class="section">
        <p>Răspunde direct la acest email pentru a continua conversația.</p>
      </div>
    </div>
    <div class="footer">
      <p><strong>DevAtlas Support Team</strong></p>
      <p>support@devatlas.website | www.devatlas.website</p>
      <p>© 2026 DevAtlas. Toate drepturile rezervate.</p>
    </div>
  `;

  return generateBase("Răspuns Nou - DevAtlas Support", content);
}
