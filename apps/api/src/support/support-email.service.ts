import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

type SendSupportConfirmationInput = {
  to: string;
  requesterName?: string | null;
  ticketPublicId: string;
  subject: string;
};

type SendSupportReplyInput = {
  to: string;
  requesterName?: string | null;
  ticketPublicId: string;
  subject: string;
  message: string;
};

@Injectable()
export class SupportEmailService {
  private readonly logger = new Logger(SupportEmailService.name);
  private readonly resend: Resend | null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.resend = apiKey ? new Resend(apiKey) : null;
  }

  private getFromAddress() {
    return this.configService.get<string>('EMAIL_FROM') ?? 'support@devatlas.website';
  }

  private getReplyToAddress() {
    return this.configService.get<string>('EMAIL_REPLY_TO') ?? this.getFromAddress();
  }

  async sendTicketConfirmation(input: SendSupportConfirmationInput) {
    const from = this.getFromAddress();
    if (!this.resend) {
      throw new InternalServerErrorException('RESEND_API_KEY is not configured.');
    }

    const { error } = await this.resend.emails.send({
      from,
      to: input.to,
      subject: `Ticket confirmat: ${input.ticketPublicId}`,
      replyTo: this.getReplyToAddress(),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2 style="margin: 0 0 16px;">Ticket confirmat</h2>
          <p>Salut${input.requesterName ? `, ${input.requesterName}` : ''},</p>
          <p>Am primit solicitarea ta și am creat ticketul <strong>${input.ticketPublicId}</strong>.</p>
          <p><strong>Subiect:</strong> ${input.subject}</p>
          <p>Te vom contacta din dashboard-ul de suport imediat ce un admin preia cazul.</p>
        </div>
      `,
    });

    if (error) {
      this.logger.error(`Failed to send support confirmation email for ${input.ticketPublicId}`, error);
      throw new InternalServerErrorException('Support confirmation email could not be sent.');
    }
  }

  async sendTicketReply(input: SendSupportReplyInput) {
    const from = this.getFromAddress();
    if (!this.resend) {
      throw new InternalServerErrorException('RESEND_API_KEY is not configured.');
    }

    const { error } = await this.resend.emails.send({
      from,
      to: input.to,
      subject: `Răspuns la ticketul ${input.ticketPublicId}`,
      replyTo: this.getReplyToAddress(),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2 style="margin: 0 0 16px;">Ai primit un răspuns</h2>
          <p>Salut${input.requesterName ? `, ${input.requesterName}` : ''},</p>
          <p>Adminul a răspuns la ticketul <strong>${input.ticketPublicId}</strong>.</p>
          <p><strong>Subiect:</strong> ${input.subject}</p>
          <div style="margin: 24px 0; padding: 16px; border-left: 4px solid #0ea5e9; background: #f8fafc; white-space: pre-wrap;">
            ${input.message}
          </div>
          <p>Poți răspunde direct din dashboard dacă mai ai nevoie de ajutor.</p>
        </div>
      `,
    });

    if (error) {
      this.logger.error(`Failed to send support reply email for ${input.ticketPublicId}`, error);
      throw new InternalServerErrorException('Support reply email could not be sent.');
    }
  }
}
