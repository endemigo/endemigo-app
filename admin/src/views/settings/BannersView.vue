<template>
  <section class="field-grid">
    <header class="page-header">
      <div>
        <h1>Banner Yönetimi</h1>
        <p>Mobil uygulama için sabit ve kayan (slider) banner reklamlarının yönetimi</p>
      </div>
      <button class="button primary" type="button" @click="openCreate">
        <i class="pi pi-plus" aria-hidden="true" />
        Yeni Banner Oluştur
      </button>
    </header>

    <!-- Banner DataTable -->
    <AdminDataTable
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :pagination="pagination"
      :filters="filters"
      :actions="tableActions"
      @page="setPage"
      @filter="setFilters"
      @action="handleTableAction"
    >
      <template #cell-name="{ row, value }">
        <div class="banner-name-cell">
          <span class="banner-name-text">{{ value }}</span>
          <div v-if="row.items && (row.items as any[]).length > 0" class="banner-thumbnails-list">
            <div 
              v-for="(item, idx) in (row.items as any[])" 
              :key="idx" 
              class="banner-thumbnail-item"
              :title="item.title?.tr || 'Görsel'"
            >
              <img :src="getFullUrl(item.imageUrl)" alt="Thumbnail" class="banner-thumbnail-img" />
            </div>
          </div>
        </div>
      </template>
    </AdminDataTable>

    <p v-if="error" class="error-text">{{ error }}</p>

    <!-- Custom Banner Editor Modal/Drawer (Centered Modal Layout) -->
    <div v-if="editorOpen" class="drawer-backdrop centered-backdrop" @click.self="closeEditor">
      <div class="editor-drawer centered-modal">
        <header class="drawer-header">
          <h2>{{ isEditMode ? 'Banner Düzenle' : 'Yeni Banner Oluştur' }}</h2>
          <button class="button icon-only ghost" type="button" @click="closeEditor">
            <i class="pi pi-times" aria-hidden="true" />
          </button>
        </header>

        <div class="editor-body">
          <form class="banner-form" @submit.prevent="saveBanner">
            <!-- Form Grid -->
            <div class="form-row grid-2">
              <div class="form-group">
                <label for="banner-name">Banner Adı *</label>
                <input
                  id="banner-name"
                  v-model="form.name"
                  type="text"
                  class="input"
                  placeholder="Örn: Ana Sayfa Kampanyaları"
                  required
                />
              </div>
              <div class="form-group">
                <label for="banner-slug">Slug (Benzersiz Kimlik) *</label>
                <input
                  id="banner-slug"
                  v-model="form.slug"
                  type="text"
                  class="input"
                  placeholder="Örn: ana-sayfa-kampanya"
                  :disabled="isEditMode"
                  required
                />
              </div>
            </div>

            <div class="form-row grid-2">
              <div class="form-group">
                <label for="banner-ratio">En-Boy Oranı Standardı *</label>
                <select id="banner-ratio" v-model="form.aspectRatio" class="select" required>
                  <option value="16:9">16:9 - Geniş Ekran / Hero (Önerilen: 1200x675px)</option>
                  <option value="4:3">4:3 - Klasik Kart Banner (Önerilen: 1200x900px)</option>
                  <option value="1:1">1:1 - Kare Kart Banner (Önerilen: 1000x1000px)</option>
                  <option value="3:1">3:1 - Yatay İnce Kampanya (Önerilen: 1200x400px)</option>
                </select>
              </div>
              <div class="form-group">
                <label for="banner-duration">Geçiş Süresi (Milisaniye) *</label>
                <input
                  id="banner-duration"
                  v-model.number="form.slideDuration"
                  type="number"
                  class="input"
                  min="500"
                  placeholder="Örn: 3000 (3 saniye)"
                  required
                />
                <small class="muted">Çoklu slayt yüklenirse slaytlar arası bekleme süresidir.</small>
              </div>
            </div>

            <!-- Slide Items Manager -->
            <div class="slides-section">
              <header class="section-title-row">
                <h3>Slayt Görselleri & Aksiyonları ({{ form.items.length }})</h3>
                <button class="button secondary" type="button" @click="addSlide">
                  <i class="pi pi-plus" /> Slayt Ekle
                </button>
              </header>

              <div v-if="form.items.length === 0" class="empty-slides">
                <i class="pi pi-images" />
                <p>Henüz slayt eklenmedi. Banner yayına almak için en az 1 slayt eklemelisiniz.</p>
              </div>

              <!-- Slide Tabs Bar (Displayed side-by-side as tabs) -->
              <div v-if="form.items.length > 0" class="slide-tabs-bar">
                <button
                  v-for="(item, index) in form.items"
                  :key="item.id || index"
                  type="button"
                  class="slide-tab-btn"
                  :class="{ active: activeSlideIndex === index }"
                  @click="activeSlideIndex = index"
                >
                  <span class="tab-label">Slayt #{{ index + 1 }}</span>
                  <span v-if="item.imageUrl" class="tab-badge-checked" title="Görsel yüklendi">
                    <i class="pi pi-check" />
                  </span>
                </button>
              </div>

              <!-- Draggable Slide Cards -->
              <div class="slides-list">
                <div
                  v-for="(item, index) in form.items"
                  :key="item.id || index"
                  v-show="activeSlideIndex === index"
                  class="slide-card"
                >
                  <!-- Slide Header (Title & Actions) -->
                  <div class="slide-card-header">
                    <h4>Slayt #{{ index + 1 }} Detayları</h4>
                    <div class="toolbar">
                      <button
                        class="button icon-only ghost"
                        type="button"
                        :disabled="index === 0"
                        title="Sola Taşı"
                        @click="moveSlide(index, -1)"
                      >
                        <i class="pi pi-arrow-left" />
                      </button>
                      <button
                        class="button icon-only ghost"
                        type="button"
                        :disabled="index === form.items.length - 1"
                        title="Sağa Taşı"
                        @click="moveSlide(index, 1)"
                      >
                        <i class="pi pi-arrow-right" />
                      </button>
                      <button
                        class="button icon-only danger"
                        type="button"
                        title="Slaytı Sil"
                        @click="removeSlide(index)"
                      >
                        <i class="pi pi-trash" />
                      </button>
                    </div>
                  </div>

                  <!-- Slide Content Grid -->
                  <div class="slide-card-body">
                    <!-- Image Upload with Cropper trigger -->
                    <div class="slide-image-picker">
                      <div v-if="item.imageUrl" class="image-preview-container">
                        <img :src="getFullUrl(item.imageUrl)" alt="Slayt görseli" class="image-preview" />
                        <button class="button danger change-image-btn" type="button" @click="triggerCropper(index)">
                          Görseli Değiştir
                        </button>
                      </div>
                      <div v-else class="image-placeholder" @click="triggerCropper(index)">
                        <i class="pi pi-upload" />
                        <span>Kırp & Yükle *</span>
                      </div>
                    </div>

                    <!-- Slide Details Form -->
                    <div class="slide-details">
                      <!-- Localized Language Tabs -->
                      <div class="lang-tabs-bar">
                        <button
                          type="button"
                          class="lang-tab-btn"
                          :class="{ active: activeLocale === 'tr' }"
                          @click="activeLocale = 'tr'"
                        >
                          Türkçe (TR)
                        </button>
                        <button
                          type="button"
                          class="lang-tab-btn"
                          :class="{ active: activeLocale === 'en' }"
                          @click="activeLocale = 'en'"
                        >
                          English (EN)
                        </button>
                      </div>

                      <!-- Localized Inputs for Active Language -->
                      <div class="lang-inputs-container">
                        <!-- TR Content -->
                        <div v-show="activeLocale === 'tr'" class="lang-inputs-group">
                          <div class="form-row grid-2">
                            <div class="form-group">
                              <label>Başlık (TR)</label>
                              <input v-model="item.title.tr" type="text" class="input" placeholder="Örn: %50 İndirim" />
                            </div>
                            <div class="form-group">
                              <label>Alt Başlık (TR)</label>
                              <input v-model="item.subtitle.tr" type="text" class="input" placeholder="Örn: Seçili ürünlerde" />
                            </div>
                          </div>
                        </div>

                        <!-- EN Content -->
                        <div v-show="activeLocale === 'en'" class="lang-inputs-group">
                          <div class="form-row grid-2">
                            <div class="form-group">
                              <label>Başlık (EN)</label>
                              <input v-model="item.title.en" type="text" class="input" placeholder="Örn: 50% Off" />
                            </div>
                            <div class="form-group">
                              <label>Alt Başlık (EN)</label>
                              <input v-model="item.subtitle.en" type="text" class="input" placeholder="Örn: On selected items" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- Action Router Config -->
                      <div class="form-row grid-2">
                        <div class="form-group">
                          <label>Tıklama Aksiyonu *</label>
                          <select v-model="item.actionType" class="select" required>
                            <option value="CATEGORY">Kategori Aç</option>
                            <option value="PRODUCT">Tek Ürün Detayına Git</option>
                            <option value="PRODUCTS">Çoklu Ürün Listesine Git</option>
                            <option value="EXTERNAL_URL">Dış Web URL'ine Git</option>
                            <option value="CAMPAIGNS">Kampanyalar Sayfasını Aç</option>
                            <option value="AUCTIONS">Müzayede Sayfasını Aç</option>
                            <option value="SEARCH">Arama Sorgusu Çalıştır</option>
                            <option value="CUSTOM_ROUTE">Özel Mobil Rota (Route) Path</option>
                            <option value="ANNOUNCEMENT">Duyuru / Haber / Blog Aç</option>
                          </select>
                        </div>
                        <div class="form-group">
                          <label>Aksiyon Değeri / ID *</label>
                          <div v-if="isResourceAction(item.actionType)" class="clickable-input-wrapper" @click="openSelector(index, item.actionType)">
                            <input
                              :value="getActionValueLabel(item.actionType, item.actionValue)"
                              type="text"
                              class="input clickable-input"
                              :placeholder="getActionPlaceholder(item.actionType)"
                              readonly
                              required
                            />
                            <i class="pi pi-search clickable-input-icon" />
                          </div>
                          <select
                            v-else-if="item.actionType === 'CUSTOM_ROUTE'"
                            v-model="item.actionValue"
                            class="select"
                            required
                          >
                            <option value="" disabled>Lütfen bir mobil rota seçin</option>
                            <option
                              v-for="route in appRoutes"
                              :key="route.value"
                              :value="route.value"
                            >
                              {{ route.label }} ({{ route.value }})
                            </option>
                          </select>
                          <input
                            v-else
                            v-model="item.actionValue"
                            type="text"
                            class="input"
                            :placeholder="getActionPlaceholder(item.actionType)"
                            required
                          />
                        </div>
                      </div>

                      <!-- Confirmation Dialog Option -->
                      <div class="confirmation-config">
                        <label class="checkbox-label">
                          <input v-model="item.requireConfirmation" type="checkbox" />
                          <span>Yönlendirme öncesi açıklama / onay kutusu göster</span>
                        </label>

                        <div v-if="item.requireConfirmation" class="confirmation-details">
                          <div v-show="activeLocale === 'tr'" class="form-group">
                            <label>Açıklama Metni (TR)</label>
                            <textarea
                              v-model="item.confirmationText.tr"
                              class="textarea"
                              placeholder="Kullanıcıya gösterilecek TR bilgilendirme mesajı"
                              rows="2"
                            />
                          </div>
                          <div v-show="activeLocale === 'en'" class="form-group">
                            <label>Açıklama Metni (EN)</label>
                            <textarea
                              v-model="item.confirmationText.en"
                              class="textarea"
                              placeholder="Kullanıcıya gösterilecek EN bilgilendirme mesajı"
                              rows="2"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Form Actions -->
            <footer class="form-footer">
              <div class="form-group reason-group">
                <label for="action-reason">İşlem Gerekçesi (Audit Log) *</label>
                <input
                  id="action-reason"
                  v-model="reason"
                  type="text"
                  class="input"
                  placeholder="Bu güncellemeyi neden yapıyorsunuz? (Örn: Yaz kampanyası görselleri güncellendi)"
                  required
                />
              </div>
              <div class="toolbar">
                <button class="button secondary" type="button" @click="closeEditor">Vazgeç</button>
                <button class="button primary" type="submit" :disabled="saving">
                  {{ isEditMode ? 'Banner Güncelle' : 'Banner Oluştur' }}
                </button>
              </div>
            </footer>
          </form>
        </div>
      </div>
    </div>

    <!-- Sleek Draggable/Resizable Aspect Ratio Locked Canvas Cropper Modal -->
    <div v-if="cropperOpen" class="drawer-backdrop" style="z-index: 101;" @click.self="closeCropper">
      <div class="cropper-modal">
        <header class="cropper-header">
          <h3>Görsel Kırpma & Standartlaştırma ({{ form.aspectRatio }} Oranında)</h3>
          <button class="button icon-only ghost" type="button" @click="closeCropper">
            <i class="pi pi-times" />
          </button>
        </header>

        <div class="cropper-body">
          <div v-if="!cropperImageSrc" class="cropper-upload-area">
            <input type="file" ref="fileInput" accept="image/*" class="file-input" @change="onFileSelected" />
            <div class="upload-trigger" @click="$refs.fileInput.click()">
              <i class="pi pi-image" />
              <p>Dosya seçin veya sürükleyip bırakın (JPEG, PNG, WebP)</p>
            </div>
          </div>

          <div v-else class="cropper-workspace">
            <div class="cropper-canvas-container" ref="cropperContainer">
              <canvas
                ref="canvasRef"
                class="cropper-canvas"
                @mousedown="startDrag"
                @mousemove="drag"
                @mouseup="endDrag"
                @mouseleave="endDrag"
                @touchstart="startDragTouch"
                @touchmove="dragTouch"
                @touchend="endDrag"
              />
            </div>
            <div class="cropper-controls">
              <button class="button secondary" type="button" @click="zoomImage(0.1)">
                <i class="pi pi-search-plus" /> Yakınlaştır
              </button>
              <button class="button secondary" type="button" @click="zoomImage(-0.1)">
                <i class="pi pi-search-minus" /> Uzaklaştır
              </button>
              <button class="button danger" type="button" @click="cropperImageSrc = null">
                Görseli Değiştir
              </button>
            </div>
          </div>
        </div>

        <footer class="cropper-footer">
          <button class="button secondary" type="button" @click="closeCropper">Vazgeç</button>
          <button
            class="button primary"
            type="button"
            :disabled="!cropperImageSrc || uploading"
            @click="cropAndUpload"
          >
            {{ uploading ? 'Kırpılıyor & Yükleniyor...' : 'Kırp ve Yükle' }}
          </button>
        </footer>
      </div>
    </div>

    <!-- Sleek Resource Selection Modal with Search -->
    <div v-if="selectorOpen" class="drawer-backdrop centered-backdrop" style="z-index: 102;" @click.self="closeSelector">
      <div class="selector-modal">
        <header class="selector-header">
          <h3>{{ getSelectorTitle() }}</h3>
          <button class="button icon-only ghost" type="button" @click="closeSelector">
            <i class="pi pi-times" />
          </button>
        </header>

        <div class="selector-body">
          <div class="selector-search-wrapper">
            <i class="pi pi-search search-icon" />
            <input
              v-model="selectorSearchQuery"
              type="text"
              class="input selector-search-input"
              placeholder="Ara..."
            />
          </div>

          <div v-if="selectorLoading" class="selector-loading">
            <i class="pi pi-spin pi-spinner" /> Yükleniyor...
          </div>

          <div v-else-if="filteredSelectorItems.length === 0" class="selector-empty">
            <i class="pi pi-inbox" />
            <p>Aradığınız kriterde kayıt bulunamadı.</p>
          </div>

          <div v-else class="selector-list">
            <div
              v-for="selItem in filteredSelectorItems"
              :key="selItem.id"
              class="selector-item"
              :class="{
                selected: isItemSelected(selItem.id)
              }"
              @click="toggleSelectorItem(selItem)"
            >
              <div v-if="selectorType === 'PRODUCTS'" class="selector-checkbox">
                <i :class="isItemSelected(selItem.id) ? 'pi pi-check-square selected-box' : 'pi pi-square'" />
              </div>
              <div class="selector-item-content">
                <span class="item-name">{{ selItem.name }}</span>
                <span v-if="selItem.extra" class="item-extra">{{ selItem.extra }}</span>
                <span class="item-id">{{ selItem.id }}</span>
              </div>
            </div>
          </div>
        </div>

        <footer class="selector-footer">
          <button class="button secondary" type="button" @click="closeSelector">Vazgeç</button>
          <button
            v-if="selectorType === 'PRODUCTS'"
            class="button primary"
            type="button"
            :disabled="selectorSelectedIds.length === 0"
            @click="confirmMultipleProducts"
          >
            Seçilenleri Ekle ({{ selectorSelectedIds.length }})
          </button>
        </footer>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import AdminDataTable, {
  type AdminColumn,
  type AdminFilter,
  type AdminPagination,
  type AdminTableAction,
} from '../../components/AdminDataTable.vue';
import { adminApi, toApiMessage, type ApiListResponse } from '../../services/api';

