import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CloseConversationDto {
  @ApiPropertyOptional({ maxLength: 240 })
  @IsString()
  @MaxLength(240)
  @IsOptional()
  reason?: string;
}
