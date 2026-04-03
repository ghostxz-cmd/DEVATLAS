import { NextResponse } from "next/server";
import { z } from "zod";

type SupportTicket = {
  id: string;
  public_id: string;
  requester_email: string;
};

type SupportChat = {
  id: string;
  ticket_id: string;
  share_token: string;
  customer_email: string;
  status: "active" | "closed";
};

type ChatMessage = {
  id: string;
  chat_id: string;
  sender_type: "admin" | "customer" | "system";
  sender_email: string | null;
  message: string;
  created_at: string;
};

const sendMessageSchema = z.object({
  message: z.string().min(1).max(5000),
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

async function getTicketByParam(ticketId: string): Promise<SupportTicket | null> {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");

  const response = await fetch(
    `${supabaseUrl}/rest/v1/support_tickets?select=id,public_id,requester_email&public_id=eq.${encodeURIComponent(ticketId)}&limit=1`,
    { headers: getSupabaseHeaders() },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const tickets = (await response.json()) as SupportTicket[];
  return tickets[0] ?? null;
}

async function getOrCreateChat(ticketId: string): Promise<SupportChat> {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");
  const ticket = await getTicketByParam(ticketId);

  if (!ticket) {
    throw new Error("Ticket not found.");
  }

  // Try to get existing chat
  const getResponse = await fetch(
    `${supabaseUrl}/rest/v1/support_chats?select=*&ticket_id=eq.${encodeURIComponent(ticket.id)}&limit=1`,
    { headers: getSupabaseHeaders() },
  );

  if (!getResponse.ok) {
    throw new Error(await getResponse.text());
  }

  const chats = (await getResponse.json()) as SupportChat[];
  if (chats.length > 0) {
    return chats[0];
  }

  // Create new chat if doesn't exist
  const createResponse = await fetch(`${supabaseUrl}/rest/v1/support_chats`, {
    method: "POST",
    headers: {
      ...getSupabaseHeaders(),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      ticket_id: ticket.id,
      customer_email: ticket.requester_email,
      customer_name: null,
      status: "active",
    }),
  });

  if (!createResponse.ok) {
    throw new Error(await createResponse.text());
  }

  const createdChats = (await createResponse.json()) as SupportChat[];
  return createdChats[0] ?? null;
}

async function getMessages(chatId: string): Promise<ChatMessage[]> {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");

  const response = await fetch(
    `${supabaseUrl}/rest/v1/support_chat_messages?select=*&chat_id=eq.${encodeURIComponent(chatId)}&order=created_at.asc`,
    { headers: getSupabaseHeaders() },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as ChatMessage[];
}

// GET: Fetch or create chat and get messages
export async function GET(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const { ticketId } = await params;

    const chat = await getOrCreateChat(ticketId);
    const messages = await getMessages(chat.id);

    return NextResponse.json({
      ok: true,
      chat: {
        id: chat.id,
        status: chat.status,
      },
      messages,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to fetch messages." },
      { status: 500 },
    );
  }
}

// POST: Send a new message
export async function POST(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const { ticketId } = await params;
    const body = sendMessageSchema.parse(await request.json());
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");

    const chat = await getOrCreateChat(ticketId);
    const ticket = await getTicketByParam(ticketId);

    if (!ticket || !chat) {
      return NextResponse.json({ message: "Ticket or chat not found." }, { status: 404 });
    }

    // Insert message
    const messageResponse = await fetch(`${supabaseUrl}/rest/v1/support_chat_messages`, {
      method: "POST",
      headers: {
        ...getSupabaseHeaders(),
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        chat_id: chat.id,
        sender_type: "customer",
        sender_email: ticket.requester_email,
        message: body.message,
      }),
    });

    if (!messageResponse.ok) {
      throw new Error(await messageResponse.text());
    }

    const messages = (await messageResponse.json()) as ChatMessage[];
    return NextResponse.json({
      ok: true,
      message: messages[0] ?? null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid message.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to send message." },
      { status: 500 },
    );
  }
}