// Banners State
const rows = ref<Record<string, unknown>[]>([]);
const loading = ref(false);
const saving = ref(false);
const uploading = ref(false);
const error = ref<string | null>(null);

const pagination = ref<AdminPagination>({
  page: 1,
  limit: 25,
  total: 0,
});

const filters = ref<AdminFilter[]>([
  {
    key: 'slug',
    label: 'Slug ile Ara',
    value: '',
  },
]);

const columns: AdminColumn[] = [
  { key: 'name', label: 'Banner Adı' },
  { key: 'slug', label: 'Slug / Kimlik' },
  { key: 'aspectRatio', label: 'Görsel Oranı' },
  { key: 'slideDuration', label: 'Geçiş Hızı (ms)' },
  { key: 'createdAt', label: 'Oluşturulma', format: 'date' },
];

const tableActions: AdminTableAction[] = [
  { key: 'edit', label: 'Düzenle', icon: 'pi pi-pencil', tone: 'primary' },
  { key: 'delete', label: 'Sil', icon: 'pi pi-trash', tone: 'danger' },
];

// Editor State
const editorOpen = ref(false);
const isEditMode = ref(false);
const selectedBannerId = ref<string | null>(null);
const reason = ref('');

interface BannerItemInput {
  id: string;
  imageUrl: string;
  actionType: string;
  actionValue: string;
  title: { tr: string; en: string };
  subtitle: { tr: string; en: string };
  requireConfirmation: boolean;
  confirmationText: { tr: string; en: string };
  confirmationButtonText: { tr: string; en: string };
}

