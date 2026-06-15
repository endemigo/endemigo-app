<template>
  <section class="auction-events-page">
    <header class="page-header">
      <div>
        <h1>Müzayede Etkinlikleri</h1>
        <p>Tüm Canlı ve Süreli Müzayede Etkinliklerinin Yönetimi</p>
      </div>
      <button class="button primary action-btn-new" type="button" @click="handleNewEventClick">
        <i class="pi pi-plus" aria-hidden="true" />
        Yeni Etkinlik Oluştur
      </button>
    </header>

    <!-- ─── STATS DASHBOARD ROW ─── -->
    <section class="stats-dashboard">
      <div class="stat-card" @click="setStatusFilter('')" :class="{ active: activeStatus === '' }">
        <div class="stat-icon-wrapper blue">
          <i class="pi pi-calendar" />
        </div>
        <div class="stat-info">
          <span class="stat-label">Toplam Etkinlik</span>
          <strong class="stat-value font-mono">{{ stats.total }}</strong>
        </div>
      </div>
      <div class="stat-card" @click="setStatusFilter('ACTIVE')" :class="{ active: activeStatus === 'ACTIVE' }">
        <div class="stat-icon-wrapper green">
          <i class="pi pi-bolt pulse-icon" />
        </div>
        <div class="stat-info">
          <span class="stat-label">Aktif Canlı Odalar</span>
          <strong class="stat-value font-mono">{{ stats.active }}</strong>
        </div>
      </div>
      <div class="stat-card" @click="setStatusFilter('UPCOMING')" :class="{ active: activeStatus === 'UPCOMING' }">
        <div class="stat-icon-wrapper purple">
          <i class="pi pi-clock" />
        </div>
        <div class="stat-info">
          <span class="stat-label">Yaklaşan Müzayedeler</span>
          <strong class="stat-value font-mono">{{ stats.upcoming }}</strong>
        </div>
      </div>
      <div class="stat-card" @click="setStatusFilter('ENDED')" :class="{ active: activeStatus === 'ENDED' }">
        <div class="stat-icon-wrapper gray">
          <i class="pi pi-check-circle" />
        </div>
        <div class="stat-info">
          <span class="stat-label">Tamamlananlar</span>
          <strong class="stat-value font-mono">{{ stats.ended }}</strong>
        </div>
      </div>
    </section>

    <!-- ─── FILTERS & SEARCH BAR ─── -->
    <div class="filter-search-container">
      <div class="search-box">
        <i class="pi pi-search" />
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="Etkinlik adına göre ara..." 
          @input="handleSearchInput" 
        />
      </div>

      <div class="tabs-navigation">
        <button 
          v-for="tab in statusTabs" 
          :key="tab.value" 
          class="tab-btn" 
          :class="{ active: activeStatus === tab.value }"
          @click="setStatusFilter(tab.value)"
        >
          {{ tab.label }}
          <span v-if="tab.count !== undefined" class="tab-badge">{{ tab.count }}</span>
        </button>
      </div>
    </div>

    <!-- ─── LOADING & ERROR STATES ─── -->
    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner" style="font-size: 2.5rem; color: var(--brand-500)" />
      <p>Müzayede etkinlikleri yükleniyor...</p>
    </div>

    <div v-else-if="error" class="error-banner">
      <i class="pi pi-exclamation-triangle" />
      <span>{{ error }}</span>
      <button class="button ghost size-sm" @click="loadEvents">Yeniden Dene</button>
    </div>

    <div v-else-if="filteredEvents.length === 0" class="empty-state">
      <i class="pi pi-calendar-times empty-icon" />
      <h3>Etkinlik Bulunamadı</h3>
      <p>Seçilen filtrelere veya arama kriterlerine uygun müzayede etkinliği bulunmuyor.</p>
    </div>

    <!-- ─── CARDS GRID ─── -->
    <div v-else class="events-grid">
      <article 
        v-for="event in filteredEvents" 
        :key="event.id" 
        class="event-card"
        :class="{ 'card-is-active': event.status === 'ACTIVE' }"
      >
        <div class="card-cover">
          <img 
            v-if="event.coverImageUrl" 
            :src="event.coverImageUrl" 
            alt="Müzayede Görseli" 
            class="cover-img" 
          />
          <div v-else class="cover-gradient-fallback">
            <span>{{ event.title.substring(0, 2).toUpperCase() }}</span>
          </div>

          <div class="status-badge-overlay" :class="event.status.toLowerCase()">
            <span v-if="event.status === 'ACTIVE'" class="live-dot"></span>
            {{ getStatusText(event.status) }}
          </div>

          <div class="type-pill-overlay" :class="event.auctionType?.toLowerCase()">
            <i :class="event.auctionType === 'REALTIME' ? 'pi pi-bolt' : 'pi pi-clock'" />
            {{ event.auctionType === 'REALTIME' ? 'Canlı' : 'Süreli' }}
          </div>
        </div>

        <div class="card-body">
          <h3 class="event-title">{{ event.title }}</h3>
          <p class="event-desc">{{ event.description || 'Açıklama belirtilmemiş.' }}</p>

          <!-- Timeline Progress Bar for Ongoing Active Events -->
          <div v-if="event.status === 'ACTIVE'" class="event-timeline-progress">
            <div class="progress-labels">
              <span>Etkinlik İlerlemesi</span>
              <span>{{ getElapsedTimePercentage(event) }}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-bar-fill" :style="{ width: getElapsedTimePercentage(event) + '%' }"></div>
            </div>
          </div>

          <div class="event-meta-grid">
            <div class="meta-item">
              <i class="pi pi-box" />
              <div>
                <span class="meta-label">Lot Sayısı</span>
                <strong class="meta-value">{{ event.lotCount ?? 0 }} Lot</strong>
              </div>
            </div>
            <div class="meta-item">
              <i class="pi pi-calendar-plus" />
              <div>
                <span class="meta-label">Başlangıç</span>
                <strong class="meta-value">{{ formatDate(event.startTime) }}</strong>
              </div>
            </div>
          </div>
        </div>

        <footer class="card-footer">
          <button 
            class="button ghost edit-btn" 
            type="button" 
            @click="handleEditClick(event)"
            title="Etkinliği Düzenle"
          >
            <i class="pi pi-pencil" />
            Düzenle
          </button>
          <button 
            class="button primary control-panel-btn" 
            type="button" 
            @click="goToDetail(event.id)"
          >
            <i class="pi pi-sliders-h" />
            Kumanda Paneli
          </button>
        </footer>
      </article>
    </div>

    <!-- ─── PAGINATION ─── -->
    <div v-if="pagination.total > pagination.limit" class="pagination-bar">
      <button 
        class="button ghost icon-only" 
        :disabled="pagination.page === 1" 
        @click="changePage(pagination.page - 1)"
      >
        <i class="pi pi-angle-left" />
      </button>
      <span class="pagination-info">
        Sayfa <strong>{{ pagination.page }}</strong> / {{ Math.ceil(pagination.total / pagination.limit) }} (Toplam {{ pagination.total }} kayıt)
      </span>
      <button 
        class="button ghost icon-only" 
        :disabled="pagination.page === Math.ceil(pagination.total / pagination.limit)" 
        @click="changePage(pagination.page + 1)"
      >
        <i class="pi pi-angle-right" />
      </button>
    </div>

    <!-- ─── AUCTION TYPE SELECTION MODAL ─── -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showTypeModal" class="type-modal-backdrop" @click.self="showTypeModal = false">
          <div class="type-modal-card">
            <header class="modal-header">
              <h3>Müzayede Tipi Seçimi</h3>
              <button class="button icon-only ghost close-btn" @click="showTypeModal = false">
                <i class="pi pi-times" />
              </button>
            </header>
            <div class="modal-body">
              <p>Oluşturmak istediğiniz yeni müzayede etkinliğinin çalışma modelini belirleyin:</p>
              
              <div class="type-options">
                <div class="type-option-card realtime" @click="selectTypeAndCreate('REALTIME')">
                  <div class="option-icon">
                    <i class="pi pi-bolt" />
                  </div>
                  <div class="option-content">
                    <h4>Canlı Müzayede</h4>
                    <p>Sırayla ihaleye çıkan ürünler, anlık teklifler, anti-sniping dinamik süre uzatma ve canlı yönetici kumanda ekranı.</p>
                  </div>
                </div>

                <div class="type-option-card timed" @click="selectTypeAndCreate('TIMED')">
                  <div class="option-icon">
                    <i class="pi pi-clock" />
                  </div>
                  <div class="option-content">
                    <h4>Süreli Müzayede</h4>
                    <p>Belirli tarihler arasında açık kalan, ürünlerin aynı anda teklif toplayabildiği, otomatik kapanan müzayede modeli.</p>
                  </div>
                </div>
              </div>
            </div>
            <footer class="modal-footer">
              <button class="button ghost" @click="showTypeModal = false">Vazgeç</button>
            </footer>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ─── FORM DRAWER FOR CREATE/EDIT ─── -->
    <AdminDrawerForm
      :open="drawerOpen"
      :title="drawerTitle"
      :fields="drawerFields"
      :reason-required="true"
      :default-reason="defaultReasonValue"
      :confirm-label="drawerConfirmLabel"
      :presentation="'modal'"
      @close="closeDrawer"
      @confirm="handleConfirmForm"
    />
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { adminApi, toApiMessage } from '../../services/api';
import AdminDrawerForm, {
  type DrawerConfirmPayload,
  type DrawerField,
} from '../../components/AdminDrawerForm.vue';

