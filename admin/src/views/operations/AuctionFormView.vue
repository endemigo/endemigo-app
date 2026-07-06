<template>
  <section class="field-grid">
    <header class="page-header">
      <div>
        <h1>Müzayedeler / Yeni Müzayede</h1>
        <p>Ürün seçin, müzayede koşullarını belirleyin ve taslak oluşturun.</p>
      </div>
      <div class="toolbar">
        <button class="button ghost" type="button" @click="goBack">Vazgeç</button>
        <button
          v-if="!created"
          class="button primary"
          type="button"
          :disabled="saving"
          @click="submit"
        >
          {{ saving ? 'Oluşturuluyor...' : 'Taslak Oluştur' }}
        </button>
      </div>
    </header>

    <p v-if="error" class="error-text">{{ error }}</p>

    <!-- ─── SUCCESS PANEL ─── -->
    <section v-if="created" class="panel">
      <div class="panel-body success-body">
        <i class="pi pi-check-circle success-icon" aria-hidden="true" />
        <h2>{{ published ? 'Müzayede yayınlandı' : 'Müzayede taslak olarak oluşturuldu' }}</h2>
        <p v-if="published" class="muted">
          Müzayede başlangıç zamanında otomatik olarak başlayacak.
        </p>
        <p v-else class="muted">
          Müzayede şu anda TASLAK (DRAFT) durumunda ve henüz yayında değil. Buradan hemen
          yayınlayabilir veya yayınlamayı müzayede detay sayfasına bırakabilirsin.
        </p>
        <p v-if="publishError" class="error-text">{{ publishError }}</p>
        <div class="success-actions">
          <button
            v-if="createdAuctionId && !published"
            class="button primary"
            type="button"
            :disabled="publishing"
            @click="publishNow"
          >
            <i v-if="publishing" class="pi pi-spin pi-spinner" aria-hidden="true" />
            Şimdi Yayınla
          </button>
          <button
            v-if="createdAuctionId"
            :class="['button', published ? 'primary' : 'ghost']"
            type="button"
            @click="goToDetail"
          >
            Detaya Git
          </button>
          <button class="button ghost" type="button" @click="resetForm">Yeni Müzayede</button>
        </div>
      </div>
    </section>

    <template v-else>
      <!-- ─── PRODUCT SELECTION ─── -->
      <section class="panel">
        <header class="panel-header"><h3>Ürün</h3></header>
        <div class="panel-body field-grid">
          <div v-if="productLoading" class="picker-loading">
            <i class="pi pi-spin pi-spinner" aria-hidden="true" />
            <span>Ürün bilgisi yükleniyor...</span>
          </div>

          <div v-else-if="selectedProduct" class="product-card">
            <img
              v-if="selectedProduct.imageUrl"
              :src="selectedProduct.imageUrl"
              alt="Ürün görseli"
              class="product-thumb"
            />
            <div v-else class="product-thumb product-thumb-placeholder">
              <i class="pi pi-image" aria-hidden="true" />
            </div>
            <div class="product-info">
              <strong>{{ selectedProduct.title }}</strong>
              <span v-if="selectedProduct.price !== null" class="muted">
                Satış Fiyatı: {{ formatPrice(selectedProduct.price) }}
              </span>
              <span v-if="selectedProduct.sellerName" class="muted">
                Satıcı: {{ selectedProduct.sellerName }}
              </span>
            </div>
            <button
              v-if="!productLockedFromQuery"
              class="button ghost"
              type="button"
              @click="clearSelectedProduct"
            >
              Değiştir
            </button>
          </div>

          <template v-else>
            <label class="field">
              <span>Ürün Ara</span>
              <input
                v-model="pickerSearch"
                class="input"
                type="text"
                placeholder="Ürün adına göre ara..."
              />
            </label>

            <div v-if="pickerLoading" class="picker-loading">
              <i class="pi pi-spin pi-spinner" aria-hidden="true" />
              <span>Ürünler yükleniyor...</span>
            </div>

            <div v-else-if="filteredPickerProducts.length === 0" class="empty-state">
              <p>Arama kriterine uygun ürün bulunamadı.</p>
            </div>

            <div v-else class="product-picker-list">
              <button
                v-for="product in filteredPickerProducts"
                :key="product.id"
                class="product-pick-row"
                type="button"
                @click="selectProduct(product)"
              >
                <img
                  v-if="product.imageUrl"
                  :src="product.imageUrl"
                  alt="Ürün görseli"
                  class="product-thumb small"
                />
                <div v-else class="product-thumb small product-thumb-placeholder">
                  <i class="pi pi-image" aria-hidden="true" />
                </div>
                <div class="product-info">
                  <strong>{{ product.title }}</strong>
                  <span v-if="product.price !== null" class="muted">
                    {{ formatPrice(product.price) }}
                  </span>
                </div>
                <i class="pi pi-angle-right" aria-hidden="true" />
              </button>
            </div>
          </template>

          <small v-if="fieldErrors.productId" class="error-text">{{ fieldErrors.productId }}</small>
        </div>
      </section>

      <!-- ─── AUCTION TYPE ─── -->
      <section class="panel">
        <header class="panel-header"><h3>Müzayede Tipi</h3></header>
        <div class="panel-body">
          <div class="type-options">
            <div
              v-for="option in typeOptions"
              :key="option.value"
              class="type-option-card"
              :class="[option.value.toLowerCase(), { 'is-selected': form.auctionType === option.value }]"
              role="radio"
              :aria-checked="form.auctionType === option.value"
              tabindex="0"
              @click="form.auctionType = option.value"
              @keydown.enter.prevent="form.auctionType = option.value"
              @keydown.space.prevent="form.auctionType = option.value"
            >
              <div class="option-icon">
                <i :class="option.icon" aria-hidden="true" />
              </div>
              <div class="option-content">
                <h4>{{ option.title }}</h4>
                <p>{{ option.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ─── PRICE & SCHEDULE ─── -->
      <section class="panel">
        <header class="panel-header"><h3>Fiyat ve Zamanlama</h3></header>
        <div class="panel-body form-grid">
          <label class="field">
            <span>Başlangıç Fiyatı (₺) *</span>
            <input v-model="form.startPrice" class="input" type="number" min="1" step="0.01" />
            <small v-if="fieldErrors.startPrice" class="error-text">{{ fieldErrors.startPrice }}</small>
          </label>
          <label class="field">
            <span>Minimum Artış (₺)</span>
            <input
              v-model="form.minIncrement"
              class="input"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Varsayılan: 1"
            />
            <small v-if="fieldErrors.minIncrement" class="error-text">{{ fieldErrors.minIncrement }}</small>
          </label>
          <label class="field">
            <span>Rezerv Fiyat (₺)</span>
            <input
              v-model="form.reservePrice"
              class="input"
              type="number"
              min="1"
              step="0.01"
              placeholder="Opsiyonel"
            />
            <small v-if="fieldErrors.reservePrice" class="error-text">{{ fieldErrors.reservePrice }}</small>
          </label>
          <label class="field">
            <span>Başlangıç Zamanı *</span>
            <input v-model="form.startTime" class="input" type="datetime-local" :min="minStartLocal" />
            <small v-if="fieldErrors.startTime" class="error-text">{{ fieldErrors.startTime }}</small>
          </label>
          <label class="field">
            <span>Bitiş Zamanı *</span>
            <input
              v-model="form.endTime"
              class="input"
              type="datetime-local"
              :min="form.startTime || minStartLocal"
            />
            <small v-if="fieldErrors.endTime" class="error-text">{{ fieldErrors.endTime }}</small>
          </label>
        </div>
      </section>

      <!-- ─── REALTIME SETTINGS (sadece canlı müzayedede anlamlı) ─── -->
      <section v-if="form.auctionType === 'REALTIME'" class="panel">
        <header class="panel-header"><h3>Canlı Müzayede Ayarları</h3></header>
        <div class="panel-body form-grid">
          <label class="check-row">
            <input v-model="form.antiSnipingEnabled" type="checkbox" />
            <span>Anti-sniping aktif (son saniye tekliflerinde süre otomatik uzar)</span>
          </label>
          <label class="field">
            <span>Uzatma Süresi (saniye)</span>
            <input v-model="form.extensionSeconds" class="input" type="number" min="30" max="120" step="1" />
            <small v-if="fieldErrors.extensionSeconds" class="error-text">{{ fieldErrors.extensionSeconds }}</small>
          </label>
          <label class="field">
            <span>Maksimum Uzatma Sayısı</span>
            <input v-model="form.maxExtensions" class="input" type="number" min="1" max="10" step="1" />
            <small v-if="fieldErrors.maxExtensions" class="error-text">{{ fieldErrors.maxExtensions }}</small>
          </label>
        </div>
      </section>

      <!-- ─── OTHER ─── -->
      <section class="panel">
        <header class="panel-header"><h3>Diğer</h3></header>
        <div class="panel-body field-grid">
          <label class="check-row">
            <input v-model="form.culturalAssetRestricted" type="checkbox" />
            <span>Kültür varlığı kısıtlamasına tabidir (2863 sayılı kanun kapsamında)</span>
          </label>
          <p class="muted form-hint">
            Müzayede taslak olarak kaydedilir; yayınlama işlemi detay sayfasından ayrıca yapılır.
          </p>
        </div>
      </section>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { adminApi, toApiMessage, type ApiListResponse } from '../../services/api';

type AuctionTypeOption = 'REALTIME' | 'TIMED';

interface ProductSummary {
  id: string;
  title: string;
  price: number | null;
  imageUrl: string;
  sellerName: string;
}

interface TypeOption {
  value: AuctionTypeOption;
  title: string;
  description: string;
  icon: string;
}

interface AuctionCreateResponse {
  code?: string;
  message?: string;
  id?: string;
}

interface ProductDetailResponse {
  overview?: Record<string, unknown>;
}

const router = useRouter();
const route = useRoute();

// Ürün, route query üzerinden (/auctions/new?productId=...) sabitlenmiş olarak gelebilir;
// bu durumda seçici yerine salt okunur özet kartı gösterilir.
const lockedProductId = typeof route.query.productId === 'string' ? route.query.productId : '';
const productLockedFromQuery = ref(Boolean(lockedProductId));

const selectedProduct = ref<ProductSummary | null>(null);
const productLoading = ref(false);

const pickerProducts = ref<ProductSummary[]>([]);
const pickerLoading = ref(false);
const pickerSearch = ref('');

const typeOptions: TypeOption[] = [
  {
    value: 'REALTIME',
    title: 'Canlı Müzayede',
    description: 'Anlık tekliflerle ilerleyen, anti-sniping süre uzatmalı canlı müzayede modeli.',
    icon: 'pi pi-bolt',
  },
  {
    value: 'TIMED',
    title: 'Süreli Müzayede',
    description: 'Belirlenen tarih aralığında açık kalan ve süre sonunda otomatik kapanan müzayede modeli.',
    icon: 'pi pi-clock',
  },
];

// Sayısal alanlar input'tan string gelir; submit sırasında Number()'a çevrilir.
const form = reactive({
  startPrice: '',
  minIncrement: '',
  reservePrice: '',
  auctionType: 'REALTIME' as AuctionTypeOption,
  startTime: '',
  endTime: '',
  antiSnipingEnabled: true,
  extensionSeconds: '60',
  maxExtensions: '5',
  culturalAssetRestricted: false,
});

const fieldErrors = reactive<Record<string, string>>({});
const error = ref<string | null>(null);
const saving = ref(false);
const created = ref(false);
const createdAuctionId = ref<string | null>(null);
const publishing = ref(false);
const published = ref(false);
const publishError = ref<string | null>(null);

// datetime-local input'u için "YYYY-MM-DDTHH:mm" formatında yerel zaman üretir.
function toLocalDateTimeInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const minStartLocal = computed(() => toLocalDateTimeInput(new Date()));

const filteredPickerProducts = computed(() => {
  const query = pickerSearch.value.trim().toLocaleLowerCase('tr-TR');
  if (!query) return pickerProducts.value;
  return pickerProducts.value.filter((product) =>
    product.title.toLocaleLowerCase('tr-TR').includes(query),
  );
});

function formatPrice(value: number): string {
  return `₺${value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function toNullableNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toProductSummary(row: Record<string, unknown>): ProductSummary {
  const images = Array.isArray(row.images)
    ? (row.images as Array<{ url?: string }>)
    : [];
  const firstImageUrl = images.find((image) => image?.url)?.url ?? '';
  return {
    id: String(row.id ?? ''),
    title: String(row.title ?? ''),
    price: toNullableNumber(row.price),
    imageUrl: String(row.imageUrl ?? firstImageUrl ?? ''),
    sellerName: row.sellerName ? String(row.sellerName) : '',
  };
}

async function loadProductFromQuery(): Promise<void> {
  if (!lockedProductId) return;
  productLoading.value = true;
  try {
    const response = await adminApi.get<ProductDetailResponse>(`/admin/products/${lockedProductId}`);
    const overview = response.data.overview ?? {};
    selectedProduct.value = toProductSummary({ ...overview, id: lockedProductId });
  } catch (loadError) {
    // Query'deki ürün yüklenemezse kilidi kaldırıp normal seçiciye düş.
    error.value = toApiMessage(loadError);
    productLockedFromQuery.value = false;
    await loadPickerProducts();
  } finally {
    productLoading.value = false;
  }
}

async function loadPickerProducts(): Promise<void> {
  pickerLoading.value = true;
  try {
    // Ürün listesi endpoint'i metin araması desteklemiyor; ilk sayfayı geniş
    // bir limitle çekip başlık filtresini client tarafında uyguluyoruz.
    const response = await adminApi.get<ApiListResponse>('/admin/products', {
      params: { page: 1, limit: 100 },
    });
    const items = Array.isArray(response.data.items) ? response.data.items : [];
    pickerProducts.value = items.map(toProductSummary).filter((product) => product.id);
  } catch (loadError) {
    error.value = toApiMessage(loadError);
    pickerProducts.value = [];
  } finally {
    pickerLoading.value = false;
  }
}

function selectProduct(product: ProductSummary): void {
  selectedProduct.value = product;
  delete fieldErrors.productId;
}

function clearSelectedProduct(): void {
  selectedProduct.value = null;
  if (pickerProducts.value.length === 0) {
    void loadPickerProducts();
  }
}

function validate(): boolean {
  Object.keys(fieldErrors).forEach((key) => delete fieldErrors[key]);

  if (!selectedProduct.value) {
    fieldErrors.productId = 'Müzayede için bir ürün seçmelisiniz';
  }

  const startPrice = Number(form.startPrice);
  if (!form.startPrice.trim() || !Number.isFinite(startPrice) || startPrice <= 0) {
    fieldErrors.startPrice = "Başlangıç fiyatı 0'dan büyük olmalıdır";
  }

  if (form.minIncrement.trim()) {
    const minIncrement = Number(form.minIncrement);
    if (!Number.isFinite(minIncrement) || minIncrement <= 0) {
      fieldErrors.minIncrement = "Minimum artış 0'dan büyük olmalıdır";
    }
  }

  if (form.reservePrice.trim()) {
    const reservePrice = Number(form.reservePrice);
    if (!Number.isFinite(reservePrice) || reservePrice <= 0) {
      fieldErrors.reservePrice = "Rezerv fiyat 0'dan büyük olmalıdır";
    } else if (Number.isFinite(startPrice) && reservePrice < startPrice) {
      fieldErrors.reservePrice = 'Rezerv fiyat başlangıç fiyatından düşük olamaz';
    }
  }

  if (!form.startTime) {
    fieldErrors.startTime = 'Başlangıç zamanı zorunludur';
  } else if (new Date(form.startTime).getTime() <= Date.now()) {
    // Backend geçmiş startTime'ı ancak yayınlama (publish) adımında reddediyor;
    // taslağı boşa oluşturmamak için burada erken yakalıyoruz.
    fieldErrors.startTime = 'Başlangıç zamanı geçmişte olamaz';
  }

  if (!form.endTime) {
    fieldErrors.endTime = 'Bitiş zamanı zorunludur';
  } else if (
    form.startTime &&
    new Date(form.endTime).getTime() <= new Date(form.startTime).getTime()
  ) {
    fieldErrors.endTime = 'Bitiş zamanı başlangıç zamanından sonra olmalıdır';
  }

  if (form.auctionType === 'REALTIME') {
    const extensionSeconds = Number(form.extensionSeconds);
    if (!Number.isInteger(extensionSeconds) || extensionSeconds < 30 || extensionSeconds > 120) {
      fieldErrors.extensionSeconds = 'Uzatma süresi 30 ile 120 saniye arasında olmalıdır';
    }
    const maxExtensions = Number(form.maxExtensions);
    if (!Number.isInteger(maxExtensions) || maxExtensions < 1 || maxExtensions > 10) {
      fieldErrors.maxExtensions = 'Maksimum uzatma sayısı 1 ile 10 arasında olmalıdır';
    }
  }

  return Object.keys(fieldErrors).length === 0;
}

async function submit(): Promise<void> {
  error.value = null;
  if (!validate()) {
    error.value = 'Lütfen formdaki hatalı alanları düzeltin.';
    return;
  }

  const payload: Record<string, unknown> = {
    productId: selectedProduct.value!.id,
    startPrice: Number(form.startPrice),
    auctionType: form.auctionType,
    startTime: new Date(form.startTime).toISOString(),
    endTime: new Date(form.endTime).toISOString(),
    culturalAssetRestricted: form.culturalAssetRestricted,
  };
  if (form.minIncrement.trim()) payload.minIncrement = Number(form.minIncrement);
  if (form.reservePrice.trim()) payload.reservePrice = Number(form.reservePrice);
  if (form.auctionType === 'REALTIME') {
    payload.antiSnipingEnabled = form.antiSnipingEnabled;
    payload.extensionSeconds = Number(form.extensionSeconds);
    payload.maxExtensions = Number(form.maxExtensions);
  }

  saving.value = true;
  try {
    // Müzayede oluşturma endpoint'i auction.controller'daki POST /auctions;
    // admin paneli /auctions/* rotalarını da adminApi token'ıyla çağırıyor
    // (bkz. AuctionEventDetailView invitation istekleri). Kayıt DRAFT açılır.
    const response = await adminApi.post<AuctionCreateResponse>('/auctions', payload);
    createdAuctionId.value = response.data?.id ? String(response.data.id) : null;
    created.value = true;
  } catch (submitError) {
    error.value = toApiMessage(submitError);
  } finally {
    saving.value = false;
  }
}

// Satıcı hesapları admin müzayede detayına erişemediği için yayınlama burada da
// sunulur; publish endpoint'i sahiplik kontrolü yapar (satıcı olmayan hesapta hata döner).
async function publishNow(): Promise<void> {
  if (!createdAuctionId.value || publishing.value) return;
  publishing.value = true;
  publishError.value = null;
  try {
    await adminApi.patch(`/auctions/${createdAuctionId.value}/publish`);
    published.value = true;
  } catch (err) {
    publishError.value = toApiMessage(err);
  } finally {
    publishing.value = false;
  }
}

function resetForm(): void {
  created.value = false;
  createdAuctionId.value = null;
  publishing.value = false;
  published.value = false;
  publishError.value = null;
  error.value = null;
  Object.keys(fieldErrors).forEach((key) => delete fieldErrors[key]);
  form.startPrice = '';
  form.minIncrement = '';
  form.reservePrice = '';
  form.auctionType = 'REALTIME';
  form.startTime = '';
  form.endTime = '';
  form.antiSnipingEnabled = true;
  form.extensionSeconds = '60';
  form.maxExtensions = '5';
  form.culturalAssetRestricted = false;
  // Query ile sabitlenmiş ürün korunur; seçiciden gelen ürün sıfırlanır.
  if (!productLockedFromQuery.value) {
    selectedProduct.value = null;
    if (pickerProducts.value.length === 0) {
      void loadPickerProducts();
    }
  }
}

function goToDetail(): void {
  if (!createdAuctionId.value) return;
  void router.push(`/auctions/${createdAuctionId.value}`);
}

function goBack(): void {
  void router.push('/auctions');
}

onMounted(async () => {
  if (lockedProductId) {
    await loadProductFromQuery();
  } else {
    await loadPickerProducts();
  }
});
</script>

<style scoped>
.panel-header h3 {
  margin: 0;
  font-size: 15px;
  color: var(--text-strong);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.form-grid .check-row {
  grid-column: 1 / -1;
}

.check-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
  color: var(--text-body);
}

.check-row input[type='checkbox'] {
  margin-top: 2px;
  width: 16px;
  height: 16px;
}

.form-hint {
  margin: 0;
}

/* ─── Ürün kartı & seçici ─── */
.product-card {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  background: var(--bg-elevated);
  padding: 10px;
}

.product-thumb {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid var(--border-soft);
}

.product-thumb.small {
  width: 44px;
  height: 44px;
}

.product-thumb-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-soft);
  color: var(--text-muted);
}

.product-info {
  display: grid;
  gap: 2px;
  min-width: 0;
  flex: 1;
  text-align: left;
}

.product-info strong {
  color: var(--text-strong);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-picker-list {
  display: grid;
  gap: 6px;
  max-height: 320px;
  overflow-y: auto;
}

.product-pick-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  background: var(--bg-panel);
  padding: 8px 10px;
  text-align: left;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.product-pick-row:hover {
  border-color: var(--brand-500);
  background: var(--brand-100);
}

.picker-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-muted);
  padding: 8px 0;
}

/* ─── Tip seçim kartları (AuctionEventsListView modal stiliyle uyumlu) ─── */
.type-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.type-option-card {
  display: flex;
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.type-option-card:hover {
  transform: translateY(-2px);
  border-color: var(--brand-500);
  box-shadow: 0 6px 15px rgba(54, 95, 168, 0.08);
}

.type-option-card.is-selected {
  border-color: var(--brand-500);
  background: var(--brand-100);
  box-shadow: 0 0 0 1px var(--brand-500) inset;
}

.option-icon {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.realtime .option-icon {
  background: #eff6ff;
  color: #3b82f6;
}

.timed .option-icon {
  background: #fffbeb;
  color: #d97706;
}

.option-content h4 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-strong);
}

.option-content p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.4;
}

/* ─── Başarı paneli ─── */
.success-body {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 32px 16px;
  text-align: center;
}

.success-icon {
  font-size: 40px;
  color: #15803d;
}

.success-body h2 {
  margin: 0;
  font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif;
  color: var(--text-strong);
}

.success-body .muted {
  max-width: 460px;
}

.success-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.field small.error-text {
  font-size: 12px;
}
</style>
