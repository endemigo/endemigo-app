import { ConfigService } from '@nestjs/config';
import { AiGeneratorService } from './ai-generator.service';

describe('AiGeneratorService', () => {
  let configService: {
    get: jest.Mock;
  };
  let service: AiGeneratorService;

  beforeEach(() => {
    configService = {
      get: jest.fn().mockReturnValue(undefined), // default no API key
    };
    service = new AiGeneratorService(configService as unknown as ConfigService);
  });

  it('generates high quality local content when OpenAI API Key is missing', async () => {
    const result = await service.generateListingContent('Sızma Zeytinyağı 1L', 'Zeytinyağı');

    expect(result.description).toContain('Zeytinyağı');
    expect(result.story).toContain('Zeytinyağı');
    expect(result.productContent).toContain('üretim');
    expect(configService.get).toHaveBeenCalledWith('OPENAI_API_KEY');
  });

  it('correctly maps handcrafted products to el sanatları templates', async () => {
    const result = await service.generateListingContent('El Dokuma Yün Kilim', 'Halı & Kilim');

    expect(result.description).toContain('zanaatkar');
    expect(result.story).toContain('el emeği');
    expect(result.productContent).toContain('el işçiliği');
  });

  it('correctly maps natural cosmetics to kozmetik templates', async () => {
    const result = await service.generateListingContent('Doğal Zeytinyağlı Sabun', 'Kozmetik');

    expect(result.description).toContain('cildinize');
    expect(result.story).toContain('şifalı');
    expect(result.productContent).toContain('Bitkisel');
  });

  it('uses default fallback templates for unmapped titles', async () => {
    const result = await service.generateListingContent('Ultra Modern Akıllı Saat', 'Elektronik');

    expect(result.description).toContain('Akıllı Saat');
    expect(result.story).toContain('Akıllı Saat');
    expect(result.productContent).toContain('Orijinal');
  });

  it('attempts to call OpenAI when key is present, and falls back to local on failure', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'OPENAI_API_KEY') return 'mock-openai-key';
      return undefined;
    });

    // Mock fetch to simulate failure
    const globalFetch = global.fetch;
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    try {
      const result = await service.generateListingContent('Taş Baskı Bal', 'Bal');
      expect(result.description).toContain('Bal');
      expect(result.story).toContain('Bal');
      expect(result.productContent).toContain('üretim');
    } finally {
      global.fetch = globalFetch;
    }
  });
});
