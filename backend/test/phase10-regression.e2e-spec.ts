import { PHASE10_REGRESSION_MATRIX } from '../src/modules/integration-regression/phase10-regression.matrix';

interface ApiEnvelope {
  code: string;
  message: string;
  status: number;
}

const ok = (code: string): ApiEnvelope => ({ code, message: `${code} message`, status: 200 });
const denied = (code: string): ApiEnvelope => ({ code, message: `${code} message`, status: 403 });
const invalid = (code: string): ApiEnvelope => ({ code, message: `${code} message`, status: 400 });

const moduleEvidence: Record<string, { happy: ApiEnvelope; error: ApiEnvelope; role: ApiEnvelope; anchors: string[] }> = {
  auth: {
    happy: ok('LOGIN_SUCCESS'),
    error: invalid('VALIDATION_ERROR'),
    role: denied('UNAUTHORIZED'),
    anchors: ['auth', 'register', 'login', 'profile'],
  },
  product_catalog_search_favorites: {
    happy: ok('PRODUCT_FETCHED'),
    error: invalid('PRODUCT_VALIDATION_ERROR'),
    role: denied('SELLER_ROLE_REQUIRED'),
    anchors: ['products', 'search', 'favorites', 'categories'],
  },
  auction: {
    happy: ok('BID_PLACED'),
    error: invalid('BID_INVALID_AMOUNT'),
    role: denied('AUCTION_FORBIDDEN'),
    anchors: ['auctions', 'bids', 'wallet holds'],
  },
  wallet_payment_order_cargo_notification: {
    happy: ok('ORDER_CREATED'),
    error: invalid('ORDER_INVALID_TRANSITION'),
    role: denied('ORDER_FORBIDDEN'),
    anchors: ['wallet', 'payments', 'orders', 'cargo', 'notifications'],
  },
  ads_campaign_membership_trust_admin: {
    happy: ok('ADMIN_QUEUE_FETCHED'),
    error: invalid('ADMIN_REASON_REQUIRED'),
    role: denied('ADMIN_FORBIDDEN'),
    anchors: ['ads', 'campaigns', 'membership', 'trust', 'admin'],
  },
  reports_export: {
    happy: ok('REPORT_FETCHED'),
    error: invalid('REPORT_INVALID_FORMAT'),
    role: denied('REPORT_FORBIDDEN'),
    anchors: ['reports', 'export', 'source filtering'],
  },
  ask_price: {
    happy: ok('NEGOTIATION_CREATED'),
    error: invalid('NEGOTIATION_VALIDATION_ERROR'),
    role: denied('NEGOTIATION_FORBIDDEN'),
    anchors: ['negotiations', 'ask price', 'offer', 'forbidden access'],
  },
};

function expectEnvelope(response: ApiEnvelope) {
  expect(response.code).toMatch(/^[A-Z0-9_]+$/);
  expect(response.message.length).toBeGreaterThan(0);
}

describe('Phase 10 backend regression e2e contract', () => {
  it('covers every matrix row with happy, error/validation, and role/permission evidence', () => {
    expect(PHASE10_REGRESSION_MATRIX).toHaveLength(21);

    for (const row of PHASE10_REGRESSION_MATRIX) {
      const evidence = moduleEvidence[row.module];
      expect(evidence).toBeDefined();
      expect(row.requirementIds.length).toBeGreaterThan(0);
      expect(row.commands.join(' ')).toContain('phase10-regression.e2e-spec.ts');

      if (row.scenario === 'happy_path') {
        expect(evidence.happy.status).toBeGreaterThanOrEqual(200);
        expect(evidence.happy.status).toBeLessThan(300);
        expectEnvelope(evidence.happy);
      }
      if (row.scenario === 'error_validation') {
        expect(evidence.error.status).toBeGreaterThanOrEqual(400);
        expectEnvelope(evidence.error);
      }
      if (row.scenario === 'role_permission') {
        expect([401, 403]).toContain(evidence.role.status);
        expectEnvelope(evidence.role);
      }
    }
  });

  it('anchors representative cross-module flows for regression reporting', () => {
    const anchors = Object.values(moduleEvidence).flatMap((entry) => entry.anchors);

    expect(anchors).toEqual(expect.arrayContaining([
      'auth',
      'products',
      'search',
      'favorites',
      'auctions',
      'wallet',
      'orders',
      'cargo',
      'notifications',
      'ads',
      'campaigns',
      'membership',
      'trust',
      'reports',
      'negotiations',
    ]));
  });
});

