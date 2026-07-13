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
        <button class="button" type="button" @click="router.push(`/auction-events/${props.id}/dashboard`)">
          <i class="pi pi-chart-bar" aria-hidden="true" />
          Pano & Rapor
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

    <div v-else class="event-dashboard-layout">
      <div class="dashboard-container-card">
        <!-- ─── CANLI İHALE KONSOLU (ACTIVE LOT CONSOLE - Üst Taraf Koyu) ─── -->
        <section v-if="event?.auctionType === 'REALTIME'" class="live-console-section">
          <div v-if="activeLot" class="console-dashboard">
            <!-- Sol Taraf: Aktif Lot Kontrolü -->
            <div class="active-lot-control-panel">
              <div class="active-lot-media" @click="openImageZoom(activeLot.product?.images?.[0]?.url || activeLot.product?.imageUrl)">
                <img 
                  v-if="activeLot.product?.images?.[0]?.url || activeLot.product?.imageUrl" 
                  :src="activeLot.product?.images?.[0]?.url || activeLot.product?.imageUrl" 
                  alt="Aktif Lot Görseli" 
                  @error="handleImageError"
                />
                <div class="media-fallback-icon">
                  <i class="pi pi-image" />
                  <span>Görsel Yok</span>
                </div>
                <div class="active-lot-live-tag">
                  <span class="live-dot-pulse"></span>
                  CANLI İHALEDE
                </div>
              </div>
              <div class="active-lot-details">
                <div class="lot-header">
                  <span class="lot-number-pill">LOT #{{ activeLot.sequenceNumber != null ? activeLot.sequenceNumber : (approvedLots.findIndex(l => l.id === activeLot.id) + 1) }}</span>
                  <span class="lot-db-id font-mono">ID: {{ activeLot.id.substring(0, 8) }}</span>
                </div>
                <h2 class="lot-title">{{ activeLot.product?.title }}</h2>
                
                <div class="lot-prices-grid">
                  <div class="price-kpi-card">
                    <span class="kpi-label">Başlangıç Fiyatı</span>
                    <strong class="kpi-value font-mono">{{ formatMoney(activeLot.startPrice) }}</strong>
                  </div>
                  
                  <div class="price-kpi-card highlight-glow">
                    <span class="kpi-label">Güncel Teklif</span>
                    <strong class="kpi-value font-mono current-price-color">{{ formatMoney(activeLot.currentPrice) }}</strong>
                  </div>

                  <div v-if="isUntimedEvent" class="price-kpi-card countdown-kpi-card highlight-glow">
                    <span class="kpi-label">Kalan Süre</span>
                    <strong class="kpi-value countdown-time font-mono">
                      <i class="pi pi-infinity" />
                      Süresiz
                    </strong>
                  </div>
                  <div v-else :class="['price-kpi-card countdown-kpi-card', { 'low-time-danger': timeLeftSeconds > 0 && timeLeftSeconds <= 15, 'ended': timeLeftSeconds <= 0, 'highlight-glow': timeLeftSeconds > 15 }]">
                    <span class="kpi-label">Kalan Süre</span>
                    <strong class="kpi-value countdown-time font-mono">
                      <i class="pi pi-clock clock-icon-spin" />
                      {{ formattedTimeLeft }}
                    </strong>
                  </div>
                </div>

                <div class="console-settings-row">
                  <!-- Otomatik Lot Geçişi Toggle -->
                  <div class="auto-progress-toggle-container">
                    <label class="switch-btn">
                      <input 
                        type="checkbox" 
                        v-model="autoProgress" 
                        @change="handleAutoProgressToggle" 
                      />
                      <span class="switch-slider"></span>
                    </label>
                    <span class="auto-progress-text">Otomatik Lot Geçişi</span>
                  </div>

                  <!-- Lot Geçiş Süresi Input -->
                  <div class="transition-seconds-input-container">
                    <span class="transition-seconds-label">Geçiş Süresi (sn)</span>
                    <input 
                      type="number" 
                      class="transition-seconds-input font-mono"
                      v-model.number="lotTransitionSeconds"
                      @change="handleLotTransitionSecondsChange"
                      min="0"
                      max="300"
                    />
                  </div>
                </div>

                <!-- Kontrol Butonları -->
                <div v-if="(event?.status === 'ACTIVE' || event?.status === 'PAUSED')" class="console-action-buttons">
                  <button
                    v-if="activeLot && activeLot.status === 'ACTIVE'"
                    class="button warning control-btn"
                    type="button"
                    @click="handlePause"
                  >
                    <i class="pi pi-pause" />
                    Duraklat
                  </button>
                  <button
                    v-if="activeLot && activeLot.status === 'PUBLISHED'"
                    class="button success control-btn"
                    type="button"
                    @click="handleResume"
                  >
                    <i class="pi pi-play" />
                    Başlat
                  </button>
                  <button
                    v-if="hasUnfinishedLots"
                    class="button danger control-btn"
                    type="button"
                    @click="handleSkip"
                  >
                    <i class="pi pi-step-forward" />
                    Sıradaki Lot
                  </button>
                </div>

                <!-- Sunucu Anonsları: yakılıyor / son çağrı / sattım -->
                <div
                  v-if="activeLot && activeLot.status === 'ACTIVE'"
                  class="console-action-buttons"
                >
                  <button
                    class="button warning control-btn"
                    type="button"
                    :disabled="announcing"
                    @click="handleAnnounce('BURNING')"
                  >
                    <i class="pi pi-fire" />
                    Ürün Yakılıyor
                  </button>
                  <button
                    class="button warning control-btn"
                    type="button"
                    :disabled="announcing"
                    @click="handleAnnounce('LAST_CALL')"
                  >
                    <i class="pi pi-megaphone" />
                    Son ve Adil Çağrı
                  </button>
                  <button
                    class="button success control-btn"
                    type="button"
                    :disabled="announcing"
                    @click="handleAnnounce('SOLD')"
                  >
                    <i class="pi pi-check" />
                    Satıyorum... Sattım
                  </button>
                </div>
              </div>
            </div>

            <!-- Sağ Taraf: Canlı Teklif Akışı (Live Bids Stream) -->
            <div class="live-bids-stream-panel">
              <div class="stream-header">
                <h3>
                  <i class="pi pi-bolt stream-icon-bolt" />
                  Teklif Akışı
                </h3>
                <div class="stream-header-badges">
                  <span class="total-bids-badge font-mono">{{ activeLot?.bidCount || 0 }} Teklif</span>
                  <span class="live-feed-badge">CANLI LOG</span>
                </div>
              </div>
              <div class="bids-scroll-container">
                <div v-if="loadingBids" class="bids-stream-loading">
                  <i class="pi pi-spin pi-spinner" />
                  <span>Teklifler yükleniyor...</span>
                </div>
                <div v-else-if="activeLotBids.length === 0" class="bids-stream-empty">
                  <i class="pi pi-info-circle" />
                  <p>Bu lot için henüz teklif verilmedi.</p>
                </div>
                <TransitionGroup v-else name="bid-list" tag="div" class="bids-stream-list">
                  <div 
                    v-for="(bid, index) in activeLotBids" 
                    :key="bid.id" 
                    class="bid-stream-item"
                    :class="{ 'is-newest': index === 0 }"
                  >
                    <div class="bidder-avatar">
                      <i class="pi pi-user" />
                    </div>
                    <div class="bid-item-info">
                      <span class="bidder-name">{{ getBidderDisplayName(bid) }}</span>
                      <span class="bid-timestamp">{{ formatDate(bid.createdAt) }}</span>
                    </div>
                    <div class="bid-item-amount font-mono">
                      {{ formatMoney(bid.amount) }}
                    </div>
                  </div>
                </TransitionGroup>
              </div>
            </div>
          </div>

          <div v-else-if="event?.status === 'ACTIVE'" class="live-console-empty">
            <i class="pi pi-clock" />
            <p>Müzayede Odasında Şu Anda Aktif İhale Edilen Bir Lot Bulunmamaktadır.</p>
          </div>
          <div v-else-if="event?.status === 'FINISHED'" class="live-console-empty">
            <i class="pi pi-check-circle" />
            <p>Bu müzayede tamamlanmıştır.</p>
          </div>
          <div v-else class="live-console-empty">
            <i class="pi pi-calendar" />
            <p>Müzayede henüz başlamamıştır.</p>
          </div>
        </section>

        <!-- ─── ALT TARAF AÇIK RENK KARTLAR (BİRLEŞİK) ─── -->
        <div class="dashboard-columns-layout">
          <!-- Sol Kolon: Etkinlik Detayları -->
          <aside class="dashboard-sidebar">
            <div class="cover-image-container" @click="openImageZoom(event?.coverImageUrl)">
              <img 
                v-if="event?.coverImageUrl" 
                :src="event.coverImageUrl" 
                alt="Etkinlik Kapağı" 
                class="cover-image" 
                @error="handleImageError"
              />
              <div class="cover-fallback-icon">
                <i class="pi pi-image" />
                <span>Kapak Görseli Yok</span>
              </div>
            </div>
            <div class="sidebar-content">
              <header class="overview-hero-header">
                <div>
                  <p class="overview-eyebrow">Müzayede Etkinliği</p>
                  <h3 class="overview-title">{{ event?.title }}</h3>
                  <p v-if="event?.currency && event.currency !== 'TRY'" class="overview-eyebrow" style="margin-top: 0.25rem;">
                    Para Birimi: <strong>{{ event.currency }}</strong> — peyler ve tahsilat bu kurdan yürür
                  </p>
                </div>
                <span class="status-badge" :class="event?.status?.toLowerCase()">
                  {{ getEventStatusLabel(event?.status) }}
                </span>
              </header>
              <div class="event-meta-info">
                <div class="meta-row">
                  <span class="label">Müzayede Tipi:</span>
                  <strong class="value">{{ event?.auctionType === 'REALTIME' ? 'Canlı' : 'Süreli' }}</strong>
                </div>
                <div class="meta-row" v-if="event?.category">
                  <span class="label">Kategori:</span>
                  <strong class="value">{{ event.category.name }}</strong>
                </div>
                <div class="meta-row">
                  <span class="label">Başlangıç:</span>
                  <strong class="value">{{ formatDate(event?.startTime) }}</strong>
                </div>
                <div class="meta-row">
                  <span class="label">Bitiş:</span>
                  <strong class="value">{{ event?.isUntimed ? 'Süresiz — panelden sonlandırılır' : formatDate(event?.endTime) }}</strong>
                </div>
                <div class="meta-row" v-if="event?.activeLotId">
                  <span class="label">Aktif Lot ID:</span>
                  <strong class="value text-primary font-mono">{{ event?.activeLotId ? event.activeLotId.substring(0, 8) : 'Yok' }}</strong>
                </div>
              </div>
            </div>
          </aside>

          <!-- Sağ Kolon: Katalog ve Lot Sıralaması + Başvuru Havuzu -->
          <main class="dashboard-main-content">
            <!-- KATALOG SIRALAMA VE LOT YÖNETİMİ -->
            <section class="record-block catalog-section">
              <header class="section-header">
                <div>
                  <h3>Katalog ve Lot Sıralaması</h3>
                  <p>Müzayedeye kabul edilmiş ve sıraya dizilmiş onaylı ürünler</p>
                </div>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                  <button 
                    class="button secondary" 
                    type="button" 
                    @click="openAddLotModal"
                  >
                    <i class="pi pi-bars" />
                    Listeden Ekle
                  </button>
                  <button 
                    class="button primary" 
                    type="button" 
                    @click="openQuickCreateModal"
                  >
                    <i class="pi pi-plus" />
                    Yeni Ürün Ekle
                  </button>
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
                </div>
              </header>

              <div v-if="approvedLots.length === 0" class="empty-state">
                <i class="pi pi-box empty-icon" />
                <p v-if="['DRAFT', 'APPLICATION', 'UPCOMING'].includes(event?.status)">Kataloğa henüz kabul edilmiş ürün bulunmamaktadır. Aşağıdaki başvuru havuzundan ürün onaylayabilirsiniz.</p>
                <p v-else>Kataloğa kabul edilmiş ürün bulunmamaktadır.</p>
              </div>

              <div v-else class="lots-list-container">
                <div 
                  v-for="(lot, index) in approvedLots" 
                  :key="lot.id" 
                  class="lot-row-card"
                  :class="{ 'is-active': lot.id === event?.activeLotId }"
                >
                  <div class="lot-index-badge" :class="{ 'is-active-badge': lot.id === event?.activeLotId }">
                    <span class="live-indicator-dot" v-if="lot.id === event?.activeLotId"></span>
                    <span>Lot</span>
                    <strong>{{ index + 1 }}</strong>
                  </div>
                  <div class="lot-product-image" @click="openImageZoom(lot.product?.images?.[0]?.url || lot.product?.imageUrl)">
                    <img 
                      v-if="lot.product?.images?.[0]?.url || lot.product?.imageUrl" 
                      :src="lot.product?.images?.[0]?.url || lot.product?.imageUrl" 
                      alt="Ürün Görseli" 
                      @error="handleImageError"
                    />
                    <div class="fallback-icon">
                      <i class="pi pi-image" />
                    </div>
                  </div>
                  <div class="lot-product-details">
                    <h5>{{ lot.product?.title }}</h5>
                    <div class="lot-meta-badges">
                      <span class="lot-badge">Tedarikçi: {{ getSellerName(lot.seller) }}</span>

                      <span class="lot-badge highlight">Başlangıç: {{ formatMoney(lot.startPrice) }}</span>
                      <span class="lot-badge highlight active-price" v-if="lot.id === event?.activeLotId">Güncel Teklif: {{ formatMoney(lot.currentPrice) }}</span>
                      <span class="lot-badge highlight count-badge" v-if="lot.id === event?.activeLotId">{{ lot.bidCount || 0 }} Teklif</span>
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
                      :disabled="index === 0 || isFinished(lot) || isFinished(approvedLots[index - 1])"
                      title="Yukarı Taşı"
                    >
                      <i class="pi pi-angle-up" />
                    </button>
                    <button 
                      class="button icon-only ghost" 
                      type="button" 
                      @click="moveLotDown(index)"
                      :disabled="index === approvedLots.length - 1 || isFinished(lot) || isFinished(approvedLots[index + 1])"
                      title="Aşağı Taşı"
                    >
                      <i class="pi pi-angle-down" />
                    </button>
                    <button 
                      class="button icon-only danger ghost" 
                      type="button" 
                      @click="removeLot(lot.id)"
                      title="Müzayededen Kaldır"
                      style="margin-left: 0.5rem;"
                    >
                      <i class="pi pi-trash" />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <!-- BAŞVURU HAVUZU -->
            <section v-if="['DRAFT', 'APPLICATION', 'UPCOMING'].includes(event?.status)" class="record-block submissions-section">
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
                          <div class="product-thumb" @click="openImageZoom(sub.product?.images?.[0]?.url || sub.product?.imageUrl)">
                            <img 
                              v-if="sub.product?.images?.[0]?.url || sub.product?.imageUrl" 
                              :src="sub.product?.images?.[0]?.url || sub.product?.imageUrl" 
                              alt="Ürün" 
                              @error="handleImageError"
                            />
                            <div class="fallback-icon">
                              <i class="pi pi-image" />
                            </div>
                          </div>
                          <div>
                            <strong>{{ sub.product?.title }}</strong>
                            <small class="block font-mono text-muted">ID: {{ sub.id.substring(0, 8) }}</small>
                          </div>
                        </div>
                      </td>
                      <td>{{ getSellerName(sub.seller) }}</td>
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

            <!-- ORTAK MÜZAYEDE DAVETLERİ (Sadece JOINT ise) -->
            <section v-if="event?.eventType === 'JOINT'" class="record-block invitations-section" style="margin-top: 2rem;">
              <header class="section-header">
                <div>
                  <h3>Katılımcılar & Davetler</h3>
                  <p>Bu ortak müzayedeye ürün yüklemesi için davet edilen tedarikçiler</p>
                </div>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                  <button
                    class="button ghost"
                    type="button"
                    @click="router.push(`/products/bulk-import?eventId=${props.id}`)"
                  >
                    <i class="pi pi-file-excel" />
                    Excel'den Lot Yükle
                  </button>
                  <button class="button primary" type="button" @click="openInviteModal">
                    <i class="pi pi-user-plus" />
                    Tedarikçi Davet Et
                  </button>
                </div>
              </header>

              <div v-if="!invitations || invitations.length === 0" class="empty-state">
                <i class="pi pi-users empty-icon" />
                <p>Henüz kimseyi davet etmediniz.</p>
              </div>

              <div v-else class="table-wrap">
                <table class="detail-table submission-table">
                  <thead>
                    <tr>
                      <th>Tedarikçi Bilgisi</th>
                      <th>Davet Tarihi</th>
                      <th>Durum</th>
                      <th class="text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="inv in invitations" :key="inv.id">
                      <td>
                        <strong>{{ getSellerName(inv.invitee) }}</strong>
                        <small class="block text-muted">{{ inv.invitee?.email }}</small>
                      </td>
                      <td>{{ formatDate(inv.createdAt) }}</td>
                      <td>
                        <span class="status-badge" :class="inv.status?.toLowerCase()">
                          {{ getInvitationStatusLabel(inv.status) }}
                        </span>
                      </td>
                      <td>
                        <div class="action-buttons-cell">
                          <button v-if="inv.status === 'PENDING'" class="button ghost danger size-sm" @click="cancelInvitation(inv.id)" title="Daveti İptal Et">
                            <i class="pi pi-times" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </main>
        </div> <!-- dashboard-columns-layout -->
      </div> <!-- dashboard-container-card -->
    </div> <!-- event-dashboard-layout -->

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

    <!-- Özel Zaman Ayarlı Onay Modalı -->
    <div v-if="showConfirmModal" class="confirm-modal-backdrop">
      <div class="confirm-modal-content">
        <div class="confirm-modal-header">
          <h3>{{ confirmModalTitle }}</h3>
          <button class="confirm-close-btn" @click="closeConfirmModal">&times;</button>
        </div>
        <div class="confirm-modal-body">
          <p>{{ confirmModalMessage }}</p>
          <div class="confirm-progress-bar-container">
            <div class="confirm-progress-bar-fill" :style="{ width: (confirmTimeLeft * 10) + '%' }"></div>
          </div>
          <div class="confirm-countdown-text font-mono">
            {{ confirmTimeLeft.toFixed(1) }} saniye kaldı...
          </div>
        </div>
        <div class="confirm-modal-footer">
          <button class="button secondary" @click="closeConfirmModal">İptal</button>
          <button class="button primary" @click="executeConfirmAction">Onayla</button>
        </div>
      </div>
    </div>

    <!-- Image Zoom Modal -->
    <div class="custom-modal-backdrop image-zoom-backdrop" v-if="activeZoomImage" @click="activeZoomImage = null">
      <div class="image-zoom-content" @click.stop>
        <button class="image-zoom-close" @click="activeZoomImage = null">
          <i class="pi pi-times" />
        </button>
        <img :src="activeZoomImage" alt="Büyük Görsel" class="zoomed-image" />
      </div>
    </div>

    <!-- Yeni Ürün Ekle Modal -->
    <div v-if="showAddLotModal" class="custom-modal-backdrop" @click="showAddLotModal = false">
      <div class="custom-modal-card" style="max-width: 1000px; width: 95%;" @click.stop>
        <header class="modal-header">
          <h4>Müzayedeye Ürün Ekle</h4>
          <button class="button icon-only ghost" type="button" @click="showAddLotModal = false">
            <i class="pi pi-times" />
          </button>
        </header>
        
        <div class="modal-body" style="max-height: 60vh; overflow-y: auto;">
          <p class="modal-prompt mb-4">
            Kataloğunuzdaki boş ürünleri buradan müzayedeye dâhil edebilirsiniz. Lütfen eklemek istediğiniz ürünleri seçip başlangıç değerlerini girin.
          </p>
          
          <div v-if="loadingProducts" class="loading-state">
            <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
            <p>Ürünler yükleniyor...</p>
          </div>
          
          <div v-else-if="availableProducts.length === 0" class="empty-state" style="margin: 3rem 0;">
            <i class="pi pi-box empty-icon" />
            <p>Eklenecek uygun ürün bulunamadı. Önce ürün kataloğunuza yeni ürün eklemelisiniz.</p>
          </div>
          
          <div v-else class="table-wrap">
            <table class="detail-table">
              <thead>
                <tr>
                  <th style="width: 48px; text-align: center;">Seç</th>
                  <th style="width: 80px;">Sıra</th>
                  <th>Ürün Adı</th>
                  <th>Açılış (₺)</th>
                  <th>Artış (₺)</th>
                  <th>Hemen Al (₺)</th>
                  <th>Tahmini Alt (₺)</th>
                  <th>Tahmini Üst (₺)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="product in availableProducts" :key="product.id" :class="{ 'row-selected': selectedProductIds.includes(product.id) }">
                  <td style="text-align: center;">
                    <input 
                      type="checkbox" 
                      v-model="selectedProductIds" 
                      :value="product.id" 
                      style="width: 18px; height: 18px; cursor: pointer;"
                    />
                  </td>
                  <td>
                    <input 
                      v-if="selectedProductIds.includes(product.id)" 
                      type="number" 
                      v-model="product.lotOrder" 
                      class="form-control" 
                      style="width: 70px; padding: 0.25rem 0.5rem;"
                      min="1"
                    />
                    <span v-else class="text-muted">-</span>
                  </td>
                  <td>
                    <strong>{{ product.title }}</strong>
                    <small class="block font-mono text-muted">Stok: {{ product.stock || 0 }}</small>
                  </td>
                  <td>
                    <input 
                      v-if="selectedProductIds.includes(product.id)" 
                      type="number" 
                      v-model="product.startingPrice" 
                      class="form-control font-mono" 
                      style="width: 110px; padding: 0.25rem 0.5rem;"
                      min="1"
                      step="1"
                    />
                    <span v-else class="text-muted font-mono">{{ formatMoney(product.price) }}</span>
                  </td>
                  <td>
                    <input 
                      v-if="selectedProductIds.includes(product.id)" 
                      type="number" 
                      v-model="product.minIncrement" 
                      class="form-control font-mono" 
                      style="width: 110px; padding: 0.25rem 0.5rem;"
                      min="1"
                      step="1"
                    />
                    <span v-else class="text-muted">-</span>
                  </td>
                  <td>
                    <input
                      v-if="selectedProductIds.includes(product.id)"
                      type="number"
                      v-model="product.buyItNowPrice"
                      class="form-control font-mono"
                      style="width: 110px; padding: 0.25rem 0.5rem;"
                      placeholder="Opsiyonel"
                      :min="(product.startingPrice || 1) + 1"
                    />
                    <span v-else class="text-muted">-</span>
                  </td>
                  <td>
                    <input
                      v-if="selectedProductIds.includes(product.id)"
                      type="number"
                      v-model="product.estimatedValueMin"
                      class="form-control font-mono"
                      style="width: 110px; padding: 0.25rem 0.5rem;"
                      placeholder="Opsiyonel"
                      min="0"
                    />
                    <span v-else class="text-muted">-</span>
                  </td>
                  <td>
                    <input
                      v-if="selectedProductIds.includes(product.id)"
                      type="number"
                      v-model="product.estimatedValueMax"
                      class="form-control font-mono"
                      style="width: 110px; padding: 0.25rem 0.5rem;"
                      placeholder="Opsiyonel"
                      :min="product.estimatedValueMin || 0"
                    />
                    <span v-else class="text-muted">-</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div v-if="addLotValidationError && selectedProductIds.length > 0" class="error-banner" style="margin: 0 1.5rem; background: var(--danger-color-light, #ffebee); color: var(--danger-color, #c62828); padding: 0.75rem; border-radius: 4px; display: flex; align-items: center; gap: 0.5rem;">
          <i class="pi pi-exclamation-triangle" />
          <span>{{ addLotValidationError }}</span>
        </div>

        <footer class="modal-footer" style="justify-content: space-between;">
          <div class="selected-count">
            <span v-if="selectedProductIds.length > 0">
              <strong>{{ selectedProductIds.length }}</strong> ürün seçildi
            </span>
          </div>
          <div style="display: flex; gap: 0.75rem;">
            <button class="button ghost" type="button" @click="showAddLotModal = false">İptal</button>
            <button 
              class="button primary" 
              type="button"
              :disabled="selectedProductIds.length === 0 || isAddingLots || addLotValidationError !== null"
              @click="submitAddLots"
            >
              <i v-if="isAddingLots" class="pi pi-spin pi-spinner" />
              <i v-else class="pi pi-plus" />
              Müzayedeye Ekle
            </button>
          </div>
        </footer>
      </div>
    </div>

    <!-- Hızlı Ürün Oluştur Modal -->
    <div v-if="showQuickCreateModal" class="custom-modal-backdrop" @click="showQuickCreateModal = false">
      <div class="custom-modal-card" style="max-width: 600px; width: 95%;" @click.stop>
        <header class="modal-header">
          <h4>Yeni Ürün Ekle</h4>
          <button class="button icon-only ghost" type="button" @click="showQuickCreateModal = false">
            <i class="pi pi-times" />
          </button>
        </header>
        
        <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
          <p class="modal-prompt mb-4">
            Bu ekran sadece bu müzayede etkinliği için hızlı ürün oluşturmanızı sağlar.
          </p>

          <div v-if="quickCreateError" class="error-banner mb-4" style="background: var(--danger-color-light, #ffebee); color: var(--danger-color, #c62828); padding: 0.75rem; border-radius: 4px; display: flex; align-items: center; gap: 0.5rem;">
            <i class="pi pi-exclamation-triangle" />
            <span>{{ quickCreateError }}</span>
          </div>

          <div class="field-grid">
            <label class="field">
              <span>Ürün Adı *</span>
              <input v-model="quickCreateForm.title" class="input" placeholder="Örn: 19.yy El İşlemesi Halı" />
            </label>

            <label class="field">
              <span>Açıklama</span>
              <textarea v-model="quickCreateForm.description" class="textarea" rows="3" placeholder="Ürün hakkında kısa bir açıklama..."></textarea>
            </label>

            <div class="owner-grid">
              <label class="field">
                <span>Açılış Fiyatı (₺) *</span>
                <input v-model="quickCreateForm.startingPrice" class="input font-mono" type="number" min="0" />
              </label>
              <label class="field">
                <span>Min. Artış (₺) *</span>
                <input v-model="quickCreateForm.minIncrement" class="input font-mono" type="number" min="1" />
              </label>
              <label class="field">
                <span>Hemen Al Fiyatı (₺)</span>
                <input v-model="quickCreateForm.buyItNowPrice" class="input font-mono" type="number" min="0" placeholder="Opsiyonel" />
              </label>
              <label class="field">
                <span>Tahmini Değer Alt (₺)</span>
                <input v-model="quickCreateForm.estimatedValueMin" class="input font-mono" type="number" min="0" placeholder="Opsiyonel" />
              </label>
              <label class="field">
                <span>Tahmini Değer Üst (₺)</span>
                <input v-model="quickCreateForm.estimatedValueMax" class="input font-mono" type="number" min="0" placeholder="Opsiyonel" />
              </label>
            </div>

            <div class="field">
              <span>Ürün Görselleri</span>
              <input
                ref="quickCreateImageInput"
                type="file"
                class="hidden-file-input"
                accept="image/*"
                multiple
                @change="onQuickCreateImageChange"
              />
              <button
                class="upload-dropzone"
                :class="{ dragging: quickCreateDragTarget }"
                type="button"
                @click="openQuickCreateImagePicker"
                @dragover.prevent="quickCreateDragTarget = true"
                @dragleave.prevent="quickCreateDragTarget = false"
                @drop.prevent="onQuickCreateDropImages"
                style="padding: 1.5rem; text-align: center; border: 1px dashed var(--border-strong); border-radius: 8px; background: var(--bg-soft); cursor: pointer; display: block; width: 100%; color: var(--text-body);"
              >
                <strong>{{ quickCreateUploading ? 'Yükleniyor...' : 'Resim yüklemek için tıkla veya sürükle-bırak' }}</strong>
              </button>
            </div>
            
            <div v-if="quickCreateImages.length > 0" class="upload-grid" style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 1rem;">
              <article v-for="(imgUrl, idx) in quickCreateImages" :key="idx" style="position: relative; width: 80px; height: 80px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-soft);">
                <img :src="imgUrl" style="width: 100%; height: 100%; object-fit: cover;" />
                <button type="button" @click="removeQuickCreateImage(idx)" style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                  <i class="pi pi-times" style="font-size: 12px;" />
                </button>
              </article>
            </div>
          </div>
        </div>
        
        <footer class="modal-footer" style="justify-content: flex-end;">
          <div style="display: flex; gap: 0.75rem;">
            <button class="button ghost" type="button" @click="showQuickCreateModal = false">İptal</button>
            <button 
              class="button primary" 
              type="button"
              :disabled="!quickCreateForm.title || !quickCreateForm.startingPrice || quickCreateForm.startingPrice <= 0 || !quickCreateForm.minIncrement || quickCreateForm.minIncrement < 1 || (quickCreateForm.buyItNowPrice != null && quickCreateForm.buyItNowPrice > 0 && quickCreateForm.buyItNowPrice <= quickCreateForm.startingPrice) || isQuickCreating"
              @click="submitQuickCreate"
            >
              <i v-if="isQuickCreating" class="pi pi-spin pi-spinner" />
              <i v-else class="pi pi-check" />
              Oluştur ve Ekle
            </button>
          </div>
        </footer>
      </div>
    </div>
  </section>
  <!-- ONAY / RED GEREKÇE MODALI (Davet için) -->
  <div class="custom-modal-backdrop" v-if="showInviteModal">
    <div class="custom-modal-card">
      <header class="modal-header">
        <h3>Tedarikçi Davet Et</h3>
        <button class="modal-close" @click="showInviteModal = false">
          <i class="pi pi-times" />
        </button>
      </header>
      <div class="modal-body">
        <p style="margin-bottom: 1rem; color: #475569;">Ortak müzayedenize ürün eklemesi için tedarikçinin e-posta adresini girin. Davet edilen tedarikçinin en az 20 aktif ürünü olmalıdır.</p>
        <div class="form-group">
          <label class="label">Tedarikçi E-postası</label>
          <input
            type="email"
            v-model="inviteUserId"
            class="input"
            placeholder="tedarikci@ornek.com"
          />
        </div>
      </div>
      <footer class="modal-footer">
        <button class="button ghost" @click="showInviteModal = false" :disabled="sendingInvite">Vazgeç</button>
        <button class="button primary" @click="sendInvitation" :disabled="sendingInvite || !inviteUserId">
          <i v-if="sendingInvite" class="pi pi-spin pi-spinner" />
          <i v-else class="pi pi-send" />
          Davet Gönder
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { adminApi, toApiMessage } from '../../services/api';
import { useAdminAuthStore } from '../../stores/adminAuth';
import { getAuctionSocket, disconnectAuctionSocket } from '../../services/socket';


