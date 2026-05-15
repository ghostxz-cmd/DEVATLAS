"use client";

import { useEffect, useMemo, useState } from "react";

type Participant = {
  id: string;
  name: string;
  detail?: string;
  status: "online" | "away" | "offline";
};

type ChatChannel = "general" | "announcements" | "qa" | "students-only";

type ChatMessage = {
  id: string;
  channel: ChatChannel;
  authorName: string;
  authorRole: "profesor" | "elev" | "asistent" | "sistem";
  text: string;
  createdAt: string;
  pinned: boolean;
  reactions: {
    like: number;
    fire: number;
  };
};

type Conversation = {
  id: string;
  label: string;
  channel: ChatChannel;
  icon: string;
  description: string;
  canWrite: boolean;
  visible: boolean;
  type: "group" | "direct";
  participantCount?: number;
};

type CourseGroupChatPanelProps = {
  courseId: string;
  courseTitle: string;
  currentUserName: string;
  currentUserRole: "profesor" | "elev";
  participants: Participant[];
  isLight: boolean;
  accentBase: string;
  accessToken?: string | null;
};

function buildConversations(role: "profesor" | "elev", participantCount: number): Conversation[] {
  const conversations: Conversation[] = [
    {
      id: "announcements",
      label: "📢 Anunțuri curs",
      channel: "announcements",
      icon: "📢",
      description: "Anunțuri importante ale profesorului",
      canWrite: role === "profesor",
      visible: true,
      type: "group",
      participantCount,
    },
    {
      id: "general",
      label: "💬 Chat curs",
      channel: "general",
      icon: "💬",
      description: "Discuție generală cu profesor și colegi",
      canWrite: true,
      visible: true,
      type: "group",
      participantCount,
    },
  ];

  if (role === "elev") {
    conversations.push({
      id: "students-only",
      label: "👥 Doar elevi",
      channel: "students-only",
      icon: "👥",
      description: "Chat privat între elevi (fără profesor)",
      canWrite: true,
      visible: true,
      type: "group",
      participantCount,
    });
  }

  return conversations;
}

