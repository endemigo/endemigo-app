<template>
  <section class="field-grid">
    <header class="page-header">
      <div>
        <h1>Kampanyalar</h1>
        <p>Kampanyalar, kuponlar ve katılım durumu</p>
      </div>
      <button class="button primary" type="button" @click="openCreate">
        <i class="pi pi-plus" aria-hidden="true" />
        {{ activeTab === 'campaigns' ? 'Platform kampanyası' : 'Platform Kuponu' }}
      </button>
    </header>

    <nav class="tabs" aria-label="Monetization sekmeleri">
      <button
        class="tab-button"
        :class="{ 'is-active': activeTab === 'campaigns' }"
        type="button"
        @click="setTab('campaigns')"
      >
        Kampanyalar
      </button>
      <button
        class="tab-button"
        :class="{ 'is-active': activeTab === 'coupons' }"
        type="button"
        @click="setTab('coupons')"
      >
        Kuponlar
      </button>
    </nav>

    <AdminDataTable
      :columns="activeColumns"
      :rows="activeRows"
      :loading="activeLoading"
      :pagination="activePagination"
      :filters="activeFilters"
      :actions="activeActions"
      @page="setPage"
      @filter="setFilters"
      @action="openCouponAction"
    />

    <p v-if="error" class="error-text">{{ error }}</p>

    <AdminActionDrawer
      :open="drawerOpen"
      :title="drawerTitle"
      :fields="drawerFields"
      :confirm-label="drawerConfirmLabel"
      @close="closeDrawer"
      @confirm="confirmAction"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AdminActionDrawer, {
  type DrawerConfirmPayload,
  type DrawerField,
} from '../../components/AdminActionDrawer.vue';
import AdminDataTable, {
  type AdminColumn,
  type AdminFilter,
  type AdminPagination,
  type AdminTableAction,
} from '../../components/AdminDataTable.vue';
import {
  adminApi,
  toApiMessage,
  type ApiListResponse,
} from '../../services/api';

type MonetizationTab = 'campaigns' | 'coupons';
type CouponDrawerMode = 'create' | 'edit' | 'status';

const activeTab = ref<MonetizationTab>('campaigns');
const drawerOpen = ref(false);
const error = ref<string | null>(null);

const campaignRows = ref<Record<string, unknown>[]>([]);
const campaignLoading = ref(false);
const campaignFilters = ref<Record<string, string>>({});
const campaignPagination = ref<AdminPagination>({
  page: 1,
  limit: 25,
  total: 0,
});

const couponRows = ref<Record<string, unknown>[]>([]);
const couponLoading = ref(false);
const couponFilters = ref<Record<string, string>>({});
const couponPagination = ref<AdminPagination>({
  page: 1,
  limit: 25,
  total: 0,
});

const couponDrawerMode = ref<CouponDrawerMode>('create');
const selectedCouponRow = ref<Record<string, unknown> | null>(null);
const pendingCouponStatus = ref<'ACTIVE' | 'DISABLED'>('DISABLED');

const campaignColumns: AdminColumn[] = [
  { key: 'name', label: 'Ad' },
  { key: 'sellerId', label: 'Satıcı' },
  { key: 'status', label: 'Durum', format: 'status' },
  { key: 'isPlatform', label: 'Platform' },
  { key: 'requiresSellerOptIn', label: 'Katılım' },
  { key: 'startsAt', label: 'Başlangıç', format: 'date' },
  { key: 'endsAt', label: 'Bitiş', format: 'date' },
];

const couponColumns: AdminColumn[] = [
  { key: 'code', label: 'Kod' },
  { key: 'sellerId', label: 'Satıcı' },
  { key: 'status', label: 'Durum', format: 'status' },
  { key: 'discountType', label: 'İndirim Türü' },
  { key: 'discountValue', label: 'İndirim', format: 'money' },
  { key: 'totalRedemptions', label: 'Kullanım' },
  { key: 'remainingUses', label: 'Kalan Hak' },
  { key: 'maxUses', label: 'Toplam Limit' },
  { key: 'perUserLimit', label: 'Kişi Limiti' },
  { key: 'startsAt', label: 'Başlangıç', format: 'date' },
  { key: 'endsAt', label: 'Bitiş', format: 'date' },
];

