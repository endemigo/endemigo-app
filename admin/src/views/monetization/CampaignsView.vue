<template>
  <section class="field-grid">
    <header class="page-header">
      <div>
        <h1>Kampanyalar</h1>
        <p>Kampanyalar, kuponlar ve katılım durumu</p>
      </div>
      <button class="button primary" type="button" @click="openCreate">
        <i class="pi pi-plus" aria-hidden="true" />
        Platform kampanyası
      </button>
    </header>

    <AdminDataTable
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :pagination="pagination"
      :filters="filters"
      @page="setPage"
      @filter="setFilters"
    />

    <p v-if="error" class="error-text">{{ error }}</p>

    <AdminActionDrawer
      :open="drawerOpen"
      title="Platform kampanyası"
      :fields="createFields"
      confirm-label="Oluştur"
      @close="drawerOpen = false"
      @confirm="createCampaign"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AdminActionDrawer, { type DrawerConfirmPayload, type DrawerField } from '../../components/AdminActionDrawer.vue';
import AdminDataTable, { type AdminColumn, type AdminFilter, type AdminPagination } from '../../components/AdminDataTable.vue';
import { adminApi, toApiMessage } from '../../services/api';

const rows = ref<Record<string, unknown>[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const drawerOpen = ref(false);
const activeFilters = ref<Record<string, string>>({});
const pagination = ref<AdminPagination>({ page: 1, limit: 25, total: 0 });

const columns: AdminColumn[] = [
  { key: 'name', label: 'Ad' },
  { key: 'sellerId', label: 'Satıcı' },
  { key: 'status', label: 'Durum', format: 'status' },
  { key: 'isPlatform', label: 'Platform' },
  { key: 'requiresSellerOptIn', label: 'Katılım' },
  { key: 'startsAt', label: 'Başlangıç', format: 'date' },
  { key: 'endsAt', label: 'Bitiş', format: 'date' },
];

const filters = computed<AdminFilter[]>(() => [
  { key: 'campaignStatus', label: 'Durum', type: 'select', value: activeFilters.value.campaignStatus ?? '', options: [
    { label: 'Taslak', value: 'DRAFT' },
    { label: 'Aktif', value: 'ACTIVE' },
    { label: 'Duraklatıldı', value: 'PAUSED' },
    { label: 'Süresi doldu', value: 'EXPIRED' },
  ] },
  { key: 'sellerId', label: "Satıcı ID'si", value: activeFilters.value.sellerId ?? '' },
]);

const createFields: DrawerField[] = [
  { key: 'name', label: 'Ad', required: true },
  { key: 'startsAt', label: 'Başlangıç tarihi', required: true },
  { key: 'endsAt', label: 'Bitiş tarihi', required: true },
  { key: 'requiresSellerOptIn', label: 'Katılım gerekir', type: 'select', options: [{ label: 'Evet', value: 'true' }, { label: 'Hayır', value: 'false' }] },
  { key: 'discountType', label: 'İndirim türü', type: 'select', required: true, options: [{ label: 'Yüzde', value: 'PERCENTAGE' }, { label: 'Sabit tutar', value: 'FIXED_AMOUNT' }] },
  { key: 'discountValue', label: 'İndirim değeri', type: 'number', required: true },
  { key: 'scopeType', label: 'Kapsam türü', type: 'select', required: true, options: [{ label: 'Kategori', value: 'CATEGORY' }, { label: 'Ürün', value: 'PRODUCT' }, { label: 'Satıcı', value: 'SELLER' }] },
  { key: 'scopeId', label: "Kapsam ID'si", required: true },
];

function openCreate() {
  drawerOpen.value = true;
}

function setPage(page: number) {
  pagination.value = { ...pagination.value, page };
  void loadRows();
}

function setFilters(filtersValue: Record<string, string>) {
  activeFilters.value = filtersValue;
  pagination.value = { ...pagination.value, page: 1 };
  void loadRows();
}

async function createCampaign(payload: DrawerConfirmPayload) {
  try {
    await adminApi.post('/admin/campaigns', {
      name: payload.values.name,
      startsAt: payload.values.startsAt,
      endsAt: payload.values.endsAt,
      isPlatform: true,
      requiresSellerOptIn: payload.values.requiresSellerOptIn === 'true',
      rules: [{
        discountType: payload.values.discountType,
        discountValue: Number(payload.values.discountValue),
        scopeType: payload.values.scopeType,
        scopeId: payload.values.scopeId,
      }],
      reason: payload.reason,
    });
    drawerOpen.value = false;
    await loadRows();
  } catch (createError) {
    error.value = toApiMessage(createError);
  }
}

async function loadRows() {
  loading.value = true;
  error.value = null;
  try {
    const response = await adminApi.get('/admin/reports/campaigns', {
      params: { page: pagination.value.page, limit: pagination.value.limit, ...activeFilters.value },
    });
    rows.value = response.data.items ?? [];
    pagination.value = response.data.pagination ?? pagination.value;
  } catch (loadError) {
    error.value = toApiMessage(loadError);
    rows.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(loadRows);
</script>
