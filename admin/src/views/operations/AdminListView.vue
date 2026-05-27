<template>
  <section class="field-grid">
    <header class="page-header">
      <div>
        <h1>{{ title }}</h1>
        <p>{{ readOnly ? 'Salt okunur operasyon listesi' : 'Kontrollü yönetici işlemleri' }}</p>
      </div>
      <button
        v-if="resource === 'users'"
        class="button primary"
        type="button"
        @click="openAction(createMemberAction)"
      >
        <i class="pi pi-plus" aria-hidden="true" />
        Yeni üye ekle
      </button>
      <button
        v-if="resource === 'categories'"
        class="button primary"
        type="button"
        @click="openAction(createCategoryAction)"
      >
        <i class="pi pi-plus" aria-hidden="true" />
        Yeni kategori
      </button>
      <button
        v-if="resource === 'products'"
        class="button primary"
        type="button"
        @click="goToProductCreate"
      >
        <i class="pi pi-plus" aria-hidden="true" />
        Yeni ürün
      </button>
      <button
        v-if="resource === 'brands'"
        class="button primary"
        type="button"
        @click="openAction(createBrandAction)"
      >
        <i class="pi pi-plus" aria-hidden="true" />
        Yeni marka
      </button>
    </header>

    <AdminDataTable
      :columns="columns"
      :rows="displayedRows"
      :loading="loading"
      :pagination="displayedPagination"
      :filters="filters"
      :actions="rowActions"
      @page="setPage"
      @filter="setFilters"
      @action="openAction"
      @row-click="goToDetail"
      @tree-toggle="toggleCategoryTree"
    >
      <template #toolbar>
        <div class="toolbar">
          <button class="button ghost" type="button" @click="loadRows">
            <i class="pi pi-refresh" aria-hidden="true" />
            Yenile
          </button>
        </div>
      </template>
    </AdminDataTable>

    <p v-if="error" class="error-text">{{ error }}</p>

    <AdminDrawerForm
      :open="drawerOpen"
      :title="drawerTitle"
      :fields="drawerFields"
      :reason-required="true"
      :confirm-label="drawerConfirmLabel"
      :presentation="drawerPresentation"
      :page-size="drawerPageSize"
      @close="closeDrawer"
      @confirm="confirmAction"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import AdminDrawerForm, {
  type DrawerConfirmPayload,
  type DrawerField,
} from '../../components/AdminDrawerForm.vue';
import AdminDataTable, {
  type AdminColumn,
  type AdminFilter,
  type AdminPagination,
  type AdminTableAction,
} from '../../components/AdminDataTable.vue';
import { adminApi, toApiMessage, type ApiListResponse } from '../../services/api';

type ActionMethod = 'delete' | 'patch' | 'post';
type MemberType = 'ADMIN' | 'SELLER' | 'SUPPLIER' | 'CUSTOMER';

interface ActionConfig extends AdminTableAction {
  method: ActionMethod;
  path: (id: string | null) => string;
  fields?: (row: Record<string, unknown> | null) => DrawerField[];
  confirmLabel?: string;
  presentation?: 'drawer' | 'modal';
  pageSize?: number;
}

interface ResourceConfig {
  columns: AdminColumn[];
  actions: ActionConfig[];
  detailBase?: string;
}

const props = withDefaults(
  defineProps<{
    resource: string;
    title: string;
    endpoint?: string;
    readOnly?: boolean;
  }>(),
  {
    endpoint: undefined,
    readOnly: false,
  },
);