interface BannerFormInput {
  name: string;
  slug: string;
  slideDuration: number;
  aspectRatio: '16:9' | '4:3' | '1:1' | '3:1';
  items: BannerItemInput[];
}

const form = ref<BannerFormInput>({
  name: '',
  slug: '',
  slideDuration: 3000,
  aspectRatio: '16:9',
  items: [],
});

const activeSlideIndex = ref(0);
const activeLocale = ref<'tr' | 'en'>('tr');

// Keep activeSlideIndex in bounds
watch(() => form.value.items.length, (newLength) => {
  if (activeSlideIndex.value >= newLength) {
    activeSlideIndex.value = Math.max(0, newLength - 1);
  }
});

// Selector State
const selectorOpen = ref(false);
const selectorType = ref<'CATEGORY' | 'PRODUCT' | 'PRODUCTS' | 'AUCTIONS' | 'ANNOUNCEMENT' | null>(null);
const selectorTargetIndex = ref<number | null>(null);
const selectorSearchQuery = ref('');
const selectorLoading = ref(false);
const selectorItems = ref<Array<{ id: string; name: string; extra?: string }>>([]);
const selectorSelectedIds = ref<string[]>([]);

// Companion states for ID to label mapping
const categoryMap = ref<Record<string, string>>({});
const productMap = ref<Record<string, string>>({});
const auctionMap = ref<Record<string, string>>({});
const announcementMap = ref<Record<string, string>>({});
const mapsLoaded = ref(false);

