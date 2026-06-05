<template>
  <section class="field-grid">
    <header class="page-header">
      <div>
        <h1>Operations Console</h1>
        <p>Kritik kuyrukları öncele, tarih bazlı metrikleri takip et.</p>
      </div>
      <div class="toolbar dashboard-toolbar">
        <button
          v-for="periodOption in periodOptions"
          :key="periodOption.value"
          class="button ghost"
          :class="{ primary: selectedPeriod === periodOption.value }"
          type="button"
          @click="setPeriod(periodOption.value)"
        >
          {{ periodOption.label }}
        </button>
        <div class="toolbar" v-if="selectedPeriod === 'custom'">
          <input v-model="customFrom" class="input date-input" type="date" />
          <input v-model="customTo" class="input date-input" type="date" />
          <button class="button" type="button" :disabled="loading" @click="loadDashboard">
            Uygula
          </button>
        </div>
        <button class="button" type="button" :disabled="loading" @click="loadDashboard">
          <i class="pi pi-refresh" aria-hidden="true" />
          Yenile
        </button>
      </div>
    </header>

    <nav class="tabs">
      <button
        class="tab-button"
        :class="{ 'is-active': activeTab === 'overview' }"
        type="button"
        @click="activeTab = 'overview'"
      >
        Genel Bakış
      </button>
      <button
        class="tab-button"
        :class="{ 'is-active': activeTab === 'queues' }"
        type="button"
        @click="activeTab = 'queues'"
      >
        Onay Kuyrukları
      </button>
      <button
        class="tab-button"
        :class="{ 'is-active': activeTab === 'metrics' }"
        type="button"
        @click="activeTab = 'metrics'"
      >
        Detaylı Metrikler
      </button>
    </nav>

    <section v-if="activeTab === 'overview'" class="field-grid">
      <section class="panel">
        <div class="panel-header">
          <strong>Analiz Özeti</strong>
          <span class="muted">{{ activePeriodLabel }}</span>
        </div>
        <div class="panel-body metric-grid">
          <article v-for="item in analysisCards" :key="item.key" class="metric-card">
            <span class="muted">{{ item.label }}</span>
            <strong class="metric-value">{{ item.value }}</strong>
            <span :class="['trend-pill', item.delta >= 0 ? 'is-up' : 'is-down']">
              {{ item.delta >= 0 ? '+' : '' }}{{ item.delta }}%
            </span>
          </article>
        </div>
      </section>

      <section class="chart-grid" aria-label="Operasyon grafikleri">
        <article class="panel chart-card">
          <div class="panel-header">
            <strong>Sipariş Trendi</strong>
            <span class="muted">Seçili aralık</span>
          </div>
          <div class="panel-body chart-canvas-wrap">
            <svg class="line-chart" viewBox="0 0 640 220" role="img" aria-label="Sipariş trend grafiği">
              <path class="line-chart-area" :d="orderChart.areaPath" />
              <path class="line-chart-stroke" :d="orderChart.path" />
              <circle
                v-for="point in orderChart.points"
                :key="`order-${point.x}-${point.y}`"
                class="line-chart-point"
                :cx="point.x"
                :cy="point.y"
                r="3.5"
              />
            </svg>
            <div class="chart-footer">
              <span class="muted">{{ orderChart.leftLabel }}</span>
              <span class="muted">{{ orderChart.rightLabel }}</span>
            </div>
          </div>
        </article>

        <article class="panel chart-card">
          <div class="panel-header">
            <strong>Kullanıcı Trendi</strong>
            <span class="muted">Yeni kullanıcı akışı</span>
          </div>
          <div class="panel-body chart-canvas-wrap">
            <svg class="line-chart alt" viewBox="0 0 640 220" role="img" aria-label="Kullanıcı trend grafiği">
              <path class="line-chart-area" :d="userChart.areaPath" />
              <path class="line-chart-stroke" :d="userChart.path" />
              <circle
                v-for="point in userChart.points"
                :key="`user-${point.x}-${point.y}`"
                class="line-chart-point"
                :cx="point.x"
                :cy="point.y"
                r="3.5"
              />
            </svg>
            <div class="chart-footer">
              <span class="muted">{{ userChart.leftLabel }}</span>
              <span class="muted">{{ userChart.rightLabel }}</span>
            </div>
          </div>
        </article>
      </section>
    </section>

    <section v-if="activeTab === 'queues'" class="field-grid">
      <AdminDataTable
        :columns="queueColumns"
        :rows="filteredQueueRows"
        :loading="loading"
        :pagination="queuePagination"
        :filters="queueFilters"
        @filter="setQueueFilters"
        @row-click="openQueueRow"
      >
        <template #toolbar>
          <span class="muted">Satır tıklayarak ilgili modüle geçiş yap.</span>
        </template>
      </AdminDataTable>
    </section>

    <section v-if="activeTab === 'metrics'" class="field-grid">
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
    </section>

    <p v-if="error" class="error-text">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AdminDataTable, {
  type AdminColumn,
  type AdminFilter,
  type AdminPagination,
} from '../components/AdminDataTable.vue';
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

