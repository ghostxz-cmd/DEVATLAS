import { NextResponse } from "next/server";
import { z } from "zod";

const updateSupportTicketSchema = z.object({
  status: z.enum(["open", "in_progress", "waiting_user", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "normal", "high", "critical"]).optional(),
});

type SupportCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

type SupportMessage = {
  id: string;
  ticket_id: string;
  sender_type: "user" | "admin" | "system";
  sender_user_id: string | null;
  sender_email: string | null;
  message: string;
  is_internal: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
};

type SupportEvent = {
  id: string;
  ticket_id: string;
  event_type: string;
  actor_user_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  note: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

type SupportTicketDetail = {
  id: string;
  public_id: string;
  requester_email: string;
  requester_name: string | null;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "waiting_user" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "critical";
  source: string;
  created_at: string;
  last_message_at: string;
  category_id: string | null;
  category: SupportCategory | null;
  messages: SupportMessage[];
  events: SupportEvent[];
};

type ReplyTicketBody = {
  message: string;
  status?: "open" | "in_progress" | "waiting_user" | "resolved" | "closed";
  priority?: "low" | "normal" | "high" | "critical";
  responderName?: string;
};

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

async function getTicketByParam(ticketId: string): Promise<SupportTicketDetail | null> {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");

  const ticketByPublicIdResponse = await fetch(
    `${supabaseUrl}/rest/v1/support_tickets?select=*&public_id=eq.${encodeURIComponent(ticketId)}&limit=1`,
    {
      headers: getSupabaseHeaders(),
    },
  );

  if (!ticketByPublicIdResponse.ok) {
    throw new Error(await ticketByPublicIdResponse.text());
  }

  let tickets = (await ticketByPublicIdResponse.json()) as SupportTicketDetail[];
  if (tickets.length === 0) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      ticketId,
    );

    if (isUuid) {
      const ticketByIdResponse = await fetch(
        `${supabaseUrl}/rest/v1/support_tickets?select=*&id=eq.${encodeURIComponent(ticketId)}&limit=1`,
        {
          headers: getSupabaseHeaders(),
        },
      );

      if (!ticketByIdResponse.ok) {
        throw new Error(await ticketByIdResponse.text());
      }

      tickets = (await ticketByIdResponse.json()) as SupportTicketDetail[];
    }
  }

  const ticket = tickets[0];
  if (!ticket) {
    return null;
  }

  const categoryPromise = ticket.category_id
    ? fetch(
        `${supabaseUrl}/rest/v1/support_categories?select=*&id=eq.${encodeURIComponent(ticket.category_id)}&limit=1`,
        {
          headers: getSupabaseHeaders(),
        },
      )
    : Promise.resolve(null);

  const [categoryResponse, messagesResponse, eventsResponse] = await Promise.all([
    categoryPromise,
    fetch(
      `${supabaseUrl}/rest/v1/support_messages?select=*&ticket_id=eq.${encodeURIComponent(ticket.id)}&order=created_at.asc`,
      {
        headers: getSupabaseHeaders(),
      },
    ),
    fetch(
      `${supabaseUrl}/rest/v1/support_ticket_events?select=*&ticket_id=eq.${encodeURIComponent(ticket.id)}&order=created_at.asc`,
      {
        headers: getSupabaseHeaders(),
      },
    ),
  ]);

  if (categoryResponse && !categoryResponse.ok) {
    throw new Error(await categoryResponse.text());
  }
  if (!messagesResponse.ok) {
    throw new Error(await messagesResponse.text());
  }
  if (!eventsResponse.ok) {
    throw new Error(await eventsResponse.text());
  }

  const category = categoryResponse
    ? ((await categoryResponse.json()) as SupportCategory[])[0] ?? null
    : null;
  const messages = (await messagesResponse.json()) as SupportMessage[];
  const events = (await eventsResponse.json()) as SupportEvent[];

  return {
    ...ticket,
    category,
    messages,
    events,
  };
}

