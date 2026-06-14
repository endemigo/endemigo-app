import { IsEmail, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Test1234!' })
  @IsString()
  password: string;

  @ApiPropertyOptional({ example: 'device-uuid-token' })
  @IsOptional()
  @IsString()
  deviceToken?: string;
}
