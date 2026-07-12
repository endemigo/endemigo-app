export type Phase10ScenarioType =
  | 'happy_path'
  | 'error_validation'
  | 'role_permission';

export interface Phase10RegressionScenario {
  module: string;
  scenario: Phase10ScenarioType;
  requirementIds: string[];
  commands: string[];
  evidenceKey: string;
}

export const PHASE10_REQUIRED_MODULES = [
  'auth',
  'product_catalog_search_favorites',
  'auction',
  'wallet_payment_order_cargo_notification',
  'ads_campaign_membership_trust_admin',
  'reports_export',
  'ask_price',
] as const;

const scenarioCommands = {
  happy_path: [
    'npm --prefix backend run test:e2e -- phase10-regression.e2e-spec.ts --runInBand --watchman=false',
  ],
  error_validation: [
    'npm --prefix backend run test:e2e -- phase10-regression.e2e-spec.ts --runInBand --watchman=false',
  ],
  role_permission: [
    'npm --prefix backend run test:e2e -- phase10-regression.e2e-spec.ts --runInBand --watchman=false',
  ],
} satisfies Record<Phase10ScenarioType, string[]>;

const moduleRequirements = {
  auth: [
    'AUTH-01',
    'AUTH-04',
    'AUTH-05',
    'AUTH-06',
    'contract/API compatibility',
  ],
  product_catalog_search_favorites: [
    'PROD-01',
    'PROD-05',
    'SRCH-01',
    'SRCH-09',
    'contract/API compatibility',
  ],
  auction: ['AUCT-01', 'AUCT-02', 'AUCT-10', 'contract/API compatibility'],
  wallet_payment_order_cargo_notification: [
    'WALL-01',
    'PAY-01',
    'ORDR-01',
    'KARG-01',
    'NOTF-01',
    'contract/API compatibility',
  ],
  ads_campaign_membership_trust_admin: [
    'ADMN-01',
    'ADS-01',
    'CAMP-01',
    'MEMB-01',
    'TRST-01',
    'contract/API compatibility',
  ],
  reports_export: ['ADMN-05', 'ADMN-06', 'contract/API compatibility'],
  ask_price: [
    'ASKP-01',
    'ASKP-03',
    'ASKP-06',
    'ASKP-10',
    'contract/API compatibility',
  ],
} satisfies Record<(typeof PHASE10_REQUIRED_MODULES)[number], string[]>;

export const PHASE10_REGRESSION_MATRIX: Phase10RegressionScenario[] =
  PHASE10_REQUIRED_MODULES.flatMap((moduleName) =>
    (
      [
        'happy_path',
        'error_validation',
        'role_permission',
      ] as Phase10ScenarioType[]
    ).map((scenario) => ({
      module: moduleName,
      scenario,
      requirementIds: moduleRequirements[moduleName],
      commands: scenarioCommands[scenario],
      evidenceKey: `${moduleName}:${scenario}`,
    })),
  );

export function getPhase10Scenario(
  moduleName: string,
  scenario: Phase10ScenarioType,
) {
  return PHASE10_REGRESSION_MATRIX.find(
    (entry) => entry.module === moduleName && entry.scenario === scenario,
  );
}
