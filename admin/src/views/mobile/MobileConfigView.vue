<template>
  <section class="mobile-config-view">
    <header class="page-header mobile-header">
      <div>
        <h1>{{ pageTitle }}</h1>
        <p class="muted">
          {{ pageSubtitle }}
        </p>
      </div>
      <div class="toolbar mobile-toolbar">
        <span class="status-pill">mobile-config</span>
        <span class="status-pill ghost">v{{ documentVersion }}</span>
        <span class="status-pill ghost">{{ draft ? 'Draft hazir' : 'Draft yukleniyor' }}</span>
        <div class="toggle-group mode-toggle">
          <button
            class="button"
            :class="{ active: workspaceMode === 'focused' }"
            type="button"
            @click="workspaceMode = 'focused'"
          >
            Sade Mod
          </button>
          <button
            class="button"
            :class="{ active: workspaceMode === 'full' }"
            type="button"
            @click="workspaceMode = 'full'"
          >
            Tam Gorunum
          </button>
        </div>
        <button class="button" type="button" @click="loadDraft">
          <i class="pi pi-refresh" aria-hidden="true" />
          Yenile
        </button>
        <button v-if="draft && !showWorkspaceLauncher" class="button" type="button" @click="showWorkspaceLauncher = true">
          <i class="pi pi-th-large" aria-hidden="true" />
          Alan Sec
        </button>
        <button class="button primary" type="button" :disabled="loading || !draft" @click="openReason('save')">
          <i class="pi pi-save" aria-hidden="true" />
          Taslagi Kaydet
        </button>
        <button class="button primary" type="button" :disabled="loading || !draft || !canPublish" @click="openReason('publish')">
          <i class="pi pi-send" aria-hidden="true" />
          Yayinla
        </button>
      </div>
    </header>

    <section v-if="draft && !showWorkspaceLauncher" class="workflow-strip">
      <button
        class="workflow-step"
        :class="{ active: focusStage === 'select' }"
        type="button"
        @click="focusStage = 'select'"
      >
        <span class="step-index">1</span>
        <span class="step-copy">
          <strong>Blok Sec</strong>
          <small>Soldan bir alan sec</small>
        </span>
      </button>
      <button
        class="workflow-step"
        :class="{ active: focusStage === 'preview' }"
        type="button"
        @click="focusStage = 'preview'"
      >
        <span class="step-index">2</span>
        <span class="step-copy">
          <strong>Onizle</strong>
          <small>Cihaz, dil ve audience kontrol et</small>
        </span>
      </button>
      <button
        class="workflow-step"
        :class="{ active: focusStage === 'edit' }"
        type="button"
        @click="focusStage = 'edit'"
      >
        <span class="step-index">3</span>
        <span class="step-copy">
          <strong>Duzenle</strong>
          <small>{{ selectedTarget ? selectedBlockTitle : 'Sag panelde ayar yap' }}</small>
        </span>
      </button>
    </section>

    <section v-if="draft && !showWorkspaceLauncher" class="workspace-context">
      <div>
        <strong>{{ currentWorkspaceTitle }}</strong>
        <p class="muted">{{ currentWorkspaceDescription }}</p>
      </div>
      <div class="toolbar">
        <button class="button" type="button" @click="showWorkspaceLauncher = true">
          <i class="pi pi-arrow-left" aria-hidden="true" />
          Alanlara Don
        </button>
      </div>
    </section>

    <section v-if="draft && showWorkspaceLauncher" class="workspace-launcher">
      <header class="launcher-header">
        <strong>Hangi alani duzenlemek istiyorsun?</strong>
        <p class="muted">Bir kutucuga tikla, yalnizca ilgili ayarlar acilsin.</p>
      </header>
      <div class="launcher-grid">
        <button class="launcher-card" type="button" @click="openWorkspaceArea('home')">
          <i class="pi pi-home" aria-hidden="true" />
          <strong>Ana Sayfayi Duzenle</strong>
          <span>Hero, kartlar, bolum siralamasi ve onizleme</span>
        </button>
        <button class="launcher-card" type="button" @click="openWorkspaceArea('listing')">
          <i class="pi pi-file-edit" aria-hidden="true" />
          <strong>Ilan Verme Ayarlari</strong>
          <span>Kullaniciya sorulacak alanlari sec</span>
        </button>
        <button class="launcher-card" type="button" @click="openWorkspaceArea('membership')">
          <i class="pi pi-star" aria-hidden="true" />
          <strong>Abone Olma Ayarlari</strong>
          <span>Uyelik/abonelik yuzeyindeki metin ve CTA ayarlari</span>
        </button>
        <button class="launcher-card" type="button" @click="openWorkspaceArea('become-seller')">
          <i class="pi pi-briefcase" aria-hidden="true" />
          <strong>Satıcı Olma Ayarları</strong>
          <span>Satıcı olma ekranına ait metin ve yönlendirmeleri düzenle</span>
        </button>
      </div>
    </section>

    <div
      v-if="draft && !showWorkspaceLauncher"
      class="editor-layout"
      :class="[
        `mode-${workspaceMode}`,
        `stage-${focusStage}`,
      ]"
    >
      <aside class="panel navigator-panel">
        <div class="panel-header">
          <div>
            <strong>Mobile Navigator</strong>
            <div class="muted">Home + card templates + other surfaces</div>
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
            <button class="button" type="button" @click="addSurfaceSlot">Surface Ekle</button>
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
            <strong>Yonetim Notu</strong>
            <p class="muted">
              Anasayfa bolumleri, Product/Auction card ve diger surface alanlari bu panelden yonetilir.
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

                <button
                  class="preview-card-template"
                  :class="{ selected: isSelected('product-card', 'product-card') }"
                  type="button"
                  @click="selectTarget('product-card', 'product-card')"
                >
                  <div class="preview-card-template-head">
                    <span class="preview-badge subtle">{{ textOf(draft.cards.productCard.badge, 'Product') }}</span>
                    <span>{{ draft.cards.productCard.showPrice ? 'Fiyat Acik' : 'Fiyat Kapali' }}</span>
                  </div>
                  <strong>{{ selectedLocale === 'tr' ? 'Ürün Kartı' : 'Product Card' }}</strong>
                  <p>{{ textOf(draft.cards.productCard.ctaLabel, 'Incele') }}</p>
                </button>

                <button
                  class="preview-card-template"
                  :class="{ selected: isSelected('auction-card', 'auction-card') }"
                  type="button"
                  @click="selectTarget('auction-card', 'auction-card')"
                >
                  <div class="preview-card-template-head">
                    <span class="preview-badge subtle">{{ textOf(draft.auctions.listCard.liveBadgeLabel, 'Live') }}</span>
                    <span>{{ draft.auctions.listCard.showTimer ? 'Sayaç Acik' : 'Sayaç Kapali' }}</span>
                  </div>
                  <strong>{{ selectedLocale === 'tr' ? 'Muzayede Karti' : 'Auction Card' }}</strong>
                  <p>{{ textOf(draft.auctions.listCard.ctaLabel, 'Teklif Ver') }}</p>
                </button>

                <div v-if="previewOtherSurfaces.length" class="preview-surface-stack">
                  <button
                    v-for="surface in previewOtherSurfaces"
                    :key="surface.id"
                    class="preview-surface-card"
                    :class="{ selected: isSelected('surface', surface.id) }"
                    type="button"
                    @click="selectTarget('surface', surface.id)"
                  >
                    <div class="preview-card-template-head">
                      <span class="preview-badge subtle">{{ surface.surface }}</span>
                      <span>#{{ surface.order }}</span>
                    </div>
                    <strong>{{ textOf(surface.title, surface.id) }}</strong>
                    <p>{{ textOf(surface.subtitle, 'Surface aciklamasi') }}</p>
                  </button>
                </div>
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
          <div v-if="activeDrawerTabs.length > 1" class="drawer-tabs">
            <button
              v-for="tab in activeDrawerTabs"
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
            <div v-if="validationIssues.length" class="validation-box">
              <strong>Alan Bazli Hatalar</strong>
              <ul>
                <li v-for="issue in validationIssues" :key="`${issue.path}-${issue.code}`">
                  <span>{{ issue.path }}</span>
                  <p>{{ issue.message }}</p>
                </li>
              </ul>
            </div>

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

            <template v-else-if="selectedProductCard">
              <LocalizedField label="Badge TR" v-model="selectedProductCard.badge.tr" />
              <LocalizedField label="Badge EN" v-model="selectedProductCard.badge.en" />
              <LocalizedField label="CTA TR" v-model="selectedProductCard.ctaLabel.tr" />
              <LocalizedField label="CTA EN" v-model="selectedProductCard.ctaLabel.en" />
              <label class="checkbox-pill full-width">
                <input v-model="selectedProductCard.showCategory" type="checkbox" />
                <span>Kategori gorunsun</span>
              </label>
              <label class="checkbox-pill full-width">
                <input v-model="selectedProductCard.showPrice" type="checkbox" />
                <span>Fiyat gorunsun</span>
              </label>
              <label class="checkbox-pill full-width">
                <input v-model="selectedProductCard.showAskPriceBadge" type="checkbox" />
                <span>Fiyat sor badge gorunsun</span>
              </label>
            </template>

            <template v-else-if="selectedAuctionListCard">
              <LocalizedField label="Live Badge TR" v-model="selectedAuctionListCard.liveBadgeLabel.tr" />
              <LocalizedField label="Live Badge EN" v-model="selectedAuctionListCard.liveBadgeLabel.en" />
              <LocalizedField label="CTA TR" v-model="selectedAuctionListCard.ctaLabel.tr" />
              <LocalizedField label="CTA EN" v-model="selectedAuctionListCard.ctaLabel.en" />
              <label class="checkbox-pill full-width">
                <input v-model="selectedAuctionListCard.showBidCount" type="checkbox" />
                <span>Teklif sayisi gorunsun</span>
              </label>
              <label class="checkbox-pill full-width">
                <input v-model="selectedAuctionListCard.showStatusBadge" type="checkbox" />
                <span>Status badge gorunsun</span>
              </label>
              <label class="checkbox-pill full-width">
                <input v-model="selectedAuctionListCard.showTimer" type="checkbox" />
                <span>Sure sayaci gorunsun</span>
              </label>
            </template>

            <template v-else-if="selectedListingCreateConfig">
              <div class="drawer-note">
                Bu alandaki secimler mobilde Ilan Ver adimlarinda kullaniciya gosterilecek opsiyonel kalemleri belirler.
              </div>
              <section
                v-for="group in LISTING_CREATE_FIELD_GROUPS"
                :key="`listing-field-group-${group.id}`"
                class="listing-field-group"
              >
                <header class="listing-field-group-header">
                  <strong>{{ group.title }}</strong>
                  <span>{{ group.options.filter((option) => selectedListingCreateConfig.optionalFields.includes(option.key)).length }}/{{ group.options.length }}</span>
                </header>
                <label
                  v-for="requiredOption in group.requiredOptions"
                  :key="`listing-required-${requiredOption.key}`"
                  class="checkbox-pill full-width is-required"
                >
                  <input checked type="checkbox" disabled />
                  <span>{{ requiredOption.label }}</span>
                  <span class="required-badge">Zorunlu</span>
                </label>
                <label
                  v-for="option in group.options"
                  :key="`listing-field-${option.key}`"
                  class="checkbox-pill full-width"
                >
                  <input
                    :checked="selectedListingCreateConfig.optionalFields.includes(option.key)"
                    type="checkbox"
                    @change="toggleListingCreateField(option.key)"
                  />
                  <span>{{ option.label }}</span>
                </label>
              </section>
            </template>

            <template v-else-if="selectedSurfaceSlot">
              <LocalizedField label="Baslik TR" v-model="selectedSurfaceSlot.title.tr" />
              <LocalizedField label="Baslik EN" v-model="selectedSurfaceSlot.title.en" />
              <LocalizedField label="Alt Metin TR" v-model="selectedSurfaceSlot.subtitle.tr" />
              <LocalizedField label="Alt Metin EN" v-model="selectedSurfaceSlot.subtitle.en" />
              <LocalizedField label="CTA TR" v-model="selectedSurfaceSlot.cta.label.tr" />
              <LocalizedField label="CTA EN" v-model="selectedSurfaceSlot.cta.label.en" />
              <label class="field">
                <span>CTA Route</span>
                <input v-model.trim="selectedSurfaceSlot.cta.route" class="input" type="text" />
              </label>
              <label class="field">
                <span>Surface Key</span>
                <select v-model="selectedSurfaceSlot.surface" class="select">
                  <option v-for="surface in SURFACE_OPTIONS" :key="surface" :value="surface">
                    {{ surface }}
                  </option>
                </select>
              </label>
            </template>
          </div>

          <div v-else-if="activeDrawerTab === 'visibility'" class="drawer-form">
            <template v-if="selectedTargetSupportsVisibility">
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
            </template>
            <div v-else class="drawer-note">
              Card template ayarlari globaldir. Audience/visibility filtresi uygulanmaz.
            </div>
          </div>

          <div v-else class="drawer-form">
            <template v-if="selectedTargetSupportsOrder">
              <label class="field">
                <span>Sira</span>
                <input v-model.number="selectedBlockOrderModel" class="input" type="number" min="1" />
              </label>

              <div class="drawer-action-row">
                <button class="button" type="button" @click="moveSelectedBlock(-1)">Yukari Al</button>
                <button class="button" type="button" @click="moveSelectedBlock(1)">Asagi Al</button>
              </div>
            </template>
            <div v-else class="drawer-note">
              Card template ayarlari tekil oldugu icin siralama yoktur.
            </div>

            <button
              v-if="selectedTargetSupportsDelete"
              class="button danger full-width"
              type="button"
              :disabled="selectedTarget?.kind === 'section' && draft.home.sections.length <= 1"
              @click="deleteSelectedBlock"
            >
              Bloku Sil
            </button>
            <p v-if="selectedTarget?.kind === 'section' && draft.home.sections.length <= 1" class="muted">
              Son section silinemez, en az 1 section kalmali.
            </p>
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

    <section v-if="draft" class="panel insights-panel">
      <div class="panel-header">
        <div>
          <strong>Publish Insights</strong>
          <div class="muted">Checklist, draft/published diff ve audit ozeti</div>
        </div>
      </div>
      <div class="panel-body insights-grid">
        <article class="insight-card">
          <h3>Pre-publish Checklist</h3>
          <ul class="insight-list">
            <li v-for="item in prePublishChecklist" :key="item.key" :class="{ pass: item.passed, fail: !item.passed }">
              <span>{{ item.passed ? 'PASS' : 'BLOCK' }}</span>
              <p>{{ item.label }}</p>
            </li>
          </ul>
        </article>

        <article class="insight-card">
          <h3>Draft vs Published Diff</h3>
          <ul v-if="diffEntries.length" class="diff-list">
            <li v-for="entry in diffEntries" :key="entry.path">
              <strong>{{ entry.path }}</strong>
              <p>{{ entry.before }} -> {{ entry.after }}</p>
            </li>
          </ul>
          <p v-else class="muted">Draft ile published su an ayni.</p>
        </article>

        <article class="insight-card">
          <h3>Audit Ozet</h3>
          <ul v-if="auditSummary.length" class="audit-list">
            <li v-for="item in auditSummary" :key="item.id">
              <strong>{{ item.action }}</strong>
              <p>Admin: {{ item.actorAdminId }} | v{{ item.metadata?.version ?? documentVersion }}</p>
              <p>Tarih: {{ new Date(item.createdAt).toLocaleString('tr-TR') }}</p>
              <p>Target: {{ item.targetId }}</p>
              <p>{{ item.reason || 'Gerekce girilmedi' }}</p>
            </li>
          </ul>
          <p v-else class="muted">Audit kaydi bulunamadi.</p>
        </article>
      </div>
    </section>

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
import axios from 'axios';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute } from 'vue-router';
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
  surface?: string;
  badge: LocalizedText;
  ctaLabel: LocalizedText;
  showCategory: boolean;
  showPrice: boolean;
  showAskPriceBadge: boolean;
  audienceOverrides?: Record<string, Partial<{
    badge: LocalizedText;
    ctaLabel: LocalizedText;
    showPrice: boolean;
    showAskPriceBadge: boolean;
  }>>;
}

