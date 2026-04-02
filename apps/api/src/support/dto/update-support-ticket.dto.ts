import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSupportTicketDto {
  @IsOptional()
  @IsIn(['open', 'in_progress', 'waiting_user', 'resolved', 'closed'])
  status?: string;

  @IsOptional()
  @IsIn(['low', 'normal', 'high', 'critical'])
  priority?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  assignedAdminUserId?: string;
}
