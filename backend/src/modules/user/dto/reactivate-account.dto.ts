import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ReactivateAccountDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Hesap e-posta adresi',
  })
  @IsNotEmpty({ message: 'E-posta zorunludur' })
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz' })
  email: string;

  @ApiProperty({ description: 'Hesap şifresi' })
  @IsNotEmpty({ message: 'Şifre zorunludur' })
  @IsString()
  @MinLength(6)
  password: string;
}
