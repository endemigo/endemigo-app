<template>
  <section class="field-grid">
    <header class="page-header">
      <div>
        <h1>Öncelikli Kuyruklar</h1>
        <p>Operasyon işleri kuyruklara göre gruplanır.</p>
      </div>
      <button class="button" type="button" :disabled="loading" @click="loadQueues">
        <i class="pi pi-refresh" aria-hidden="true" />
        Yenile
      </button>
    </header>

    <div v-if="activeQueues.length === 0" class="empty-state">
      <i class="pi pi-check-circle empty-icon" aria-hidden="true" style="color: var(--brand-500);" />
      <p>Harika! Bekleyen herhangi bir operasyonel iş veya onay kuyruğu bulunmuyor.</p>
    </div>

    <section v-else class="queue-grid">
      <article v-for="queue in activeQueues" :key="queue.key" class="panel">
        <div class="panel-header">
          <strong>{{ queue.label }}</strong>
          <span class="badge warning">{{ queue.count }}</span>
        </div>
        <div class="panel-body">
          <ul class="timeline">
            <li v-for="item in queue.latest" :key="recordKey(item)" class="timeline-item">
              <!-- Ürün onay kuyruğu: kayıt ürün detayına gider ve hızlı onay/red aksiyonları sunar -->
              <template v-if="queue.key === 'productReviews'">
                <a
                  class="queue-item-link"
                  role="link"
                  tabindex="0"
                  @click="openProductDetail(item)"
                  @keyup.enter="openProductDetail(item)"
                >
                  <strong>{{ recordLabel(queue.key, item) }}</strong>
                </a>
                <p class="muted">{{ formatDate(item.createdAt) }}</p>
                <div class="review-actions">
                  <button
                    class="button primary"
                    type="button"
                    :disabled="isReviewing(item)"
                    @click="reviewProduct(item, true)"
                  >
                    Onayla
                  </button>
                  <button
                    class="button ghost"
                    type="button"
                    :disabled="isReviewing(item)"
                    @click="reviewProduct(item, false)"
                  >
                    Reddet
                  </button>
                </div>
              </template>
              <template v-else>
                <strong>{{ recordLabel(queue.key, item) }}</strong>
                <p class="muted">{{ formatDate(item.createdAt) }}</p>
              </template>
            </li>
          </ul>
        </div>
      </article>
    </section>

    <div v-if="emptyQueues.length > 0" class="empty-queues-section" style="margin-top: 16px;">
      <button
        class="button ghost"
        type="button"
        style="width: 100%; justify-content: space-between;"
        @click="showEmptyQueues = !showEmptyQueues"
      >
        <span>Boş / Sağlıklı Kuyruklar ({{ emptyQueues.length }})</span>
        <i :class="['pi', showEmptyQueues ? 'pi-chevron-up' : 'pi-chevron-down']" aria-hidden="true" />
      </button>

      <section v-if="showEmptyQueues" class="queue-grid" style="margin-top: 12px;">
        <article v-for="queue in emptyQueues" :key="queue.key" class="panel" style="opacity: 0.85;">
          <div class="panel-header">
            <span class="muted">{{ queue.label }}</span>
            <span class="badge neutral">0</span>
          </div>
          <div class="panel-body">
            <p class="muted" style="font-size: 13px;">Bekleyen kayıt yok.</p>
          </div>
        </article>
      </section>
    </div>

    <p v-if="error" class="error-text">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { adminApi, toApiMessage, type ApiEnvelope } from '../../services/api';

interface QueueBucket {
  count: number;
  latest: Record<string, unknown>[];
}

interface QueuesResponse extends ApiEnvelope {
  sellerApprovals: QueueBucket;
  adApprovals: QueueBucket;
  payoutReviews: QueueBucket;
  trustFlags: QueueBucket;
  orderReviews: QueueBucket;
  paymentReviews: QueueBucket;
  membershipGrace: QueueBucket;
  productReviews: QueueBucket;
}

const emptyQueue: QueueBucket = { count: 0, latest: [] };
const queues = ref<QueuesResponse>({
  code: '',
  message: '',
  sellerApprovals: emptyQueue,
  adApprovals: emptyQueue,
  payoutReviews: emptyQueue,
  trustFlags: emptyQueue,
  orderReviews: emptyQueue,
  paymentReviews: emptyQueue,
  membershipGrace: emptyQueue,
  productReviews: emptyQueue,
});
const loading = ref(false);
const error = ref<string | null>(null);
const showEmptyQueues = ref(false);
const router = useRouter();
// Onay/Red isteği devam eden ürün id'leri; çift tıklamayı engellemek için tutulur.
const reviewingProductIds = ref<Set<string>>(new Set());