type DashboardPeriod = 'day' | 'week' | 'month' | 'custom';

interface DashboardTrendPoint {
  label: string;
  value: number;
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
  analysis: {
    period: DashboardPeriod;
    from: string;
    to: string;
    days: number;
    comparison: {
      ordersDeltaPercent: number;
      grossMerchandiseValueDeltaPercent: number;
      newUsersDeltaPercent: number;
      newSellersDeltaPercent: number;
      failedPaymentsDeltaPercent: number;
    };
  };
  trends: {
    orders: DashboardTrendPoint[];
    users: DashboardTrendPoint[];
    failedPayments: DashboardTrendPoint[];
  };
}

interface MetricsResponse extends ApiEnvelope {
  metrics: DashboardMetrics;
}

interface QueueCard {
  key: QueueKey;
  label: string;
  to: string;
  count: number;
  summary: string;
  severityClass: string;
  severity: 'ACTIVE' | 'ADMIN_REVIEW' | 'FAILED';
}

interface MetricCard {
  key: string;
  label: string;
  value: string | number;
}

interface TrendCard {
  key: string;
  label: string;
  value: string | number;
  delta: number;
}

interface ChartPoint {
  x: number;
  y: number;
}

interface LineChartModel {
  path: string;
  areaPath: string;
  points: ChartPoint[];
  leftLabel: string;
  rightLabel: string;
}

type QueueKey =
  | 'sellerApprovals'
  | 'adApprovals'
  | 'payoutReviews'
  | 'trustFlags'
  | 'orderReviews'
  | 'paymentReviews'
  | 'membershipGrace';

interface QueueRow {
  key: QueueKey;
  label: string;
  count: number;
  severity: 'ACTIVE' | 'ADMIN_REVIEW' | 'FAILED';
  summary: string;
  to: string;
}

const router = useRouter();
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
const queueFilterValues = ref<Record<string, string>>({});
const selectedPeriod = ref<DashboardPeriod>('day');
const customFrom = ref(formatDateInput(daysAgo(7)));
const customTo = ref(formatDateInput(new Date()));
const activeTab = ref<'overview' | 'queues' | 'metrics'>('overview');

const periodOptions: Array<{ value: DashboardPeriod; label: string }> = [
  { value: 'day', label: 'Gunluk' },
  { value: 'week', label: 'Haftalik' },
  { value: 'month', label: 'Aylik' },
  { value: 'custom', label: 'Ozel Aralik' },
];

