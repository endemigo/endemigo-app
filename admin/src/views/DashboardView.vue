<template>
  <section class="field-grid">
    <header class="page-header">
      <div>
        <h1>Öncelikli İşler</h1>
        <p>Pasif raporlamadan önce açık operasyon kuyrukları.</p>
      </div>
      <button class="button" type="button" :disabled="loading" @click="loadDashboard">
        <i class="pi pi-refresh" aria-hidden="true" />
        Yenile
      </button>
    </header>

    <section class="queue-grid" aria-label="Öncelikli kuyruklar">
      <RouterLink
        v-for="item in queueCards"
        :key="item.key"
        class="queue-card"
        :class="item.severityClass"
        :to="item.to"
      >
        <span class="muted">{{ item.label }}</span>
        <strong class="queue-count">{{ item.count }}</strong>
        <span>{{ item.summary }}</span>
      </RouterLink>
    </section>

    <section class="chart-grid" aria-label="Operasyon grafikleri">
      <article class="panel chart-card">
        <div class="panel-header">
          <strong>Kuyruk Yoğunluğu</strong>
          <span class="muted">Anlık dağılım</span>
        </div>
        <div class="panel-body">
          <div class="bar-list">
            <div v-for="bar in queueChartBars" :key="bar.key" class="bar-row">
              <div class="bar-meta">
                <span>{{ bar.label }}</span>
                <strong>{{ bar.count }}</strong>
              </div>
              <div class="bar-track">
                <div class="bar-fill" :style="{ width: `${bar.percent}%` }" />
              </div>
            </div>
          </div>
        </div>
      </article>

      <article class="panel chart-card">
        <div class="panel-header">
          <strong>Sipariş ve Satıcı Dengesi</strong>
          <span class="muted">Hızlı görünüm</span>
        </div>
        <div class="panel-body donut-wrap">
          <div class="donut" :style="{ background: sellerMixBackground }" aria-label="Satıcı oranı" />
          <div class="donut-legend">
            <div>
              <span class="muted">Aktif satıcı</span>
              <strong>{{ metrics?.userBehavior.activeSellers ?? 0 }}</strong>
            </div>
            <div>
              <span class="muted">Yeni satıcı</span>
              <strong>{{ metrics?.userBehavior.newSellers ?? 0 }}</strong>
            </div>
            <div>
              <span class="muted">Yeni kullanıcı</span>
              <strong>{{ metrics?.userBehavior.newUsers ?? 0 }}</strong>
            </div>
          </div>
        </div>
      </article>
    </section>

    <section class="panel">
      <div class="panel-header">
        <strong>Operasyon Metrikleri</strong>
        <span class="muted">{{ metricsLoadedLabel }}</span>
      </div>
      <div class="panel-body metric-grid">
        <article v-for="metric in metricCards" :key="metric.key" class="metric-card">
          <span class="muted">{{ metric.label }}</span>
          <strong class="metric-value">{{ metric.value }}</strong>
        </article>
      </div>
    </section>

    <p v-if="error" class="error-text">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { adminApi, toApiMessage, type ApiEnvelope } from '../services/api';

interface QueueBucket {
  count: number;
  latest: Record<string, unknown>[];
}

interface AdminQueuesResponse extends ApiEnvelope {
  sellerApprovals: QueueBucket;
  adApprovals: QueueBucket;
  payoutReviews: QueueBucket;
  trustFlags: QueueBucket;
  orderReviews: QueueBucket;
  paymentReviews: QueueBucket;
  membershipGrace: QueueBucket;
}

interface DashboardMetrics {
  volume: {
    totalOrders: number;
    grossMerchandiseValue: number;
  };
  auctions: {
    activeCount: number;
    endingSoonCount: number;
  };
  payments: {
    pendingReviewAmount: number;
    failedCount: number;
  };
  userBehavior: {
    newUsers: number;
    newSellers: number;
    activeSellers: number;
  };
  errors: {
    recentCount: number;
  };
}

interface MetricsResponse extends ApiEnvelope {
  metrics: DashboardMetrics;
}

interface QueueCard {
  key: keyof AdminQueuesResponse;
  label: string;
  to: string;
  count: number;
  summary: string;
  severityClass: string;
}

interface MetricCard {
  key: string;
  label: string;
  value: string | number;
}

interface QueueChartBar {
  key: string;
  label: string;
  count: number;
  percent: number;
}

