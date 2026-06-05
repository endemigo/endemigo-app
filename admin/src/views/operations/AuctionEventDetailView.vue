<template>
  <section class="field-grid auction-event-detail">
    <header class="page-header">
      <div>
        <h1>{{ event?.title || 'Müzayede Etkinliği Detayı' }}</h1>
        <p>Müzayede Etkinliği Yönetim ve Kumanda Paneli</p>
      </div>
      <div class="toolbar">
        <button class="button ghost" type="button" @click="loadDetail">
          <i class="pi pi-refresh" aria-hidden="true" />
          Yenile
        </button>
        <button class="button" type="button" @click="router.back()">
          <i class="pi pi-arrow-left" aria-hidden="true" />
          Geri
        </button>
      </div>
    </header>

    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem" />
      <p>Etkinlik detayları yükleniyor...</p>
    </div>

    <div v-else-if="error" class="error-banner">
      <i class="pi pi-exclamation-triangle" />
      <span>{{ error }}</span>
    </div>

    <div v-else class="event-dashboard-grid">
      <!-- ─── ETKİNLİK ÖZET KARTI & CANLI KUMANDA PANELI ─── -->
      <aside class="dashboard-sidebar">
        <article class="overview-hero-card">
          <div v-if="event?.coverImageUrl" class="cover-image-container">
            <img :src="event.coverImageUrl" alt="Etkinlik Kapağı" class="cover-image" />
          </div>
          <header class="overview-hero-header">
            <div>
              <p class="overview-eyebrow">Müzayede Etkinliği</p>
              <h3 class="overview-title">{{ event?.title }}</h3>
            </div>
            <span class="status-badge" :class="event?.status?.toLowerCase()">
              {{ event?.status }}
            </span>
          </header>
          <div class="event-meta-info">
            <div class="meta-row">
              <span class="label">Müzayede Tipi:</span>
              <strong class="value">{{ event?.auctionType === 'REALTIME' ? 'Canlı (Realtime)' : 'Süreli (Timed)' }}</strong>
            </div>
            <div class="meta-row">
              <span class="label">Başlangıç:</span>
              <strong class="value">{{ formatDate(event?.startTime) }}</strong>
            </div>
            <div class="meta-row">
              <span class="label">Bitiş:</span>
              <strong class="value">{{ formatDate(event?.endTime) }}</strong>
            </div>
            <div class="meta-row">
              <span class="label">Aktif Lot ID:</span>
              <strong class="value text-primary font-mono">{{ event?.activeLotId ? event.activeLotId.substring(0, 8) : 'Yok' }}</strong>
            </div>
          </div>
        </article>

        <!-- CANLI KUMANDA ARACI (Yalnızca Realtime Etkinlikler İçin) -->
        <article v-if="event?.auctionType === 'REALTIME'" class="live-controller-card">
          <header class="card-header">
            <h4>Canlı Kumanda Arayüzü</h4>
            <div v-if="event?.status === 'ACTIVE'" class="live-indicator">
              <span class="pulse-dot"></span>
              <span>CANLI</span>
            </div>
          </header>
          
          <p class="control-description">
            Canlı müzayede akışını, Lot sürelerini ve otomatik sıralı geçiş motorunu buradan anlık olarak kumanda edebilirsiniz.
          </p>

          <div class="active-lot-status-box" v-if="activeLot">
            <span class="box-eyebrow">Aktif İhale Edilen Ürün</span>
            <h5>{{ activeLot.product?.title }}</h5>
            <div class="box-meta">
              <span>Lot: #{{ activeLot.lotNumber }}</span>
              <span>| Fiyat: <strong>{{ formatMoney(activeLot.currentPrice) }}</strong></span>
            </div>
          </div>

          <div class="control-actions">
            <button
              v-if="event?.status === 'ACTIVE'"
              class="button warning full-width"
              type="button"
              @click="handlePause"
            >
              <i class="pi pi-pause" />
              Süreyi Duraklat (Pause)
            </button>

            <button
              v-if="event?.status === 'ACTIVE'"
              class="button success full-width"
              type="button"
              @click="handleResume"
            >
              <i class="pi pi-play" />
              Devam Ettir (Resume)
            </button>

            <button
              v-if="event?.status === 'ACTIVE'"
              class="button danger full-width"
              type="button"
              @click="handleSkip"
            >
              <i class="pi pi-step-forward" />
              Sıradaki Lot'a Atla (Skip)
            </button>
          </div>
        </article>
      </aside>

      <!-- ─── BAŞVURU HAVUZU & KATALOG SIRALAMA ─── -->
      <main class="dashboard-main-content">
        <!-- KATALOG SIRALAMA VE LOT YÖNETİMİ -->
        <section class="record-block catalog-section">
          <header class="section-header">
            <div>
              <h3>Katalog ve Lot Sıralaması</h3>
              <p>Müzayedeye kabul edilmiş ve sıraya dizilmiş onaylı ürünler</p>
            </div>
            <button 
              v-if="hasOrderChanges" 
              class="button primary" 
              type="button" 
              @click="saveNewSequence"
              :disabled="savingSequence"
            >
              <i v-if="savingSequence" class="pi pi-spin pi-spinner" />
              <i v-else class="pi pi-save" />
              Sıralamayı Kaydet
            </button>
          </header>

          <div v-if="approvedLots.length === 0" class="empty-state">
            <i class="pi pi-box empty-icon" />
            <p>Kataloğa henüz kabul edilmiş ürün bulunmamaktadır. Aşağıdaki başvuru havuzundan ürün onaylayabilirsiniz.</p>
          </div>

          <div v-else class="lots-list-container">
            <div 
              v-for="(lot, index) in approvedLots" 
              :key="lot.id" 
              class="lot-row-card"
              :class="{ 'is-active': lot.id === event?.activeLotId }"
            >
              <div class="lot-index-badge">
                <span>Lot</span>
                <strong>{{ index + 1 }}</strong>
              </div>
              <div class="lot-product-image" v-if="lot.product?.images?.[0]?.url || lot.product?.imageUrl">
                <img :src="lot.product?.images?.[0]?.url || lot.product?.imageUrl" alt="Ürün Görseli" />
              </div>
              <div class="lot-product-details">
                <h5>{{ lot.product?.title }}</h5>
                <div class="lot-meta-badges">
                  <span class="lot-badge">Satıcı: {{ lot.seller?.businessName || 'Bireysel Satıcı' }}</span>
                  <span class="lot-badge font-mono">Lot No: {{ lot.lotNumber }}</span>
                  <span class="lot-badge highlight">Başlangıç: {{ formatMoney(lot.startPrice) }}</span>
                </div>
              </div>
              <button 
                class="button ghost size-sm" 
                type="button" 
                @click="goToAuctionDetail(lot.id)"
                title="Müzayede (Lot) Detayını Gör"
                style="margin-right: 0.5rem;"
              >
                <i class="pi pi-external-link" />
                Detay
              </button>
              <div class="lot-order-controls">
                <button 
                  class="button icon-only ghost" 
                  type="button" 
                  @click="moveLotUp(index)"
                  :disabled="index === 0"
                  title="Yukarı Taşı"
                >
                  <i class="pi pi-angle-up" />
                </button>
                <button 
                  class="button icon-only ghost" 
                  type="button" 
                  @click="moveLotDown(index)"
                  :disabled="index === approvedLots.length - 1"
                  title="Aşağı Taşı"
                >
                  <i class="pi pi-angle-down" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- BAŞVURU HAVUZU -->
        <section class="record-block submissions-section">
          <h3>Başvuru Havuzu</h3>
          <p class="section-desc">Satıcılar tarafından bu etkinliğe katılım için gönderilen ve onay bekleyen ürünler</p>

          <div v-if="pendingSubmissions.length === 0" class="empty-state">
            <i class="pi pi-inbox empty-icon" />
            <p>Etkinlik için bekleyen yeni ürün başvurusu bulunmamaktadır.</p>
          </div>

          <div v-else class="table-wrap">
            <table class="detail-table submission-table">
              <thead>
                <tr>
                  <th>Ürün Bilgisi</th>
                  <th>Satıcı</th>
                  <th>Başlangıç Fiyatı</th>
                  <th>Başvuru Tarihi</th>
                  <th class="text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="sub in pendingSubmissions" :key="sub.id">
                  <td>
                    <div class="product-cell">
                      <div class="product-thumb" v-if="sub.product?.images?.[0]?.url || sub.product?.imageUrl">
                        <img :src="sub.product?.images?.[0]?.url || sub.product?.imageUrl" alt="Ürün" />
                      </div>
                      <div>
                        <strong>{{ sub.product?.title }}</strong>
                        <small class="block font-mono text-muted">ID: {{ sub.id.substring(0, 8) }}</small>
                      </div>
                    </div>
                  </td>
                  <td>{{ sub.seller?.businessName || 'Bireysel Satıcı' }}</td>
                  <td>{{ formatMoney(sub.startPrice) }}</td>
                  <td>{{ formatDate(sub.createdAt) }}</td>
                  <td>
                    <div class="action-buttons-cell">
                      <button 
                        class="button primary size-sm" 
                        type="button" 
                        @click="openApprovalModal(sub.id, 'APPROVED')"
                      >
                        <i class="pi pi-check" />
                        Kabul Et
                      </button>
                      <button 
                        class="button danger size-sm" 
                        type="button" 
                        @click="openApprovalModal(sub.id, 'REJECTED')"
                      >
                        <i class="pi pi-times" />
                        Reddet
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>

    <!-- ONAY / RED GEREKÇE MODALI -->
    <div class="custom-modal-backdrop" v-if="showModal">
      <div class="custom-modal-card">
        <header class="modal-header">
          <h4>{{ modalType === 'APPROVED' ? 'Başvuruyu Onayla' : 'Başvuruyu Reddet' }}</h4>
          <button class="button icon-only ghost" type="button" @click="closeModal">
            <i class="pi pi-times" />
          </button>
        </header>
        <div class="modal-body">
          <p class="modal-prompt">
            {{ modalType === 'APPROVED' ? 'Bu ürünü onaylayarak müzayede kataloğuna eklemek istediğinize emin misiniz?' : 'Ürün başvurusunu reddetmek istediğinize emin misiniz?' }}
          </p>
          <div class="form-group">
            <label for="reason-input">İşlem Gerekçesi (Zorunlu)</label>
            <textarea
              id="reason-input"
              v-model="actionReason"
              placeholder="Lütfen bu kararın gerekçesini yazınız..."
              rows="4"
              class="form-control"
            />
          </div>
        </div>
        <footer class="modal-footer">
          <button class="button ghost" type="button" @click="closeModal">Vazgeç</button>
          <button 
            class="button" 
            :class="modalType === 'APPROVED' ? 'primary' : 'danger'"
            type="button" 
            @click="submitApprovalAction"
            :disabled="!actionReason.trim() || submittingAction"
          >
            <i v-if="submittingAction" class="pi pi-spin pi-spinner" />
            {{ modalType === 'APPROVED' ? 'Onayla ve Kataloğa Ekle' : 'Reddet' }}
          </button>
        </footer>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { adminApi, toApiMessage } from '../../services/api';