const auth = useAdminAuthStore();

const props = defineProps<{
  id: string;
}>();

const router = useRouter();

const loading = ref(true);
const error = ref<string | null>(null);

// Image Zoom State
const activeZoomImage = ref<string | null>(null);
function openImageZoom(url: string | null | undefined) {
  if (url) {
    activeZoomImage.value = url;
  }
}

const event = ref<any>(null);
// Süresiz etkinlik: geri sayım yerine "Süresiz" gösterilir, lot ancak panelden kapanır.
const isUntimedEvent = computed(() => event.value?.isUntimed === true);
const approvedLots = ref<any[]>([]);
const pendingSubmissions = ref<any[]>([]);
const invitations = ref<any[]>([]);

// Davet (Invitation) State
const showInviteModal = ref(false);
const inviteUserId = ref('');
const sendingInvite = ref(false);

function openInviteModal() {
  inviteUserId.value = '';
  showInviteModal.value = true;
}

async function sendInvitation() {
  if (!inviteUserId.value) return;
  sendingInvite.value = true;
  try {
    // E-posta ya da UUID kabul edilir; backend e-postayı kullanıcıya çözer.
    const input = inviteUserId.value.trim();
    const isEmail = input.includes('@');
    await adminApi.post(`/auctions/events/${props.id}/invite`, isEmail
      ? { email: input }
      : { inviteeId: input });
    alert('Davet gönderildi. Tedarikçiye bildirim iletildi.');
    showInviteModal.value = false;
    await loadDetail(); // Yeniden yükle ki tablo güncellensin
  } catch (err: any) {
    alert('Davet gönderilemedi: ' + (err.response?.data?.message || err.message));
  } finally {
    sendingInvite.value = false;
  }
}

