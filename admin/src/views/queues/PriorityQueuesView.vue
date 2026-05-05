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

    <section class="queue-grid">
      <article v-for="queue in queueItems" :key="queue.key" class="panel">
        <div class="panel-header">
          <strong>{{ queue.label }}</strong>
          <span class="badge" :class="{ warning: queue.count > 0 }">{{ queue.count }}</span>
        </div>
        <div class="panel-body">
          <p v-if="queue.latest.length === 0" class="muted">Bekleyen kayıt yok.</p>
          <ul v-else class="timeline">
            <li v-for="item in queue.latest" :key="recordKey(item)" class="timeline-item">
              <strong>{{ recordKey(item) }}</strong>
              <p class="muted">{{ formatDate(item.createdAt) }}</p>
            </li>
          </ul>
        </div>
      </article>
    </section>

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

const queueItems = computed(() => [
  { key: 'sellerApprovals', label: 'Satıcı onayları', ...queues.value.sellerApprovals },
  { key: 'adApprovals', label: 'Reklam onayları', ...queues.value.adApprovals },
  { key: 'payoutReviews', label: 'Ödeme talepleri', ...queues.value.payoutReviews },
  { key: 'trustFlags', label: 'Güven işaretleri', ...queues.value.trustFlags },
  { key: 'orderReviews', label: 'Sipariş incelemeleri', ...queues.value.orderReviews },
  { key: 'paymentReviews', label: 'Ödeme incelemeleri', ...queues.value.paymentReviews },
  { key: 'membershipGrace', label: 'Üyelik ek süresi', ...queues.value.membershipGrace },
]);

function recordKey(record: Record<string, unknown>): string {
  const id = record.id ?? record.userId ?? record.email ?? 'record';
  return String(id);
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