const props = defineProps<{
  id: string;
}>();

const router = useRouter();

const loading = ref(true);
const error = ref<string | null>(null);

const event = ref<any>(null);
const approvedLots = ref<any[]>([]);
const pendingSubmissions = ref<any[]>([]);

// Katalog Sıralama Kontrolleri
const originalOrder = ref<string[]>([]);
const hasOrderChanges = computed(() => {
  if (approvedLots.value.length !== originalOrder.value.length) return false;
  return approvedLots.value.some((lot, idx) => lot.id !== originalOrder.value[idx]);
});
const savingSequence = ref(false);

// Aktif Lot
const activeLot = computed(() => {
  if (!event.value?.activeLotId) return null;
  return approvedLots.value.find((lot) => lot.id === event.value.activeLotId) || null;
});

// Onay/Red Modalı State'leri
const showModal = ref(false);
const modalType = ref<'APPROVED' | 'REJECTED'>('APPROVED');
const targetSubmissionId = ref<string | null>(null);
const actionReason = ref('');
const submittingAction = ref(false);

async function loadDetail() {
  loading.value = true;
  error.value = null;
  try {
    const res = await adminApi.get(`/admin/auction-events/${props.id}`);
    event.value = res.data.overview;
    approvedLots.value = res.data.approvedLots || [];
    pendingSubmissions.value = res.data.pendingSubmissions || [];
    
    // Orijinal sıralamayı kaydet
    originalOrder.value = approvedLots.value.map((lot) => lot.id);
  } catch (err) {
    error.value = toApiMessage(err);
  } finally {
    loading.value = false;
  }
}

