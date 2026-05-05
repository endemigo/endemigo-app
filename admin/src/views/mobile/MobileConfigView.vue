<template>
  <section class="mobile-config-view">
    <header class="page-header mobile-header">
      <div>
        <h1>Mobil Uygulama</h1>
        <p class="muted">
          Home ekranini telefon preview uzerinden duzenle. Ilk fazda hedef high-fidelity parity.
        </p>
      </div>
      <div class="toolbar mobile-toolbar">
        <span class="status-pill">mobile-config</span>
        <span class="status-pill ghost">{{ draft ? 'Draft hazir' : 'Draft yukleniyor' }}</span>
        <button class="button" type="button" @click="loadDraft">
          <i class="pi pi-refresh" aria-hidden="true" />
          Yenile
        </button>
        <button class="button primary" type="button" :disabled="loading || !draft" @click="openReason('save')">
          <i class="pi pi-save" aria-hidden="true" />
          Taslagi Kaydet
        </button>
        <button class="button primary" type="button" :disabled="loading || !draft" @click="openReason('publish')">
          <i class="pi pi-send" aria-hidden="true" />
          Yayinla
        </button>
      </div>
    </header>

    <div v-if="draft" class="editor-layout">
      <aside class="panel navigator-panel">
        <div class="panel-header">
          <div>
            <strong>Home Navigator</strong>
            <div class="muted">Hero, entryTiles, section ve trust bloklari</div>
          </div>
        </div>
        <div class="panel-body navigator-body">
          <div class="navigator-meta-grid">
            <div class="meta-chip">
              <span>heroBanners</span>
              <strong>{{ draft.home.heroBanners.length }}</strong>
            </div>
            <div class="meta-chip">
              <span>entryTiles</span>
              <strong>{{ draft.home.entryTiles.length }}</strong>
            </div>
            <div class="meta-chip">
              <span>otherSurfaces</span>
              <strong>{{ draft.otherSurfaces.length }}</strong>
            </div>
          </div>

          <div class="navigator-actions">
            <button class="button" type="button" @click="addHeroBanner">Hero Ekle</button>
            <button class="button" type="button" @click="addEntryTile">Kart Ekle</button>
            <button class="button" type="button" @click="addHomeSection">Section Ekle</button>
          </div>

          <section
            v-for="group in navigatorGroups"
            :key="group.id"
            class="navigator-group"
          >
            <div class="navigator-group-header">
              <strong>{{ group.title }}</strong>
              <span class="muted">{{ group.items.length }} blok</span>
            </div>

            <button
              v-for="item in group.items"
              :key="item.id"
              class="navigator-item"
              :class="{ selected: isSelected(item.kind, item.id) }"
              type="button"
              @click="selectTarget(item.kind, item.id)"
            >
              <span class="navigator-item-main">
                <span class="navigator-item-title">{{ item.label }}</span>
                <span class="navigator-item-subtitle">{{ item.subtitle }}</span>
              </span>
              <span class="navigator-item-side">
                <span class="navigator-order">#{{ item.order }}</span>
                <span class="navigator-visibility" :class="{ hidden: !item.enabled }">
                  {{ item.enabled ? 'Visible' : 'Hidden' }}
                </span>
              </span>
            </button>
          </section>

          <div class="navigator-note">
            <strong>Ilk Faz</strong>
            <p class="muted">
              Preview sadece Home icin birebir yaklastiriliyor. Diger yuzeyler sonraki fazda bu akisa alinacak.
            </p>
          </div>
        </div>
      </aside>

      <section class="panel preview-panel">
        <div class="panel-header">
          <div>
            <strong>Home Preview</strong>
            <div class="muted">preview, selectedLocale ve selectedAudience ile gercege yakin gorunum</div>
          </div>
          <div class="toolbar preview-toolbar">
            <div class="toggle-group">
              <button
                class="button"
                :class="{ active: selectedDevice === 'iphone' }"
                type="button"
                @click="selectedDevice = 'iphone'"
              >
                iPhone
              </button>
              <button
                class="button"
                :class="{ active: selectedDevice === 'android' }"
                type="button"
                @click="selectedDevice = 'android'"
              >
                Small Android
              </button>
            </div>

            <label class="field compact-field">
              <span>Dil</span>
              <select v-model="selectedLocale" class="select">
                <option value="tr">TR</option>
                <option value="en">EN</option>
              </select>
            </label>

            <label class="field compact-field">
              <span>Audience</span>
              <select v-model="selectedAudience" class="select">
                <option v-for="option in audienceOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>
          </div>
        </div>

        <div class="panel-body preview-stage">
          <div class="device-shell" :class="`device-${selectedDevice}`">
            <div class="device-notch" />
            <div class="device-screen">
              <div class="preview-status-row">
                <span>09:41</span>
                <span>{{ selectedDevice === 'iphone' ? '5G 100%' : '4G 86%' }}</span>
              </div>

              <div class="preview-search">
                <i class="pi pi-search" aria-hidden="true" />
                <span>{{ selectedLocale === 'tr' ? 'Yoresel urun ara' : 'Search local products' }}</span>
              </div>

              <div class="preview-scroll">
                <button
                  v-for="banner in previewHeroBanners"
                  :key="banner.id"
                  class="preview-hero-card"
                  :class="{ selected: isSelected('hero', banner.id) }"
                  type="button"
                  @click="selectTarget('hero', banner.id)"
                >
                  <div
                    class="preview-hero-cover"
                    :style="{
                      backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.28), rgba(15, 23, 42, 0.74)), url(${banner.imageUrl})`,
                    }"
                  >
                    <span class="preview-badge">{{ textOf(banner.badge, 'Badge') }}</span>
                    <strong>{{ textOf(banner.title, 'Hero Baslik') }}</strong>
                    <p>{{ textOf(banner.subtitle, 'Hero aciklama') }}</p>
                    <span class="preview-cta">{{ textOf(banner.cta.label, 'CTA') }}</span>
                  </div>
                </button>

                <div class="preview-entry-grid">
                  <button
                    v-for="tile in previewEntryTiles"
                    :key="tile.id"
                    class="preview-entry-card"
                    :class="{ selected: isSelected('entry', tile.id) }"
                    type="button"
                    @click="selectTarget('entry', tile.id)"
                  >
                    <div class="preview-entry-icon" :class="entryTileAccentClass(tile.id)">
                      <i :class="entryTileIcon(tile.id)" aria-hidden="true" />
                    </div>
                    <strong>{{ textOf(tile.title, 'Kart Baslik') }}</strong>
                    <p>{{ textOf(tile.subtitle, 'Kart aciklama') }}</p>
                    <span>{{ textOf(tile.cta.label, 'Aksiyon') }}</span>
                  </button>
                </div>

                <button
                  v-for="section in previewSections"
                  :key="section.id"
                  class="preview-section-card"
                  :class="{ selected: isSelected('section', section.id) }"
                  type="button"
                  @click="selectTarget('section', section.id)"
                >
                  <div class="preview-section-header">
                    <div>
                      <strong>{{ textOf(section.title, section.id) }}</strong>
                      <p>{{ previewSectionDescription(section.id) }}</p>
                    </div>
                    <span>{{ textOf(section.seeAllLabel, 'Tumunu Gor') }}</span>
                  </div>
                  <div class="preview-section-track">
                    <div
                      v-for="slot in previewSectionSlots(section.id)"
                      :key="slot"
                      class="preview-product-slot"
                    >
                      <span>{{ slot }}</span>
                    </div>
                  </div>
                </button>

                <div class="preview-story-rail" v-if="previewPromoBanners.length">
                  <button
                    v-for="promo in previewPromoBanners"
                    :key="promo.id"
                    class="preview-promo-card"
                    :class="{ selected: isSelected('promo', promo.id) }"
                    type="button"
                    @click="selectTarget('promo', promo.id)"
                  >
                    <span class="preview-badge subtle">{{ textOf(promo.label, 'Kampanya') }}</span>
                    <strong>{{ textOf(promo.title, 'Promo Baslik') }}</strong>
                    <p>{{ textOf(promo.subtitle, 'Promo alt metin') }}</p>
                    <span class="preview-cta">{{ textOf(promo.cta.label, 'Aksiyon') }}</span>
                  </button>
                </div>

                <button
                  v-if="previewTrustBlock"
                  class="preview-trust-card"
                  :class="{ selected: isSelected('trust', previewTrustBlock.id) }"
                  type="button"
                  @click="selectTarget('trust', previewTrustBlock.id)"
                >
                  <div class="preview-trust-header">
                    <span class="preview-badge subtle">Trust</span>
                    <span>{{ textOf(previewTrustBlock.cta.label, 'Bildirim') }}</span>
                  </div>
                  <strong>{{ textOf(previewTrustBlock.title, 'Guven Merkezi') }}</strong>
                  <p>{{ textOf(previewTrustBlock.subtitle, 'Guven aciklamasi') }}</p>
                </button>
              </div>

              <div class="preview-tabbar">
                <span class="active">Home</span>
                <span>Search</span>
                <span>Fav</span>
                <span>Auctions</span>
                <span>Cart</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside class="panel drawer-panel">
        <div class="panel-header">
          <div>
            <strong>{{ selectedBlockTitle }}</strong>
            <div class="muted">{{ selectedBlockDescription }}</div>
          </div>
          <span class="status-pill" :class="{ ghost: !selectedBlockEnabled }">
            {{ selectedBlockEnabled ? 'Visible' : 'Hidden' }}
          </span>
        </div>

        <div v-if="selectedTarget" class="panel-body drawer-body">
          <div class="drawer-tabs">
            <button
              v-for="tab in drawerTabs"
              :key="tab.value"
              class="button"
              :class="{ active: activeDrawerTab === tab.value }"
              type="button"
              @click="activeDrawerTab = tab.value"
            >
              {{ tab.label }}
            </button>
          </div>

          <p v-if="!selectedBlockVisibleForAudience" class="drawer-note">
            Secili blok mevcut audience filtresinde gorunmuyor. Yine de burada duzenleyebilirsin.
          </p>

          <div v-if="activeDrawerTab === 'content'" class="drawer-form">
            <template v-if="selectedHeroBanner">
              <LocalizedField label="Badge TR" v-model="selectedHeroBanner.badge.tr" />
              <LocalizedField label="Badge EN" v-model="selectedHeroBanner.badge.en" />
              <LocalizedField label="Baslik TR" v-model="selectedHeroBanner.title.tr" />
              <LocalizedField label="Baslik EN" v-model="selectedHeroBanner.title.en" />
              <LocalizedField label="Alt Metin TR" v-model="selectedHeroBanner.subtitle.tr" />
              <LocalizedField label="Alt Metin EN" v-model="selectedHeroBanner.subtitle.en" />
              <LocalizedField label="CTA TR" v-model="selectedHeroBanner.cta.label.tr" />
              <LocalizedField label="CTA EN" v-model="selectedHeroBanner.cta.label.en" />
              <label class="field">
                <span>CTA Route</span>
                <input v-model.trim="selectedHeroBanner.cta.route" class="input" type="text" />
              </label>
              <label class="field">
                <span>Gorsel URL</span>
                <input v-model.trim="selectedHeroBanner.imageUrl" class="input" type="text" />
              </label>
            </template>

            <template v-else-if="selectedEntryTile">
              <LocalizedField label="Baslik TR" v-model="selectedEntryTile.title.tr" />
              <LocalizedField label="Baslik EN" v-model="selectedEntryTile.title.en" />
              <LocalizedField label="Alt Metin TR" v-model="selectedEntryTile.subtitle.tr" />
              <LocalizedField label="Alt Metin EN" v-model="selectedEntryTile.subtitle.en" />
              <LocalizedField label="CTA TR" v-model="selectedEntryTile.cta.label.tr" />
              <LocalizedField label="CTA EN" v-model="selectedEntryTile.cta.label.en" />
              <label class="field">
                <span>CTA Route</span>
                <input v-model.trim="selectedEntryTile.cta.route" class="input" type="text" />
              </label>
            </template>

            <template v-else-if="selectedHomeSection">
              <LocalizedField label="Baslik TR" v-model="selectedHomeSection.title.tr" />
              <LocalizedField label="Baslik EN" v-model="selectedHomeSection.title.en" />
              <LocalizedField label="See All TR" v-model="selectedHomeSection.seeAllLabel.tr" />
              <LocalizedField label="See All EN" v-model="selectedHomeSection.seeAllLabel.en" />
              <label class="field">
                <span>See All Route</span>
                <input v-model.trim="selectedHomeSection.route" class="input" type="text" />
              </label>
            </template>

            <template v-else-if="selectedPromoBanner">
              <LocalizedField label="Label TR" v-model="selectedPromoBanner.label.tr" />
              <LocalizedField label="Label EN" v-model="selectedPromoBanner.label.en" />
              <LocalizedField label="Baslik TR" v-model="selectedPromoBanner.title.tr" />
              <LocalizedField label="Baslik EN" v-model="selectedPromoBanner.title.en" />
              <LocalizedField label="Alt Metin TR" v-model="selectedPromoBanner.subtitle.tr" />
              <LocalizedField label="Alt Metin EN" v-model="selectedPromoBanner.subtitle.en" />
              <LocalizedField label="CTA TR" v-model="selectedPromoBanner.cta.label.tr" />
              <LocalizedField label="CTA EN" v-model="selectedPromoBanner.cta.label.en" />
              <label class="field">
                <span>CTA Route</span>
                <input v-model.trim="selectedPromoBanner.cta.route" class="input" type="text" />
              </label>
              <label class="field">
                <span>Gorsel URL</span>
                <input v-model.trim="selectedPromoBanner.imageUrl" class="input" type="text" />
              </label>
            </template>

            <template v-else-if="selectedTrustBlock">
              <LocalizedField label="Baslik TR" v-model="selectedTrustBlock.title.tr" />
              <LocalizedField label="Baslik EN" v-model="selectedTrustBlock.title.en" />
              <LocalizedField label="Alt Metin TR" v-model="selectedTrustBlock.subtitle.tr" />
              <LocalizedField label="Alt Metin EN" v-model="selectedTrustBlock.subtitle.en" />
              <LocalizedField label="CTA TR" v-model="selectedTrustBlock.cta.label.tr" />
              <LocalizedField label="CTA EN" v-model="selectedTrustBlock.cta.label.en" />
              <label class="field">
                <span>CTA Route</span>
                <input v-model.trim="selectedTrustBlock.cta.route" class="input" type="text" />
              </label>
            </template>
          </div>

          <div v-else-if="activeDrawerTab === 'visibility'" class="drawer-form">
            <label class="checkbox-pill full-width">
              <input :checked="selectedBlockEnabled" type="checkbox" @change="toggleSelectedEnabled" />
              <span>{{ selectedBlockEnabled ? 'Blok gorunur' : 'Blok gizli' }}</span>
            </label>

            <div class="audience-stack">
              <span class="audience-label">Audience</span>
              <label
                v-for="option in audienceOptions"
                :key="`drawer-${option.value}`"
                class="checkbox-pill full-width"
              >
                <input
                  :checked="selectedBlockAudiences.includes(option.value)"
                  type="checkbox"
                  @change="toggleSelectedAudience(option.value)"
                />
                <span>{{ option.label }}</span>
              </label>
            </div>
          </div>

          <div v-else class="drawer-form">
            <label class="field">
              <span>Sira</span>
              <input v-model.number="selectedBlockOrderModel" class="input" type="number" min="1" />
            </label>

            <div class="drawer-action-row">
              <button class="button" type="button" @click="moveSelectedBlock(-1)">Yukari Al</button>
              <button class="button" type="button" @click="moveSelectedBlock(1)">Asagi Al</button>
            </div>

            <button
              v-if="selectedTarget?.kind !== 'section'"
              class="button danger full-width"
              type="button"
              @click="deleteSelectedBlock"
            >
              Bloku Sil
            </button>
          </div>
        </div>

        <div v-else class="panel-body empty-drawer">
          <strong>Duzenlemek icin blok sec</strong>
          <p class="muted">
            Telefon preview uzerinden ya da soldaki navigator'dan bir blok sec. Sag drawer sadece o blok icin acilir.
          </p>
        </div>

        <div class="drawer-footer">
          <div class="history-row">
            <span>Publish History</span>
            <strong>{{ publishedAtLabel }}</strong>
          </div>
          <div class="history-row">
            <span>Son Guncelleyen</span>
            <strong>{{ updatedByLabel }}</strong>
          </div>
          <div class="history-row">
            <span>Yayinlayan</span>
            <strong>{{ publishedByLabel }}</strong>
          </div>
        </div>
      </aside>
    </div>

    <p v-if="error" class="error-text">{{ error }}</p>

    <AdminActionDrawer
      :open="reasonDrawerOpen"
      :title="pendingAction === 'publish' ? 'Yayinla' : 'Taslagi Kaydet'"
      :fields="[]"
      :confirm-label="pendingAction === 'publish' ? 'Yayinla' : 'Kaydet'"
      @close="closeReasonDrawer"
      @confirm="submitReasonedAction"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AdminActionDrawer, { type DrawerConfirmPayload } from '../../components/AdminActionDrawer.vue';
import LocalizedField from '../../components/LocalizedField.vue';
import { adminApi, toApiMessage } from '../../services/api';

interface LocalizedText {
  tr: string;
  en: string;
}

interface CtaConfig {
  label: LocalizedText;
  route: string;
}

interface AudienceBlock {
  id: string;
  type: string;
  surface: string;
  enabled: boolean;
  order: number;
  audiences: string[];
}

interface HeroBanner extends AudienceBlock {
  badge: LocalizedText;
  title: LocalizedText;
  subtitle: LocalizedText;
  imageUrl: string;
  cta: CtaConfig;
}

interface EntryTile extends AudienceBlock {
  title: LocalizedText;
  subtitle: LocalizedText;
  cta: CtaConfig;
}

interface HomeSection extends AudienceBlock {
  title: LocalizedText;
  seeAllLabel: LocalizedText;
  route: string;
}

interface PromoBanner extends AudienceBlock {
  label: LocalizedText;
  title: LocalizedText;
  subtitle: LocalizedText;
  imageUrl?: string;
  cta: CtaConfig;
}

interface TrustBlock extends AudienceBlock {
  title: LocalizedText;
  subtitle: LocalizedText;
  cta: CtaConfig;
}

interface ProductCardConfig {
  badge: LocalizedText;
  ctaLabel: LocalizedText;
  showCategory: boolean;
  showPrice: boolean;
  showAskPriceBadge: boolean;
}

interface AuctionListCardConfig {
  ctaLabel: LocalizedText;
  liveBadgeLabel: LocalizedText;
  showBidCount: boolean;
  showStatusBadge: boolean;
  showTimer: boolean;
}

interface SurfaceSlot extends AudienceBlock {
  title: LocalizedText;
  subtitle: LocalizedText;
  cta: CtaConfig;
  surface: string;
}

interface MobileConfigDraft {
  schemaVersion: number;
  home: {
    heroBanners: HeroBanner[];
    entryTiles: EntryTile[];
    sections: HomeSection[];
    promoBanners: PromoBanner[];
    trustBlocks: TrustBlock[];
  };
  cards: {
    productCard: ProductCardConfig;
  };
  auctions: {
    listCard: AuctionListCardConfig;
  };
  otherSurfaces: SurfaceSlot[];
  preview: {
    defaultAudience: string;
    defaultLocale: 'tr' | 'en';
  };
}

interface MobileConfigDocument {
  draft: MobileConfigDraft;
  publishedAt: string | null;
  updatedByAdminId: string | null;
  publishedByAdminId: string | null;
}

interface NavigatorItem {
  id: string;
  kind: EditorTargetKind;
  label: string;
  subtitle: string;
  order: number;
  enabled: boolean;
}

interface NavigatorGroup {
  id: string;
  title: string;
  items: NavigatorItem[];
}

type PendingAction = 'save' | 'publish' | null;
type PreviewLocale = 'tr' | 'en';
type DevicePreset = 'iphone' | 'android';
type DrawerTab = 'content' | 'visibility' | 'order';
type EditorTargetKind = 'hero' | 'entry' | 'section' | 'promo' | 'trust';

interface EditorTarget {
  kind: EditorTargetKind;
  id: string;
}

const loading = ref(false);
const error = ref<string | null>(null);
const draft = ref<MobileConfigDraft | null>(null);
const publishedAt = ref<string | null>(null);
const updatedByAdminId = ref<string | null>(null);
const publishedByAdminId = ref<string | null>(null);
const selectedLocale = ref<PreviewLocale>('tr');
const selectedAudience = ref('BUYER');
const selectedDevice = ref<DevicePreset>('iphone');
const selectedTarget = ref<EditorTarget | null>(null);
const activeDrawerTab = ref<DrawerTab>('content');
const reasonDrawerOpen = ref(false);
const pendingAction = ref<PendingAction>(null);

const audienceOptions = [
  { label: 'Guest', value: 'GUEST' },
  { label: 'Buyer', value: 'BUYER' },
  { label: 'Seller', value: 'SELLER' },
];

const drawerTabs = [
  { label: 'Icerik', value: 'content' as DrawerTab },
  { label: 'Gorunurluk', value: 'visibility' as DrawerTab },
  { label: 'Siralama', value: 'order' as DrawerTab },
];

const SECTION_COPY: Record<string, { tr: string; en: string }> = {
  'recently-viewed': { tr: 'Son gezilen urun raili', en: 'Recent product rail' },
  listings: { tr: 'One cikan urun bandi', en: 'Featured listing strip' },
  categories: { tr: 'Kategori kisayollari', en: 'Category shortcuts' },
  'discounted-products': { tr: 'Indirimli urunler', en: 'Discount deal cards' },
  'most-liked-products': { tr: 'Topluluk favorileri', en: 'Community favorites' },
  campaigns: { tr: 'Kampanya alanlari', en: 'Campaign content slots' },
  blog: { tr: 'Blog kartlari', en: 'Blog story cards' },
  'trust-hub': { tr: 'Guven aciklama modulu', en: 'Trust explanation module' },
};

const PREVIEW_SECTION_SLOTS: Record<string, string[]> = {
  'recently-viewed': ['Bal', 'Yag', 'Sabun'],
  listings: ['Ilan 1', 'Ilan 2', 'Ilan 3'],
  categories: ['Gida', 'Yag', 'Taki'],
  'discounted-products': ['%20', '%15', '%10'],
  'most-liked-products': ['Like', 'Like', 'Like'],
  campaigns: ['Kampanya', 'Kampanya', 'Kampanya'],
  blog: ['Blog', 'Blog', 'Blog'],
  'trust-hub': ['Onay', 'Orijin', 'Guven'],
};

function localizedText(tr = '', en = ''): LocalizedText {
  return { tr, en };
}

function ctaConfig(route = '/home'): CtaConfig {
  return { label: localizedText(), route };
}

function cloneDraft(value: MobileConfigDraft): MobileConfigDraft {
  return JSON.parse(JSON.stringify(value)) as MobileConfigDraft;
}

function ensureLocalizedText(value?: Partial<LocalizedText>): LocalizedText {
  return {
    tr: value?.tr ?? '',
    en: value?.en ?? '',
  };
}

function normalizeDraft(value: MobileConfigDraft): MobileConfigDraft {
  const normalized = cloneDraft(value);

  normalized.home.heroBanners = normalized.home.heroBanners.map((banner) => ({
    ...banner,
    badge: ensureLocalizedText(banner.badge),
    title: ensureLocalizedText(banner.title),
    subtitle: ensureLocalizedText(banner.subtitle),
    cta: {
      route: banner.cta?.route ?? '',
      label: ensureLocalizedText(banner.cta?.label),
    },
  }));

  normalized.home.entryTiles = normalized.home.entryTiles.map((tile) => ({
    ...tile,
    title: ensureLocalizedText(tile.title),
    subtitle: ensureLocalizedText(tile.subtitle),
    cta: {
      route: tile.cta?.route ?? '',
      label: ensureLocalizedText(tile.cta?.label),
    },
  }));

  normalized.home.sections = normalized.home.sections.map((section) => ({
    ...section,
    title: ensureLocalizedText(section.title),
    seeAllLabel: ensureLocalizedText(section.seeAllLabel),
    route: section.route ?? '',
  }));

  normalized.home.promoBanners = normalized.home.promoBanners.map((promo) => ({
    ...promo,
    label: ensureLocalizedText(promo.label),
    title: ensureLocalizedText(promo.title),
    subtitle: ensureLocalizedText(promo.subtitle),
    imageUrl: promo.imageUrl ?? '',
    cta: {
      route: promo.cta?.route ?? '',
      label: ensureLocalizedText(promo.cta?.label),
    },
  }));

  normalized.home.trustBlocks = normalized.home.trustBlocks.map((trust) => ({
    ...trust,
    title: ensureLocalizedText(trust.title),
    subtitle: ensureLocalizedText(trust.subtitle),
    cta: {
      route: trust.cta?.route ?? '',
      label: ensureLocalizedText(trust.cta?.label),
    },
  }));

  normalized.cards.productCard = {
    ...normalized.cards.productCard,
    badge: ensureLocalizedText(normalized.cards.productCard.badge),
    ctaLabel: ensureLocalizedText(normalized.cards.productCard.ctaLabel),
  };

  normalized.auctions.listCard = {
    ...normalized.auctions.listCard,
    ctaLabel: ensureLocalizedText(normalized.auctions.listCard.ctaLabel),
    liveBadgeLabel: ensureLocalizedText(normalized.auctions.listCard.liveBadgeLabel),
  };

  normalized.otherSurfaces = normalized.otherSurfaces.map((surface) => ({
    ...surface,
    title: ensureLocalizedText(surface.title),
    subtitle: ensureLocalizedText(surface.subtitle),
    cta: {
      route: surface.cta?.route ?? '',
      label: ensureLocalizedText(surface.cta?.label),
    },
  }));

  return normalized;
}

function textOf(value: Partial<LocalizedText> | undefined, fallback: string): string {
  const resolved = selectedLocale.value === 'tr' ? value?.tr : value?.en;
  return resolved?.trim() || value?.tr?.trim() || value?.en?.trim() || fallback;
}

function matchesAudience(audiences: string[]): boolean {
  return audiences.includes(selectedAudience.value);
}

function sortByOrder<T extends { order: number }>(items: T[]): T[] {
  return [...items].sort((left, right) => left.order - right.order);
}

function toggleAudience(audiences: string[], audience: string) {
  const index = audiences.indexOf(audience);
  if (index >= 0) {
    if (audiences.length > 1) {
      audiences.splice(index, 1);
    }
    return;
  }

  audiences.push(audience);
}

function moveArrayItem<T extends { order: number }>(items: T[], index: number, delta: number) {
  const target = index + delta;
  if (target < 0 || target >= items.length) {
    return;
  }

  const [item] = items.splice(index, 1);
  items.splice(target, 0, item);
  items.forEach((entry, currentIndex) => {
    entry.order = currentIndex + 1;
  });
}

function removeArrayItem<T>(items: T[], index: number) {
  items.splice(index, 1);
}

function selectTarget(kind: EditorTargetKind, id: string) {
  selectedTarget.value = { kind, id };
  activeDrawerTab.value = 'content';
}

function isSelected(kind: EditorTargetKind, id: string): boolean {
  return selectedTarget.value?.kind === kind && selectedTarget.value?.id === id;
}

function selectFirstBlock() {
  if (!draft.value) return;
  const firstHero = sortByOrder(draft.value.home.heroBanners)[0];
  if (firstHero) {
    selectTarget('hero', firstHero.id);
    return;
  }

  const firstEntry = sortByOrder(draft.value.home.entryTiles)[0];
  if (firstEntry) {
    selectTarget('entry', firstEntry.id);
    return;
  }

  const firstSection = sortByOrder(draft.value.home.sections)[0];
  if (firstSection) {
    selectTarget('section', firstSection.id);
    return;
  }

  selectedTarget.value = null;
}

function entryTileIcon(id: string): string {
  return id.includes('auction') ? 'pi pi-hammer' : 'pi pi-shopping-bag';
}

function entryTileAccentClass(id: string): string {
  return id.includes('auction') ? 'is-auction' : 'is-buy-now';
}

function previewSectionDescription(id: string): string {
  const copy = SECTION_COPY[id];
  return selectedLocale.value === 'tr' ? copy?.tr ?? 'Home bolumu' : copy?.en ?? 'Home section';
}

function previewSectionSlots(id: string): string[] {
  return PREVIEW_SECTION_SLOTS[id] ?? ['Kart', 'Kart', 'Kart'];
}

const selectedHeroBanner = computed(() => {
  if (!draft.value || selectedTarget.value?.kind !== 'hero') return null;
  return draft.value.home.heroBanners.find((item) => item.id === selectedTarget.value?.id) ?? null;
});

const selectedEntryTile = computed(() => {
  if (!draft.value || selectedTarget.value?.kind !== 'entry') return null;
  return draft.value.home.entryTiles.find((item) => item.id === selectedTarget.value?.id) ?? null;
});

const selectedHomeSection = computed(() => {
  if (!draft.value || selectedTarget.value?.kind !== 'section') return null;
  return draft.value.home.sections.find((item) => item.id === selectedTarget.value?.id) ?? null;
});

const selectedPromoBanner = computed(() => {
  if (!draft.value || selectedTarget.value?.kind !== 'promo') return null;
  return draft.value.home.promoBanners.find((item) => item.id === selectedTarget.value?.id) ?? null;
});

const selectedTrustBlock = computed(() => {
  if (!draft.value || selectedTarget.value?.kind !== 'trust') return null;
  return draft.value.home.trustBlocks.find((item) => item.id === selectedTarget.value?.id) ?? null;
});

const selectedBlock = computed(() => {
  return (
    selectedHeroBanner.value ??
    selectedEntryTile.value ??
    selectedHomeSection.value ??
    selectedPromoBanner.value ??
    selectedTrustBlock.value
  );
});

const selectedBlockTitle = computed(() => {
  if (!selectedBlock.value || !selectedTarget.value) {
    return 'Blok Secimi';
  }

  switch (selectedTarget.value.kind) {
    case 'hero':
      return textOf(selectedHeroBanner.value?.title, selectedHeroBanner.value?.id ?? 'Hero');
    case 'entry':
      return textOf(selectedEntryTile.value?.title, selectedEntryTile.value?.id ?? 'Entry');
    case 'section':
      return textOf(selectedHomeSection.value?.title, selectedHomeSection.value?.id ?? 'Section');
    case 'promo':
      return textOf(selectedPromoBanner.value?.title, selectedPromoBanner.value?.id ?? 'Promo');
    case 'trust':
      return textOf(selectedTrustBlock.value?.title, selectedTrustBlock.value?.id ?? 'Trust');
    default:
      return 'Blok Secimi';
  }
});

const selectedBlockDescription = computed(() => {
  if (!selectedTarget.value) {
    return 'Telefon preview uzerinden bir blok sec';
  }

  const descriptions: Record<EditorTargetKind, string> = {
    hero: 'Hero banner metni, gorseli ve CTA ayarlari',
    entry: 'Ana kart baslik, alt metin ve CTA ayarlari',
    section: 'Section baslik, see all ve siralama ayarlari',
    promo: 'Kampanya karti metin ve CTA ayarlari',
    trust: 'Guven modulu metin ve aksiyon ayarlari',
  };

  return descriptions[selectedTarget.value.kind];
});

const selectedBlockEnabled = computed(() => selectedBlock.value?.enabled ?? false);

const selectedBlockVisibleForAudience = computed(() =>
  selectedBlock.value ? matchesAudience(selectedBlock.value.audiences) && selectedBlock.value.enabled : true,
);

const selectedBlockAudiences = computed(() => selectedBlock.value?.audiences ?? []);

const selectedBlockOrderModel = computed({
  get: () => selectedBlock.value?.order ?? 1,
  set: (value: number) => {
    if (!selectedBlock.value) return;
    selectedBlock.value.order = Number.isFinite(value) ? Math.max(1, value) : 1;
  },
});

const navigatorGroups = computed<NavigatorGroup[]>(() => {
  if (!draft.value) return [];

  return [
    {
      id: 'heroes',
      title: 'Hero Banners',
      items: sortByOrder(draft.value.home.heroBanners).map((item) => ({
        id: item.id,
        kind: 'hero',
        label: textOf(item.title, item.id),
        subtitle: textOf(item.badge, 'Hero'),
        order: item.order,
        enabled: item.enabled,
      })),
    },
    {
      id: 'entry',
      title: 'Entry Tiles',
      items: sortByOrder(draft.value.home.entryTiles).map((item) => ({
        id: item.id,
        kind: 'entry',
        label: textOf(item.title, item.id),
        subtitle: textOf(item.cta.label, 'CTA'),
        order: item.order,
        enabled: item.enabled,
      })),
    },
    {
      id: 'sections',
      title: 'Home Sections',
      items: sortByOrder(draft.value.home.sections).map((item) => ({
        id: item.id,
        kind: 'section',
        label: textOf(item.title, item.id),
        subtitle: previewSectionDescription(item.id),
        order: item.order,
        enabled: item.enabled,
      })),
    },
    {
      id: 'promos',
      title: 'Promo Banners',
      items: sortByOrder(draft.value.home.promoBanners).map((item) => ({
        id: item.id,
        kind: 'promo',
        label: textOf(item.title, item.id),
        subtitle: textOf(item.label, 'Promo'),
        order: item.order,
        enabled: item.enabled,
      })),
    },
    {
      id: 'trust',
      title: 'Trust',
      items: sortByOrder(draft.value.home.trustBlocks).map((item) => ({
        id: item.id,
        kind: 'trust',
        label: textOf(item.title, item.id),
        subtitle: textOf(item.cta.label, 'Trust'),
        order: item.order,
        enabled: item.enabled,
      })),
    },
  ].filter((group) => group.items.length > 0);
});

const previewHeroBanners = computed(() =>
  sortByOrder(draft.value?.home.heroBanners ?? []).filter(
    (item) => item.enabled && matchesAudience(item.audiences),
  ),
);

const previewEntryTiles = computed(() =>
  sortByOrder(draft.value?.home.entryTiles ?? []).filter(
    (item) => item.enabled && matchesAudience(item.audiences),
  ),
);

const previewSections = computed(() =>
  sortByOrder(draft.value?.home.sections ?? []).filter(
    (item) => item.enabled && matchesAudience(item.audiences),
  ),
);

const previewPromoBanners = computed(() =>
  sortByOrder(draft.value?.home.promoBanners ?? []).filter(
    (item) => item.enabled && matchesAudience(item.audiences),
  ),
);

const previewTrustBlock = computed(
  () =>
    sortByOrder(draft.value?.home.trustBlocks ?? []).find(
      (item) => item.enabled && matchesAudience(item.audiences),
    ) ?? null,
);

const publishedAtLabel = computed(() =>
  publishedAt.value ? new Date(publishedAt.value).toLocaleString('tr-TR') : '-',
);
const updatedByLabel = computed(() => updatedByAdminId.value ?? '-');
const publishedByLabel = computed(() => publishedByAdminId.value ?? '-');

function toggleSelectedEnabled() {
  if (!selectedBlock.value) return;
  selectedBlock.value.enabled = !selectedBlock.value.enabled;
}

function toggleSelectedAudience(audience: string) {
  if (!selectedBlock.value) return;
  toggleAudience(selectedBlock.value.audiences, audience);
}

function collectionForKind(kind: EditorTargetKind) {
  if (!draft.value) return [];
  switch (kind) {
    case 'hero':
      return draft.value.home.heroBanners;
    case 'entry':
      return draft.value.home.entryTiles;
    case 'section':
      return draft.value.home.sections;
    case 'promo':
      return draft.value.home.promoBanners;
    case 'trust':
      return draft.value.home.trustBlocks;
    default:
      return [];
  }
}

function moveSelectedBlock(delta: number) {
  if (!selectedTarget.value) return;
  const collection = collectionForKind(selectedTarget.value.kind);
  const currentIndex = collection.findIndex((item) => item.id === selectedTarget.value?.id);
  if (currentIndex < 0) return;
  moveArrayItem(collection as Array<{ order: number }>, currentIndex, delta);
}

function deleteSelectedBlock() {
  if (!selectedTarget.value || selectedTarget.value.kind === 'section') return;
  const collection = collectionForKind(selectedTarget.value.kind);
  const currentIndex = collection.findIndex((item) => item.id === selectedTarget.value?.id);
  if (currentIndex < 0) return;
  removeArrayItem(collection, currentIndex);
  selectFirstBlock();
}

function addHeroBanner() {
  draft.value?.home.heroBanners.push({
    id: `hero-${Date.now()}`,
    type: 'HERO_BANNER',
    surface: 'HOME',
    enabled: true,
    order: (draft.value.home.heroBanners.at(-1)?.order ?? 0) + 1,
    audiences: ['BUYER'],
    badge: localizedText(),
    title: localizedText(),
    subtitle: localizedText(),
    imageUrl: '',
    cta: ctaConfig('/(tabs)/categories'),
  });

  const latest = draft.value?.home.heroBanners.at(-1);
  if (latest) selectTarget('hero', latest.id);
}

function addEntryTile() {
  draft.value?.home.entryTiles.push({
    id: `tile-${Date.now()}`,
    type: 'ENTRY_TILE',
    surface: 'HOME',
    enabled: true,
    order: (draft.value.home.entryTiles.at(-1)?.order ?? 0) + 1,
    audiences: ['BUYER'],
    title: localizedText(),
    subtitle: localizedText(),
    cta: ctaConfig('/buy-now'),
  });

  const latest = draft.value?.home.entryTiles.at(-1);
  if (latest) selectTarget('entry', latest.id);
}

function addHomeSection() {
  draft.value?.home.sections.push({
    id: `section-${Date.now()}`,
    type: 'HOME_SECTION',
    surface: 'HOME',
    enabled: true,
    order: (draft.value.home.sections.at(-1)?.order ?? 0) + 1,
    audiences: ['BUYER'],
    title: localizedText(),
    seeAllLabel: localizedText(),
    route: '/(tabs)/categories',
  });

  const latest = draft.value?.home.sections.at(-1);
  if (latest) selectTarget('section', latest.id);
}

function addSurfaceSlot() {
  draft.value?.otherSurfaces.push({
    id: `surface-${Date.now()}`,
    type: 'SURFACE_SLOT',
    enabled: true,
    order: (draft.value.otherSurfaces.at(-1)?.order ?? 0) + 1,
    audiences: ['BUYER'],
    title: localizedText(),
    subtitle: localizedText(),
    cta: ctaConfig('/home'),
    surface: 'BUY_NOW',
  });
}

function openReason(action: Exclude<PendingAction, null>) {
  pendingAction.value = action;
  reasonDrawerOpen.value = true;
}

function closeReasonDrawer() {
  reasonDrawerOpen.value = false;
  pendingAction.value = null;
}

async function loadDraft() {
  loading.value = true;
  error.value = null;

  try {
    const response = await adminApi.get<{ document: MobileConfigDocument }>('/admin/mobile-config/draft');
    const document = response.data.document;
    const normalizedDraft = normalizeDraft(document.draft);
    draft.value = normalizedDraft;
    selectedLocale.value = normalizedDraft.preview.defaultLocale;
    selectedAudience.value = normalizedDraft.preview.defaultAudience;
    publishedAt.value = document.publishedAt;
    updatedByAdminId.value = document.updatedByAdminId;
    publishedByAdminId.value = document.publishedByAdminId;

    if (!selectedTarget.value) {
      selectFirstBlock();
    } else if (!selectedBlock.value) {
      selectFirstBlock();
    }
  } catch (loadError) {
    error.value = toApiMessage(loadError);
  } finally {
    loading.value = false;
  }
}

async function submitReasonedAction(payload: DrawerConfirmPayload) {
  if (!draft.value || !pendingAction.value) {
    return;
  }

  try {
    if (pendingAction.value === 'save') {
      await adminApi.patch('/admin/mobile-config/draft', {
        draft: draft.value,
        reason: payload.reason,
      });
    } else {
      await adminApi.post('/admin/mobile-config/publish', {
        reason: payload.reason,
      });
    }

    closeReasonDrawer();
    await loadDraft();
  } catch (actionError) {
    error.value = toApiMessage(actionError);
  }
}

onMounted(loadDraft);
</script>

<style scoped>
.mobile-config-view {
  display: grid;
  gap: 16px;
}

.mobile-header {
  align-items: flex-start;
}

.mobile-toolbar {
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.status-pill {
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  padding: 6px 12px;
  color: #0f172a;
  font-size: 12px;
  font-weight: 700;
  background: #eef6ff;
}

.status-pill.ghost {
  background: #ffffff;
  color: #475569;
}

.editor-layout {
  display: grid;
  gap: 16px;
  grid-template-columns: 280px minmax(0, 1fr) 360px;
  align-items: start;
}

.navigator-panel,
.preview-panel,
.drawer-panel {
  min-height: 720px;
}

.navigator-body,
.drawer-body,
.preview-stage {
  display: grid;
  gap: 16px;
}

.navigator-meta-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.meta-chip {
  border: 1px solid #d7e3f4;
  border-radius: 16px;
  background: #f8fbff;
  padding: 10px 12px;
}

.meta-chip span,
.meta-chip strong {
  display: block;
}

.meta-chip span {
  color: #64748b;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.meta-chip strong {
  margin-top: 4px;
  color: #0f172a;
  font-size: 18px;
}

.navigator-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.navigator-group {
  display: grid;
  gap: 8px;
}

.navigator-group-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.navigator-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  border: 1px solid #d9e0e4;
  border-radius: 16px;
  background: #ffffff;
  padding: 12px 14px;
  text-align: left;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.navigator-item:hover,
.navigator-item.selected {
  border-color: #2563eb;
  box-shadow: 0 10px 25px rgba(37, 99, 235, 0.12);
  transform: translateY(-1px);
}

.navigator-item-main {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.navigator-item-title {
  color: #0f172a;
  font-weight: 700;
}

.navigator-item-subtitle {
  color: #64748b;
  font-size: 12px;
}

.navigator-item-side {
  display: grid;
  justify-items: end;
  gap: 4px;
}

.navigator-order {
  color: #0f172a;
  font-size: 12px;
  font-weight: 700;
}

.navigator-visibility {
  color: #15803d;
  font-size: 11px;
  font-weight: 700;
}

.navigator-visibility.hidden {
  color: #b91c1c;
}

.navigator-note {
  border-top: 1px solid #e2e8f0;
  padding-top: 16px;
}

.preview-toolbar {
  align-items: end;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.toggle-group {
  display: flex;
  gap: 8px;
}

.toggle-group .button.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
}

.compact-field {
  min-width: 110px;
}

.compact-field span {
  display: block;
  margin-bottom: 4px;
  color: #475569;
  font-size: 12px;
}

.preview-stage {
  place-items: center;
}

.device-shell {
  position: relative;
  border: 10px solid #0f172a;
  border-radius: 42px;
  background: #0f172a;
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.18);
}

.device-iphone {
  width: 348px;
}

.device-android {
  width: 332px;
  border-radius: 28px;
}

.device-notch {
  width: 112px;
  height: 20px;
  border-radius: 0 0 16px 16px;
  background: #0b1120;
  margin: 0 auto;
}

.device-android .device-notch {
  width: 86px;
  height: 14px;
}

.device-screen {
  min-height: 690px;
  max-height: 690px;
  overflow: hidden;
  border-radius: 32px;
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.1), transparent 38%),
    linear-gradient(180deg, #f8fbff 0%, #f3f7fb 46%, #eef2f7 100%);
  padding: 14px 14px 16px;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: 12px;
}

.device-android .device-screen {
  border-radius: 20px;
}

.preview-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #0f172a;
  font-size: 12px;
  font-weight: 700;
  padding: 2px 4px 0;
}

.preview-search {
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(203, 213, 225, 0.9);
  padding: 12px 14px;
  color: #64748b;
}

.preview-scroll {
  display: grid;
  gap: 14px;
  overflow: auto;
  padding-right: 4px;
}

.preview-hero-card,
.preview-entry-card,
.preview-section-card,
.preview-promo-card,
.preview-trust-card {
  width: 100%;
  border: 1px solid transparent;
  background: transparent;
  text-align: left;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.preview-hero-card.selected,
.preview-entry-card.selected,
.preview-section-card.selected,
.preview-promo-card.selected,
.preview-trust-card.selected,
.preview-hero-card:hover,
.preview-entry-card:hover,
.preview-section-card:hover,
.preview-promo-card:hover,
.preview-trust-card:hover {
  transform: translateY(-1px);
  border-color: #2563eb;
  box-shadow: 0 14px 28px rgba(37, 99, 235, 0.15);
}

.preview-hero-card {
  border-radius: 26px;
  overflow: hidden;
}

.preview-hero-cover {
  min-height: 172px;
  border-radius: 22px;
  padding: 18px;
  background-position: center;
  background-size: cover;
  color: #ffffff;
  display: grid;
  align-content: end;
  gap: 8px;
}

.preview-hero-cover strong {
  font-size: 22px;
  line-height: 1.08;
}

.preview-hero-cover p {
  margin: 0;
  color: rgba(255, 255, 255, 0.88);
}

.preview-badge {
  width: fit-content;
  border-radius: 999px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.preview-badge.subtle {
  background: rgba(15, 23, 42, 0.08);
  color: #1d4ed8;
}

.preview-cta {
  width: fit-content;
  border-radius: 999px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.92);
  color: #0f172a;
  font-size: 12px;
  font-weight: 700;
}

.preview-entry-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.preview-entry-card {
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.94);
  padding: 14px;
  display: grid;
  gap: 8px;
}

.preview-entry-card strong,
.preview-section-card strong,
.preview-promo-card strong,
.preview-trust-card strong {
  color: #0f172a;
}

.preview-entry-card p,
.preview-section-card p,
.preview-promo-card p,
.preview-trust-card p {
  margin: 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.45;
}

.preview-entry-card span {
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 700;
}

.preview-entry-icon {
  width: 38px;
  height: 38px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 16px;
  color: #ffffff;
}

.preview-entry-icon.is-buy-now {
  background: linear-gradient(135deg, #2563eb, #38bdf8);
}

.preview-entry-icon.is-auction {
  background: linear-gradient(135deg, #15803d, #22c55e);
}

.preview-section-card,
.preview-trust-card {
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.94);
  padding: 14px;
  display: grid;
  gap: 12px;
}

.preview-section-header,
.preview-trust-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.preview-section-header span,
.preview-trust-header span {
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 700;
}

.preview-section-track,
.preview-story-rail {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.preview-product-slot {
  aspect-ratio: 0.84;
  border-radius: 18px;
  background: linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%);
  display: grid;
  place-items: end start;
  padding: 12px;
  color: #1e3a8a;
  font-size: 12px;
  font-weight: 700;
}

.preview-promo-card {
  border-radius: 22px;
  background: linear-gradient(135deg, #fff7ed 0%, #fff1f2 100%);
  padding: 14px;
  display: grid;
  gap: 8px;
}

.preview-story-rail {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.preview-trust-card {
  background: linear-gradient(135deg, #eff6ff 0%, #ecfeff 100%);
}

.preview-tabbar {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(203, 213, 225, 0.9);
  padding: 12px 10px;
  color: #64748b;
  font-size: 11px;
  text-align: center;
}

.preview-tabbar .active {
  color: #0f172a;
  font-weight: 800;
}

.drawer-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.drawer-tabs .button.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
}

.drawer-form {
  display: grid;
  gap: 12px;
}

.drawer-note {
  border: 1px solid #bfdbfe;
  border-radius: 14px;
  background: #eff6ff;
  padding: 12px;
  color: #1e3a8a;
  font-size: 13px;
}

.drawer-action-row {
  display: flex;
  gap: 8px;
}

.full-width {
  width: 100%;
}

.audience-stack {
  display: grid;
  gap: 10px;
}

.audience-label {
  color: #475569;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.empty-drawer {
  align-content: center;
  gap: 8px;
  min-height: 420px;
}

.drawer-footer {
  margin-top: auto;
  border-top: 1px solid #e2e8f0;
  padding: 16px 20px 20px;
  display: grid;
  gap: 10px;
}

.history-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.history-row span {
  color: #64748b;
  font-size: 12px;
}

.history-row strong {
  color: #0f172a;
}

@media (max-width: 1380px) {
  .editor-layout {
    grid-template-columns: 240px minmax(0, 1fr) 320px;
  }
}

@media (max-width: 1180px) {
  .editor-layout {
    grid-template-columns: 1fr;
  }

  .navigator-panel,
  .preview-panel,
  .drawer-panel {
    min-height: auto;
  }

  .preview-toolbar,
  .mobile-toolbar {
    justify-content: flex-start;
  }
}
</style>