const router = useRouter();
const rows = ref<Record<string, unknown>[]>([]);
const categoryParentOptions = ref<{ label: string; value: string }[]>([]);
const variationOptions = ref<{ label: string; value: string; kind?: string }[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const activeFilters = ref<Record<string, string>>({});
const pagination = ref<AdminPagination>({ page: 1, limit: 25, total: 0 });
const collapsedCategoryIds = ref<Set<string>>(new Set());
const drawerOpen = ref(false);
const selectedRow = ref<Record<string, unknown> | null>(null);
const selectedAction = ref<ActionConfig | null>(null);
let categoryRequestInFlight: Promise<Record<string, unknown>[]> | null = null;

const categoryFields = (row: Record<string, unknown> | null): DrawerField[] => [
  { key: 'name', label: 'Ad', required: true, value: getString(row, 'name') },
  { key: 'slug', label: 'Kısa ad', value: getString(row, 'slug') },
  { key: 'description', label: 'Açıklama', type: 'textarea', value: getString(row, 'description') },
  { key: 'imageUrl', label: 'Görsel URL', value: getString(row, 'imageUrl') },
  {
    key: 'parentId',
    label: 'Üst kategori',
    type: 'select',
    value: getString(row, 'parentId'),
    options: categoryParentOptions.value,
  },
  {
    key: 'isCommunicationEnabled',
    label: 'İletişim Aktif mi?',
    type: 'select',
    value: getCategoryCommunicationEnabled(row),
    options: [
      { label: 'Evet (Alıcı ve satıcı mesajlaşabilir)', value: 'true' },
      { label: 'Hayır (Mesajlaşma kapalı)', value: 'false' },
    ],
  },
  { key: 'sortOrder', label: 'Sıralama', type: 'number', value: getString(row, 'sortOrder') },
  {
    key: 'variationOptionIds',
    label: 'Bağlı varyasyonlar',
    type: 'multiselect',
    value: getCategoryVariationOptionIds(row),
    options: variationOptions.value,
  },
];

const brandFields = (row: Record<string, unknown> | null): DrawerField[] => [
  { key: 'name', label: 'Marka adı', required: true, value: getString(row, 'name') },
  { key: 'slug', label: 'SeoLink', value: getString(row, 'slug') },
  {
    key: 'isActive',
    label: 'Durum',
    type: 'select',
    value: getString(row, 'isActive') || 'true',
    options: [
      { label: 'Aktif', value: 'true' },
      { label: 'Pasif', value: 'false' },
    ],
  },
];

const memberTypeOptions: { label: string; value: MemberType }[] = [
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Satıcı', value: 'SELLER' },
  { label: 'Tedarikçi', value: 'SUPPLIER' },
  { label: 'Müşteri', value: 'CUSTOMER' },
];

const memberFields = (row: Record<string, unknown> | null): DrawerField[] => [
  { key: 'email', label: 'E-posta', required: true, value: getString(row, 'email') },
  { key: 'password', label: 'Geçici şifre', required: true, value: '' },
  { key: 'firstName', label: 'Ad', value: getString(row, 'firstName') },
  { key: 'lastName', label: 'Soyad', value: getString(row, 'lastName') },
  {
    key: 'memberType',
    label: 'Üye tipi',
    type: 'select',
    required: true,
    value: (getString(row, 'memberType') as MemberType) || 'CUSTOMER',
    options: memberTypeOptions,
  },
];

const sellerStatusOptions = [
  { label: 'Beklemede', value: 'PENDING' },
  { label: 'Onaylandı', value: 'APPROVED' },
  { label: 'Askıda', value: 'SUSPENDED' },
  { label: 'Sonlandırıldı', value: 'TERMINATED' },
];

const sellerFields = (row: Record<string, unknown> | null): DrawerField[] => [
  { key: 'businessName', label: 'Mağaza / İşletme Adı', required: true, value: getString(row, 'businessName') },
  { key: 'phone', label: 'Telefon', value: getString(row, 'phone') },
  { key: 'taxOffice', label: 'Vergi Dairesi', value: getString(row, 'taxOffice') },
  { key: 'taxNumber', label: 'Vergi Numarası', value: getString(row, 'taxNumber') },
  { key: 'commissionRate', label: 'Komisyon Oranı', type: 'number', value: getString(row, 'commissionRate') },
  {
    key: 'status',
    label: 'Durum',
    type: 'select',
    value: getString(row, 'status') || 'PENDING',
    options: sellerStatusOptions,
  },
];

const productionSeasonOptions = [
  { label: 'Her zaman', value: 'ALL_TIME' },
  { label: 'İlkbahar', value: 'SPRING' },
  { label: 'Yaz', value: 'SUMMER' },
  { label: 'Sonbahar', value: 'AUTUMN' },
  { label: 'Kış', value: 'WINTER' },
];

const statusOptions = [
  { label: 'Taslak', value: 'DRAFT' },
  { label: 'İnceleme', value: 'PENDING_REVIEW' },
  { label: 'Aktif', value: 'ACTIVE' },
  { label: 'Müzayedede', value: 'UNDER_AUCTION' },
  { label: 'Satıldı', value: 'SOLD' },
  { label: 'Stok Yok', value: 'OUT_OF_STOCK' },
  { label: 'Arşiv', value: 'ARCHIVED' },
  { label: 'Askıda', value: 'SUSPENDED' },
];

const yesNoOptions = [
  { label: 'Evet', value: 'true' },
  { label: 'Hayır', value: 'false' },
];

const productFields = (row: Record<string, unknown> | null): DrawerField[] => {
  const extra = parseProductExtendedContent(getString(row, 'additionalCertificates'));
  return [
    { key: 'sellerId', label: 'Satıcı ID', required: true, value: getString(row, 'sellerId') },
    { key: 'title', label: 'Ürün Adı', required: true, value: getString(row, 'title') },
    { key: 'description', label: 'Açıklama', type: 'textarea', value: getString(row, 'description') },
    { key: 'price', label: 'Fiyat', type: 'number', required: true, value: getString(row, 'price') },
    { key: 'stockQuantity', label: 'Stok', type: 'number', value: getString(row, 'stockQuantity') },
    { key: 'sku', label: 'Ürün Kodu / SKU', value: getString(row, 'sku') },
    { key: 'barcodeNo', label: 'GTIN / Barkod', value: getString(row, 'barcodeNo') },
    { key: 'brand', label: 'Marka', value: getString(row, 'brand') },
    { key: 'categoryId', label: 'Kategori ID', value: getString(row, 'categoryId') },
    {
      key: 'status',
      label: 'Ürün Durumu',
      type: 'select',
      value: getString(row, 'status'),
      options: statusOptions,
    },
    {
      key: 'isEndemigoBrandCandidate',
      label: 'Endemigo markasıyla satılsın mı?',
      type: 'select',
      value: toBooleanString(row?.isEndemigoBrandCandidate),
      options: yesNoOptions,
    },
    { key: 'productContent', label: 'Ürün İçeriği', type: 'textarea', value: getString(row, 'productContent') },
    { key: 'sellerNotes', label: 'Satıcı Notları', type: 'textarea', value: getString(row, 'sellerNotes') },
    { key: 'geoIndicationCertNo', label: 'Coğrafi İşaret Sertifika No', value: getString(row, 'geoIndicationCertNo') },
    { key: 'geoIndicationRegion', label: 'Coğrafi İşaret Bölgesi', value: getString(row, 'geoIndicationRegion') },
    { key: 'geoIndicationReceivedAt', label: 'Coğrafi İşaret Tarihi', type: 'date', value: getString(row, 'geoIndicationReceivedAt') },
    { key: 'originCountry', label: 'Menşei Ülke', value: getString(row, 'originCountry') || 'TR' },
    { key: 'originRegion', label: 'Menşei Bölge', value: getString(row, 'originRegion') },
    { key: 'productionProvince', label: 'Üretim İl', value: getString(row, 'productionProvince') },
    { key: 'productionDistrict', label: 'Üretim İlçe', value: getString(row, 'productionDistrict') },
    {
      key: 'productionSeason',
      label: 'Üretim Dönemi',
      type: 'select',
      value: getString(row, 'productionSeason') || 'ALL_TIME',
      options: productionSeasonOptions,
    },
    { key: 'salesMonths', label: 'Satış Ayları (1,2,3...)', value: normalizeSalesMonths(row?.salesMonths) },
    { key: 'wholesalePrice', label: 'Toptan Fiyat', type: 'number', value: getString(row, 'wholesalePrice') },
    { key: 'retailPrice', label: 'Perakende Fiyat', type: 'number', value: getString(row, 'retailPrice') },
    { key: 'askPriceMinAmount', label: 'Pazarlık Min Tutar', type: 'number', value: getString(row, 'askPriceMinAmount') },
    {
      key: 'askPriceEnabled',
      label: 'Pazarlık aktif mi?',
      type: 'select',
      value: toBooleanString(row?.askPriceEnabled),
      options: yesNoOptions,
    },
    { key: 'shippingProvince', label: 'Teslimat İl', value: getString(row, 'shippingProvince') },
    { key: 'shippingDistrict', label: 'Teslimat İlçe', value: getString(row, 'shippingDistrict') },
    { key: 'shippingAddress', label: 'Teslimat Adresi', type: 'textarea', value: getString(row, 'shippingAddress') },
    { key: 'productImageUrls', label: 'Ürün Görselleri (satır satır URL)', type: 'textarea', value: listToMultiline(row?.images, 'url') || getString(row, 'imageUrl') },
    { key: 'certificateNotes', label: 'Sertifika Notları', type: 'textarea', value: extra.notes },
    { key: 'certificateImageUrls', label: 'Sertifika Görselleri (satır satır URL)', type: 'textarea', value: extra.certificateImageUrls.join('\n') },
    { key: 'deliveryLocations', label: 'Teslimat Yerleri (satır satır)', type: 'textarea', value: extra.deliveryLocations.join('\n') },
  ];
};

const createCategoryAction: ActionConfig = {
  key: 'createCategory',
  label: 'Oluştur',
  icon: 'pi pi-plus',
  tone: 'primary',
  method: 'post',
  path: () => '/admin/categories',
  fields: categoryFields,
  confirmLabel: 'Kategori oluştur',
  presentation: 'modal',
};

const createBrandAction: ActionConfig = {
  key: 'createBrand',
  label: 'Oluştur',
  icon: 'pi pi-plus',
  tone: 'primary',
  method: 'post',
  path: () => '/admin/brands',
  fields: brandFields,
  confirmLabel: 'Marka oluştur',
  presentation: 'modal',
};

const createMemberAction: ActionConfig = {
  key: 'createMember',
  label: 'Üye ekle',
  icon: 'pi pi-user-plus',
  tone: 'primary',
  method: 'post',
  path: () => '/admin/users',
  fields: memberFields,
  confirmLabel: 'Üye oluştur',
  presentation: 'modal',
};

const resourceConfigs: Record<string, ResourceConfig> = {
  users: {
    detailBase: 'users',
    columns: [
      { key: 'fullName', label: 'İsim', route: (row) => `/users/${String(row.id ?? '')}` },
      { key: 'email', label: 'E-posta' },
      { key: 'memberType', label: 'Üye Tipi', format: 'status' },
      { key: 'isActive', label: 'Aktif', format: 'status' },
      { key: 'createdAt', label: 'Oluşturuldu', format: 'date' },
    ],
    actions: [],
  },
  sellers: {
    detailBase: 'sellers',
    columns: [
      { key: 'businessName', label: 'Kullanıcı', route: (row) => `/users/${String(row.userId ?? '')}` },
      { key: 'status', label: 'Durum', format: 'status' },
      { key: 'approvedAt', label: 'Onaylandı', format: 'date' },
      { key: 'createdAt', label: 'Oluşturuldu', format: 'date' },
    ],
    actions: [],
  },
  products: {
    detailBase: 'products',
    columns: [
      { key: 'title', label: 'Başlık', route: (row) => `/products/${String(row.id ?? '')}` },
      { key: 'price', label: 'Fiyat', format: 'money' },
      { key: 'status', label: 'Durum', format: 'status' },
      { key: 'sellerName', label: 'Satıcı', route: (row) => `/sellers/${String(row.sellerId ?? '')}` },
      { key: 'createdAt', label: 'Oluşturuldu', format: 'date' },
    ],
    actions: [
      {
        key: 'editProduct',
        label: 'Düzenle',
        icon: 'pi pi-pencil',
        tone: 'primary',
        iconOnly: true,
        method: 'patch',
        path: (id) => `/admin/products/${id}`,
      },
      {
        key: 'remove',
        label: 'Kaldır',
        icon: 'pi pi-trash',
        tone: 'danger',
        iconOnly: true,
        method: 'patch',
        path: (id) => `/admin/products/${id}/remove`,
      },
    ],
  },
  categories: {
    detailBase: 'categories',
    columns: [
      { key: 'categoryTreeLabel', label: 'Kategori Ağacı', format: 'tree' },
      { key: 'categoryVariationsSummary', label: 'Varyasyonlar' },
      { key: 'isActive', label: 'Aktif' },
      { key: 'createdAt', label: 'Oluşturuldu', format: 'date' },
    ],
    actions: [
      {
        key: 'updateCategory',
        label: 'Güncelle',
        icon: 'pi pi-pencil',
        method: 'patch',
        path: (id) => `/admin/categories/${id}`,
        fields: categoryFields,
        confirmLabel: 'Kategori güncelle',
        presentation: 'modal',
      },
    ],
  },
  brands: {
    detailBase: 'brands',
    columns: [
      { key: 'name', label: 'Marka adı' },
      { key: 'slug', label: 'SeoLink' },
      { key: 'isActive', label: 'Durum' },
      { key: 'createdAt', label: 'Oluşturuldu', format: 'date' },
    ],
    actions: [
      {
        key: 'updateBrand',
        label: 'Güncelle',
        icon: 'pi pi-pencil',
        method: 'patch',
        path: (id) => `/admin/brands/${id}`,
        fields: brandFields,
        confirmLabel: 'Marka güncelle',
      },
      {
        key: 'deleteBrand',
        label: 'Devre dışı bırak',
        icon: 'pi pi-trash',
        tone: 'danger',
        method: 'delete',
        path: (id) => `/admin/brands/${id}`,
        confirmLabel: 'Marka devre dışı bırak',
      },
    ],
  },
  auctions: {
    detailBase: 'auctions',
    columns: [
      { key: 'productTitle', label: 'Ürün', route: (row) => `/products/${String(row.productId ?? '')}` },
      { key: 'status', label: 'Durum', format: 'status' },
      { key: 'currentPrice', label: 'Anlık Fiyat', format: 'money' },
      { key: 'reservePriceLabel', label: 'Reserve' },
      { key: 'reserveStatusLabel', label: 'Reserve Durumu' },
      { key: 'bidCount', label: 'Teklif' },
      { key: 'endTime', label: 'Bitiş zamanı', format: 'date' },
      { key: 'createdAt', label: 'Oluşturuldu', format: 'date' },
    ],
    actions: [
      {
        key: 'cancel',
        label: 'İptal et',
        icon: 'pi pi-stop-circle',
        tone: 'danger',
        method: 'patch',
        path: (id) => `/admin/auctions/${id}/cancel`,
      },
    ],
  },
  orders: {
    detailBase: 'orders',
    columns: [
      { key: 'buyerId', label: 'Alıcı', format: 'id' },
      { key: 'sellerId', label: 'Satıcı', format: 'id' },
      { key: 'status', label: 'Durum', format: 'status' },
      { key: 'amount', label: 'Tutar', format: 'money' },
    ],
    actions: [
      {
        key: 'adminReview',
        label: 'İncele',
        icon: 'pi pi-eye',
        method: 'patch',
        path: (id) => `/admin/orders/${id}/admin-review`,
      },
    ],
  },
  payments: {
    detailBase: 'payments',
    columns: [
      { key: 'orderId', label: 'Sipariş', format: 'id' },
      { key: 'status', label: 'Durum', format: 'status' },
      { key: 'amount', label: 'Tutar', format: 'money' },
      { key: 'createdAt', label: 'Oluşturuldu', format: 'date' },
    ],
    actions: [
      {
        key: 'adminReview',
        label: 'İncele',
        icon: 'pi pi-eye',
        method: 'patch',
        path: (id) => `/admin/payments/${id}/admin-review`,
      },
    ],
  },
  bids: {
    detailBase: 'bids',
    columns: [
      { key: 'auctionLabel', label: 'Müzayede', route: (row) => `/bids/${String(row.id ?? '')}` },
      { key: 'sellerName', label: 'Satıcı' },
      { key: 'auctionStatus', label: 'Durum', format: 'status' },
      { key: 'reserveStatusLabel', label: 'Reserve' },
      { key: 'totalBidCount', label: 'Teklif' },
      { key: 'uniqueBidderCount', label: 'Katılımcı' },
      { key: 'highestBidAmount', label: 'En Yüksek Teklif', format: 'money' },
      { key: 'lastBidAt', label: 'Son Teklif', format: 'date' },
    ],
    actions: [],
  },
  negotiations: {
    detailBase: 'negotiations',
    columns: [
      { key: 'idShort', label: 'Sohbet No', route: (row) => `/negotiations/${String(row.id ?? '')}` },
      { key: 'productTitle', label: 'Ürün', route: (row) => `/products/${String(row.productId ?? '')}` },
      { key: 'buyerName', label: 'Alıcı', route: (row) => `/users/${String(row.buyerId ?? '')}` },
      { key: 'sellerName', label: 'Satıcı', route: (row) => `/sellers/${String(row.sellerId ?? '')}` },
      { key: 'status', label: 'Durum', format: 'status' },
      { key: 'violationLabel', label: 'AI Uyarı' },
      { key: 'updatedAt', label: 'Son İşlem', format: 'date' },
    ],
    actions: [],
  },
  'audit-logs': {
    detailBase: 'audit',
    columns: [
      { key: 'actionLabel', label: 'İşlem', route: (row) => `/audit/${String(row.id ?? '')}` },
      {
        key: 'targetLabel',
        label: 'Hedef',
        route: (row) => auditTargetRoute(getString(row, 'targetType'), getString(row, 'targetId')),
      },
      { key: 'targetIdShort', label: 'Kayıt No' },
      { key: 'actorLabel', label: 'Yapan' },
      { key: 'reasonText', label: 'Sebep' },
      { key: 'createdAt', label: 'Tarih', format: 'date' },
    ],
    actions: [],
  },
  'payout-requests': {
    detailBase: 'payouts',
    columns: [
      { key: 'sellerId', label: 'Satıcı', format: 'id' },
      { key: 'status', label: 'Durum', format: 'status' },
      { key: 'amount', label: 'Tutar', format: 'money' },
      { key: 'createdAt', label: 'Oluşturuldu', format: 'date' },
    ],
    actions: [
      {
        key: 'approve',
        label: 'Onayla',
        icon: 'pi pi-check',
        tone: 'primary',
        method: 'patch',
        path: (id) => `/admin/payout-requests/${id}/approve`,
      },
      {
        key: 'reject',
        label: 'Reddet',
        icon: 'pi pi-times',
        tone: 'danger',
        method: 'patch',
        path: (id) => `/admin/payout-requests/${id}/reject`,
      },
    ],
  },
};

const fallbackConfig: ResourceConfig = {
  columns: [
    { key: 'id', label: 'ID' },
    { key: 'status', label: 'Durum', format: 'status' },
    { key: 'createdAt', label: 'Oluşturuldu', format: 'date' },
  ],
  actions: [],
};

const endpoint = computed(() => props.endpoint ?? `/admin/${props.resource}`);
const config = computed(() => resourceConfigs[props.resource] ?? fallbackConfig);
const columns = computed(() => config.value.columns);
const rowActions = computed(() => (props.readOnly ? [] : config.value.actions));
const displayedRows = computed(() => {
  if (props.resource === 'categories') {
    return rows.value.filter((row) => !hasCollapsedAncestor(row));
  }
  if (props.resource !== 'users') return rows.value;
  const memberType = activeFilters.value.memberType?.toUpperCase();
  if (!memberType) return rows.value;
  return rows.value.filter((row) => resolveMemberType(row) === memberType);
});
const displayedPagination = computed<AdminPagination>(() => {
  if (props.resource === 'categories') {
    return {
      ...pagination.value,
      total: displayedRows.value.length,
      limit: Math.max(displayedRows.value.length, 1),
    };
  }
  if (props.resource !== 'users' || !activeFilters.value.memberType) return pagination.value;
  return {
    ...pagination.value,
    total: displayedRows.value.length,
  };
});
const filters = computed<AdminFilter[]>(() => {
  if (props.resource === 'users') {
    return [
      { key: 'q', label: 'Arama', type: 'search', value: activeFilters.value.q ?? '' },
      {
        key: 'memberType',
        label: 'Üye Tipi',
        type: 'select',
        value: activeFilters.value.memberType ?? '',
        options: memberTypeOptions,
      },
    ];
  }
  return [
    { key: 'q', label: 'Arama', type: 'search', value: activeFilters.value.q ?? '' },
    {
      key: 'status',
      label: 'Durum',
      type: 'select',
      value: activeFilters.value.status ?? '',
      options: [
        { label: 'Bekleyen', value: 'PENDING' },
        { label: 'Onaylandı', value: 'APPROVED' },
        { label: 'Reddedildi', value: 'REJECTED' },
        { label: 'Yönetici incelemesi', value: 'ADMIN_REVIEW' },
        { label: 'Aktif', value: 'ACTIVE' },
      ],
    },
  ];
});
const drawerTitle = computed(() => selectedAction.value?.label ?? 'Yönetici işlemi');
const drawerFields = computed(() => selectedAction.value?.fields?.(selectedRow.value) ?? []);
const drawerConfirmLabel = computed(() => selectedAction.value?.confirmLabel ?? 'Onayla');
const drawerPresentation = computed(() => selectedAction.value?.presentation ?? 'drawer');
const drawerPageSize = computed(() => selectedAction.value?.pageSize ?? 0);

function getString(row: Record<string, unknown> | null, key: string): string {
  const value = row?.[key];
  return value === null || value === undefined ? '' : String(value);
}

function toBooleanString(value: unknown): string {
  if (value === true || value === 'true') return 'true';
  if (value === false || value === 'false') return 'false';
  return 'false';
}

function listToMultiline(value: unknown, key: string): string {
  if (!Array.isArray(value)) return '';
  return value
    .map((item) => {
      if (item && typeof item === 'object' && key in (item as Record<string, unknown>)) {
        return String((item as Record<string, unknown>)[key] ?? '');
      }
      return '';
    })
    .filter((item) => item.length > 0)
    .join('\n');
}

function normalizeSalesMonths(value: unknown): string {
  if (!Array.isArray(value)) return '';
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item))
    .join(',');
}

