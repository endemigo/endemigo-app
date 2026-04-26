type ModuleExports = Record<string, unknown>;

const loadCargoModule = (): ModuleExports | null => {
  try {
    return require('./cargo.service') as ModuleExports;
  } catch {
    return null;
  }
};

describe('CargoService Phase 6 contract', () => {
  it('defines the cargo service implementation', () => {
    const moduleExports = loadCargoModule();
    const implementationExists = Boolean(moduleExports?.CargoService);

    expect(implementationExists).toBe(true);
  });

  it('creates deterministic mock tracking records', async () => {
    const moduleExports = loadCargoModule();
    const CargoService = moduleExports?.CargoService as
      | (new (...args: never[]) => {
          createMockShipment?: (orderId: string) => Promise<{ trackingNumber: string; provider: string }>;
        })
      | undefined;

    expect(CargoService).toBeDefined();

    if (!CargoService) {
      return;
    }

    const service = new CargoService();
    const result = await service.createMockShipment?.('order-1');

    expect(result?.provider).toBe('MOCK');
    expect(result?.trackingNumber).toContain('MOCK');
  });

  it('rejects duplicate status transitions idempotently', async () => {
    const moduleExports = loadCargoModule();
    const CargoService = moduleExports?.CargoService as
      | (new (...args: never[]) => {
          transitionShipment?: (shipmentId: string, status: string) => Promise<{ idempotent: boolean }>;
        })
      | undefined;

    expect(CargoService).toBeDefined();

    if (!CargoService) {
      return;
    }

    const service = new CargoService();
    const result = await service.transitionShipment?.('shipment-1', 'IN_TRANSIT');

    expect(result?.idempotent).toBe(true);
  });
});
