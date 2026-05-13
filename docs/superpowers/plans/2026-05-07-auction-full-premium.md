# Auction Detail Full Premium Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the mobile auction detail screen into a premium, trust-forward auction experience without breaking live bidding behavior.

**Architecture:** Keep auction fetching and bidding logic in the screen, but move presentation into focused auction components with co-located style files. Enrich the screen with product detail data, a premium hero, trust/rule panels, and a stronger bid history while preserving existing socket-driven auction updates.

**Tech Stack:** Expo Router, React Native, TypeScript, TanStack Query, react-i18next, Jest smoke tests

---

### Task 1: Lock the premium screen contract with tests

**Files:**
- Create: `mobile/__tests__/auctionDetailPremium.test.ts`

- [ ] **Step 1: Write the failing test**

Add a smoke test that reads the auction detail source and asserts the new premium building blocks and i18n keys exist:

```ts
test('auction detail premium screen exposes premium sections', () => {
  assert.match(screenSource, /AuctionHero/);
  assert.match(screenSource, /AuctionSummaryPanel/);
  assert.match(screenSource, /AuctionRulesPanel/);
  assert.match(screenSource, /AuctionBidHistory/);
  assert.match(i18nTr, /premiumTrustTitle/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runTestsByPath __tests__/auctionDetailPremium.test.ts`
Expected: FAIL because the new components/keys do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create the premium components, styles, and translation keys referenced by the test.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runTestsByPath __tests__/auctionDetailPremium.test.ts`
Expected: PASS

### Task 2: Refactor the screen into premium presentation units

**Files:**
- Create: `mobile/app/auction/[id].styles.ts`
- Create: `mobile/components/auction/AuctionHero.tsx`
- Create: `mobile/components/auction/AuctionHero.styles.ts`
- Create: `mobile/components/auction/AuctionSummaryPanel.tsx`
- Create: `mobile/components/auction/AuctionSummaryPanel.styles.ts`
- Create: `mobile/components/auction/AuctionRulesPanel.tsx`
- Create: `mobile/components/auction/AuctionRulesPanel.styles.ts`
- Create: `mobile/components/auction/AuctionBidHistory.tsx`
- Create: `mobile/components/auction/AuctionBidHistory.styles.ts`
- Modify: `mobile/app/auction/[id].tsx`
- Delete: `mobile/styles/auction/[id].styles.ts`

- [ ] **Step 1: Move screen-only styling next to the screen**

Create `mobile/app/auction/[id].styles.ts` and keep only container, scroll, sticky area, and layout styles there.

- [ ] **Step 2: Build a premium hero**

Create `AuctionHero` with image overlay, live/status badges, seller/trust chips, lot number, title, and viewer state.

- [ ] **Step 3: Build the premium summary panel**

Create `AuctionSummaryPanel` for current price, start price, buyer premium, countdown, wallet, min bid, seller mode, and result CTAs.

- [ ] **Step 4: Build the trust and rules panel**

Create `AuctionRulesPanel` for auction type, anti-sniping, extension status, cultural restriction, and product description/category data.

- [ ] **Step 5: Build a stronger bid history panel**

Create `AuctionBidHistory` showing rank, bidder, amount, time, and premium metadata.

### Task 3: Enrich screen data and translations

**Files:**
- Modify: `mobile/hooks/useAuctions.ts`
- Modify: `mobile/app/auction/[id].tsx`
- Modify: `mobile/i18n/tr.json`
- Modify: `mobile/i18n/en.json`

- [ ] **Step 1: Expand the auction detail type where needed**

Add any response fields used by the new layout while keeping strict typing.

- [ ] **Step 2: Pull product detail data for the premium story section**

Use `useProduct(auction.productId)` and map description, category, condition, and image fallbacks into the new panels.

- [ ] **Step 3: Add the new i18n keys**

Add all premium section labels/messages in both `tr.json` and `en.json`.

### Task 4: Verify

**Files:**
- Test: `mobile/__tests__/auctionDetailPremium.test.ts`
- Test: `mobile`

- [ ] **Step 1: Run premium auction smoke test**

Run: `npm test -- --runTestsByPath __tests__/auctionDetailPremium.test.ts`
Expected: PASS

- [ ] **Step 2: Run broader mobile smoke suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Run type check**

Run: `npm run typecheck`
Expected: PASS