function parseProductExtendedContent(value: string): {
  notes: string;
  certificateImageUrls: string[];
  deliveryLocations: string[];
} {
  if (!value) {
    return { notes: '', certificateImageUrls: [], deliveryLocations: [] };
  }
  try {
    const parsed = JSON.parse(value) as {
      notes?: unknown;
      certificateImageUrls?: unknown;
      deliveryLocations?: unknown;
    };
    return {
      notes: typeof parsed.notes === 'string' ? parsed.notes : '',
      certificateImageUrls: Array.isArray(parsed.certificateImageUrls)
        ? parsed.certificateImageUrls.map(String)
        : [],
      deliveryLocations: Array.isArray(parsed.deliveryLocations)
        ? parsed.deliveryLocations.map(String)
        : [],
    };
  } catch {
    return { notes: value, certificateImageUrls: [], deliveryLocations: [] };
  }
}

function getCategoryCommunicationEnabled(row: Record<string, unknown> | null): string {
  const metadata = row?.metadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return 'false';
  }
  const enabled = (metadata as Record<string, unknown>).isCommunicationEnabled;
  return enabled === true || enabled === 'true' ? 'true' : 'false';
}

function getCategoryVariationOptionIds(row: Record<string, unknown> | null): string[] {
  const metadata = row?.metadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return [];
  }
  const ids = (metadata as Record<string, unknown>).variationOptionIds;
  if (!Array.isArray(ids)) return [];
  return ids.map((item) => String(item ?? '').trim()).filter((item) => item.length > 0);
}