const router = useRouter();

const loading = ref(true);
const error = ref<string | null>(null);
const rawEvents = ref<any[]>([]);

// Search and Status Filters
const searchQuery = ref('');
const activeStatus = ref('');
const pagination = reactive({
  page: 1,
  limit: 12,
  total: 0
});

// Dynamic statistics based on loaded events
const stats = reactive({
  total: 0,
  active: 0,
  upcoming: 0,
  ended: 0
});

// Tab list with static counts
const statusTabs = computed(() => [
  { label: 'Tümü', value: '' },
  { label: 'Taslak', value: 'DRAFT' },
  { label: 'Başvuru', value: 'APPLICATION' },
  { label: 'Yaklaşan', value: 'UPCOMING' },
  { label: 'Aktif', value: 'ACTIVE' },
  { label: 'Sonlandı', value: 'ENDED' },
  { label: 'İptal', value: 'CANCELLED' }
]);

// Drawer state
const drawerOpen = ref(false);
const drawerTitle = ref('');
const drawerFields = ref<DrawerField[]>([]);
const drawerConfirmLabel = ref('');
const selectedEvent = ref<any | null>(null);
const drawerActionType = ref<'create' | 'edit'>('create');
const tempSelectedType = ref<'REALTIME' | 'TIMED'>('REALTIME');