const queueCards = computed<QueueCard[]>(() => [
  {
    key: 'sellerApprovals',
    label: 'Satıcı onayları',
    to: '/sellers',
    count: queues.value.sellerApprovals.count,
    summary: 'Bekleyen manuel satıcı açılışları',
    severityClass: queues.value.sellerApprovals.count > 0 ? 'is-warning' : '',
    severity: queues.value.sellerApprovals.count > 0 ? 'ADMIN_REVIEW' : 'ACTIVE',
  },
  {
    key: 'adApprovals',
    label: 'Reklam onayları',
    to: '/ads',
    count: queues.value.adApprovals.count,
    summary: 'İnceleme bekleyen sponsorlu yerleşimler',
    severityClass: queues.value.adApprovals.count > 0 ? 'is-warning' : '',
    severity: queues.value.adApprovals.count > 0 ? 'ADMIN_REVIEW' : 'ACTIVE',
  },
  {
    key: 'payoutReviews',
    label: 'Ödeme talepleri',
    to: '/payouts',
    count: queues.value.payoutReviews.count,
    summary: 'Ödeme öncesi finans kontrolleri',
    severityClass: queues.value.payoutReviews.count > 0 ? 'is-danger' : '',
    severity: queues.value.payoutReviews.count > 0 ? 'FAILED' : 'ACTIVE',
  },
  {
    key: 'trustFlags',
    label: 'Güven işaretleri',
    to: '/trust',
    count: queues.value.trustFlags.count,
    summary: 'Karar bekleyen satıcı davranış işaretleri',
    severityClass: queues.value.trustFlags.count > 0 ? 'is-danger' : '',
    severity: queues.value.trustFlags.count > 0 ? 'FAILED' : 'ACTIVE',
  },
  {
    key: 'orderReviews',
    label: 'Sipariş incelemeleri',
    to: '/orders',
    count: queues.value.orderReviews.count,
    summary: 'Manuel incelemeye alınan siparişler',
    severityClass: queues.value.orderReviews.count > 0 ? 'is-warning' : '',
    severity: queues.value.orderReviews.count > 0 ? 'ADMIN_REVIEW' : 'ACTIVE',
  },
  {
    key: 'paymentReviews',
    label: 'Ödeme incelemeleri',
    to: '/payments',
    count: queues.value.paymentReviews.count,
    summary: 'Operasyon için duraklatılan ödemeler',
    severityClass: queues.value.paymentReviews.count > 0 ? 'is-danger' : '',
    severity: queues.value.paymentReviews.count > 0 ? 'FAILED' : 'ACTIVE',
  },
  {
    key: 'membershipGrace',
    label: 'Üyelik grace',
    to: '/membership',
    count: queues.value.membershipGrace.count,
    summary: 'Avantaj düşüşüne yaklaşan satıcılar',
    severityClass: queues.value.membershipGrace.count > 0 ? 'is-warning' : '',
    severity: queues.value.membershipGrace.count > 0 ? 'ADMIN_REVIEW' : 'ACTIVE',
  },
]);

const queueColumns: AdminColumn[] = [
  { key: 'label', label: 'Kuyruk' },
  { key: 'count', label: 'Bekleyen' },
  { key: 'severity', label: 'Seviye', format: 'status' },
  { key: 'summary', label: 'Açıklama' },
];

const queueFilters = computed<AdminFilter[]>(() => [
  {
    key: 'search',
    label: 'Arama',
    type: 'search',
    value: queueFilterValues.value.search ?? '',
  },
  {
    key: 'severity',
    label: 'Seviye',
    type: 'select',
    value: queueFilterValues.value.severity ?? '',
    options: [
      { label: 'Sağlıklı', value: 'ACTIVE' },
      { label: 'İnceleme', value: 'ADMIN_REVIEW' },
      { label: 'Kritik', value: 'FAILED' },
    ],
  },
]);

const queueRows = computed<QueueRow[]>(() =>
  queueCards.value.map((card) => ({
    key: card.key,
    label: card.label,
    count: card.count,
    severity: card.severity,
    summary: card.summary,
    to: card.to,
  })),
);

const filteredQueueRows = computed<QueueRow[]>(() => {
  const search = (queueFilterValues.value.search ?? '').trim().toLowerCase();
  const severity = queueFilterValues.value.severity;
  return queueRows.value.filter((row) => {
    if (severity && row.severity !== severity) return false;
    if (!search) return true;
    return `${row.label} ${row.summary}`.toLowerCase().includes(search);
  });
});

const queuePagination = computed<AdminPagination>(() => ({
  page: 1,
  limit: Math.max(filteredQueueRows.value.length, 1),
  total: filteredQueueRows.value.length,
}));

const metricCards = computed<MetricCard[]>(() => {
  const current = metrics.value;
  return [
    { key: 'totalOrders', label: 'Toplam sipariş', value: current?.volume.totalOrders ?? 0 },
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
    { key: 'failedPaymentCount', label: 'Başarısız ödeme', value: current?.payments.failedCount ?? 0 },
    { key: 'newUsers', label: 'Yeni kullanıcılar', value: current?.userBehavior.newUsers ?? 0 },
    { key: 'newSellers', label: 'Yeni satıcılar', value: current?.userBehavior.newSellers ?? 0 },
    { key: 'activeSellers', label: 'Aktif satıcılar', value: current?.userBehavior.activeSellers ?? 0 },
    { key: 'recentCount', label: 'Son hata sayısı', value: current?.errors.recentCount ?? 0 },
  ];
});