const couponBaseFieldOptions = {
  discountTypes: [
    { label: 'Yüzde', value: 'PERCENTAGE' },
    { label: 'Sabit tutar', value: 'FIXED_AMOUNT' },
  ],
  scopeTypes: [
    { label: 'Kategori', value: 'CATEGORY' },
    { label: 'Ürün', value: 'PRODUCT' },
  ],
};

const campaignCreateFields: DrawerField[] = [
  { key: 'name', label: 'Ad', required: true },
  { key: 'startsAt', label: 'Başlangıç tarihi', required: true },
  { key: 'endsAt', label: 'Bitiş tarihi', required: true },
  {
    key: 'requiresSellerOptIn',
    label: 'Katılım gerekir',
    type: 'select',
    options: [
      { label: 'Evet', value: 'true' },
      { label: 'Hayır', value: 'false' },
    ],
  },
  {
    key: 'discountType',
    label: 'İndirim türü',
    type: 'select',
    required: true,
    options: couponBaseFieldOptions.discountTypes,
  },
  { key: 'discountValue', label: 'İndirim değeri', type: 'number', required: true },
  {
    key: 'scopeType',
    label: 'Kapsam türü',
    type: 'select',
    required: true,
    options: couponBaseFieldOptions.scopeTypes,
  },
  { key: 'scopeId', label: "Kapsam ID'si", required: true },
];

const couponCreateFields: DrawerField[] = [
  { key: 'code', label: 'Kod', required: true },
  {
    key: 'discountType',
    label: 'İndirim türü',
    type: 'select',
    required: true,
    options: couponBaseFieldOptions.discountTypes,
  },
  { key: 'discountValue', label: 'İndirim değeri', type: 'number', required: true },
  { key: 'startsAt', label: 'Başlangıç tarihi', required: true },
  { key: 'endsAt', label: 'Bitiş tarihi', required: true },
  { key: 'minAmount', label: 'Alt limit', type: 'number' },
  { key: 'maxUses', label: 'Toplam kullanım limiti', type: 'number' },
  { key: 'perUserLimit', label: 'Kişi başı limit', type: 'number', value: '1' },
  {
    key: 'scopeType',
    label: 'Kapsam türü',
    type: 'select',
    options: couponBaseFieldOptions.scopeTypes,
  },
  { key: 'scopeId', label: "Kapsam ID'si" },
];

const couponActions = computed<AdminTableAction[]>(() => {
  const status = getString(selectedCouponRow.value, 'status');
  return [
    { key: 'edit', label: 'Düzenle', icon: 'pi pi-pencil' },
    {
      key: 'toggle-status',
      label: status === 'DISABLED' ? 'Aktif Yap' : 'Pasif Yap',
      icon: 'pi pi-power-off',
      tone: status === 'DISABLED' ? 'primary' : 'danger',
    },
  ];
});

const activeColumns = computed(() =>
  activeTab.value === 'campaigns' ? campaignColumns : couponColumns,
);
const activeRows = computed(() =>
  activeTab.value === 'campaigns' ? campaignRows.value : couponRows.value,
);
const activeLoading = computed(() =>
  activeTab.value === 'campaigns' ? campaignLoading.value : couponLoading.value,
);
const activePagination = computed(() =>
  activeTab.value === 'campaigns'
    ? campaignPagination.value
    : couponPagination.value,
);
const activeActions = computed(() =>
  activeTab.value === 'coupons' ? couponActions.value : [],
);

const activeFilters = computed<AdminFilter[]>(() =>
  activeTab.value === 'campaigns'
    ? [
        {
          key: 'campaignStatus',
          label: 'Durum',
          type: 'select',
          value: campaignFilters.value.campaignStatus ?? '',
          options: [
            { label: 'Taslak', value: 'DRAFT' },
            { label: 'Aktif', value: 'ACTIVE' },
            { label: 'Duraklatıldı', value: 'PAUSED' },
            { label: 'Süresi doldu', value: 'EXPIRED' },
          ],
        },
        {
          key: 'sellerId',
          label: "Satıcı ID'si",
          value: campaignFilters.value.sellerId ?? '',
        },
      ]
    : [
        {
          key: 'status',
          label: 'Durum',
          type: 'select',
          value: couponFilters.value.status ?? '',
          options: [
            { label: 'Taslak', value: 'DRAFT' },
            { label: 'Aktif', value: 'ACTIVE' },
            { label: 'Süresi doldu', value: 'EXPIRED' },
            { label: 'Pasif', value: 'DISABLED' },
          ],
        },
        {
          key: 'sellerId',
          label: "Satıcı ID'si",
          value: couponFilters.value.sellerId ?? '',
        },
      ],
);

