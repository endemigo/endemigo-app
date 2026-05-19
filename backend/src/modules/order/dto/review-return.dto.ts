import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ReviewReturnDto {
  @ApiPropertyOptional({ description: 'approve | reject' })
  @IsString()
  decision: 'approve' | 'reject';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
