<template>
  <section class="field-grid">
    <header class="page-header">
      <div>
        <h1>Üyelik</h1>
        <p>Paketler, abonelikler, ek süre ve süresi dolmuş filtreleri</p>
      </div>
      <button class="button primary" type="button" @click="drawerOpen = true">
        <i class="pi pi-plus" aria-hidden="true" />
        Paket
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

    <section class="panel">
      <div class="panel-header">
      <strong>Paketler</strong>
        <span class="muted">{{ packages.length }} kayıt</span>
      </div>
      <div class="panel-body">
        <pre class="json-box">{{ packages }}</pre>
      </div>
    </section>

    <p v-if="error" class="error-text">{{ error }}</p>

    <AdminActionDrawer
      :open="drawerOpen"
      title="Üyelik paketi"
      :fields="packageFields"
      confirm-label="Kaydet"
      @close="drawerOpen = false"
      @confirm="createPackage"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AdminActionDrawer, { type DrawerConfirmPayload, type DrawerField } from '../../components/AdminActionDrawer.vue';
import AdminDataTable, { type AdminColumn, type AdminFilter, type AdminPagination } from '../../components/AdminDataTable.vue';
import { adminApi, toApiMessage } from '../../services/api';

const rows = ref<Record<string, unknown>[]>([]);
const packages = ref<Record<string, unknown>[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const drawerOpen = ref(false);
const activeFilters = ref<Record<string, string>>({});
const pagination = ref<AdminPagination>({ page: 1, limit: 25, total: 0 });

const columns: AdminColumn[] = [
  { key: 'sellerId', label: 'Satıcı' },
  { key: 'packageId', label: 'Paket' },
  { key: 'status', label: 'Durum', format: 'status' },
  { key: 'period', label: 'Dönem' },
  { key: 'graceEndsAt', label: 'Ek süre bitişi', format: 'date' },
  { key: 'currentPeriodEndsAt', label: 'Dönem bitişi', format: 'date' },
];

const filters = computed<AdminFilter[]>(() => [
  { key: 'membershipStatus', label: 'Durum', type: 'select', value: activeFilters.value.membershipStatus ?? '', options: [
    { label: 'Ücretsiz', value: 'FREE' },
    { label: 'Aktif', value: 'ACTIVE' },
    { label: 'Ek süre', value: 'GRACE' },
    { label: 'Süresi doldu', value: 'EXPIRED' },
    { label: 'İptal edildi', value: 'CANCELLED' },
  ] },
  { key: 'sellerId', label: "Satıcı ID'si", value: activeFilters.value.sellerId ?? '' },
]);

const packageFields: DrawerField[] = [
  { key: 'name', label: 'Ad', required: true },
  { key: 'description', label: 'Açıklama', type: 'textarea' },
  { key: 'monthlyPrice', label: 'Aylık fiyat', type: 'number', required: true },
  { key: 'yearlyPrice', label: 'Yıllık fiyat', type: 'number', required: true },
  { key: 'benefitsJson', label: 'Avantaj JSON', type: 'textarea', required: true, value: '{"visibilityBoost":0,"adCredits":0,"adDiscountRate":0,"commissionRate":0.1,"payoutPriority":"standard","badgeLevel":"New"}' },
];

function setPage(page: number) {
  pagination.value = { ...pagination.value, page };
  void loadSubscriptions();
}

function setFilters(filtersValue: Record<string, string>) {
  activeFilters.value = filtersValue;
  pagination.value = { ...pagination.value, page: 1 };
  void loadSubscriptions();
}

async function createPackage(payload: DrawerConfirmPayload) {
  try {
    await adminApi.post('/admin/membership/packages', {
      name: payload.values.name,
      description: payload.values.description || null,
      monthlyPrice: Number(payload.values.monthlyPrice),
      yearlyPrice: Number(payload.values.yearlyPrice),
      benefits: JSON.parse(payload.values.benefitsJson),
      reason: payload.reason,
    });
    drawerOpen.value = false;
    await loadPackages();
  } catch (createError) {
    error.value = toApiMessage(createError);
  }
}

async function loadSubscriptions() {
  loading.value = true;
  error.value = null;
  try {
    const response = await adminApi.get('/admin/reports/membership', {
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

async function loadPackages() {
  const response = await adminApi.get('/membership/packages');
  packages.value = response.data.items ?? [];
}

async function loadAll() {
  await Promise.all([loadSubscriptions(), loadPackages()]);
}

onMounted(loadAll);
</script>