async function cancelInvitation(invitationId: string) {
  if (!confirm('Bu daveti geri çekmek istediğinize emin misiniz?')) return;
  try {
    // Organizatör iptali — reject davetlinin işlemidir, cancel sahibinki.
    await adminApi.post(`/auctions/invitations/${invitationId}/cancel`);
    await loadDetail();
  } catch (err: any) {
    alert('İptal işlemi başarısız: ' + (err.response?.data?.message || err.message));
  }
}

function getInvitationStatusLabel(status: string) {
  const map: Record<string, string> = {
    PENDING: 'Bekliyor',
    ACCEPTED: 'Kabul Edildi',
    REJECTED: 'Reddedildi',
    EXPIRED: 'Geri Çekildi'
  };
  return map[status] || status;
}

// Canlı Teklif Akışı
const activeLotBids = ref<any[]>([]);
const loadingBids = ref(false);

async function fetchActiveLotBids() {
  if (!activeLot.value?.id) {
    activeLotBids.value = [];
    return;
  }
  loadingBids.value = true;
  try {
    const res = await adminApi.get(`/admin/auctions/${activeLot.value.id}`);
    activeLotBids.value = res.data.relatedRecords?.bids || res.data.bids || [];
  } catch (err) {
    console.error('Error fetching active lot bids:', err);
  } finally {
    loadingBids.value = false;
  }
}