const categories = ref<any[]>([]);

async function loadCategories() {
  try {
    const res = await adminApi.get('/admin/categories');
    categories.value = res.data.items || [];
  } catch (err) {
    console.error('Error loading categories:', err);
  }
}

const defaultReasonValue = computed(() => {
  return drawerActionType.value === 'create'
    ? 'Yeni müzayede etkinliği oluşturuldu'
    : 'Müzayede etkinliği bilgileri güncellendi';
});

// Fetch events from API
async function loadEvents() {
  loading.value = true;
  error.value = null;
  try {
    const params: Record<string, any> = {
      page: pagination.page,
      limit: pagination.limit,
    };
    if (searchQuery.value) {
      params.q = searchQuery.value;
    }
    if (activeStatus.value) {
      params.status = activeStatus.value;
    }

    const response = await adminApi.get('/admin/auction-events', { params });
    rawEvents.value = response.data.items || [];
    pagination.total = response.data.pagination?.total || rawEvents.value.length;

    // Load statistics separately or calculate from overall totals if backend allows.
    // To make sure stats are always accurate for the entire system, we fetch a brief summary 
    // or aggregate from the active page in fallback. Let's do a fast overview endpoint call
    // or calculate based on a query with limit 1000.
    const statsRes = await adminApi.get('/admin/auction-events', { params: { limit: 1000 } });
    const allItems = statsRes.data.items || [];
    stats.total = allItems.length;
    stats.active = allItems.filter((e: any) => e.status === 'ACTIVE').length;
    stats.upcoming = allItems.filter((e: any) => e.status === 'UPCOMING').length;
    stats.ended = allItems.filter((e: any) => e.status === 'ENDED').length;

  } catch (err) {
    error.value = toApiMessage(err);
  } finally {
    loading.value = false;
  }
}

