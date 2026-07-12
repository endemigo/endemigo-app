import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// cwd is the mobile package when run via `npm test` / `node --test`.
const MOBILE_DIR = process.cwd().endsWith(`${path.sep}mobile`)
  ? process.cwd()
  : path.join(process.cwd(), 'mobile');
const REPO_ROOT = path.resolve(MOBILE_DIR, '..');

const readMobile = (rel: string) => readFileSync(path.join(MOBILE_DIR, rel), 'utf8');
const readRepo = (rel: string) => readFileSync(path.join(REPO_ROOT, rel), 'utf8');

const wizardSource = readMobile('components/forms/product-create/ProductCreateWizard.tsx');
const wizardHookSource = readMobile('hooks/useProductCreateWizard.ts');
const localDraftSource = readMobile('services/localListingDraftService.ts');
const becomeSellerSource = readMobile('app/(tabs)/become-seller.tsx');
const tabsLayoutSource = readMobile('app/(tabs)/_layout.tsx');
const rootLayoutSource = readMobile('app/_layout.tsx');
const auctionControllerSource = readRepo('backend/src/modules/auction/auction.controller.ts');

test('guest can reach the listing wizard (auth gate + tab open to guests)', () => {
  // /become-seller no longer forces login in the AuthGate allow-list.
  assert.doesNotMatch(rootLayoutSource, /['"]\/become-seller['"]/);
  // Listing tab press opens the entry-mode sheet instead of a login wall.
  assert.match(tabsLayoutSource, /setIsEntryModeModalVisible\(true\)/);
  // Guest branch renders the wizard; only logged-in non-sellers see the application form.
  assert.match(becomeSellerSource, /isLoggedIn && !isSeller/);
});

test('auction events feed is public so guests can pick an event', () => {
  assert.match(auctionControllerSource, /@Public\(\)\s*@Get\('events'\)/);
});

test('auction step gating requires an event before advancing', () => {
  // Step 1 blocks auction listings until an event is chosen.
  assert.match(
    wizardHookSource,
    /listingType === PRODUCT_CREATE_LISTING_TYPES\.AUCTION && !state\.selectedEventId/,
  );
  // Wizard step 1 surfaces the auction event selector.
  assert.match(wizardSource, /Müzayede Etkinliği Seçin/);
});

test('non-seller draft saves route to the local (device) store, entryMode-agnostic', () => {
  // Wizard routes non-seller saves to the local service and only sellers hit the backend.
  assert.match(wizardSource, /canUseBackendDrafts/);
  assert.match(wizardSource, /saveLocalListingDraft\(/);
  // Local service persists whatever entryMode it is given (AUCTION or MARKETPLACE).
  assert.match(localDraftSource, /entryMode: input\.entryMode/);
  assert.match(localDraftSource, /isLocal: true/);
});

test('guest final step saves the draft then routes to sign-up (no publish)', () => {
  assert.match(wizardSource, /handleGuestFinalCta/);
  assert.match(wizardSource, /guestSignUpCta/);
  // Publish (handleSubmit) is gated behind seller in the primary action dispatcher.
  assert.match(wizardSource, /if \(isSeller\) \{\s*void handleSubmit\(\);/);
});

test('resuming a local draft is branched by id and graduates to backend for sellers', () => {
  assert.match(wizardSource, /isLocalDraftId\(/);
  assert.match(localDraftSource, /LOCAL_DRAFT_ID_PREFIX = 'local:'/);
  // On seller save of a local draft, the backend draft is created and the local copy removed.
  assert.match(wizardSource, /deleteLocalListingDraft\(draftId\)/);
});
