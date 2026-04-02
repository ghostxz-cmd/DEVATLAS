import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ReplySupportTicketDto {
  @IsString()
  @MinLength(2)
  @MaxLength(5000)
  message!: string;

  @IsOptional()
  @IsIn(['open', 'in_progress', 'waiting_user', 'resolved', 'closed'])
  status?: string;

  @IsOptional()
  @IsIn(['low', 'normal', 'high', 'critical'])
  priority?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  responderName?: string;
}