// Sıralama Değiştirme
function moveLotUp(index: number) {
  if (index === 0) return;
  const temp = approvedLots.value[index];
  approvedLots.value[index] = approvedLots.value[index - 1];
  approvedLots.value[index - 1] = temp;
  approvedLots.value = [...approvedLots.value];
}

function moveLotDown(index: number) {
  if (index === approvedLots.value.length - 1) return;
  const temp = approvedLots.value[index];
  approvedLots.value[index] = approvedLots.value[index + 1];
  approvedLots.value[index + 1] = temp;
  approvedLots.value = [...approvedLots.value];
}

async function saveNewSequence() {
  savingSequence.value = true;
  try {
    const sequenceMap: Record<string, number> = {};
    approvedLots.value.forEach((lot, index) => {
      sequenceMap[lot.id] = index + 1;
    });

    await adminApi.patch(`/admin/auction-events/${props.id}/lots/sequence`, {
      metadata: { sequenceMap },
      reason: 'Lot sıralaması el ile güncellendi',
    });

    originalOrder.value = approvedLots.value.map((lot) => lot.id);
    await loadDetail();
  } catch (err) {
    error.value = toApiMessage(err);
  } finally {
    savingSequence.value = false;
  }
}

// Onaylama / Reddetme
function openApprovalModal(submissionId: string, type: 'APPROVED' | 'REJECTED') {
  targetSubmissionId.value = submissionId;
  modalType.value = type;
  actionReason.value = '';
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  targetSubmissionId.value = null;
  actionReason.value = '';
}