export async function GET(_: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const { ticketId } = await params;
    const ticket = await getTicketByParam(ticketId);

    if (!ticket) {
      return NextResponse.json({ message: "Ticket not found." }, { status: 404 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to load ticket." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  try {
    const { ticketId } = await params;
    const body = updateSupportTicketSchema.parse(await request.json());
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const ticket = await getTicketByParam(ticketId);

    if (!ticket) {
      return NextResponse.json({ message: "Ticket not found." }, { status: 404 });
    }

    const patchPayload: Record<string, string> = {};
    if (body.status) {
      patchPayload.status = body.status;
    }
    if (body.priority) {
      patchPayload.priority = body.priority;
    }

    if (Object.keys(patchPayload).length > 0) {
      const response = await fetch(`${supabaseUrl}/rest/v1/support_tickets?id=eq.${encodeURIComponent(ticket.id)}`, {
        method: "PATCH",
        headers: {
          ...getSupabaseHeaders(),
          Prefer: "return=minimal",
        },
        body: JSON.stringify(patchPayload),
      });

      if (!response.ok) {
        return NextResponse.json({ message: await response.text() }, { status: 502 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid update payload.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to update ticket." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  try {
    const { ticketId } = await params;
    const body = (await request.json()) as ReplyTicketBody;

    if (!body.message || body.message.trim().length < 2) {
      return NextResponse.json({ message: "Reply message is required." }, { status: 400 });
    }

    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const ticket = await getTicketByParam(ticketId);

    if (!ticket) {
      return NextResponse.json({ message: "Ticket not found." }, { status: 404 });
    }

    const senderEmail = process.env.EMAIL_FROM ?? "support@devatlas.website";

    const messageResponse = await fetch(`${supabaseUrl}/rest/v1/support_messages`, {
      method: "POST",
      headers: getSupabaseHeaders(),
      body: JSON.stringify({
        ticket_id: ticket.id,
        sender_type: "admin",
        sender_email: senderEmail,
        message: body.message,
        is_internal: false,
        metadata: {
          responderName: body.responderName ?? "DevAtlas Support",
        },
      }),
    });

    if (!messageResponse.ok) {
      return NextResponse.json({ message: await messageResponse.text() }, { status: 502 });
    }

    const updatePayload: Record<string, string> = {
      status: body.status ?? "waiting_user",
    };
    if (body.priority) {
      updatePayload.priority = body.priority;
    }

    const ticketUpdateResponse = await fetch(
      `${supabaseUrl}/rest/v1/support_tickets?id=eq.${encodeURIComponent(ticket.id)}`,
      {
        method: "PATCH",
        headers: {
          ...getSupabaseHeaders(),
          Prefer: "return=minimal",
        },
        body: JSON.stringify(updatePayload),
      },
    );

    if (!ticketUpdateResponse.ok) {
      return NextResponse.json({ message: await ticketUpdateResponse.text() }, { status: 502 });
    }

    const apiKey = getRequiredEnv("RESEND_API_KEY");
    const from = process.env.EMAIL_FROM ?? senderEmail;
    const replyTo = process.env.EMAIL_REPLY_TO ?? from;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [ticket.requester_email],
        subject: `Răspuns la ticketul ${ticket.public_id}`,
        reply_to: replyTo,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
            <h2 style="margin: 0 0 16px;">Ai primit un răspuns</h2>
            <p>Salut${ticket.requester_name ? `, ${ticket.requester_name}` : ""},</p>
            <p>Adminul a răspuns la ticketul <strong>${ticket.public_id}</strong>.</p>
            <p><strong>Subiect:</strong> ${ticket.subject}</p>
            <div style="margin: 24px 0; padding: 16px; border-left: 4px solid #0ea5e9; background: #f8fafc; white-space: pre-wrap;">
              ${body.message}
            </div>
            <p>Poți răspunde direct din dashboard dacă mai ai nevoie de ajutor.</p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      return NextResponse.json({ message: await emailResponse.text() }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid reply payload.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to save reply." },
      { status: 500 },
    );
  }
}
