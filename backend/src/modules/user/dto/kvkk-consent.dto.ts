import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsBoolean } from 'class-validator';
import { ConsentType } from '../entities/kvkk-consent.entity';

export class CreateKvkkConsentDto {
  @ApiProperty({ enum: ConsentType, example: 'DATA_PROCESSING' })
  @IsEnum(ConsentType, { message: 'Geçersiz onay türü' })
  consentType: ConsentType;

  @ApiProperty({ example: true, description: 'Onay durumu' })
  @IsBoolean()
  isAccepted: boolean;
}
