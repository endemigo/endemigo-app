import { Injectable } from '@nestjs/common';
import { ViolationType } from '@endemigo/shared';

export interface ModerationResult {
  isClean: boolean;
  detectedPatterns: ViolationType[];
  normalizedText: string;
  allowed: boolean;
  violations: ViolationType[];
  normalized: string;
  message?: string;
}

const TURKISH_NUMBER_WORDS: Record<string, string> = {
  sifir: '0',
  sıfır: '0',
  bir: '1',
  iki: '2',
  uc: '3',
  üç: '3',
  dort: '4',
  dört: '4',
  bes: '5',
  beş: '5',
  alti: '6',
  altı: '6',
  yedi: '7',
  sekiz: '8',
  dokuz: '9',
};

@Injectable()
export class ContentModerationService {
  moderate(text: string): ModerationResult {
    return this.checkContent(text);
  }

  checkContent(text: string): ModerationResult {
    const normalizedText = this.normalizeText(text);
    const compact = normalizedText.replace(/[\s()._\-+]+/g, '');
    const detectedPatterns = [...this.detect(normalizedText, compact)];

    return {
      isClean: detectedPatterns.length === 0,
      detectedPatterns,
      normalizedText,
      allowed: detectedPatterns.length === 0,
      violations: detectedPatterns,
      normalized: normalizedText,
      message:
        detectedPatterns.length > 0
          ? 'Platform dışı iletişim bilgisi paylaşılamaz'
          : undefined,
    };
  }

  normalizeText(text: string): string {
    const compatibilityNormalized = text
      .normalize('NFKC')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('tr-TR')
      .replace(/[çğıöşü]/g, (char) => {
        const map: Record<string, string> = {
          ç: 'c',
          ğ: 'g',
          ı: 'i',
          ö: 'o',
          ş: 's',
          ü: 'u',
        };
        return map[char] ?? char;
      });

    return compatibilityNormalized.replace(
      /\b(sifir|bir|iki|uc|dort|bes|alti|yedi|sekiz|dokuz)\b/g,
      (word) => TURKISH_NUMBER_WORDS[word] ?? word,
    );
  }

  private detect(text: string, compact: string): ViolationType[] {
    const patterns = new Set<ViolationType>();

    if (
      /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|tr)\b)\S*/i.test(text)
    ) {
      patterns.add(ViolationType.URL);
    }
    if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text)) {
      patterns.add(ViolationType.EMAIL);
    }
    if (/tr\d{24}/i.test(compact)) patterns.add(ViolationType.IBAN);
    if (/(90|0)?5\d{9}/.test(compact) || /\d{10,}/.test(compact)) {
      patterns.add(ViolationType.PHONE);
    }
    if (/(^|\s)@[a-z0-9_.]{3,}/i.test(text)) {
      patterns.add(ViolationType.SOCIAL_HANDLE);
    }
    if (
      /(whats?app|telegram|instagram|facebook|signal|(^|\s)wp(\s|$)|watsap)/i.test(
        text,
      )
    ) {
      patterns.add(ViolationType.PLATFORM_NAME);
    }

    return Array.from(patterns);
  }
}