interface AuctionListCardConfig {
  surface?: string;
  ctaLabel: LocalizedText;
  liveBadgeLabel: LocalizedText;
  showBidCount: boolean;
  showStatusBadge: boolean;
  showTimer: boolean;
  audienceOverrides?: Record<string, Partial<{
    ctaLabel: LocalizedText;
    liveBadgeLabel: LocalizedText;
    showBidCount: boolean;
    showStatusBadge: boolean;
    showTimer: boolean;
  }>>;
}

const LISTING_CREATE_FIELD_GROUPS = [
  {
    id: 'step-core',
    title: '1. Temel + Fiyat + Detay',
    requiredOptions: [
      { key: 'listingType', label: 'Satış modeli' },
      { key: 'title', label: 'Ürün başlığı' },
      { key: 'categoryId', label: 'Kategori' },
      { key: 'price', label: 'Fiyat' },
      { key: 'askPriceEnabled', label: 'Pazarlığa açık' },
      { key: 'description', label: 'Açıklama' },
      { key: 'stockQuantity', label: 'Stok adedi' },
    ],
    options: [
      { key: 'originRegion', label: 'Menşei il' },
    ],
  },
  {
    id: 'step-shipping-payment',
    title: '2. Kargo ve Odeme',
    requiredOptions: [],
    options: [
      { key: 'originCountry', label: 'Menşei ülke' },
      { key: 'shippingProvince', label: 'Kargo teslim ili' },
      { key: 'shippingDistrict', label: 'Kargo teslim ilçesi' },
      { key: 'shippingAddress', label: 'Kargo teslim adresi' },
      { key: 'deliveryTemplateDomestic', label: 'Teslimat şablonu (yurtiçi)' },
      { key: 'deliveryTemplateInternational', label: 'Teslimat şablonu (yurtdışı)' },
      { key: 'desiDomestic', label: 'Desi (yurtiçi)' },
      { key: 'desiInternational', label: 'Desi (yurtdışı)' },
      { key: 'wholesalePrice', label: 'Toptan fiyat' },
      { key: 'retailPrice', label: 'Perakende fiyat' },
    ],
  },
  {
    id: 'step-product-story',
    title: '3. Ürünün Hikayesi',
    requiredOptions: [],
    options: [
      { key: 'sellerNotes', label: 'Satıcı notları' },
      { key: 'brand', label: 'Marka' },
      { key: 'isEndemigoBrandCandidate', label: 'Endemigo marka adayi' },
      { key: 'productionProvince', label: 'Üretim ili' },
      { key: 'productionDistrict', label: 'Üretim ilçesi' },
    ],
  },
  {
    id: 'step-product-descriptions',
    title: '4. Ürünün Açıklamaları',
    requiredOptions: [],
    options: [
      { key: 'productContent', label: 'Ürün içeriği' },
      { key: 'barcodeNo', label: 'Barkod no' },
      { key: 'geoIndicationReceivedAt', label: 'Coğrafi işaret alınma tarihi' },
      { key: 'geoIndicationCertNo', label: 'Coğrafi işaret belge no' },
      { key: 'geoIndicationRegion', label: 'Coğrafi işaret bölgesi' },
      { key: 'additionalCertificates', label: 'Ek sertifikalar' },
      { key: 'featureBadges', label: 'Ozellik rozetleri' },
      { key: 'geoBadgeSelections', label: 'Coğrafi rozet seçimleri' },
    ],
  },
  {
    id: 'step-product-details',
    title: '5. Ürün Hakkında Detay',
    requiredOptions: [],
    options: [
      { key: 'sku', label: 'SKU' },
      { key: 'weight', label: 'Ağırlık' },
      { key: 'dimensionWidth', label: 'Genişlik' },
      { key: 'dimensionHeight', label: 'Yükseklik' },
      { key: 'dimensionDepth', label: 'Derinlik' },
      { key: 'productionSeasons', label: 'Üretim sezonu' },
      { key: 'salesMonths', label: 'Satış ayları' },
      { key: 'images', label: 'Ürün görselleri' },
    ],
  },
] as const;