async function submitApprovalAction() {
  if (!targetSubmissionId.value) return;
  submittingAction.value = true;
  try {
    await adminApi.patch(`/admin/auctions/${targetSubmissionId.value}/approve`, {
      metadata: { status: modalType.value },
      reason: actionReason.value,
    });
    closeModal();
    await loadDetail();
  } catch (err) {
    error.value = toApiMessage(err);
  } finally {
    submittingAction.value = false;
  }
}

// Canlı Kumanda Fonksiyonları
async function handlePause() {
  try {
    await adminApi.patch(`/admin/auction-events/${props.id}/pause`, {});
    await loadDetail();
  } catch (err) {
    error.value = toApiMessage(err);
  }
}

async function handleResume() {
  try {
    await adminApi.patch(`/admin/auction-events/${props.id}/resume`, {});
    await loadDetail();
  } catch (err) {
    error.value = toApiMessage(err);
  }
}

async function handleSkip() {
  try {
    await adminApi.patch(`/admin/auction-events/${props.id}/skip`, {});
    await loadDetail();
  } catch (err) {
    error.value = toApiMessage(err);
  }
}

// Helper Formatters
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMoney(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '0,00 ₺';
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
}

function goToAuctionDetail(lotId: string): void {
  if (!lotId) return;
  void router.push(`/auctions/${lotId}`);
}

onMounted(() => {
  loadDetail();
});
</script>

<style scoped>
.auction-event-detail {
  padding: 1.5rem;
}

.event-dashboard-grid {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 2rem;
  margin-top: 1.5rem;
}

@media (max-width: 992px) {
  .event-dashboard-grid {
    grid-template-columns: 1fr;
  }
}

.dashboard-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Overview Card */
.overview-hero-card {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  backdrop-filter: blur(10px);
  border: 1px solid #334155;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.24);
}

