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
        <button class="button" type="button" @click="confirmReload">
          <i class="pi pi-refresh" aria-hidden="true" />
          Yenile
        </button>
        <button v-if="draft && !showWorkspaceLauncher" class="button" type="button" @click="showAuditHistory = true">
          <i class="pi pi-history" aria-hidden="true" />
          Geçmiş
        </button>
        <button v-if="draft && !showWorkspaceLauncher" class="button" type="button" @click="showWorkspaceLauncher = true">
          <i class="pi pi-th-large" aria-hidden="true" />
          Alan Seç
        </button>
        <button class="button primary" type="button" :disabled="loading || !draft" @click="saveDraft()">
          <i class="pi pi-save" aria-hidden="true" />
          Taslağı Kaydet
        </button>
        <button class="button primary" type="button" :disabled="loading || !draft" @click="showPublishWizard = true">
          <i class="pi pi-send" aria-hidden="true" />
          Yayınla
        </button>
      </div>
    </header>

    <div v-if="draft" class="config-status-banner">
      <div class="status-meta-group">
        <span class="version-label">Taslak Sürümü: <strong>v{{ documentVersion }}</strong></span>
        
        <span v-if="hasUnsavedChanges" class="status-badge warning">
          <span class="dot"></span> Kaydedilmemiş Değişiklikler Var
        </span>
        <span v-else-if="hasUnpublishedChanges" class="status-badge info">
          <span class="dot"></span> Taslak Kaydedildi (Yayın Bekliyor)
        </span>
        <span v-else class="status-badge success">
          <span class="dot"></span> Canlıda Aktif (Değişiklik Yok)
        </span>
      </div>
      
      <div class="history-meta-group">
        <span class="meta-item">Son Güncelleme: <strong>{{ updatedAtLabel }}</strong></span>
        <span class="meta-item">Son Yayın: <strong>{{ publishedAtLabel }}</strong></span>
      </div>
    </div>

    <section v-if="draft && !showWorkspaceLauncher" class="workspace-context">
      <div class="workspace-title-area">
        <button class="back-breadcrumb-btn" type="button" @click="showWorkspaceLauncher = true" title="Alanlara Dön">
          <i class="pi pi-arrow-left" aria-hidden="true" />
        </button>
        <div>
          <h2>{{ currentWorkspaceTitle }}</h2>
        </div>
      </div>
      <div class="toolbar workspace-actions" style="gap: 8px;">
        <template v-if="currentWorkspaceArea === 'home'">
          <div class="add-block-container">
            <button
              class="add-block-trigger"
              type="button"
              @click="showAddMenu = !showAddMenu"
              title="Yeni Blok Ekle"
            >
              <i class="pi pi-plus" />
            </button>
            <div v-if="showAddMenu" class="add-block-menu">
              <button
                class="menu-item"
                type="button"
                @click="addHeroBanner(); showAddMenu = false"
              >
                <i class="pi pi-plus" /> Hero Ekle
              </button>
              <button
                class="menu-item"
                type="button"
                @click="addEntryTile(); showAddMenu = false"
              >
                <i class="pi pi-plus" /> Kart Ekle
              </button>
              <button
                class="menu-item"
                type="button"
                @click="addHomeSection(); showAddMenu = false"
              >
                <i class="pi pi-plus" /> Section Ekle
              </button>
              <button
                class="menu-item"
                type="button"
                @click="addHomeBannerSlot(); showAddMenu = false"
              >
                <i class="pi pi-images" /> Banner Ekle
              </button>
            </div>
          </div>
        </template>
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
        <button class="launcher-card highlight-card" type="button" @click="$router.push({ name: 'banners' })">
          <i class="pi pi-images" aria-hidden="true" />
          <strong>Banner & Slayt Yönetimi</strong>
          <span>Slider kampanya görselleri, aksiyonlar ve link tanımları</span>
        </button>
      </div>
    </section>

    <div
      v-if="draft && !showWorkspaceLauncher"
      class="editor-layout"
      :class="[
        `mode-${workspaceMode}`,
        `stage-${focusStage}`
      ]"
    >
      <section class="panel preview-panel">
        <div class="panel-header">
          <div>
            <strong>Önizleme</strong>
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

              <!-- Mock App Header ( endemigo logo, search, profile, bell ) -->
              <div class="preview-app-header">
                <div class="header-top-row">
                  <div class="logo-area">
                    <span class="logo-text">endemigo</span>
                  </div>
                  <div class="header-actions">
                    <div class="profile-avatar-circle">
                      <i class="pi pi-user" />
                    </div>
                    <div class="notification-bell-circle">
                      <i class="pi pi-bell" />
                    </div>
                  </div>
                </div>
                <div class="preview-search-bar-container">
                  <i class="pi pi-search" aria-hidden="true" />
                  <span class="placeholder-text">{{ selectedLocale === 'tr' ? 'Yöresel ürün ara' : 'Search local products' }}</span>
                </div>
              </div>

              <div class="preview-scroll" :class="{ 'is-dragging': draggedSectionId || draggedHeroId }">
                <div class="preview-hover-divider">
                  <div class="hover-menu-container">
                    <button class="divider-btn" type="button" @click.stop="hoverAddMenuOrder = hoverAddMenuOrder === homeSearchBarOrder ? null : homeSearchBarOrder">
                      <i class="pi pi-plus" /> Ekle
                    </button>
                    <div v-if="hoverAddMenuOrder === homeSearchBarOrder" class="hover-dropdown-menu">
                      <button class="hover-menu-item" type="button" @click.stop="addHomeBannerSlotAfter(homeSearchBarOrder); hoverAddMenuOrder = null">
                        <i class="pi pi-images" /> Banner Ekle
                      </button>
                      <button class="hover-menu-item" type="button" @click.stop="addHomeSectionAfter(homeSearchBarOrder); hoverAddMenuOrder = null">
                        <i class="pi pi-plus" /> Bölüm Ekle
                      </button>
                    </div>
                  </div>
                </div>
                <!-- Banner Slots (0, 10) -->
                <div
                  v-for="slot in previewHomeBannersSlots.filter(s => s.order > homeSearchBarOrder && s.order < homeHeroBannersOrder)"
                  :key="slot.id"
                  class="preview-item-wrapper"
                >
                  <button
                    class="preview-dynamic-banner-card"
                    :class="{ selected: isSelected('surface', slot.id) }"
                    type="button"
                    @click="selectTarget('surface', slot.id)"
                  >
                    <div v-if="!slot.bannerId || !getBannerById(slot.bannerId)" class="preview-dynamic-banner-header">
                      <span class="preview-badge">Dinamik Banner (Sıra: {{ slot.order }})</span>
                      <strong>{{ textOf(slot.title, 'İsimsiz Banner Alanı') }}</strong>
                    </div>
                    <div
                      v-if="slot.bannerId && getBannerById(slot.bannerId)"
                      class="preview-dynamic-banner-cover"
                      :style="{
                        backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.65)), url(${getBannerActiveImage(slot.bannerId)})`,
                        aspectRatio: getBannerAspectRatio(slot.bannerId)
                      }"
                    >
                      <button class="delete-banner-btn" type="button" @click.stop="deleteHomeBannerSlot(slot.id)" title="Bu Banner Alanını Kaldır">
                        <i class="pi pi-times" />
                      </button>
                      <span class="banner-name">{{ getBannerName(slot.bannerId) }}</span>
                      <span class="banner-slides-count">{{ getBannerById(slot.bannerId)?.items?.length ?? 0 }} Görsel Bağlı</span>
                      <!-- Slide Dot Indicators -->
                      <div v-if="getBannerById(slot.bannerId)?.items?.length > 1" class="banner-slide-dots">
                        <span
                          v-for="(dot, dotIdx) in getBannerById(slot.bannerId).items"
                          :key="dotIdx"
                          class="slide-dot"
                          :class="{ active: dotIdx === (globalSlideIndex % getBannerById(slot.bannerId).items.length) }"
                        />
                      </div>
                      <div v-if="getBannerById(slot.bannerId)?.items?.length" class="banner-thumbnails-strip">
                        <img
                          v-for="(imgItem, imgIdx) in (getBannerById(slot.bannerId)?.items || [])"
                          :key="imgIdx"
                          :src="getFullUrl(imgItem.imageUrl)"
                          class="banner-thumbnail-img"
                        />
                      </div>
                    </div>
                    <div v-else class="preview-dynamic-banner-placeholder">
                      <button class="delete-banner-btn" type="button" @click.stop="deleteHomeBannerSlot(slot.id)" title="Bu Banner Alanını Kaldır">
                        <i class="pi pi-times" />
                      </button>
                      <i class="pi pi-images" />
                      <span>Boş Banner Alanı (Tıkla ve Kampanya Bağla)</span>
                    </div>
                  </button>
                  <!-- Control Overlay -->
                  <div v-if="isSelected('surface', slot.id)" class="preview-item-controls">
                    <button class="control-btn" type="button" @click.stop="moveBlock('surface', slot.id, -1)" title="Yukarı Taşı">
                      <i class="pi pi-chevron-up" />
                    </button>
                    <button class="control-btn" type="button" @click.stop="moveBlock('surface', slot.id, 1)" title="Aşağı Taşı">
                      <i class="pi pi-chevron-down" />
                    </button>
                    <button class="control-btn danger" type="button" @click.stop="deleteHomeBannerSlot(slot.id)" title="Sil">
                      <i class="pi pi-trash" />
                    </button>
                  </div>
                  <div class="absolute-hover-divider">
                    <div class="hover-menu-container">
                      <button class="divider-btn" type="button" @click.stop="hoverAddMenuOrder = hoverAddMenuOrder === slot.order ? null : slot.order">
                        <i class="pi pi-plus" /> Ekle
                      </button>
                      <div v-if="hoverAddMenuOrder === slot.order" class="hover-dropdown-menu">
                        <button class="hover-menu-item" type="button" @click.stop="addHomeBannerSlotAfter(slot.order); hoverAddMenuOrder = null">
                          <i class="pi pi-images" /> Banner Ekle
                        </button>
                        <button class="hover-menu-item" type="button" @click.stop="addHomeSectionAfter(slot.order); hoverAddMenuOrder = null">
                          <i class="pi pi-plus" /> Bölüm Ekle
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Hero Banners -->
                <div
                  v-for="banner in previewHeroBanners"
                  :key="banner.id"
                  class="preview-item-wrapper"
                  :draggable="true"
                  @mousedown="onWrapperMouseDown"
                  @dragstart="onHeroDragStart($event, banner.id)"
                  @dragover.prevent
                  @dragenter.prevent="onHeroDragEnter(banner.id)"
                  @dragleave="onHeroDragLeave(banner.id)"
                  @drop="onHeroDrop($event, banner.id)"
                  @dragend="onHeroDragEnd"
                >
                  <button
                    class="preview-hero-card"
                    :class="{ 
                      selected: isSelected('hero', banner.id),
                      'is-dragging-placeholder': draggedHeroId === banner.id
                    }"
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
                  <!-- Control Overlay -->
                  <div v-if="isSelected('hero', banner.id)" class="preview-item-controls">
                    <button class="control-btn" type="button" @click.stop="moveBlock('hero', banner.id, -1)" title="Yukarı Taşı">
                      <i class="pi pi-chevron-up" />
                    </button>
                    <button class="control-btn" type="button" @click.stop="moveBlock('hero', banner.id, 1)" title="Aşağı Taşı">
                      <i class="pi pi-chevron-down" />
                    </button>
                    <button 
                      class="control-btn drag-handle" 
                      type="button" 
                      title="Sürükle"
                    >
                      <i class="pi pi-bars" />
                    </button>
                    <button class="control-btn danger" type="button" @click.stop="deleteSelectedBlock" title="Sil">
                      <i class="pi pi-trash" />
                    </button>
                  </div>
                  <div class="absolute-hover-divider">
                    <div class="hover-menu-container">
                      <button class="divider-btn" type="button" @click.stop="hoverAddMenuOrder = hoverAddMenuOrder === homeHeroBannersOrder ? null : homeHeroBannersOrder">
                        <i class="pi pi-plus" /> Ekle
                      </button>
                      <div v-if="hoverAddMenuOrder === homeHeroBannersOrder" class="hover-dropdown-menu">
                        <button class="hover-menu-item" type="button" @click.stop="addHomeBannerSlotAfter(homeHeroBannersOrder); hoverAddMenuOrder = null">
                          <i class="pi pi-images" /> Banner Ekle
                        </button>
                        <button class="hover-menu-item" type="button" @click.stop="addHomeSectionAfter(homeHeroBannersOrder); hoverAddMenuOrder = null">
                          <i class="pi pi-plus" /> Bölüm Ekle
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Banner Slots (10, 20) -->
                <div
                  v-for="slot in previewHomeBannersSlots.filter(s => s.order > homeHeroBannersOrder && s.order < homeEntryTilesOrder)"
                  :key="slot.id"
                  class="preview-item-wrapper"
                >
                  <button
                    class="preview-dynamic-banner-card"
                    :class="{ selected: isSelected('surface', slot.id) }"
                    type="button"
                    @click="selectTarget('surface', slot.id)"
                  >
                    <div v-if="!slot.bannerId || !getBannerById(slot.bannerId)" class="preview-dynamic-banner-header">
                      <span class="preview-badge">Dinamik Banner (Sıra: {{ slot.order }})</span>
                      <strong>{{ textOf(slot.title, 'İsimsiz Banner Alanı') }}</strong>
                    </div>
                    <div
                      v-if="slot.bannerId && getBannerById(slot.bannerId)"
                      class="preview-dynamic-banner-cover"
                      :style="{
                        backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.65)), url(${getBannerActiveImage(slot.bannerId)})`,
                        aspectRatio: getBannerAspectRatio(slot.bannerId)
                      }"
                    >
                      <button class="delete-banner-btn" type="button" @click.stop="deleteHomeBannerSlot(slot.id)" title="Bu Banner Alanını Kaldır">
                        <i class="pi pi-times" />
                      </button>
                      <span class="banner-name">{{ getBannerName(slot.bannerId) }}</span>
                      <span class="banner-slides-count">{{ getBannerById(slot.bannerId)?.items?.length ?? 0 }} Görsel Bağlı</span>
                      <!-- Slide Dot Indicators -->
                      <div v-if="getBannerById(slot.bannerId)?.items?.length > 1" class="banner-slide-dots">
                        <span
                          v-for="(dot, dotIdx) in getBannerById(slot.bannerId).items"
                          :key="dotIdx"
                          class="slide-dot"
                          :class="{ active: dotIdx === (globalSlideIndex % getBannerById(slot.bannerId).items.length) }"
                        />
                      </div>
                      <div v-if="getBannerById(slot.bannerId)?.items?.length" class="banner-thumbnails-strip">
                        <img
                          v-for="(imgItem, imgIdx) in (getBannerById(slot.bannerId)?.items || [])"
                          :key="imgIdx"
                          :src="getFullUrl(imgItem.imageUrl)"
                          class="banner-thumbnail-img"
                        />
                      </div>
                    </div>
                    <div v-else class="preview-dynamic-banner-placeholder">
                      <button class="delete-banner-btn" type="button" @click.stop="deleteHomeBannerSlot(slot.id)" title="Bu Banner Alanını Kaldır">
                        <i class="pi pi-times" />
                      </button>
                      <i class="pi pi-images" />
                      <span>Boş Banner Alanı (Tıkla ve Kampanya Bağla)</span>
                    </div>
                  </button>
                  <!-- Control Overlay -->
                  <div v-if="isSelected('surface', slot.id)" class="preview-item-controls">
                    <button class="control-btn" type="button" @click.stop="moveBlock('surface', slot.id, -1)" title="Yukarı Taşı">
                      <i class="pi pi-chevron-up" />
                    </button>
                    <button class="control-btn" type="button" @click.stop="moveBlock('surface', slot.id, 1)" title="Aşağı Taşı">
                      <i class="pi pi-chevron-down" />
                    </button>
                    <button class="control-btn danger" type="button" @click.stop="deleteHomeBannerSlot(slot.id)" title="Sil">
                      <i class="pi pi-trash" />
                    </button>
                  </div>
                  <div class="absolute-hover-divider">
                    <div class="hover-menu-container">
                      <button class="divider-btn" type="button" @click.stop="hoverAddMenuOrder = hoverAddMenuOrder === slot.order ? null : slot.order">
                        <i class="pi pi-plus" /> Ekle
                      </button>
                      <div v-if="hoverAddMenuOrder === slot.order" class="hover-dropdown-menu">
                        <button class="hover-menu-item" type="button" @click.stop="addHomeBannerSlotAfter(slot.order); hoverAddMenuOrder = null">
                          <i class="pi pi-images" /> Banner Ekle
                        </button>
                        <button class="hover-menu-item" type="button" @click.stop="addHomeSectionAfter(slot.order); hoverAddMenuOrder = null">
                          <i class="pi pi-plus" /> Bölüm Ekle
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Entry Grid Wrapper -->
                <div class="preview-item-wrapper">
                  <div class="preview-entry-grid">
                    <div
                      v-for="tile in previewEntryTiles"
                      :key="tile.id"
                      class="preview-item-wrapper"
                    >
                      <button
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
                        <span class="preview-entry-cta-btn" :class="entryTileAccentClass(tile.id)">{{ textOf(tile.cta.label, 'Aksiyon') }}</span>
                      </button>
                      <!-- Control Overlay -->
                      <div v-if="isSelected('entry', tile.id)" class="preview-item-controls">
                        <button class="control-btn" type="button" @click.stop="moveBlock('entry', tile.id, -1)" title="Yukarı Taşı">
                          <i class="pi pi-chevron-up" />
                        </button>
                        <button class="control-btn" type="button" @click.stop="moveBlock('entry', tile.id, 1)" title="Aşağı Taşı">
                          <i class="pi pi-chevron-down" />
                        </button>
                        <button class="control-btn danger" type="button" @click.stop="deleteSelectedBlock" title="Sil">
                          <i class="pi pi-trash" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div class="absolute-hover-divider">
                    <div class="hover-menu-container">
                      <button class="divider-btn" type="button" @click.stop="hoverAddMenuOrder = hoverAddMenuOrder === homeEntryTilesOrder ? null : homeEntryTilesOrder">
                        <i class="pi pi-plus" /> Ekle
                      </button>
                      <div v-if="hoverAddMenuOrder === homeEntryTilesOrder" class="hover-dropdown-menu">
                        <button class="hover-menu-item" type="button" @click.stop="addHomeBannerSlotAfter(homeEntryTilesOrder); hoverAddMenuOrder = null">
                          <i class="pi pi-images" /> Banner Ekle
                        </button>
                        <button class="hover-menu-item" type="button" @click.stop="addHomeSectionAfter(homeEntryTilesOrder); hoverAddMenuOrder = null">
                          <i class="pi pi-plus" /> Bölüm Ekle
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Banner Slots (20, 30) -->
                <div
                  v-for="slot in previewHomeBannersSlots.filter(s => s.order > homeEntryTilesOrder && s.order < 30)"
                  :key="slot.id"
                  class="preview-item-wrapper"
                >
                  <button
                    class="preview-dynamic-banner-card"
                    :class="{ selected: isSelected('surface', slot.id) }"
                    type="button"
                    @click="selectTarget('surface', slot.id)"
                  >
                    <div v-if="!slot.bannerId || !getBannerById(slot.bannerId)" class="preview-dynamic-banner-header">
                      <span class="preview-badge">Dinamik Banner (Sıra: {{ slot.order }})</span>
                      <strong>{{ textOf(slot.title, 'İsimsiz Banner Alanı') }}</strong>
                    </div>
                    <div
                      v-if="slot.bannerId && getBannerById(slot.bannerId)"
                      class="preview-dynamic-banner-cover"
                      :style="{
                        backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.65)), url(${getBannerActiveImage(slot.bannerId)})`,
                        aspectRatio: getBannerAspectRatio(slot.bannerId)
                      }"
                    >
                      <button class="delete-banner-btn" type="button" @click.stop="deleteHomeBannerSlot(slot.id)" title="Bu Banner Alanını Kaldır">
                        <i class="pi pi-times" />
                      </button>
                      <span class="banner-name">{{ getBannerName(slot.bannerId) }}</span>
                      <span class="banner-slides-count">{{ getBannerById(slot.bannerId)?.items?.length ?? 0 }} Görsel Bağlı</span>
                      <!-- Slide Dot Indicators -->
                      <div v-if="getBannerById(slot.bannerId)?.items?.length > 1" class="banner-slide-dots">
                        <span
                          v-for="(dot, dotIdx) in getBannerById(slot.bannerId).items"
                          :key="dotIdx"
                          class="slide-dot"
                          :class="{ active: dotIdx === (globalSlideIndex % getBannerById(slot.bannerId).items.length) }"
                        />
                      </div>
                      <div v-if="getBannerById(slot.bannerId)?.items?.length" class="banner-thumbnails-strip">
                        <img
                          v-for="(imgItem, imgIdx) in (getBannerById(slot.bannerId)?.items || [])"
                          :key="imgIdx"
                          :src="getFullUrl(imgItem.imageUrl)"
                          class="banner-thumbnail-img"
                        />
                      </div>
                    </div>
                    <div v-else class="preview-dynamic-banner-placeholder">
                      <button class="delete-banner-btn" type="button" @click.stop="deleteHomeBannerSlot(slot.id)" title="Bu Banner Alanını Kaldır">
                        <i class="pi pi-times" />
                      </button>
                      <i class="pi pi-images" />
                      <span>Boş Banner Alanı (Tıkla ve Kampanya Bağla)</span>
                    </div>
                  </button>
                  <!-- Control Overlay -->
                  <div v-if="isSelected('surface', slot.id)" class="preview-item-controls">
                    <button class="control-btn" type="button" @click.stop="moveBlock('surface', slot.id, -1)" title="Yukarı Taşı">
                      <i class="pi pi-chevron-up" />
                    </button>
                    <button class="control-btn" type="button" @click.stop="moveBlock('surface', slot.id, 1)" title="Aşağı Taşı">
                      <i class="pi pi-chevron-down" />
                    </button>
                    <button class="control-btn danger" type="button" @click.stop="deleteHomeBannerSlot(slot.id)" title="Sil">
                      <i class="pi pi-trash" />
                    </button>
                  </div>
                  <div class="absolute-hover-divider">
                    <div class="hover-menu-container">
                      <button class="divider-btn" type="button" @click.stop="hoverAddMenuOrder = hoverAddMenuOrder === slot.order ? null : slot.order">
                        <i class="pi pi-plus" /> Ekle
                      </button>
                      <div v-if="hoverAddMenuOrder === slot.order" class="hover-dropdown-menu">
                        <button class="hover-menu-item" type="button" @click.stop="addHomeBannerSlotAfter(slot.order); hoverAddMenuOrder = null">
                          <i class="pi pi-images" /> Banner Ekle
                        </button>
                        <button class="hover-menu-item" type="button" @click.stop="addHomeSectionAfter(slot.order); hoverAddMenuOrder = null">
                          <i class="pi pi-plus" /> Bölüm Ekle
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Interleaved Sections and Banner Slots (order >= 30) -->
                <div
                  v-for="item in previewInterleavedSectionsAndBanners"
                  :key="item.id"
                  class="preview-item-wrapper"
                  :draggable="true"
                  @mousedown="onWrapperMouseDown"
                  @dragstart="onSectionDragStart($event, item.id)"
                  @dragover.prevent
                  @dragenter.prevent="onSectionDragEnter(item.id)"
                  @dragleave="onSectionDragLeave(item.id)"
                  @drop="onSectionDrop($event, item.id)"
                  @dragend="onSectionDragEnd"
                >
                  <!-- Render Section -->
                  <template v-if="item.kind === 'section'">
                    <button
                      class="preview-section-card"
                      :class="{ 
                        selected: isSelected('section', item.id),
                        'is-dragging-placeholder': draggedSectionId === item.id
                      }"
                      type="button"
                      @click="selectTarget('section', item.id)"
                    >
                       <div class="preview-section-header">
                        <div>
                          <strong>{{ textOf(item.title, item.id) }}</strong>
                          <p v-if="item.id !== 'categories'">{{ previewSectionDescription(item.id) }}</p>
                        </div>
                        <span class="see-all-btn">{{ textOf(item.seeAllLabel, 'Tümünü Gör') }}</span>
                      </div>
                      
                      <!-- If it is categories section, render circular nodes -->
                      <div v-if="item.id === 'categories'" class="preview-categories-container">
                        <div class="preview-category-item">
                          <div class="category-circle-img" style="background-image: url('https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=100&q=80')"></div>
                          <span>Elektronik</span>
                        </div>
                        <div class="preview-category-item">
                          <div class="category-circle-img" style="background-image: url('https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=100&q=80')"></div>
                          <span>Antika</span>
                        </div>
                        <div class="preview-category-item">
                          <div class="category-circle-img" style="background-image: url('https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=100&q=80')"></div>
                          <span>Sanat</span>
                        </div>
                        <div class="preview-category-item">
                          <div class="category-circle-img" style="background-image: url('https://images.unsplash.com/photo-1576016770956-debb63d90029?w=100&q=80')"></div>
                          <span>Halı & Kilim</span>
                        </div>
                        <div class="preview-category-item">
                          <div class="category-circle-img" style="background-image: url('https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=100&q=80')"></div>
                          <span>Mücevher</span>
                        </div>
                      </div>
                      
                      <!-- Default generic section track -->
                      <div v-else class="preview-section-track">
                        <div
                          v-for="slot in previewSectionSlots(item.id)"
                          :key="slot"
                          class="preview-product-slot"
                        >
                          <span>{{ slot }}</span>
                        </div>
                      </div>
                    </button>
                  </template>

                  <template v-else-if="item.kind === 'banner-slot'">
                    <button
                      class="preview-dynamic-banner-card"
                      :class="{ 
                        selected: isSelected('surface', item.id),
                        'is-dragging-placeholder': draggedSectionId === item.id
                      }"
                      type="button"
                      @click="selectTarget('surface', item.id)"
                    >
                      <div v-if="!item.bannerId || !getBannerById(item.bannerId)" class="preview-dynamic-banner-header">
                        <span class="preview-badge">Dinamik Banner (Sıra: {{ item.order }})</span>
                        <strong>{{ textOf(item.title, 'İsimsiz Banner Alanı') }}</strong>
                      </div>
                      <div
                        v-if="item.bannerId && getBannerById(item.bannerId)"
                        class="preview-dynamic-banner-cover"
                        :style="{
                          backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.65)), url(${getBannerActiveImage(item.bannerId)})`,
                          aspectRatio: getBannerAspectRatio(item.bannerId)
                        }"
                      >
                        <button class="delete-banner-btn" type="button" @click.stop="deleteHomeBannerSlot(item.id)" title="Bu Banner Alanını Kaldır">
                          <i class="pi pi-times" />
                        </button>
                        <span class="banner-name">{{ getBannerName(item.bannerId) }}</span>
                        <span class="banner-slides-count">{{ getBannerById(item.bannerId)?.items?.length ?? 0 }} Görsel Bağlı</span>
                        <!-- Slide Dot Indicators -->
                        <div v-if="getBannerById(item.bannerId)?.items?.length > 1" class="banner-slide-dots">
                          <span
                            v-for="(dot, dotIdx) in getBannerById(item.bannerId).items"
                            :key="dotIdx"
                            :class="{ active: dotIdx === (globalSlideIndex % getBannerById(item.bannerId).items.length) }"
                            class="slide-dot"
                          />
                        </div>
                        <div v-if="getBannerById(item.bannerId)?.items?.length" class="banner-thumbnails-strip">
                          <img
                            v-for="(imgItem, imgIdx) in (getBannerById(item.bannerId)?.items || [])"
                            :key="imgIdx"
                            :src="getFullUrl(imgItem.imageUrl)"
                            class="banner-thumbnail-img"
                          />
                        </div>
                      </div>
                      <div v-else class="preview-dynamic-banner-placeholder">
                        <button class="delete-banner-btn" type="button" @click.stop="deleteHomeBannerSlot(item.id)" title="Bu Banner Alanını Kaldır">
                          <i class="pi pi-times" />
                        </button>
                        <i class="pi pi-images" />
                        <span>Boş Banner Alanı (Tıkla ve Kampanya Bağla)</span>
                      </div>
                    </button>
                  </template>
                  <!-- Control Overlay for Section -->
                  <div v-if="item.kind === 'section' && isSelected('section', item.id)" class="preview-item-controls">
                    <button class="control-btn" type="button" @click.stop="moveBlock('section', item.id, -1)" title="Yukarı Taşı">
                      <i class="pi pi-chevron-up" />
                    </button>
                    <button class="control-btn" type="button" @click.stop="moveBlock('section', item.id, 1)" title="Aşağı Taşı">
                      <i class="pi pi-chevron-down" />
                    </button>
                    <button 
                      class="control-btn drag-handle" 
                      type="button" 
                      title="Sürükle"
                    >
                      <i class="pi pi-bars" />
                    </button>
                    <button class="control-btn danger" type="button" @click.stop="deleteSelectedBlock" title="Sil">
                      <i class="pi pi-trash" />
                    </button>
                  </div>

                  <!-- Control Overlay for Interleaved Banner Slot -->
                  <div v-if="item.kind === 'banner-slot' && isSelected('surface', item.id)" class="preview-item-controls">
                    <button class="control-btn" type="button" @click.stop="moveBlock('surface', item.id, -1)" title="Yukarı Taşı">
                      <i class="pi pi-chevron-up" />
                    </button>
                    <button class="control-btn" type="button" @click.stop="moveBlock('surface', item.id, 1)" title="Aşağı Taşı">
                      <i class="pi pi-chevron-down" />
                    </button>
                    <button 
                      class="control-btn drag-handle" 
                      type="button" 
                      title="Sürükle"
                    >
                      <i class="pi pi-bars" />
                    </button>
                    <button class="control-btn danger" type="button" @click.stop="deleteHomeBannerSlot(item.id)" title="Sil">
                      <i class="pi pi-trash" />
                    </button>
                  </div>
                  <div class="absolute-hover-divider">
                    <div class="hover-menu-container">
                      <button class="divider-btn" type="button" @click.stop="hoverAddMenuOrder = hoverAddMenuOrder === item.order ? null : item.order">
                        <i class="pi pi-plus" /> Ekle
                      </button>
                      <div v-if="hoverAddMenuOrder === item.order" class="hover-dropdown-menu">
                        <button class="hover-menu-item" type="button" @click.stop="addHomeBannerSlotAfter(item.order); hoverAddMenuOrder = null">
                          <i class="pi pi-images" /> Banner Ekle
                        </button>
                        <button class="hover-menu-item" type="button" @click.stop="addHomeSectionAfter(item.order); hoverAddMenuOrder = null">
                          <i class="pi pi-plus" /> Bölüm Ekle
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="preview-item-wrapper" v-if="previewPromoBanners.length">
                  <div class="preview-story-rail">
                    <div
                      v-for="promo in previewPromoBanners"
                      :key="promo.id"
                      class="preview-item-wrapper"
                    >
                      <button
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
                      <!-- Control Overlay -->
                      <div v-if="isSelected('promo', promo.id)" class="preview-item-controls">
                        <button class="control-btn" type="button" @click.stop="moveBlock('promo', promo.id, -1)" title="Yukarı Taşı">
                          <i class="pi pi-chevron-up" />
                        </button>
                        <button class="control-btn" type="button" @click.stop="moveBlock('promo', promo.id, 1)" title="Aşağı Taşı">
                          <i class="pi pi-chevron-down" />
                        </button>
                        <button class="control-btn danger" type="button" @click.stop="deleteSelectedBlock" title="Sil">
                          <i class="pi pi-trash" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div class="absolute-hover-divider">
                    <div class="hover-menu-container">
                      <button class="divider-btn" type="button" @click.stop="hoverAddMenuOrder = hoverAddMenuOrder === 80 ? null : 80">
                        <i class="pi pi-plus" /> Ekle
                      </button>
                      <div v-if="hoverAddMenuOrder === 80" class="hover-dropdown-menu">
                        <button class="hover-menu-item" type="button" @click.stop="addHomeBannerSlotAfter(80); hoverAddMenuOrder = null">
                          <i class="pi pi-images" /> Banner Ekle
                        </button>
                        <button class="hover-menu-item" type="button" @click.stop="addHomeSectionAfter(80); hoverAddMenuOrder = null">
                          <i class="pi pi-plus" /> Bölüm Ekle
                        </button>
                      </div>
                    </div>
                  </div>
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
                <div class="tab-item active">
                  <i class="pi pi-home" />
                  <span>Ana Sayfa</span>
                </div>
                <div class="tab-item">
                  <i class="pi pi-search" />
                  <span>Ara</span>
                </div>
                <div class="tab-item">
                  <i class="pi pi-plus-circle" />
                  <span>İlan Ver</span>
                </div>
                <div class="tab-item">
                  <i class="pi pi-heart" />
                  <span>Favoriler</span>
                </div>
                <div class="tab-item">
                  <i class="pi pi-hammer" />
                  <span>Müzayede</span>
                </div>
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
          <div style="display: flex; align-items: center; gap: 8px;">
            <div v-if="selectedTargetSupportsOrder" class="drawer-header-order-buttons" style="display: flex; gap: 4px;">
              <button 
                class="button icon-only secondary compact" 
                type="button" 
                title="Yukarı Taşı"
                style="padding: 4px 8px; font-size: 11px;"
                @click="moveSelectedBlock(-1)"
              >
                <i class="pi pi-chevron-up" />
              </button>
              <button 
                class="button icon-only secondary compact" 
                type="button" 
                title="Aşağı Taşı"
                style="padding: 4px 8px; font-size: 11px;"
                @click="moveSelectedBlock(1)"
              >
                <i class="pi pi-chevron-down" />
              </button>
            </div>
            <span class="status-pill" :class="{ ghost: !selectedBlockEnabled }">
              {{ selectedBlockEnabled ? 'Visible' : 'Hidden' }}
            </span>
          </div>
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

            <!-- Dil Sekmeleri -->
            <div v-if="hasLocalizedFields" class="locale-tabs">
              <button
                class="locale-tab"
                :class="{ active: activeLocale === 'tr' }"
                type="button"
                @click="activeLocale = 'tr'"
              >
                🇹🇷 Türkçe (TR)
              </button>
              <button
                class="locale-tab"
                :class="{ active: activeLocale === 'en' }"
                type="button"
                @click="activeLocale = 'en'"
              >
                🇬🇧 English (EN)
              </button>
            </div>

            <template v-if="selectedHeroBanner">
              <template v-if="activeLocale === 'tr'">
                <LocalizedField label="Badge (TR)" v-model="selectedHeroBanner.badge.tr" />
                <LocalizedField label="Başlık (TR)" v-model="selectedHeroBanner.title.tr" />
                <LocalizedField label="Alt Metin (TR)" v-model="selectedHeroBanner.subtitle.tr" />
                <LocalizedField label="CTA Etiketi (TR)" v-model="selectedHeroBanner.cta.label.tr" />
              </template>
              <template v-else>
                <LocalizedField label="Badge (EN)" v-model="selectedHeroBanner.badge.en" />
                <LocalizedField label="Başlık (EN)" v-model="selectedHeroBanner.title.en" />
                <LocalizedField label="Alt Metin (EN)" v-model="selectedHeroBanner.subtitle.en" />
                <LocalizedField label="CTA Etiketi (EN)" v-model="selectedHeroBanner.cta.label.en" />
              </template>
              <label class="field">
                <span>CTA Rota (Route)</span>
                <input v-model.trim="selectedHeroBanner.cta.route" class="input" type="text" list="mobile-route-options" />
              </label>
              <label class="field">
                <span>Görsel URL</span>
                <input v-model.trim="selectedHeroBanner.imageUrl" class="input" type="text" />
              </label>
            </template>

            <template v-else-if="selectedEntryTile">
              <template v-if="activeLocale === 'tr'">
                <LocalizedField label="Başlık (TR)" v-model="selectedEntryTile.title.tr" />
                <LocalizedField label="Alt Metin (TR)" v-model="selectedEntryTile.subtitle.tr" />
                <LocalizedField label="CTA Etiketi (TR)" v-model="selectedEntryTile.cta.label.tr" />
              </template>
              <template v-else>
                <LocalizedField label="Başlık (EN)" v-model="selectedEntryTile.title.en" />
                <LocalizedField label="Alt Metin (EN)" v-model="selectedEntryTile.subtitle.en" />
                <LocalizedField label="CTA Etiketi (EN)" v-model="selectedEntryTile.cta.label.en" />
              </template>
              <label class="field">
                <span>CTA Rota (Route)</span>
                <input v-model.trim="selectedEntryTile.cta.route" class="input" type="text" list="mobile-route-options" />
              </label>
            </template>

            <template v-else-if="selectedHomeSection">
              <template v-if="activeLocale === 'tr'">
                <LocalizedField label="Başlık (TR)" v-model="selectedHomeSection.title.tr" />
                <LocalizedField label="Tümünü Gör Etiketi (TR)" v-model="selectedHomeSection.seeAllLabel.tr" />
              </template>
              <template v-else>
                <LocalizedField label="Başlık (EN)" v-model="selectedHomeSection.title.en" />
                <LocalizedField label="Tümünü Gör Etiketi (EN)" v-model="selectedHomeSection.seeAllLabel.en" />
              </template>
              <label class="field">
                <span>Tümünü Gör Rota (Route)</span>
                <input v-model.trim="selectedHomeSection.route" class="input" type="text" list="mobile-route-options" />
              </label>
            </template>

            <template v-else-if="selectedPromoBanner">
              <template v-if="activeLocale === 'tr'">
                <LocalizedField label="Etiket (TR)" v-model="selectedPromoBanner.label.tr" />
                <LocalizedField label="Başlık (TR)" v-model="selectedPromoBanner.title.tr" />
                <LocalizedField label="Alt Metin (TR)" v-model="selectedPromoBanner.subtitle.tr" />
                <LocalizedField label="CTA Etiketi (TR)" v-model="selectedPromoBanner.cta.label.tr" />
              </template>
              <template v-else>
                <LocalizedField label="Etiket (EN)" v-model="selectedPromoBanner.label.en" />
                <LocalizedField label="Başlık (EN)" v-model="selectedPromoBanner.title.en" />
                <LocalizedField label="Alt Metin (EN)" v-model="selectedPromoBanner.subtitle.en" />
                <LocalizedField label="CTA Etiketi (EN)" v-model="selectedPromoBanner.cta.label.en" />
              </template>
              <label class="field">
                <span>CTA Rota (Route)</span>
                <input v-model.trim="selectedPromoBanner.cta.route" class="input" type="text" list="mobile-route-options" />
              </label>
              <label class="field">
                <span>Görsel URL</span>
                <input v-model.trim="selectedPromoBanner.imageUrl" class="input" type="text" />
              </label>
            </template>

            <template v-else-if="selectedTrustBlock">
              <template v-if="activeLocale === 'tr'">
                <LocalizedField label="Başlık (TR)" v-model="selectedTrustBlock.title.tr" />
                <LocalizedField label="Alt Metin (TR)" v-model="selectedTrustBlock.subtitle.tr" />
                <LocalizedField label="CTA Etiketi (TR)" v-model="selectedTrustBlock.cta.label.tr" />
              </template>
              <template v-else>
                <LocalizedField label="Başlık (EN)" v-model="selectedTrustBlock.title.en" />
                <LocalizedField label="Alt Metin (EN)" v-model="selectedTrustBlock.subtitle.en" />
                <LocalizedField label="CTA Etiketi (EN)" v-model="selectedTrustBlock.cta.label.en" />
              </template>
              <label class="field">
                <span>CTA Rota (Route)</span>
                <input v-model.trim="selectedTrustBlock.cta.route" class="input" type="text" list="mobile-route-options" />
              </label>
            </template>

            <template v-else-if="selectedProductCard">
              <template v-if="activeLocale === 'tr'">
                <LocalizedField label="Etiket (TR)" v-model="selectedProductCard.badge.tr" />
                <LocalizedField label="CTA Etiketi (TR)" v-model="selectedProductCard.ctaLabel.tr" />
              </template>
              <template v-else>
                <LocalizedField label="Etiket (EN)" v-model="selectedProductCard.badge.en" />
                <LocalizedField label="CTA Etiketi (EN)" v-model="selectedProductCard.ctaLabel.en" />
              </template>
              <label class="checkbox-pill full-width">
                <input v-model="selectedProductCard.showCategory" type="checkbox" />
                <span>Kategori görünsün</span>
              </label>
              <label class="checkbox-pill full-width">
                <input v-model="selectedProductCard.showPrice" type="checkbox" />
                <span>Fiyat görünsün</span>
              </label>
              <label class="checkbox-pill full-width">
                <input v-model="selectedProductCard.showAskPriceBadge" type="checkbox" />
                <span>Fiyat sor rozeti görünsün</span>
              </label>
            </template>

            <template v-else-if="selectedAuctionListCard">
              <template v-if="activeLocale === 'tr'">
                <LocalizedField label="Canlı Rozet Etiketi (TR)" v-model="selectedAuctionListCard.liveBadgeLabel.tr" />
                <LocalizedField label="CTA Etiketi (TR)" v-model="selectedAuctionListCard.ctaLabel.tr" />
              </template>
              <template v-else>
                <LocalizedField label="Canlı Rozet Etiketi (EN)" v-model="selectedAuctionListCard.liveBadgeLabel.en" />
                <LocalizedField label="CTA Etiketi (EN)" v-model="selectedAuctionListCard.ctaLabel.en" />
              </template>
              <label class="checkbox-pill full-width">
                <input v-model="selectedAuctionListCard.showBidCount" type="checkbox" />
                <span>Teklif sayısı görünsün</span>
              </label>
              <label class="checkbox-pill full-width">
                <input v-model="selectedAuctionListCard.showStatusBadge" type="checkbox" />
                <span>Durum rozeti görünsün</span>
              </label>
              <label class="checkbox-pill full-width">
                <input v-model="selectedAuctionListCard.showTimer" type="checkbox" />
                <span>Süre sayacı görünsün</span>
              </label>
            </template>

            <template v-else-if="selectedListingCreateConfig">
              <div class="drawer-note">
                Bu alandaki seçimler mobilde İlan Ver adımlarında kullanıcıya gösterilecek opsiyonel kalemleri belirler.
              </div>

              <label class="field">
                <span>Düzenleme Kapsamı</span>
                <select v-model="selectedListingCategoryScope" class="select">
                  <option value="global">Global (Tüm Kategoriler)</option>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                    {{ cat.name }} (Özel Ayar)
                  </option>
                </select>
              </label>

              <div v-if="selectedListingCategoryScope !== 'global'" class="drawer-action-row" style="margin-bottom: 12px; display: flex; gap: 8px;">
                <button 
                  v-if="activeListingFields === null" 
                  class="button primary full-width" 
                  type="button" 
                  @click="createCategoryListingRule"
                >
                  Kategoriye Özel Kural Oluştur
                </button>
                <button 
                  v-else 
                  class="button danger full-width" 
                  type="button" 
                  @click="deleteCategoryListingRule"
                >
                  Kuralı Sil / Global Seçime Dön
                </button>
              </div>

              <div v-if="activeListingFields === null" class="drawer-note warning" style="background-color: #fffbeb; border-color: #fef3c7; color: #b45309; padding: 10px; border-radius: 6px;">
                Bu kategori için özel bir kural tanımlanmamış. Şu anda global ayarlar geçerlidir. Kategoriye özel düzenleme yapmak için yukarıdaki butona tıklayın.
              </div>

              <section
                v-else
                v-for="group in LISTING_CREATE_FIELD_GROUPS"
                :key="`listing-field-group-${group.id}`"
                class="listing-field-group"
              >
                <header class="listing-field-group-header">
                  <strong>{{ group.title }}</strong>
                  <span>{{ group.options.filter((option) => activeListingFields.includes(option.key)).length }}/{{ group.options.length }}</span>
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
                    :checked="activeListingFields.includes(option.key)"
                    type="checkbox"
                    @change="toggleListingCreateField(option.key)"
                  />
                  <span>{{ option.label }}</span>
                </label>
              </section>
            </template>

            <template v-else-if="selectedSurfaceSlot">
              <template v-if="selectedSurfaceSlot.surface === 'HOME'">
                <label class="field">
                  <span>Dinamik Banner Kampanyası Seçin *</span>
                  <div class="input-with-button">
                    <select v-model="selectedSurfaceSlot.bannerId" class="select">
                      <option value="">-- Banner Seçin --</option>
                      <option v-for="banner in bannersList" :key="banner.id" :value="banner.id">
                        {{ banner.name }} ({{ banner.aspectRatio }})
                      </option>
                    </select>
                    <button class="button secondary" type="button" @click="$router.push({ name: 'banners' })" title="Banner Yönetimine Git">
                      <i class="pi pi-external-link" /> Yönet
                    </button>
                  </div>
                </label>
              </template>
              <template v-else>
                <template v-if="activeLocale === 'tr'">
                  <LocalizedField label="Başlık (TR)" v-model="selectedSurfaceSlot.title.tr" />
                  <LocalizedField label="Alt Metin (TR)" v-model="selectedSurfaceSlot.subtitle.tr" />
                  <LocalizedField label="CTA Etiketi (TR)" v-model="selectedSurfaceSlot.cta.label.tr" />
                </template>
                <template v-else>
                  <LocalizedField label="Başlık (EN)" v-model="selectedSurfaceSlot.title.en" />
                  <LocalizedField label="Alt Metin (EN)" v-model="selectedSurfaceSlot.subtitle.en" />
                  <LocalizedField label="CTA Etiketi (EN)" v-model="selectedSurfaceSlot.cta.label.en" />
                </template>
                <label class="field">
                  <span>CTA Rota (Route)</span>
                  <input v-model.trim="selectedSurfaceSlot.cta.route" class="input" type="text" list="mobile-route-options" />
                </label>
                <label class="field">
                  <span>Surface Anahtarı (Key)</span>
                  <select v-model="selectedSurfaceSlot.surface" class="select">
                    <option v-for="surface in SURFACE_OPTIONS" :key="surface" :value="surface">
                      {{ surface }}
                    </option>
                  </select>
                </label>
                <label class="field">
                  <span>Dinamik Banner Bağla (Opsiyonel)</span>
                  <div class="input-with-button">
                    <select v-model="selectedSurfaceSlot.bannerId" class="select">
                      <option value="">-- Banner Seçmeyin (Statik Slot) --</option>
                      <option v-for="banner in bannersList" :key="banner.id" :value="banner.id">
                        {{ banner.name }} ({{ banner.aspectRatio }})
                      </option>
                    </select>
                    <button class="button secondary" type="button" @click="$router.push({ name: 'banners' })" title="Banner Yönetimine Git">
                      <i class="pi pi-external-link" /> Yönet
                    </button>
                  </div>
                </label>
              </template>
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

    <!-- YAYINLAMA SİHİRBAZI MODAL OVERLAY -->
    <div v-if="showPublishWizard" class="modal-overlay" @click.self="showPublishWizard = false">
      <div class="modal-card">
        <header class="modal-header">
          <h2>Yayınla (v{{ documentVersion }})</h2>
          <button class="button icon-only" type="button" @click="showPublishWizard = false">
            <i class="pi pi-times" aria-hidden="true" />
          </button>
        </header>
        
        <div class="modal-body">
          <div v-if="validationIssues.length" class="validation-box error-box" style="margin-bottom: 16px;">
            <strong>Yayınlamayı Engelleyen Hatalar</strong>
            <ul>
              <li v-for="issue in validationIssues" :key="`${issue.path}-${issue.code}`">
                <span>{{ issue.path }}</span>
                <p>{{ issue.message }}</p>
              </li>
            </ul>
          </div>

          <section class="publish-wizard-section" style="margin-bottom: 20px;">
            <h3 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 8px;">Pre-publish Checklist</h3>
            <ul class="wizard-checklist" style="list-style: none; padding: 0; display: grid; gap: 8px;">
              <li v-for="item in prePublishChecklist" :key="item.key" :class="{ pass: item.passed, fail: !item.passed }" style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 6px;">
                <span class="status-badge" style="font-weight: 800; font-size: 0.8rem; padding: 2px 6px; border-radius: 4px;">{{ item.passed ? '✓' : '✗' }}</span>
                <span class="status-label">{{ item.label }}</span>
              </li>
            </ul>
          </section>

          <section class="publish-wizard-section" style="margin-bottom: 20px;">
            <h3 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 8px;">Draft vs Published Değişiklik Özeti</h3>
            <div class="diff-container" style="max-height: 200px; overflow-y: auto; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px;">
              <ul v-if="diffEntries.length" class="wizard-diff-list" style="list-style: none; padding: 0; display: grid; gap: 10px;">
                <li v-for="entry in diffEntries" :key="entry.path" style="border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px;">
                  <strong style="font-size: 0.85rem; color: #475569; display: block; word-break: break-all;">{{ entry.path }}</strong>
                  <p style="font-size: 0.9rem; color: #1e293b; margin: 2px 0 0;">{{ entry.before || '(Boş)' }} ➔ <span style="font-weight: 600; color: #0284c7;">{{ entry.after || '(Boş)' }}</span></p>
                </li>
              </ul>
              <p v-else class="muted-note" style="color: #64748b; font-style: italic; font-size: 0.9rem;">Herhangi bir değişiklik bulunmamaktadır. Taslak yayındaki sürümle birebir aynı.</p>
            </div>
          </section>

          <section class="publish-wizard-section">
            <h3 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 8px;">Not (opsiyonel)</h3>
            <label class="field">
              <textarea
                v-model="publishReason"
                class="textarea"
                placeholder="İstersen kısa bir not bırak (Örn: Haftasonu kampanyası manşeti güncellendi)"
                rows="2"
                style="width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; font-family: inherit; resize: vertical;"
              />
            </label>
          </section>
        </div>

        <footer class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
          <button class="button" type="button" @click="showPublishWizard = false">Vazgeç</button>
          <button
            class="button primary"
            type="button"
            :disabled="loading || !canPublish"
            @click="confirmPublishWizard"
          >
            <i class="pi pi-send" aria-hidden="true" />
            {{ hasUnsavedChanges ? 'Kaydet ve Yayına Al' : 'Yayına Al' }}
          </button>
        </footer>
      </div>
    </div>

    <!-- GEÇMİŞ DENETİM MODAL OVERLAY -->
    <div v-if="showAuditHistory" class="modal-overlay" @click.self="showAuditHistory = false">
      <div class="modal-card wide-card">
        <header class="modal-header">
          <h2>Yayınlama ve Değişiklik Geçmişi (Audit Logs)</h2>
          <button class="button icon-only" type="button" @click="showAuditHistory = false">
            <i class="pi pi-times" aria-hidden="true" />
          </button>
        </header>

        <div class="modal-body" style="max-height: 480px; overflow-y: auto;">
          <div v-if="auditSummary.length" class="audit-timeline" style="display: grid; gap: 16px;">
            <div v-for="item in auditSummary" :key="item.id" class="timeline-item" style="border-left: 3px solid #cbd5e1; padding-left: 12px; margin-left: 4px;">
              <div class="timeline-meta" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                <span class="badge" :class="item.action.includes('PUBLISHED') ? 'success' : 'info'" style="font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 99px;">
                  {{ item.action.includes('PUBLISHED') ? 'YAYIN' : 'GÜNCELLEME' }}
                </span>
                <span class="time" style="font-size: 0.8rem; color: #64748b;">{{ new Date(item.createdAt).toLocaleString('tr-TR') }}</span>
              </div>
              <div class="timeline-content">
                <strong style="font-size: 0.95rem; color: #1e293b;">{{ item.reason || 'Gerekçe girilmedi' }}</strong>
                <p class="actor" style="font-size: 0.85rem; color: #64748b; margin: 4px 0 2px;">Yönetici: {{ item.actorDisplayName || item.actorAdminId }} | Sürüm: v{{ item.metadata?.version ?? '?' }}</p>
                <p class="target" style="font-size: 0.8rem; color: #94a3b8; margin: 0;">Hedef: {{ item.targetId }}</p>
              </div>
            </div>
          </div>
          <p v-else class="muted-note" style="color: #64748b; font-style: italic; font-size: 0.9rem;">Herhangi bir denetim kaydı bulunamadı.</p>
        </div>

        <footer class="modal-footer" style="display: flex; justify-content: flex-end; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
          <button class="button" type="button" @click="showAuditHistory = false">Kapat</button>
        </footer>
      </div>
    </div>

    <div v-if="error" class="error-text">
      <i class="pi pi-exclamation-triangle" style="font-size: 16px;" aria-hidden="true" />
      <span>{{ error }}</span>
      <button class="button icon-only ghost" type="button" @click="error = null" style="color: #ef4444 !important; margin-left: 12px; padding: 2px; border-radius: 50%;">
        <i class="pi pi-times" aria-hidden="true" />
      </button>
    </div>

    <datalist id="mobile-route-options">
      <option v-for="option in MOBILE_ROUTE_OPTIONS" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </datalist>
  </section>