// Analyzed mobile routes from expo router
const appRoutes = [
  { value: '/(tabs)/home', label: 'Ana Sayfa (Home)' },
  { value: '/(tabs)/explore', label: 'Keşfet / Arama ve Kategoriler (Explore)' },
  { value: '/(tabs)/auctions', label: 'Canlı Müzayedeler (Auctions)' },
  { value: '/(tabs)/wallet', label: 'Cüzdanım (Wallet)' },
  { value: '/(tabs)/notifications', label: 'Bildirimler (Notifications)' },
  { value: '/(tabs)/profile', label: 'Profilim / Hesabım (Profile)' },
  { value: '/(tabs)/messages', label: 'Mesajlarım / Sohbet (Messages)' },
  { value: '/(tabs)/orders', label: 'Siparişlerim (Orders)' },
  { value: '/(tabs)/favoriler', label: 'Favorilerim (Favorites)' },
  { value: '/(tabs)/categories', label: 'Tüm Kategoriler (Categories List)' },
  { value: '/(tabs)/become-seller', label: 'Satıcı Ol / Başvuru Formu' },
  { value: '/(tabs)/seller-dashboard', label: 'Satıcı Kontrol Paneli (Seller Dashboard)' },
  { value: '/(tabs)/seller-ads', label: 'Satıcı İlanları / Reklamları' },
  { value: '/(tabs)/seller-campaigns', label: 'Satıcı Kampanyaları' },
  { value: '/(tabs)/addresses', label: 'Adreslerim (Addresses)' },
  { value: '/(tabs)/edit-profile', label: 'Profil Düzenle (Edit Profile)' },
  { value: '/(tabs)/notification-preferences', label: 'Bildirim Tercihleri' },
  { value: '/cart', label: 'Alışveriş Sepeti (Cart)' },
  { value: '/buy-now', label: 'Hemen Al / Ödeme Ekranı (Checkout)' },
  { value: '/(auth)/login', label: 'Üye Girişi Ekranı (Login)' },
  { value: '/(auth)/register', label: 'Yeni Üye Kayıt Ekranı (Register)' },
  { value: '/modal', label: 'Bilgi Modalı (Info Modal)' }
];

// Image Cropper State
const cropperOpen = ref(false);
const cropperTargetIndex = ref<number | null>(null);
const cropperImageSrc = ref<string | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const cropperContainer = ref<HTMLDivElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

// Cropper mouse drag logic variables
const img = ref<HTMLImageElement | null>(null);
const imgScale = ref(1.0);
const imgX = ref(0);
const imgY = ref(0);
const isDragging = ref(false);
const startX = ref(0);
const startY = ref(0);

// Load banners and resource maps on mount
onMounted(() => {
  void loadBanners();
  void loadResourceMaps();
});

async function loadBanners() {
  loading.value = true;
  error.value = null;
  try {
    const filterParams = Object.fromEntries(
      filters.value
        .filter((f) => f.value !== undefined && f.value !== '')
        .map((f) => [f.key, f.value]),
    );

    const response = await adminApi.get<{ items: any[] }>('/admin/banners', {
      params: {
        page: pagination.value.page,
        limit: pagination.value.limit,
        ...filterParams,
      },
    });

    rows.value = response.data.items ?? [];
    pagination.value.total = response.data.items?.length ?? 0;
  } catch (err) {
    error.value = toApiMessage(err);
    rows.value = [];
  } finally {
    loading.value = false;
  }
}

function setPage(page: number) {
  pagination.value.page = page;
  void loadBanners();
}

function setFilters(filtersVal: Record<string, string>) {
  filters.value.forEach((f) => {
    if (filtersVal[f.key] !== undefined) {
      f.value = filtersVal[f.key];
    }
  });
  pagination.value.page = 1;
  void loadBanners();
}

// Table actions
async function handleTableAction(action: AdminTableAction, row: Record<string, unknown>) {
  if (action.key === 'edit') {
    isEditMode.value = true;
    selectedBannerId.value = String(row.id);
    reason.value = '';
    
    // Set form fields
    form.value = {
      name: String(row.name),
      slug: String(row.slug),
      slideDuration: Number(row.slideDuration ?? 3000),
      aspectRatio: (row.aspectRatio || '16:9') as any,
      items: ((row.items as any[]) || []).map((item) => ({
        id: item.id || `slide-${Date.now()}-${Math.random()}`,
        imageUrl: item.imageUrl || '',
        actionType: item.actionType || 'CATEGORY',
        actionValue: item.actionValue || '',
        title: { tr: item.title?.tr || '', en: item.title?.en || '' },
        subtitle: { tr: item.subtitle?.tr || '', en: item.subtitle?.en || '' },
        requireConfirmation: !!item.requireConfirmation,
        confirmationText: { tr: item.confirmationText?.tr || '', en: item.confirmationText?.en || '' },
        confirmationButtonText: { tr: item.confirmationButtonText?.tr || '', en: item.confirmationButtonText?.en || '' },
      })),
    };
    activeSlideIndex.value = 0;
    activeLocale.value = 'tr';
    editorOpen.value = true;
  } else if (action.key === 'delete') {
    const confirmation = confirm('Bu bannerı silmek istediğinizden emin misiniz?');
    if (!confirmation) return;

    const auditReason = prompt('Silme gerekçesini giriniz:');
    if (!auditReason) return;

    try {
      await adminApi.delete(`/admin/banners/${row.id}`, {
        params: { reason: auditReason },
      });
      await loadBanners();
    } catch (err) {
      alert(`Silme başarısız: ${toApiMessage(err)}`);
    }
  }
}

function openCreate() {
  isEditMode.value = false;
  selectedBannerId.value = null;
  reason.value = '';
  form.value = {
    name: '',
    slug: '',
    slideDuration: 3000,
    aspectRatio: '16:9',
    items: [],
  };
  activeSlideIndex.value = 0;
  activeLocale.value = 'tr';
  editorOpen.value = true;
}

function closeEditor() {
  editorOpen.value = false;
}