const drawerTitle = computed(() => {
  if (activeTab.value === 'campaigns') return 'Platform kampanyası';
  if (couponDrawerMode.value === 'edit') return 'Kupon düzenle';
  if (couponDrawerMode.value === 'status') {
    return pendingCouponStatus.value === 'ACTIVE'
      ? 'Kuponu aktifleştir'
      : 'Kuponu pasife al';
  }
  return 'Platform kuponu';
});

const drawerConfirmLabel = computed(() => {
  if (activeTab.value === 'campaigns') return 'Oluştur';
  if (couponDrawerMode.value === 'status') return 'Uygula';
  return 'Kaydet';
});

const drawerFields = computed(() => {
  if (activeTab.value === 'campaigns') return campaignCreateFields;
  if (couponDrawerMode.value === 'status') return [];
  if (couponDrawerMode.value === 'edit') {
    return buildCouponFields(selectedCouponRow.value);
  }
  return couponCreateFields;
});

function setTab(tab: MonetizationTab) {
  activeTab.value = tab;
  error.value = null;
  if (tab === 'campaigns' && campaignRows.value.length === 0) {
    void loadCampaignRows();
    return;
  }
  if (tab === 'coupons' && couponRows.value.length === 0) {
    void loadCouponRows();
  }
}

function openCreate() {
  if (activeTab.value === 'coupons') {
    couponDrawerMode.value = 'create';
    selectedCouponRow.value = null;
  }
  drawerOpen.value = true;
}

function openCouponAction(action: AdminTableAction, row: Record<string, unknown>) {
  if (activeTab.value !== 'coupons') return;
  selectedCouponRow.value = row;
  if (action.key === 'edit') {
    couponDrawerMode.value = 'edit';
  } else {
    couponDrawerMode.value = 'status';
    pendingCouponStatus.value =
      getString(row, 'status') === 'DISABLED' ? 'ACTIVE' : 'DISABLED';
  }
  drawerOpen.value = true;
}

function closeDrawer() {
  drawerOpen.value = false;
  selectedCouponRow.value = null;
  couponDrawerMode.value = 'create';
  pendingCouponStatus.value = 'DISABLED';
}

function setPage(page: number) {
  if (activeTab.value === 'campaigns') {
    campaignPagination.value = { ...campaignPagination.value, page };
    void loadCampaignRows();
    return;
  }

  couponPagination.value = { ...couponPagination.value, page };
  void loadCouponRows();
}

function setFilters(filtersValue: Record<string, string>) {
  error.value = null;
  if (activeTab.value === 'campaigns') {
    campaignFilters.value = filtersValue;
    campaignPagination.value = { ...campaignPagination.value, page: 1 };
    void loadCampaignRows();
    return;
  }

  couponFilters.value = filtersValue;
  couponPagination.value = { ...couponPagination.value, page: 1 };
  void loadCouponRows();
}