.cover-image-container {
  height: 180px;
  width: 100%;
  overflow: hidden;
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.overview-hero-header {
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
}

.overview-eyebrow {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-secondary, #aaa);
  letter-spacing: 1px;
  margin: 0 0 0.25rem 0;
}

.overview-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary, #fff);
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.draft { background: rgba(128, 128, 128, 0.2); color: #aaa; }
.status-badge.application { background: rgba(168, 85, 247, 0.2); color: #a855f7; }
.status-badge.upcoming { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
.status-badge.active { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.status-badge.ended { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.status-badge.cancelled { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

.event-meta-info {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.meta-row .label {
  color: var(--text-secondary, #aaa);
}

.meta-row .value {
  color: var(--text-primary, #fff);
}

/* Live Controller Card */
.live-controller-card {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.24);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.card-header h4 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
}

.live-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.15);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: #ef4444;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.9); opacity: 0.6; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.6; }
}

.control-description {
  font-size: 0.8rem;
  color: var(--text-secondary, #aaa);
  margin-bottom: 1.25rem;
  line-height: 1.4;
}

.active-lot-status-box {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.25rem;
}

.box-eyebrow {
  font-size: 0.7rem;
  text-transform: uppercase;
  color: var(--text-secondary, #aaa);
  display: block;
  margin-bottom: 0.25rem;
}

.active-lot-status-box h5 {
  margin: 0 0 0.5rem 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary, #fff);
}

.box-meta {
  font-size: 0.8rem;
  color: var(--text-secondary, #aaa);
  display: flex;
  gap: 0.5rem;
}

.control-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.button.full-width {
  width: 100%;
  justify-content: center;
}

/* Dashboard Main Content */
.dashboard-main-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header h3 {
  margin: 0 0 0.25rem 0;
}

.section-header p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-muted, #6b7280);
}

.muted-info {
  background: var(--bg-soft, #f8f9fc);
  border: 1px dashed var(--border-soft, #e3e8f0);
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  color: var(--text-muted, #6b7280);
}

/* Lot Card Rows */
.lots-list-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.lot-row-card {
  display: flex;
  align-items: center;
  background: var(--bg-panel, #ffffff);
  border: 1px solid var(--border-soft, #e3e8f0);
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s ease;
}

.lot-row-card.is-active {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.03);
  box-shadow: 0 0 15px rgba(239, 68, 68, 0.1);
}

.lot-index-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  background: var(--bg-canvas, #f4f6fa);
  border-radius: 6px;
  margin-right: 1rem;
}

.lot-index-badge span {
  font-size: 0.65rem;
  text-transform: uppercase;
  color: var(--text-muted, #6b7280);
}

.lot-index-badge strong {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-strong, #182339);
}

.lot-product-image {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  margin-right: 1rem;
  background: rgba(0, 0, 0, 0.03);
}

.lot-product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.lot-product-details {
  flex-grow: 1;
}

.lot-product-details h5 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-strong, #182339);
}

.lot-meta-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.lot-badge {
  font-size: 0.75rem;
  background: var(--bg-canvas, #f4f6fa);
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  color: var(--text-muted, #6b7280);
}

.lot-badge.highlight {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  font-weight: 600;
}

.lot-order-controls {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

/* Submissions Section */
.section-desc {
  font-size: 0.875rem;
  color: var(--text-muted, #6b7280);
  margin-bottom: 1rem;
}

.product-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.product-thumb {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.02);
}

.product-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.action-buttons-cell {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.button.size-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

/* Modal Styling */
.custom-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.custom-modal-card {
  width: 500px;
  max-width: 90%;
  background: #181824;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
}

.modal-header {
  padding: 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
}

.modal-header h4 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
}

.modal-body {
  padding: 1.25rem;
}

.modal-prompt {
  font-size: 0.95rem;
  color: var(--text-primary, #fff);
  margin-bottom: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.8rem;
  color: var(--text-secondary, #aaa);
}

.form-control {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 6px;
  color: #fff;
  padding: 0.75rem;
  width: 100%;
  box-sizing: border-box;
  font-size: 0.9rem;
  resize: vertical;
}

.form-control:focus {
  outline: none;
  border-color: var(--primary-color, #3b82f6);
}

.modal-footer {
  padding: 1.25rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  background: rgba(0, 0, 0, 0.15);
  border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
}

.error-banner {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #ef4444;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1.5rem;
}
</style>