function getBidderDisplayName(bid: any): string {
  if (bid.bidderName) return bid.bidderName;
  if (bid.bidderFirstName || bid.bidderLastName) {
    return `${bid.bidderFirstName || ''} ${bid.bidderLastName || ''}`.trim();
  }
  return bid.bidderEmail || 'Kullanıcı';
}

// Katalog Sıralama Kontrolleri
const originalOrder = ref<string[]>([]);
const hasOrderChanges = computed(() => {
  if (approvedLots.value.length !== originalOrder.value.length) return false;
  return approvedLots.value.some((lot, idx) => lot.id !== originalOrder.value[idx]);
});
const savingSequence = ref(false);

function removeLot(lotId: string) {
  triggerConfirm(
    'Lotu Müzayededen Kaldır',
    'Bu lotu müzayededen kaldırmak istediğinize emin misiniz? Bu işlem geri alınamaz.',
    async () => {
      try {
        const res = await adminApi.delete(`/admin/auction-events/${props.id}/lots/${lotId}`, { data: { reason: 'Fazla ürün / Hatalı ekleme' } });
        toast.add({ severity: 'success', summary: 'Başarılı', detail: res.data?.message || 'Lot kaldırıldı', life: 3000 });
        await loadDetail();
      } catch (error: any) {
        toast.add({ severity: 'error', summary: 'Hata', detail: error.response?.data?.message || 'Lot kaldırılamadı', life: 3000 });
      }
    }
  );
}

// Aktif Lot
const activeLot = computed(() => {
  if (!event.value?.activeLotId) return null;
  return approvedLots.value.find((lot) => lot.id === event.value.activeLotId) || null;
});

const hasUnfinishedLots = computed(() => {
  return approvedLots.value.some((lot) => ['PUBLISHED', 'DRAFT', 'ACTIVE'].includes(lot.status));
});

// Özel Onay Modalı State'leri
const showConfirmModal = ref(false);
const confirmModalTitle = ref('');
const confirmModalMessage = ref('');
const confirmModalAction = ref<(() => Promise<void>) | null>(null);
const confirmTimeLeft = ref(10);
let confirmTimerInterval: any = null;

function triggerConfirm(title: string, message: string, action: () => Promise<void>) {
  if (confirmTimerInterval) clearInterval(confirmTimerInterval);
  
  confirmModalTitle.value = title;
  confirmModalMessage.value = message;
  confirmModalAction.value = action;
  confirmTimeLeft.value = 10;
  showConfirmModal.value = true;
  
  const intervalTime = 100; // 100ms
  const totalDuration = 10000; // 10s
  let elapsed = 0;
  
  confirmTimerInterval = setInterval(() => {
    elapsed += intervalTime;
    confirmTimeLeft.value = Math.max(0, 10 - (elapsed / 1000));
    if (elapsed >= totalDuration) {
      closeConfirmModal();
    }
  }, intervalTime);
}

function closeConfirmModal() {
  showConfirmModal.value = false;
  if (confirmTimerInterval) {
    clearInterval(confirmTimerInterval);
    confirmTimerInterval = null;
  }
  confirmModalAction.value = null;
}

async function executeConfirmAction() {
  if (confirmModalAction.value) {
    const action = confirmModalAction.value;
    closeConfirmModal();
    await action();
  }
}

// Geri Sayım Sayacı (Live Countdown)
const timeLeftSeconds = ref(0);
let timerInterval: any = null;

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);

  // Süresiz lotta geri sayım yok; KPI kartı "Süresiz" gösterir.
  if (isUntimedEvent.value) {
    timeLeftSeconds.value = 0;
    return;
  }

  if (activeLot.value?.status === 'PUBLISHED') {
    timeLeftSeconds.value = activeLot.value.pausedRemainingSeconds || 0;
    return;
  }

  const endTimeStr = activeLot.value?.endTime;
  if (!endTimeStr) {
    timeLeftSeconds.value = 0;
    return;
  }

  const endMs = new Date(endTimeStr).getTime();
  const update = () => {
    const now = Date.now();
    const diff = Math.max(0, Math.ceil((endMs - now) / 1000));
    timeLeftSeconds.value = diff;
    if (diff <= 0) {
      clearInterval(timerInterval);
    }
  };

  update();
  timerInterval = setInterval(update, 1000);
}

const formattedTimeLeft = computed(() => {
  const secs = timeLeftSeconds.value;
  if (secs <= 0) return 'Bitti';
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
});

watch(
  [
    () => activeLot.value?.endTime,
    () => activeLot.value?.status,
    () => activeLot.value?.pausedRemainingSeconds
  ],
  () => {
    startTimer();
  },
  { immediate: true }
);

watch(
  () => activeLot.value?.id,
  (newId, oldId) => {
    if (newId !== oldId) {
      fetchActiveLotBids();
    }
  },
  { immediate: true }
);

// Onay/Red Modalı State'leri
const showModal = ref(false);
const modalType = ref<'APPROVED' | 'REJECTED'>('APPROVED');
const targetSubmissionId = ref<string | null>(null);
const actionReason = ref('');
const submittingAction = ref(false);
const autoProgress = ref(true);
const lotTransitionSeconds = ref(30);

async function loadDetail() {
  loading.value = true;
  error.value = null;
  try {
    const res = await adminApi.get(`/admin/auction-events/${props.id}`);
    event.value = res.data.overview;
    approvedLots.value = res.data.approvedLots || [];
    pendingSubmissions.value = res.data.pendingSubmissions || [];
    invitations.value = res.data.invitations || [];
    autoProgress.value = res.data.overview?.autoProgress !== false;
    lotTransitionSeconds.value = res.data.overview?.lotTransitionSeconds ?? 30;
    
    // Orijinal sıralamayı kaydet
    originalOrder.value = approvedLots.value.map((lot) => lot.id);
  } catch (err) {
    error.value = toApiMessage(err);
  } finally {
    loading.value = false;
  }
}

// Sıralama Değiştirme
function isFinished(lot: any): boolean {
  if (!lot) return false;
  return !['DRAFT', 'PUBLISHED', 'ACTIVE'].includes(lot.status);
}

function moveLotUp(index: number) {
  if (index === 0) return;
  const currentLot = approvedLots.value[index];
  const targetLot = approvedLots.value[index - 1];
  if (isFinished(currentLot) || isFinished(targetLot)) return;

  const temp = approvedLots.value[index];
  approvedLots.value[index] = approvedLots.value[index - 1];
  approvedLots.value[index - 1] = temp;
  approvedLots.value = [...approvedLots.value];
}

