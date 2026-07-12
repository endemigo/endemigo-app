import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class RegisterCardDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  cardHolderName: string;

  @ApiProperty({ example: '4111111111111111' })
  @IsString()
  @Matches(/^\d{15,16}$/, {
    message: 'Kart numarası 15 veya 16 haneli rakam olmalıdır',
  })
  cardNumber: string;

  @ApiProperty({ example: '12' })
  @IsString()
  @Matches(/^(0[1-9]|1[0-2])$/, { message: 'Geçersiz son kullanma ayı' })
  expireMonth: string;

  @ApiProperty({ example: '2028' })
  @IsString()
  @Matches(/^(\d{2}|\d{4})$/, { message: 'Geçersiz son kullanma yılı' })
  expireYear: string;

  @ApiProperty({ example: '123' })
  @IsString()
  @Matches(/^\d{3,4}$/, { message: 'CVC 3 veya 4 haneli rakam olmalıdır' })
  cvc: string;
}
