import { NextResponse } from "next/server";

type SupportTicket = {
  id: string;
  public_id: string;
  requester_email: string;
  requester_name: string | null;
  subject: string;
  status: "open" | "in_progress" | "waiting_user" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "critical";
  created_at: string;
  last_message_at: string;
};

type SupportCategory = {
  id: string;
  slug: string;
  name: string;
};

type SupportEvent = {
  id: string;
  ticket_id: string;
  event_type: string;
  note: string | null;
  created_at: string;
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

export async function GET() {
  try {
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");

    const [ticketsResponse, categoriesResponse, eventsResponse] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/support_tickets?select=*&order=created_at.desc&limit=300`, {
        headers: getSupabaseHeaders(),
      }),
      fetch(`${supabaseUrl}/rest/v1/support_categories?select=*`, {
        headers: getSupabaseHeaders(),
      }),
      fetch(`${supabaseUrl}/rest/v1/support_ticket_events?select=*&order=created_at.desc&limit=120`, {
        headers: getSupabaseHeaders(),
      }),
    ]);

    if (!ticketsResponse.ok || !categoriesResponse.ok || !eventsResponse.ok) {
      const details = await Promise.all([
        ticketsResponse.text(),
        categoriesResponse.text(),
        eventsResponse.text(),
      ]);

      return NextResponse.json(
        { message: "Failed loading admin overview", details },
        { status: 502 },
      );
    }

    const tickets = (await ticketsResponse.json()) as (SupportTicket & { category_id: string | null })[];
    const categories = (await categoriesResponse.json()) as SupportCategory[];
    const events = (await eventsResponse.json()) as SupportEvent[];

    const categoryMap = new Map(categories.map((item) => [item.id, item]));

    const peopleMap = new Map<
      string,
      {
        id: string;
        name: string;
        email: string;
        memberType: string;
        phone: string;
        tags: string[];
        tickets: number;
        lastSeen: string;
      }
    >();

    for (const ticket of tickets) {
      const key = ticket.requester_email.toLowerCase();
      const existing = peopleMap.get(key);
      const label = categoryMap.get(ticket.category_id ?? "")?.name ?? "General";

      if (!existing) {
        peopleMap.set(key, {
          id: key,
          name: ticket.requester_name || ticket.requester_email.split("@")[0],
          email: ticket.requester_email,
          memberType: "Customer",
          phone: "-",
          tags: [label, ticket.priority],
          tickets: 1,
          lastSeen: ticket.last_message_at,
        });
      } else {
        existing.tickets += 1;
        if (!existing.tags.includes(label)) {
          existing.tags.push(label);
        }
        if (!existing.tags.includes(ticket.priority)) {
          existing.tags.push(ticket.priority);
        }
        if (new Date(ticket.last_message_at).getTime() > new Date(existing.lastSeen).getTime()) {
          existing.lastSeen = ticket.last_message_at;
        }
      }
    }

    const people = [...peopleMap.values()]
      .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
      .slice(0, 100);

    const counters = {
      totalTickets: tickets.length,
      open: tickets.filter((ticket) => ticket.status === "open").length,
      inProgress: tickets.filter((ticket) => ticket.status === "in_progress").length,
      waitingUser: tickets.filter((ticket) => ticket.status === "waiting_user").length,
      resolved: tickets.filter((ticket) => ticket.status === "resolved").length,
      critical: tickets.filter((ticket) => ticket.priority === "critical").length,
      people: people.length,
    };

    const recentTickets = tickets.slice(0, 30).map((ticket) => ({
      id: ticket.id,
      publicId: ticket.public_id,
      subject: ticket.subject,
      requester: ticket.requester_name || ticket.requester_email,
      status: ticket.status,
      priority: ticket.priority,
      updatedAt: ticket.last_message_at,
    }));

    const auditLogs = events.slice(0, 80).map((event) => ({
      id: event.id,
      action: event.event_type,
      note: event.note,
      createdAt: event.created_at,
      ticketId: event.ticket_id,
    }));

    return NextResponse.json({
      counters,
      people,
      recentTickets,
      auditLogs,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unexpected admin overview error." },
      { status: 500 },
    );
  }
}