const LISTING_CREATE_FIELD_OPTIONS = LISTING_CREATE_FIELD_GROUPS.flatMap((group) => group.options);
type ListingCreateOptionalField = (typeof LISTING_CREATE_FIELD_OPTIONS)[number]['key'];

interface MobileListingCreateConfig {
  optionalFields: ListingCreateOptionalField[];
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
  listingCreate: MobileListingCreateConfig;
  otherSurfaces: SurfaceSlot[];
  preview: {
    defaultAudience: string;
    defaultLocale: 'tr' | 'en';
  };
}

interface MobileConfigDocument {
  version: number;
  draft: MobileConfigDraft;
  published?: MobileConfigDraft | null;
  publishedAt: string | null;
  updatedByAdminId: string | null;
  publishedByAdminId: string | null;
}

interface ValidationIssue {
  path: string;
  code: string;
  message: string;
}

interface AuditLogItem {
  id: string;
  action: string;
  targetId: string;
  reason: string | null;
  actorAdminId: string;
  createdAt: string;
  metadata?: {
    version?: number;
  };
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
type WorkspaceMode = 'focused' | 'full';
type FocusStage = 'select' | 'preview' | 'edit';
type WorkspaceArea = 'home' | 'listing' | 'membership' | 'become-seller';
type EditorTargetKind =
  | 'hero'
  | 'entry'
  | 'section'
  | 'promo'
  | 'trust'
  | 'product-card'
  | 'auction-card'
  | 'listing-fields'
  | 'surface';

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
const workspaceMode = ref<WorkspaceMode>('focused');
const focusStage = ref<FocusStage>('select');
const showWorkspaceLauncher = ref(true);
const currentWorkspaceArea = ref<WorkspaceArea | null>(null);
const reasonDrawerOpen = ref(false);
const pendingAction = ref<PendingAction>(null);
const route = useRoute();
const documentVersion = ref(1);
const baselineSnapshot = ref('');
const publishedDraft = ref<MobileConfigDraft | null>(null);
const validationIssues = ref<ValidationIssue[]>([]);
const auditSummary = ref<AuditLogItem[]>([]);

const isContentManagementRoute = computed(() => route.name === 'content-management');
const pageTitle = computed(() => (isContentManagementRoute.value ? 'İçerik Yönetimi' : 'Mobil Uygulama'));
const pageSubtitle = computed(() =>
  isContentManagementRoute.value
    ? 'Mobil uygulamadaki içerikleri buradan yönet, kaydet ve yayınla.'
    : 'Home ekranini telefon preview uzerinden duzenle. Ilk fazda hedef high-fidelity parity.',
);

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

const WORKSPACE_CONTEXT_COPY: Record<WorkspaceArea, { title: string; description: string }> = {
  home: {
    title: 'Ana Sayfa Duzenleme',
    description: 'Navigator ve telefon onizlemesi ile ana sayfa bloklarini hizli sekilde duzenle.',
  },
  listing: {
    title: 'Ilan Verme Ayarlari',
    description: 'Ilan verirken kullaniciya sorulacak opsiyonel alanlari tek ekrandan yonet.',
  },
  membership: {
    title: 'Abone Olma Ayarlari',
    description: 'Uyelik/abonelik ekraninda gorunen metinler ve CTA yonlendirmelerini duzenle.',
  },
  'become-seller': {
    title: 'Satıcı Olma Ayarları',
    description: 'Satıcı olma ekranının başlık, açıklama ve aksiyon alanlarını sade şekilde yönet.',
  },
};

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

const SURFACE_OPTIONS = [
  'HOME',
  'LISTING_CREATE',
  'BUY_NOW',
  'PRODUCT_DETAIL',
  'PROFILE',
  'SETTINGS',
  'HOME_QUICK_TAB_BAR',
];

const WORKSPACE_SURFACE_BLUEPRINTS: Record<'membership' | 'become-seller', {
  id: string;
  titleTr: string;
  titleEn: string;
  route: string;
}> = {
  membership: {
    id: 'surface-membership',
    titleTr: 'Abonelik',
    titleEn: 'Membership',
    route: '/(tabs)/membership',
  },
  'become-seller': {
    id: 'surface-become-seller',
    titleTr: 'Satıcı Ol',
    titleEn: 'Become Seller',
    route: '/(tabs)/become-seller',
  },
};

const DEFAULT_HOME_SURFACE_SLOTS = [
  { id: 'home-search-bar', order: 1, title: 'Arama Barı' },
  { id: 'home-hero-banners', order: 2, title: 'Hero Banner' },
  { id: 'home-entry-tiles', order: 3, title: 'Giriş Kartları' },
  { id: 'home-listings', order: 4, title: 'İlanlar Alanı' },
  { id: 'home-categories', order: 5, title: 'Kategoriler' },
  { id: 'home-recently-viewed', order: 6, title: 'Son Gezdiklerim' },
  { id: 'home-discounted-products', order: 7, title: 'İndirimli Ürünler' },
  { id: 'home-most-liked-products', order: 8, title: 'En Çok Beğenilenler' },
  { id: 'home-trust-bar', order: 9, title: 'Güven Barı' },
  { id: 'home-campaigns', order: 10, title: 'Kampanyalar' },
  { id: 'home-blog', order: 11, title: 'Blog' },
  { id: 'home-trust-hub', order: 12, title: 'Güven Merkezi' },
  { id: 'home-quick-tab-bar', order: 13, title: 'Hızlı Sekme Çubuğu' },
] as const;

const LISTING_CREATE_FIELD_KEY_SET = new Set<string>(
  LISTING_CREATE_FIELD_OPTIONS.map((option) => option.key),
);

const CHECKLIST_REQUIRED_PATHS = [
  { key: 'required-fields', label: 'Zorunlu metin alanlari dolu olmali' },
  { key: 'route-format', label: 'Route alanlari / ile baslamali ve gecerli formatta olmali' },
  { key: 'audience', label: 'Tum bloklarda en az bir audience secili olmali' },
];

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
  const selectedListingFields = Array.isArray(normalized.listingCreate?.optionalFields)
    ? normalized.listingCreate.optionalFields.filter((field): field is ListingCreateOptionalField =>
      LISTING_CREATE_FIELD_KEY_SET.has(field))
    : [];
  normalized.listingCreate = {
    optionalFields: selectedListingFields.length > 0
      ? [...new Set(selectedListingFields)]
      : LISTING_CREATE_FIELD_OPTIONS.map((option) => option.key),
  };

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
    audienceOverrides: Object.fromEntries(
      Object.entries(normalized.cards.productCard.audienceOverrides ?? {}).map(([audience, override]) => [
        audience,
        {
          ...override,
          badge: ensureLocalizedText(override?.badge),
          ctaLabel: ensureLocalizedText(override?.ctaLabel),
        },
      ]),
    ),
  };

  normalized.auctions.listCard = {
    ...normalized.auctions.listCard,
    ctaLabel: ensureLocalizedText(normalized.auctions.listCard.ctaLabel),
    liveBadgeLabel: ensureLocalizedText(normalized.auctions.listCard.liveBadgeLabel),
    audienceOverrides: Object.fromEntries(
      Object.entries(normalized.auctions.listCard.audienceOverrides ?? {}).map(([audience, override]) => [
        audience,
        {
          ...override,
          ctaLabel: ensureLocalizedText(override?.ctaLabel),
          liveBadgeLabel: ensureLocalizedText(override?.liveBadgeLabel),
        },
      ]),
    ),
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

  const existingSurfaceIds = new Set(normalized.otherSurfaces.map((surface) => surface.id));
  const missingHomeSurfaceSlots = DEFAULT_HOME_SURFACE_SLOTS
    .filter((surface) => !existingSurfaceIds.has(surface.id))
    .map((surface) => ({
      id: surface.id,
      type: 'SURFACE_SLOT',
      surface: 'HOME',
      enabled: true,
      order: surface.order,
      audiences: ['GUEST', 'BUYER', 'SELLER'],
      title: ensureLocalizedText({ tr: surface.title, en: surface.title }),
      subtitle: ensureLocalizedText(),
      cta: {
        route: '/home',
        label: ensureLocalizedText(),
      },
    }));
  if (missingHomeSurfaceSlots.length > 0) {
    normalized.otherSurfaces = [...normalized.otherSurfaces, ...missingHomeSurfaceSlots];
  }

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
  focusStage.value = 'edit';
}