// Slide Operations
function addSlide() {
  form.value.items.push({
    id: `slide-${Date.now()}-${Math.random()}`,
    imageUrl: '',
    actionType: 'CATEGORY',
    actionValue: '',
    title: { tr: '', en: '' },
    subtitle: { tr: '', en: '' },
    requireConfirmation: false,
    confirmationText: { tr: '', en: '' },
    confirmationButtonText: { tr: 'Devam Et', en: 'Continue' },
  });
  activeSlideIndex.value = form.value.items.length - 1;
}

function removeSlide(index: number) {
  form.value.items.splice(index, 1);
  if (activeSlideIndex.value >= form.value.items.length) {
    activeSlideIndex.value = Math.max(0, form.value.items.length - 1);
  }
}

function moveSlide(index: number, delta: number) {
  const target = index + delta;
  if (target < 0 || target >= form.value.items.length) return;
  const [moved] = form.value.items.splice(index, 1);
  form.value.items.splice(target, 0, moved);
  activeSlideIndex.value = target;
}

// Save Banner to Backend
async function saveBanner() {
  if (form.value.items.length === 0) {
    alert('Lütfen en az 1 slayt ekleyin.');
    return;
  }

  // Verify all slides have images
  const missingImages = form.value.items.some((item) => !item.imageUrl);
  if (missingImages) {
    alert('Lütfen tüm slaytlar için görsel kırpıp yükleyin.');
    return;
  }

  saving.value = true;
  error.value = null;

  try {
    const payload = {
      name: form.value.name,
      slug: form.value.slug,
      slideDuration: form.value.slideDuration,
      aspectRatio: form.value.aspectRatio,
      items: form.value.items.map((item) => ({
        imageUrl: item.imageUrl,
        actionType: item.actionType,
        actionValue: item.actionValue,
        title: item.title,
        subtitle: item.subtitle,
        requireConfirmation: item.requireConfirmation,
        confirmationText: item.requireConfirmation ? item.confirmationText : undefined,
        confirmationButtonText: item.requireConfirmation ? item.confirmationButtonText : undefined,
      })),
      reason: reason.value,
    };

    if (isEditMode.value && selectedBannerId.value) {
      await adminApi.patch(`/admin/banners/${selectedBannerId.value}`, payload);
    } else {
      await adminApi.post('/admin/banners', payload);
    }

    editorOpen.value = false;
    await loadBanners();
  } catch (err) {
    error.value = toApiMessage(err);
  } finally {
    saving.value = false;
  }
}

// Cropper Operations
function triggerCropper(index: number) {
  cropperTargetIndex.value = index;
  cropperImageSrc.value = null;
  cropperOpen.value = true;
}

function closeCropper() {
  cropperOpen.value = false;
  cropperTargetIndex.value = null;
  cropperImageSrc.value = null;
}

function onFileSelected(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    cropperImageSrc.value = e.target?.result as string;
    initCanvasImage();
  };
  reader.readAsDataURL(file);
}

function getAspectRatioValue(): number {
  const [w, h] = form.value.aspectRatio.split(':').map(Number);
  return w / h;
}

function getActionPlaceholder(type: string): string {
  switch (type) {
    case 'CATEGORY':
      return 'Kategori ID giriniz (Örn: f193-4ea2-...)';
    case 'PRODUCT':
      return 'Ürün ID giriniz (Örn: a281-229d-...)';
    case 'PRODUCTS':
      return 'Virgülle ayrılmış Ürün ID listesi (Örn: id1,id2,id3)';
    case 'EXTERNAL_URL':
      return 'Tam web adresi (Örn: https://www.google.com)';
    case 'CAMPAIGNS':
      return 'Varsayılan için "/" veya kampanya kimliği';
    case 'AUCTIONS':
      return 'Varsayılan için "/" veya müzayede kimliği';
    case 'SEARCH':
      return 'Arama anahtar kelimesi (Örn: zeytinyağı)';
    case 'CUSTOM_ROUTE':
      return 'Mobil rota path (Örn: /(tabs)/explore)';
    case 'ANNOUNCEMENT':
      return 'Duyuru, Haber veya Blog seçin';
    default:
      return 'Aksiyon değerini girin';
  }
}

function getFullUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `http://localhost:3000${url}`;
}

// Pure Vue lightweight Canvas-based Image Cropper logic
function initCanvasImage() {
  nextTick(() => {
    img.value = new Image();
    img.value.src = cropperImageSrc.value!;
    img.value.onload = () => {
      // Draw standard scale
      imgScale.value = 1.0;
      imgX.value = 0;
      imgY.value = 0;
      drawCanvas();
    };
  });
}

function drawCanvas() {
  const canvas = canvasRef.value;
  const container = cropperContainer.value;
  if (!canvas || !container || !img.value) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Make canvas cover the container width
  const w = container.clientWidth;
  const h = 400; // Fixed canvas height
  canvas.width = w;
  canvas.height = h;

  ctx.clearRect(0, 0, w, h);

  // Determine standard crop window size based on aspect ratio
  const ratio = getAspectRatioValue();
  let cropW = w * 0.8;
  let cropH = cropW / ratio;

  if (cropH > h * 0.8) {
    cropH = h * 0.8;
    cropW = cropH * ratio;
  }

  const cropX = (w - cropW) / 2;
  const cropY = (h - cropH) / 2;

  // Draw background image
  ctx.save();
  // We want to limit draw to crop area or draw full dim back and highlight crop
  ctx.globalAlpha = 0.4;
  ctx.drawImage(
    img.value,
    0,
    0,
    img.value.width,
    img.value.height,
    cropX + imgX.value,
    cropY + imgY.value,
    cropW * imgScale.value,
    (cropW * imgScale.value * img.value.height) / img.value.width,
  );
  ctx.restore();

  // Draw highlighted crop area
  ctx.save();
  ctx.beginPath();
  ctx.rect(cropX, cropY, cropW, cropH);
  ctx.clip();
  ctx.drawImage(
    img.value,
    0,
    0,
    img.value.width,
    img.value.height,
    cropX + imgX.value,
    cropY + imgY.value,
    cropW * imgScale.value,
    (cropW * imgScale.value * img.value.height) / img.value.width,
  );
  ctx.restore();

  // Draw crop boundary/frame overlay
  ctx.strokeStyle = '#0066cc';
  ctx.lineWidth = 3;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 8;
  ctx.strokeRect(cropX, cropY, cropW, cropH);

  // Outer dark overlay
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  // Draw quadrants
  ctx.fillRect(0, 0, w, cropY); // top
  ctx.fillRect(0, cropY + cropH, w, h - (cropY + cropH)); // bottom
  ctx.fillRect(0, cropY, cropX, cropH); // left
  ctx.fillRect(cropX + cropW, cropY, w - (cropX + cropW), cropH); // right
}

