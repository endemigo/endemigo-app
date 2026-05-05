<template>
  <section class="field-grid">
    <header class="page-header">
      <div>
        <h1>{{ title }}</h1>
        <p>{{ resource }} / {{ id }}</p>
      </div>
      <div class="toolbar">
        <button class="button" type="button" @click="router.back()">
          <i class="pi pi-arrow-left" aria-hidden="true" />
          Geri
        </button>
        <button
          v-for="action in rowActions"
          :key="action.key"
          class="button"
          :class="action.tone"
          type="button"
          @click="openAction(action)"
        >
          <i :class="action.icon ?? 'pi pi-play'" aria-hidden="true" />
          {{ action.label }}
        </button>
      </div>
    </header>

    <section class="panel">
      <nav class="tabs" aria-label="Detay sekmeleri">
        <button
          v-for="tab in tabs"
          :key="tab"
          class="tab-button"
          :class="{ 'is-active': activeTab === tab }"
          type="button"
          @click="activeTab = tab"
        >
          {{ tab }}
        </button>
      </nav>

      <div class="panel-body">
        <div v-if="loading" class="muted">Detay yükleniyor...</div>
        <pre v-else-if="activeTab === 'Genel Bakış'" class="json-box">{{ pretty(overview) }}</pre>
        <div v-else-if="activeTab === 'Zaman Çizelgesi'" class="timeline">
          <p v-if="timeline.length === 0" class="muted">Zaman çizelgesi kaydı yok.</p>
          <article v-for="event in timeline" :key="timelineKey(event)" class="timeline-item">
            <strong>{{ event.label }}</strong>
            <p class="muted">{{ formatDate(event.createdAt) }}</p>
          </article>
        </div>
        <pre v-else-if="activeTab === 'İlgili Kayıtlar'" class="json-box">{{ pretty(relatedRecords) }}</pre>
        <AdminAuditTimeline v-else :events="auditEvents" />
      </div>
    </section>

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
import AdminAuditTimeline, { type AuditEvent } from '../../components/AdminAuditTimeline.vue';
import type { AdminTableAction } from '../../components/AdminDataTable.vue';
import { adminApi, toApiMessage, type ApiEnvelope } from '../../services/api';

type DetailTab = 'Genel Bakış' | 'Zaman Çizelgesi' | 'İlgili Kayıtlar' | 'Denetim';
type ActionMethod = 'delete' | 'patch' | 'post';

interface DetailResponse extends ApiEnvelope {
  resource: string;
  overview: Record<string, unknown>;
  timeline: TimelineEvent[];
  relatedRecords: Record<string, unknown>;
  audit: {
    targetType: string;
    targetId: string;
  };
}

interface AuditListResponse extends ApiEnvelope {
  items: AuditEvent[];
}

interface TimelineEvent {
  id?: string;
  label: string;
  createdAt: string;
}

interface ActionConfig extends AdminTableAction {
  method: ActionMethod;
  path: (id: string) => string;
  fields?: (row: Record<string, unknown>) => DrawerField[];
  confirmLabel?: string;
}

const props = withDefaults(
  defineProps<{
    resource: string;
    id: string;
    title: string;
    readOnly?: boolean;
  }>(),
  {
    readOnly: false,
  },
);

const router = useRouter();
const tabs: DetailTab[] = ['Genel Bakış', 'Zaman Çizelgesi', 'İlgili Kayıtlar', 'Denetim'];
const activeTab = ref<DetailTab>('Genel Bakış');
const loading = ref(false);
const error = ref<string | null>(null);
const overview = ref<Record<string, unknown>>({});
const timeline = ref<TimelineEvent[]>([]);
const relatedRecords = ref<Record<string, unknown>>({});
const auditTarget = ref<{ targetType: string; targetId: string } | null>(null);
const auditEvents = ref<AuditEvent[]>([]);
const drawerOpen = ref(false);
const selectedAction = ref<ActionConfig | null>(null);