// Search and pagination controls
let searchTimeout: any = null;
function handleSearchInput() {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    pagination.page = 1;
    loadEvents();
  }, 300);
}

function setStatusFilter(status: string) {
  activeStatus.value = status;
  pagination.page = 1;
  loadEvents();
}

function changePage(page: number) {
  pagination.page = page;
  loadEvents();
}

// Router navigation to details
function goToDetail(id: string) {
  router.push(`/auction-events/${id}`);
}

// Status Display translation helper
function getStatusText(status: string): string {
  switch (status) {
    case 'DRAFT': return 'Taslak';
    case 'APPLICATION': return 'Başvuruda';
    case 'UPCOMING': return 'Yaklaşan';
    case 'ACTIVE': return 'Aktif Canlı';
    case 'ENDED': return 'Sonlandı';
    case 'CANCELLED': return 'İptal Edildi';
    default: return status;
  }
}

// Calculate elapsed percentage for active event progress bar
function getElapsedTimePercentage(event: any): number {
  if (!event.startTime || !event.endTime) return 0;
  const start = new Date(event.startTime).getTime();
  const end = new Date(event.endTime).getTime();
  const now = Date.now();
  if (now <= start) return 0;
  if (now >= end) return 100;
  
  const total = end - start;
  const elapsed = now - start;
  return Math.round((elapsed / total) * 100);
}

// Form fields generator matching standard properties
const auctionEventStatusOptions = [
  { label: 'Taslak', value: 'DRAFT' },
  { label: 'Başvuru Sürecinde', value: 'APPLICATION' },
  { label: 'Yaklaşan', value: 'UPCOMING' },
  { label: 'Aktif', value: 'ACTIVE' },
  { label: 'Sonlandı', value: 'ENDED' },
  { label: 'İptal Edildi', value: 'CANCELLED' },
];

const auctionTypeOptions = [
  { label: 'Canlı', value: 'REALTIME' },
  { label: 'Süreli', value: 'TIMED' },
];

