# Phase 10 OTA Rollback Runbook

## Channels

Endemigo uses two Expo OTA channels for Phase 10:

- `staging` validates bundles before production exposure.
- `production` receives only bundles that passed staging checks.

Run updates from the `mobile` package directory or through the package scripts:

```bash
npm --prefix mobile run ota:update:staging
npm --prefix mobile run ota:update:production
```

## Runtime Version

`mobile/app.json` uses `runtimeVersion.policy = appVersion`. A JavaScript OTA update is compatible only with builds sharing the same native runtime version. Native dependency or config changes require a new store/internal build before OTA rollout.

## Publish

Expected EAS commands:

```bash
eas update --channel staging --message "staging OTA"
eas update --channel production --message "production OTA"
```

Publish to `staging` first. Production publish is allowed only after the Phase 10 staging regression report records backend, admin, mobile, contract, OTA, and blocker checks.

## Rollback

If a staging update fails, republish the last known-good bundle to `staging` or use the EAS dashboard rollback controls.

If a production update fails:

1. Stop further production publishes.
2. Identify the last known-good production update group.
3. Republish the known-good bundle to `production` or use the EAS dashboard rollback controls.
4. Re-run `npm --prefix mobile run ota:config:check`.
5. Record the incident in `.planning/reports/phase10/staging-regression-report.md`.

## Verification

Run:

```bash
npm --prefix mobile run ota:config:check
rg -n "staging|production|runtime version|rollback|silent|external|environment|code blocker" docs/ota-rollback-runbook.md
```

The mobile app remains silent OTA baseline in Phase 10. Do not add update prompts, modals, banners, settings screens, or user-visible update center UI.

## Blocker Classification

- Missing EAS auth, project access, Apple/Google account access, or production credentials are external/environment blockers.
- Missing `staging` or `production` channels, missing `runtimeVersion`, missing `updates.url`, broken `ota:config:check`, or accidental user-visible update UI are code blockers.
- External/environment blockers must be reported clearly, but they do not hide code blockers.
