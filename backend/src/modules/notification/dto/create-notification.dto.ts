import { NotificationEventType } from '@endemigo/shared';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateNotificationDto {
  @IsUUID()
  userId: string;

  @IsString()
  eventId: string;

  @IsEnum(NotificationEventType)
  eventType: NotificationEventType;

  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsString()
  relatedEntityType?: string;

  @IsOptional()
  @IsString()
  relatedEntityId?: string;
}
