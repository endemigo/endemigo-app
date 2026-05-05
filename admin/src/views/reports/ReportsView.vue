<template>
  <section class="field-grid">
    <header class="page-header">
      <div>
        <h1>Raporlar</h1>
        <p>Operasyon ve finans için filtrelenmiş dışa aktarımlar</p>
      </div>
      <div class="toolbar">
        <button class="button" type="button" @click="exportReport('csv')">CSV</button>
        <button class="button" type="button" @click="exportReport('xlsx')">Excel</button>
        <button class="button" type="button" @click="exportReport('pdf')">PDF</button>
      </div>
    </header>

    <section class="panel">
      <div class="panel-body toolbar">
        <label class="field">
          <span>Tür</span>
          <select v-model="reportType" class="select" @change="loadRows">
            <option value="ads">Reklamlar</option>
            <option value="campaigns">Kampanyalar</option>
            <option value="membership">Üyelik</option>
            <option value="payouts">Ödeme talepleri</option>
            <option value="orders">Siparişler</option>
            <option value="payments">Ödemeler</option>
            <option value="trust">Güven</option>
          </select>
        </label>
        <label class="field">
          <span>Satıcı</span>
          <input v-model.trim="filters.sellerId" class="input" @change="loadRows" />
        </label>
        <label class="field">
          <span>Durum</span>
          <input v-model.trim="filters.status" class="input" @change="loadRows" />
        </label>
        <label v-if="reportType === 'orders'" class="field">
          <span>Kaynak</span>
          <select v-model="filters.source" class="select" @change="loadRows">
            <option value="">Tümü</option>
            <option value="DIRECT_SALE">Direkt satış</option>
            <option value="AUCTION">Müzayede</option>
            <option value="ASK_PRICE">Fiyat Sor</option>
          </select>
        </label>
        <label class="field">
          <span>Başlangıç</span>
          <input v-model="filters.from" class="input" type="date" @change="loadRows" />
        </label>
        <label class="field">
          <span>Bitiş</span>
          <input v-model="filters.to" class="input" type="date" @change="loadRows" />
        </label>
      </div>
    </section>

    <AdminDataTable
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :pagination="pagination"
      @page="setPage"
    />

    <p v-if="error" class="error-text">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AdminDataTable, { type AdminColumn, type AdminPagination } from '../../components/AdminDataTable.vue';
import { adminApi, toApiMessage } from '../../services/api';

type ExportFormat = 'csv' | 'xlsx' | 'pdf';

const reportType = ref('ads');
const rows = ref<Record<string, unknown>[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const pagination = ref<AdminPagination>({ page: 1, limit: 25, total: 0 });
const filters = reactive({
  sellerId: '',
  status: '',
  source: '',
  from: '',
  to: '',
});

const columns = computed<AdminColumn[]>(() => {
  const firstRow = rows.value[0] ?? {};
  const keys = Object.keys(firstRow).slice(0, 7);
  return (keys.length > 0 ? keys : ['id', 'status', 'sellerId', 'createdAt']).map((key) => ({
    key,
    label: key,
    format: key.toLowerCase().includes('date') || key.endsWith('At') ? 'date' : key === 'status' ? 'status' : 'text',
  }));
});

function queryParams() {
  return {
    page: pagination.value.page,
    limit: pagination.value.limit,
    ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
  };
}

function setPage(page: number) {
  pagination.value = { ...pagination.value, page };
  void loadRows();
}

async function loadRows() {
  loading.value = true;
  error.value = null;
  try {
    const response = await adminApi.get(`/admin/reports/${reportType.value}`, {
      params: queryParams(),
    });
    rows.value = response.data.items ?? [];
    pagination.value = response.data.pagination ?? pagination.value;
  } catch (loadError) {
    error.value = toApiMessage(loadError);
    rows.value = [];
  } finally {
    loading.value = false;
  }
}

async function exportReport(format: ExportFormat) {
  try {
    await adminApi.get(`/admin/reports/${reportType.value}/export`, {
      params: { ...queryParams(), format },
      responseType: 'blob',
    });
  } catch (exportError) {
    error.value = toApiMessage(exportError);
  }
}

onMounted(loadRows);
</script>
