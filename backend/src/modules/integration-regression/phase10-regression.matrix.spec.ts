import {
  getPhase10Scenario,
  PHASE10_REGRESSION_MATRIX,
  PHASE10_REQUIRED_MODULES,
  type Phase10ScenarioType,
} from './phase10-regression.matrix';

describe('PHASE10_REGRESSION_MATRIX', () => {
  const scenarioTypes: Phase10ScenarioType[] = [
    'happy_path',
    'error_validation',
    'role_permission',
  ];

  it('covers every Phase 10 module with happy, validation, and permission scenarios', () => {
    for (const moduleName of PHASE10_REQUIRED_MODULES) {
      for (const scenario of scenarioTypes) {
        expect(PHASE10_REGRESSION_MATRIX).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              module: moduleName,
              scenario,
              evidenceKey: `${moduleName}:${scenario}`,
            }),
          ]),
        );
      }
    }
  });

  it('keeps every scenario traceable to requirements and commands', () => {
    for (const entry of PHASE10_REGRESSION_MATRIX) {
      expect(entry.requirementIds.length).toBeGreaterThan(0);
      expect(entry.requirementIds).toEqual(
        expect.arrayContaining(['contract/API compatibility']),
      );
      expect(entry.commands.length).toBeGreaterThan(0);
      expect(entry.evidenceKey).not.toMatch(/placeholder|future|TODO/i);
    }
  });

  it('looks up scenarios by module and scenario type', () => {
    expect(getPhase10Scenario('ask_price', 'happy_path')).toEqual(
      expect.objectContaining({
        evidenceKey: 'ask_price:happy_path',
      }),
    );
    expect(getPhase10Scenario('missing', 'happy_path')).toBeUndefined();
  });
});
