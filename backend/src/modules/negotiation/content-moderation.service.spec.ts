import { ContentModerationService } from './content-moderation.service';
import { ViolationType } from '@endemigo/shared';

describe('ContentModerationService', () => {
  let service: ContentModerationService;

  beforeEach(() => {
    service = new ContentModerationService();
  });

  it('blocks off-platform contact patterns after Unicode and Turkish number-word normalization', () => {
    const result = service.moderate(
      'İletişim için WhatsApp: beş üç iki 123 45 67',
    );

    expect(result.allowed).toBe(false);
    expect(result.violations).toEqual(
      expect.arrayContaining([ViolationType.PLATFORM_NAME, ViolationType.PHONE]),
    );
  });

  it('blocks IBAN, email, URL, and social handles', () => {
    const result = service.moderate(
      'mail a@test.com iban TR330006100519786457841326 site https://x.com @hesap',
    );

    expect(result.allowed).toBe(false);
    expect(result.violations).toEqual(
      expect.arrayContaining([
        ViolationType.EMAIL,
        ViolationType.IBAN,
        ViolationType.URL,
        ViolationType.SOCIAL_HANDLE,
      ]),
    );
  });

  it('allows normal Turkish negotiation text without contact details', () => {
    const result = service.moderate('Merhaba, bu ürün için 12500 TL uygun olur mu?');

    expect(result).toEqual(
      expect.objectContaining({
        allowed: true,
        violations: [],
        normalized: expect.any(String),
      }),
    );
  });
});