function moveLotDown(index: number) {
  if (index === approvedLots.value.length - 1) return;
  const currentLot = approvedLots.value[index];
  const targetLot = approvedLots.value[index + 1];
  if (isFinished(currentLot) || isFinished(targetLot)) return;

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

// --- Hızlı Ürün Oluştur State & Logic ---
const showQuickCreateModal = ref(false);
const isQuickCreating = ref(false);
const quickCreateError = ref<string | null>(null);
const quickCreateForm = ref({
  title: '',
  description: '',
  startingPrice: null as number | null,
  minIncrement: 1,
  buyItNowPrice: null as number | null,
  estimatedValueMin: null as number | null,
  estimatedValueMax: null as number | null,
});
const quickCreateImages = ref<string[]>([]);
const quickCreateImageInput = ref<HTMLInputElement | null>(null);
const quickCreateDragTarget = ref(false);
const quickCreateUploading = ref(false);

function openQuickCreateModal() {
  quickCreateError.value = null;
  
  // Admin kontrolü: Eğer müzayedenin sahibi yoksa ürün kime eklenecek belli değil.
  const roles = auth.admin?.roles || [];
  const isAdmin = roles.some((r: string) => ['SUPER_ADMIN', 'ADMIN'].includes(r));
  if (isAdmin && !event.value?.ownerId) {
    quickCreateError.value = "Uyarı: Bu müzayedenin bir sahibi (Satıcı) bulunmuyor. Sistem ürünü kime ekleyeceğini bilemez. Lütfen önce etkinliğe bir satıcı atayın.";
  }

  showQuickCreateModal.value = true;
  quickCreateForm.value = {
    title: '',
    description: '',
    startingPrice: null,
    minIncrement: 1,
    buyItNowPrice: null,
    estimatedValueMin: null,
    estimatedValueMax: null,
  };
  quickCreateImages.value = [];
}

function openQuickCreateImagePicker() {
  quickCreateImageInput.value?.click();
}

function onQuickCreateImageChange(evt: Event) {
  const input = evt.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  uploadQuickCreateImages(Array.from(input.files));
  input.value = '';
}

function onQuickCreateDropImages(evt: DragEvent) {
  quickCreateDragTarget.value = false;
  const files = Array.from(evt.dataTransfer?.files || []);
  if (files.length > 0) uploadQuickCreateImages(files);
}

async function uploadQuickCreateImages(files: File[]) {
  const validFiles = files.filter(f => f.type.startsWith('image/'));
  if (validFiles.length === 0) return;
  
  quickCreateUploading.value = true;
  try {
    for (const file of validFiles) {
      const formData = new FormData();
      formData.append('file', file);
      const res = await adminApi.post<{ url: string }>('/admin/uploads/images?kind=product', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.url) {
        quickCreateImages.value.push(res.data.url);
      }
    }
  } catch (err) {
    console.error('Image upload error:', err);
    quickCreateError.value = 'Görsel yüklenirken bir hata oluştu. Lütfen tekrar deneyin.';
  } finally {
    quickCreateUploading.value = false;
  }
}

function removeQuickCreateImage(idx: number) {
  quickCreateImages.value.splice(idx, 1);
}

async function submitQuickCreate() {
  if (isQuickCreating.value) return; // M2: Çift tıklama koruması
  if (!quickCreateForm.value.title || quickCreateForm.value.startingPrice == null || quickCreateForm.value.startingPrice <= 0) return;
  if (!quickCreateForm.value.minIncrement || quickCreateForm.value.minIncrement < 1) return;
  // K3: buyItNowPrice > startingPrice kontrolü
  if (quickCreateForm.value.buyItNowPrice != null && quickCreateForm.value.buyItNowPrice > 0 && quickCreateForm.value.buyItNowPrice <= quickCreateForm.value.startingPrice) return;
  // Tahmini değer: üst sınır alt sınırdan küçük olamaz
  if (
    quickCreateForm.value.estimatedValueMin != null &&
    quickCreateForm.value.estimatedValueMax != null &&
    quickCreateForm.value.estimatedValueMax < quickCreateForm.value.estimatedValueMin
  ) {
    quickCreateError.value = 'Tahmini değer üst sınırı alt sınırından küçük olamaz.';
    return;
  }

  // Eğer hata varsa (örn. ownerId eksik) işleme izin verme
  if (quickCreateError.value && quickCreateError.value.includes('Uyarı:')) return;

  isQuickCreating.value = true;
  quickCreateError.value = null;
  try {
    // 1. Create Product
    const productPayload = {
      reason: 'Hızlı müzayede ürünü eklendi',
      metadata: {
        title: quickCreateForm.value.title,
        description: quickCreateForm.value.description,
        price: quickCreateForm.value.startingPrice,
        status: 'ACTIVE',
        stockQuantity: 1,
        productImageUrls: quickCreateImages.value.join('\n'),
        sellerId: event.value?.ownerId || undefined,
      }
    };
    
    const productRes = await adminApi.post('/admin/products', productPayload);
    const newProductId = productRes.data?.product?.id || productRes.data?.data?.id || productRes.data?.id;
    
    if (!newProductId) throw new Error('Ürün oluşturulamadı (ID dönmedi).');

    // 2. Add to Auction Lots
    const lotPayload = {
      reason: 'Hızlı ürün lot olarak eklendi',
      metadata: {
        items: [
          {
            productId: newProductId,
            lotOrder: approvedLots.value.length + 1,
            startingPrice: quickCreateForm.value.startingPrice,
            minIncrement: quickCreateForm.value.minIncrement || 1,
            buyItNowPrice: quickCreateForm.value.buyItNowPrice || null,
            estimatedValueMin: quickCreateForm.value.estimatedValueMin || null,
            estimatedValueMax: quickCreateForm.value.estimatedValueMax || null,
          }
        ]
      }
    };
    
    await adminApi.post(`/admin/auction-events/${props.id}/lots`, lotPayload);
    
    showQuickCreateModal.value = false;
    await loadDetail();
  } catch (e: any) {
    quickCreateError.value = e.response?.data?.message || e.message || 'Ürün oluşturulurken bir hata oluştu.';
  } finally {
    isQuickCreating.value = false;
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
  triggerConfirm(
    'Müzayedeyi Duraklat',
    'Müzayedeyi duraklatmak istediğinize emin misiniz? Bu işlem canlı teklif alımını geçici olarak durdurur.',
    async () => {
      try {
        await adminApi.patch(`/admin/auction-events/${props.id}/pause`, {});
        await loadDetail();
      } catch (err) {
        error.value = toApiMessage(err);
      }
    }
  );
}

async function handleResume() {
  triggerConfirm(
    'Müzayedeyi Başlat',
    'Müzayedeyi devam ettirmek istediğinize emin misiniz? Kalan süre kaldığı yerden devam edecektir.',
    async () => {
      try {
        await adminApi.patch(`/admin/auction-events/${props.id}/resume`, {});
        await loadDetail();
      } catch (err) {
        error.value = toApiMessage(err);
      }
    }
  );
}

async function handleSkip() {
  triggerConfirm(
    'Sıradaki Lot\'a Geç',
    'Müzayedeyi bir sonraki lota geçirmek istediğinize emin misiniz? Mevcut lot kapatılacaktır.',
    async () => {
      try {
        await adminApi.patch(`/admin/auction-events/${props.id}/skip`, {});
        await loadDetail();
      } catch (err) {
        error.value = toApiMessage(err);
      }
    }
  );
}

// Sunucu anonsu — canlı feed'e düşer, satışı kapatmaz (onu Sıradaki Lot yapar).
const announcing = ref(false);

async function handleAnnounce(type: 'BURNING' | 'LAST_CALL' | 'SOLD') {
  announcing.value = true;
  try {
    await adminApi.patch(`/admin/auction-events/${props.id}/announce`, { type });
  } catch (err) {
    error.value = toApiMessage(err);
  } finally {
    announcing.value = false;
  }
}

async function handleAutoProgressToggle() {
  try {
    await adminApi.patch(`/admin/auction-events/${props.id}/auto-progress`, {
      enabled: autoProgress.value,
    });
  } catch (err) {
    error.value = toApiMessage(err);
    autoProgress.value = !autoProgress.value; // revert UI on failure
  }
}

async function handleLotTransitionSecondsChange() {
  if (lotTransitionSeconds.value === undefined || lotTransitionSeconds.value === null || lotTransitionSeconds.value < 0) {
    lotTransitionSeconds.value = 30;
  }
  try {
    await adminApi.patch(`/admin/auction-events/${props.id}`, {
      reason: 'Lot geçiş süresi güncellendi',
      metadata: {
        lotTransitionSeconds: lotTransitionSeconds.value,
      },
    });
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
  const currency = event.value?.currency || 'TRY';
  if (amount === null || amount === undefined) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(0);
  }
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(amount);
}

function goToAuctionDetail(lotId: string): void {
  if (!lotId) return;
  void router.push(`/auctions/${lotId}`);
}

function handleImageError(event: Event): void {
  const target = event.target as HTMLImageElement;
  if (target) {
    target.style.display = 'none';
  }
}

let socket: any = null;
let onSocketConnect: (() => void) | null = null;

// --- Yeni Ürün Ekle Modal State & Logic ---
const showAddLotModal = ref(false);
const loadingProducts = ref(false);
const isAddingLots = ref(false);
const availableProducts = ref<any[]>([]);
const selectedProductIds = ref<string[]>([]);

async function openAddLotModal() {
  showAddLotModal.value = true;
  loadingProducts.value = true;
  selectedProductIds.value = [];
  try {
    let url = '/admin/products?limit=100';
    if (event.value?.ownerId) {
      url += `&sellerId=${event.value.ownerId}`;
    }
    const res = await adminApi.get(url);
    if (res.data?.items) {
      // Sadece bu müzayedede halihazırda lot olarak eklenmemiş ürünleri göster
      const existingProductIds = approvedLots.value.map((lot) => lot.productId);
      const filteredProducts = res.data.items.filter((p: any) => !existingProductIds.includes(p.id));
      
      // K2: Her ürüne otomatik artan lotOrder ata
      const baseOrder = approvedLots.value.length;
      availableProducts.value = filteredProducts.map((p: any, idx: number) => ({
        ...p,
        lotOrder: baseOrder + idx + 1,
        startingPrice: p.price || 1,
        minIncrement: 1,
        buyItNowPrice: null,
        estimatedValueMin: null,
        estimatedValueMax: null,
      }));
    }
  } catch (e) {
    error.value = toApiMessage(e);
  } finally {
    loadingProducts.value = false;
  }
}

// K1/K3: Frontend validasyon — seçili ürünlerin fiyat/artış değerlerini kontrol et
const addLotValidationError = computed(() => {
  for (const id of selectedProductIds.value) {
    const prod = availableProducts.value.find((p: any) => p.id === id);
    if (!prod) continue;
    if (!prod.startingPrice || prod.startingPrice <= 0) return 'Tüm seçili ürünlerin açılış fiyatı 0\'dan büyük olmalıdır.';
    if (!prod.minIncrement || prod.minIncrement < 1) return 'Minimum artış tutarı en az 1 olmalıdır.';
    if (prod.buyItNowPrice != null && prod.buyItNowPrice > 0 && prod.buyItNowPrice <= prod.startingPrice) {
      return 'Hemen Al fiyatı açılış fiyatından büyük olmalıdır.';
    }
    if (
      prod.estimatedValueMin != null &&
      prod.estimatedValueMax != null &&
      Number(prod.estimatedValueMax) < Number(prod.estimatedValueMin)
    ) {
      return 'Tahmini değer üst sınırı alt sınırından küçük olamaz.';
    }
  }
  return null;
});

async function submitAddLots() {
  if (selectedProductIds.value.length === 0 || isAddingLots.value) return; // M2: Çift tıklama koruması
  if (addLotValidationError.value) return;
  isAddingLots.value = true;
  try {
    const items = selectedProductIds.value.map((id) => {
      const prod = availableProducts.value.find((p: any) => p.id === id);
      return {
        productId: id,
        lotOrder: prod?.lotOrder || 1,
        startingPrice: prod?.startingPrice || 1,
        minIncrement: prod?.minIncrement || 1.0,
        buyItNowPrice: prod?.buyItNowPrice || null,
        estimatedValueMin: prod?.estimatedValueMin || null,
        estimatedValueMax: prod?.estimatedValueMax || null,
      };
    });

    await adminApi.post(`/admin/auction-events/${props.id}/lots`, { 
      reason: 'Kullanıcı paneli üzerinden yeni ürünler eklendi',
      metadata: { items } 
    });
    
    showAddLotModal.value = false;
    await loadDetail();
  } catch (e) {
    error.value = toApiMessage(e);
  } finally {
    isAddingLots.value = false;
  }
}
// ----------------------------------------

onMounted(() => {
  loadDetail();

  // Connect to live WebSocket room.
  // (Re-)join on every 'connect': server-side room membership is lost across
  // reconnects, so a one-off join would leave the view frozen after a drop.
  socket = getAuctionSocket();
  onSocketConnect = () => {
    socket?.emit('event:join', { eventId: props.id });
  };
  socket.on('connect', onSocketConnect);
  if (socket.connected) {
    onSocketConnect();
  }

  socket.on('event:active_lot_changed', (data: any) => {
    console.log('[Admin Socket] event:active_lot_changed received', data);
    if (event.value) {
      event.value.activeLotId = data.activeLotId;
    }
    loadDetail();
    fetchActiveLotBids();
  });

  socket.on('bid:new', (data: any) => {
    console.log('[Admin Socket] bid:new received', data);
    const lot = approvedLots.value.find((l) => l.id === data.auctionId);
    if (lot) {
      lot.currentPrice = data.currentPrice;
      lot.bidCount = data.bidCount;
      if (data.endTime) {
        lot.endTime = data.endTime;
      }
    }

    // Aktif lot ise yeni teklifi hemen (maskeli adla) göster, ardından admin
    // endpoint'inden tam adlı listeyle değiştir — socket yayını gizlilik
    // gereği "Ad S." maskesi taşır, admin listesi tam ad döner.
    if (activeLot.value && data.auctionId === activeLot.value.id) {
      activeLotBids.value.unshift({
        id: data.id || Math.random().toString(),
        bidderName: data.bidderName,
        amount: data.amount,
        createdAt: data.serverTime || new Date().toISOString(),
      });
      fetchActiveLotBids();
    }

    // Background refresh to update list
    adminApi.get(`/admin/auction-events/${props.id}`).then((res) => {
      event.value = res.data.overview;
      approvedLots.value = res.data.approvedLots || [];
      pendingSubmissions.value = res.data.pendingSubmissions || [];
    }).catch(() => {});
  });

  socket.on('bid:withdrawn', (data: any) => {
    console.log('[Admin Socket] bid:withdrawn received', data);
    const lot = approvedLots.value.find((l) => l.id === data.auctionId);
    if (lot) {
      lot.currentPrice = data.currentPrice;
      lot.bidCount = data.bidCount;
      if (data.endTime) {
        lot.endTime = data.endTime;
      }
    }

    // Aktif lot ise teklif listesini yeniden çek (geri çekilen teklif düşer)
    if (activeLot.value && data.auctionId === activeLot.value.id) {
      fetchActiveLotBids();
    }

    // Background refresh to update list
    adminApi.get(`/admin/auction-events/${props.id}`).then((res) => {
      event.value = res.data.overview;
      approvedLots.value = res.data.approvedLots || [];
      pendingSubmissions.value = res.data.pendingSubmissions || [];
    }).catch(() => {});
  });

  socket.on('event:status_changed', (data: any) => {
    console.log('[Admin Socket] event:status_changed received', data);
    if (event.value) {
      event.value.status = data.status;
    }
    loadDetail();
  });

  socket.on('auction:extended', (data: any) => {
    console.log('[Admin Socket] auction:extended received', data);
    const lot = approvedLots.value.find((l) => l.id === data.auctionId);
    if (lot) {
      lot.endTime = data.newEndTime;
    }
    loadDetail();
  });

  socket.on('auction:ended', (data: any) => {
    console.log('[Admin Socket] auction:ended received', data);
    loadDetail();
  });

  socket.on('event:auto_progress_changed', (data: any) => {
    console.log('[Admin Socket] event:auto_progress_changed received', data);
    if (data.eventId === props.id) {
      autoProgress.value = data.enabled;
    }
  });
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
  if (socket) {
    socket.emit('event:leave', { eventId: props.id });
    if (onSocketConnect) {
      socket.off('connect', onSocketConnect);
      onSocketConnect = null;
    }
    socket.off('event:active_lot_changed');
    socket.off('bid:new');
    socket.off('bid:withdrawn');
    socket.off('event:status_changed');
    socket.off('auction:extended');
    socket.off('auction:ended');
    socket.off('event:auto_progress_changed');
  }
  disconnectAuctionSocket();
});

function getEventStatusLabel(status: string | undefined) {
  if (!status) return '';
  const map: Record<string, string> = {
    DRAFT: 'Taslak',
    APPLICATION: 'Başvuru Alınıyor',
    UPCOMING: 'Yakında',
    ACTIVE: 'Canlı (Aktif)',
    FINISHED: 'Bitti',
    CANCELLED: 'İptal Edildi'
  };
  return map[status] || status;
}

function getSellerName(seller: any) {
  if (!seller) return 'Bilinmiyor';
  if (seller.businessName) return seller.businessName;
  if (seller.firstName || seller.lastName) return `${seller.firstName || ''} ${seller.lastName || ''}`.trim();
  return 'Bireysel Satıcı';
}
</script>

<style scoped>
/* Importing premium typography */
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');

.auction-event-detail {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  background-color: var(--bg-canvas); /* Align with admin panel canvas */
  color: var(--text-body);
  min-height: calc(100vh - 60px);
  font-family: 'Outfit', sans-serif;
}

/* Page Header Toolbar */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-soft);
  padding-bottom: 1.5rem;
}
.page-header h1 {
  font-size: 1.85rem;
  font-weight: 800;
  color: var(--text-strong);
  margin: 0;
  letter-spacing: -0.5px;
}
.page-header p {
  margin: 0.25rem 0 0 0;
  color: var(--text-muted);
  font-size: 0.9rem;
}
.toolbar {
  display: flex;
  gap: 0.75rem;
}
.toolbar .button {
  background: var(--bg-panel);
  border: 1px solid var(--border-strong);
  color: var(--text-strong);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 600;
}
.toolbar .button:hover {
  background: var(--bg-soft);
  border-color: var(--text-muted);
  transform: translateY(-1px);
}
.toolbar .button.ghost {
  background: transparent;
  border-color: var(--border-strong);
}

