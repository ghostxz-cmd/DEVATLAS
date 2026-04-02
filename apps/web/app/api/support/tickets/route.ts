import { NextResponse } from "next/server";
import { z } from "zod";

const createSupportTicketSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email().max(320),
  category: z.enum(["technical", "billing", "account", "course", "other"]),
  priority: z.enum(["low", "normal", "high", "critical"]),
  subject: z.string().min(3).max(180),
  details: z.string().min(10).max(5000),
  source: z.string().max(200).optional(),
});

type SupabaseTicketResponse = {
  ticket_id: string;
  ticket_public_id: string;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function sendConfirmationEmail(input: {
  to: string;
  requesterName: string;
  ticketPublicId: string;
  subject: string;
}) {
  const apiKey = getRequiredEnv("RESEND_API_KEY");
  const from = process.env.EMAIL_FROM ?? "support@devatlas.website";
  const replyTo = process.env.EMAIL_REPLY_TO ?? from;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: `Ticket confirmat: ${input.ticketPublicId}`,
      reply_to: replyTo,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2 style="margin: 0 0 16px;">Ticket confirmat</h2>
          <p>Salut, ${escapeHtml(input.requesterName)},</p>
          <p>Am primit solicitarea ta și am creat ticketul <strong>${escapeHtml(input.ticketPublicId)}</strong>.</p>
          <p><strong>Subiect:</strong> ${escapeHtml(input.subject)}</p>
          <p>Te vom contacta din dashboard-ul de suport imediat ce un admin preia cazul.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend confirmation email failed: ${errorText}`);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsedBody = createSupportTicketSchema.parse(body);
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

    const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/support_create_ticket_public`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        p_requester_email: parsedBody.email,
        p_requester_name: parsedBody.fullName,
        p_category_slug: parsedBody.category,
        p_subject: parsedBody.subject,
        p_description: parsedBody.details,
        p_metadata: {
          priority: parsedBody.priority,
          source: parsedBody.source ?? "contact_page",
        },
      }),
    });

    if (!rpcResponse.ok) {
      const errorText = await rpcResponse.text();
      return NextResponse.json(
        { message: `Supabase ticket RPC failed: ${errorText}` },
        { status: 502 },
      );
    }

    const rawData = (await rpcResponse.json()) as SupabaseTicketResponse[] | SupabaseTicketResponse;
    const result = Array.isArray(rawData) ? rawData[0] : rawData;

    if (!result?.ticket_id || !result?.ticket_public_id) {
      return NextResponse.json(
        { message: "Supabase ticket RPC returned an invalid response payload." },
        { status: 502 },
      );
    }

    await sendConfirmationEmail({
      to: parsedBody.email,
      requesterName: parsedBody.fullName,
      ticketPublicId: result.ticket_public_id,
      subject: parsedBody.subject,
    });

    return NextResponse.json({
      ticketId: result.ticket_id,
      ticketPublicId: result.ticket_public_id,
      message: "Ticket created successfully.",
      confirmationEmailSent: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid ticket payload.", issues: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "A apărut o eroare la trimitere.",
      },
      { status: 500 },
    );
  }
}