const emptyQueue: QueueBucket = { count: 0, latest: [] };
const queues = ref<AdminQueuesResponse>({
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
const metrics = ref<DashboardMetrics | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const loadedAt = ref<Date | null>(null);

const queueCards = computed<QueueCard[]>(() => [
  {
    key: 'sellerApprovals',
    label: 'Satıcı onayları',
    to: '/sellers',
    count: queues.value.sellerApprovals.count,
    summary: 'Bekleyen manuel satıcı açılışları',
    severityClass: queues.value.sellerApprovals.count > 0 ? 'is-warning' : '',
  },
  {
    key: 'adApprovals',
    label: 'Reklam onayları',
    to: '/ads',
    count: queues.value.adApprovals.count,
    summary: 'İnceleme bekleyen sponsorlu yerleşimler',
    severityClass: queues.value.adApprovals.count > 0 ? 'is-warning' : '',
  },
  {
    key: 'payoutReviews',
    label: 'Ödeme talepleri',
    to: '/payouts',
    count: queues.value.payoutReviews.count,
    summary: 'Ödeme öncesi finans kontrolleri',
    severityClass: queues.value.payoutReviews.count > 0 ? 'is-danger' : '',
  },
  {
    key: 'trustFlags',
    label: 'Güven işaretleri',
    to: '/trust',
    count: queues.value.trustFlags.count,
    summary: 'Karar bekleyen satıcı davranış işaretleri',
    severityClass: queues.value.trustFlags.count > 0 ? 'is-danger' : '',
  },
  {
    key: 'orderReviews',
    label: 'Sipariş incelemeleri',
    to: '/orders',
    count: queues.value.orderReviews.count,
    summary: 'Manuel incelemeye alınan siparişler',
    severityClass: queues.value.orderReviews.count > 0 ? 'is-warning' : '',
  },
  {
    key: 'paymentReviews',
    label: 'Ödeme incelemeleri',
    to: '/payments',
    count: queues.value.paymentReviews.count,
    summary: 'Operasyon için duraklatılan ödemeler',
    severityClass: queues.value.paymentReviews.count > 0 ? 'is-danger' : '',
  },
  {
    key: 'membershipGrace',
    label: 'Üyelik grace',
    to: '/membership',
    count: queues.value.membershipGrace.count,
    summary: 'Avantaj düşüşüne yaklaşan satıcılar',
    severityClass: queues.value.membershipGrace.count > 0 ? 'is-warning' : '',
  },
]);

const metricCards = computed<MetricCard[]>(() => {
  const current = metrics.value;
  return [
    { key: 'totalOrders', label: 'Toplam sipariş hacmi', value: current?.volume.totalOrders ?? 0 },
    {
      key: 'grossMerchandiseValue',
      label: 'Brüt ürün değeri',
      value: formatMoney(current?.volume.grossMerchandiseValue ?? 0),
    },
    { key: 'activeAuctions', label: 'Aktif müzayedeler', value: current?.auctions.activeCount ?? 0 },
    {
      key: 'endingSoonAuctions',
      label: 'Süresi yaklaşan müzayedeler',
      value: current?.auctions.endingSoonCount ?? 0,
    },
    {
      key: 'paymentReviewAmount',
      label: 'Ödeme inceleme tutarı',
      value: formatMoney(current?.payments.pendingReviewAmount ?? 0),
    },
    { key: 'failedPaymentCount', label: 'Başarısız ödeme sayısı', value: current?.payments.failedCount ?? 0 },
    { key: 'newUsers', label: 'Yeni kullanıcılar', value: current?.userBehavior.newUsers ?? 0 },
    { key: 'newSellers', label: 'Yeni satıcılar', value: current?.userBehavior.newSellers ?? 0 },
    { key: 'activeSellers', label: 'Aktif satıcılar', value: current?.userBehavior.activeSellers ?? 0 },
    { key: 'recentCount', label: 'Son hata sayısı', value: current?.errors.recentCount ?? 0 },
  ];
});

const queueChartBars = computed<QueueChartBar[]>(() => {
  const bars = queueCards.value.map((item) => ({
    key: item.key,
    label: item.label,
    count: item.count,
  }));
  const maxCount = Math.max(1, ...bars.map((item) => item.count));
  return bars.map((item) => ({
    ...item,
    percent: Math.round((item.count / maxCount) * 100),
  }));
});

const sellerMixBackground = computed(() => {
  const activeSellers = metrics.value?.userBehavior.activeSellers ?? 0;
  const newSellers = metrics.value?.userBehavior.newSellers ?? 0;
  const total = Math.max(1, activeSellers + newSellers);
  const activePercent = Math.round((activeSellers / total) * 100);
  return `conic-gradient(#1d9a83 0% ${activePercent}%, #d4b16a ${activePercent}% 100%)`;
});

const metricsLoadedLabel = computed(() =>
  loadedAt.value ? `Güncellendi ${loadedAt.value.toLocaleTimeString('tr-TR')}` : 'Henüz yüklenmedi',
);

function formatMoney(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(value);
}

async function loadDashboard() {
  loading.value = true;
  error.value = null;

  try {
    const [queueResponse, metricResponse] = await Promise.all([
      adminApi.get<AdminQueuesResponse>('/admin/queues'),
      adminApi.get<MetricsResponse>('/admin/dashboard/metrics'),
    ]);
    queues.value = queueResponse.data;
    metrics.value = metricResponse.data.metrics;
    loadedAt.value = new Date();
  } catch (loadError) {
    error.value = toApiMessage(loadError);
  } finally {
    loading.value = false;
  }
}

onMounted(loadDashboard);
</script>