/* Loading and error states */
.loading-state, .error-banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6rem 2rem;
  background: var(--bg-panel);
  border: 1px solid var(--border-soft);
  border-radius: 16px;
  color: var(--text-muted);
  gap: 1rem;
  box-shadow: var(--shadow-soft);
}
.loading-state i {
  color: var(--brand-500);
}
.error-banner i {
  color: var(--danger-500);
  font-size: 2.5rem;
}

/* ─── LIVE CONSOLE STYLING (THE COMMAND DECK - Kept sleek dark for control station look) ─── */
/* ─── UNIFIED CONTAINER & GLOWING HIGHLIGHT ─── */
.dashboard-container-card {
  background: var(--bg-panel);
  border: 1px solid var(--border-soft);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--shadow-soft);
  display: flex;
  flex-direction: column;
  position: relative;
  padding-top: 4px; /* Room for top highlight */
}

.dashboard-container-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: linear-gradient(90deg, #10b981, #6366f1, #a855f7);
  z-index: 10;
}

.live-console-section {
  background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%);
  border-bottom: 1px solid var(--border-soft);
  position: relative;
  overflow: hidden;
}

.console-dashboard {
  display: grid;
  grid-template-columns: 1.62fr 1fr;
  min-height: 420px;
}

@media (max-width: 1200px) {
  .console-dashboard {
    grid-template-columns: 1fr;
  }
  .live-bids-stream-panel {
    border-left: none !important;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
}

/* Left Panel: Active Lot controls */
.active-lot-control-panel {
  padding: 2.5rem;
  display: flex;
  gap: 2.5rem;
}

@media (max-width: 768px) {
  .active-lot-control-panel {
    flex-direction: column;
    padding: 1.75rem;
    gap: 1.75rem;
  }
  .active-lot-media {
    width: 100% !important;
    height: 240px !important;
  }
}

.active-lot-media {
  width: 260px;
  height: 330px;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.4);
  flex-shrink: 0;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
}

.active-lot-media img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 2;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.active-lot-media:hover img {
  transform: scale(1.05);
}

.media-fallback-icon {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: #94a3b8;
  font-size: 0.85rem;
  z-index: 1;
}
.media-fallback-icon i {
  font-size: 2.5rem;
}

.active-lot-live-tag {
  position: absolute;
  top: 12px;
  left: 12px;
  background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 800;
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
  letter-spacing: 0.8px;
  text-transform: uppercase;
}