const queueItems = computed(() => [
  { key: 'sellerApprovals', label: 'Satıcı onayları', ...queues.value.sellerApprovals },
  { key: 'productReviews', label: 'Ürün onayları', ...(queues.value.productReviews ?? emptyQueue) },
  { key: 'adApprovals', label: 'Reklam onayları', ...queues.value.adApprovals },
  { key: 'payoutReviews', label: 'Ödeme talepleri', ...queues.value.payoutReviews },
  { key: 'trustFlags', label: 'Güven işaretleri', ...queues.value.trustFlags },
  { key: 'orderReviews', label: 'Sipariş incelemeleri', ...queues.value.orderReviews },
  { key: 'paymentReviews', label: 'Ödeme incelemeleri', ...queues.value.paymentReviews },
  { key: 'membershipGrace', label: 'Üyelik ek süresi', ...queues.value.membershipGrace },
]);

const activeQueues = computed(() => queueItems.value.filter((q) => q.count > 0));
const emptyQueues = computed(() => queueItems.value.filter((q) => q.count === 0));

function recordKey(record: Record<string, unknown>): string {
  const id = record.id ?? record.userId ?? record.email ?? 'record';
  return String(id);
}

function formatUuid(val: string): string {
  if (val.length > 10 && val.includes('-')) {
    return val.substring(0, 8) + '...';
  }
  return val;
}

function recordLabel(queueKey: string, record: Record<string, unknown>): string {
  if (queueKey === 'productReviews') {
    const title = typeof record.title === 'string' && record.title.trim().length > 0
      ? record.title.trim()
      : formatUuid(String(record.id ?? ''));
    const sellerName = typeof record.sellerName === 'string' && record.sellerName.trim().length > 0
      ? record.sellerName.trim()
      : null;
    return sellerName ? `${title} — ${sellerName}` : title;
  }
  if (queueKey === 'sellerApprovals') {
    const businessName = record.businessName;
    if (typeof businessName === 'string' && businessName.trim().length > 0) {
      return businessName;
    }
    const name = [record.firstName, record.lastName]
      .filter((part) => typeof part === 'string' && String(part).trim().length > 0)
      .map((part) => String(part).trim())
      .join(' ');
    if (name.length > 0) {
      return name;
    }
  }
  const amount = record.amount;
  const currency = record.currency ?? 'TRY';
  const idStr = formatUuid(String(record.id ?? record.userId ?? ''));

  if (queueKey === 'orderReviews') {
    if (amount !== undefined && amount !== null) {
      return `Sipariş: ${amount} ${currency} (${idStr})`;
    }
    return `Sipariş (${idStr})`;
  }
  if (queueKey === 'paymentReviews') {
    if (amount !== undefined && amount !== null) {
      return `Ödeme: ${amount} ${currency} (${idStr})`;
    }
    return `Ödeme (${idStr})`;
  }
  if (queueKey === 'payoutReviews') {
    if (amount !== undefined && amount !== null) {
      return `Ödeme Talebi: ${amount} ${currency} (${idStr})`;
    }
    return `Ödeme Talebi (${idStr})`;
  }

  const label = record.id ?? record.userId ?? record.email ?? 'record';
  return formatUuid(String(label));
}

function formatDate(value: unknown): string {
  if (typeof value !== 'string') return '';
  return new Date(value).toLocaleString('tr-TR');
}

async function loadQueues() {
  loading.value = true;
  error.value = null;

  try {
    const response = await adminApi.get<QueuesResponse>('/admin/queues');
    queues.value = response.data;
  } catch (loadError) {
    error.value = toApiMessage(loadError);
  } finally {
    loading.value = false;
  }
}

function openProductDetail(record: Record<string, unknown>): void {
  const id = record.id;
  if (typeof id !== 'string' || id.length === 0) return;
  void router.push(`/products/${id}`);
}

function isReviewing(record: Record<string, unknown>): boolean {
  return reviewingProductIds.value.has(String(record.id ?? ''));
}

// Ürün onay kuyruğu aksiyonu: approve=true → ACTIVE, approve=false → DRAFT.
// İşlem sonrası kuyruklar yeniden yüklenir; kayıt kuyruğu terk eder.
async function reviewProduct(record: Record<string, unknown>, approve: boolean): Promise<void> {
  const id = record.id;
  if (typeof id !== 'string' || id.length === 0) return;

  reviewingProductIds.value = new Set([...reviewingProductIds.value, id]);
  error.value = null;

  try {
    await adminApi.patch(`/admin/products/${id}/review`, { approve });
    await loadQueues();
  } catch (reviewError) {
    error.value = toApiMessage(reviewError);
  } finally {
    const next = new Set(reviewingProductIds.value);
    next.delete(id);
    reviewingProductIds.value = next;
  }
}

onMounted(loadQueues);
</script>

<style scoped>
.queue-item-link {
  cursor: pointer;
  text-decoration: none;
}
.queue-item-link:hover strong,
.queue-item-link:focus-visible strong {
  text-decoration: underline;
}
.review-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
</style>
