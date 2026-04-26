type ModuleExports = Record<string, unknown>;

const loadLedgerModule = (): ModuleExports | null => {
  try {
    return require('./ledger.service') as ModuleExports;
  } catch {
    return null;
  }
};

describe('LedgerService Phase 6 contract', () => {
  it('defines the ledger service implementation', () => {
    const moduleExports = loadLedgerModule();
    const implementationExists = Boolean(moduleExports?.LedgerService);

    expect(implementationExists).toBe(true);
  });

  it('rejects unbalanced journal entries with LEDGER_UNBALANCED', async () => {
    const moduleExports = loadLedgerModule();
    const LedgerService = moduleExports?.LedgerService as
      | (new (...args: never[]) => {
          assertBalanced?: (lines: Array<{ direction: string; amount: number }>) => void;
        })
      | undefined;

    expect(LedgerService).toBeDefined();

    if (!LedgerService) {
      return;
    }

    const service = new LedgerService();

    expect(() =>
      service.assertBalanced?.([
        { direction: 'DEBIT', amount: 100 },
        { direction: 'CREDIT', amount: 90 },
      ]),
    ).toThrow('LEDGER_UNBALANCED');
  });

  it('accepts balanced debit and credit lines', () => {
    const moduleExports = loadLedgerModule();
    const LedgerService = moduleExports?.LedgerService as
      | (new (...args: never[]) => {
          assertBalanced?: (lines: Array<{ direction: string; amount: number }>) => void;
        })
      | undefined;

    expect(LedgerService).toBeDefined();

    if (!LedgerService) {
      return;
    }

    const service = new LedgerService();

    expect(() =>
      service.assertBalanced?.([
        { direction: 'DEBIT', amount: 100 },
        { direction: 'CREDIT', amount: 100 },
      ]),
    ).not.toThrow();
  });
});
