import { ValidationPipe } from '@nestjs/common';
import { CreateBannerDto } from './create-banner.dto';
import { UpdateBannerDto } from './update-banner.dto';

// Admin panelin gönderdiği gerçek payload şekli, main.ts'teki global pipe ayarlarıyla doğrulanır.
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

function adminCreatePayload(): Record<string, unknown> {
  return {
    name: 'Ana Sayfa Kampanyaları',
    slug: 'ana-sayfa-kampanya',
    slideDuration: 3000,
    aspectRatio: '16:9',
    isActive: true,
    startAt: null,
    endAt: null,
    items: [
      {
        imageUrl: '/uploads/banners/test.webp',
        actionType: 'CATEGORY',
        actionValue: 'cat-uuid',
        title: { tr: '%50 İndirim', en: '50% Off' },
        subtitle: { tr: 'Seçili ürünlerde', en: 'On selected items' },
        requireConfirmation: false,
      },
    ],
    reason: 'Yaz kampanyası görselleri',
  };
}

describe('Banner DTO validation (global pipe uyumu)', () => {
  it('admin panel create payloadını reason alanıyla birlikte kabul eder', async () => {
    const out = (await pipe.transform(adminCreatePayload(), {
      type: 'body',
      metatype: CreateBannerDto,
    })) as CreateBannerDto;

    expect(out.reason).toBe('Yaz kampanyası görselleri');
    expect(out.items).toHaveLength(1);
    expect(out.items[0].actionType).toBe('CATEGORY');
    expect(out.startAt).toBeNull();
  });

  it('admin panel update payloadını kabul eder', async () => {
    const out = (await pipe.transform(adminCreatePayload(), {
      type: 'body',
      metatype: UpdateBannerDto,
    })) as UpdateBannerDto;

    expect(out.reason).toBe('Yaz kampanyası görselleri');
  });

  it('ISO tarih aralığını kabul eder', async () => {
    const payload = {
      ...adminCreatePayload(),
      startAt: '2026-07-01T00:00:00.000Z',
      endAt: '2026-08-01T00:00:00.000Z',
    };
    const out = (await pipe.transform(payload, {
      type: 'body',
      metatype: CreateBannerDto,
    })) as CreateBannerDto;

    expect(out.startAt).toBe('2026-07-01T00:00:00.000Z');
  });

  it('görseli olmayan slaytı reddeder', async () => {
    const payload = adminCreatePayload();
    payload.items = [{ actionType: 'CATEGORY', actionValue: 'x' }];

    await expect(
      pipe.transform(payload, { type: 'body', metatype: CreateBannerDto }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('geçersiz actionType reddeder', async () => {
    const payload = adminCreatePayload();
    payload.items = [
      { imageUrl: '/x.webp', actionType: 'HACKED', actionValue: 'x' },
    ];

    await expect(
      pipe.transform(payload, { type: 'body', metatype: CreateBannerDto }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('bilinmeyen üst seviye alanı reddeder', async () => {
    const payload = { ...adminCreatePayload(), evilField: 'x' };

    await expect(
      pipe.transform(payload, { type: 'body', metatype: CreateBannerDto }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('geçersiz tarih formatını reddeder', async () => {
    const payload = { ...adminCreatePayload(), startAt: 'yarin' };

    await expect(
      pipe.transform(payload, { type: 'body', metatype: CreateBannerDto }),
    ).rejects.toMatchObject({ status: 400 });
  });
});
