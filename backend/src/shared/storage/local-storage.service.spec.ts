import { LocalStorageService } from './local-storage.service';

describe('LocalStorageService', () => {
  let service: LocalStorageService;

  beforeEach(() => {
    service = new LocalStorageService();
  });

  describe('delete', () => {
    it('should reject delete paths outside uploads directory', async () => {
      await expect(
        service.delete('/uploads/../../package.json'),
      ).rejects.toThrow('Invalid storage delete path');
    });

    it('should allow safe upload-relative paths', async () => {
      await expect(
        service.delete('/uploads/products/product-1/missing.webp'),
      ).resolves.toBeUndefined();
    });
  });
});
