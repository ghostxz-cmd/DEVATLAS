import { NextResponse } from "next/server";

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

export async function GET() {
  try {
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");

    const [eventsResponse, ticketsResponse] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/support_ticket_events?select=*&order=created_at.desc&limit=250`, {
        headers: getSupabaseHeaders(),
      }),
      fetch(`${supabaseUrl}/rest/v1/support_tickets?select=id,public_id,subject&limit=500`, {
        headers: getSupabaseHeaders(),
      }),
    ]);

    if (!eventsResponse.ok || !ticketsResponse.ok) {
      return NextResponse.json({ message: "Failed to load audit logs." }, { status: 502 });
    }

    const events = (await eventsResponse.json()) as {
      id: string;
      ticket_id: string;
      event_type: string;
      note: string | null;
      created_at: string;
    }[];

    const tickets = (await ticketsResponse.json()) as {
      id: string;
      public_id: string;
      subject: string;
    }[];

    const ticketMap = new Map(tickets.map((ticket) => [ticket.id, ticket]));

    const items = events.map((event) => {
      const ticket = ticketMap.get(event.ticket_id);
      return {
        id: event.id,
        action: event.event_type,
        note: event.note,
        createdAt: event.created_at,
        ticketPublicId: ticket?.public_id ?? event.ticket_id,
        ticketSubject: ticket?.subject ?? "Unknown ticket",
      };
    });

    return NextResponse.json({ items, total: items.length });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unexpected audit log error." },
      { status: 500 },
    );
  }
}
