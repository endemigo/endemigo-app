import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';
import { CreateProductDto } from './create-product.dto';

export class BulkImportDto {
  /**
   * Satırlar burada bilinçli olarak nested validation'a tabi tutulmaz:
   * global ValidationPipe (forbidNonWhitelisted) tek hatalı satırda tüm isteği
   * 400 ile reddederdi. Satır bazlı hata raporu ({ created, failed[] })
   * üretebilmek için her satır ProductService.bulkImport içinde tek tek
   * CreateProductDto kurallarıyla doğrulanır — hatalı satır partiyi durdurmaz.
   */
  @ApiProperty({ type: [CreateProductDto] })
  @IsArray()
  products: Record<string, unknown>[];
}