function resolveMemberType(row: Record<string, unknown>): MemberType {
  const role = String(row.role ?? row.memberType ?? '').trim().toUpperCase();
  if (role.includes('ADMIN')) return 'ADMIN';
  if (role.includes('SUPPLIER')) return 'SUPPLIER';
  if (role.includes('SELLER') || row.isSeller === true) {
    return 'SELLER';
  }
  if (role.includes('VENDOR')) {
    return 'SUPPLIER';
  }
  return 'CUSTOMER';
}

function normalizeMemberRow(row: Record<string, unknown>): Record<string, unknown> {
  const memberType = resolveMemberType(row);
  const firstName = getString(row, 'firstName');
  const lastName = getString(row, 'lastName');
  const fullName = `${firstName} ${lastName}`.trim() || getString(row, 'email');
  return {
    ...row,
    memberType,
    fullName,
  };
}

function normalizeProductRow(row: Record<string, unknown>): Record<string, unknown> {
  const sellerValue = row.seller;
  const seller =
    sellerValue && typeof sellerValue === 'object'
      ? (sellerValue as Record<string, unknown>)
      : null;
  const firstName = seller?.firstName ? String(seller.firstName) : '';
  const lastName = seller?.lastName ? String(seller.lastName) : '';
  const fullName = `${firstName} ${lastName}`.trim();
  const fallbackName = row.sellerName ? String(row.sellerName) : '';
  const sellerName = fullName || fallbackName || getString(row, 'sellerId');
  return {
    ...row,
    sellerName,
  };
}

