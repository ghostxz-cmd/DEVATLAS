import { NextResponse } from "next/server";
import { z } from "zod";

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

type SupportChatMessage = {
  id: string;
  chat_id: string;
  sender_type: "admin" | "customer" | "system";
  sender_user_id: string | null;
  sender_email: string | null;
  message: string;
  attachments: unknown[];
  is_internal: boolean;
  created_at: string;
};

const postMessageSchema = z.object({
  message: z.string().min(2),
  senderName: z.string().optional(),
  senderEmail: z.string().email().optional(),
  senderType: z.enum(["admin", "customer"]).optional().default("customer"),
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

async function getChatByShareToken(shareToken: string): Promise<SupportChat | null> {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");
  const response = await fetch(
    `${supabaseUrl}/rest/v1/support_chats?select=*&share_token=eq.${encodeURIComponent(shareToken)}&limit=1`,
    { headers: getSupabaseHeaders() },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const chats = (await response.json()) as SupportChat[];
  return chats[0] ?? null;
}

async function getChatMessages(chatId: string): Promise<SupportChatMessage[]> {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");
  const response = await fetch(
    `${supabaseUrl}/rest/v1/support_chat_messages?select=*&chat_id=eq.${encodeURIComponent(chatId)}&order=created_at.asc`,
    { headers: getSupabaseHeaders() },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as SupportChatMessage[];
}

export async function GET(_: Request, { params }: { params: Promise<{ shareToken: string }> }) {
  try {
    const { shareToken } = await params;
    const chat = await getChatByShareToken(shareToken);

    if (!chat) {
      return NextResponse.json({ message: "Chat not found." }, { status: 404 });
    }

    const messages = await getChatMessages(chat.id);
    return NextResponse.json({ chat, messages });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to load chat." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ shareToken: string }> }) {
  try {
    const { shareToken } = await params;
    const body = postMessageSchema.parse(await request.json());
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");

    const chat = await getChatByShareToken(shareToken);
    if (!chat) {
      return NextResponse.json({ message: "Chat not found." }, { status: 404 });
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/support_chat_messages`, {
      method: "POST",
      headers: {
        ...getSupabaseHeaders(),
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        chat_id: chat.id,
        sender_type: body.senderType,
        sender_email: body.senderEmail ?? chat.customer_email,
        message: body.message,
        attachments: [],
        is_internal: false,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ message: await response.text() }, { status: 502 });
    }

    const messages = (await response.json()) as SupportChatMessage[];
    return NextResponse.json({ ok: true, message: messages[0] ?? null });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid message payload.", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to save message." },
      { status: 500 },
    );
  }
}