async function confirmAction(payload: DrawerConfirmPayload) {
  try {
    if (activeTab.value === 'campaigns') {
      await adminApi.post('/admin/campaigns', {
        name: payload.values.name,
        startsAt: payload.values.startsAt,
        endsAt: payload.values.endsAt,
        isPlatform: true,
        requiresSellerOptIn: payload.values.requiresSellerOptIn === 'true',
        rules: [
          {
            discountType: payload.values.discountType,
            discountValue: Number(payload.values.discountValue),
            scopeType: payload.values.scopeType,
            scopeId: payload.values.scopeId,
          },
        ],
        reason: payload.reason,
      });
      closeDrawer();
      await loadCampaignRows();
      return;
    }

    if (couponDrawerMode.value === 'status') {
      await adminApi.patch(`/admin/coupons/${selectedCouponId()}/status`, {
        status: pendingCouponStatus.value,
        reason: payload.reason,
      });
      closeDrawer();
      await loadCouponRows();
      return;
    }

    const couponPayload = {
      code: payload.values.code,
      discountType: payload.values.discountType,
      discountValue: Number(payload.values.discountValue),
      startsAt: payload.values.startsAt,
      endsAt: payload.values.endsAt,
      minAmount: parseOptionalNumber(payload.values.minAmount),
      maxUses: parseOptionalNumber(payload.values.maxUses),
      perUserLimit: parseOptionalNumber(payload.values.perUserLimit),
      scopeType: payload.values.scopeType || undefined,
      scopeId: payload.values.scopeId || undefined,
      reason: payload.reason,
    };

    if (couponDrawerMode.value === 'edit') {
      await adminApi.patch(`/admin/coupons/${selectedCouponId()}`, couponPayload);
    } else {
      await adminApi.post('/admin/coupons', couponPayload);
    }
    closeDrawer();
    await loadCouponRows();
  } catch (createError) {
    error.value = toApiMessage(createError);
  }
}

async function loadCampaignRows() {
  campaignLoading.value = true;
  error.value = null;
  try {
    const response = await adminApi.get<ApiListResponse>('/admin/reports/campaigns', {
      params: {
        page: campaignPagination.value.page,
        limit: campaignPagination.value.limit,
        ...campaignFilters.value,
      },
    });
    campaignRows.value = response.data.items ?? [];
    campaignPagination.value =
      response.data.pagination ?? campaignPagination.value;
  } catch (loadError) {
    error.value = toApiMessage(loadError);
    campaignRows.value = [];
  } finally {
    campaignLoading.value = false;
  }
}

async function loadCouponRows() {
  couponLoading.value = true;
  error.value = null;
  try {
    const response = await adminApi.get<ApiListResponse>('/admin/coupons', {
      params: {
        page: couponPagination.value.page,
        limit: couponPagination.value.limit,
        ...couponFilters.value,
      },
    });
    couponRows.value = response.data.items ?? [];
    couponPagination.value = response.data.pagination ?? couponPagination.value;
  } catch (loadError) {
    error.value = toApiMessage(loadError);
    couponRows.value = [];
  } finally {
    couponLoading.value = false;
  }
}

function selectedCouponId(): string {
  return String(selectedCouponRow.value?.id ?? '');
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (!value || value.trim().length === 0) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getString(row: Record<string, unknown> | null, key: string): string {
  const value = row?.[key];
  return typeof value === 'string'
    ? value
    : value === null || value === undefined
      ? ''
      : String(value);
}

function buildCouponFields(row: Record<string, unknown> | null): DrawerField[] {
  return [
    { key: 'code', label: 'Kod', required: true, value: getString(row, 'code') },
    {
      key: 'discountType',
      label: 'İndirim türü',
      type: 'select',
      required: true,
      value: getString(row, 'discountType'),
      options: couponBaseFieldOptions.discountTypes,
    },
    {
      key: 'discountValue',
      label: 'İndirim değeri',
      type: 'number',
      required: true,
      value: getString(row, 'discountValue'),
    },
    {
      key: 'startsAt',
      label: 'Başlangıç tarihi',
      required: true,
      value: getString(row, 'startsAt'),
    },
    {
      key: 'endsAt',
      label: 'Bitiş tarihi',
      required: true,
      value: getString(row, 'endsAt'),
    },
    {
      key: 'minAmount',
      label: 'Alt limit',
      type: 'number',
      value: getString(row, 'minAmount'),
    },
    {
      key: 'maxUses',
      label: 'Toplam kullanım limiti',
      type: 'number',
      value: getString(row, 'maxUses'),
    },
    {
      key: 'perUserLimit',
      label: 'Kişi başı limit',
      type: 'number',
      value: getString(row, 'perUserLimit'),
    },
    {
      key: 'scopeType',
      label: 'Kapsam türü',
      type: 'select',
      value: getString(row, 'scopeType'),
      options: couponBaseFieldOptions.scopeTypes,
    },
    {
      key: 'scopeId',
      label: "Kapsam ID'si",
      value: getString(row, 'scopeId'),
    },
  ];
}

onMounted(loadCampaignRows);
</script>