function generateFormFields(row: any | null): DrawerField[] {
  const fields: DrawerField[] = [
    { key: 'title', label: 'Müzayede Başlığı', required: true, value: row?.title || '', fullWidth: true },
    { key: 'description', label: 'Açıklama / Detaylar', type: 'textarea', value: row?.description || '' },
    { key: 'coverImageUrl', label: 'Kapak Görseli URL', type: 'image', value: row?.coverImageUrl || '' },
    {
      key: 'status',
      label: 'Yayın Durumu',
      type: 'select',
      value: row?.status || 'DRAFT',
      options: auctionEventStatusOptions,
    },
    {
      key: 'categoryId',
      label: 'Kategori (Filtreleme)',
      type: 'select',
      value: row?.categoryId || '',
      options: categories.value.map((cat) => ({
        label: cat.name,
        value: cat.id,
      })),
    },
  ];

  if (row && row.id) {
    fields.push({
      key: 'auctionType',
      label: 'Müzayede Tipi',
      type: 'select',
      value: row.auctionType || 'REALTIME',
      options: auctionTypeOptions,
    });
  }

  fields.push(
    { key: 'startTime', label: 'Başlangıç Tarihi', type: 'date', required: true, value: row?.startTime || '' },
    { key: 'endTime', label: 'Bitiş Tarihi', type: 'date', required: true, value: row?.endTime || '' },
    { key: 'submissionDeadline', label: 'Son Ürün Ekleme Tarihi (Opsiyonel)', type: 'date', value: row?.submissionDeadline || '' },
    {
      key: 'antiSnipingEnabled',
      label: 'Otomatik Süre Uzatma (Anti-Sniping)',
      type: 'select',
      value: row ? (row.antiSnipingEnabled === false ? 'false' : 'true') : 'true',
      options: [
        { label: 'Evet (Aktif)', value: 'true' },
        { label: 'Hayır (Pasif)', value: 'false' },
      ],
    },
    {
      key: 'maxExtensions',
      label: 'Maksimum Uzatma Sayısı',
      type: 'number',
      required: true,
      value: row ? String(row.maxExtensions ?? 5) : '5',
    },
    {
      key: 'extensionSeconds',
      label: 'Tetikleme Süresi (Saniye)',
      type: 'number',
      required: true,
      value: row ? String(row.extensionSeconds ?? 60) : '60',
    },
    {
      key: 'extensionDuration',
      label: 'Uzatma Süresi (Saniye)',
      type: 'number',
      required: true,
      value: row ? String(row.extensionDuration ?? 60) : '60',
    },
    {
      key: 'lotTransitionSeconds',
      label: 'Lot Geçiş Bekleme Süresi (Saniye)',
      type: 'number',
      required: true,
      value: row ? String(row.lotTransitionSeconds ?? 30) : '30',
    }
  );

  return fields;
}

// Modal and create triggers
const showTypeModal = ref(false);

function handleNewEventClick() {
  showTypeModal.value = true;
}

function selectTypeAndCreate(type: 'REALTIME' | 'TIMED') {
  showTypeModal.value = false;
  tempSelectedType.value = type;
  selectedEvent.value = null;
  drawerActionType.value = 'create';
  drawerTitle.value = `Yeni ${type === 'REALTIME' ? 'Canlı' : 'Süreli'} Müzayede Oluştur`;
  drawerConfirmLabel.value = 'Müzayede Etkinliği Oluştur';
  
  // Set default form field presets
  drawerFields.value = generateFormFields({
    auctionType: type,
    status: 'DRAFT',
    antiSnipingEnabled: true,
    maxExtensions: 5,
    extensionSeconds: 60,
    extensionDuration: 60,
    lotTransitionSeconds: 30
  });
  drawerOpen.value = true;
}

function handleEditClick(eventItem: any) {
  selectedEvent.value = eventItem;
  drawerActionType.value = 'edit';
  drawerTitle.value = 'Etkinliği Düzenle';
  drawerConfirmLabel.value = 'Değişiklikleri Kaydet';
  drawerFields.value = generateFormFields(eventItem);
  drawerOpen.value = true;
}

function closeDrawer() {
  drawerOpen.value = false;
  selectedEvent.value = null;
}

async function handleConfirmForm(payload: DrawerConfirmPayload) {
  const body: Record<string, any> = {
    reason: payload.reason,
    metadata: {
      ...payload.values,
      auctionType: selectedEvent.value?.auctionType || tempSelectedType.value
    }
  };

  try {
    if (drawerActionType.value === 'create') {
      await adminApi.post('/admin/auction-events', body);
    } else {
      await adminApi.patch(`/admin/auction-events/${selectedEvent.value.id}`, body);
    }
    closeDrawer();
    loadEvents();
  } catch (err) {
    error.value = toApiMessage(err);
  }
}