function relativeTime(value: string) {
  const then = new Date(value).getTime();
  const diff = Date.now() - then;

  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "acum";
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}z`;
  return new Date(value).toLocaleDateString("ro-RO", { day: "2-digit", month: "short" });
}

export default function CourseGroupChatPanel({
  courseId,
  courseTitle,
  currentUserName,
  currentUserRole,
  participants,
  isLight,
  accentBase,
  accessToken,
}: CourseGroupChatPanelProps) {
  const conversations = useMemo(() => buildConversations(currentUserRole, participants.length), [currentUserRole, participants.length]);
  
  const [activeConversationId, setActiveConversationId] = useState<string>("general");
  const [activeChannel, setActiveChannel] = useState<ChatChannel>("general");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveParticipants, setLiveParticipants] = useState<Participant[]>(participants);

  const currentConversation = useMemo(
    () => conversations.find((conv) => conv.id === activeConversationId),
    [activeConversationId, conversations],
  );

  const handleSelectConversation = (conversationId: string) => {
    const conv = conversations.find((c) => c.id === conversationId);
    if (conv) {
      setActiveConversationId(conversationId);
      setActiveChannel(conv.channel);
      setQuery("");
      setDraft("");
      setError(null);
    }
  };

  const getHeaders = () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    return headers;
  };

  const fetchChat = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetch(`/api/courses/${courseId}/group-chat`, {
        method: "GET",
        credentials: "include",
        headers: accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
            }
          : undefined,
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            message?: string;
            messages?: ChatMessage[];
            participants?: Participant[];
          }
        | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Nu am putut incarca grup chat-ul.");
      }

      setMessages(payload?.messages ?? []);
      setLiveParticipants(payload?.participants ?? participants);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Nu am putut incarca grup chat-ul.");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void fetchChat();
  }, [courseId, accessToken]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void fetchChat(true);
    }, 10000);

    return () => window.clearInterval(id);
  }, [courseId, accessToken]);

  const channelMessages = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = messages
      .filter((message) => message.channel === activeChannel)
      .filter((message) => {
        if (!needle) {
          return true;
        }
        return (
          message.text.toLowerCase().includes(needle) ||
          message.authorName.toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return filtered;
  }, [activeChannel, messages, query]);

  const pinnedMessages = useMemo(
    () => messages.filter((message) => message.channel === activeChannel && message.pinned).slice(-2),
    [activeChannel, messages],
  );

  const togglePin = (id: string) => {
    void (async () => {
      try {
        const response = await fetch(`/api/courses/${courseId}/group-chat`, {
          method: "PATCH",
          credentials: "include",
          headers: getHeaders(),
          body: JSON.stringify({ messageId: id, action: "toggle_pin" }),
        });

        const payload = (await response.json().catch(() => null)) as { message?: string | ChatMessage } | null;
        if (!response.ok) {
          throw new Error(typeof payload?.message === "string" ? payload.message : "Nu am putut pin-ui mesajul.");
        }

        const updatedMessage = typeof payload?.message === "string" ? null : payload?.message;
        if (updatedMessage) {
          setMessages((previous) => previous.map((item) => (item.id === updatedMessage.id ? updatedMessage : item)));
        }
      } catch (pinError) {
        setError(pinError instanceof Error ? pinError.message : "Nu am putut pin-ui mesajul.");
      }
    })();
  };

  const react = (id: string, type: "like" | "fire") => {
    setMessages((previous) =>
      previous.map((message) =>
        message.id === id
          ? {
              ...message,
              reactions: {
                ...message.reactions,
                [type]: message.reactions[type] + 1,
              },
            }
          : message,
      ),
    );
  };

  const sendMessage = async () => {
    if (!currentConversation?.canWrite) {
      setError("Nu poți scrie mesaje pe acest canal.");
      return;
    }

    const text = draft.trim();
    if (!text) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await fetch(`/api/courses/${courseId}/group-chat`, {
        method: "POST",
        credentials: "include",
        headers: getHeaders(),
        body: JSON.stringify({ channel: activeChannel, text }),
      });

      const payload = (await response.json().catch(() => null)) as { message?: string | ChatMessage } | null;
      if (!response.ok) {
        throw new Error(typeof payload?.message === "string" ? payload.message : "Nu am putut trimite mesajul.");
      }

      const postedMessage = payload?.message;
      if (postedMessage && typeof postedMessage !== "string") {
        setMessages((previous) => [...previous, postedMessage]);
      }
      setDraft("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Nu am putut trimite mesajul.");
    } finally {
      setSending(false);
    }
  };

  const panelSurface = isLight ? "border-slate-200 bg-white" : "border-cyan-400/20 bg-black";
  const panelSurfaceSoft = isLight ? "border-slate-200 bg-slate-50" : "border-cyan-400/20 bg-[#060a12]";
  const textPrimary = isLight ? "text-slate-900" : "text-slate-100";
  const textMuted = isLight ? "text-slate-500" : "text-slate-400";

  return (
    <div className={`grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)_260px] h-[600px]`}>
      <aside className={`rounded-2xl border overflow-hidden flex flex-col ${panelSurface}`}>
        <div className={`border-b px-3 py-3 ${isLight ? "border-slate-200" : "border-cyan-400/20"}`}>
          <p className={`text-xs uppercase tracking-[0.14em] ${textMuted}`}>Conversații</p>
          <h3 className={`mt-1 text-sm font-bold ${textPrimary}`}>{courseTitle}</h3>
        </div>

        <div className="flex-1 overflow-auto space-y-1 p-2">
          {conversations
            .filter((conv) => conv.visible)
            .map((conv) => {
              const active = activeConversationId === conv.id;
              const lastMessage = messages
                .filter((m) => m.channel === conv.channel)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                    active
                      ? "text-black"
                      : isLight
                        ? "border-slate-200 bg-white hover:bg-slate-50"
                        : "border-cyan-400/20 bg-[#070b14] hover:border-cyan-400/40"
                  }`}
                  style={active ? { background: accentBase, borderColor: accentBase } : undefined}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm font-semibold ${active ? "text-black" : textPrimary}`}>{conv.label}</p>
                      <p className={`mt-0.5 truncate text-xs ${active ? "text-black/70" : textMuted}`}>
                        {lastMessage ? lastMessage.text : "Niciun mesaj"}
                      </p>
                    </div>
                    {!conv.canWrite && <span className={`text-xs font-bold ${active ? "text-black" : textMuted}`}>🔒</span>}
                  </div>
                </button>
              );
            })}
        </div>
      </aside>

      <article className={`rounded-2xl border overflow-hidden flex flex-col ${panelSurface}`}>
        {currentConversation ? (
          <>
            <div className={`flex items-center justify-between border-b px-4 py-3 ${isLight ? "border-slate-200" : "border-cyan-400/20"}`}>
              <div>
                <p className={`text-xs uppercase tracking-[0.14em] ${textMuted}`}>{currentConversation.label}</p>
                <p className={`text-sm font-semibold ${textPrimary}`}>
                  {loading ? "Sincronizare..." : `${channelMessages.length} mesaje`}
                </p>
              </div>
              <p className={`hidden text-xs sm:block ${textMuted} max-w-[250px]`}>{currentConversation.description}</p>
            </div>

            {error && (
              <div className="mx-4 mt-3 rounded-xl border border-rose-300/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {error}
              </div>
            )}

            <div className="flex-1 overflow-auto space-y-3 px-4 py-3">
              {loading ? <p className={`text-sm ${textMuted}`}>Se sincronizeaza chat-ul...</p> : null}
              {channelMessages.map((message, idx) => {
                const mine = message.authorName === currentUserName;
                const prevMessage = idx > 0 ? channelMessages[idx - 1] : null;
                const sameAuthor = prevMessage && prevMessage.authorName === message.authorName;
                const sameDay =
                  prevMessage &&
                  new Date(prevMessage.createdAt).toLocaleDateString() === new Date(message.createdAt).toLocaleDateString();

                return (
                  <div key={message.id}>
                    {!sameDay && (
                      <div className="flex items-center justify-center py-2">
                        <div className={`text-xs ${textMuted}`}>{new Date(message.createdAt).toLocaleDateString("ro-RO")}</div>
                      </div>
                    )}

                    <div className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[82%] sm:max-w-[65%]`}>
                        {!mine && !sameAuthor && (
                          <p className={`mb-1 text-xs font-semibold ${textMuted}`}>{message.authorName}</p>
                        )}
                        <div
                          className={`rounded-2xl px-3 py-2 ${
                            mine
                              ? isLight
                                ? "bg-emerald-500 text-white"
                                : "bg-emerald-600 text-white"
                              : isLight
                                ? "border border-slate-200 bg-slate-100 text-slate-900"
                                : "border border-slate-600 bg-slate-800 text-slate-100"
                          }`}
                        >
                          <p className="break-words text-sm leading-snug">{message.text}</p>
                        </div>
                        <div className={`mt-1 flex items-center ${mine ? "justify-end" : "justify-start"} gap-2 text-[11px] ${textMuted}`}>
                          <span>{relativeTime(message.createdAt)}</span>
                          {mine && <span>✓✓</span>}
                        </div>
                        <div className={`mt-2 flex items-center ${mine ? "justify-end" : "justify-start"} gap-1`}>
                          {message.reactions.like > 0 && (
                            <button
                              type="button"
                              onClick={() => react(message.id, "like")}
                              className={`rounded-full px-2 py-0.5 text-xs ${
                                isLight ? "bg-slate-100 text-slate-700" : "bg-slate-700 text-slate-300"
                              } transition hover:opacity-80`}
                            >
                              👍 {message.reactions.like}
                            </button>
                          )}
                          {message.reactions.fire > 0 && (
                            <button
                              type="button"
                              onClick={() => react(message.id, "fire")}
                              className={`rounded-full px-2 py-0.5 text-xs ${
                                isLight ? "bg-slate-100 text-slate-700" : "bg-slate-700 text-slate-300"
                              } transition hover:opacity-80`}
                            >
                              🔥 {message.reactions.fire}
                            </button>
                          )}
                          {(message.reactions.like === 0 || message.reactions.like === undefined) && (
                            <button
                              type="button"
                              onClick={() => react(message.id, "like")}
                              className={`rounded-full px-2 py-0.5 text-xs ${
                                isLight ? "bg-slate-100 text-slate-700" : "bg-slate-700 text-slate-300"
                              } transition hover:opacity-80`}
                            >
                              👍
                            </button>
                          )}
                          {(message.reactions.fire === 0 || message.reactions.fire === undefined) && (
                            <button
                              type="button"
                              onClick={() => react(message.id, "fire")}
                              className={`rounded-full px-2 py-0.5 text-xs ${
                                isLight ? "bg-slate-100 text-slate-700" : "bg-slate-700 text-slate-300"
                              } transition hover:opacity-80`}
                            >
                              🔥
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => togglePin(message.id)}
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              isLight ? "bg-slate-100 text-slate-700" : "bg-slate-700 text-slate-300"
                            } transition hover:opacity-80`}
                          >
                            {message.pinned ? "Unpin" : "📌"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!loading && channelMessages.length === 0 && <p className={`text-sm ${textMuted}`}>Nu exista mesaje pe acest canal.</p>}
            </div>

            <div className={`border-t p-3 ${isLight ? "border-slate-200" : "border-cyan-400/20"}`}>
              {currentConversation.canWrite ? (
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    rows={2}
                    placeholder={`Scrie un mesaj...`}
                    className={`min-h-[44px] flex-1 resize-none rounded-xl border px-3 py-2 text-sm outline-none ${
                      isLight
                        ? "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400"
                        : "border-cyan-400/20 bg-[#070b14] text-slate-100 placeholder:text-slate-500"
                    }`}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void sendMessage();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void sendMessage()}
                    disabled={sending || !draft.trim()}
                    className="h-11 rounded-xl px-4 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ background: accentBase }}
                  >
                    {sending ? "..." : "Trimite"}
                  </button>
                </div>
              ) : (
                <p className={`text-xs font-semibold ${textMuted}`}>🔒 Nu poți scrie pe acest canal</p>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center flex-1">
            <p className={`text-sm ${textMuted}`}>Selectează o conversație</p>
          </div>
        )}
      </article>

      <aside className={`hidden rounded-2xl border overflow-hidden flex flex-col xl:flex ${panelSurface}`}>
        <div className={`border-b px-3 py-3 ${isLight ? "border-slate-200" : "border-cyan-400/20"}`}>
          <h3 className={`text-sm font-semibold ${textPrimary}`}>Participanti</h3>
          <p className={`mt-1 text-xs ${textMuted}`}>{liveParticipants.length} in conversatie</p>
        </div>

        <div className="flex-1 overflow-auto space-y-2 p-2">
          {liveParticipants.slice(0, 12).map((member) => (
            <div key={member.id} className={`flex items-center justify-between rounded-xl border px-3 py-2 ${panelSurfaceSoft}`}>
              <div>
                <p className={`text-sm font-semibold ${textPrimary}`}>{member.name}</p>
                <p className={`text-xs ${textMuted}`}>{member.detail ?? "participant"}</p>
              </div>
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  member.status === "online" ? "bg-emerald-400" : member.status === "away" ? "bg-amber-400" : "bg-slate-400"
                }`}
              />
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
