import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { ReplySupportTicketDto } from './dto/reply-support-ticket.dto';
import { SupportTicketQueryDto } from './dto/support-ticket-query.dto';
import { UpdateSupportTicketDto } from './dto/update-support-ticket.dto';
import { SupportEmailService } from './support-email.service';

type SupabaseTicketResponse = {
  ticket_id: string;
  ticket_public_id: string;
};

type SupportTicketRow = {
  id: string;
  public_id: string;
  requester_user_id: string | null;
  requester_email: string;
  requester_name: string | null;
  category_id: string | null;
  subject: string;
  description: string;
  status: string;
  priority: string;
  assigned_admin_user_id: string | null;
  source: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  resolved_at: string | null;
  closed_at: string | null;
};

type SupportMessageRow = {
  id: string;
  ticket_id: string;
  sender_type: 'user' | 'admin' | 'system';
  sender_user_id: string | null;
  sender_email: string | null;
  message: string;
  is_internal: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
};

type SupportCategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

type SupportEventRow = {
  id: string;
  ticket_id: string;
  event_type: string;
  actor_user_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  note: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

type SupportTicketDetail = SupportTicketRow & {
  category: SupportCategoryRow | null;
  messages: SupportMessageRow[];
  events: SupportEventRow[];
};

@Injectable()
export class SupportService {
  constructor(
    private readonly configService: ConfigService,
    private readonly supportEmailService: SupportEmailService,
  ) {}

  private getSupabaseConfig() {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new InternalServerErrorException('Supabase configuration is missing in API environment.');
    }

    return { supabaseUrl, serviceRoleKey };
  }

  private async supabaseRequest<T>(path: string, init: RequestInit): Promise<T> {
    const { supabaseUrl, serviceRoleKey } = this.getSupabaseConfig();
    const response = await fetch(`${supabaseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new BadGatewayException(`Supabase request failed: ${errorText}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  private normalizeString(value?: string | null) {
    return value?.trim().toLowerCase() ?? '';
  }

  async createTicket(payload: CreateSupportTicketDto) {
    const rawData = await this.supabaseRequest<SupabaseTicketResponse[] | SupabaseTicketResponse>(
      '/rest/v1/rpc/support_create_ticket_public',
      {
        method: 'POST',
        body: JSON.stringify({
          p_requester_email: payload.email,
          p_requester_name: payload.fullName,
          p_category_slug: payload.category,
          p_subject: payload.subject,
          p_description: payload.details,
          p_metadata: {
            priority: payload.priority,
            source: payload.source ?? 'web_form',
          },
        }),
      },
    );

    const result = Array.isArray(rawData) ? rawData[0] : rawData;

    if (!result?.ticket_id || !result?.ticket_public_id) {
      throw new BadGatewayException('Supabase ticket RPC returned an invalid response payload.');
    }

    await this.supportEmailService.sendTicketConfirmation({
      to: payload.email,
      requesterName: payload.fullName,
      ticketPublicId: result.ticket_public_id,
      subject: payload.subject,
    });

    return {
      ticketId: result.ticket_id,
      ticketPublicId: result.ticket_public_id,
      message: 'Ticket created successfully.',
      confirmationEmailSent: true,
    };
  }

  async listTickets(query: SupportTicketQueryDto) {
    const [tickets, categories] = await Promise.all([
      this.supabaseRequest<SupportTicketRow[]>('/rest/v1/support_tickets?select=*&order=created_at.desc', {
        method: 'GET',
      }),
      this.supabaseRequest<SupportCategoryRow[]>('/rest/v1/support_categories?select=*', {
        method: 'GET',
      }),
    ]);

    const categoryMap = new Map(categories.map((category) => [category.id, category]));
    const search = this.normalizeString(query.search);
    const status = this.normalizeString(query.status);
    const priority = this.normalizeString(query.priority);
    const categoryFilter = this.normalizeString(query.category);

    const filteredTickets = tickets.filter((ticket) => {
      const ticketCategory = ticket.category_id ? categoryMap.get(ticket.category_id) : null;
      const matchesSearch =
        !search ||
        [ticket.public_id, ticket.subject, ticket.requester_email, ticket.requester_name]
          .map((value) => this.normalizeString(value))
          .some((value) => value.includes(search));
      const matchesStatus = !status || ticket.status === status;
      const matchesPriority = !priority || ticket.priority === priority;
      const matchesCategory =
        !categoryFilter ||
        ticketCategory?.slug === categoryFilter ||
        ticketCategory?.name?.toLowerCase().includes(categoryFilter);

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
    });

    const items = filteredTickets.map((ticket) => ({
      ...ticket,
      category: ticket.category_id ? categoryMap.get(ticket.category_id) ?? null : null,
    }));

    return {
      items,
      total: items.length,
    };
  }

  async getTicket(ticketId: string): Promise<SupportTicketDetail> {
    const [tickets, categories, messages, events] = await Promise.all([
      this.supabaseRequest<SupportTicketRow[]>(
        `/rest/v1/support_tickets?select=*&id=eq.${encodeURIComponent(ticketId)}&limit=1`,
        { method: 'GET' },
      ),
      this.supabaseRequest<SupportCategoryRow[]>('/rest/v1/support_categories?select=*', {
        method: 'GET',
      }),
      this.supabaseRequest<SupportMessageRow[]>(
        `/rest/v1/support_messages?select=*&ticket_id=eq.${encodeURIComponent(ticketId)}&order=created_at.asc`,
        { method: 'GET' },
      ),
      this.supabaseRequest<SupportEventRow[]>(
        `/rest/v1/support_ticket_events?select=*&ticket_id=eq.${encodeURIComponent(ticketId)}&order=created_at.asc`,
        { method: 'GET' },
      ),
    ]);

    const ticket = tickets[0];
    if (!ticket) {
      throw new NotFoundException(`Support ticket ${ticketId} not found.`);
    }

    const category = ticket.category_id
      ? categories.find((item) => item.id === ticket.category_id) ?? null
      : null;

    return {
      ...ticket,
      category,
      messages,
      events,
    };
  }

  async updateTicket(ticketId: string, payload: UpdateSupportTicketDto) {
    const currentTicket = await this.getTicket(ticketId);

    const patchPayload: Record<string, string | null> = {};
    if (payload.status) {
      patchPayload.status = payload.status;
    }
    if (payload.priority) {
      patchPayload.priority = payload.priority;
    }
    if (payload.assignedAdminUserId !== undefined) {
      patchPayload.assigned_admin_user_id = payload.assignedAdminUserId || null;
    }

    if (Object.keys(patchPayload).length === 0) {
      return currentTicket;
    }

    await this.supabaseRequest(`/rest/v1/support_tickets?id=eq.${encodeURIComponent(ticketId)}`, {
      method: 'PATCH',
      headers: {
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(patchPayload),
    });

    return this.getTicket(ticketId);
  }

  async replyToTicket(ticketId: string, payload: ReplySupportTicketDto) {
    const ticket = await this.getTicket(ticketId);
    const responderName = payload.responderName ?? 'Support Team';

    await this.supabaseRequest('/rest/v1/support_messages', {
      method: 'POST',
      body: JSON.stringify({
        ticket_id: ticket.id,
        sender_type: 'admin',
        sender_email: this.configService.get<string>('EMAIL_FROM') ?? 'support@devatlas.website',
        message: payload.message,
        is_internal: false,
        metadata: {
          responderName,
        },
      }),
    });

    const nextStatus = payload.status ?? 'waiting_user';
    await this.updateTicket(ticketId, {
      status: nextStatus,
      priority: payload.priority,
    });

    await this.supportEmailService.sendTicketReply({
      to: ticket.requester_email,
      requesterName: ticket.requester_name,
      ticketPublicId: ticket.public_id,
      subject: ticket.subject,
      message: payload.message,
    });

    return {
      ticketId: ticket.id,
      ticketPublicId: ticket.public_id,
      emailSent: true,
      status: nextStatus,
    };
  }
}
