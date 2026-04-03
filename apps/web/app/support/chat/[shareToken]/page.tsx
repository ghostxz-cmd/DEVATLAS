"use client";

import { useEffect, useMemo, useState } from "react";

type SupportChat = {
  id: string;
  ticket_id: string;
  share_token: string;
  customer_email: string;
  customer_name: string | null;
  status: "active" | "closed";
  last_message_at: string;
};

type SupportChatMessage = {
  id: string;
  sender_type: "admin" | "customer" | "system";
  sender_email: string | null;
  message: string;
  created_at: string;
};

export default function PublicSupportChatPage({ params }: { params: { shareToken: string } }) {
  const [chat, setChat] = useState<SupportChat | null>(null);
  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chatApiUrl = useMemo(() => `/api/support/chats/${params.shareToken}`, [params.shareToken]);

  useEffect(() => {
    const loadChat = async () => {
      try {
        const response = await fetch(chatApiUrl);
        if (!response.ok) {
          throw new Error("Nu am putut încărca chat-ul.");
        }

        const payload = (await response.json()) as { chat: SupportChat; messages: SupportChatMessage[] };
        setChat(payload.chat);
        setMessages(payload.messages ?? []);
        setEmail(payload.chat.customer_email);
        setName(payload.chat.customer_name || "");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "A apărut o eroare.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadChat();
    const interval = window.setInterval(() => void loadChat(), 5000);
    return () => window.clearInterval(interval);
  }, [chatApiUrl]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    setIsSending(true);
    setError(null);

    try {
      const response = await fetch(chatApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          senderName: name,
          senderEmail: email,
          senderType: "customer",
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message || "Nu am putut trimite mesajul.");
      }

      setMessage("");
      const refreshed = await fetch(chatApiUrl);
      const payload = (await refreshed.json()) as { chat: SupportChat; messages: SupportChatMessage[] };
      setChat(payload.chat);
      setMessages(payload.messages ?? []);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "A apărut o eroare.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-10 text-[#111827]">
      <div className="mx-auto max-w-4xl rounded-2xl border border-[#dbe2ea] bg-white shadow-lg">
        <div className="border-b border-[#e5e7eb] px-6 py-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[#6b7280]">DevAtlas Support Chat</p>
          <h1 className="mt-2 text-2xl font-semibold">{chat ? `Chat ${chat.ticket_id}` : "Încărcare chat..."}</h1>
          <p className="mt-1 text-sm text-[#6b7280]">Discuție live între client și echipa de suport.</p>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-xl border border-[#e5e7eb] bg-[#fbfcfe] p-4">
            <div className="mb-4 max-h-[480px] space-y-3 overflow-auto">
              {isLoading ? (
                <p className="text-sm text-[#6b7280]">Se încarcă mesajele...</p>
              ) : (
                messages.map((entry) => (
                  <div
                    key={entry.id}
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                      entry.sender_type === "admin"
                        ? "ml-auto bg-[#e8f0fe] text-[#111827]"
                        : "bg-white text-[#111827] border border-[#e5e7eb]"
                    }`}
                  >
                    <div className="mb-1 text-[11px] uppercase tracking-[0.12em] text-[#6b7280]">
                      {entry.sender_type}
                    </div>
                    <div className="whitespace-pre-wrap">{entry.message}</div>
                  </div>
                ))
              )}
            </div>

            <div className="grid gap-3 border-t border-[#e5e7eb] pt-4">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={4}
                className="w-full rounded-xl border border-[#d1d5db] px-4 py-3 text-sm outline-none focus:border-[#2563eb]"
                placeholder="Scrie mesajul aici..."
              />
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={isSending || message.trim().length < 2}
                className="h-11 rounded-xl bg-[#2563eb] px-5 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSending ? "Se trimite..." : "Trimite mesaj"}
              </button>
            </div>
          </div>

          <aside className="rounded-xl border border-[#e5e7eb] bg-white p-4">
            <h2 className="text-lg font-semibold">Detalii</h2>
            <div className="mt-4 grid gap-3 text-sm text-[#374151]">
              <label className="grid gap-1">
                Nume
                <input value={name} onChange={(event) => setName(event.target.value)} className="h-10 rounded-lg border border-[#d1d5db] px-3" />
              </label>
              <label className="grid gap-1">
                Email
                <input value={email} onChange={(event) => setEmail(event.target.value)} className="h-10 rounded-lg border border-[#d1d5db] px-3" />
              </label>
              <div>
                <div className="text-xs uppercase tracking-[0.12em] text-[#6b7280]">Status</div>
                <div className="mt-1 font-medium">{chat?.status || "active"}</div>
              </div>
            </div>
          </aside>
        </div>

        {error && <div className="border-t border-[#f3c2c2] bg-[#fce8e6] px-6 py-3 text-sm text-[#c5221f]">{error}</div>}
      </div>
    </main>
  );
}
