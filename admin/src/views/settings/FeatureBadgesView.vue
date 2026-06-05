<template>
  <section class="field-grid">
    <header class="page-header">
      <div>
        <h1>Özellik Rozetleri</h1>
        <p>Ürünler için özellik rozetlerinin (Vegan, Bio, Organik, Helal vb.) yönetimi</p>
      </div>
      <button class="button primary" type="button" @click="openCreate">
        <i class="pi pi-plus" aria-hidden="true" />
        Yeni Ekle
      </button>
    </header>

    <!-- Data Table -->
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
      <template #cell-logoUrl="{ value }">
        <div class="logo-cell">
          <img v-if="value" :src="value" alt="Logo" class="logo-img" />
          <div v-else class="no-logo-placeholder">
            <i class="pi pi-image" />
          </div>
        </div>
      </template>

      <template #cell-isActive="{ value }">
        <span class="status-badge" :class="{ 'is-active': value }">
          <i :class="value ? 'pi pi-check-circle' : 'pi pi-times-circle'" />
          {{ value ? 'Aktif' : 'Pasif' }}
        </span>
      </template>
    </AdminDataTable>

    <p v-if="error" class="error-text">{{ error }}</p>

    <!-- Action Drawer Form -->
    <AdminActionDrawer
      :open="drawerOpen"
      :title="isEditMode ? 'Özellik Rozetini Düzenle' : 'Yeni Özellik Rozeti Ekle'"
      :fields="fields"
      confirm-label="Kaydet"
      presentation="modal"
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
import { adminApi, toApiMessage } from '../../services/api';

const rows = ref<Record<string, unknown>[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const drawerOpen = ref(false);
const isEditMode = ref(false);
const selectedRow = ref<Record<string, any> | null>(null);

const pagination = ref<AdminPagination>({
  page: 1,
  limit: 25,
  total: 0,
});

const filters = ref<AdminFilter[]>([
  {
    key: 'search',
    label: 'İsim veya Kod ile Ara',
    value: '',
  },
]);

const columns: AdminColumn[] = [
  { key: 'logoUrl', label: 'Logo' },
  { key: 'name', label: 'İsim (TR)' },
  { key: 'nameEn', label: 'İsim (EN)' },
  { key: 'code', label: 'Sistem Kodu (Eşleşme için)' },
  { key: 'isActive', label: 'Durum' },
  { key: 'createdAt', label: 'Eklenme', format: 'date' },
];

const tableActions: AdminTableAction[] = [
  { key: 'edit', label: 'Düzenle', icon: 'pi pi-pencil', tone: 'primary' },
  { key: 'delete', label: 'Sil / Pasifleştir', icon: 'pi pi-trash', tone: 'danger' },
];

const fields = computed<DrawerField[]>(() => [
  {
    key: 'name',
    label: 'Özellik Adı (TR) *',
    type: 'text',
    required: true,
    value: selectedRow.value?.name ?? '',
  },
  {
    key: 'nameEn',
    label: 'Özellik Adı (EN) *',
    type: 'text',
    required: true,
    value: selectedRow.value?.nameEn ?? '',
  },
  {
    key: 'code',
    label: 'Sistem Kodu (Örn: VEGAN, ORGANIC) *',
    type: 'text',
    required: true,
    value: selectedRow.value?.code ?? '',
  },
  {
    key: 'logoUrl',
    label: 'Logo Görseli',
    type: 'image',
    required: false,
    value: selectedRow.value?.logoUrl ?? '',
  },
  {
    key: 'isActive',
    label: 'Durum *',
    type: 'select',
    required: true,
    value: selectedRow.value ? String(selectedRow.value.isActive) : 'true',
    options: [
      { label: 'Aktif (Listede Göster)', value: 'true' },
      { label: 'Pasif (Gizle)', value: 'false' },
    ],
  },
]);

onMounted(loadRows);

async function loadRows() {
  loading.value = true;
  error.value = null;
  try {
    const searchParam = filters.value.find((f) => f.key === 'search')?.value || '';
    const response = await adminApi.get('/admin/feature-badges', {
      params: {
        page: pagination.value.page,
        limit: pagination.value.limit,
        search: searchParam || undefined,
      },
    });
    rows.value = response.data.items ?? [];
    pagination.value.total = response.data.total ?? response.data.items?.length ?? 0;
  } catch (err) {
    error.value = toApiMessage(err);
    rows.value = [];
  } finally {
    loading.value = false;
  }
}

function setPage(page: number) {
  pagination.value.page = page;
  void loadRows();
}

function setFilters(filtersVal: Record<string, string>) {
  filters.value.forEach((f) => {
    if (filtersVal[f.key] !== undefined) {
      f.value = filtersVal[f.key];
    }
  });
  pagination.value.page = 1;
  void loadRows();
}

function openCreate() {
  isEditMode.value = false;
  selectedRow.value = null;
  drawerOpen.value = true;
}

function closeDrawer() {
  drawerOpen.value = false;
  selectedRow.value = null;
}

async function handleTableAction(action: AdminTableAction, row: Record<string, unknown>) {
  if (action.key === 'edit') {
    isEditMode.value = true;
    selectedRow.value = row;
    drawerOpen.value = true;
  } else if (action.key === 'delete') {
    const confirmDelete = confirm(`"${row.name}" özellik rozetini pasifleştirmek istediğinizden emin misiniz?`);
    if (!confirmDelete) return;

    const auditReason = prompt('Lütfen silme / pasifleştirme gerekçesini giriniz:');
    if (!auditReason) return;

    try {
      loading.value = true;
      await adminApi.delete(`/admin/feature-badges/${row.id}`, {
        data: { reason: auditReason },
      });
      await loadRows();
    } catch (err) {
      alert(`Hata: ${toApiMessage(err)}`);
    } finally {
      loading.value = false;
    }
  }
}

async function confirmAction(payload: DrawerConfirmPayload) {
  try {
    loading.value = true;
    const body = {
      name: payload.values.name,
      nameEn: payload.values.nameEn,
      code: payload.values.code ? String(payload.values.code).trim().toUpperCase() : null,
      logoUrl: payload.values.logoUrl || null,
      isActive: payload.values.isActive === 'true',
      reason: payload.reason,
    };

    if (isEditMode.value && selectedRow.value) {
      await adminApi.patch(`/admin/feature-badges/${selectedRow.value.id}`, body);
    } else {
      await adminApi.post('/admin/feature-badges', body);
    }

    closeDrawer();
    await loadRows();
  } catch (err) {
    error.value = toApiMessage(err);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.logo-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: var(--bg-soft);
  border: 1px solid var(--border-soft);
  overflow: hidden;
}

.logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 2px;
}

.no-logo-placeholder {
  color: var(--text-muted);
  font-size: 18px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}

.status-badge.is-active {
  color: #22c55e;
}
</style>
