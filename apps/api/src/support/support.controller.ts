import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ReplySupportTicketDto } from './dto/reply-support-ticket.dto';
import { SupportTicketQueryDto } from './dto/support-ticket-query.dto';
import { UpdateSupportTicketDto } from './dto/update-support-ticket.dto';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { SupportService } from './support.service';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('tickets')
  createTicket(@Body() body: CreateSupportTicketDto) {
    return this.supportService.createTicket(body);
  }

  @Get('tickets')
  listTickets(@Query() query: SupportTicketQueryDto) {
    return this.supportService.listTickets(query);
  }

  @Get('tickets/:ticketId')
  getTicket(@Param('ticketId') ticketId: string) {
    return this.supportService.getTicket(ticketId);
  }

  @Patch('tickets/:ticketId')
  updateTicket(@Param('ticketId') ticketId: string, @Body() body: UpdateSupportTicketDto) {
    return this.supportService.updateTicket(ticketId, body);
  }

  @Post('tickets/:ticketId/reply')
  replyToTicket(@Param('ticketId') ticketId: string, @Body() body: ReplySupportTicketDto) {
    return this.supportService.replyToTicket(ticketId, body);
  }
}