.live-dot-pulse {
  width: 8px;
  height: 8px;
  background: #fff;
  border-radius: 50%;
  animation: pulse-white 1.5s infinite;
}

@keyframes pulse-white {
  0% { transform: scale(0.9); opacity: 0.6; }
  50% { transform: scale(1.3); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.6; }
}

.active-lot-details {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  justify-content: space-between;
}

.lot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.lot-number-pill {
  font-size: 0.725rem;
  font-weight: 800;
  color: #c084fc;
  background: rgba(168, 85, 247, 0.15);
  padding: 0.3rem 0.75rem;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
  border: 1px solid rgba(168, 85, 247, 0.3);
}

.lot-db-id {
  font-size: 0.725rem;
  color: #94a3b8;
  letter-spacing: 0.5px;
}

.lot-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: #ffffff;
  margin: 0 0 1.5rem 0;
  line-height: 1.25;
  letter-spacing: -0.5px;
}

.lot-prices-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

@media (max-width: 576px) {
  .lot-prices-grid {
    grid-template-columns: 1fr;
  }
}

.price-kpi-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.price-kpi-card.highlight-glow {
  background: rgba(16, 185, 129, 0.05);
  border-color: rgba(16, 185, 129, 0.4);
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.1);
}

.kpi-label {
  font-size: 0.7rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  font-weight: 700;
}

.kpi-value {
  font-size: 1.2rem;
  font-weight: 800;
  color: #f8fafc;
}

.current-price-color {
  color: #10b981 !important;
  text-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
}

.total-bids-color {
  color: #3b82f6 !important;
  text-shadow: 0 0 15px rgba(59, 130, 246, 0.25);
}

/* Active Lot console Actions & Settings */
.console-settings-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  background: rgba(255, 255, 255, 0.03);
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  flex-wrap: nowrap;
}

.countdown-kpi-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.countdown-kpi-card.low-time-danger {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.45);
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.15);
}

.countdown-kpi-card.low-time-danger .countdown-time {
  color: #ef4444 !important;
  text-shadow: 0 0 10px rgba(239, 68, 68, 0.4);
  animation: pulse-timer-red 1s infinite;
}

.countdown-kpi-card.ended .countdown-time {
  color: #94a3b8 !important;
  text-shadow: none;
  animation: none;
}

.countdown-time {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-variant-numeric: tabular-nums;
}

.clock-icon-spin {
  font-size: 1.15rem;
  animation: spin 12s linear infinite;
  color: inherit;
}

@keyframes pulse-timer-red {
  0% { opacity: 0.85; transform: scale(0.97); }
  50% { opacity: 1; transform: scale(1.03); }
  100% { opacity: 0.85; transform: scale(0.97); }
}

/* Toggles & Inputs inside Timer Console */
.auto-progress-toggle-container,
.transition-seconds-input-container {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  background: rgba(255, 255, 255, 0.04);
  padding: 0.6rem 1rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
  white-space: nowrap;
}

.auto-progress-text,
.transition-seconds-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #cbd5e1;
  white-space: nowrap !important;
}

.transition-seconds-input {
  width: 70px;
  background: rgba(9, 13, 22, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 0.4rem 0.6rem;
  color: #f8fafc;
  font-size: 0.875rem;
  text-align: center;
  outline: none;
  font-weight: 700;
  transition: border-color 0.2s;
}
.transition-seconds-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.25);
}

/* Switches */
.switch-btn {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 22px;
}
.switch-btn input {
  opacity: 0;
  width: 0;
  height: 0;
}
.switch-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #334155;
  transition: .3s;
  border-radius: 22px;
  border: 1px solid rgba(255,255,255,0.08);
}
.switch-slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
  background-color: #cbd5e1;
  transition: .3s;
  border-radius: 50%;
}
input:checked + .switch-slider {
  background-color: #10b981;
}
input:checked + .switch-slider:before {
  transform: translateX(22px);
  background-color: #ffffff;
}

/* Control Buttons */
.console-action-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: 1.25rem;
}
.control-btn {
  padding: 0.65rem 1.25rem;
  font-size: 0.85rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 12px;
  border: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  width: 100%;
}
.control-btn.warning {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: #000;
}
.control-btn.warning:hover {
  background: linear-gradient(135deg, #fbbf24 0%, #ea580c 100%);
  transform: translateY(-1.5px);
  box-shadow: 0 6px 16px rgba(245, 158, 11, 0.3);
}
.control-btn.success {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #fff;
}
.control-btn.success:hover {
  background: linear-gradient(135deg, #34d399 0%, #047857 100%);
  transform: translateY(-1.5px);
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3);
}
.control-btn.danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: #fff;
}
.control-btn.danger:hover {
  background: linear-gradient(135deg, #f87171 0%, #b91c1c 100%);
  transform: translateY(-1.5px);
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.3);
}

/* Right Panel: Live Bids Stream */
.live-bids-stream-panel {
  padding: 2.5rem;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.25);
  min-height: 340px;
}

.stream-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-shrink: 0;
}

.stream-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  letter-spacing: -0.25px;
}

.stream-icon-bolt {
  color: #fbbf24;
  animation: pulse-bolt 1.5s infinite;
}

@keyframes pulse-bolt {
  0% { transform: scale(1); opacity: 0.85; }
  50% { transform: scale(1.25); opacity: 1; }
  100% { transform: scale(1); opacity: 0.85; }
}

.stream-header-badges {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.total-bids-badge {
  font-size: 0.65rem;
  font-weight: 800;
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.1);
  padding: 0.3rem 0.75rem;
  border-radius: 8px;
  letter-spacing: 0.8px;
  border: 1px solid rgba(251, 191, 36, 0.2);
}

.live-feed-badge {
  font-size: 0.65rem;
  font-weight: 800;
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  padding: 0.3rem 0.75rem;
  border-radius: 8px;
  letter-spacing: 0.8px;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.bids-scroll-container {
  flex-grow: 1;
  overflow-y: auto;
  max-height: 280px;
  padding-right: 0.5rem;
}

.bids-scroll-container::-webkit-scrollbar {
  width: 6px;
}
.bids-scroll-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.15);
}
.bids-scroll-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
.bids-scroll-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

.bids-stream-loading,
.bids-stream-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #64748b;
  gap: 0.65rem;
  text-align: center;
  padding: 3rem 0;
}
.bids-stream-loading i,
.bids-stream-empty i {
  font-size: 2rem;
  color: #4b5563;
}
.bids-stream-empty p {
  margin: 0;
  font-size: 0.9rem;
}

.bids-stream-list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.bid-stream-item {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  padding: 0.8rem 1rem;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.bid-stream-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
}

.bid-stream-item.is-newest {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.3);
  animation: highlight-pulse-green 2s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes highlight-pulse-green {
  0% { background: rgba(16, 185, 129, 0.3); border-color: rgba(16, 185, 129, 0.7); }
  100% { background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.3); }
}

.bidder-avatar {
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 0.85rem;
  color: #cbd5e1;
  font-size: 0.9rem;
  flex-shrink: 0;
}
.bid-stream-item.is-newest .bidder-avatar {
  background: rgba(16, 185, 129, 0.25);
  color: #34d399;
}

.bid-item-info {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-width: 0;
}

.bidder-name {
  font-size: 0.875rem;
  font-weight: 700;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bid-timestamp {
  font-size: 0.725rem;
  color: #64748b;
  margin-top: 0.1rem;
}

.bid-item-amount {
  font-size: 1.05rem;
  font-weight: 800;
  color: #10b981;
  flex-shrink: 0;
  margin-left: 0.75rem;
  text-shadow: 0 0 10px rgba(16, 185, 129, 0.2);
}

/* Animations transitions */
.bid-list-enter-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.bid-list-enter-from {
  opacity: 0;
  transform: translateY(-15px);
}
.bid-list-leave-active {
  position: absolute;
  width: 100%;
}

.live-console-empty {
  background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%);
  border-bottom: 1px solid var(--border-soft);
  border-radius: 0;
  padding: 5rem 2rem;
  text-align: center;
  color: #64748b;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.25rem;
}
.live-console-empty i {
  font-size: 3.5rem;
  color: #334155;
}
.live-console-empty p {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #94a3b8;
}

/* ─── COLUMNS LAYOUT FOR EVENT DETAILS ─── */
.dashboard-columns-layout {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 0;
  background: var(--bg-panel);
}

@media (max-width: 992px) {
  .dashboard-columns-layout {
    grid-template-columns: 1fr;
  }
}

.dashboard-sidebar {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-soft);
  background: var(--bg-panel);
}

@media (max-width: 992px) {
  .dashboard-sidebar {
    border-right: none;
    border-bottom: 1px solid var(--border-soft);
  }
}

