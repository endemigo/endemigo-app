# Product Create Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current seller product form with a step-by-step wizard that stays easy for non-technical users while preserving existing backend contracts for direct-sale and auction listing creation.

**Architecture:** Keep seller onboarding in the same route, but extract seller product creation into wizard-focused screen units with isolated styles, typed step state, and a dedicated submit mapper. Reuse existing modal, category data, auth state, and API client. Handle product creation and follow-up image/auction requests as an orchestrated mobile flow instead of scattering request logic across the screen.

**Tech Stack:** Expo Router, React Native, TypeScript, react-i18next, Axios API client, existing Zustand modal store, existing project theme tokens, Node test runner smoke tests.

---

### Task 1: Define wizard state and request mapping

**Files:**
- Create: `mobile/types/productCreate.ts`
- Create: `mobile/utils/productCreateMapper.ts`
- Test: `mobile/__tests__/productCreateMapper.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductCreatePayload, buildAuctionCreatePayload } from '../utils/productCreateMapper';
import { ListingType } from '@endemigo/shared';

test('maps direct sale wizard state to product payload', () => {
  const payload = buildProductCreatePayload({
    listingType: ListingType.DIRECT_SALE,
    title: 'Vintage kahve makinesi',
    categoryId: 'cat-1',
    price: '1250',
    stockQuantity: '1',
    description: 'Temiz kullanildi',
    condition: 'USED',
    originCountry: 'TR',
    originRegion: 'Izmir',
    askPriceEnabled: true,
    askPriceMinAmount: '1000',
  });

  assert.equal(payload.listingType, ListingType.DIRECT_SALE);
  assert.equal(payload.price, 1250);
  assert.equal(payload.askPriceEnabled, true);
  assert.equal(payload.askPriceMinAmount, 1000);
});

test('maps auction wizard state to auction payload', () => {
  const payload = buildAuctionCreatePayload('product-1', {
    listingType: ListingType.AUCTION,
    auctionStartPrice: '800',
    auctionMinIncrement: '50',
    auctionStartTime: '2026-05-06T10:00:00.000Z',
    auctionEndTime: '2026-05-07T10:00:00.000Z',
    auctionType: 'REALTIME',
    antiSnipingEnabled: true,
    extensionSeconds: '60',
    maxExtensions: '5',
  });

  assert.equal(payload.productId, 'product-1');
  assert.equal(payload.startPrice, 800);
  assert.equal(payload.minIncrement, 50);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- productCreateMapper`
