import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ description: 'E-posta doğrulama tokeni' })
  @IsNotEmpty()
  @IsString()
  token: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}

export class ResendVerificationDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Şifre sıfırlama tokeni' })
  @IsNotEmpty()
  @IsString()
  token: string;

  @ApiProperty({ example: 'NewPass123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  // RegisterDto ile aynı OWASP şifre politikasını korur.
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_.#\-])[A-Za-z\d@$!%*?&_.#\-]{8,}$/,
    {
      message:
        'Şifre en az 8 karakter, 1 büyük harf, 1 küçük harf, 1 rakam ve 1 özel karakter içermelidir',
    },
  )
  newPassword: string;
}