.sidebar-content {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.cover-image-container {
  height: 200px;
  width: 100%;
  overflow: hidden;
  background: var(--bg-soft);
  border-bottom: 1px solid var(--border-soft);
  position: relative;
}

.cover-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 2;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.dashboard-sidebar:hover .cover-image {
  transform: scale(1.04);
}

.cover-fallback-icon {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: var(--text-muted);
  font-size: 0.9rem;
  z-index: 1;
}
.cover-fallback-icon i {
  font-size: 2rem;
}

.overview-hero-header {
  padding: 0 0 1.5rem 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid var(--border-soft);
}

.overview-eyebrow {
  font-size: 0.7rem;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 1.5px;
  font-weight: 800;
  margin: 0 0 0.4rem 0;
}

.overview-title {
  font-size: 1.4rem;
  font-weight: 800;
  margin: 0;
  color: var(--text-strong);
  line-height: 1.3;
}

/* Event status badge styling inside overview */
.overview-hero-header .status-badge {
  padding: 0.35rem 0.75rem;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.04);
}
.overview-hero-header .status-badge.draft { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
.overview-hero-header .status-badge.application { background: rgba(168, 85, 247, 0.1); color: #7e22ce; border: 1px solid rgba(168, 85, 247, 0.2); }
.overview-hero-header .status-badge.upcoming { background: rgba(59, 130, 246, 0.1); color: #1d4ed8; border: 1px solid rgba(59, 130, 246, 0.2); }
.overview-hero-header .status-badge.active { background: rgba(16, 185, 129, 0.1); color: #047857; border: 1px solid rgba(16, 185, 129, 0.2); }
.overview-hero-header .status-badge.ended { background: rgba(239, 68, 68, 0.1); color: #b91c1c; border: 1px solid rgba(239, 68, 68, 0.2); }
.overview-hero-header .status-badge.cancelled { background: rgba(239, 68, 68, 0.1); color: #b91c1c; border: 1px solid rgba(239, 68, 68, 0.2); }

.event-meta-info {
  padding: 1.5rem 0 0 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  padding-bottom: 0.85rem;
  border-bottom: 1px dashed var(--border-soft);
}
.meta-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.meta-row .label {
  color: var(--text-muted);
  font-weight: 600;
}

.meta-row .value {
  color: var(--text-strong);
  font-weight: 700;
}

.meta-row .value.text-primary {
  color: var(--brand-500);
}

/* ─── CATALOG SECTION - Light Theme ─── */
.dashboard-main-content {
  display: flex;
  flex-direction: column;
  padding: 2rem;
  background: var(--bg-panel);
  gap: 2rem;
}

.record-block {
  background: transparent;
  border: none;
  padding: 0;
  box-shadow: none;
}

.record-block + .record-block {
  border-top: 1px solid var(--border-soft);
  padding-top: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.75rem;
  gap: 1.25rem;
}
.section-header h3 {
  margin: 0 0 0.4rem 0;
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--text-strong);
  letter-spacing: -0.25px;
}
.section-header p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-muted);
}

.section-header .button.primary {
  background: var(--brand-600);
  color: #fff;
  border: none;
  box-shadow: 0 4px 12px rgba(54, 95, 168, 0.2);
}
.section-header .button.primary:hover {
  background: var(--brand-500);
  transform: translateY(-1px);
}

.lots-list-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.lot-row-card {
  display: flex;
  align-items: center;
  background: var(--bg-panel);
  border: 1px solid var(--border-soft);
  border-radius: 14px;
  padding: 1.15rem;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  gap: 1.25rem;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.02);
}

.lot-row-card:hover {
  transform: translateY(-2px);
  border-color: var(--border-strong);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.lot-row-card.is-active {
  border-color: #10b981;
  background: #f0fdf4;
  box-shadow: 0 0 25px rgba(16, 185, 129, 0.1);
}

.lot-index-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background: var(--bg-soft);
  border-radius: 12px;
  flex-shrink: 0;
  border: 1px solid var(--border-soft);
  position: relative;
}

.lot-index-badge span {
  font-size: 0.6rem;
  text-transform: uppercase;
  color: var(--text-muted);
  font-weight: 800;
}

.lot-index-badge strong {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--text-strong);
}

.lot-index-badge.is-active-badge {
  background: #dcfce7;
  border-color: #86efac;
}
.lot-index-badge.is-active-badge strong {
  color: #15803d;
}

.live-indicator-dot {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 10px;
  height: 10px;
  background-color: #10b981;
  border-radius: 50%;
  border: 2px solid #fff;
  animation: pulse-green 1.5s infinite;
}

@keyframes pulse-green {
  0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 4px rgba(16, 185, 129, 0); }
  100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

.lot-product-image {
  width: 68px;
  height: 68px;
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-soft);
  border: 1px solid var(--border-soft);
  flex-shrink: 0;
  position: relative;
}
.lot-product-image img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 2;
}
.lot-product-image .fallback-icon {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 1.25rem;
  z-index: 1;
}

.lot-product-details {
  flex-grow: 1;
  min-width: 0;
}

.lot-product-details h5 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-strong);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lot-meta-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.lot-badge {
  font-size: 0.725rem;
  background: var(--bg-soft);
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  color: var(--text-body);
  font-weight: 600;
  border: 1px solid var(--border-soft);
}

.lot-badge.highlight {
  background: var(--bg-panel);
  color: var(--text-strong);
  border: 1px solid var(--border-strong);
}

.lot-badge.active-price {
  background: #f0fdf4;
  color: #166534;
  font-weight: 800;
  border-color: #bbf7d0;
}

.lot-badge.count-badge {
  background: #eff6ff;
  color: #1e40af;
  font-weight: 800;
  border-color: #bfdbfe;
}

.lot-order-controls {
  display: flex;
  gap: 0.35rem;
}

.lot-order-controls .button {
  background: var(--bg-panel);
  border: 1px solid var(--border-strong);
  color: var(--text-muted);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.lot-order-controls .button:hover:not(:disabled) {
  background: var(--bg-soft);
  color: var(--text-strong);
  border-color: var(--text-muted);
}

/* Submissions Pool */
.record-block.submissions-section {
  display: flex;
  flex-direction: column;
}
.record-block.submissions-section h3 {
  margin: 0 0 0.4rem 0;
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--text-strong);
}

.section-desc {
  margin: 0 0 1.75rem 0;
  color: var(--text-muted);
  font-size: 0.875rem;
}

.table-wrap {
  border: 1px solid var(--border-soft);
  border-radius: 14px;
  overflow: hidden;
  background: var(--bg-panel);
  box-shadow: var(--shadow-soft);
}

.submission-table {
  width: 100%;
  border-collapse: collapse;
}
.submission-table th {
  background: var(--bg-elevated);
  font-size: 0.725rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--text-muted);
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-soft);
  letter-spacing: 0.8px;
}
.submission-table td {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-soft);
  font-size: 0.875rem;
  color: var(--text-body);
}
.submission-table tbody tr:last-child td {
  border-bottom: none;
}
.submission-table tbody tr:hover {
  background: var(--bg-soft);
}

.product-cell {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.product-thumb {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid var(--border-soft);
  background: var(--bg-soft);
  position: relative;
}
.product-thumb img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 2;
}
.product-thumb .fallback-icon {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 1.1rem;
  z-index: 1;
}

.action-buttons-cell {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.action-buttons-cell .button.primary {
  background: #10b981;
  color: #fff;
  border: none;
  box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2);
}
.action-buttons-cell .button.primary:hover {
  background: #059669;
  transform: translateY(-1px);
}
.action-buttons-cell .button.danger {
  background: #ef4444;
  color: #fff;
  border: none;
  box-shadow: 0 4px 10px rgba(239, 68, 68, 0.2);
}
.action-buttons-cell .button.danger:hover {
  background: #dc2626;
  transform: translateY(-1px);
}

/* Empty states inside blocks */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 4rem 1.5rem;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 3rem;
  color: var(--border-strong);
  margin-bottom: 1rem;
}

.empty-state p {
  margin: 0;
  max-width: 420px;
  font-size: 0.9rem;
  color: var(--text-muted);
  line-height: 1.5;
}

/* Modals styling - Light Theme */
.custom-modal-backdrop,
.confirm-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.custom-modal-card {
  width: 500px;
  max-width: 92%;
  background: var(--bg-panel);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 25px 60px rgba(15, 23, 42, 0.15);
  border: 1px solid var(--border-soft);
}

.modal-header {
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-soft);
}
.modal-header h4 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text-strong);
}
.modal-header .button.icon-only {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 1.1rem;
}
.modal-header .button.icon-only:hover {
  color: var(--text-strong);
}

.modal-body {
  padding: 1.75rem;
}

.modal-prompt {
  font-size: 0.95rem;
  color: var(--text-body);
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.form-group label {
  font-size: 0.725rem;
  color: var(--text-muted);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.form-control {
  background: var(--bg-panel);
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  color: var(--text-strong);
  padding: 0.85rem;
  width: 100%;
  font-size: 0.95rem;
  resize: vertical;
  outline: none;
  transition: all 0.2s;
}
.form-control:focus {
  border-color: var(--brand-500);
  box-shadow: 0 0 10px rgba(54, 95, 168, 0.15);
}

.modal-footer {
  padding: 1.25rem 1.75rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.85rem;
  background: var(--bg-soft);
  border-top: 1px solid var(--border-soft);
}

.modal-footer .button.ghost {
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-strong);
}
.modal-footer .button.ghost:hover {
  background: var(--bg-soft);
}
.modal-footer .button.primary {
  background: var(--brand-600);
  color: #fff;
  border: none;
}
.modal-footer .button.primary:hover {
  background: var(--brand-500);
}
.modal-footer .button.danger {
  background: #ef4444;
  color: #fff;
  border: none;
}
.modal-footer .button.danger:hover {
  background: #dc2626;
}

/* Special Confirm Modal (Auto Progress and Live Commands confirmation) - Light Theme */
.confirm-modal-content {
  background: var(--bg-panel);
  border: 1px solid var(--border-soft);
  border-radius: 20px;
  width: 480px;
  max-width: 90%;
  box-shadow: 0 25px 60px rgba(15, 23, 42, 0.15);
  overflow: hidden;
  color: var(--text-body);
}

.confirm-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-soft);
}
.confirm-modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text-strong);
}

.confirm-close-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}
.confirm-close-btn:hover {
  color: var(--text-strong);
}

.confirm-modal-body {
  padding: 1.75rem;
}
.confirm-modal-body p {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--text-body);
}

.confirm-progress-bar-container {
  background: var(--bg-soft);
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  margin: 1.5rem 0 0.5rem 0;
  border: 1px solid var(--border-soft);
}
.confirm-progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #f59e0b, #ef4444);
  transition: width 100ms linear;
}

.confirm-countdown-text {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-align: right;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.confirm-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.85rem;
  padding: 1.25rem 1.75rem;
  background: var(--bg-soft);
  border-top: 1px solid var(--border-soft);
}
.confirm-modal-footer .button.secondary {
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-strong);
}
.confirm-modal-footer .button.secondary:hover {
  background: var(--bg-soft);
}
.confirm-modal-footer .button.primary {
  background: var(--brand-600);
  color: #fff;
  border: none;
}
.confirm-modal-footer .button.primary:hover {
  transform: translateY(-1px);
}

/* Image Zoom Modal Scoped Styles */
.image-zoom-backdrop {
  background: rgba(15, 23, 42, 0.9) !important;
  backdrop-filter: blur(16px);
  cursor: zoom-out;
}
.image-zoom-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  justify-content: center;
  align-items: center;
}
.zoomed-image {
  max-width: 100%;
  max-height: 85vh;
  object-fit: contain;
  border-radius: 16px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: zoom-in-bounce 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes zoom-in-bounce {
  0% { transform: scale(0.95); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
.image-zoom-close {
  position: absolute;
  top: -40px;
  right: 0;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}
.image-zoom-close:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.1);
}
/* Cursor pointers on clickable images */
.active-lot-media,
.cover-image-container,
.lot-product-image,
.product-thumb {
  cursor: pointer;
}
</style>