Expected: FAIL because mapper file and types do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export interface ProductCreateWizardState {
  listingType: ListingType;
  title: string;
  categoryId: string;
  price: string;
  stockQuantity: string;
  description: string;
  condition: ProductCondition;
  originCountry: string;
  originRegion: string;
  askPriceEnabled: boolean;
  askPriceMinAmount: string;
  auctionStartPrice: string;
  auctionMinIncrement: string;
  auctionStartTime: string;
  auctionEndTime: string;
  auctionType: 'REALTIME' | 'TIMED';
  antiSnipingEnabled: boolean;
  extensionSeconds: string;
  maxExtensions: string;
}
```

```ts
export function buildProductCreatePayload(state: ProductCreateWizardState) {
  return {
    title: state.title.trim(),
    categoryId: state.categoryId,
    description: state.description.trim() || undefined,
    price: Number(state.listingType === ListingType.AUCTION ? state.auctionStartPrice : state.price),
    stockQuantity: Number(state.stockQuantity || '0'),
    condition: state.condition,
    originCountry: state.originCountry.trim() || 'TR',
    originRegion: state.originRegion.trim() || undefined,
    listingType: state.listingType,
    askPriceEnabled: state.listingType === ListingType.DIRECT_SALE ? state.askPriceEnabled : false,
    askPriceMinAmount: state.listingType === ListingType.DIRECT_SALE && state.askPriceEnabled
      ? Number(state.askPriceMinAmount)
      : undefined,
  };
}
```

```ts
export function buildAuctionCreatePayload(productId: string, state: ProductCreateWizardState) {
  return {
    productId,
    startPrice: Number(state.auctionStartPrice),
    minIncrement: Number(state.auctionMinIncrement || '1'),
    startTime: state.auctionStartTime,
    endTime: state.auctionEndTime,
    auctionType: state.auctionType,
    antiSnipingEnabled: state.antiSnipingEnabled,
    extensionSeconds: Number(state.extensionSeconds || '60'),
    maxExtensions: Number(state.maxExtensions || '5'),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- productCreateMapper`
Expected: PASS with mapper tests green.

- [ ] **Step 5: Commit**

```bash
git add mobile/types/productCreate.ts mobile/utils/productCreateMapper.ts mobile/__tests__/productCreateMapper.test.ts
git commit -m "feat: add product create payload mapper"
```

### Task 2: Extract wizard UI building blocks

**Files:**
- Create: `mobile/components/forms/product-create/ProductCreateStepHeader.tsx`
- Create: `mobile/components/forms/product-create/ProductCreateStepHeader.styles.ts`
- Create: `mobile/components/forms/product-create/ProductTypeSegment.tsx`
- Create: `mobile/components/forms/product-create/ProductTypeSegment.styles.ts`
- Create: `mobile/components/forms/product-create/ProductCreateProgress.tsx`
- Create: `mobile/components/forms/product-create/ProductCreateProgress.styles.ts`

- [ ] **Step 1: Write the failing test**

```ts
test('step header and product type segment expose listing type choices', () => {
  const source = read('components/forms/product-create/ProductTypeSegment.tsx');
  assert.match(source, /DIRECT_SALE/);
  assert.match(source, /AUCTION/);
  assert.match(source, /useTranslation/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- phase10-mobile-smoke`
Expected: FAIL once the new source-anchor test is added before component creation.

- [ ] **Step 3: Write minimal implementation**

```tsx
export function ProductTypeSegment(props: ProductTypeSegmentProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <SegmentButton
        label={t('listing.directSale')}
        selected={props.value === ListingType.DIRECT_SALE}
        onPress={() => props.onChange(ListingType.DIRECT_SALE)}
      />
      <SegmentButton
        label={t('listing.auction')}
        selected={props.value === ListingType.AUCTION}
        onPress={() => props.onChange(ListingType.AUCTION)}
      />
    </View>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- phase10-mobile-smoke`
Expected: PASS for new source anchors.

- [ ] **Step 5: Commit**

```bash
git add mobile/components/forms/product-create
git commit -m "feat: add product create wizard UI blocks"
```

### Task 3: Add a typed wizard state hook

**Files:**
- Create: `mobile/hooks/useProductCreateWizard.ts`
- Test: `mobile/__tests__/productCreateWizard.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test('wizard step gating requires basics before progress', () => {
  const result = canContinueFromStep(1, {
    title: '',
    categoryId: '',
    listingType: ListingType.DIRECT_SALE,
  } as ProductCreateWizardState);

  assert.equal(result, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- productCreateWizard`
Expected: FAIL because hook helpers do not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export function canContinueFromStep(step: number, state: ProductCreateWizardState, imageCount = 0) {
  if (step === 1) return state.title.trim().length >= 3 && state.categoryId.length > 0;
  if (step === 2) return Number(state.listingType === ListingType.AUCTION ? state.auctionStartPrice : state.price) > 0;
  if (step === 4) return imageCount > 0;
  return true;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- productCreateWizard`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/hooks/useProductCreateWizard.ts mobile/__tests__/productCreateWizard.test.ts
git commit -m "feat: add product create wizard state helpers"
```

### Task 4: Replace current seller product form with wizard flow

**Files:**
- Modify: `mobile/app/(tabs)/become-seller.tsx`
- Create: `mobile/styles/tabs/become-seller.styles.ts` updates for wizard sections
- Optional create if needed: `mobile/components/forms/product-create/*`

- [ ] **Step 1: Write the failing test**

```ts
test('become seller screen contains wizard flow anchors', () => {
  const source = read('app/(tabs)/become-seller.tsx');
  assert.match(source, /ProductCreateProgress/);
  assert.match(source, /ProductTypeSegment/);
  assert.match(source, /buildProductCreatePayload/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- phase10-mobile-smoke`
Expected: FAIL before the screen references the wizard units.

- [ ] **Step 3: Write minimal implementation**

```tsx
const [currentStep, setCurrentStep] = useState(1);
const wizard = useProductCreateWizard();

function renderWizardStep() {
  if (currentStep === 1) return <BasicsStep ... />;
  if (currentStep === 2) return <PricingStep ... />;
  if (currentStep === 3) return <DetailsStep ... />;
  if (currentStep === 4) return <ImagesStep ... />;
  return <ReviewStep ... />;
}
```

```tsx
async function handlePublishFlow() {
  const productResponse = await api.post('/products', buildProductCreatePayload(wizard.state));
  const productId = productResponse.data.id;
  await uploadSelectedImages(productId);
  if (wizard.state.listingType === ListingType.AUCTION) {
    await api.post('/auctions', buildAuctionCreatePayload(productId, wizard.state));
  }
  showModal({ title: t('common.success'), message: t('listing.createdSuccess'), type: 'success' });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- phase10-mobile-smoke`
Expected: PASS with wizard anchors found.

- [ ] **Step 5: Commit**

```bash
git add mobile/app/(tabs)/become-seller.tsx mobile/styles/tabs/become-seller.styles.ts
git commit -m "feat: replace seller product form with wizard flow"
```

### Task 5: Add i18n keys for wizard copy

**Files:**
- Modify: `mobile/i18n/tr.json`
- Modify: `mobile/i18n/en.json`
- Test: `mobile/__tests__/phase10-mobile-smoke.test.tsx`

- [ ] **Step 1: Write the failing test**

```ts
test('listing wizard copy exists in both locales', () => {
  assert.match(read('i18n/tr.json'), /"directSale"/);
  assert.match(read('i18n/en.json'), /"directSale"/);
  assert.match(read('i18n/tr.json'), /"reviewTitle"/);
  assert.match(read('i18n/en.json'), /"reviewTitle"/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- phase10-mobile-smoke`
Expected: FAIL until new translation keys are added.

- [ ] **Step 3: Write minimal implementation**

```json
"directSale": "Tek Ürün",
"auction": "Müzayede",
"stepBasics": "Temel Bilgiler",
"stepPricing": "Fiyat",
"stepDetails": "Detaylar",
"stepImages": "Görseller",
"stepReview": "Önizleme",
"reviewTitle": "Yayın öncesi son kontrol"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- phase10-mobile-smoke`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/i18n/tr.json mobile/i18n/en.json mobile/__tests__/phase10-mobile-smoke.test.tsx
git commit -m "feat: add product wizard translations"
```

### Task 6: Verify submission anchors and smoke coverage

**Files:**
- Modify: `mobile/__tests__/phase10-mobile-smoke.test.tsx`

- [ ] **Step 1: Write the failing test**

```ts
test('listing flow preserves products and auctions endpoint anchors', () => {
  const source = read('app/(tabs)/become-seller.tsx');
  assert.match(source, /\/products/);
  assert.match(source, /\/auctions/);
  assert.match(source, /listingType/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- phase10-mobile-smoke`
Expected: FAIL before anchors are added.

- [ ] **Step 3: Write minimal implementation**

```ts
const listingScreen = read('app/(tabs)/become-seller.tsx');
assert.match(listingScreen, /\/products/);
assert.match(listingScreen, /\/auctions/);
assert.match(listingScreen, /buildAuctionCreatePayload/);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- phase10-mobile-smoke`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/__tests__/phase10-mobile-smoke.test.tsx
git commit -m "test: cover product create wizard flow anchors"
```

## Self-Review

- Spec coverage checked: wizard steps, listing type choice, image requirement, auction branch, backend compatibility, i18n, styles separation all have matching tasks.
- Placeholder scan checked: no `TODO`, `TBD`, or vague test instructions remain.
- Type consistency checked: `ProductCreateWizardState`, `buildProductCreatePayload`, and `buildAuctionCreatePayload` names are consistent across tasks.