function getCategoryVariationsSummary(row: Record<string, unknown>): string {
  const ids = getCategoryVariationOptionIds(row);
  if (ids.length === 0) return '-';
  const kindsMap = new Map<string, string>();
  ids.forEach((id) => {
    const found = variationOptions.value.find((opt) => opt.value === id);
    if (found) {
      const kind = found.kind;
      let groupName = '';
      if (kind === 'COLOR') groupName = 'Renk';
      else if (kind === 'SIZE') groupName = 'Beden';
      else if (kind === 'NUMBER') groupName = 'Numara';
      else if (kind === 'OPTION') groupName = 'Seçenek';
      else if (kind === 'VARIATION') groupName = 'Varyasyon';
      else groupName = kind;
      kindsMap.set(kind, groupName);
    }
  });
  if (kindsMap.size === 0) return '-';
  return Array.from(kindsMap.values()).join(', ');
}

function normalizeCategoryRows(loadedRows: Record<string, unknown>[]): Record<string, unknown>[] {
  const byId = new Map<string, Record<string, unknown>>();
  const childrenByParentId = new Map<string, Record<string, unknown>[]>();
  loadedRows.forEach((row) => {
    const id = getString(row, 'id');
    if (id) byId.set(id, row);
    const parentId = getString(row, 'parentId');
    if (!parentId) return;
    const children = childrenByParentId.get(parentId) ?? [];
    children.push(row);
    childrenByParentId.set(parentId, children);
  });

  const buildPath = (row: Record<string, unknown>): string => {
    const labels: string[] = [];
    const visited = new Set<string>();
    let cursor: Record<string, unknown> | undefined = row;
    while (cursor) {
      const cursorId = getString(cursor, 'id');
      if (!cursorId || visited.has(cursorId)) break;
      visited.add(cursorId);
      labels.unshift(getString(cursor, 'name') || getString(cursor, 'slug') || cursorId);
      const parentId = getString(cursor, 'parentId');
      cursor = parentId ? byId.get(parentId) : undefined;
    }
    return labels.join(' > ');
  };

  const sortByName = (left: Record<string, unknown>, right: Record<string, unknown>) =>
    (getString(left, 'name') || getString(left, 'slug')).localeCompare(
      getString(right, 'name') || getString(right, 'slug'),
      'tr',
    );

  const roots = loadedRows
    .filter((row) => {
      const parentId = getString(row, 'parentId');
      return !parentId || !byId.has(parentId);
    })
    .sort(sortByName);

  const ordered: Record<string, unknown>[] = [];
  const visited = new Set<string>();

  const walk = (node: Record<string, unknown>, depth: number) => {
    const id = getString(node, 'id');
    if (!id || visited.has(id)) return;
    visited.add(id);
    const treeLabel = getString(node, 'name') || getString(node, 'slug') || id;
    const hasChildren = (childrenByParentId.get(id) ?? []).length > 0;
    const collapsed = collapsedCategoryIds.value.has(id);
    ordered.push({
      ...node,
      categoryPath: buildPath(node),
      categoryTreeLabel: treeLabel,
      categoryVariationsSummary: getCategoryVariationsSummary(node),
      __treeDepth: depth,
      __treeHasChildren: hasChildren,
      __treeCollapsed: collapsed,
    });
    const children = (childrenByParentId.get(id) ?? []).sort(sortByName);
    children.forEach((child) => walk(child, depth + 1));
  };

  roots.forEach((root) => walk(root, 0));
  loadedRows.forEach((row) => walk(row, 0));

  return ordered;
}

