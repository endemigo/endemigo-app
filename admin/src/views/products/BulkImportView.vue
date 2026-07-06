<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">
        <h1>{{ isLotMode ? 'Excel\'den Lot Yükle' : 'Toplu Ürün Yükleme (Excel)' }}</h1>
        <p class="page-subtitle">
          {{ isLotMode
            ? 'Excel dosyasıyla ürünleri ve müzayede lotlarını tek adımda etkinliğe ekleyin. İsteğe bağlı sütunlar: Açılış Fiyatı, Artış, Rezerv.'
            : 'Excel dosyasını yükleyerek tek seferde 50\'den fazla ürünü taslak olarak ekleyebilirsiniz.' }}
        </p>
      </div>
    </div>

    <div class="card import-card">
      <div class="import-dropzone" @dragover.prevent @drop.prevent="handleDrop">
        <i class="pi pi-cloud-upload upload-icon"></i>
        <h3>Dosyayı Sürükleyin veya Seçin</h3>
        <p class="text-secondary">Sadece .xlsx ve .csv dosyaları desteklenir.</p>

        <input
          type="file"
          ref="fileInput"
          accept=".xlsx, .csv"
          class="hidden-input"
          @change="handleFileSelect"
        />
        <button class="button primary mt-4" @click="$refs.fileInput.click()">
          Dosya Seç
        </button>
      </div>
    </div>

    <!-- Lot modu: görseller ayrı alandan topluca seçilir, dosya adıyla satıra eşleşir -->
    <div v-if="isLotMode" class="card import-card mt-4">
      <div class="import-dropzone" @dragover.prevent @drop.prevent="handleImageDrop">
        <i class="pi pi-images upload-icon"></i>
        <h3>Ürün Görselleri</h3>
        <p class="text-secondary">
          Excel'deki "Görseller" kolonunda yazdığınız dosyaları buraya sürükleyin veya seçin
          (ör. <code>kars-halisi-1.jpg; kars-halisi-2.jpg</code>).
          Kolon boşsa <code>satırNo-1.jpg</code> adlandırması otomatik eşleşir. Ürün başına en fazla 10 görsel.
        </p>
        <input
          type="file"
          ref="imageInput"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          class="hidden-input"
          @change="handleImageSelect"
        />
        <button class="button primary mt-4" @click="imageInput?.click()">
          Görselleri Seç
        </button>
        <p v-if="imageFiles.length > 0" class="mt-2">
          <strong>{{ imageFiles.length }}</strong> görsel seçildi
        </p>
      </div>
    </div>

    <!-- Sütun başlığı doğrulama hatası: eksik zorunlu sütunlar + dosyada bulunanlar -->
    <div v-if="headerError" class="card mt-6 error-card">
      <h3><i class="pi pi-times-circle"></i> Gerekli sütunlar bulunamadı</h3>
      <p class="mt-2">
        Aşağıdaki zorunlu sütun(lar) dosyada yok. Yükleme yapılamaz; dosyadaki sütun
        başlıklarını düzeltip tekrar deneyin.
      </p>
      <ul class="mt-2 error-list">
        <li v-for="missing in headerError.missing" :key="missing">
          Beklenen sütun: <strong>{{ missing }}</strong>
        </li>
      </ul>
      <p class="mt-2">
        Dosyada bulunan başlıklar:
        <template v-if="headerError.found.length > 0">
          <span v-for="(header, index) in headerError.found" :key="index" class="badge neutral header-chip">{{ header }}</span>
        </template>
        <em v-else>hiç başlık bulunamadı (ilk satır boş)</em>
      </p>
    </div>

    <!-- Başlıklar geçerli ama dosyada hiç veri satırı yoksa sessiz kalmamak için uyarı göster -->
    <div v-if="emptyFileNotice" class="card mt-6">
      <p class="warning-banner">
        <i class="pi pi-exclamation-triangle"></i>
        <span>{{ emptyFileNotice }}</span>
      </p>
    </div>

    <div v-if="parsedRows.length > 0" class="card mt-6">
      <div class="card-header flex justify-between align-center">
        <h3>Önizleme ({{ parsedRows.length }} satır, {{ validRows.length }} geçerli {{ isLotMode ? 'lot' : 'ürün' }})</h3>
        <button
          class="button primary"
          :disabled="isUploading || validRows.length === 0 || (isLotMode && !guaranteeAccepted)"
          @click="uploadToBackend"
        >
          <i class="pi pi-check" v-if="!isUploading"></i>
          <i class="pi pi-spinner pi-spin" v-else></i>
          Onayla ve Yükle
        </button>
      </div>

      <!-- Hiçbir satıra eşleşmeyen görseller: yükleme öncesi görünür uyarı -->
      <div v-if="isLotMode && unmatchedImageFiles.length > 0" class="warning-banner mt-4">
        <i class="pi pi-exclamation-triangle"></i>
        <span>
          {{ unmatchedImageFiles.length }} görsel hiçbir satırla eşleşmedi:
          {{ unmatchedImageFiles.slice(0, 8).map((f) => f.name).join(', ') }}{{ unmatchedImageFiles.length > 8 ? ', ...' : '' }}
        </span>
      </div>

      <!-- Lot modunda menşei/tedarik taahhüdü zorunlu (parti bazında tek onay) -->
      <label v-if="isLotMode" class="warning-banner mt-4 guarantee-check">
        <input type="checkbox" v-model="guaranteeAccepted" />
        <span>
          Yüklenecek tüm ürünlerin MENŞEİ ve TEDARİK garantisini verdiğimi kabul,
          beyan ve taahhüt ederim.
        </span>
      </label>

      <!-- Satır ön kontrolü: başlıksız veya fiyatı geçersiz satırlar yüklenmeden elenir -->
      <div v-if="invalidRows.length > 0" class="warning-banner mt-4">
        <i class="pi pi-exclamation-triangle"></i>
        <span>
          {{ invalidRows.length }} satır hatalı — bunlar atlanacak.
          (Satır: {{ invalidRowNumbersLabel }})
        </span>
      </div>

      <div class="table-container mt-4">
        <table class="table w-full text-left">
          <thead>
            <tr>
              <th>Satır</th>
              <th>Başlık</th>
              <th>Fiyat</th>
              <th v-if="isLotMode">Açılış</th>
              <th v-if="isLotMode">Artış</th>
              <th v-if="isLotMode">Rezerv</th>
              <th v-if="isLotMode">Görsel</th>
              <th v-if="!isLotMode">Stok</th>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in previewRows"
              :key="row.rowNumber"
              :class="{ 'row-invalid': row.errors.length > 0 }"
            >
              <td>{{ row.rowNumber }}</td>
              <td>{{ row.title || 'Başlıksız' }}</td>
              <td>{{ row.priceText || '—' }}</td>
              <td v-if="isLotMode">{{ row.startPriceText || '—' }}</td>
              <td v-if="isLotMode">{{ row.minIncrementText || '—' }}</td>
              <td v-if="isLotMode">{{ row.reservePriceText || '—' }}</td>
              <td v-if="isLotMode">{{ imageMatchLabel(row) }}</td>
              <td v-if="!isLotMode">{{ row.stockQuantity }}</td>
              <td>
                <span v-if="row.errors.length > 0" class="badge danger">{{ row.errors.join(', ') }}</span>
                <span v-else class="badge warning">{{ isLotMode ? 'Onay Bekleyecek' : 'Taslak Bekliyor' }}</span>
              </td>
            </tr>
            <tr v-if="parsedRows.length > previewRows.length">
              <td :colspan="isLotMode ? 8 : 5" class="text-center py-4 text-secondary">
                ...ve {{ parsedRows.length - previewRows.length }} satır daha
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Yükleme sonucu paneli: alert() yerine inline özet + başarısız satır tablosu -->
    <div v-if="importResult" class="card mt-6">
      <h3 class="result-title">
        <i class="pi pi-check-circle success-icon"></i>
        {{ importResult.created }} {{ isLotMode ? 'lot' : 'ürün' }} oluşturuldu
      </h3>
      <p v-if="imageUploadSummary" class="mt-2">
        <i class="pi pi-images"></i>
        {{ imageUploadSummary.uploaded }} görsel yüklendi<template v-if="imageUploadSummary.failures.length > 0">,
          {{ imageUploadSummary.failures.length }} görsel başarısız</template>
      </p>
      <div v-if="imageUploadSummary && imageUploadSummary.failures.length > 0" class="table-container mt-4">
        <table class="table w-full text-left">
          <thead>
            <tr>
              <th>Satır</th>
              <th>Görsel</th>
              <th>Neden</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="failure in imageUploadSummary.failures" :key="`${failure.row}-${failure.file}`">
              <td>{{ failure.row }}</td>
              <td>{{ failure.file }}</td>
              <td>{{ failure.reason }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="importResult.failed.length > 0" class="mt-4">
        <p class="warning-banner">
          <i class="pi pi-exclamation-triangle"></i>
          <span>{{ importResult.failed.length }} satır yüklenemedi:</span>
        </p>
        <div class="table-container mt-4">
          <table class="table w-full text-left">
            <thead>
              <tr>
                <th>Satır</th>
                <th>Neden</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="failure in importResult.failed" :key="`${failure.row}-${failure.reason}`">
                <td>{{ failure.row }}</td>
                <td>{{ failure.reason }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-if="uploadError" class="card mt-6 error-card">
      <h3><i class="pi pi-times-circle"></i> Yükleme sırasında hata oluştu</h3>
      <p class="mt-2">{{ uploadError }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import * as XLSX from 'xlsx';
import { adminApi } from '../../services/api';

/** Ön kontrol edilmiş tek bir dosya satırı (rowNumber: Excel'deki gerçek satır no, başlık satırı = 1). */
interface ParsedRow {
  rowNumber: number;
  title: string;
  description: string;
  priceText: string;
  price: number;
  stockQuantity: number;
  // Lot modu alanları (?eventId= ile açılır): boşsa backend varsayılanı uygular.
  startPriceText: string;
  startPrice: number | null;
  minIncrementText: string;
  minIncrement: number | null;
  reservePriceText: string;
  reservePrice: number | null;
  // "Görseller" kolonundaki dosya adları (noktalı virgülle ayrılır).
  imageNames: string[];
  errors: string[];
}

// Lot modu: /products/bulk-import?eventId=<uuid> — ürün + lot tek adımda etkinliğe yüklenir.
const route = useRoute();
const lotEventId = computed(() =>
  typeof route.query.eventId === 'string' && route.query.eventId.length > 0
    ? route.query.eventId
    : null,
);
const isLotMode = computed(() => lotEventId.value !== null);
const guaranteeAccepted = ref(false);

// ─── Görsel eşleştirme (lot modu) ────────────────────────────
// Kullanıcı görselleri topluca seçer; satırlarla eşleşme "Görseller" kolonundaki
// dosya adlarıyla, kolon boşsa "satırNo-*.jpg" adlandırma kuralıyla yapılır.
const imageFiles = ref<File[]>([]);
const imageInput = ref<HTMLInputElement | null>(null);

const normalizeName = (name: string) => name.trim().toLocaleLowerCase('tr-TR');

const imageFileMap = computed(() => {
  const map = new Map<string, File>();
  for (const file of imageFiles.value) map.set(normalizeName(file.name), file);
  return map;
});

function addImageFiles(list: FileList | null | undefined) {
  if (!list) return;
  const incoming = Array.from(list).filter((file) => file.type.startsWith('image/'));
  // Aynı ada sahip dosya tekrar seçilirse yenisi eskisini ezer.
  const merged = new Map<string, File>();
  for (const file of imageFiles.value) merged.set(normalizeName(file.name), file);
  for (const file of incoming) merged.set(normalizeName(file.name), file);
  imageFiles.value = Array.from(merged.values());
}

function handleImageSelect(event: Event) {
  addImageFiles((event.target as HTMLInputElement).files);
}

function handleImageDrop(event: DragEvent) {
  addImageFiles(event.dataTransfer?.files);
}

/** Satıra ait görseller: kolonla eşleşenler + bulunamayan adlar (max 10). */
function matchedFilesForRow(row: ParsedRow): { files: File[]; missing: string[] } {
  if (row.imageNames.length > 0) {
    const files: File[] = [];
    const missing: string[] = [];
    for (const name of row.imageNames) {
      const file = imageFileMap.value.get(normalizeName(name));
      if (file) files.push(file);
      else missing.push(name);
    }
    return { files: files.slice(0, MAX_IMAGES_PER_PRODUCT), missing };
  }
  // Yedek kural: "5-1.jpg" → satır 5
  const prefix = `${row.rowNumber}-`;
  const files = imageFiles.value.filter((file) => normalizeName(file.name).startsWith(prefix));
  return { files: files.slice(0, MAX_IMAGES_PER_PRODUCT), missing: [] };
}

/** Hiçbir satıra eşleşmeyen görseller — yükleme öncesi uyarı için. */
const unmatchedImageFiles = computed(() => {
  const used = new Set<string>();
  for (const row of validRows.value) {
    for (const file of matchedFilesForRow(row).files) used.add(normalizeName(file.name));
  }
  return imageFiles.value.filter((file) => !used.has(normalizeName(file.name)));
});

function imageMatchLabel(row: ParsedRow): string {
  const { files, missing } = matchedFilesForRow(row);
  if (files.length === 0 && missing.length === 0) return '—';
  if (missing.length > 0) return `${files.length}/${files.length + missing.length} ⚠`;
  return String(files.length);
}

interface ImageUploadSummary {
  uploaded: number;
  failures: { row: number; file: string; reason: string }[];
}
const imageUploadSummary = ref<ImageUploadSummary | null>(null);

interface HeaderError {
  missing: string[];
  found: string[];
}

/** Backend yeni sözleşme: { created, failed: [{ row, reason }] }. Eski shape'te failed yoktur. */
interface ImportFailure {
  row: number;
  reason: string;
}

interface ImportResult {
  created: number;
  failed: ImportFailure[];
}

// Zorunlu sütunlar: farklı ad varyantları kabul edilir (Türkçe/İngilizce, büyük-küçük duyarsız)
const REQUIRED_COLUMNS = [
  { field: 'title', candidates: ['Başlık', 'Title'] },
  { field: 'price', candidates: ['Fiyat', 'Price'] },
] as const;
const OPTIONAL_COLUMNS = [
  { field: 'description', candidates: ['Açıklama', 'Description'] },
  { field: 'stockQuantity', candidates: ['Stok', 'Stock'] },
] as const;
// Lot moduna özgü isteğe bağlı sütunlar
const LOT_COLUMNS = [
  { field: 'startPrice', candidates: ['Açılış Fiyatı', 'Açılış', 'StartPrice', 'Start Price'] },
  { field: 'minIncrement', candidates: ['Artış', 'MinIncrement', 'Min Increment'] },
  { field: 'reservePrice', candidates: ['Rezerv', 'Rezerv Fiyat', 'ReservePrice', 'Reserve Price'] },
  { field: 'images', candidates: ['Görseller', 'Görsel', 'Images', 'Image'] },
] as const;

// Ürün başına görsel sınırı (backend POST /products/:id/images kuralı).
const MAX_IMAGES_PER_PRODUCT = 10;
const PREVIEW_ROW_LIMIT = 10;
const INVALID_ROW_LABEL_LIMIT = 20;

const fileInput = ref<HTMLInputElement | null>(null);
const parsedRows = ref<ParsedRow[]>([]);
const headerError = ref<HeaderError | null>(null);
const emptyFileNotice = ref<string | null>(null);
const importResult = ref<ImportResult | null>(null);
const uploadError = ref<string | null>(null);
const isUploading = ref(false);

const validRows = computed(() => parsedRows.value.filter((row) => row.errors.length === 0));
const invalidRows = computed(() => parsedRows.value.filter((row) => row.errors.length > 0));
const previewRows = computed(() => parsedRows.value.slice(0, PREVIEW_ROW_LIMIT));

// Önizleme yalnızca ilk 10 satırı gösterdiği için hatalı satır numaraları ayrıca listelenir
const invalidRowNumbersLabel = computed(() => {
  const numbers = invalidRows.value.map((row) => row.rowNumber);
  const visible = numbers.slice(0, INVALID_ROW_LABEL_LIMIT).join(', ');
  return numbers.length > INVALID_ROW_LABEL_LIMIT ? `${visible}, ...` : visible;
});

function handleDrop(event: DragEvent) {
  const file = event.dataTransfer?.files[0];
  if (file) parseFile(file);
}

function handleFileSelect(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) parseFile(file);
}

/** Aday isimlerden birine (trim + büyük-küçük duyarsız) eşleşen sütunun index'ini döner. */
function findColumnIndex(headers: string[], candidates: readonly string[]): number {
  return headers.findIndex((header) =>
    candidates.some((candidate) => candidate.toLocaleLowerCase('tr-TR') === header.toLocaleLowerCase('tr-TR')),
  );
}

function parseFile(file: File) {
  const reader = new FileReader();
  reader.onload = (e) => {
    parsedRows.value = [];
    headerError.value = null;
    emptyFileNotice.value = null;
    importResult.value = null;
    uploadError.value = null;

    const data = e.target?.result;
    const workbook = XLSX.read(data, { type: 'binary' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // header:1 → ham satır dizileri; böylece hem gerçek başlık satırını doğrulayabiliyor
    // hem de Excel satır numarasını (index + 1) kaybetmeden ön kontrol yapabiliyoruz.
    const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      defval: '',
      blankrows: true,
    });

    const foundHeaders = (rows[0] ?? [])
      .map((cell) => String(cell ?? '').trim())
      .filter((header) => header.length > 0);

    // Yükleme öncesi başlık doğrulaması: zorunlu sütunlardan biri yoksa upload bloklanır
    const missing = REQUIRED_COLUMNS
      .filter((column) => findColumnIndex(foundHeaders, column.candidates) === -1)
      .map((column) => column.candidates.join(' / '));
    if (missing.length > 0) {
      headerError.value = { missing, found: foundHeaders };
      return;
    }

    const headerRow = (rows[0] ?? []).map((cell) => String(cell ?? '').trim());
    const titleIdx = findColumnIndex(headerRow, REQUIRED_COLUMNS[0].candidates);
    const priceIdx = findColumnIndex(headerRow, REQUIRED_COLUMNS[1].candidates);
    const descriptionIdx = findColumnIndex(headerRow, OPTIONAL_COLUMNS[0].candidates);
    const stockIdx = findColumnIndex(headerRow, OPTIONAL_COLUMNS[1].candidates);
    const startPriceIdx = findColumnIndex(headerRow, LOT_COLUMNS[0].candidates);
    const minIncrementIdx = findColumnIndex(headerRow, LOT_COLUMNS[1].candidates);
    const reservePriceIdx = findColumnIndex(headerRow, LOT_COLUMNS[2].candidates);
    const imagesIdx = findColumnIndex(headerRow, LOT_COLUMNS[3].candidates);

    /** "12,50" → 12.5; boş/eksik hücre → null. */
    const parseOptionalNumber = (idx: number, cells: unknown[]): { text: string; value: number | null } => {
      const text = String(idx >= 0 ? cells[idx] ?? '' : '').trim();
      if (text.length === 0) return { text: '', value: null };
      const value = Number(text.replace(',', '.'));
      return { text, value: Number.isFinite(value) ? value : null };
    };

    const result: ParsedRow[] = [];
    for (let i = 1; i < rows.length; i += 1) {
      const cells = rows[i] ?? [];
      // Tamamen boş satırları atla (ama satır numarası kaymasın diye index'ten hesaplıyoruz)
      if (cells.every((cell) => String(cell ?? '').trim().length === 0)) continue;

      const title = String(cells[titleIdx] ?? '').trim();
      const priceText = String(cells[priceIdx] ?? '').trim();
      // Türkçe ondalık ayracı (virgül) desteklenir: "12,50" → 12.50
      const price = priceText.length > 0 ? Number(priceText.replace(',', '.')) : Number.NaN;
      const stockText = String(stockIdx >= 0 ? cells[stockIdx] ?? '' : '').trim();
      const stockParsed = Number.parseInt(stockText, 10);

      const startPriceParsed = parseOptionalNumber(startPriceIdx, cells);
      const minIncrementParsed = parseOptionalNumber(minIncrementIdx, cells);
      const reservePriceParsed = parseOptionalNumber(reservePriceIdx, cells);

      const errors: string[] = [];
      if (title.length === 0) errors.push('Başlık boş');
      if (priceText.length === 0 || !Number.isFinite(price)) errors.push('Fiyat boş veya sayısal değil');
      if (isLotMode.value) {
        if (startPriceParsed.text.length > 0 && startPriceParsed.value === null) {
          errors.push('Açılış fiyatı sayısal değil');
        }
        if (minIncrementParsed.text.length > 0 && minIncrementParsed.value === null) {
          errors.push('Artış sayısal değil');
        }
        if (reservePriceParsed.text.length > 0 && reservePriceParsed.value === null) {
          errors.push('Rezerv sayısal değil');
        }
      }

      result.push({
        rowNumber: i + 1,
        title,
        description: String(descriptionIdx >= 0 ? cells[descriptionIdx] ?? '' : '').trim(),
        priceText,
        price: Number.isFinite(price) ? price : 0,
        stockQuantity: Number.isFinite(stockParsed) ? stockParsed : 0,
        startPriceText: startPriceParsed.text,
        startPrice: startPriceParsed.value,
        minIncrementText: minIncrementParsed.text,
        minIncrement: minIncrementParsed.value,
        reservePriceText: reservePriceParsed.text,
        reservePrice: reservePriceParsed.value,
        imageNames: String(imagesIdx >= 0 ? cells[imagesIdx] ?? '' : '')
          .split(';')
          .map((name) => name.trim())
          .filter((name) => name.length > 0),
        errors,
      });
    }
    parsedRows.value = result;
    if (result.length === 0) {
      emptyFileNotice.value = 'Dosyada veri satırı bulunamadı (yalnızca başlık satırı veya boş satırlar var).';
    }
  };
  reader.readAsBinaryString(file);
}

async function uploadToBackend() {
  if (validRows.value.length === 0) return;
  isUploading.value = true;
  importResult.value = null;
  uploadError.value = null;
  imageUploadSummary.value = null;

  try {
    // Lot modu: ürün + lot tek adımda etkinliğe; normal mod: sadece ürün taslağı.
    const response = isLotMode.value
      ? await adminApi.post(`/auctions/events/${lotEventId.value}/lots/bulk`, {
          guaranteeAccepted: guaranteeAccepted.value,
          lots: validRows.value.map((row) => ({
            title: row.title,
            description: row.description,
            price: row.price,
            stockQuantity: row.stockQuantity,
            ...(row.startPrice !== null ? { startPrice: row.startPrice } : {}),
            ...(row.minIncrement !== null ? { minIncrement: row.minIncrement } : {}),
            ...(row.reservePrice !== null ? { reservePrice: row.reservePrice } : {}),
          })),
        })
      : await adminApi.post('/products/bulk-import', {
          products: validRows.value.map((row) => ({
            title: row.title,
            description: row.description,
            price: row.price,
            stockQuantity: row.stockQuantity,
          })),
        });

    const payload = response.data as Record<string, unknown>;

    // Lot modu: oluşturulan ürünlere eşleşen görselleri sırayla yükle.
    if (isLotMode.value && Array.isArray(payload.createdLots)) {
      const failures: ImageUploadSummary['failures'] = [];
      let uploaded = 0;
      for (const lot of payload.createdLots as { row: number; productId: string }[]) {
        const sourceRow = validRows.value[Number(lot.row) - 1];
        if (!sourceRow || !lot.productId) continue;
        const { files } = matchedFilesForRow(sourceRow);
        for (const file of files) {
          try {
            const formData = new FormData();
            formData.append('file', file);
            await adminApi.post(`/products/${lot.productId}/images`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            uploaded++;
          } catch (imageError: unknown) {
            const axiosError = imageError as { response?: { data?: { message?: string } }; message?: string };
            failures.push({
              row: sourceRow.rowNumber,
              file: file.name,
              reason: axiosError.response?.data?.message || axiosError.message || 'Bilinmeyen hata',
            });
          }
        }
      }
      imageUploadSummary.value = { uploaded, failures };
      imageFiles.value = [];
    }

    if (Array.isArray(payload.failed)) {
      // Yeni backend sözleşmesi: { created, failed: [{ row, reason }] }.
      // Backend'in row'u gönderilen payload'daki 1-tabanlı sıradır; geçersiz satırlar
      // upload öncesi elendiği için Excel satır numarasına çevrilmesi gerekir.
      const sentRows = validRows.value;
      importResult.value = {
        created: typeof payload.created === 'number' ? payload.created : 0,
        failed: (payload.failed as ImportFailure[]).map((failure) => ({
          row: sentRows[Number(failure.row) - 1]?.rowNumber ?? Number(failure.row),
          reason: String(failure.reason ?? 'Bilinmeyen hata'),
        })),
      };
    } else {
      // Eski shape (failed alanı yok): importedCount tabanlı özet ile geriye uyumlu davran
      const legacyCount =
        typeof payload.importedCount === 'number'
          ? payload.importedCount
          : typeof payload.created === 'number'
            ? payload.created
            : validRows.value.length;
      importResult.value = { created: legacyCount, failed: [] };
    }
    parsedRows.value = [];
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
    uploadError.value = axiosError.response?.data?.message || axiosError.message || 'Bilinmeyen hata';
  } finally {
    isUploading.value = false;
  }
}
</script>

<style scoped>
.import-card { padding: 2rem; }
.import-dropzone {
  border: 2px dashed var(--color-border);
  border-radius: 12px;
  padding: 4rem 2rem;
  text-align: center;
  background-color: var(--color-surface-soft);
  transition: all 0.3s ease;
}
.import-dropzone:hover {
  border-color: var(--color-primary);
  background-color: var(--color-primary-soft);
}
.upload-icon {
  font-size: 3rem;
  color: var(--color-text-secondary);
  margin-bottom: 1rem;
}
.hidden-input { display: none; }
.error-card {
  padding: 1.5rem;
  border-left: 4px solid var(--danger-500);
}
.error-card h3 { color: var(--danger-500); }
.error-list { padding-left: 1.25rem; }
.header-chip { margin-right: 6px; }
.warning-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background-color: var(--warn-100);
  color: var(--warn-500);
}
.row-invalid {
  background-color: var(--danger-100);
}
.result-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.success-icon { color: var(--brand-500); }
.flex { display: flex; }
.justify-between { justify-content: space-between; }
.align-center { align-items: center; }
.w-full { width: 100%; }
.text-left { text-align: left; }
.text-center { text-align: center; }
.py-4 { padding-top: 1rem; padding-bottom: 1rem; }
.mt-2 { margin-top: 0.5rem; }
.mt-4 { margin-top: 1rem; }
.mt-6 { margin-top: 2rem; }
.guarantee-check {
  display: flex;
  gap: 8px;
  align-items: center;
  cursor: pointer;
}
.guarantee-check input { flex-shrink: 0; }
</style>
