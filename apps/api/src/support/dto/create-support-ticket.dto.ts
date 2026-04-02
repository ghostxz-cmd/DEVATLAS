import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSupportTicketDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsIn(['technical', 'billing', 'account', 'course', 'other'])
  category!: string;

  @IsIn(['low', 'normal', 'high', 'critical'])
  priority!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(180)
  subject!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  details!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  source?: string;
}