function isSelected(kind: EditorTargetKind, id: string): boolean {
  return selectedTarget.value?.kind === kind && selectedTarget.value?.id === id;
}

function selectFirstBlock() {
  if (!draft.value) return;
  selectTarget('product-card', 'product-card');
  focusStage.value = 'preview';
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

function isMobileRoutePattern(value: string): boolean {
  return /^\/[A-Za-z0-9\-_/()[\]]*$/.test(value);
}

function uniqueByPath(items: ValidationIssue[]): ValidationIssue[] {
  const map = new Map<string, ValidationIssue>();
  items.forEach((item) => {
    if (!map.has(item.path)) {
      map.set(item.path, item);
    }
  });
  return [...map.values()];
}

function parseValidationIssues(input: unknown): ValidationIssue[] {
  if (!Array.isArray(input)) return [];
  const issues = input
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Record<string, unknown>;
      const path = String(candidate.path ?? '').trim();
      if (!path) return null;
      return {
        path,
        code: String(candidate.code ?? 'VALIDATION_ERROR'),
        message: String(candidate.message ?? 'Alan dogrulamasi basarisiz'),
      } as ValidationIssue;
    })
    .filter((item): item is ValidationIssue => Boolean(item));
  return uniqueByPath(issues);
}

function flattenDiff(current: unknown, baseline: unknown, path = ''): Array<{ path: string; before: string; after: string }> {
  if (JSON.stringify(current) === JSON.stringify(baseline)) {
    return [];
  }

  if (
    current === null
    || baseline === null
    || typeof current !== 'object'
    || typeof baseline !== 'object'
    || Array.isArray(current)
    || Array.isArray(baseline)
  ) {
    return [
      {
        path: path || 'root',
        before: JSON.stringify(baseline),
        after: JSON.stringify(current),
      },
    ];
  }

  const keys = Array.from(
    new Set([...Object.keys(current as Record<string, unknown>), ...Object.keys(baseline as Record<string, unknown>)]),
  );
  return keys.flatMap((key) => flattenDiff(
    (current as Record<string, unknown>)[key],
    (baseline as Record<string, unknown>)[key],
    path ? `${path}.${key}` : key,
  ));
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

const selectedProductCard = computed(() => {
  if (!draft.value || selectedTarget.value?.kind !== 'product-card') return null;
  return draft.value.cards.productCard;
});

const selectedAuctionListCard = computed(() => {
  if (!draft.value || selectedTarget.value?.kind !== 'auction-card') return null;
  return draft.value.auctions.listCard;
});

const selectedListingCreateConfig = computed(() => {
  if (!draft.value || selectedTarget.value?.kind !== 'listing-fields') return null;
  return draft.value.listingCreate;
});

const selectedSurfaceSlot = computed(() => {
  if (!draft.value || selectedTarget.value?.kind !== 'surface') return null;
  return draft.value.otherSurfaces.find((item) => item.id === selectedTarget.value?.id) ?? null;
});

const selectedBlock = computed(() => {
  return (
    selectedHeroBanner.value ??
    selectedEntryTile.value ??
    selectedHomeSection.value ??
    selectedPromoBanner.value ??
    selectedTrustBlock.value ??
    selectedSurfaceSlot.value
  );
});

const selectedBlockTitle = computed(() => {
  if (!selectedTarget.value) {
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
    case 'product-card':
      return 'Product Card';
    case 'auction-card':
      return 'Auction List Card';
    case 'listing-fields':
      return 'Ilan Verme Alanlari';
    case 'surface':
      return textOf(selectedSurfaceSlot.value?.title, selectedSurfaceSlot.value?.id ?? 'Surface');
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
    'product-card': 'Product kart etiketi, buton ve gorunum ayarlari',
    'auction-card': 'Auction list card metin ve gorunum ayarlari',
    'listing-fields': 'Ilan verme adimlarinda sorulacak opsiyonel alanlari sec',
    surface: 'Diger ekran slotu metin, audience ve route ayarlari',
  };

  return descriptions[selectedTarget.value.kind];
});

const selectedBlockEnabled = computed(() => {
  if (
    selectedTarget.value?.kind === 'product-card'
    || selectedTarget.value?.kind === 'auction-card'
    || selectedTarget.value?.kind === 'listing-fields'
  ) {
    return true;
  }
  return selectedBlock.value?.enabled ?? false;
});

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

const selectedTargetSupportsVisibility = computed(
  () =>
    selectedTarget.value?.kind !== 'product-card'
    && selectedTarget.value?.kind !== 'auction-card'
    && selectedTarget.value?.kind !== 'listing-fields',
);

const selectedTargetSupportsOrder = computed(
  () =>
    selectedTarget.value?.kind !== 'product-card'
    && selectedTarget.value?.kind !== 'auction-card'
    && selectedTarget.value?.kind !== 'listing-fields',
);

const selectedTargetSupportsDelete = computed(
  () =>
    selectedTarget.value?.kind !== 'product-card'
    && selectedTarget.value?.kind !== 'auction-card'
    && selectedTarget.value?.kind !== 'listing-fields',
);

const navigatorGroups = computed<NavigatorGroup[]>(() => {
  if (!draft.value) return [];

  return [
    {
      id: 'templates',
      title: 'Card Templates',
      items: [
        {
          id: 'product-card',
          kind: 'product-card',
          label: textOf(draft.value.cards.productCard.ctaLabel, 'Product Card'),
          subtitle: textOf(draft.value.cards.productCard.badge, 'PRODUCT_CARD'),
          order: 1,
          enabled: true,
        },
        {
          id: 'auction-card',
          kind: 'auction-card',
          label: textOf(draft.value.auctions.listCard.ctaLabel, 'Auction List Card'),
          subtitle: textOf(draft.value.auctions.listCard.liveBadgeLabel, 'AUCTIONS_LIST'),
          order: 2,
          enabled: true,
        },
        {
          id: 'listing-fields',
          kind: 'listing-fields',
          label: 'Ilan Verme Alanlari',
          subtitle: `${draft.value.listingCreate.optionalFields.length} alan secili`,
          order: 3,
          enabled: true,
        },
      ],
    },
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
    {
      id: 'home-surfaces',
      title: 'Anasayfa Bolumleri',
      items: sortByOrder(draft.value.otherSurfaces.filter((item) => item.surface === 'HOME')).map((item) => ({
        id: item.id,
        kind: 'surface',
        label: textOf(item.title, item.id),
        subtitle: item.surface,
        order: item.order,
        enabled: item.enabled,
      })),
    },
    {
      id: 'surfaces',
      title: 'Other Surfaces',
      items: sortByOrder(draft.value.otherSurfaces.filter((item) => item.surface !== 'HOME')).map((item) => ({
        id: item.id,
        kind: 'surface',
        label: textOf(item.title, item.id),
        subtitle: item.surface,
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

const previewOtherSurfaces = computed(() =>
  sortByOrder(draft.value?.otherSurfaces ?? []).filter(
    (item) => item.enabled && matchesAudience(item.audiences),
  ),
);

const diffEntries = computed(() => {
  if (!draft.value || !publishedDraft.value) return [];
  return flattenDiff(draft.value, publishedDraft.value).slice(0, 60);
});

const prePublishChecklist = computed(() => {
  if (!draft.value) {
    return CHECKLIST_REQUIRED_PATHS.map((entry) => ({ ...entry, passed: false }));
  }

  const routes: string[] = [];
  draft.value.home.heroBanners.forEach((item) => {
    if (item.cta?.route) routes.push(item.cta.route);
  });
  draft.value.home.entryTiles.forEach((item) => {
    if (item.cta?.route) routes.push(item.cta.route);
  });
  draft.value.home.sections.forEach((item) => {
    if (item.route) routes.push(item.route);
  });
  draft.value.home.promoBanners.forEach((item) => {
    if (item.cta?.route) routes.push(item.cta.route);
  });
  draft.value.home.trustBlocks.forEach((item) => {
    if (item.cta?.route) routes.push(item.cta.route);
  });
  draft.value.otherSurfaces.forEach((item) => {
    if (item.cta?.route) routes.push(item.cta.route);
  });

  const allAudienceBlocks = [
    ...draft.value.home.heroBanners,
    ...draft.value.home.entryTiles,
    ...draft.value.home.sections,
    ...draft.value.home.promoBanners,
    ...draft.value.home.trustBlocks,
    ...draft.value.otherSurfaces,
  ];

  const requiredLocalizedFields = [
    ...draft.value.home.heroBanners.map((item) => item.title),
    ...draft.value.home.entryTiles.map((item) => item.title),
    ...draft.value.home.sections.map((item) => item.title),
    ...draft.value.home.promoBanners.map((item) => item.title),
    ...draft.value.home.trustBlocks.map((item) => item.title),
    ...draft.value.otherSurfaces.map((item) => item.title),
    draft.value.cards.productCard.ctaLabel,
    draft.value.auctions.listCard.ctaLabel,
  ];

  return [
    {
      key: CHECKLIST_REQUIRED_PATHS[0].key,
      label: CHECKLIST_REQUIRED_PATHS[0].label,
      passed: requiredLocalizedFields.every((item) => textOf(item, '').trim().length > 0),
    },
    {
      key: CHECKLIST_REQUIRED_PATHS[1].key,
      label: CHECKLIST_REQUIRED_PATHS[1].label,
      passed: routes.every((routeValue) => isMobileRoutePattern(routeValue)),
    },
    {
      key: CHECKLIST_REQUIRED_PATHS[2].key,
      label: CHECKLIST_REQUIRED_PATHS[2].label,
      passed: allAudienceBlocks.every((item) => Array.isArray(item.audiences) && item.audiences.length > 0),
    },
  ];
});

const canPublish = computed(() => prePublishChecklist.value.every((item) => item.passed));

const currentWorkspaceTitle = computed(() => {
  if (!currentWorkspaceArea.value) return 'Duzenleme Alani';
  return WORKSPACE_CONTEXT_COPY[currentWorkspaceArea.value].title;
});

const currentWorkspaceDescription = computed(() => {
  if (!currentWorkspaceArea.value) return 'Secili alana gore odakli duzenleme yap.';
  return WORKSPACE_CONTEXT_COPY[currentWorkspaceArea.value].description;
});

const activeDrawerTabs = computed(() => {
  if (
    selectedTarget.value?.kind === 'product-card'
    || selectedTarget.value?.kind === 'auction-card'
    || selectedTarget.value?.kind === 'listing-fields'
  ) {
    return drawerTabs.filter((tab) => tab.value === 'content');
  }
  return drawerTabs;
});

const publishedAtLabel = computed(() =>
  publishedAt.value ? new Date(publishedAt.value).toLocaleString('tr-TR') : '-',
);
const updatedByLabel = computed(() => updatedByAdminId.value ?? '-');
const publishedByLabel = computed(() => publishedByAdminId.value ?? '-');
const hasUnsavedChanges = computed(() => {
  if (!draft.value) return false;
  return JSON.stringify(draft.value) !== baselineSnapshot.value;
});

function toggleSelectedEnabled() {
  if (!selectedBlock.value) return;
  selectedBlock.value.enabled = !selectedBlock.value.enabled;
}

function toggleSelectedAudience(audience: string) {
  if (!selectedBlock.value) return;
  toggleAudience(selectedBlock.value.audiences, audience);
}

function toggleListingCreateField(field: ListingCreateOptionalField) {
  if (!draft.value) return;
  const currentFields = draft.value.listingCreate.optionalFields;
  const index = currentFields.indexOf(field);
  if (index >= 0) {
    currentFields.splice(index, 1);
    return;
  }
  currentFields.push(field);
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
    case 'surface':
      return draft.value.otherSurfaces;
    default:
      return [];
  }
}

function moveSelectedBlock(delta: number) {
  if (!selectedTarget.value || !selectedTargetSupportsOrder.value) return;
  const collection = collectionForKind(selectedTarget.value.kind);
  const currentIndex = collection.findIndex((item) => item.id === selectedTarget.value?.id);
  if (currentIndex < 0) return;
  moveArrayItem(collection as Array<{ order: number }>, currentIndex, delta);
}

function deleteSelectedBlock() {
  if (!selectedTarget.value || !selectedTargetSupportsDelete.value) return;
  if (selectedTarget.value.kind === 'section' && (draft.value?.home.sections.length ?? 0) <= 1) {
    error.value = 'En az 1 section kalmali. Son section silinemez.';
    return;
  }
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

  const latest = draft.value?.otherSurfaces.at(-1);
  if (latest) selectTarget('surface', latest.id);
}

function findSurfaceByRoute(route: string): SurfaceSlot | null {
  if (!draft.value) return null;
  return draft.value.otherSurfaces.find((item) => item.cta?.route === route) ?? null;
}

function ensureWorkspaceSurface(kind: 'membership' | 'become-seller'): SurfaceSlot | null {
  if (!draft.value) return null;
  const blueprint = WORKSPACE_SURFACE_BLUEPRINTS[kind];
  const foundById = draft.value.otherSurfaces.find((item) => item.id === blueprint.id);
  if (foundById) return foundById;
  const foundByRoute = findSurfaceByRoute(blueprint.route);
  if (foundByRoute) return foundByRoute;

  const newSurface: SurfaceSlot = {
    id: blueprint.id,
    type: 'SURFACE_SLOT',
    enabled: true,
    order: (draft.value.otherSurfaces.at(-1)?.order ?? 0) + 1,
    audiences: ['BUYER'],
    title: localizedText(blueprint.titleTr, blueprint.titleEn),
    subtitle: localizedText('', ''),
    cta: {
      route: blueprint.route,
      label: localizedText('Incele', 'View'),
    },
    surface: 'PROFILE',
  };
  draft.value.otherSurfaces.push(newSurface);
  return newSurface;
}

function openWorkspaceArea(area: WorkspaceArea) {
  currentWorkspaceArea.value = area;
  showWorkspaceLauncher.value = false;

  if (area === 'home') {
    workspaceMode.value = 'full';
    focusStage.value = 'preview';
    if (!selectedTarget.value) selectFirstBlock();
    return;
  }

  workspaceMode.value = 'focused';
  focusStage.value = 'edit';

  if (area === 'listing') {
    selectTarget('listing-fields', 'listing-fields');
    return;
  }

  const surface = ensureWorkspaceSurface(area);
  if (surface) {
    selectTarget('surface', surface.id);
  }
}

watch(activeDrawerTabs, (tabs) => {
  if (!tabs.some((tab) => tab.value === activeDrawerTab.value)) {
    activeDrawerTab.value = tabs[0]?.value ?? 'content';
  }
}, { immediate: true });

watch(showWorkspaceLauncher, (isOpen) => {
  if (isOpen) {
    currentWorkspaceArea.value = null;
  }
});

function openReason(action: Exclude<PendingAction, null>) {
  if (action === 'publish' && !canPublish.value) {
    error.value = 'Pre-publish checklist tamamlanmadan yayinlama yapilamaz.';
    return;
  }
  pendingAction.value = action;
  reasonDrawerOpen.value = true;
}

function closeReasonDrawer() {
  reasonDrawerOpen.value = false;
  pendingAction.value = null;
}

async function loadAuditSummary() {
  try {
    const [draftLogs, publishLogs] = await Promise.all([
      adminApi.get<{ items?: AuditLogItem[] }>('/admin/audit-logs', {
        params: { targetType: 'SETTING', targetId: 'MOBILE_CONFIG_DRAFT', limit: 5 },
      }),
      adminApi.get<{ items?: AuditLogItem[] }>('/admin/audit-logs', {
        params: { targetType: 'SETTING', targetId: 'MOBILE_CONFIG_PUBLISHED', limit: 5 },
      }),
    ]);

    auditSummary.value = [...(draftLogs.data.items ?? []), ...(publishLogs.data.items ?? [])]
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 8);
  } catch {
    auditSummary.value = [];
  }
}

async function loadDraft() {
  loading.value = true;
  error.value = null;

  try {
    const response = await adminApi.get<{ document: MobileConfigDocument }>('/admin/mobile-config/draft');
    const document = response.data.document;
    const normalizedDraft = normalizeDraft(document.draft);
    draft.value = normalizedDraft;
    publishedDraft.value = document.published ? normalizeDraft(document.published) : null;
    documentVersion.value = Math.max(Number(document.version ?? 1), 1);
    baselineSnapshot.value = JSON.stringify(normalizedDraft);
    validationIssues.value = [];
    selectedLocale.value = normalizedDraft.preview.defaultLocale;
    selectedAudience.value = normalizedDraft.preview.defaultAudience;
    publishedAt.value = document.publishedAt;
    updatedByAdminId.value = document.updatedByAdminId;
    publishedByAdminId.value = document.publishedByAdminId;

    if (!showWorkspaceLauncher.value) {
      if (!selectedTarget.value) {
        selectFirstBlock();
      } else if (!selectedBlock.value) {
        selectFirstBlock();
      }
    }
    await loadAuditSummary();
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
        version: documentVersion.value,
        draft: draft.value,
        reason: payload.reason,
      });
    } else {
      await adminApi.post('/admin/mobile-config/publish', {
        version: documentVersion.value,
        reason: payload.reason,
      });
    }

    validationIssues.value = [];
    closeReasonDrawer();
    await loadDraft();
  } catch (actionError) {
    if (axios.isAxiosError<{ code?: string; message?: string; currentVersion?: number; errors?: unknown }>(actionError)) {
      const code = actionError.response?.data?.code;
      if (code === 'MOBILE_CONFIG_VERSION_CONFLICT') {
        const serverVersion = Number(actionError.response?.data?.currentVersion ?? documentVersion.value);
        documentVersion.value = Number.isFinite(serverVersion) ? serverVersion : documentVersion.value;
        error.value = 'Bu taslak baska bir yonetici tarafindan guncellenmis. Lutfen Yenile ile son surumu al.';
        return;
      }
      if (code === 'VALIDATION_ERROR') {
        const issues = parseValidationIssues(actionError.response?.data?.errors);
        validationIssues.value = issues;
        error.value = issues.length
          ? `Dogrulama hatasi: ${issues[0].message}`
          : toApiMessage(actionError);
        return;
      }
    }
    error.value = toApiMessage(actionError);
  }
}

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (!hasUnsavedChanges.value) return;
  event.preventDefault();
  event.returnValue = '';
}

onBeforeRouteLeave((_to, _from, next) => {
  if (!hasUnsavedChanges.value) {
    next();
    return;
  }
  const shouldLeave = window.confirm('Kaydedilmemis degisiklikler var. Sayfadan cikmak istiyor musun?');
  next(shouldLeave);
});

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload);
  void loadDraft();
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
});
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