function zoomImage(delta: number) {
  imgScale.value = Math.max(0.2, imgScale.value + delta);
  drawCanvas();
}

// Mouse dragging/panning image inside cropper
function startDrag(e: MouseEvent) {
  isDragging.value = true;
  startX.value = e.clientX - imgX.value;
  startY.value = e.clientY - imgY.value;
}

function startDragTouch(e: TouchEvent) {
  isDragging.value = true;
  const touch = e.touches[0];
  startX.value = touch.clientX - imgX.value;
  startY.value = touch.clientY - imgY.value;
}

function drag(e: MouseEvent) {
  if (!isDragging.value) return;
  imgX.value = e.clientX - startX.value;
  imgY.value = e.clientY - startY.value;
  drawCanvas();
}

function dragTouch(e: TouchEvent) {
  if (!isDragging.value) return;
  const touch = e.touches[0];
  imgX.value = touch.clientX - startX.value;
  imgY.value = touch.clientY - startY.value;
  drawCanvas();
}

function endDrag() {
  isDragging.value = false;
}

// Generate cropped image using canvas and upload
async function cropAndUpload() {
  if (!img.value || cropperTargetIndex.value === null) return;

  uploading.value = true;

  try {
    const canvas = document.createElement('canvas');
    const ratio = getAspectRatioValue();

    // Standard high definition dimensions
    let outputW = 1200;
    let outputH = outputW / ratio;

    canvas.width = outputW;
    canvas.height = outputH;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate crop parameters mapped to source dimensions
    const cWidth = canvasRef.value!.width;
    const cHeight = canvasRef.value!.height;

    let cropW = cWidth * 0.8;
    let cropH = cropW / ratio;
    if (cropH > cHeight * 0.8) {
      cropH = cHeight * 0.8;
      cropW = cropH * ratio;
    }

    const cropX = (cWidth - cropW) / 2;
    const cropY = (cHeight - cropH) / 2;

    // We mapped:
    // cropX + imgX -> left of image relative to crop left
    // cropY + imgY -> top of image relative to crop top
    // Image is drawn with width: cropW * imgScale
    // Calculate source rect
    const scale = img.value.width / (cropW * imgScale.value);
    
    const sx = -imgX.value * scale;
    const sy = -imgY.value * scale;
    const sWidth = cropW * scale;
    const sHeight = cropH * scale;

    ctx.drawImage(
      img.value,
      sx,
      sy,
      sWidth,
      sHeight,
      0,
      0,
      outputW,
      outputH,
    );

    // Export as blob and upload
    canvas.toBlob(async (blob) => {
      if (!blob) {
        alert('Kırpma başarısız oldu.');
        uploading.value = false;
        return;
      }

      const file = new File([blob], 'banner-cropped.webp', { type: 'image/webp' });
      const formData = new FormData();
      formData.append('file', file);

      const response = await adminApi.post<{ url: string }>('/admin/uploads/images?kind=banners', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Update slide item image
      form.value.items[cropperTargetIndex.value!].imageUrl = response.data.url;

      uploading.value = false;
      closeCropper();
    }, 'image/webp', 0.9);
  } catch (err) {
    alert(`Yükleme hatası: ${toApiMessage(err)}`);
    uploading.value = false;
  }
}

// Watchers
watch(cropperOpen, (isOpen) => {
  if (isOpen) {
    isDragging.value = false;
  }
});

// Selection Selector Methods
function isResourceAction(type: string): boolean {
  return ['CATEGORY', 'PRODUCT', 'PRODUCTS', 'AUCTIONS', 'ANNOUNCEMENT'].includes(type);
}

function getSelectorTitle(): string {
  switch (selectorType.value) {
    case 'CATEGORY':
      return 'Kategori Seçin';
    case 'PRODUCT':
      return 'Ürün Seçin';
    case 'PRODUCTS':
      return 'Çoklu Ürün Seçin';
    case 'AUCTIONS':
      return 'Müzayede Seçin';
    case 'ANNOUNCEMENT':
      return 'Duyuru, Haber veya Blog Seçin';
    default:
      return 'Öğe Seçin';
  }
}

async function openSelector(index: number, type: 'CATEGORY' | 'PRODUCT' | 'PRODUCTS' | 'AUCTIONS' | 'ANNOUNCEMENT') {
  selectorTargetIndex.value = index;
  selectorType.value = type;
  selectorSearchQuery.value = '';
  selectorItems.value = [];
  selectorSelectedIds.value = [];
  selectorOpen.value = true;
  selectorLoading.value = true;

  try {
    if (type === 'CATEGORY') {
      const response = await adminApi.get<{ items: any[] }>('/admin/categories');
      selectorItems.value = (response.data.items ?? []).map((cat) => {
        categoryMap.value[String(cat.id)] = String(cat.name);
        return {
          id: String(cat.id),
          name: String(cat.name),
          extra: cat.slug ? `/${cat.slug}` : '',
        };
      });
    } else if (type === 'PRODUCT' || type === 'PRODUCTS') {
      const response = await adminApi.get<{ items: any[] }>('/admin/products', {
        params: { limit: 100 },
      });
      selectorItems.value = (response.data.items ?? []).map((prod) => {
        productMap.value[String(prod.id)] = String(prod.title);
        return {
          id: String(prod.id),
          name: String(prod.title),
          extra: prod.price ? `${prod.price} TL` : '',
        };
      });

      if (type === 'PRODUCTS' && form.value.items[index].actionValue) {
        selectorSelectedIds.value = form.value.items[index].actionValue
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean);
      }
    } else if (type === 'AUCTIONS') {
      const response = await adminApi.get<{ items: any[] }>('/admin/auction-events');
      selectorItems.value = (response.data.items ?? []).map((event) => {
        auctionMap.value[String(event.id)] = String(event.title);
        return {
          id: String(event.id),
          name: String(event.title),
          extra: event.status ? `Durum: ${event.status}` : '',
        };
      });
    } else if (type === 'ANNOUNCEMENT') {
      const response = await adminApi.get<{ document: { collections: { news: any[], blogs: any[] } } }>('/admin/content-studio');
      const newsItems = (response.data.document.collections.news ?? []).map((n) => {
        announcementMap.value[String(n.id)] = String(n.title);
        return {
          id: String(n.id),
          name: String(n.title),
          extra: 'Koleksiyon: Haber/Duyuru',
        };
      });
      const blogItems = (response.data.document.collections.blogs ?? []).map((b) => {
        announcementMap.value[String(b.id)] = String(b.title);
        return {
          id: String(b.id),
          name: String(b.title),
          extra: 'Koleksiyon: Blog Yazısı',
        };
      });
      selectorItems.value = [...newsItems, ...blogItems];
    }
  } catch (err) {
    alert(`Veri yükleme hatası: ${toApiMessage(err)}`);
  } finally {
    selectorLoading.value = false;
  }
}