// Helper formats
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString('tr-TR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const filteredEvents = computed(() => {
  return rawEvents.value;
});

onMounted(() => {
  loadEvents();
  loadCategories();
});
</script>

<style scoped>
.auction-events-page {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.action-btn-new {
  box-shadow: 0 4px 12px rgba(54, 95, 168, 0.25);
  transition: all 0.2s ease;
}
.action-btn-new:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(54, 95, 168, 0.35);
}

/* Stats Row */
.stats-dashboard {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: var(--bg-panel, #ffffff);
  border: 1px solid var(--border-soft, #e3e8f0);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--shadow-soft, 0 4px 16px rgba(0,0,0,0.02));
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  border-color: var(--brand-500);
}

.stat-card.active {
  border-color: var(--brand-500);
  background: var(--brand-100);
}

.stat-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
}

.stat-icon-wrapper.blue { background: #eff6ff; color: #3b82f6; }
.stat-icon-wrapper.green { background: #ecfdf5; color: #10b981; }
.stat-icon-wrapper.purple { background: #f5f3ff; color: #8b5cf6; }
.stat-icon-wrapper.gray { background: #f8fafc; color: #64748b; }

.pulse-icon {
  animation: heartbeat 2s infinite;
}

@keyframes heartbeat {
  0% { transform: scale(1); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.785rem;
  color: var(--text-muted, #6b7280);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-strong, #182339);
  line-height: 1.1;
}

/* Filters & Search */
.filter-search-container {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: var(--bg-panel, #ffffff);
  border: 1px solid var(--border-soft, #e3e8f0);
  padding: 0.75rem 1rem;
  border-radius: 12px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--bg-canvas, #f4f6fa);
  border: 1px solid var(--border-soft, #e3e8f0);
  border-radius: 8px;
  padding: 0 0.75rem;
  width: 320px;
  max-width: 100%;
}

.search-box i {
  color: var(--text-muted, #6b7280);
  font-size: 0.9rem;
}

.search-box input {
  border: none;
  background: transparent;
  padding: 0.5rem 0;
  width: 100%;
  outline: none;
  color: var(--text-strong, #182339);
}

.tabs-navigation {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.tab-btn {
  border: none;
  background: transparent;
  color: var(--text-muted, #6b7280);
  padding: 0.45rem 0.85rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  background: var(--bg-canvas, #f4f6fa);
  color: var(--text-strong, #182339);
}

.tab-btn.active {
  background: var(--brand-600);
  color: #ffffff;
}

.tab-badge {
  font-size: 0.7rem;
  background: rgba(0, 0, 0, 0.08);
  color: inherit;
  padding: 0.1rem 0.35rem;
  border-radius: 10px;
}
.tab-btn.active .tab-badge {
  background: rgba(255, 255, 255, 0.2);
}

/* Event Grid */
.events-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.event-card {
  background: var(--bg-panel, #ffffff);
  border: 1px solid var(--border-soft, #e3e8f0);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--shadow-soft, 0 4px 16px rgba(0,0,0,0.02));
  display: flex;
  flex-direction: column;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.event-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
}

.event-card.card-is-active {
  border-color: #10b981;
  box-shadow: 0 4px 20px rgba(16, 185, 129, 0.06);
}

.card-cover {
  height: 160px;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}
.event-card:hover .cover-img {
  transform: scale(1.05);
}

.cover-gradient-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #365fa8 0%, #0f172a 100%);
  color: #ffffff;
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: 2px;
}

.status-badge-overlay {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  font-size: 0.725rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.25);
}

.status-badge-overlay.draft { background: rgba(100, 116, 139, 0.85); backdrop-filter: blur(4px); }
.status-badge-overlay.application { background: rgba(147, 51, 234, 0.85); backdrop-filter: blur(4px); }
.status-badge-overlay.upcoming { background: rgba(59, 130, 246, 0.85); backdrop-filter: blur(4px); }
.status-badge-overlay.active { background: #10b981; }
.status-badge-overlay.ended { background: rgba(239, 68, 68, 0.85); backdrop-filter: blur(4px); }
.status-badge-overlay.cancelled { background: rgba(220, 38, 38, 0.85); backdrop-filter: blur(4px); }

.live-dot {
  width: 8px;
  height: 8px;
  background: #ffffff;
  border-radius: 50%;
  animation: pulse-white 1.5s infinite;
}

@keyframes pulse-white {
  0% { transform: scale(0.9); opacity: 0.6; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.6; }
}

.type-pill-overlay {
  position: absolute;
  bottom: 12px;
  right: 12px;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  color: #ffffff;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.type-pill-overlay.realtime {
  border: 1px solid rgba(251, 191, 36, 0.4);
}
.type-pill-overlay.realtime i {
  color: #fbbf24;
}

.card-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex-grow: 1;
}

.event-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-strong, #182339);
  line-height: 1.25;
}

.event-desc {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-muted, #6b7280);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  height: 2.8em;
}

/* Timeline Progress Bar */
.event-timeline-progress {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.25rem;
}
.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  font-weight: 600;
  color: #10b981;
}
.progress-track {
  height: 6px;
  background: #f1f5f9;
  border-radius: 3px;
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #059669);
}

.event-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  background: var(--bg-canvas, #f4f6fa);
  padding: 0.75rem;
  border-radius: 10px;
  margin-top: auto;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.meta-item i {
  color: var(--text-muted, #6b7280);
  font-size: 0.95rem;
}

.meta-label {
  display: block;
  font-size: 0.65rem;
  color: var(--text-muted, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.meta-value {
  display: block;
  font-size: 0.775rem;
  font-weight: 700;
  color: var(--text-strong, #182339);
}

.card-footer {
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--border-soft, #e3e8f0);
  display: flex;
  gap: 0.5rem;
}

.edit-btn {
  flex-grow: 1;
}

.control-panel-btn {
  flex-grow: 2;
  gap: 0.4rem;
}

/* Pagination */
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
  padding: 1rem;
  background: var(--bg-panel, #ffffff);
  border: 1px solid var(--border-soft, #e3e8f0);
  border-radius: 12px;
}

.pagination-info {
  font-size: 0.85rem;
  color: var(--text-muted, #6b7280);
}

/* Loading & Empty States */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.empty-icon {
  font-size: 3rem;
  color: var(--text-muted, #9ca3af);
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  color: var(--text-strong, #182339);
}

.empty-state p {
  margin: 0;
  color: var(--text-muted, #6b7280);
  max-width: 400px;
}

/* Modal Stiling */
.type-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(6px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.type-modal-card {
  width: 540px;
  max-width: 90%;
  background: var(--bg-panel, #ffffff);
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.type-modal-card .modal-header {
  padding: 1.25rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-soft, #e3e8f0);
}

.type-modal-card .modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-strong, #182339);
}

.type-modal-card .modal-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.type-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.type-option-card {
  display: flex;
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid var(--border-soft, #e3e8f0);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.type-option-card:hover {
  transform: translateY(-2px);
  border-color: var(--brand-500);
  box-shadow: 0 6px 15px rgba(54, 95, 168, 0.08);
}

.option-icon {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.realtime .option-icon { background: #eff6ff; color: #3b82f6; }
.timed .option-icon { background: #fffbeb; color: #d97706; }

.option-content h4 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-strong, #182339);
}

.option-content p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-muted, #6b7280);
  line-height: 1.4;
}

.type-modal-card .modal-footer {
  padding: 1rem 1.5rem;
  background: var(--bg-soft, #f8f9fc);
  border-top: 1px solid var(--border-soft, #e3e8f0);
  display: flex;
  justify-content: flex-end;
}

/* Animations */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