function normalizeBidRow(row: Record<string, unknown>): Record<string, unknown> {
  const productTitle = getString(row, 'productTitle');
  const lotNumber = getString(row, 'lotNumber');
  const auctionId = getString(row, 'auctionId') || getString(row, 'id');
  const auctionLabel = lotNumber
    ? `${lotNumber} - ${productTitle || auctionId}`
    : (productTitle || auctionId);

  return {
    ...row,
    auctionId,
    auctionLabel,
    reserveStatusLabel: formatReserveStatusLabel(row.reservePrice, row.reserveMet),
  };
}

function normalizeAuctionRow(row: Record<string, unknown>): Record<string, unknown> {
  const productTitle = getString(row, 'productTitle');
  const productId = getString(row, 'productId');
  return {
    ...row,
    productTitle: productTitle || productId,
    reservePriceLabel: formatReservePriceLabel(row.reservePrice),
    reserveStatusLabel: formatReserveStatusLabel(row.reservePrice, row.reserveMet),
  };
}

function normalizeNegotiationRow(row: Record<string, unknown>): Record<string, unknown> {
  const id = getString(row, 'id');
  const idShort = `#${id.slice(0, 8)}`;
  const violationCount = Number(row.violationCount ?? 0);
  const lockedByPolicy = row.lockedByPolicy === true;
  let violationLabel = 'Temiz';
  if (lockedByPolicy) {
    violationLabel = '⚠️ KİLİTLİ (AI)';
  } else if (violationCount > 0) {
    violationLabel = `⚠️ ${violationCount} İhlal`;
  }

  return {
    ...row,
    idShort,
    violationLabel,
  };
}

