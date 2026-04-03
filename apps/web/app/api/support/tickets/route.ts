import { NextResponse } from "next/server";
import { z } from "zod";
import { generateTicketConfirmationEmail } from "@/lib/email-templates";
import { getAppBaseUrl } from "@/lib/app-base-url";

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

type SupportCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

type SupportTicket = {
  id: string;
  public_id: string;
  requester_email: string;
  requester_name: string | null;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "waiting_user" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "critical";
  created_at: string;
  last_message_at: string;
  category_id: string | null;
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

function getSupabaseHeaders() {
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  return {
    "Content-Type": "application/json",
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };
}

export async function GET(request: Request) {
  try {
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search")?.trim().toLowerCase() ?? "";
    const status = searchParams.get("status")?.trim().toLowerCase() ?? "";
    const priority = searchParams.get("priority")?.trim().toLowerCase() ?? "";
    const category = searchParams.get("category")?.trim().toLowerCase() ?? "";

    const [ticketsResponse, categoriesResponse] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/support_tickets?select=*&order=created_at.desc`, {
        headers: getSupabaseHeaders(),
      }),
      fetch(`${supabaseUrl}/rest/v1/support_categories?select=*`, {
        headers: getSupabaseHeaders(),
      }),
    ]);

    if (!ticketsResponse.ok) {
      return NextResponse.json({ message: await ticketsResponse.text() }, { status: 502 });
    }

    if (!categoriesResponse.ok) {
      return NextResponse.json({ message: await categoriesResponse.text() }, { status: 502 });
    }

    const tickets = (await ticketsResponse.json()) as SupportTicket[];
    const categories = (await categoriesResponse.json()) as SupportCategory[];
    const categoryMap = new Map(categories.map((item) => [item.id, item]));

    const items = tickets
      .map((ticket) => ({
        ...ticket,
        category: ticket.category_id ? categoryMap.get(ticket.category_id) ?? null : null,
      }))
      .filter((ticket) => {
        const matchesSearch =
          !search ||
          [ticket.public_id, ticket.subject, ticket.requester_email, ticket.requester_name]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(search));
        const matchesStatus = !status || ticket.status === status;
        const matchesPriority = !priority || ticket.priority === priority;
        const matchesCategory =
          !category ||
          ticket.category?.slug === category ||
          ticket.category?.name?.toLowerCase().includes(category);

        return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
      });

    return NextResponse.json({ items, total: items.length });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to load support tickets." },
      { status: 500 },
    );
  }
}

async function sendConfirmationEmail(input: {
  to: string;
  requesterName: string;
  ticketPublicId: string;
  subject: string;
  viewTicketUrl?: string;
}) {
  const apiKey = getRequiredEnv("RESEND_API_KEY");
  const from = process.env.EMAIL_FROM ?? "support@devatlas.website";
  const replyTo = process.env.EMAIL_REPLY_TO ?? from;
  const html = generateTicketConfirmationEmail({
    requesterName: input.requesterName,
    ticketPublicId: input.ticketPublicId,
    subject: input.subject,
    viewTicketUrl: input.viewTicketUrl,
  });

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
      html,
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
      viewTicketUrl: `${getAppBaseUrl(request)}/support/tickets/${result.ticket_public_id}`,
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