const categoryFields = (row: Record<string, unknown>): DrawerField[] => [
  { key: 'name', label: 'Ad', required: true, value: getString(row, 'name') },
  { key: 'slug', label: 'Kısa ad', value: getString(row, 'slug') },
  { key: 'description', label: 'Açıklama', type: 'textarea', value: getString(row, 'description') },
  { key: 'imageUrl', label: 'Görsel URL', value: getString(row, 'imageUrl') },
  { key: 'parentId', label: 'Üst ID', value: getString(row, 'parentId') },
  { key: 'sortOrder', label: 'Sıralama', type: 'number', value: getString(row, 'sortOrder') },
];

const actionConfigs: Record<string, ActionConfig[]> = {
  users: [
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
  sellers: [
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
  products: [
    {
      key: 'remove',
      label: 'Kaldır',
      icon: 'pi pi-trash',
      tone: 'danger',
      method: 'patch',
      path: (id) => `/admin/products/${id}/remove`,
    },
  ],
  categories: [
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
  auctions: [
    {
      key: 'cancel',
      label: 'İptal et',
      icon: 'pi pi-stop-circle',
      tone: 'danger',
      method: 'patch',
      path: (id) => `/admin/auctions/${id}/cancel`,
    },
  ],
  orders: [
    {
      key: 'adminReview',
      label: 'İncele',
      icon: 'pi pi-eye',
      method: 'patch',
      path: (id) => `/admin/orders/${id}/admin-review`,
    },
  ],
  payments: [
    {
      key: 'adminReview',
      label: 'İncele',
      icon: 'pi pi-eye',
      method: 'patch',
      path: (id) => `/admin/payments/${id}/admin-review`,
    },
  ],
  bids: [],
  'payout-requests': [
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
};

const rowActions = computed(() => (props.readOnly ? [] : actionConfigs[props.resource] ?? []));
const drawerTitle = computed(() => selectedAction.value?.label ?? 'Yönetici işlemi');
const drawerFields = computed(() => selectedAction.value?.fields?.(overview.value) ?? []);
const drawerConfirmLabel = computed(() => selectedAction.value?.confirmLabel ?? 'Onayla');
const endpoint = computed(() => `/admin/${props.resource}/${props.id}`);

function getString(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  return value === null || value === undefined ? '' : String(value);
}

function openAction(action: AdminTableAction) {
  selectedAction.value = action as ActionConfig;
  drawerOpen.value = true;
}

function closeDrawer() {
  drawerOpen.value = false;
  selectedAction.value = null;
}

async function confirmAction(payload: DrawerConfirmPayload) {
  if (!selectedAction.value) return;

  const body: Record<string, string> = { reason: payload.reason, ...payload.values };

  try {
    if (selectedAction.value.method === 'delete') {
      await adminApi.delete(selectedAction.value.path(props.id), { data: body });
    } else if (selectedAction.value.method === 'post') {
      await adminApi.post(selectedAction.value.path(props.id), body);
    } else {
      await adminApi.patch(selectedAction.value.path(props.id), body);
    }
    closeDrawer();
    await loadDetail();
  } catch (actionError) {
    error.value = toApiMessage(actionError);
  }
}

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function timelineKey(event: TimelineEvent): string {
  return event.id ?? `${event.label}-${event.createdAt}`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('tr-TR');
}

async function loadAudit() {
  if (!auditTarget.value) return;
  try {
    const response = await adminApi.get<AuditListResponse>('/admin/audit-logs', {
      params: {
        targetType: auditTarget.value.targetType,
        targetId: auditTarget.value.targetId,
      },
    });
    auditEvents.value = Array.isArray(response.data.items) ? response.data.items : [];
  } catch {
    auditEvents.value = [];
  }
}

async function loadDetail() {
  loading.value = true;
  error.value = null;

  try {
    const response = await adminApi.get<DetailResponse>(endpoint.value);
    overview.value = response.data.overview ?? {};
    timeline.value = Array.isArray(response.data.timeline) ? response.data.timeline : [];
    relatedRecords.value = response.data.relatedRecords ?? {};
    auditTarget.value = response.data.audit ?? null;
    await loadAudit();
  } catch (loadError) {
    error.value = toApiMessage(loadError);
  } finally {
    loading.value = false;
  }
}

watch(
  () => [props.resource, props.id],
  () => {
    activeTab.value = 'Genel Bakış';
    void loadDetail();
  },
);

onMounted(loadDetail);
</script>
