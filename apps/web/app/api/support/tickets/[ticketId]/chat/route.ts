import { NextResponse } from "next/server";
import { z } from "zod";
import { generateChatInviteEmail } from "@/lib/email-templates";
import { getAppBaseUrl } from "@/lib/app-base-url";

type SupportTicket = {
  id: string;
  public_id: string;
  requester_email: string;
  requester_name: string | null;
  subject: string;
  status: string;
};

type SupportChat = {
  id: string;
  ticket_id: string;
  share_token: string;
  customer_email: string;
  customer_name: string | null;
  created_by_admin_user_id: string | null;
  assigned_admin_user_id: string | null;
  status: "active" | "closed";
  last_message_at: string;
  created_at: string;
  updated_at: string;
};

const createChatSchema = z.object({
  adminName: z.string().optional(),
  adminUserId: z.string().uuid().optional(),
});

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getSupabaseHeaders() {
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  return {
    "Content-Type": "application/json",
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };
}

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = getRequiredEnv("RESEND_API_KEY");
  const from = process.env.EMAIL_FROM ?? "support@devatlas.website";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

async function getTicketByParam(ticketId: string): Promise<SupportTicket | null> {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");

  const response = await fetch(
    `${supabaseUrl}/rest/v1/support_tickets?select=id,public_id,requester_email,requester_name,subject,status&public_id=eq.${encodeURIComponent(ticketId)}&limit=1`,
    { headers: getSupabaseHeaders() },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const tickets = (await response.json()) as SupportTicket[];
  return tickets[0] ?? null;
}

async function getExistingChat(ticketId: string): Promise<SupportChat | null> {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");
  const response = await fetch(
    `${supabaseUrl}/rest/v1/support_chats?select=*&ticket_id=eq.${encodeURIComponent(ticketId)}&order=created_at.desc&limit=1`,
    { headers: getSupabaseHeaders() },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const chats = (await response.json()) as SupportChat[];
  return chats[0] ?? null;
}

export async function POST(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const { ticketId } = await params;
    const body = createChatSchema.parse(await request.json().catch(() => ({})));
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");

    const ticket = await getTicketByParam(ticketId);
    if (!ticket) {
      return NextResponse.json({ message: "Ticket not found." }, { status: 404 });
    }

    let chat = await getExistingChat(ticket.id);
    if (!chat) {
      const createResponse = await fetch(`${supabaseUrl}/rest/v1/support_chats`, {
        method: "POST",
        headers: {
          ...getSupabaseHeaders(),
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          ticket_id: ticket.id,
          customer_email: ticket.requester_email,
          customer_name: ticket.requester_name,
          created_by_admin_user_id: body.adminUserId ?? null,
          assigned_admin_user_id: body.adminUserId ?? null,
          status: "active",
        }),
      });

      if (!createResponse.ok) {
        return NextResponse.json({ message: await createResponse.text() }, { status: 502 });
      }

      const createdChats = (await createResponse.json()) as SupportChat[];
      chat = createdChats[0] ?? null;
    }

    if (!chat) {
      return NextResponse.json({ message: "Could not create chat." }, { status: 500 });
    }

    const shareUrl = `${getAppBaseUrl(request)}/support/chat/${chat.share_token}`;
    const inviteHtml = generateChatInviteEmail({
      ticketId: ticket.public_id,
      customerName: ticket.requester_name || ticket.requester_email,
      customerEmail: ticket.requester_email,
      subject: ticket.subject,
      status: "active",
      priority: "normal",
      adminName: body.adminName || "DevAtlas Support",
      viewTicketUrl: shareUrl,
    });

    await sendEmail(
      ticket.requester_email,
      `Chat suport pentru ticketul ${ticket.public_id}`,
      inviteHtml,
    );

    return NextResponse.json({
      ok: true,
      chat: {
        id: chat.id,
        shareToken: chat.share_token,
        shareUrl,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid chat payload.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to create chat." },
      { status: 500 },
    );
  }
}