function closeSelector() {
  selectorOpen.value = false;
  selectorType.value = null;
  selectorTargetIndex.value = null;
  selectorSearchQuery.value = '';
  selectorItems.value = [];
  selectorSelectedIds.value = [];
}

const filteredSelectorItems = computed(() => {
  const query = selectorSearchQuery.value.trim().toLowerCase();
  if (!query) return selectorItems.value;
  return selectorItems.value.filter(
    (item) =>
      item.name.toLowerCase().includes(query) ||
      item.id.toLowerCase().includes(query) ||
      (item.extra && item.extra.toLowerCase().includes(query)),
  );
});

function isItemSelected(id: string): boolean {
  return selectorSelectedIds.value.includes(id);
}

function toggleSelectorItem(item: { id: string; name: string }) {
  if (selectorType.value === 'PRODUCTS') {
    const idx = selectorSelectedIds.value.indexOf(item.id);
    if (idx > -1) {
      selectorSelectedIds.value.splice(idx, 1);
    } else {
      selectorSelectedIds.value.push(item.id);
    }
  } else {
    if (selectorTargetIndex.value !== null) {
      form.value.items[selectorTargetIndex.value].actionValue = item.id;
    }
    closeSelector();
  }
}

function confirmMultipleProducts() {
  if (selectorTargetIndex.value !== null && selectorSelectedIds.value.length > 0) {
    form.value.items[selectorTargetIndex.value].actionValue = selectorSelectedIds.value.join(',');
  }
  closeSelector();
}

// Maps loading & label resolution logic
async function loadResourceMaps() {
  if (mapsLoaded.value) return;
  try {
    const catRes = await adminApi.get<{ items: any[] }>('/admin/categories');
    (catRes.data.items ?? []).forEach((cat) => {
      categoryMap.value[String(cat.id)] = String(cat.name);
    });

    const prodRes = await adminApi.get<{ items: any[] }>('/admin/products', {
      params: { limit: 200 },
    });
    (prodRes.data.items ?? []).forEach((prod) => {
      productMap.value[String(prod.id)] = String(prod.title);
    });

    const aucRes = await adminApi.get<{ items: any[] }>('/admin/auction-events');
    (aucRes.data.items ?? []).forEach((event) => {
      auctionMap.value[String(event.id)] = String(event.title);
    });

    const studioRes = await adminApi.get<{ document: { collections: { news: any[], blogs: any[] } } }>('/admin/content-studio');
    (studioRes.data.document.collections.news ?? []).forEach((n) => {
      announcementMap.value[String(n.id)] = String(n.title);
    });
    (studioRes.data.document.collections.blogs ?? []).forEach((b) => {
      announcementMap.value[String(b.id)] = String(b.title);
    });

    mapsLoaded.value = true;
  } catch (err) {
    console.error('Resource maps loading failed', err);
  }
}

function getActionValueLabel(actionType: string, actionValue: string): string {
  if (!actionValue) return '';

  if (actionType === 'CATEGORY') {
    return categoryMap.value[actionValue] || 'Kategori (ID: ' + actionValue.slice(0, 8) + '...)';
  }
  
  if (actionType === 'PRODUCT') {
    return productMap.value[actionValue] || 'Ürün (ID: ' + actionValue.slice(0, 8) + '...)';
  }
  
  if (actionType === 'PRODUCTS') {
    const ids = actionValue.split(',').map((id) => id.trim()).filter(Boolean);
    const names = ids.map((id) => productMap.value[id] || 'Ürün (ID: ' + id.slice(0, 8) + '...)');
    return names.join(', ');
  }
  
  if (actionType === 'AUCTIONS') {
    return auctionMap.value[actionValue] || 'Müzayede (ID: ' + actionValue.slice(0, 8) + '...)';
  }

  if (actionType === 'ANNOUNCEMENT') {
    return announcementMap.value[actionValue] || 'Duyuru/Blog (ID: ' + actionValue.slice(0, 8) + '...)';
  }

  return actionValue;
}
</script>

<style scoped>
.centered-backdrop {
  justify-content: center !important;
  align-items: center !important;
  padding: 20px;
}

.centered-modal {
  animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

.editor-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-strong, #1f2937);
  margin: 0;
}