</template>

<script setup lang="ts">
import axios from 'axios';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute } from 'vue-router';
import LocalizedField from '../../components/LocalizedField.vue';
import { adminApi, API_URL, toApiMessage } from '../../services/api';

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
  categoryFields?: Record<string, ListingCreateOptionalField[]>;
}

interface SurfaceSlot extends AudienceBlock {
  title: LocalizedText;
  subtitle: LocalizedText;
  cta: CtaConfig;
  surface: string;
  bannerId?: string;
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
  actorDisplayName?: string | null;
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
const updatedAt = ref<string | null>(null);
const updatedByAdminId = ref<string | null>(null);
const publishedByAdminId = ref<string | null>(null);
const selectedLocale = ref<PreviewLocale>('tr');
const selectedAudience = ref('BUYER');
const selectedDevice = ref<DevicePreset>('iphone');
const selectedTarget = ref<EditorTarget | null>(null);
const activeDrawerTab = ref<DrawerTab>('content');
const activeLocale = ref<'tr' | 'en'>('tr');
const hasLocalizedFields = computed(() => {
  const kind = selectedTarget.value?.kind;
  if (!kind || kind === 'listing-fields') return false;
  return true;
});
const workspaceMode = ref<WorkspaceMode>('full');
const focusStage = ref<FocusStage>('select');
const showWorkspaceLauncher = ref(true);
const showAddMenu = ref(false);
const hoverAddMenuOrder = ref<number | null>(null);
const currentWorkspaceArea = ref<WorkspaceArea | null>(null);
const route = useRoute();
const documentVersion = ref(1);
const baselineSnapshot = ref('');
const publishedDraft = ref<MobileConfigDraft | null>(null);
const validationIssues = ref<ValidationIssue[]>([]);
const auditSummary = ref<AuditLogItem[]>([]);

const categories = ref<Array<{ id: string; name: string }>>([]);
const selectedListingCategoryScope = ref<string>('global');

const showNavigator = ref(false);
const showAuditHistory = ref(false);
const showPublishWizard = ref(false);
const publishReason = ref('');

const activeListingFields = computed(() => {
  if (!draft.value) return [];
  if (selectedListingCategoryScope.value === 'global') {
    return draft.value.listingCreate.optionalFields;
  }
  const categoryFields = (draft.value.listingCreate as any).categoryFields;
  if (!categoryFields || !categoryFields[selectedListingCategoryScope.value]) {
    return null;
  }
  return categoryFields[selectedListingCategoryScope.value];
});

async function loadCategories() {
  try {
    const response = await adminApi.get<{ items: Array<{ id: string; name: string }> }>('/admin/categories');
    categories.value = response.data.items ?? [];
  } catch (err) {
    console.warn('Failed to load categories', err);
  }
}

function createCategoryListingRule() {
  if (!draft.value) return;
  if (!(draft.value.listingCreate as any).categoryFields) {
    (draft.value.listingCreate as any).categoryFields = {};
  }
  (draft.value.listingCreate as any).categoryFields[selectedListingCategoryScope.value] = [
    ...draft.value.listingCreate.optionalFields
  ];
}

function deleteCategoryListingRule() {
  if (!draft.value || !(draft.value.listingCreate as any).categoryFields) return;
  delete (draft.value.listingCreate as any).categoryFields[selectedListingCategoryScope.value];
}

const draggedSectionId = ref<string | null>(null);
const draggedHeroId = ref<string | null>(null);
const dragOverSectionId = ref<string | null>(null);
const dragOverHeroId = ref<string | null>(null);
const isReadyToDrag = ref(false);
const isMouseDownOnHandle = ref(false);

function onWrapperMouseDown(event: MouseEvent) {
  const target = event.target as HTMLElement;
  isMouseDownOnHandle.value = !!target.closest('.drag-handle');
}

function onSectionDragStart(event: DragEvent, sectionId: string) {
  if (!isMouseDownOnHandle.value) {
    event.preventDefault();
    return;
  }
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', sectionId);
  }
  setTimeout(() => {
    draggedSectionId.value = sectionId;
  }, 0);
}