.mode-toggle {
  margin-right: 2px;
}

.workflow-strip {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.workspace-context {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid #dbe5f0;
  border-radius: 14px;
  background: #ffffff;
  padding: 12px 14px;
}

.workspace-launcher {
  display: grid;
  gap: 14px;
}

.launcher-header {
  display: grid;
  gap: 4px;
}

.launcher-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.launcher-card {
  border: 1px solid #dbe5f0;
  border-radius: 16px;
  background: #ffffff;
  padding: 16px;
  display: grid;
  gap: 8px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.launcher-card:hover {
  border-color: #2563eb;
  box-shadow: 0 16px 32px rgba(37, 99, 235, 0.14);
  transform: translateY(-1px);
}

.launcher-card i {
  color: #1d4ed8;
  font-size: 18px;
}

.launcher-card strong {
  color: #0f172a;
  font-size: 16px;
}

.launcher-card span {
  color: #64748b;
  font-size: 13px;
}

.workflow-step {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #dbe5f0;
  border-radius: 14px;
  background: #ffffff;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.workflow-step:hover,
.workflow-step.active {
  border-color: #2563eb;
  box-shadow: 0 10px 22px rgba(37, 99, 235, 0.12);
}

.step-index {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 800;
  color: #1d4ed8;
  background: #eff6ff;
}

.step-copy {
  display: grid;
}

.step-copy strong {
  color: #0f172a;
  font-size: 13px;
}

.step-copy small {
  color: #64748b;
  font-size: 11px;
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

.editor-layout.mode-focused {
  grid-template-columns: minmax(0, 1fr);
}

.editor-layout.mode-focused.stage-select .preview-panel,
.editor-layout.mode-focused.stage-select .drawer-panel,
.editor-layout.mode-focused.stage-preview .navigator-panel,
.editor-layout.mode-focused.stage-preview .drawer-panel,
.editor-layout.mode-focused.stage-edit .navigator-panel,
.editor-layout.mode-focused.stage-edit .preview-panel {
  display: none;
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

.preview-card-template,
.preview-surface-card {
  border-radius: 20px;
  border: 1px solid #dbeafe;
  background: #ffffff;
  padding: 14px;
  display: grid;
  gap: 8px;
  text-align: left;
}

.preview-card-template.selected,
.preview-surface-card.selected {
  border-color: #2563eb;
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.14);
}

.preview-card-template-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: #475569;
  font-size: 12px;
}

.preview-surface-stack {
  display: grid;
  gap: 10px;
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

.listing-field-group {
  display: grid;
  gap: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 10px;
  background: #ffffff;
}

.listing-field-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.listing-field-group-header strong {
  color: #0f172a;
  font-size: 13px;
}

.listing-field-group-header span {
  border: 1px solid #dbeafe;
  border-radius: 999px;
  padding: 2px 8px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 700;
}

.checkbox-pill.is-required .required-badge {
  margin-left: auto;
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  padding: 3px 10px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
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

.validation-box {
  border: 1px solid #fecaca;
  border-radius: 14px;
  background: #fef2f2;
  padding: 12px;
  display: grid;
  gap: 10px;
}

.validation-box ul {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 8px;
}

.validation-box span {
  color: #991b1b;
  font-size: 12px;
  font-weight: 700;
}

.validation-box p {
  margin: 0;
  color: #7f1d1d;
  font-size: 12px;
}

.insights-panel {
  margin-top: 4px;
}

.insights-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.insight-card {
  border: 1px solid #dbeafe;
  border-radius: 16px;
  background: #f8fbff;
  padding: 12px;
  display: grid;
  gap: 10px;
}

.insight-card h3 {
  margin: 0;
  font-size: 14px;
}

.insight-list,
.diff-list,
.audit-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.insight-list li,
.diff-list li,
.audit-list li {
  border: 1px solid #dbeafe;
  border-radius: 12px;
  background: #ffffff;
  padding: 8px 10px;
  display: grid;
  gap: 4px;
}

.insight-list li span {
  font-size: 11px;
  font-weight: 800;
}

.insight-list li.pass span {
  color: #15803d;
}

.insight-list li.fail span {
  color: #b91c1c;
}

.insight-list li p,
.diff-list li p,
.audit-list li p {
  margin: 0;
  color: #475569;
  font-size: 12px;
}

.diff-list li strong,
.audit-list li strong {
  color: #0f172a;
  font-size: 12px;
}

@media (max-width: 1380px) {
  .editor-layout {
    grid-template-columns: 240px minmax(0, 1fr) 320px;
  }
}

@media (max-width: 1180px) {
  .workflow-strip {
    grid-template-columns: 1fr;
  }

  .launcher-grid {
    grid-template-columns: 1fr;
  }

  .workspace-context {
    align-items: flex-start;
    flex-direction: column;
  }

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

  .insights-grid {
    grid-template-columns: 1fr;
  }
}
</style>
