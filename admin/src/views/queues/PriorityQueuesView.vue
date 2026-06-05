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
              <strong>{{ recordLabel(queue.key, item) }}</strong>
              <p class="muted">{{ formatDate(item.createdAt) }}</p>
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
});
const loading = ref(false);
const error = ref<string | null>(null);
const showEmptyQueues = ref(false);

const queueItems = computed(() => [
  { key: 'sellerApprovals', label: 'Satıcı onayları', ...queues.value.sellerApprovals },
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

onMounted(loadQueues);
</script>
