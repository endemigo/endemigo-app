import { NotificationEventType } from '@endemigo/shared';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';

export class NotificationChannelPreferenceDto {
  @IsBoolean()
  inApp: boolean;

  @IsBoolean()
  push: boolean;
}

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => NotificationChannelPreferenceDto)
  channels?: Partial<Record<NotificationEventType, NotificationChannelPreferenceDto>>;

  @IsOptional()
  @IsEnum(NotificationEventType, { each: true })
  disabledEventTypes?: NotificationEventType[];
}
