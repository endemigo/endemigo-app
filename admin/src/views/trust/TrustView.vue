<template>
  <section class="field-grid">
    <header class="page-header">
      <div>
        <h1>Güven</h1>
        <p>İşaretler, kısıtlamalar, inceleme işlemleri ve çözümler</p>
      </div>
      <button class="button primary" type="button" @click="openCreateFlag">
        <i class="pi pi-flag" aria-hidden="true" />
        İşaretle
      </button>
    </header>

    <div class="tabs">
      <button
        class="tab-button"
        :class="{ 'is-active': activeTab === 'flags' }"
        type="button"
        @click="setTab('flags')"
      >
        İşaretler
      </button>
      <button
        class="tab-button"
        :class="{ 'is-active': activeTab === 'restrictions' }"
        type="button"
        @click="setTab('restrictions')"
      >
        Kısıtlamalar
      </button>
    </div>

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

    <p v-if="error" class="error-text">{{ error }}</p>

    <AdminActionDrawer
      :open="drawerOpen"
      :title="drawerTitle"
      :fields="drawerFields"
      confirm-label="Onayla"
      @close="closeDrawer"
      @confirm="confirmAction"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AdminActionDrawer, { type DrawerConfirmPayload, type DrawerField } from '../../components/AdminActionDrawer.vue';
import AdminDataTable, { type AdminColumn, type AdminFilter, type AdminPagination, type AdminTableAction } from '../../components/AdminDataTable.vue';
import { adminApi, toApiMessage } from '../../services/api';

type TrustTab = 'flags' | 'restrictions';

interface ActionConfig extends AdminTableAction {
  kind: 'createFlag' | 'reviewFlag' | 'resolveRestriction' | 'applyRestriction';
  fields: DrawerField[];
}

