<template>
  <section class="field-grid">
    <header class="page-header">
      <div>
        <h1>Reklamlar</h1>
        <p>Talepler, yerleşimler, slot takvimi ve çakışmalar</p>
      </div>
      <button class="button" type="button" @click="loadAll">
        <i class="pi pi-refresh" aria-hidden="true" />
        Yenile
      </button>
    </header>

    <AdminDataTable
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :pagination="pagination"
      :filters="filters"
      :actions="actions"
      @page="setPage"
      @filter="setFilters"
      @action="openAction"
    />

    <div class="metric-grid">
      <section class="panel">
        <div class="panel-header">
          <strong>Slot takvimi</strong>
          <span class="muted">{{ calendarRows.length }} zaman aralığı</span>
        </div>
        <div class="panel-body">
          <pre class="json-box">{{ calendarRows }}</pre>
        </div>
      </section>
      <section class="panel">
        <div class="panel-header">
          <strong>Slot çakışmaları</strong>
          <span class="muted">{{ conflictRows.length }} çakışma</span>
        </div>
        <div class="panel-body">
          <pre class="json-box">{{ conflictRows }}</pre>
        </div>
      </section>
    </div>

    <p v-if="error" class="error-text">{{ error }}</p>

    <AdminActionDrawer
      :open="drawerOpen"
      :title="drawerTitle"
      :fields="drawerFields"
      confirm-label="Uygula"
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
import { adminApi, toApiMessage, type ApiListResponse } from '../../services/api';

interface ActionConfig extends AdminTableAction {
  endpoint: (id: string) => string;
  method: 'patch';
  fields?: DrawerField[];
}

const rows = ref<Record<string, unknown>[]>([]);
const calendarRows = ref<Record<string, unknown>[]>([]);
const conflictRows = ref<Record<string, unknown>[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const activeFilters = ref<Record<string, string>>({});
const pagination = ref<AdminPagination>({ page: 1, limit: 25, total: 0 });
const selectedRow = ref<Record<string, unknown> | null>(null);
const selectedAction = ref<ActionConfig | null>(null);
const drawerOpen = ref(false);

const columns: AdminColumn[] = [
  { key: 'sellerId', label: 'Satıcı' },
  { key: 'placementType', label: 'Yerleşim' },
  { key: 'status', label: 'Durum', format: 'status' },
  { key: 'amount', label: 'Tutar', format: 'money' },
  { key: 'startsAt', label: 'Başlangıç', format: 'date' },
  { key: 'endsAt', label: 'Bitiş', format: 'date' },
];

const filters = computed<AdminFilter[]>(() => [
  { key: 'status', label: 'Durum', type: 'select', value: activeFilters.value.status ?? '', options: statusOptions },
  { key: 'placementType', label: 'Yerleşim', type: 'select', value: activeFilters.value.placementType ?? '', options: placementOptions },
  { key: 'sellerId', label: "Satıcı ID'si", value: activeFilters.value.sellerId ?? '' },
]);

const statusOptions = [
  { label: 'Yönetici incelemesi', value: 'ADMIN_REVIEW' },
  { label: 'Onaylandı', value: 'APPROVED' },
  { label: 'Yayımlandı', value: 'PUBLISHED' },
  { label: 'Reddedildi', value: 'REJECTED' },
];

const placementOptions = [
  { label: 'Anasayfa kahraman alanı', value: 'HOMEPAGE_HERO' },
  { label: 'Kategori vitrini', value: 'CATEGORY_SHOWCASE' },
  { label: 'Arama sponsorlu', value: 'SEARCH_SPONSORED' },
];

const scheduleFields: DrawerField[] = [
  { key: 'startsAt', label: 'Başlangıç tarihi', required: true },
  { key: 'endsAt', label: 'Bitiş tarihi', required: true },
  { key: 'slotKey', label: 'Slot anahtarı' },
];

const actions: ActionConfig[] = [
  { key: 'approve', label: 'Onayla', icon: 'pi pi-check', tone: 'primary', method: 'patch', endpoint: (id) => `/admin/ads/requests/${id}/approve`, fields: scheduleFields },
  { key: 'reject', label: 'Reddet', icon: 'pi pi-times', tone: 'danger', method: 'patch', endpoint: (id) => `/admin/ads/requests/${id}/reject` },
  { key: 'publish', label: 'Yayınla', icon: 'pi pi-send', method: 'patch', endpoint: (id) => `/admin/ads/requests/${id}/publish` },
];

const drawerTitle = computed(() => selectedAction.value?.label ?? 'Reklam işlemi');
const drawerFields = computed(() => selectedAction.value?.fields ?? []);

function setPage(page: number) {
  pagination.value = { ...pagination.value, page };
  void loadRequests();
}

function setFilters(filtersValue: Record<string, string>) {
  activeFilters.value = filtersValue;
  pagination.value = { ...pagination.value, page: 1 };
  void loadAll();
}

function openAction(action: AdminTableAction, row: Record<string, unknown>) {
  selectedAction.value = action as ActionConfig;
  selectedRow.value = row;
  drawerOpen.value = true;
}

function closeDrawer() {
  drawerOpen.value = false;
  selectedAction.value = null;
  selectedRow.value = null;
}

async function confirmAction(payload: DrawerConfirmPayload) {
  const id = String(selectedRow.value?.id ?? '');
  if (!id || !selectedAction.value) return;
  try {
    await adminApi.patch(selectedAction.value.endpoint(id), {
      reason: payload.reason,
      ...payload.values,
    });
    closeDrawer();
    await loadAll();
  } catch (actionError) {
    error.value = toApiMessage(actionError);
  }
}

async function loadRequests() {
  loading.value = true;
  error.value = null;
  try {
    const response = await adminApi.get<ApiListResponse>('/admin/ads', {
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

async function loadSlots() {
  const params = activeFilters.value;
  const [calendar, conflicts] = await Promise.all([
    adminApi.get('/admin/ads/slot-calendar', { params }),
    adminApi.get('/admin/ads/slot-conflicts', { params }),
  ]);
  calendarRows.value = Array.isArray(calendar.data.items) ? calendar.data.items : [];
  conflictRows.value = Array.isArray(conflicts.data.items) ? conflicts.data.items : [];
}

async function loadAll() {
  await Promise.all([loadRequests(), loadSlots()]);
}

onMounted(loadAll);
</script>