function onSectionDrop(event: DragEvent, targetSectionId: string) {
  dragOverSectionId.value = null;
  draggedSectionId.value = null;
  isMouseDownOnHandle.value = false;
}

function onSectionDragEnd() {
  draggedSectionId.value = null;
  dragOverSectionId.value = null;
  isMouseDownOnHandle.value = false;
}

function onSectionDragEnter(sectionId: string) {
  const currentDragged = draggedSectionId.value;
  if (!draft.value || !currentDragged || currentDragged === sectionId) return;

  const list = previewInterleavedSectionsAndBanners.value;
  const draggedIndex = list.findIndex((s) => s.id === currentDragged);
  const targetIndex = list.findIndex((s) => s.id === sectionId);

  if (draggedIndex >= 0 && targetIndex >= 0) {
    const swappedList = [...list];
    const [draggedItem] = swappedList.splice(draggedIndex, 1);
    swappedList.splice(targetIndex, 0, draggedItem);
    
    swappedList.forEach((item, idx) => {
      const newOrder = 30 + idx;
      if (item.kind === 'section') {
        const section = draft.value.home.sections.find(s => s.id === item.id);
        if (section) section.order = newOrder;
        const mirrorSlot = draft.value.otherSurfaces.find(s => s.id === `home-${item.id}`);
        if (mirrorSlot) mirrorSlot.order = newOrder;
      } else if (item.kind === 'banner-slot') {
        const slot = draft.value.otherSurfaces.find(s => s.id === item.id);
        if (slot) slot.order = newOrder;
      }
    });

    draft.value.home.sections.sort((a, b) => a.order - b.order);
    draft.value.otherSurfaces.sort((a, b) => a.order - b.order);
  }
}

