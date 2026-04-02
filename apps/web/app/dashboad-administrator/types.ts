export type AdminCounterSet = {
  totalTickets: number;
  open: number;
  inProgress: number;
  waitingUser: number;
  resolved: number;
  critical: number;
  people: number;
};

export type AdminPerson = {
  id: string;
  name: string;
  email: string;
  memberType: string;
  phone: string;
  tags: string[];
  tickets: number;
  lastSeen: string;
};

export type AdminRecentTicket = {
  id: string;
  publicId: string;
  subject: string;
  requester: string;
  status: "open" | "in_progress" | "waiting_user" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "critical";
  updatedAt: string;
};

export type AdminAuditLog = {
  id: string;
  action: string;
  note: string | null;
  createdAt: string;
  ticketId?: string;
  ticketPublicId?: string;
  ticketSubject?: string;
};

export type AdminOverviewResponse = {
  counters: AdminCounterSet;
  people: AdminPerson[];
  recentTickets: AdminRecentTicket[];
  auditLogs: AdminAuditLog[];
};