function formatReservePriceLabel(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return 'Yok';
  }
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatReserveStatusLabel(
  reservePrice: unknown,
  reserveMet: unknown,
): string {
  if (reservePrice === null || reservePrice === undefined || reservePrice === '') {
    return 'Yok';
  }
  return reserveMet === true || reserveMet === 'true'
    ? 'Karşılandı'
    : 'Karşılanmadı';
}

function auditActionLabel(action: string): string {
  const labels: Record<string, string> = {
    SELLER_APPROVED: 'Satıcı onaylandı',
    SELLER_REJECTED: 'Satıcı reddedildi',
    USER_RESTRICTED: 'Üye kısıtlandı',
    USER_REACTIVATED: 'Üye yeniden etkinleştirildi',
    PRODUCT_REMOVED: 'Ürün yayından kaldırıldı',
    AUCTION_CANCELLED: 'Müzayede iptal edildi',
    ORDER_MARKED_ADMIN_REVIEW: 'Sipariş incelemeye alındı',
    PAYMENT_MARKED_ADMIN_REVIEW: 'Ödeme incelemeye alındı',
    CATEGORY_CREATED: 'Kategori oluşturuldu',
    CATEGORY_UPDATED: 'Kategori güncellendi',
    CATEGORY_DELETED: 'Kategori devre dışı bırakıldı',
    BRAND_CREATED: 'Marka oluşturuldu',
    BRAND_UPDATED: 'Marka güncellendi',
    BRAND_DELETED: 'Marka devre dışı bırakıldı',
    PAYOUT_APPROVED: 'Ödeme talebi onaylandı',
    PAYOUT_REJECTED: 'Ödeme talebi reddedildi',
    ADMIN_LOGIN: 'Yönetici girişi',
    SETTING_UPDATED: 'Ayar güncellendi',
    NEGOTIATION_VIEWED: 'Pazarlık kaydı görüntülendi',
    TRUST_REVIEWED: 'Güven değerlendirmesi yapıldı',
    AD_APPROVED: 'İlan onaylandı',
    AD_REJECTED: 'İlan reddedildi',
  };

  if (labels[action]) return labels[action];
  if (!action) return '-';
  return action
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

function auditTargetLabel(targetType: string): string {
  const labels: Record<string, string> = {
    USER: 'Üye',
    SELLER: 'Satıcı',
    PRODUCT: 'Ürün',
    AUCTION: 'Müzayede',
    ORDER: 'Sipariş',
    PAYMENT: 'Ödeme',
    CATEGORY: 'Kategori',
    BRAND: 'Marka',
    ADMIN: 'Yönetici',
    BID: 'Teklif',
    PAYOUT_REQUEST: 'Ödeme talebi',
  };
  return labels[targetType] ?? (targetType || 'Kayıt');
}

function auditTargetRoute(targetType: string, targetId: string): string {
  if (!targetId) return '';
  const baseByType: Record<string, string> = {
    USER: '/users',
    SELLER: '/sellers',
    PRODUCT: '/products',
    AUCTION: '/auctions',
    ORDER: '/orders',
    PAYMENT: '/payments',
    CATEGORY: '/categories',
    BRAND: '/brands',
    BID: '/bids',
    PAYOUT_REQUEST: '/payouts',
  };
  const base = baseByType[targetType];
  return base ? `${base}/${targetId}` : '';
}

function shortAuditId(value: string): string {
  if (!value) return '-';
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function normalizeAuditRow(row: Record<string, unknown>): Record<string, unknown> {
  const action = getString(row, 'action');
  const targetType = getString(row, 'targetType');
  const targetId = getString(row, 'targetId');
  const actorAdminId = getString(row, 'actorAdminId');
  const actorRolesRaw = row.actorRoles;
  const actorRoles = Array.isArray(actorRolesRaw) ? actorRolesRaw.map(String) : [];
  const actorRole = actorRoles[0] ? actorRoles[0].replace(/_/g, ' ') : 'Yönetici';
  const reason = getString(row, 'reason');

  return {
    ...row,
    actionLabel: auditActionLabel(action),
    targetLabel: auditTargetLabel(targetType),
    targetIdShort: shortAuditId(targetId),
    actorLabel: `${actorRole} (${shortAuditId(actorAdminId)})`,
    reasonText: reason || '-',
  };
}

function buildListQueryParams(filtersValue: Record<string, string>): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: pagination.value.page,
    limit: pagination.value.limit,
  };
  if (filtersValue.q) params.q = filtersValue.q;
  if (filtersValue.status) params.status = filtersValue.status;
  if (filtersValue.from) params.from = filtersValue.from;
  if (filtersValue.to) params.to = filtersValue.to;
  return params;
}

function getRowId(row: Record<string, unknown> | null): string | null {
  const value = row?.id;
  return value === null || value === undefined ? null : String(value);
}

function setPage(page: number) {
  if (props.resource === 'categories') return;
  pagination.value = { ...pagination.value, page };
  void loadRows();
}

function setFilters(filtersValue: Record<string, string>) {
  activeFilters.value = filtersValue;
  pagination.value = { ...pagination.value, page: 1 };
  void loadRows();
}

function hasCollapsedAncestor(row: Record<string, unknown>): boolean {
  const path = getString(row, 'categoryPath');
  if (!path) return false;
  const currentId = getString(row, 'id');
  const currentDepth = Number(row.__treeDepth ?? 0);
  if (currentDepth <= 0 || !currentId) return false;
  let ancestorParentId = getString(row, 'parentId');
  while (ancestorParentId) {
    if (collapsedCategoryIds.value.has(ancestorParentId)) {
      return true;
    }
    const ancestor = rows.value.find((item) => getString(item, 'id') === ancestorParentId);
    if (!ancestor) break;
    ancestorParentId = getString(ancestor, 'parentId');
  }
  return false;
}