const rows = ref<Record<string, unknown>[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const activeTab = ref<TrustTab>('flags');
const activeFilters = ref<Record<string, string>>({});
const pagination = ref<AdminPagination>({ page: 1, limit: 25, total: 0 });
const drawerOpen = ref(false);
const selectedRow = ref<Record<string, unknown> | null>(null);
const selectedAction = ref<ActionConfig | null>(null);

const flagColumns: AdminColumn[] = [
  { key: 'targetUserId', label: 'Hedef' },
  { key: 'sellerId', label: 'Satıcı' },
  { key: 'flagType', label: 'Tür' },
  { key: 'severity', label: 'Şiddet' },
  { key: 'status', label: 'Durum', format: 'status' },
  { key: 'createdAt', label: 'Oluşturuldu', format: 'date' },
];

const restrictionColumns: AdminColumn[] = [
  { key: 'targetUserId', label: 'Hedef' },
  { key: 'sellerId', label: 'Satıcı' },
  { key: 'restrictionType', label: 'Kısıtlama' },
  { key: 'status', label: 'Durum', format: 'status' },
  { key: 'startsAt', label: 'Başlangıç', format: 'date' },
  { key: 'endsAt', label: 'Bitiş', format: 'date' },
];

const createFlagFields: DrawerField[] = [
  { key: 'targetUserId', label: 'Hedef kullanıcı ID', required: true },
  { key: 'sellerId', label: 'Satıcı ID' },
  { key: 'flagType', label: 'İşaret türü', type: 'select', required: true, options: [
    { label: 'IP/Cihaz', value: 'IP_DEVICE' },
    { label: 'Telefon', value: 'PHONE' },
    { label: 'Platform dışı', value: 'OFF_PLATFORM' },
    { label: 'Ödeme', value: 'PAYMENT' },
    { label: 'Sipariş', value: 'ORDER' },
    { label: 'Manuel', value: 'MANUAL' },
  ] },
  { key: 'severity', label: 'Şiddet', type: 'number', required: true, value: '3' },
  { key: 'evidenceJson', label: 'Kanıt JSON', type: 'textarea', required: true, value: '{}' },
];

const restrictionOptions = [
  { label: 'Uyarı', value: 'WARNING' },
  { label: 'Reklam/kampanya kilidi', value: 'ADS_CAMPAIGNS_LOCK' },
  { label: 'Ödeme manuel inceleme', value: 'PAYOUT_MANUAL_REVIEW' },
  { label: 'Satış kısıtlandı', value: 'SELLING_RESTRICTED' },
  { label: 'Üyelik iptal edildi', value: 'MEMBERSHIP_CANCELLED' },
  { label: 'Hesap askıya alındı', value: 'ACCOUNT_SUSPENDED' },
];

const reviewFields: DrawerField[] = [
  { key: 'decision', label: 'Karar', type: 'select', required: true, options: [{ label: 'Çöz', value: 'RESOLVE' }, { label: 'Reddet', value: 'DISMISS' }] },
  { key: 'restrictionType', label: 'Kısıtlama', type: 'select', options: restrictionOptions },
  { key: 'endsAt', label: 'Bitiş tarihi' },
];

const applyRestrictionFields: DrawerField[] = [
  { key: 'targetUserId', label: 'Hedef kullanıcı ID', required: true },
  { key: 'sellerId', label: 'Satıcı ID' },
  { key: 'restrictionType', label: 'Kısıtlama', type: 'select', required: true, options: restrictionOptions },
  { key: 'endsAt', label: 'Bitiş tarihi' },
];

const resolveFields: DrawerField[] = [];

const columns = computed(() => activeTab.value === 'flags' ? flagColumns : restrictionColumns);
const filters = computed<AdminFilter[]>(() => [
  { key: activeTab.value === 'flags' ? 'status' : 'restrictionStatus', label: 'Durum', type: 'select', value: activeFilters.value.status ?? activeFilters.value.restrictionStatus ?? '', options: [
    { label: 'İnceleme bekliyor', value: 'PENDING_REVIEW' },
    { label: 'Aktif', value: 'ACTIVE' },
    { label: 'Çözüldü', value: 'RESOLVED' },
    { label: 'Reddedildi', value: 'DISMISSED' },
  ] },
  { key: 'sellerId', label: 'Satıcı ID', value: activeFilters.value.sellerId ?? '' },
]);
const actions = computed<ActionConfig[]>(() =>
  activeTab.value === 'flags'
    ? [
        { key: 'review', label: 'İncele', icon: 'pi pi-check-square', tone: 'primary', kind: 'reviewFlag', fields: reviewFields },
        { key: 'restrict', label: 'Kısıtla', icon: 'pi pi-ban', tone: 'danger', kind: 'applyRestriction', fields: applyRestrictionFields },
      ]
    : [{ key: 'resolve', label: 'Çöz', icon: 'pi pi-check', tone: 'primary', kind: 'resolveRestriction', fields: resolveFields }],
);
const drawerTitle = computed(() => selectedAction.value?.label ?? 'Güven işlemi');
const drawerFields = computed(() => selectedAction.value?.fields ?? []);

function setTab(tab: TrustTab) {
  activeTab.value = tab;
  activeFilters.value = {};
  pagination.value = { page: 1, limit: 25, total: 0 };
  void loadRows();
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

function openCreateFlag() {
  selectedRow.value = null;
  selectedAction.value = { key: 'createFlag', label: 'İşaret oluştur', icon: 'pi pi-flag', kind: 'createFlag', fields: createFlagFields };
  drawerOpen.value = true;
}

function openAction(action: AdminTableAction, row: Record<string, unknown>) {
  selectedRow.value = row;
  selectedAction.value = action as ActionConfig;
  drawerOpen.value = true;
}

function closeDrawer() {
  drawerOpen.value = false;
  selectedAction.value = null;
  selectedRow.value = null;
}

async function confirmAction(payload: DrawerConfirmPayload) {
  if (!selectedAction.value) return;
  try {
    if (selectedAction.value.kind === 'createFlag') {
      await adminApi.post('/admin/trust/flags', {
        targetUserId: payload.values.targetUserId,
        sellerId: payload.values.sellerId || undefined,
        flagType: payload.values.flagType,
        severity: Number(payload.values.severity),
        evidence: JSON.parse(payload.values.evidenceJson),
        reason: payload.reason,
      });
    } else if (selectedAction.value.kind === 'reviewFlag') {
      await adminApi.patch(`/admin/trust/flags/${selectedRow.value?.id}/review`, {
        decision: payload.values.decision,
        restrictionType: payload.values.restrictionType || undefined,
        endsAt: payload.values.endsAt || undefined,
        reason: payload.reason,
      });
    } else if (selectedAction.value.kind === 'applyRestriction') {
      await adminApi.post('/admin/trust/restrictions', {
        targetUserId: payload.values.targetUserId || selectedRow.value?.targetUserId,
        sellerId: payload.values.sellerId || selectedRow.value?.sellerId || undefined,
        restrictionType: payload.values.restrictionType,
        endsAt: payload.values.endsAt || undefined,
        reason: payload.reason,
      });
    } else {
      await adminApi.patch(`/admin/trust/restrictions/${selectedRow.value?.id}/resolve`, {
        reason: payload.reason,
      });
    }
    closeDrawer();
    await loadRows();
  } catch (actionError) {
    error.value = toApiMessage(actionError);
  }
}

async function loadRows() {
  loading.value = true;
  error.value = null;
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
      ...activeFilters.value,
      ...(activeTab.value === 'restrictions' && !activeFilters.value.restrictionStatus ? { restrictionStatus: 'ACTIVE' } : {}),
    };
    const response = await adminApi.get('/admin/reports/trust', { params });
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