function onSectionDragLeave(sectionId: string) {
  // Not used in live swap
}

function onHeroDragStart(event: DragEvent, bannerId: string) {
  if (!isMouseDownOnHandle.value) {
    event.preventDefault();
    return;
  }
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', bannerId);
  }
  setTimeout(() => {
    draggedHeroId.value = bannerId;
  }, 0);
}

function onHeroDrop(event: DragEvent, targetBannerId: string) {
  dragOverHeroId.value = null;
  draggedHeroId.value = null;
  isMouseDownOnHandle.value = false;
}

function onHeroDragEnd() {
  draggedHeroId.value = null;
  dragOverHeroId.value = null;
  isMouseDownOnHandle.value = false;
}

function onHeroDragEnter(bannerId: string) {
  const currentDragged = draggedHeroId.value;
  if (!draft.value || !currentDragged || currentDragged === bannerId) return;

  const banners = draft.value.home.heroBanners;
  const draggedIndex = banners.findIndex((b) => b.id === currentDragged);
  const targetIndex = banners.findIndex((b) => b.id === bannerId);

  if (draggedIndex >= 0 && targetIndex >= 0) {
    const [draggedItem] = banners.splice(draggedIndex, 1);
    banners.splice(targetIndex, 0, draggedItem);
    banners.forEach((banner, idx) => {
      banner.order = idx + 1;
    });
  }
}