function toggleCategoryTree(row: Record<string, unknown>) {
  if (props.resource !== 'categories') return;
  const id = getString(row, 'id');
  if (!id) return;
  if (collapsedCategoryIds.value.has(id)) {
    collapsedCategoryIds.value.delete(id);
  } else {
    collapsedCategoryIds.value.add(id);
  }
  rows.value = normalizeCategoryRows(rows.value);
}

async function goToProductCreate() {
  await router.push('/products/new');
}

function openAction(action: AdminTableAction, row?: Record<string, unknown>) {
  const actionConfig = action as ActionConfig;
  if (actionConfig.key === 'editProduct') {
    const id = getRowId(row ?? null);
    if (!id) return;
    void router.push(`/products/${id}/edit`);
    return;
  }
  selectedAction.value = actionConfig;
  selectedRow.value = row ?? null;
  drawerOpen.value = true;
}

function closeDrawer() {
  drawerOpen.value = false;
  selectedAction.value = null;
  selectedRow.value = null;
}

async function confirmAction(payload: DrawerConfirmPayload) {
  if (!selectedAction.value) return;

  const id = getRowId(selectedRow.value);
  const body: Record<string, unknown> = { reason: payload.reason, metadata: payload.values };

  try {
    if (selectedAction.value.method === 'delete') {
      await adminApi.delete(selectedAction.value.path(id), { data: body });
    } else if (selectedAction.value.method === 'post') {
      await adminApi.post(selectedAction.value.path(id), body);
    } else {
      await adminApi.patch(selectedAction.value.path(id), body);
    }
    closeDrawer();
    await loadRows();
  } catch (actionError) {
    error.value = toApiMessage(actionError);
  }
}

async function goToDetail(row: Record<string, unknown>) {
  const id = getRowId(row);
  const detailBase = config.value.detailBase;
  if (!id || !detailBase) return;
  await router.push(`/${detailBase}/${id}`);
}

async function loadRows() {
  loading.value = true;
  error.value = null;

  try {
    if (props.resource === 'categories') {
      await loadVariationOptions();
      const allRows = await loadAllCategoryRows();
      rows.value = normalizeCategoryRows(allRows);
      pagination.value = {
        page: 1,
        limit: Math.max(rows.value.length, 1),
        total: rows.value.length,
      };
      return;
    }

    const response = await adminApi.get<ApiListResponse>(endpoint.value, {
      params: buildListQueryParams(activeFilters.value),
    });
    const loadedRows = Array.isArray(response.data.items) ? response.data.items : [];
    rows.value =
      props.resource === 'users'
        ? loadedRows.map((row) => normalizeMemberRow(row))
        : props.resource === 'products'
          ? loadedRows.map((row) => normalizeProductRow(row))
          : props.resource === 'auctions'
            ? loadedRows.map((row) => normalizeAuctionRow(row))
          : props.resource === 'bids'
            ? loadedRows.map((row) => normalizeBidRow(row))
            : props.resource === 'negotiations'
              ? loadedRows.map((row) => normalizeNegotiationRow(row))
            : props.resource === 'audit-logs'
              ? loadedRows.map((row) => normalizeAuditRow(row))
          : loadedRows;
    pagination.value = response.data.pagination ?? pagination.value;
  } catch (loadError) {
    error.value = toApiMessage(loadError);
    rows.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadAllCategoryRows(): Promise<Record<string, unknown>[]> {
  if (categoryRequestInFlight) {
    return categoryRequestInFlight;
  }
  categoryRequestInFlight = (async () => {
  const baseParams = buildListQueryParams(activeFilters.value);
    const run = async () =>
      adminApi.get<ApiListResponse>('/admin/categories', {
        params: { ...baseParams, page: 1, limit: 1000 },
      });

    try {
      const response = await run();
      return Array.isArray(response.data.items) ? response.data.items : [];
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 429) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const retryResponse = await run();
        return Array.isArray(retryResponse.data.items) ? retryResponse.data.items : [];
      }
      throw error;
    }
  })();
  try {
    return await categoryRequestInFlight;
  } finally {
    categoryRequestInFlight = null;
  }
}

async function loadCategoryParentOptions() {
  if (props.resource !== 'categories') return;
  try {
    const categoryRows = await loadAllCategoryRows();
    const normalizedRows = normalizeCategoryRows(categoryRows);
    categoryParentOptions.value = normalizedRows.map((item) => ({
      label: String(item.categoryPath ?? item.name ?? item.slug ?? item.id ?? 'Kategori'),
      value: String(item.id ?? ''),
    }));
  } catch {
    categoryParentOptions.value = [];
  }
}

async function loadVariationOptions() {
  if (props.resource !== 'categories') return;
  try {
    const response = await adminApi.get<ApiListResponse>('/admin/variants/numbers', {
      params: { page: 1, limit: 200 },
    });
    const items = Array.isArray(response.data.items) ? response.data.items : [];
    variationOptions.value = items
      .filter((item) => String(item.status ?? 'ACTIVE') === 'ACTIVE')
      .map((item) => ({
        label: `${String(item.nameTr ?? item.nameEn ?? item.id ?? 'Varyasyon')} (${String(item.kind ?? '-')})`,
        value: String(item.id ?? ''),
        kind: String(item.kind ?? ''),
      }));
  } catch {
    variationOptions.value = [];
  }
}

watch(
  () => props.resource,
  () => {
    activeFilters.value = {};
    pagination.value = { page: 1, limit: 25, total: 0 };
    void loadCategoryParentOptions();
    void loadVariationOptions();
    void loadRows();
  },
);

onMounted(loadRows);
onMounted(loadCategoryParentOptions);
onMounted(loadVariationOptions);
</script>
