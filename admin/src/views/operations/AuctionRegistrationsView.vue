<template>
  <section class="field-grid">
    <header class="page-header">
      <div>
        <h1>Katılım Başvuruları</h1>
        <p>Müzayedeye teklif verebilmek için yapılan kayıt başvurularını yönetin</p>
      </div>
      <div class="toolbar">
        <button class="button ghost" type="button" :disabled="loading" @click="loadList">
          <i :class="['pi', loading ? 'pi-spin pi-spinner' : 'pi-refresh']" />
          Yenile
        </button>
      </div>
    </header>

    <section class="panel">
      <nav class="tabs" aria-label="Başvuru durumları">
        <button
          v-for="tab in statusTabs"
          :key="tab.value"
          class="tab-button"
          :class="{ 'is-active': activeStatus === tab.value }"
          type="button"
          @click="selectStatus(tab.value)"
        >
          {{ tab.label }}
        </button>
      </nav>
    </section>

    <article class="panel">
      <div class="panel-header">
        <strong>Başvuru Listesi</strong>
        <span class="badge neutral">{{ pagination.total }} kayıt</span>
      </div>
      <p v-if="error" class="error-text">{{ error }}</p>
      <div class="table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Üye</th>
              <th>Hedef</th>
              <th>Teklif Limiti</th>
              <th>Başvuru Tarihi</th>
              <th>Durum</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6">Yükleniyor...</td>
            </tr>
            <tr v-else-if="items.length === 0">
              <td colspan="6">Başvuru bulunamadı.</td>
            </tr>
            <tr v-for="item in items" :key="item.id">
              <td>
                <div class="user-cell">
                  <strong>{{ userName(item.user) }}</strong>
                  <span class="muted">{{ item.user?.email ?? '-' }}</span>
                </div>
              </td>
              <td>
                <router-link
                  v-if="item.event"
                  :to="`/auction-events/${item.event.id}`"
                  class="target-link"
                >
                  {{ item.event.title }}
                </router-link>
                <router-link
                  v-else-if="item.auction"
                  :to="`/auctions/${item.auction.id}`"
                  class="target-link"
                >
                  LOT #{{ item.auction.lotNumber ?? item.auction.id.slice(0, 8) }}
                  <span v-if="item.auction.product?.title"> — {{ item.auction.product.title }}</span>
                </router-link>
                <span v-else class="muted">-</span>
              </td>
              <td>{{ formatLimit(item.user?.biddingLimit) }}</td>
              <td>{{ formatDate(item.createdAt) }}</td>
              <td>
                <span class="badge" :class="statusBadgeClass(item.status)">
                  {{ statusLabel(item.status) }}
                </span>
              </td>
              <td>
                <div class="toolbar">
                  <button
                    v-if="item.status !== 'APPROVED'"
                    class="button icon-only ghost primary"
                    type="button"
                    title="Onayla"
                    :disabled="updatingId === item.id"
                    @click="updateStatus(item, 'APPROVED')"
                  >
                    <i class="pi pi-check" aria-hidden="true" />
                  </button>
                  <button
                    v-if="item.status !== 'REJECTED'"
                    class="button icon-only danger"
                    type="button"
                    title="Reddet"
                    :disabled="updatingId === item.id"
                    @click="updateStatus(item, 'REJECTED')"
                  >
                    <i class="pi pi-times" aria-hidden="true" />
                  </button>
                  <button
                    v-if="item.user"
                    class="button icon-only ghost"
                    type="button"
                    title="Teklif limitini düzenle"
                    @click="openLimitModal(item.user)"
                  >
                    <i class="pi pi-wallet" aria-hidden="true" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="panel-footer">
        <span class="muted">Sayfa {{ pagination.page }} / {{ totalPages }}</span>
        <div class="toolbar">
          <button class="button" type="button" :disabled="pagination.page <= 1 || loading" @click="goPrevPage">Önceki</button>
          <button class="button" type="button" :disabled="pagination.page >= totalPages || loading" @click="goNextPage">Sonraki</button>
        </div>
      </div>
    </article>

    <!-- Teklif Limiti Modalı -->
    <div class="custom-modal-backdrop" v-if="limitModalUser">
      <div class="custom-modal-card">
        <header class="modal-header">
          <h4>Teklif Limiti Düzenle</h4>
          <button class="button icon-only ghost" type="button" @click="closeLimitModal">
            <i class="pi pi-times" />
          </button>
        </header>
        <div class="modal-body field-grid">
          <p class="muted">
            {{ userName(limitModalUser) }} — mevcut limit:
            <strong>{{ formatLimit(limitModalUser.biddingLimit) }}</strong>
          </p>
          <label class="field">
            <span>Yeni Limit (TL)</span>
            <input v-model.number="limitInput" class="input" type="number" min="0" step="1000" />
          </label>
          <p class="muted limit-hint">
            Depozitosuz manuel limit üst sınırı backend tarafından doğrulanır
            (min 250.000 TL veya 50.000 + depozito × 5).
          </p>
          <p v-if="limitError" class="error-text">{{ limitError }}</p>
        </div>
        <footer class="modal-footer">
          <button class="button ghost" type="button" @click="closeLimitModal">Vazgeç</button>
          <button
            class="button primary"
            type="button"
            :disabled="!Number.isFinite(limitInput) || limitInput < 0 || submittingLimit"
            @click="submitLimit"
          >
            <i v-if="submittingLimit" class="pi pi-spin pi-spinner" />
            Kaydet
          </button>
        </footer>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { adminApi, toApiMessage, type ApiListPagination } from '../../services/api';

type RegistrationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface RegistrationUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  biddingLimit?: number | null;
}

interface RegistrationItem {
  id: string;
  status: RegistrationStatus;
  createdAt: string;
  user: RegistrationUser | null;
  auction: { id: string; lotNumber?: string | null; product?: { title?: string | null } | null } | null;
  event: { id: string; title: string } | null;
}

interface RegistrationListResponse {
  code: string;
  message: string;
  items: RegistrationItem[];
  pagination: ApiListPagination;
}

const statusTabs: Array<{ value: RegistrationStatus | ''; label: string }> = [
  { value: 'PENDING', label: 'Bekleyenler' },
  { value: 'APPROVED', label: 'Onaylananlar' },
  { value: 'REJECTED', label: 'Reddedilenler' },
  { value: '', label: 'Tümü' },
];

const activeStatus = ref<RegistrationStatus | ''>('PENDING');
const items = ref<RegistrationItem[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const updatingId = ref<string | null>(null);
const pagination = ref<ApiListPagination>({ page: 1, limit: 20, total: 0 });

const limitModalUser = ref<RegistrationUser | null>(null);
const limitInput = ref(0);
const limitError = ref<string | null>(null);
const submittingLimit = ref(false);

const totalPages = computed(() =>
  Math.max(1, Math.ceil(pagination.value.total / pagination.value.limit)),
);

function userName(user: RegistrationUser | null): string {
  if (!user) return '-';
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || user.email;
}

function formatLimit(limit?: number | null): string {
  if (limit === null || limit === undefined) return '-';
  return `${Number(limit).toLocaleString('tr-TR')} TL`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function statusLabel(status: RegistrationStatus): string {
  switch (status) {
    case 'APPROVED':
      return 'Onaylandı';
    case 'REJECTED':
      return 'Reddedildi';
    default:
      return 'Bekliyor';
  }
}

function statusBadgeClass(status: RegistrationStatus): string {
  switch (status) {
    case 'APPROVED':
      return 'neutral';
    case 'REJECTED':
      return 'danger';
    default:
      return 'warning';
  }
}

async function loadList(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const response = await adminApi.get<RegistrationListResponse>('/admin/auctions/registrations', {
      params: {
        page: pagination.value.page,
        limit: pagination.value.limit,
        status: activeStatus.value || undefined,
      },
    });
    items.value = response.data.items ?? [];
    pagination.value = response.data.pagination ?? pagination.value;
  } catch (loadError) {
    error.value = toApiMessage(loadError);
    items.value = [];
  } finally {
    loading.value = false;
  }
}

function selectStatus(status: RegistrationStatus | ''): void {
  activeStatus.value = status;
  pagination.value = { ...pagination.value, page: 1 };
  void loadList();
}

function goPrevPage(): void {
  if (pagination.value.page <= 1) return;
  pagination.value = { ...pagination.value, page: pagination.value.page - 1 };
  void loadList();
}

function goNextPage(): void {
  if (pagination.value.page >= totalPages.value) return;
  pagination.value = { ...pagination.value, page: pagination.value.page + 1 };
  void loadList();
}

async function updateStatus(item: RegistrationItem, status: RegistrationStatus): Promise<void> {
  updatingId.value = item.id;
  error.value = null;
  try {
    await adminApi.patch(`/admin/auctions/registrations/${item.id}/status`, { status });
    await loadList();
  } catch (updateError) {
    error.value = toApiMessage(updateError);
  } finally {
    updatingId.value = null;
  }
}

function openLimitModal(user: RegistrationUser): void {
  limitModalUser.value = user;
  limitInput.value = Number(user.biddingLimit ?? 0);
  limitError.value = null;
}

function closeLimitModal(): void {
  limitModalUser.value = null;
  limitInput.value = 0;
  limitError.value = null;
}

async function submitLimit(): Promise<void> {
  if (!limitModalUser.value) return;
  submittingLimit.value = true;
  limitError.value = null;
  try {
    await adminApi.patch(`/admin/users/${limitModalUser.value.id}/bidding-limit`, {
      limit: limitInput.value,
    });
    closeLimitModal();
    await loadList();
  } catch (submitError) {
    limitError.value = toApiMessage(submitError);
  } finally {
    submittingLimit.value = false;
  }
}

onMounted(() => {
  void loadList();
});
</script>

<style scoped>
.user-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.target-link {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.limit-hint {
  font-size: 12px;
}
</style>