function onHeroDragLeave(bannerId: string) {
  // Not used in live swap
}

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
  'category-products': { tr: 'Kategori Urunleri', en: 'Category products' },
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
  'category-products': ['Kategori Ürün 1', 'Kategori Ürün 2', 'Kategori Ürün 3'],
  'discounted-products': ['%20', '%15', '%10'],
  'most-liked-products': ['Like', 'Like', 'Like'],
  campaigns: ['Kampanya', 'Kampanya', 'Kampanya'],
  blog: ['Blog', 'Blog', 'Blog'],
  'trust-hub': ['Onay', 'Orijin', 'Guven'],
};

// Mobil uygulamadaki gerçek ekran rotaları — route alanlarında öneri olarak sunulur.
const MOBILE_ROUTE_OPTIONS = [
  { value: '/home', label: 'Ana Sayfa' },
  { value: '/buy-now', label: 'Hemen Al' },
  { value: '/(tabs)/categories', label: 'Kategoriler' },
  { value: '/(tabs)/auctions', label: 'Müzayedeler' },
  { value: '/(tabs)/explore', label: 'Keşfet' },
  { value: '/(tabs)/membership', label: 'Üyelik / Abonelik' },
  { value: '/(tabs)/become-seller', label: 'Satıcı Ol' },
  { value: '/(tabs)/profile', label: 'Profil' },
  { value: '/(tabs)/notifications', label: 'Bildirimler' },
  { value: '/(tabs)/orders', label: 'Siparişler' },
  { value: '/(tabs)/favoriler', label: 'Favoriler' },
  { value: '/(tabs)/settings', label: 'Ayarlar' },
];

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
  { id: 'home-live-auctions', order: 4, title: 'Canlı Müzayedeler' },
  { id: 'home-listings', order: 5, title: 'İlanlar Alanı' },
  { id: 'home-recently-viewed', order: 6, title: 'Son Gezdiklerim' },
  { id: 'home-categories', order: 7, title: 'Kategoriler' },
  { id: 'home-category-products', order: 8, title: 'Kategori Ürünleri' },
  { id: 'home-discounted-products', order: 9, title: 'İndirimli Ürünler' },
  { id: 'home-most-liked-products', order: 10, title: 'En Çok Beğenilenler' },
  { id: 'home-trust-bar', order: 11, title: 'Güven Barı' },
  { id: 'home-campaigns', order: 12, title: 'Kampanyalar' },
  { id: 'home-blog', order: 13, title: 'Blog' },
  { id: 'home-trust-hub', order: 14, title: 'Güven Merkezi' },
  { id: 'home-quick-tab-bar', order: 15, title: 'Hızlı Sekme Çubuğu' },
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
  const normalizedCategoryFields = {} as Record<string, ListingCreateOptionalField[]>;
  if ((normalized.listingCreate as any)?.categoryFields) {
    for (const [catId, fields] of Object.entries((normalized.listingCreate as any).categoryFields)) {
      if (Array.isArray(fields)) {
        normalizedCategoryFields[catId] = fields.filter((field): field is ListingCreateOptionalField =>
          LISTING_CREATE_FIELD_KEY_SET.has(field)
        );
      }
    }
  }
  normalized.listingCreate = {
    optionalFields: selectedListingFields.length > 0
      ? [...new Set(selectedListingFields)]
      : LISTING_CREATE_FIELD_OPTIONS.map((option) => option.key),
    categoryFields: normalizedCategoryFields,
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

  // Sort raw arrays by order so their index matches visual order
  normalized.home.sections.sort((a, b) => a.order - b.order);
  normalized.home.heroBanners.sort((a, b) => a.order - b.order);
  normalized.home.entryTiles.sort((a, b) => a.order - b.order);
  normalized.otherSurfaces.sort((a, b) => a.order - b.order);

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
      return selectedSurfaceSlot.value?.surface === 'HOME'
        ? 'Ana Sayfa Banner Alanı'
        : textOf(selectedSurfaceSlot.value?.title, selectedSurfaceSlot.value?.id ?? 'Surface');
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
    surface: selectedSurfaceSlot.value?.surface === 'HOME'
      ? 'Ana sayfa dinamik banner kampanya seçimi'
      : 'Diger ekran slotu metin, audience ve route ayarlari',
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

const homeSearchBarOrder = computed(() => {
  if (!draft.value) return 1;
  const slot = draft.value.otherSurfaces.find((s) => s.id === 'home-search-bar');
  return slot ? slot.order : 1;
});

const homeHeroBannersOrder = computed(() => {
  if (!draft.value) return 2;
  const slot = draft.value.otherSurfaces.find((s) => s.id === 'home-hero-banners');
  return slot ? slot.order : 2;
});

const homeEntryTilesOrder = computed(() => {
  if (!draft.value) return 3;
  const slot = draft.value.otherSurfaces.find((s) => s.id === 'home-entry-tiles');
  return slot ? slot.order : 3;
});

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
          subtitle: `${draft.value.listingCreate.optionalFields.length} alan secili` + (Object.keys((draft.value.listingCreate as any).categoryFields || {}).length ? ` (${Object.keys((draft.value.listingCreate as any).categoryFields).length} ozel kategori)` : ''),
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
      title: 'Anasayfa Bolumleri (Bannerlar)',
      items: sortByOrder(draft.value.otherSurfaces.filter((item) => item.surface === 'HOME')).map((item) => ({
        id: item.id,
        kind: 'surface',
        label: textOf(item.title, item.id) || 'İsimsiz Banner Alanı',
        subtitle: item.bannerId ? `Bağlı Banner: ${getBannerName(item.bannerId)}` : 'Boş Banner Alanı',
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

const previewHomeBannersSlots = computed(() =>
  sortByOrder(draft.value?.otherSurfaces ?? []).filter(
    (item) => item.enabled
      && item.surface === 'HOME'
      && (item.bannerId || isSelected('surface', item.id))
      && matchesAudience(item.audiences),
  ),
);

const previewInterleavedSectionsAndBanners = computed(() => {
  if (!draft.value) return [];
  const sections = (draft.value.home.sections ?? [])
    .filter((item) => item.enabled && matchesAudience(item.audiences))
    .map((item) => ({ ...item, kind: 'section' as const }));

  const bannerSlots = (draft.value.otherSurfaces ?? [])
    .filter((item) => item.enabled
      && item.surface === 'HOME'
      && item.order >= 30
      && (item.bannerId || isSelected('surface', item.id))
      && matchesAudience(item.audiences)
    )
    .map((item) => ({ ...item, kind: 'banner-slot' as const }));

  return [...sections, ...bannerSlots].sort((left, right) => left.order - right.order);
});

const previewOtherSurfaces = computed(() =>
  sortByOrder(draft.value?.otherSurfaces ?? []).filter(
    (item) => item.enabled && item.surface !== 'HOME' && matchesAudience(item.audiences),
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
    ...draft.value.otherSurfaces.filter((item) => item.surface !== 'HOME').map((item) => item.title),
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
const updatedAtLabel = computed(() =>
  updatedAt.value ? new Date(updatedAt.value).toLocaleString('tr-TR') : '-',
);
const updatedByLabel = computed(() => updatedByAdminId.value ?? '-');
const publishedByLabel = computed(() => publishedByAdminId.value ?? '-');
const hasUnsavedChanges = computed(() => {
  if (!draft.value) return false;
  return JSON.stringify(draft.value) !== baselineSnapshot.value;
});
const hasUnpublishedChanges = computed(() => {
  if (!draft.value || !publishedDraft.value) return true;
  return JSON.stringify(draft.value) !== JSON.stringify(publishedDraft.value);
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

  if (selectedListingCategoryScope.value === 'global') {
    const currentFields = draft.value.listingCreate.optionalFields;
    const index = currentFields.indexOf(field);
    if (index >= 0) {
      currentFields.splice(index, 1);
      return;
    }
    currentFields.push(field);
    return;
  }

  if (!(draft.value.listingCreate as any).categoryFields) {
    (draft.value.listingCreate as any).categoryFields = {};
  }
  if (!(draft.value.listingCreate as any).categoryFields[selectedListingCategoryScope.value]) {
    (draft.value.listingCreate as any).categoryFields[selectedListingCategoryScope.value] = [
      ...draft.value.listingCreate.optionalFields
    ];
  }
  const currentFields = (draft.value.listingCreate as any).categoryFields[selectedListingCategoryScope.value];
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

function moveInterleavedBlock(itemId: string, kind: 'section' | 'surface', delta: number) {
  if (!draft.value) return;
  
  const list = previewInterleavedSectionsAndBanners.value;
  const idx = list.findIndex(item => item.id === itemId && 
    ((kind === 'section' && item.kind === 'section') || (kind === 'surface' && item.kind === 'banner-slot'))
  );
  if (idx < 0) return;
  
  const targetIdx = idx + delta;
  if (targetIdx < 0 || targetIdx >= list.length) return;
  
  const swappedList = [...list];
  const [removed] = swappedList.splice(idx, 1);
  swappedList.splice(targetIdx, 0, removed);
  
  swappedList.forEach((item, index) => {
    const newOrder = 30 + index;
    if (item.kind === 'section') {
      const section = draft.value.home.sections.find(s => s.id === item.id);
      if (section) section.order = newOrder;
      
      const mirrorSlot = draft.value.otherSurfaces.find(s => s.id === `home-${item.id}`);
      if (mirrorSlot) mirrorSlot.order = newOrder;
    } else if (item.kind === 'banner-slot') {
      const slot = draft.value.otherSurfaces.find(s => s.id === item.id);
      if (slot) slot.order = newOrder;
    }
  });
  
  draft.value.home.sections.sort((a, b) => a.order - b.order);
  draft.value.otherSurfaces.sort((a, b) => a.order - b.order);
}

function moveBlock(kind: EditorTargetKind, id: string, delta: number) {
  if (!draft.value) return;

  if (kind === 'hero') {
    const list = draft.value.home.heroBanners;
    const idx = list.findIndex(item => item.id === id);
    if (idx < 0) return;
    const targetIdx = idx + delta;
    if (targetIdx >= 0 && targetIdx < list.length) {
      const [item] = list.splice(idx, 1);
      list.splice(targetIdx, 0, item);
      list.forEach((entry, index) => {
        entry.order = index + 1;
      });
    }
  } else if (kind === 'entry') {
    const list = draft.value.home.entryTiles;
    const idx = list.findIndex(item => item.id === id);
    if (idx < 0) return;
    const targetIdx = idx + delta;
    if (targetIdx >= 0 && targetIdx < list.length) {
      const [item] = list.splice(idx, 1);
      list.splice(targetIdx, 0, item);
      list.forEach((entry, index) => {
        entry.order = index + 1;
      });
    }
  } else if (kind === 'section') {
    moveInterleavedBlock(id, 'section', delta);
  } else if (kind === 'surface') {
    const slot = draft.value.otherSurfaces.find(s => s.id === id);
    if (!slot) return;
    if (slot.surface === 'HOME' && slot.order >= 30) {
      moveInterleavedBlock(id, 'surface', delta);
    } else {
      const list = draft.value.otherSurfaces.filter(s => s.surface === slot.surface);
      const idx = list.findIndex(item => item.id === id);
      if (idx < 0) return;
      const targetIdx = idx + delta;
      if (targetIdx >= 0 && targetIdx < list.length) {
        const itemA = list[idx];
        const itemB = list[targetIdx];
        const tempOrder = itemA.order;
        itemA.order = itemB.order;
        itemB.order = tempOrder;
        draft.value.otherSurfaces.sort((a, b) => a.order - b.order);
      }
    }
  } else if (kind === 'promo') {
    const list = draft.value.home.promoBanners;
    const idx = list.findIndex(item => item.id === id);
    if (idx < 0) return;
    const targetIdx = idx + delta;
    if (targetIdx >= 0 && targetIdx < list.length) {
      const [item] = list.splice(idx, 1);
      list.splice(targetIdx, 0, item);
      list.forEach((entry, index) => {
        entry.order = index + 1;
      });
    }
  } else if (kind === 'trust') {
    const list = draft.value.home.trustBlocks;
    const idx = list.findIndex(item => item.id === id);
    if (idx < 0) return;
    const targetIdx = idx + delta;
    if (targetIdx >= 0 && targetIdx < list.length) {
      const [item] = list.splice(idx, 1);
      list.splice(targetIdx, 0, item);
      list.forEach((entry, index) => {
        entry.order = index + 1;
      });
    }
  }
}

function moveSelectedBlock(delta: number) {
  if (!selectedTarget.value || !selectedTargetSupportsOrder.value) return;
  moveBlock(selectedTarget.value.kind, selectedTarget.value.id, delta);
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

  // Clean up corresponding slot in otherSurfaces if it's a section
  if (selectedTarget.value.kind === 'section') {
    const section = collection[currentIndex] as any;
    const slotId = `home-${section.id}`;
    const slotIdx = draft.value?.otherSurfaces.findIndex((s) => s.id === slotId) ?? -1;
    if (slotIdx > -1) {
      draft.value?.otherSurfaces.splice(slotIdx, 1);
    }
  }

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
    audiences: ['GUEST', 'BUYER', 'SELLER'],
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
    audiences: ['GUEST', 'BUYER', 'SELLER'],
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
    audiences: ['GUEST', 'BUYER', 'SELLER'],
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
    audiences: ['GUEST', 'BUYER', 'SELLER'],
    title: localizedText(),
    subtitle: localizedText(),
    cta: ctaConfig('/home'),
    surface: 'BUY_NOW',
  });

  const latest = draft.value?.otherSurfaces.at(-1);
  if (latest) selectTarget('surface', latest.id);
}

function addHomeBannerSlot() {
  if (!draft.value) return;
  draft.value.otherSurfaces.push({
    id: `surface-${Date.now()}`,
    type: 'SURFACE_SLOT',
    enabled: true,
    order: (draft.value.otherSurfaces.at(-1)?.order ?? 0) + 1,
    audiences: ['GUEST', 'BUYER', 'SELLER'],
    title: localizedText('Yeni Banner Alanı', 'New Banner Slot'),
    subtitle: localizedText('Kampanya açıklaması', 'Campaign subtitle'),
    cta: ctaConfig('/home'),
    surface: 'HOME',
    bannerId: '',
  });

  const latest = draft.value.otherSurfaces.at(-1);
  if (latest) selectTarget('surface', latest.id);
}

function addHomeBannerSlotAfter(priorBlockOrder: number) {
  if (!draft.value) return;

  // Shift subsequent orders up to make room
  draft.value.otherSurfaces.forEach((item) => {
    if (item.surface === 'HOME' && item.order > priorBlockOrder) {
      item.order += 1;
    }
  });
  draft.value.home.sections.forEach((item) => {
    if (item.order > priorBlockOrder) {
      item.order += 1;
    }
  });

  const newOrder = priorBlockOrder + 1;
  draft.value.otherSurfaces.push({
    id: `surface-${Date.now()}`,
    type: 'SURFACE_SLOT',
    enabled: true,
    order: newOrder,
    audiences: ['GUEST', 'BUYER', 'SELLER'],
    title: localizedText('Yeni Banner Alanı', 'New Banner Slot'),
    subtitle: localizedText('Kampanya açıklaması', 'Campaign subtitle'),
    cta: ctaConfig('/home'),
    surface: 'HOME',
    bannerId: '',
  });

  const latest = draft.value.otherSurfaces.at(-1);
  if (latest) selectTarget('surface', latest.id);
}

function addHomeSectionAfter(priorBlockOrder: number) {
  if (!draft.value) return;

  // Shift subsequent orders up to make room
  draft.value.otherSurfaces.forEach((item) => {
    if (item.surface === 'HOME' && item.order > priorBlockOrder) {
      item.order += 1;
    }
  });
  draft.value.home.sections.forEach((item) => {
    if (item.order > priorBlockOrder) {
      item.order += 1;
    }
  });

  const newOrder = priorBlockOrder + 1;
  const newSectionId = `section-${Date.now()}`;
  draft.value.home.sections.push({
    id: newSectionId,
    type: 'HOME_SECTION',
    surface: 'HOME',
    enabled: true,
    order: newOrder,
    audiences: ['GUEST', 'BUYER', 'SELLER'],
    title: localizedText('Yeni Bölüm', 'New Section'),
    seeAllLabel: localizedText('Tümünü Gör', 'See All'),
    route: '/(tabs)/categories',
  });

  // Push corresponding slot to otherSurfaces
  draft.value.otherSurfaces.push({
    id: `home-${newSectionId}`,
    type: 'SURFACE_SLOT',
    surface: 'HOME',
    enabled: true,
    order: newOrder,
    audiences: ['GUEST', 'BUYER', 'SELLER'],
    title: localizedText('Yeni Bölüm', 'New Section'),
    subtitle: localizedText(),
    cta: {
      route: '/home',
      label: localizedText(),
    },
  });

  const latest = draft.value.home.sections.at(-1);
  if (latest) selectTarget('section', latest.id);
}

function deleteHomeBannerSlot(slotId: string) {
  if (!draft.value) return;
  const confirmation = confirm('Bu banner alanını ana sayfadan kaldırmak istediğinizden emin misiniz?');
  if (!confirmation) return;

  const idx = draft.value.otherSurfaces.findIndex(item => item.id === slotId);
  if (idx > -1) {
    draft.value.otherSurfaces.splice(idx, 1);
    if (selectedTarget.value && selectedTarget.value.id === slotId) {
      selectedTarget.value = null;
    }
  }
}

function getBannerById(bannerId: string | number) {
  if (!bannerId) return null;
  return bannersList.value.find(b => String(b.id) === String(bannerId)) || null;
}

const globalSlideIndex = ref(0);
let globalSlideTimer: any = null;

onMounted(() => {
  globalSlideTimer = setInterval(() => {
    globalSlideIndex.value++;
  }, 3000);
});

onBeforeUnmount(() => {
  if (globalSlideTimer) clearInterval(globalSlideTimer);
});

function getFullUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_URL.replace(/\/$/, '')}${url}`;
}

function getBannerActiveImage(bannerId: string): string {
  const banner = getBannerById(bannerId);
  if (banner && banner.items && banner.items.length > 0) {
    const activeIdx = globalSlideIndex.value % banner.items.length;
    return getFullUrl(banner.items[activeIdx].imageUrl);
  }
  return 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80';
}

function getBannerFirstImage(bannerId: string): string {
  const banner = getBannerById(bannerId);
  if (banner && banner.items && banner.items.length > 0) {
    return getFullUrl(banner.items[0].imageUrl);
  }
  return 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80';
}

function getBannerAspectRatio(bannerId: string): string {
  const banner = getBannerById(bannerId);
  if (banner && banner.aspectRatio) {
    return banner.aspectRatio.replace(':', ' / ');
  }
  return '2 / 1';
}

function getBannerName(bannerId: string): string {
  const banner = getBannerById(bannerId);
  return banner ? banner.name : '';
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
    audiences: ['GUEST', 'BUYER', 'SELLER'],
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

watch(
  () => route.query.area,
  (area) => {
    if (!draft.value) return;
    if (typeof area === 'string' && ['home', 'listing', 'membership', 'become-seller'].includes(area)) {
      if (currentWorkspaceArea.value !== area) {
        openWorkspaceArea(area as WorkspaceArea);
      }
    }
  },
);

watch(
  () => selectedSurfaceSlot.value?.bannerId,
  () => {
    if (draft.value) {
      draft.value.otherSurfaces = [...draft.value.otherSurfaces];
    }
  }
);

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
    const response = await adminApi.get<{ document: MobileConfigDocument }>(`/admin/mobile-config/draft?t=${Date.now()}`);
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
    updatedAt.value = (document as any).updatedAt;
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

async function saveDraft(options: { reload?: boolean } = {}): Promise<boolean> {
  if (!draft.value) {
    return false;
  }

  loading.value = true;
  error.value = null;

  try {
    await adminApi.patch('/admin/mobile-config/draft', {
      version: documentVersion.value,
      draft: draft.value,
    });

    validationIssues.value = [];
    if (options.reload === false) {
      documentVersion.value += 1;
      baselineSnapshot.value = JSON.stringify(draft.value);
    } else {
      await loadDraft();
    }
    return true;
  } catch (actionError) {
    if (axios.isAxiosError<any>(actionError)) {
      const data = actionError.response?.data;
      const errObj = data?.error || {};
      const resMessage = data?.message || errObj.message;
      const hasMessageObj = typeof resMessage === 'object' && resMessage !== null;

      const code = data?.code || errObj.code || (hasMessageObj ? resMessage.code : undefined);
      const errors = data?.errors || errObj.errors || (hasMessageObj ? resMessage.errors : undefined);
      const currentVersion = data?.currentVersion || errObj.currentVersion || (hasMessageObj ? resMessage.currentVersion : undefined);

      if (code === 'MOBILE_CONFIG_VERSION_CONFLICT') {
        const serverVersion = Number(currentVersion ?? documentVersion.value);
        documentVersion.value = Number.isFinite(serverVersion) ? serverVersion : documentVersion.value;
        error.value = 'Bu taslak baska bir yonetici tarafindan guncellenmis. Lutfen Yenile ile son surumu al.';
        return false;
      }
      if (code === 'VALIDATION_ERROR') {
        const issues = parseValidationIssues(errors);
        validationIssues.value = issues;
        error.value = issues.length
          ? `Doğrulama hatası: ${issues[0].message}`
          : (errObj.message || toApiMessage(actionError));
        return false;
      }
    }
    error.value = toApiMessage(actionError);
    return false;
  } finally {
    loading.value = false;
  }
}

async function confirmPublishWizard() {
  loading.value = true;
  error.value = null;
  try {
    if (hasUnsavedChanges.value) {
      const saved = await saveDraft({ reload: false });
      if (!saved) {
        return;
      }
      loading.value = true;
    }

    await adminApi.post('/admin/mobile-config/publish', {
      version: documentVersion.value,
      reason: publishReason.value.trim() || undefined,
    });
    validationIssues.value = [];
    showPublishWizard.value = false;
    publishReason.value = '';
    await loadDraft();
  } catch (actionError) {
    if (axios.isAxiosError<any>(actionError)) {
      const data = actionError.response?.data;
      const resMessage = data?.message;
      const hasMessageObj = typeof resMessage === 'object' && resMessage !== null;

      const code = data?.code || (hasMessageObj ? resMessage.code : undefined);
      const errors = data?.errors || (hasMessageObj ? resMessage.errors : undefined);
      const currentVersion = data?.currentVersion || (hasMessageObj ? resMessage.currentVersion : undefined);

      if (code === 'MOBILE_CONFIG_VERSION_CONFLICT') {
        const serverVersion = Number(currentVersion ?? documentVersion.value);
        documentVersion.value = Number.isFinite(serverVersion) ? serverVersion : documentVersion.value;
        error.value = 'Bu taslak baska bir yonetici tarafindan guncellenmis. Lutfen Yenile ile son surumu al.';
        return;
      }
      if (code === 'VALIDATION_ERROR') {
        const issues = parseValidationIssues(errors);
        validationIssues.value = issues;
        error.value = issues.length ? `Doğrulama hatası: ${issues[0].message}` : toApiMessage(actionError);
        return;
      }
    }
    error.value = toApiMessage(actionError);
  } finally {
    loading.value = false;
  }
}

function confirmReload() {
  if (hasUnsavedChanges.value) {
    const shouldReload = window.confirm(
      'Kaydedilmemiş değişiklikler var. Yenilersen bu değişiklikler kaybolur. Devam edilsin mi?',
    );
    if (!shouldReload) return;
  }
  void loadDraft();
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

const bannersList = ref<any[]>([]);

async function loadBannersList() {
  try {
    const response = await adminApi.get<{ items: any[] }>('/admin/banners');
    bannersList.value = response.data.items ?? [];
  } catch {
    bannersList.value = [];
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload);
  void loadDraft().then(() => {
    const area = typeof route.query.area === 'string' ? route.query.area : null;
    if (area && ['home', 'listing', 'membership', 'become-seller'].includes(area)) {
      openWorkspaceArea(area as WorkspaceArea);
    }
  });
  void loadCategories();
  void loadBannersList();
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

.config-status-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px 16px;
  margin-bottom: 16px;
}

.status-meta-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.version-label {
  font-size: 13px;
  color: #334155;
}

.version-label strong {
  color: #0f172a;
  font-weight: 700;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 99px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge.warning {
  background: #fef3c7;
  color: #d97706;
}

.status-badge.warning .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #d97706;
  animation: pulse-dot 1.5s infinite;
}

.status-badge.info {
  background: #eff6ff;
  color: #2563eb;
}

.status-badge.info .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #2563eb;
}

.status-badge.success {
  background: #dcfce7;
  color: #15803d;
}

.status-badge.success .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #15803d;
}

.history-meta-group {
  display: flex;
  align-items: center;
  gap: 16px;
}

.meta-item {
  font-size: 12px;
  color: #64748b;
}

.meta-item strong {
  color: #475569;
}

.meta-item .time {
  color: #94a3b8;
}

@keyframes pulse-dot {
  0% { transform: scale(0.9); opacity: 0.6; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.6; }
}

.workspace-context {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: none;
  border-bottom: 1px solid #e2e8f0;
  border-radius: 0;
  background: transparent;
  padding: 8px 0 16px 0;
  margin-bottom: 8px;
}

.workspace-title-area {
  display: flex;
  align-items: center;
  gap: 12px;
}

.workspace-title-area h2 {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.back-breadcrumb-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-breadcrumb-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
  border-color: #cbd5e1;
  transform: translateX(-2px);
}

.compact-action {
  padding: 6px 12px !important;
  font-size: 13px !important;
  height: 34px !important;
}

.primary-accent {
  background: #2563eb !important;
  color: #ffffff !important;
  border: 1px solid #2563eb !important;
  font-weight: 600 !important;
}

.primary-accent:hover {
  background: #1d4ed8 !important;
  border-color: #1d4ed8 !important;
}

.add-block-container {
  position: relative;
  display: inline-block;
}

.add-block-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #0f172a;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.add-block-trigger:hover {
  background: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
  transform: scale(1.05) rotate(90deg);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
}

.add-block-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 180px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
  padding: 6px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 2px;
  animation: menu-pop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes menu-pop {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.add-block-menu .menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: #334155;
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.add-block-menu .menu-item:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.add-block-menu .menu-item i {
  color: #64748b;
  font-size: 12px;
}

.add-block-menu .menu-item:hover i {
  color: #2563eb;
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
  grid-template-columns: minmax(0, 1fr) 360px;
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

/* MODAL OVERLAY STYLES */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  width: 100%;
  max-width: 580px;
  display: flex;
  flex-direction: column;
  animation: modal-enter 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-card.wide-card {
  max-width: 720px;
}

@keyframes modal-enter {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  max-height: calc(85vh - 120px);
}

.publish-wizard-section {
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 16px;
  margin-bottom: 16px;
}

.publish-wizard-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
  margin-bottom: 0;
}

.wizard-checklist li.pass {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
}

.wizard-checklist li.pass .status-badge {
  background: #dcfce7;
  color: #15803d;
}

.wizard-checklist li.fail {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}

.wizard-checklist li.fail .status-badge {
  background: #fee2e2;
  color: #b91c1c;
}

/* TIMELINE STYLES */
.timeline-item {
  position: relative;
  transition: border-color 0.2s ease;
}

.timeline-item:hover {
  border-left-color: #0284c7 !important;
}

.timeline-meta .badge.success {
  background: #dcfce7;
  color: #15803d;
}

.timeline-meta .badge.info {
  background: #e0f2fe;
  color: #0369a1;
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
  padding-top: 12px;
  padding-right: 4px;
}

/* Sürükle-Bırak Hassasiyet ve Titreşim Önleyici (Child Pointer Events Killer) */
.is-dragging .preview-section-card *,
.is-dragging .preview-hero-card *,
.is-dragging .preview-drag-placeholder *,
.is-dragging .absolute-hover-divider * {
  pointer-events: none !important;
}

/* Sürükle-Bırak Konum Belirteci (Drag Placeholder) */
.preview-drag-placeholder {
  width: 100%;
  border: 2px dashed #0097D8;
  background-color: rgba(0, 151, 216, 0.05);
  animation: dragPulse 1.5s infinite ease-in-out;
  transition: all 0.2s ease;
}

@keyframes sectionExpand {
  from {
    height: 0;
    opacity: 0;
    transform: scale(0.95) translateY(-8px);
    margin-bottom: 0;
    padding-top: 0;
    padding-bottom: 0;
    overflow: hidden;
  }
  to {
    height: 160px;
    opacity: 1;
    transform: scale(1) translateY(0);
    margin-bottom: 12px;
  }
}

@keyframes heroExpand {
  from {
    min-height: 0;
    height: 0;
    opacity: 0;
    transform: scale(0.95) translateY(-8px);
    margin-bottom: 0;
    padding-top: 0;
    padding-bottom: 0;
    overflow: hidden;
  }
  to {
    min-height: 172px;
    height: 172px;
    opacity: 1;
    transform: scale(1) translateY(0);
    margin-bottom: 12px;
  }
}

.preview-drag-placeholder.section-placeholder {
  border-radius: 20px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  animation: sectionExpand 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  transform-origin: top center;
}

.placeholder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.placeholder-title-bar {
  width: 120px;
  height: 14px;
  background-color: rgba(0, 151, 216, 0.12);
  border-radius: 4px;
}

.placeholder-link {
  width: 60px;
  height: 10px;
  background-color: rgba(0, 151, 216, 0.12);
  border-radius: 3px;
}

.placeholder-track {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.placeholder-slot {
  width: 80px;
  height: 90px;
  background-color: rgba(0, 151, 216, 0.08);
  border: 1px dashed rgba(0, 151, 216, 0.2);
  border-radius: 12px;
}

.preview-drag-placeholder.hero-placeholder {
  border-radius: 26px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #0097D8;
  font-weight: 600;
  font-size: 13px;
  animation: heroExpand 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  transform-origin: top center;
}

.preview-section-card.drag-over,
.preview-hero-card.drag-over,
.preview-dynamic-banner-card.drag-over {
  border: 2px dashed #0097D8 !important;
  background-color: rgba(0, 151, 216, 0.04) !important;
  opacity: 0.8;
  transform: scale(0.98);
}

.preview-section-card.is-dragging-placeholder,
.preview-hero-card.is-dragging-placeholder,
.preview-dynamic-banner-card.is-dragging-placeholder {
  border: 2px dashed #0097D8 !important;
  background-color: rgba(0, 151, 216, 0.04) !important;
  box-shadow: none !important;
  transform: scale(0.96);
  opacity: 0.5 !important;
}
.preview-section-card.is-dragging-placeholder *,
.preview-hero-card.is-dragging-placeholder *,
.preview-dynamic-banner-card.is-dragging-placeholder * {
  opacity: 0.15 !important;
}

@keyframes dragPulse {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
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

.preview-item-wrapper[draggable="true"]:active .preview-section-card,
.preview-item-wrapper[draggable="true"]:active .preview-hero-card,
.preview-item-wrapper[draggable="true"]:active .preview-dynamic-banner-card {
  opacity: 0.5;
  border: 2px dashed #0284c7;
  transform: scale(0.98);
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
  grid-column: 1 / -1;
  display: flex;
  gap: 8px;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 12px;
  margin-bottom: 4px;
}

.drawer-tabs .button {
  flex: 1;
  min-height: 38px;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.drawer-tabs .button.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
}

.drawer-form {
  grid-column: 1 / -1;
  display: grid;
  gap: 16px;
}

.locale-tabs {
  grid-column: 1 / -1;
  display: flex;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 10px;
  gap: 4px;
  margin-bottom: 8px;
}

.locale-tab {
  flex: 1;
  border: 0;
  background: transparent;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.locale-tab:hover {
  background: rgba(255, 255, 255, 0.5);
  color: #0f172a;
}

.locale-tab.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.drawer-note {
  grid-column: 1 / -1;
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

/* Premium Navigation and Selection styles inside Mobile Config */
.highlight-card {
  border: 1.5px dashed var(--brand-500, #0066cc) !important;
  background: rgba(0, 102, 204, 0.02) !important;
}

.highlight-card:hover {
  background: rgba(0, 102, 204, 0.06) !important;
  border-color: var(--brand-600, #0052a3) !important;
}

.input-with-button {
  display: flex;
  gap: 8px;
  width: 100%;
  align-items: center;
}

.input-with-button .select {
  flex: 1;
}

.input-with-button .button {
  flex-shrink: 0;
  height: 38px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
}

/* Premium Device Screen Preview Dynamic Banners styles */
.preview-item-wrapper {
  position: relative;
  width: 100%;
}

.absolute-hover-divider {
  position: absolute;
  bottom: -15px;
  left: 0;
  right: 0;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.preview-item-wrapper:hover .absolute-hover-divider {
  opacity: 1;
}

.absolute-hover-divider::after {
  content: '';
  position: absolute;
  left: 16px;
  right: 16px;
  height: 2px;
  background: var(--brand-500, #0066cc);
  pointer-events: none;
  border-radius: 1px;
}

.preview-hover-divider {
  margin-top: 10px;
  margin-bottom: 6px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}

.divider-btn {
  position: relative;
  z-index: 102;
  background: var(--brand-500, #0066cc);
  color: #ffffff;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 9px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 2px 5px rgba(0, 102, 204, 0.35);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border: none;
  cursor: pointer;
}

.hover-menu-container {
  position: relative;
  display: inline-block;
  z-index: 110;
}

.hover-dropdown-menu {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(-6px);
  width: 140px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 120;
}

.hover-dropdown-menu .hover-menu-item {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 6px 10px;
  border: none;
  background: transparent;
  color: #1e293b;
  font-size: 11px;
  font-weight: 600;
  text-align: left;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.hover-dropdown-menu .hover-menu-item:hover {
  background: #eff6ff;
  color: #2563eb;
}

.banner-slide-dots {
  position: absolute;
  bottom: 8px;
  right: 12px;
  display: flex;
  gap: 4px;
  z-index: 10;
  background: rgba(0, 0, 0, 0.25);
  padding: 4px 6px;
  border-radius: 10px;
  backdrop-filter: blur(2px);
}

.slide-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-dot.active {
  background: #ffffff;
  transform: scale(1.3);
  box-shadow: 0 0 3px rgba(255, 255, 255, 0.8);
}

.delete-banner-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #dc2626 !important;
  color: #ffffff !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 20;
  transition: all 0.2s ease;
  opacity: 0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  font-size: 9px;
}

.preview-dynamic-banner-card:hover .delete-banner-btn {
  opacity: 1;
}

.delete-banner-btn:hover {
  background: #b91c1c !important;
  transform: scale(1.1);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.preview-dynamic-banners-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 16px 0;
  width: 100%;
}

.preview-dynamic-banner-card {
  width: 100%;
  border: 1.5px dashed var(--border-soft, #e5e7eb);
  background: #ffffff;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  padding: 0;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.preview-dynamic-banner-card:hover {
  border-color: var(--brand-500, #0066cc);
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.preview-dynamic-banner-card.selected {
  border-color: var(--brand-500, #0066cc) !important;
  box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.15);
}

.banner-thumbnails-strip {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
  align-items: center;
  background: rgba(0, 0, 0, 0.25);
  padding: 6px;
  border-radius: 6px;
  backdrop-filter: blur(4px);
  width: max-content;
  max-width: 100%;
}

.banner-thumbnail-img {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  transition: transform 0.15s ease, border-color 0.15s ease;
}

.banner-thumbnail-img:hover {
  transform: scale(1.15);
  border-color: #ffffff;
}

.preview-dynamic-banner-header {
  padding: 8px 12px;
  background: var(--bg-soft, #f9fafb);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-soft, #e5e7eb);
  width: 100%;
}

.preview-dynamic-banner-header strong {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-strong, #1f2937);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
}

.preview-dynamic-banner-cover {
  height: auto;
  aspect-ratio: 2 / 1;
  background-size: cover;
  background-position: center;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 12px;
  position: relative;
  width: 100%;
}

.preview-dynamic-banner-cover .banner-name {
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
  text-shadow: 0 1.5px 3px rgba(0, 0, 0, 0.85);
  margin: 0;
}

.preview-dynamic-banner-cover .banner-slides-count {
  color: rgba(255, 255, 255, 0.95);
  font-size: 10px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  margin-top: 2px;
}

.preview-dynamic-banner-placeholder {
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-muted, #9ca3af);
  font-size: 11px;
  font-weight: 600;
  width: 100%;
}

.preview-dynamic-banner-placeholder i {
  font-size: 20px;
  color: var(--brand-500, #0066cc);
}

.error-text {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: #fef2f2;
  color: #ef4444;
  border: 1px solid #fecaca;
  padding: 10px 20px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 10px 25px -5px rgba(239, 68, 68, 0.15), 0 8px 10px -6px rgba(239, 68, 68, 0.15);
  z-index: 99999;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 90%;
  animation: slide-in-top 0.3s ease;
}

@keyframes slide-in-top {
  0% { transform: translate(-50%, -20px); opacity: 0; }
  100% { transform: translate(-50%, 0); opacity: 1; }
}

/* Custom Drag-and-Drop and Selection Overlay Controls */
.preview-item-controls {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(4px);
  border: 1px solid #cbd5e1;
  border-radius: 99px;
  padding: 4px 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  z-index: 200;
  animation: controls-fade-in 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes controls-fade-in {
  from { opacity: 0; transform: translateY(2px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.preview-item-controls .control-btn {
  background: transparent;
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 11px;
  padding: 0;
}

.preview-item-controls .control-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.preview-item-controls .control-btn.danger:hover {
  background: #fef2f2;
  color: #ef4444;
}

.preview-item-controls .drag-handle {
  cursor: grab;
}

.preview-item-controls .drag-handle:active {
  cursor: grabbing;
}

/* High-Fidelity App Mockup Layout Styles */

/* 1. Header Styles */
.preview-app-header {
  background: #ffffff;
  padding: 12px 16px 8px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.header-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo-area .logo-text {
  font-family: 'Outfit', sans-serif;
  font-size: 20px;
  font-weight: 800;
  color: #0099ff;
  letter-spacing: -0.5px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.profile-avatar-circle,
.notification-bell-circle {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #eff6ff;
  border: 1px solid #dbeafe;
  display: grid;
  place-items: center;
  color: #0099ff;
  font-size: 11px;
}

.preview-search-bar-container {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 99px;
  padding: 8px 14px;
  color: #64748b;
  font-size: 12px;
}

.preview-search-bar-container .placeholder-text {
  color: #94a3b8;
}

/* 2. Entry CTA solid buttons and style changes */
.preview-entry-card {
  background: #ffffff !important;
  border-radius: 20px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03) !important;
  border: 1.5px solid transparent !important;
}

.preview-entry-card.selected {
  border-color: #2563eb !important;
}

.preview-entry-cta-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 99px;
  padding: 8px 16px;
  font-size: 11px;
  font-weight: 800;
  color: #ffffff !important;
  text-align: center;
  width: 100%;
  margin-top: 4px;
  transition: opacity 0.15s ease;
}

.preview-entry-cta-btn.is-buy-now {
  background: #0099ff;
}

.preview-entry-cta-btn.is-auction {
  background: #33cc66;
}

/* 3. Categories section style alignment */
.preview-categories-container {
  display: flex;
  gap: 12px;
  padding: 8px 4px;
  overflow-x: auto;
  scrollbar-width: none;
}

.preview-categories-container::-webkit-scrollbar {
  display: none;
}

.preview-category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  width: 60px;
}

.category-circle-img {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.preview-category-item span {
  font-size: 9px;
  font-weight: 700;
  color: #475569;
  text-align: center;
  white-space: nowrap;
}

.see-all-btn {
  color: #0099ff !important;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

/* 4. Tab Bar High-Fidelity Styles */
.preview-tabbar {
  background: #ffffff !important;
  border-top: 1px solid #f1f5f9 !important;
  padding: 6px 12px 14px !important;
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
}

.preview-tabbar .tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #94a3b8;
  cursor: pointer;
  flex: 1;
}

.preview-tabbar .tab-item i {
  font-size: 16px;
}

.preview-tabbar .tab-item span {
  font-size: 8px;
  font-weight: 700;
}

.preview-tabbar .tab-item.active {
  color: #0099ff;
}
</style>