const analysisCards = computed<TrendCard[]>(() => {
  const current = metrics.value;
  return [
    {
      key: 'analysis-orders',
      label: 'Sipariş',
      value: current?.volume.totalOrders ?? 0,
      delta: current?.analysis.comparison.ordersDeltaPercent ?? 0,
    },
    {
      key: 'analysis-gmv',
      label: 'Ciro',
      value: formatMoney(current?.volume.grossMerchandiseValue ?? 0),
      delta: current?.analysis.comparison.grossMerchandiseValueDeltaPercent ?? 0,
    },
    {
      key: 'analysis-users',
      label: 'Yeni kullanıcı',
      value: current?.userBehavior.newUsers ?? 0,
      delta: current?.analysis.comparison.newUsersDeltaPercent ?? 0,
    },
    {
      key: 'analysis-sellers',
      label: 'Yeni satıcı',
      value: current?.userBehavior.newSellers ?? 0,
      delta: current?.analysis.comparison.newSellersDeltaPercent ?? 0,
    },
    {
      key: 'analysis-payments',
      label: 'Başarısız ödeme',
      value: current?.payments.failedCount ?? 0,
      delta: current?.analysis.comparison.failedPaymentsDeltaPercent ?? 0,
    },
  ];
});

const orderChart = computed<LineChartModel>(() => buildLineChart(metrics.value?.trends.orders ?? []));
const userChart = computed<LineChartModel>(() => buildLineChart(metrics.value?.trends.users ?? []));

const activePeriodLabel = computed(() => {
  const current = metrics.value?.analysis;
  if (!current) return 'Henüz yüklenmedi';
  const from = new Date(current.from).toLocaleDateString('tr-TR');
  const to = new Date(current.to).toLocaleDateString('tr-TR');
  return `${from} - ${to} (${current.days} gün)`;
});

const metricsLoadedLabel = computed(() =>
  loadedAt.value ? `Güncellendi ${loadedAt.value.toLocaleTimeString('tr-TR')}` : 'Henüz yüklenmedi',
);

function setQueueFilters(filters: Record<string, string>) {
  queueFilterValues.value = filters;
}

function setPeriod(period: DashboardPeriod) {
  selectedPeriod.value = period;
  if (period !== 'custom') {
    void loadDashboard();
  }
}

function openQueueRow(row: Record<string, unknown>) {
  const to = row.to;
  if (typeof to === 'string' && to.length > 0) {
    void router.push(to);
  }
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(value);
}

function buildLineChart(points: DashboardTrendPoint[]): LineChartModel {
  const width = 640;
  const height = 220;
  const paddingX = 24;
  const paddingY = 20;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;
  const safePoints = points.length > 0 ? points : [{ label: '-', value: 0 }];
  const maxValue = Math.max(1, ...safePoints.map((point) => point.value));

  const mapped = safePoints.map((point, index) => {
    const ratioX = safePoints.length <= 1 ? 0.5 : index / (safePoints.length - 1);
    const ratioY = point.value / maxValue;
    return {
      x: Number((paddingX + chartWidth * ratioX).toFixed(2)),
      y: Number((paddingY + chartHeight * (1 - ratioY)).toFixed(2)),
    };
  });

  const path = mapped
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const firstPoint = mapped[0];
  const lastPoint = mapped[mapped.length - 1];
  const areaPath = `${path} L ${lastPoint.x} ${height - paddingY} L ${firstPoint.x} ${height - paddingY} Z`;

  return {
    path,
    areaPath,
    points: mapped,
    leftLabel: safePoints[0]?.label ?? '-',
    rightLabel: safePoints[safePoints.length - 1]?.label ?? '-',
  };
}

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysAgo(dayCount: number): Date {
  return new Date(Date.now() - dayCount * 24 * 60 * 60 * 1000);
}

function toStartIso(dateValue: string): string {
  return `${dateValue}T00:00:00.000Z`;
}

function toEndIso(dateValue: string): string {
  return `${dateValue}T23:59:59.999Z`;
}

async function loadDashboard() {
  loading.value = true;
  error.value = null;

  const metricParams: Record<string, string> = { period: selectedPeriod.value };
  if (selectedPeriod.value === 'custom') {
    metricParams.from = toStartIso(customFrom.value);
    metricParams.to = toEndIso(customTo.value);
  }

  try {
    const [queueResponse, metricResponse] = await Promise.all([
      adminApi.get<AdminQueuesResponse>('/admin/queues'),
      adminApi.get<MetricsResponse>('/admin/dashboard/metrics', { params: metricParams }),
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
