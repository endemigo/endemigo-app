import { buildCorsOptions, getAllowedCorsOrigins } from './cors.util';

describe('cors util', () => {
  it('includes local admin origins in development', () => {
    const origins = getAllowedCorsOrigins('development');

    expect(origins).toContain('http://localhost:5174');
    expect(origins).toContain('http://localhost:3001');
  });

  it('merges configured origins with development defaults', () => {
    const origins = getAllowedCorsOrigins(
      'development',
      'https://admin.example.com,http://staging.localhost:4173',
    );

    expect(origins).toContain('https://admin.example.com');
    expect(origins).toContain('http://staging.localhost:4173');
    expect(origins).toContain('http://localhost:5174');
  });

  it('blocks unknown origin while allowing known origin', () => {
    const corsOptions = buildCorsOptions('development');
    expect(typeof corsOptions.origin).toBe('function');

    const originHandler = corsOptions.origin as (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => void;

    originHandler('http://localhost:5174', (error, allow) => {
      expect(error).toBeNull();
      expect(allow).toBe(true);
    });

    originHandler('https://evil.example.com', (error, allow) => {
      expect(error).toBeInstanceOf(Error);
      expect(allow).toBeUndefined();
    });
  });
});
