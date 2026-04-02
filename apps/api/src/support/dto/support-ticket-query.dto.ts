import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class SupportTicketQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn(['open', 'in_progress', 'waiting_user', 'resolved', 'closed'])
  status?: string;

  @IsOptional()
  @IsIn(['low', 'normal', 'high', 'critical'])
  priority?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;
}
