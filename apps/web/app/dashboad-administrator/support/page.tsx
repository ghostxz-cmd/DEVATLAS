"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  category: SupportCategory | null;
};

type SupportMessage = {
  id: string;
  sender_type: "user" | "admin" | "system";
  sender_email: string | null;
  message: string;
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
  category: SupportCategory | null;
  messages: SupportMessage[];
};

type TicketsResponse = {
  items: SupportTicket[];
  total: number;
};

const statusOptions = ["", "open", "in_progress", "waiting_user", "resolved", "closed"];
const priorityOptions = ["", "low", "normal", "high", "critical"];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function markdownToHtml(value: string) {
  const escaped = escapeHtml(value);
  return escaped
    .replace(/^###\s(.+)$/gm, "<h3>$1</h3>")
    .replace(/^##\s(.+)$/gm, "<h2>$1</h2>")
    .replace(/^#\s(.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/^>\s(.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/\n/g, "<br />");
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketDetail | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSavingReply, setIsSavingReply] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [reply, setReply] = useState("");
  const [composerTab, setComposerTab] = useState<"write" | "preview">("write");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const replyRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const ticket = new URLSearchParams(window.location.search).get("ticket");
    if (ticket) {
      setSelectedTicketId(ticket);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadTickets = async () => {
      setIsLoadingList(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (status) params.set("status", status);
        if (priority) params.set("priority", priority);
        if (category) params.set("category", category);

        const response = await fetch(`/api/admin/support?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Nu am putut încărca lista de tichete.");
        }

        const payload = (await response.json()) as TicketsResponse;
        const items = payload.items ?? [];
        setTickets(items);

        if (items.length === 0) {
          setSelectedTicketId(null);
          setSelectedTicket(null);
          return;
        }

        const stillExists = selectedTicketId && items.some((ticket) => ticket.public_id === selectedTicketId);
        if (!stillExists) {
          setSelectedTicketId(items[0].public_id);
        }
      } catch (listError) {
        if (listError instanceof DOMException && listError.name === "AbortError") {
          return;
        }
        setError(listError instanceof Error ? listError.message : "A apărut o eroare.");
      } finally {
        setIsLoadingList(false);
      }
    };

    void loadTickets();

    return () => controller.abort();
  }, [search, status, priority, category]);

  useEffect(() => {
    if (!selectedTicketId) {
      setSelectedTicket(null);
      return;
    }

    const controller = new AbortController();

    const loadTicketDetail = async () => {
      setIsLoadingDetail(true);
      setError(null);

      try {
        const response = await fetch(`/api/admin/support/${selectedTicketId}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Nu am putut încărca detaliile ticketului.");
        }

        const payload = (await response.json()) as SupportTicketDetail;
        setSelectedTicket(payload);
      } catch (detailError) {
        if (detailError instanceof DOMException && detailError.name === "AbortError") {
          return;
        }
        setError(detailError instanceof Error ? detailError.message : "A apărut o eroare.");
      } finally {
        setIsLoadingDetail(false);
      }
    };

    void loadTicketDetail();

    return () => controller.abort();
  }, [selectedTicketId]);

  const stats = useMemo(() => {
    return {
      inbox: tickets.length,
      open: tickets.filter((ticket) => ticket.status === "open").length,
      inProgress: tickets.filter((ticket) => ticket.status === "in_progress").length,
      waitingUser: tickets.filter((ticket) => ticket.status === "waiting_user").length,
      resolved: tickets.filter((ticket) => ticket.status === "resolved").length,
    };
  }, [tickets]);

  const refreshSelectedTicket = async (ticketPublicId: string) => {
    const response = await fetch(`/api/support/tickets/${ticketPublicId}`);
    if (response.ok) {
      const refreshed = (await response.json()) as SupportTicketDetail;
      setSelectedTicket(refreshed);
    }
  };

  const insertSnippet = (before: string, after = "") => {
    const target = replyRef.current;

    if (!target) {
      setReply((previous) => `${previous}${before}${after}`);
      return;
    }

    const start = target.selectionStart;
    const end = target.selectionEnd;
    const selected = reply.slice(start, end);
    const inserted = `${before}${selected}${after}`;
    const nextValue = `${reply.slice(0, start)}${inserted}${reply.slice(end)}`;

    setReply(nextValue);

    requestAnimationFrame(() => {
      target.focus();
      const cursor = start + inserted.length;
      target.setSelectionRange(cursor, cursor);
    });
  };

  const handleSendReply = async () => {
    if (!selectedTicket || reply.trim().length < 2) {
      return;
    }

    setIsSavingReply(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/support/tickets/${selectedTicket.public_id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: reply,
          status: selectedTicket.status,
          priority: selectedTicket.priority,
          responderName: "DevAtlas Support",
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message || "Nu am putut trimite răspunsul.");
      }

      setReply("");
      setSuccessMessage("Răspuns trimis. Emailul a fost livrat către user.");
      await refreshSelectedTicket(selectedTicket.public_id);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "A apărut o eroare.");
    } finally {
      setIsSavingReply(false);
    }
  };

  const updateTicketMeta = async (
    ticketPublicId: string,
    patch: Partial<Pick<SupportTicketDetail, "status" | "priority">>,
  ) => {
    try {
      const response = await fetch(`/api/support/tickets/${ticketPublicId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message || "Nu am putut salva modificarea.");
      }

      setSelectedTicket((previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,
          ...patch,
        };
      });
    } catch (patchError) {
      setError(patchError instanceof Error ? patchError.message : "A apărut o eroare.");
    }
  };

  return (
    <main className="min-h-[76vh]">
      <div className="border-b border-[#e0e2e7] px-4 py-3">
        <h1 className="text-2xl font-semibold text-[#202124]">Support Tickets</h1>
        <p className="mt-1 text-sm text-[#5f6368]">Workspace complet de ticketing în dashboard administrator.</p>
      </div>

      <div className="grid grid-cols-1 border-b border-[#e0e2e7] bg-[#f8f9fa] p-3 xl:grid-cols-[270px_1fr] xl:gap-3">
        <div className="grid gap-2">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search ticket or email"
            className="h-10 rounded-lg border border-[#d3d7dd] bg-white px-3 text-sm outline-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-10 rounded-lg border border-[#d3d7dd] bg-white px-2 text-sm outline-none"
            >
              {statusOptions.map((option) => (
                <option key={option || "all-status"} value={option}>
                  {option ? option.replace("_", " ") : "All statuses"}
                </option>
              ))}
            </select>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              className="h-10 rounded-lg border border-[#d3d7dd] bg-white px-2 text-sm outline-none"
            >
              {priorityOptions.map((option) => (
                <option key={option || "all-priority"} value={option}>
                  {option || "All priorities"}
                </option>
              ))}
            </select>
          </div>
          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Category"
            className="h-10 rounded-lg border border-[#d3d7dd] bg-white px-3 text-sm outline-none"
          />
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-5 xl:mt-0">
          <div className="rounded-lg border border-[#e0e2e7] bg-white px-3 py-2">
            <div className="text-xs text-[#70757a]">Inbox</div>
            <div className="text-lg font-semibold text-[#202124]">{stats.inbox}</div>
          </div>
          <div className="rounded-lg border border-[#e0e2e7] bg-white px-3 py-2">
            <div className="text-xs text-[#70757a]">Open</div>
            <div className="text-lg font-semibold text-[#202124]">{stats.open}</div>
          </div>
          <div className="rounded-lg border border-[#e0e2e7] bg-white px-3 py-2">
            <div className="text-xs text-[#70757a]">In progress</div>
            <div className="text-lg font-semibold text-[#202124]">{stats.inProgress}</div>
          </div>
          <div className="rounded-lg border border-[#e0e2e7] bg-white px-3 py-2">
            <div className="text-xs text-[#70757a]">Waiting user</div>
            <div className="text-lg font-semibold text-[#202124]">{stats.waitingUser}</div>
          </div>
          <div className="rounded-lg border border-[#e0e2e7] bg-white px-3 py-2">
            <div className="text-xs text-[#70757a]">Resolved</div>
            <div className="text-lg font-semibold text-[#202124]">{stats.resolved}</div>
          </div>
        </div>
      </div>

      <div className="grid min-h-[560px] grid-cols-1 xl:grid-cols-[1fr_1.1fr]">
        <section className="border-b border-[#e0e2e7] xl:border-b-0 xl:border-r">
          <div className="grid grid-cols-[1.2fr_1fr_130px_120px_150px] border-b border-[#e0e2e7] bg-[#f8f9fa] px-4 py-3 text-xs uppercase tracking-[0.08em] text-[#5f6368]">
            <div>Subject</div>
            <div>Requester</div>
            <div>Status</div>
            <div>Priority</div>
            <div>Updated</div>
          </div>

          {isLoadingList ? (
            <div className="px-4 py-8 text-sm text-[#5f6368]">Loading tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="px-4 py-8 text-sm text-[#5f6368]">No tickets found.</div>
          ) : (
            <div className="divide-y divide-[#eceff1]">
              {tickets.map((ticket) => {
                const active = selectedTicketId === ticket.public_id;

                return (
                  <button
                    type="button"
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.public_id)}
                    className={`grid w-full grid-cols-[1.2fr_1fr_130px_120px_150px] px-4 py-3 text-left text-sm transition ${
                      active ? "bg-[#e8f0fe]" : "hover:bg-[#f8f9fa]"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[#202124]">{ticket.subject}</p>
                      <p className="truncate text-xs text-[#5f6368]">{ticket.public_id}</p>
                    </div>
                    <div className="truncate text-[#3c4043]">{ticket.requester_name || ticket.requester_email}</div>
                    <div className="capitalize text-[#3c4043]">{ticket.status.replace("_", " ")}</div>
                    <div className="capitalize text-[#3c4043]">{ticket.priority}</div>
                    <div className="text-xs text-[#5f6368]">{formatDate(ticket.last_message_at)}</div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="flex min-h-[560px] flex-col">
          <div className="border-b border-[#e0e2e7] px-4 py-3">
            <h2 className="truncate text-lg font-semibold text-[#202124]">{selectedTicket?.subject || "Select a ticket"}</h2>
            <p className="mt-1 text-xs text-[#5f6368]">{selectedTicket?.public_id || "No ticket selected"}</p>
          </div>

          {isLoadingDetail ? (
            <div className="px-4 py-8 text-sm text-[#5f6368]">Loading ticket details...</div>
          ) : !selectedTicket ? (
            <div className="px-4 py-8 text-sm text-[#5f6368]">Choose a ticket from the list.</div>
          ) : (
            <>
              <div className="border-b border-[#e0e2e7] bg-[#f8f9fa] px-4 py-3 text-xs text-[#5f6368]">
                {selectedTicket.requester_name || selectedTicket.requester_email} • {selectedTicket.category?.name || "No category"} • {selectedTicket.source}
              </div>

              <div className="flex-1 space-y-3 overflow-auto px-4 py-3">
                <div className="rounded-lg border border-[#e0e2e7] bg-[#f8f9fa] p-3">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-[#202124]">{selectedTicket.description}</p>
                </div>

                {selectedTicket.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-lg border p-3 ${
                      message.sender_type === "admin" ? "border-[#a8c7fa] bg-[#e8f0fe]" : "border-[#e0e2e7] bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-[#5f6368]">
                      <span className="capitalize">{message.sender_type}</span>
                      <span>{formatDate(message.created_at)}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#202124]">{message.message}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#e0e2e7] p-4">
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <select
                    value={selectedTicket.status}
                    onChange={(event) => {
                      const nextStatus = event.target.value as SupportTicketDetail["status"];
                      void updateTicketMeta(selectedTicket.public_id, { status: nextStatus });
                    }}
                    className="h-10 rounded-lg border border-[#d3d7dd] bg-white px-3 text-sm outline-none"
                  >
                    {statusOptions.filter(Boolean).map((option) => (
                      <option key={option} value={option}>
                        {option.replace("_", " ")}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedTicket.priority}
                    onChange={(event) => {
                      const nextPriority = event.target.value as SupportTicketDetail["priority"];
                      void updateTicketMeta(selectedTicket.public_id, { priority: nextPriority });
                    }}
                    className="h-10 rounded-lg border border-[#d3d7dd] bg-white px-3 text-sm outline-none"
                  >
                    {priorityOptions.filter(Boolean).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-lg border border-[#d3d7dd] bg-white">
                  <div className="flex flex-wrap items-center gap-2 border-b border-[#e0e2e7] p-2">
                    <button
                      type="button"
                      onClick={() => insertSnippet("**", "**")}
                      className="h-8 rounded-md border border-[#d3d7dd] px-3 text-xs text-[#3c4043]"
                    >
                      Bold
                    </button>
                    <button
                      type="button"
                      onClick={() => insertSnippet("*", "*")}
                      className="h-8 rounded-md border border-[#d3d7dd] px-3 text-xs text-[#3c4043]"
                    >
                      Italic
                    </button>
                    <button
                      type="button"
                      onClick={() => insertSnippet("# ")}
                      className="h-8 rounded-md border border-[#d3d7dd] px-3 text-xs text-[#3c4043]"
                    >
                      H1
                    </button>
                    <button
                      type="button"
                      onClick={() => insertSnippet("- ")}
                      className="h-8 rounded-md border border-[#d3d7dd] px-3 text-xs text-[#3c4043]"
                    >
                      List
                    </button>
                    <button
                      type="button"
                      onClick={() => insertSnippet("[text](https://)")}
                      className="h-8 rounded-md border border-[#d3d7dd] px-3 text-xs text-[#3c4043]"
                    >
                      Link
                    </button>
                    <button
                      type="button"
                      onClick={() => insertSnippet("`", "`")}
                      className="h-8 rounded-md border border-[#d3d7dd] px-3 text-xs text-[#3c4043]"
                    >
                      Code
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setReply((previous) =>
                          `${previous}${previous ? "\n\n" : ""}Salut,\n\nMulțumim pentru mesaj. Am verificat și am aplicat modificările necesare.\n\nDacă mai ai nevoie de ajutor, răspunde direct la acest ticket.\n\nCu respect,\nDevAtlas Support`,
                        )
                      }
                      className="h-8 rounded-md border border-[#d3d7dd] px-3 text-xs text-[#3c4043]"
                    >
                      Template
                    </button>
                    <div className="ml-auto flex items-center rounded-md border border-[#d3d7dd] p-0.5">
                      <button
                        type="button"
                        onClick={() => setComposerTab("write")}
                        className={`rounded px-2 py-1 text-xs ${
                          composerTab === "write" ? "bg-[#e8f0fe] text-[#174ea6]" : "text-[#5f6368]"
                        }`}
                      >
                        Write
                      </button>
                      <button
                        type="button"
                        onClick={() => setComposerTab("preview")}
                        className={`rounded px-2 py-1 text-xs ${
                          composerTab === "preview" ? "bg-[#e8f0fe] text-[#174ea6]" : "text-[#5f6368]"
                        }`}
                      >
                        Preview
                      </button>
                    </div>
                  </div>

                  {composerTab === "write" ? (
                    <textarea
                      ref={replyRef}
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      placeholder="Write a reply..."
                      className="min-h-36 w-full rounded-b-lg px-3 py-2 text-sm text-[#202124] outline-none"
                    />
                  ) : (
                    <div
                      className="min-h-36 w-full rounded-b-lg px-3 py-2 text-sm leading-6 text-[#202124]"
                      dangerouslySetInnerHTML={{ __html: markdownToHtml(reply || "(No content)") }}
                    />
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSendReply()}
                    disabled={isSavingReply || reply.trim().length < 2}
                    className="inline-flex h-10 items-center rounded-lg bg-[#1a73e8] px-4 text-sm font-medium text-white transition hover:bg-[#1558b0] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingReply ? "Sending..." : "Send reply"}
                  </button>
                  {successMessage && <span className="text-sm text-[#188038]">{successMessage}</span>}
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {error && (
        <div className="fixed bottom-4 right-4 rounded-lg border border-[#f3c2c2] bg-[#fce8e6] px-4 py-3 text-sm text-[#c5221f] shadow-lg">
          {error}
        </div>
      )}
    </main>
  );
}
