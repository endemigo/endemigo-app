import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class DeleteAccountDto {
  @ApiProperty({ description: 'Şifre doğrulama' })
  @IsNotEmpty({ message: 'Şifre zorunludur' })
  @IsString()
  @MinLength(6)
  password: string;
}