.page-header p {
  font-size: 14px;
  color: var(--text-muted, #6b7280);
  margin: 4px 0 0 0;
}

.error-text {
  color: var(--color-error, #dc2626);
  margin-top: 12px;
  font-weight: 600;
}

/* Form Styling & Layout */
.editor-drawer {
  background: var(--bg-panel, #ffffff);
  width: 90%;
  max-width: 960px;
  height: 90vh;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

.drawer-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-soft, #e5e7eb);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.drawer-header h2 {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.drawer-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.form-row {
  display: grid;
  gap: 16px;
  margin-bottom: 16px;
}

.grid-2 {
  grid-template-columns: 1fr 1fr;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-strong, #374151);
}

.muted {
  font-size: 11.5px;
  color: var(--text-muted, #9ca3af);
}

/* Slides Manager */
.slides-section {
  margin-top: 32px;
  border-top: 1px dashed var(--border-soft, #e5e7eb);
  padding-top: 24px;
}

.section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title-row h3 {
  font-size: 15px;
  font-weight: 700;
  margin: 0;
}

.empty-slides {
  padding: 48px;
  text-align: center;
  border: 2px dashed var(--border-soft, #e5e7eb);
  border-radius: 8px;
  color: var(--text-muted, #9ca3af);
}

.empty-slides i {
  font-size: 32px;
  margin-bottom: 12px;
}

.slides-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.slide-card {
  border: 1px solid var(--border-soft, #e5e7eb);
  border-radius: 8px;
  background: var(--bg-soft, #f9fafb);
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.slide-card-header {
  padding: 10px 16px;
  background: var(--border-soft, #e5e7eb);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.slide-card-header h4 {
  font-size: 13px;
  font-weight: 700;
  margin: 0;
}

.slide-card-body {
  padding: 16px;
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 20px;
}

.slide-image-picker {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border: 2px dashed var(--border-soft, #e5e7eb);
  border-radius: 8px;
  overflow: hidden;
  background: #ffffff;
  aspect-ratio: 16/10;
  cursor: pointer;
  position: relative;
}

.image-preview-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.image-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.change-image-btn {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px !important;
  font-weight: 700 !important;
  padding: 6px 12px !important;
  background: #dc2626 !important;
  color: #ffffff !important;
  border-radius: 6px !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2) !important;
}

.image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--text-muted, #9ca3af);
  padding: 24px;
  text-align: center;
}

.image-placeholder i {
  font-size: 24px;
}

.slide-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 6px;
}

.confirmation-details {
  margin-top: 10px;
  background: #ffffff;
  border: 1px solid var(--border-soft, #e5e7eb);
  border-radius: 6px;
  padding: 12px;
}

.form-footer {
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid var(--border-soft, #e5e7eb);
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
}

.reason-group {
  flex: 1;
  max-width: 600px;
}

/* Cropper Modal Design */
.cropper-modal {
  background: #ffffff;
  width: 90%;
  max-width: 640px;
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.cropper-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-soft, #e5e7eb);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cropper-header h3 {
  font-size: 15px;
  font-weight: 700;
  margin: 0;
}

.cropper-body {
  padding: 20px;
}

.cropper-upload-area {
  border: 3px dashed var(--border-soft, #e5e7eb);
  border-radius: 8px;
  padding: 48px;
  text-align: center;
  background: var(--bg-soft, #f9fafb);
}

.file-input {
  display: none;
}

.upload-trigger {
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--text-muted, #9ca3af);
}

.upload-trigger i {
  font-size: 40px;
  color: var(--brand-500, #0066cc);
}

.cropper-workspace {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cropper-canvas-container {
  border: 1px solid var(--border-soft, #e5e7eb);
  border-radius: 8px;
  overflow: hidden;
  background: #111;
  position: relative;
}

.cropper-canvas {
  width: 100%;
  height: 400px;
  cursor: grab;
}

.cropper-canvas:active {
  cursor: grabbing;
}

.cropper-controls {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.cropper-footer {
  padding: 16px;
  border-top: 1px solid var(--border-soft, #e5e7eb);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: var(--bg-soft, #f9fafb);
}

.slide-tabs-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border-soft, #e5e7eb);
  padding-bottom: 12px;
}

.slide-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--bg-soft, #f9fafb);
  border: 1px solid var(--border-soft, #e5e7eb);
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted, #6b7280);
  cursor: pointer;
  transition: all 0.2s ease;
}

.slide-tab-btn:hover {
  background: var(--border-soft, #e5e7eb);
  color: var(--text-strong, #1f2937);
}

.slide-tab-btn.active {
  background: var(--brand-500, #0066cc);
  border-color: var(--brand-500, #0066cc);
  color: #ffffff;
}

.tab-badge-checked {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #22c55e;
  color: #ffffff;
  font-size: 9px;
}

.slide-tab-btn.active .tab-badge-checked {
  background: #ffffff;
  color: #22c55e;
}

/* Clickable Premium Selection Input */
.clickable-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  cursor: pointer;
  width: 100%;
}

.clickable-input {
  cursor: pointer !important;
  background-color: var(--bg-soft, #f9fafb) !important;
  padding-right: 36px !important;
  width: 100%;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid var(--border-soft, #e5e7eb);
}

.clickable-input:hover {
  background-color: #f3f4f6 !important;
  border-color: var(--brand-500, #0066cc) !important;
  box-shadow: 0 0 0 1px var(--brand-500, #0066cc);
}

.clickable-input:focus {
  outline: none;
  border-color: var(--brand-500, #0066cc) !important;
  box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.15);
}

.clickable-input-icon {
  position: absolute;
  right: 12px;
  color: var(--text-muted, #9ca3af);
  pointer-events: none;
  font-size: 14px;
  transition: color 0.2s ease;
}

.clickable-input-wrapper:hover .clickable-input-icon {
  color: var(--brand-500, #0066cc);
}

/* Selector Modal Design */
.selector-modal {
  background: #ffffff;
  width: 95%;
  max-width: 500px;
  max-height: 80vh;
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
}

.selector-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-soft, #e5e7eb);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.selector-header h3 {
  font-size: 15px;
  font-weight: 700;
  margin: 0;
}

.selector-body {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.selector-search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.selector-search-wrapper .search-icon {
  position: absolute;
  left: 12px;
  color: var(--text-muted, #9ca3af);
  font-size: 14px;
}

.selector-search-input {
  padding-left: 36px !important;
  width: 100%;
}

.selector-loading, .selector-empty {
  padding: 32px;
  text-align: center;
  color: var(--text-muted, #9ca3af);
}

.selector-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  max-height: 350px;
  border: 1px solid var(--border-soft, #e5e7eb);
  border-radius: 8px;
  padding: 8px;
}

.selector-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid transparent;
}

.selector-item:hover {
  background: var(--bg-soft, #f9fafb);
  border-color: var(--border-soft, #e5e7eb);
}

.selector-item.selected {
  background: #f0f7ff;
  border-color: #bee3f8;
}

.selector-checkbox {
  font-size: 16px;
  color: var(--text-muted, #9ca3af);
}

.selected-box {
  color: var(--brand-500, #0066cc) !important;
}

.selector-item-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-strong, #1f2937);
  text-align: left;
}

.item-extra {
  font-size: 11.5px;
  color: var(--brand-500, #0066cc);
  font-weight: 500;
  text-align: left;
}

.item-id {
  font-size: 10.5px;
  color: var(--text-muted, #9ca3af);
  font-family: monospace;
  text-align: left;
}

.selector-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border-soft, #e5e7eb);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: var(--bg-soft, #f9fafb);
  flex-shrink: 0;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes scaleUp {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* Localized Language Tabs Bar */
.lang-tabs-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  background: var(--bg-soft, #f3f4f6);
  padding: 4px;
  border-radius: 8px;
  align-self: flex-start;
}

.lang-tab-btn {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-muted, #4b5563);
  cursor: pointer;
  transition: all 0.15s ease;
}

.lang-tab-btn:hover {
  color: var(--text-strong, #1f2937);
}

.lang-tab-btn.active {
  background: #ffffff;
  color: var(--brand-500, #0066cc);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.lang-inputs-container {
  width: 100%;
}

/* Premium Banner Thumbnails List in Row */
.banner-name-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0;
}

.banner-name-text {
  font-weight: 600;
  color: var(--text-strong, #1f2937);
  font-size: 13.5px;
}

.banner-thumbnails-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
}

.banner-thumbnail-item {
  width: 32px;
  height: 18px;
  border-radius: 3px;
  overflow: hidden;
  border: 1px solid var(--border-soft, #e5e7eb);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--bg-soft, #f9fafb);
}

.banner-thumbnail-item:hover {
  transform: scale(1.3) translateY(-1px);
  border-color: var(--brand-500, #0066cc) !important;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  z-index: 10;
}

.banner-thumbnail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>
