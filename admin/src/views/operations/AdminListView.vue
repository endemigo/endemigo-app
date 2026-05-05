<template>
  <section class="field-grid">
    <header class="page-header">
      <div>
        <h1>{{ title }}</h1>
        <p>{{ readOnly ? 'Salt okunur operasyon listesi' : 'Kontrollü yönetici işlemleri' }}</p>
      </div>
      <button
        v-if="resource === 'categories'"
        class="button primary"
        type="button"
        @click="openAction(createCategoryAction)"
      >
        <i class="pi pi-plus" aria-hidden="true" />
        Yeni kategori
      </button>
    </header>

    <AdminDataTable
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :pagination="pagination"
      :filters="filters"
      :actions="rowActions"
      @page="setPage"
      @filter="setFilters"
      @action="openAction"
      @row-click="goToDetail"
    />

    <p v-if="error" class="error-text">{{ error }}</p>

    <AdminActionDrawer
      :open="drawerOpen"
      :title="drawerTitle"
      :fields="drawerFields"
      :reason-required="true"
      :confirm-label="drawerConfirmLabel"
      @close="closeDrawer"
      @confirm="confirmAction"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
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

type ActionMethod = 'delete' | 'patch' | 'post';

interface ActionConfig extends AdminTableAction {
  method: ActionMethod;
  path: (id: string | null) => string;
  fields?: (row: Record<string, unknown> | null) => DrawerField[];
  confirmLabel?: string;
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
const loading = ref(false);
const error = ref<string | null>(null);
const activeFilters = ref<Record<string, string>>({});
const pagination = ref<AdminPagination>({ page: 1, limit: 25, total: 0 });
const drawerOpen = ref(false);
const selectedRow = ref<Record<string, unknown> | null>(null);
const selectedAction = ref<ActionConfig | null>(null);

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
  { key: 'sortOrder', label: 'Sıralama', type: 'number', value: getString(row, 'sortOrder') },
];

const createCategoryAction: ActionConfig = {
  key: 'createCategory',
  label: 'Oluştur',
  icon: 'pi pi-plus',
  tone: 'primary',
  method: 'post',
  path: () => '/admin/categories',
  fields: categoryFields,
  confirmLabel: 'Kategori oluştur',
};

const resourceConfigs: Record<string, ResourceConfig> = {
  users: {
    detailBase: 'users',
    columns: [
      { key: 'email', label: 'E-posta' },
      { key: 'role', label: 'Rol', format: 'status' },
      { key: 'isActive', label: 'Aktif' },
      { key: 'createdAt', label: 'Oluşturuldu', format: 'date' },
    ],
    actions: [
      {
        key: 'restrict',
        label: 'Kısıtla',
        icon: 'pi pi-ban',
        tone: 'danger',
        method: 'patch',
        path: (id) => `/admin/users/${id}/restrict`,
      },
      {
        key: 'reactivate',
        label: 'Yeniden etkinleştir',
        icon: 'pi pi-check-circle',
        tone: 'primary',
        method: 'patch',
        path: (id) => `/admin/users/${id}/reactivate`,
      },
    ],
  },
  sellers: {
    detailBase: 'sellers',
    columns: [
      { key: 'userId', label: 'Kullanıcı', format: 'id' },
      { key: 'status', label: 'Durum', format: 'status' },
      { key: 'approvedAt', label: 'Onaylandı', format: 'date' },
      { key: 'createdAt', label: 'Oluşturuldu', format: 'date' },
    ],
    actions: [
      {
        key: 'approve',
        label: 'Onayla',
        icon: 'pi pi-check',
        tone: 'primary',
        method: 'patch',
        path: (id) => `/admin/sellers/${id}/approve`,
      },
      {
        key: 'reject',
        label: 'Reddet',
        icon: 'pi pi-times',
        tone: 'danger',
        method: 'patch',
        path: (id) => `/admin/sellers/${id}/reject`,
      },
    ],
  },
  products: {
    detailBase: 'products',
    columns: [
      { key: 'title', label: 'Başlık' },
      { key: 'status', label: 'Durum', format: 'status' },
      { key: 'sellerId', label: 'Satıcı', format: 'id' },
      { key: 'createdAt', label: 'Oluşturuldu', format: 'date' },
    ],
    actions: [
      {
        key: 'remove',
        label: 'Kaldır',
        icon: 'pi pi-trash',
        tone: 'danger',
        method: 'patch',
        path: (id) => `/admin/products/${id}/remove`,
      },
    ],
  },
  categories: {
    detailBase: 'categories',
    columns: [
      { key: 'name', label: 'Ad' },
      { key: 'slug', label: 'Kısa ad' },
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
      },
      {
        key: 'deleteCategory',
        label: 'Devre dışı bırak',
        icon: 'pi pi-trash',
        tone: 'danger',
        method: 'delete',
        path: (id) => `/admin/categories/${id}`,
        confirmLabel: 'Kategori devre dışı bırak',
      },
    ],
  },
  auctions: {
    detailBase: 'auctions',
    columns: [
      { key: 'productId', label: 'Ürün', format: 'id' },
      { key: 'status', label: 'Durum', format: 'status' },
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
      { key: 'auctionId', label: 'Müzayede', format: 'id' },
      { key: 'userId', label: 'Kullanıcı', format: 'id' },
      { key: 'amount', label: 'Tutar', format: 'money' },
      { key: 'createdAt', label: 'Oluşturuldu', format: 'date' },
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
const filters = computed<AdminFilter[]>(() => [
  { key: 'search', label: 'Arama', type: 'search', value: activeFilters.value.search ?? '' },
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
]);
const drawerTitle = computed(() => selectedAction.value?.label ?? 'Yönetici işlemi');
const drawerFields = computed(() => selectedAction.value?.fields?.(selectedRow.value) ?? []);
const drawerConfirmLabel = computed(() => selectedAction.value?.confirmLabel ?? 'Onayla');

function getString(row: Record<string, unknown> | null, key: string): string {
  const value = row?.[key];
  return value === null || value === undefined ? '' : String(value);
}

function getRowId(row: Record<string, unknown> | null): string | null {
  const value = row?.id;
  return value === null || value === undefined ? null : String(value);
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

function openAction(action: AdminTableAction, row?: Record<string, unknown>) {
  const actionConfig = action as ActionConfig;
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
  const body: Record<string, string> = { reason: payload.reason, ...payload.values };

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
    const response = await adminApi.get<ApiListResponse>(endpoint.value, {
      params: {
        page: pagination.value.page,
        limit: pagination.value.limit,
        ...activeFilters.value,
      },
    });
    rows.value = Array.isArray(response.data.items) ? response.data.items : [];
    pagination.value = response.data.pagination ?? pagination.value;
  } catch (loadError) {
    error.value = toApiMessage(loadError);
    rows.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadCategoryParentOptions() {
  if (props.resource !== 'categories') return;
  try {
    const response = await adminApi.get<ApiListResponse>('/admin/categories', {
      params: { page: 1, limit: 100 },
    });
    const categoryRows = Array.isArray(response.data.items) ? response.data.items : [];
    categoryParentOptions.value = categoryRows.map((item) => ({
      label: String(item.name ?? item.slug ?? item.id ?? 'Kategori'),
      value: String(item.id ?? ''),
    }));
  } catch {
    categoryParentOptions.value = [];
  }
}

watch(
  () => props.resource,
  () => {
    activeFilters.value = {};
    pagination.value = { page: 1, limit: 25, total: 0 };
    void loadCategoryParentOptions();
    void loadRows();
  },
);

onMounted(loadRows);
onMounted(loadCategoryParentOptions);
</script>
