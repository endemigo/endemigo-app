import { IsEmail, IsString, MinLength, IsOptional, Matches, IsBoolean, Equals } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Test1234!', minLength: 8 })
  @IsString()
  @MinLength(8)
  // K1: OWASP şifre politikası — en az 1 büyük, 1 küçük, 1 rakam, 1 özel karakter
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_.#\-])[A-Za-z\d@$!%*?&_.#\-]{8,}$/, {
    message: 'Şifre en az 8 karakter, 1 büyük harf, 1 küçük harf, 1 rakam ve 1 özel karakter içermelidir',
  })
  password: string;

  @ApiPropertyOptional({ example: 'Ahmet' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Yılmaz' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 'device-uuid-token' })
  @IsOptional()
  @IsString()
  deviceToken?: string;

  @ApiProperty({ example: true, description: 'KVKK aydınlatma metni onayı — zorunlu' })
  @IsBoolean()
  @Equals(true, {
    message: 'Kayıt olmak için KVKK aydınlatma metnini kabul etmelisiniz',
  })
  kvkkAccepted: boolean;
}
