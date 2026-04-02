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

    const [ticketsResponse, categoriesResponse] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/support_tickets?select=*&order=last_message_at.desc&limit=500`, {
        headers: getSupabaseHeaders(),
      }),
      fetch(`${supabaseUrl}/rest/v1/support_categories?select=*`, {
        headers: getSupabaseHeaders(),
      }),
    ]);

    if (!ticketsResponse.ok || !categoriesResponse.ok) {
      return NextResponse.json({ message: "Failed to load people dataset." }, { status: 502 });
    }

    const tickets = (await ticketsResponse.json()) as {
      requester_email: string;
      requester_name: string | null;
      category_id: string | null;
      priority: string;
      last_message_at: string;
    }[];

    const categories = (await categoriesResponse.json()) as {
      id: string;
      name: string;
    }[];

    const categoryMap = new Map(categories.map((item) => [item.id, item.name]));

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
      const categoryLabel = ticket.category_id ? categoryMap.get(ticket.category_id) : null;
      const existing = peopleMap.get(key);

      if (!existing) {
        peopleMap.set(key, {
          id: key,
          name: ticket.requester_name || ticket.requester_email.split("@")[0],
          email: ticket.requester_email,
          memberType: "Customer",
          phone: "-",
          tags: [ticket.priority, categoryLabel || "General"],
          tickets: 1,
          lastSeen: ticket.last_message_at,
        });
      } else {
        existing.tickets += 1;
        if (categoryLabel && !existing.tags.includes(categoryLabel)) {
          existing.tags.push(categoryLabel);
        }
        if (!existing.tags.includes(ticket.priority)) {
          existing.tags.push(ticket.priority);
        }
        if (new Date(ticket.last_message_at).getTime() > new Date(existing.lastSeen).getTime()) {
          existing.lastSeen = ticket.last_message_at;
        }
      }
    }

    const items = [...peopleMap.values()].sort(
      (a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime(),
    );

    return NextResponse.json({ items, total: items.length });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unexpected people API error." },
      { status: 500 },
    );
  }
}
