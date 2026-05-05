<template>
  <section class="field-grid">
    <header class="page-header">
      <div>
        <h1>Ayarlar</h1>
        <p>Gerekçeli yönetici değişiklikleriyle operasyon ayarları</p>
      </div>
      <button class="button" type="button" @click="loadRows">
        <i class="pi pi-refresh" aria-hidden="true" />
        Yenile
      </button>
    </header>

    <AdminDataTable
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :pagination="pagination"
      :actions="actions"
      @action="openAction"
    />

    <p v-if="error" class="error-text">{{ error }}</p>

    <AdminActionDrawer
      :open="drawerOpen"
      title="Ayarı düzenle"
      :fields="fields"
      confirm-label="Kaydet"
      @close="closeDrawer"
      @confirm="confirmAction"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AdminActionDrawer, { type DrawerConfirmPayload, type DrawerField } from '../../components/AdminActionDrawer.vue';
import AdminDataTable, { type AdminColumn, type AdminPagination, type AdminTableAction } from '../../components/AdminDataTable.vue';
import { adminApi, toApiMessage } from '../../services/api';

const rows = ref<Record<string, unknown>[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const drawerOpen = ref(false);
const selectedRow = ref<Record<string, unknown> | null>(null);
const pagination = ref<AdminPagination>({ page: 1, limit: 100, total: 0 });

const columns: AdminColumn[] = [
  { key: 'key', label: 'Anahtar' },
  { key: 'description', label: 'Açıklama' },
  { key: 'value', label: 'Değer' },
  { key: 'isSensitive', label: 'Gizli' },
];

const actions: AdminTableAction[] = [
  { key: 'edit', label: 'Düzenle', icon: 'pi pi-pencil', tone: 'primary' },
];

const fields = computed<DrawerField[]>(() => [
  {
    key: 'valueJson',
    label: 'Değer JSON',
    type: 'textarea',
    required: true,
    value: JSON.stringify(selectedRow.value?.value ?? {}, null, 2),
  },
]);

function openAction(_action: AdminTableAction, row: Record<string, unknown>) {
  selectedRow.value = row;
  drawerOpen.value = true;
}

function closeDrawer() {
  drawerOpen.value = false;
  selectedRow.value = null;
}

async function confirmAction(payload: DrawerConfirmPayload) {
  const key = String(selectedRow.value?.key ?? '');
  if (!key) return;
  try {
    await adminApi.patch(`/admin/settings/${key}`, {
      value: JSON.parse(payload.values.valueJson),
      reason: payload.reason,
    });
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
    const response = await adminApi.get('/admin/settings');
    rows.value = response.data.items ?? [];
    pagination.value = { page: 1, limit: rows.value.length || 1, total: rows.value.length };
  } catch (loadError) {
    error.value = toApiMessage(loadError);
    rows.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(loadRows);
</script>
