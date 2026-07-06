<template>
  <section class="auction-detail-view">
    <!-- Üst Başlık ve Araç Çubuğu -->
    <header class="page-header sticky-header">
      <div>
        <div class="breadcrumb">
          <router-link to="/auctions" class="breadcrumb-link">Müzayedeler</router-link>
          <i class="pi pi-chevron-right" />
          <span>Lot Detayı</span>
        </div>
        <h1>LOT #{{ auction?.lotNumber || 'Müzayede Detayı' }}</h1>
        <p class="subtitle font-mono">ID: {{ id }}</p>
      </div>
      <div class="toolbar">
        <button class="button ghost" type="button" @click="loadDetail" :disabled="loading">
          <i :class="['pi', loading ? 'pi-spin pi-spinner' : 'pi-refresh']" />
          Yenile
        </button>
        <button
          v-if="auction && (auction.status === 'DRAFT' || auction.status === 'PUBLISHED')"
          class="button ghost"
          type="button"
          @click="openPreviewModal"
        >
          <i class="pi pi-eye" />
          Önizleme
        </button>
        <button
          v-if="auction?.status === 'ACTIVE'"
          class="button primary"
          type="button"
          @click="openFinalizeModal"
        >
          <i class="pi pi-flag-fill" />
          Müzayedeyi Sonlandır
        </button>
        <button
          v-if="auction?.status === 'ENDED' && auction?.winnerId && !auction?.saleApprovedAt"
          class="button primary"
          type="button"
          @click="submitApproveSale"
          :disabled="submittingSaleApproval"
        >
          <i :class="['pi', submittingSaleApproval ? 'pi-spin pi-spinner' : 'pi-check-circle']" />
          Satışı Onayla
        </button>
        <button
          v-if="auction?.status !== 'CANCELLED' && auction?.status !== 'ENDED' && auction?.status !== 'COMPLETED'"
          class="button danger"
          type="button"
          @click="openCancelModal"
        >
          <i class="pi pi-ban" />
          Müzayedeyi İptal Et
        </button>
        <button class="button primary" type="button" @click="router.back()">
          <i class="pi pi-arrow-left" />
          Geri
        </button>
      </div>
    </header>

    <!-- Yükleniyor Durumu -->
    <div v-if="loading && !auction" class="loading-state">
      <i class="pi pi-spin pi-spinner spinner-lg" />
      <p>Müzayede detayları yükleniyor...</p>
    </div>

    <!-- Hata Durumu -->
    <div v-else-if="error" class="error-banner">
      <i class="pi pi-exclamation-triangle" />
      <span>{{ error }}</span>
    </div>

    <div v-else-if="auction" class="auction-dashboard-layout">
      <!-- ─── BÜYÜK KAHRAMAN KART (HERO HEADER CARD) ─── -->
      <header class="auction-hero-card" :class="heroStatusClass">
        <div class="hero-glow-effect"></div>
        <div class="hero-content">
          <div class="hero-top-row">
            <div class="lot-badge-container">
              <span class="lot-badge-glow"></span>
              <span class="lot-badge">LOT #{{ auction.lotNumber }}</span>
            </div>
            <div class="status-badge-container">
              <span :class="['status-badge', auction.status?.toLowerCase()]">
                <span v-if="auction.status === 'ACTIVE'" class="live-pulse-dot"></span>
                {{ formatStatus(auction.status) }}
              </span>
            </div>
          </div>

          <!-- Yaşam Döngüsü Açıklayıcı Banner: publish sonrası otomatik başlangıç/bitiş
               zamanlanmış arka plan job'ları ile yapıldığından kullanıcıya görünmez;
               bu banner her durumda sürecin neresinde olunduğunu açıkça anlatır. -->
          <div v-if="lifecycleBanner" :class="['lifecycle-banner', lifecycleBanner.tone]">
            <i :class="['pi', lifecycleBanner.icon, 'lifecycle-banner-icon']" />
            <p class="lifecycle-banner-text">{{ lifecycleBanner.text }}</p>
            <button
              v-if="auction.status === 'DRAFT'"
              class="button primary lifecycle-publish-button"
              type="button"
              :disabled="submittingPublish"
              @click="openPublishModal"
            >
              <i :class="['pi', submittingPublish ? 'pi-spin pi-spinner' : 'pi-megaphone']" />
              Yayınla
            </button>
          </div>
          <!-- Yayınlama hataları (ör. geçmiş startTime doğrulaması) banner alanında gösterilir -->
          <div v-if="publishError" class="lifecycle-banner danger">
            <i class="pi pi-exclamation-circle lifecycle-banner-icon" />
            <p class="lifecycle-banner-text">{{ publishError }}</p>
          </div>

          <div class="hero-main-row">
            <div class="product-title-area">
              <span class="eyebrow">İhaledeki Ürün</span>
              <h2 class="title">{{ product?.title || 'Bilinmeyen Ürün' }}</h2>
            </div>
            
            <!-- Geri Sayım Alanı -->
            <div v-if="auction.status === 'ACTIVE'" class="countdown-card">
              <span class="countdown-eyebrow">KALAN SÜRE</span>
              <div class="countdown-timer font-mono" :class="{ 'timer-danger': timeLeftSeconds <= 15 }">
                <i class="pi pi-clock clock-spin" />
                {{ formattedTimeLeft }}
              </div>
            </div>
            <div v-else class="countdown-card finished">
              <span class="countdown-eyebrow">MÜZAYEDE DURUMU</span>
              <div class="countdown-timer font-mono">
                {{ formatStatus(auction.status) }}
              </div>
            </div>
          </div>

          <!-- KPI Grid (Anahtar Metrikler) -->
          <div class="hero-kpi-grid">
            <div class="kpi-card">
              <span class="kpi-icon"><i class="pi pi-tag" /></span>
              <div class="kpi-data">
                <span class="kpi-label">Güncel Fiyat</span>
                <strong class="kpi-value font-mono highlight-text">{{ formatMoney(auction.currentPrice) }}</strong>
              </div>
            </div>
            <div class="kpi-card">
              <span class="kpi-icon"><i class="pi pi-bolt" /></span>
              <div class="kpi-data">
                <span class="kpi-label">Toplam Teklif</span>
                <strong class="kpi-value font-mono">{{ summary?.totalBidCount || 0 }} Teklif</strong>
              </div>
            </div>
            <div class="kpi-card">
              <span class="kpi-icon"><i class="pi pi-users" /></span>
              <div class="kpi-data">
                <span class="kpi-label">Teklif Verenler</span>
                <strong class="kpi-value font-mono">{{ summary?.uniqueBidderCount || 0 }} Katılımcı</strong>
              </div>
            </div>
            <div class="kpi-card">
              <span class="kpi-icon"><i class="pi pi-trophy" /></span>
              <div class="kpi-data">
                <span class="kpi-label">Lider / Kazanan Teklif</span>
                <strong class="kpi-value font-mono winning-color">
                  {{ summary?.highestBidAmount ? formatMoney(summary.highestBidAmount) : '-' }}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- ─── ANA ÇİFT KOLON DÜZENİ ─── -->
      <div class="dashboard-columns">
        <!-- SOL KOLON: Detaylar, Ayarlar ve Bilgiler -->
        <div class="column-left">
          <!-- Ürün Detayları -->
          <section class="glass-panel">
            <header class="panel-head">
              <h3><i class="pi pi-box" /> Ürün Bilgileri</h3>
            </header>
            <div class="panel-body">
              <div v-if="product" class="product-media-card">
                <div class="product-info-details">
                  <h4 class="product-title">{{ product.title }}</h4>
                  <div class="product-meta-grid">
                    <div class="meta-item">
                      <span class="meta-label">Mağaza Fiyatı</span>
                      <strong class="meta-value font-mono">{{ formatMoney(product.price) }}</strong>
                    </div>
                    <div class="meta-item">
                      <span class="meta-label">Stok Adedi</span>
                      <strong class="meta-value font-mono">{{ product.stockQuantity || 0 }} Adet</strong>
                    </div>
                    <div class="meta-item">
                      <span class="meta-label">Kayıt Tarihi</span>
                      <strong class="meta-value">{{ formatDate(product.createdAt) }}</strong>
                    </div>
                    <div class="meta-item">
                      <span class="meta-label">Ürün Durumu</span>
                      <strong class="meta-value">
                        <span class="status-pill inline">{{ formatStatus(product.status) }}</span>
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="empty-state">
                <p>Ürün bilgisi bulunmamaktadır.</p>
              </div>
            </div>
          </section>

          <!-- Satıcı Bilgileri -->
          <section class="glass-panel">
            <header class="panel-head">
              <h3><i class="pi pi-user" /> Satıcı Bilgileri</h3>
            </header>
            <div class="panel-body">
              <div v-if="seller" class="seller-profile-row">
                <div class="avatar-wrap">
                  <i class="pi pi-user avatar-icon" />
                </div>
                <div class="seller-profile-info">
                  <h4 class="seller-name">
                    {{ seller.firstName }} {{ seller.lastName }}
                    <span v-if="seller.isVerified" class="verified-badge" title="Onaylı Satıcı">
                      <i class="pi pi-verified" />
                    </span>
                  </h4>
                  <p class="seller-email font-mono">{{ seller.email }}</p>
                  
                  <div class="seller-meta-row">
                    <span class="badge" :class="seller.isActive ? 'neutral' : 'danger'">
                      {{ seller.isActive ? 'Aktif Hesap' : 'Kısıtlı Hesap' }}
                    </span>
                    <span class="muted font-mono font-xs">Katılım: {{ formatDate(seller.createdAt) }}</span>
                  </div>
                </div>
              </div>
              <div v-else class="empty-state">
                <p>Satıcı bilgisi bulunmamaktadır.</p>
              </div>
            </div>
          </section>

          <!-- Müzayede Kuralları ve Konfigürasyon -->
          <section class="glass-panel">
            <header class="panel-head">
              <h3><i class="pi pi-cog" /> Müzayede Kuralları & Konfigürasyon</h3>
            </header>
            <div class="panel-body">
              <div class="config-grid">
                <div class="config-item">
                  <span class="config-label">Başlangıç Fiyatı</span>
                  <strong class="config-value font-mono">{{ formatMoney(auction.startPrice) }}</strong>
                </div>
                <div class="config-item">
                  <span class="config-label">Minimum Artış</span>
                  <strong class="config-value font-mono">{{ formatMoney(auction.minIncrement) }}</strong>
                </div>
                <div class="config-item">
                  <span class="config-label">Rezerve Fiyatı</span>
                  <strong class="config-value font-mono">{{ formatReserveLabel(auction.reservePrice) }}</strong>
                </div>
                <div class="config-item">
                  <span class="config-label">Rezerve Eşiği</span>
                  <strong class="config-value">
                    <span :class="['status-pill', auction.reserveMet ? 'success' : 'warning']">
                      {{ formatReserveState(auction.reservePrice, auction.reserveMet) }}
                    </span>
                  </strong>
                </div>
                <div class="config-item">
                  <span class="config-label">Anti-Sniping (Süre Uzatma)</span>
                  <strong class="config-value">
                    <span :class="['status-pill', auction.antiSnipingEnabled ? 'success' : 'neutral']">
                      {{ auction.antiSnipingEnabled ? 'ETKİN' : 'DEVRE DIŞI' }}
                    </span>
                  </strong>
                </div>
                <div class="config-item">
                  <span class="config-label">Maksimum Uzama</span>
                  <strong class="config-value font-mono">{{ auction.maxExtensions || 5 }} Kez</strong>
                </div>
                <div class="config-item">
                  <span class="config-label">Tetikleme Süresi (Son)</span>
                  <strong class="config-value font-mono">{{ auction.extensionSeconds || 60 }} saniye</strong>
                </div>
                <div class="config-item">
                  <span class="config-label">Uzama Süresi (+Ekle)</span>
                  <strong class="config-value font-mono">{{ auction.extensionDuration || 60 }} saniye</strong>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- SAĞ KOLON: Canlı Akış, Siparişler ve Zaman Tüneli -->
        <div class="column-right">
          <!-- Canlı Teklif Akışı -->
          <section class="glass-panel stream-panel">
            <header class="panel-head flex-between">
              <h3><i class="pi pi-bolt font-gold" /> Teklif Akışı</h3>
              <span class="badge neutral live-feed-badge font-mono">CANLI AKIŞ</span>
            </header>
            <div class="panel-body bids-stream-wrapper">
              <div v-if="!bids || bids.length === 0" class="empty-state py-5">
                <i class="pi pi-tag empty-icon" />
                <p>Müzayedede henüz verilmiş bir teklif bulunmamaktadır.</p>
              </div>
              <TransitionGroup v-else name="bid-list" tag="div" class="bids-list">
                <div 
                  v-for="(bid, index) in bids" 
                  :key="bid.id" 
                  class="bid-row"
                  :class="{ 'winning-bid-card': bid.isWinningBid, 'is-newest': index === 0 }"
                >
                  <div class="bidder-avatar-wrap">
                    <i class="pi pi-user" />
                  </div>
                  <div class="bid-info">
                    <div class="bidder-name-row">
                      <span class="bidder-name">{{ bid.bidderName }}</span>
                      <span v-if="bid.isWinningBid" class="winning-badge font-bold">
                        <i class="pi pi-trophy" /> {{ auction.status === 'ENDED' || auction.status === 'COMPLETED' ? 'Kazandı' : 'Lider' }}
                      </span>
                    </div>
                    <span class="bid-date font-mono">{{ formatDate(bid.createdAt) }}</span>
                  </div>
                  <div class="bid-amount-area font-mono text-right">
                    <strong class="amount">{{ formatMoney(bid.amount) }}</strong>
                    <small v-if="bid.maxAmount" class="max-amount font-xs">Max: {{ formatMoney(bid.maxAmount) }}</small>
                  </div>
                </div>
              </TransitionGroup>
            </div>
          </section>

          <!-- Katılımcılar Listesi -->
          <section class="glass-panel">
            <header class="panel-head">
              <h3><i class="pi pi-users" /> Katılımcılar</h3>
            </header>
            <div class="panel-body">
              <div v-if="!participants || participants.length === 0" class="empty-state">
                <p>Katılımcı bulunmamaktadır.</p>
              </div>
              <div v-else class="table-wrap">
                <table class="detail-table compact-table">
                  <thead>
                    <tr>
                      <th>Katılımcı</th>
                      <th class="text-center">Teklif Sayısı</th>
                      <th class="text-right">En Yüksek Teklif</th>
                      <th class="text-right">Son Teklif Zamanı</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="p in participants" :key="p.bidderId">
                      <td>
                        <div class="p-name font-bold">{{ p.bidderName }}</div>
                        <div class="p-email font-mono font-xs muted">{{ p.bidderEmail }}</div>
                      </td>
                      <td class="text-center font-mono font-bold">{{ p.bidCount }}</td>
                      <td class="text-right font-mono font-bold text-primary">{{ formatMoney(p.highestBidAmount) }}</td>
                      <td class="text-right font-xs muted">{{ formatDate(p.latestBidAt) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <!-- Sipariş ve Ödeme Bilgileri (Satış Gerçekleştiyse) -->
          <section v-if="order || payment" class="glass-panel alert-panel">
            <header class="panel-head">
              <h3><i class="pi pi-shopping-bag" /> Satış ve Ödeme Detayları</h3>
            </header>
            <div class="panel-body">
              <div class="order-payment-cards-grid">
                <!-- Sipariş Kartı -->
                <div v-if="order" class="data-block-card">
                  <div class="data-block-header">
                    <h4>Sipariş Kaydı</h4>
                    <span class="status-pill status-order inline" :class="order.status">{{ order.status }}</span>
                  </div>
                  <div class="data-block-body">
                    <div class="metric-row">
                      <span>Sipariş No</span>
                      <strong class="font-mono">{{ order.id.substring(0, 8) }}</strong>
                    </div>
                    <div class="metric-row">
                      <span>Satış Tutarı</span>
                      <strong class="font-mono text-brand">{{ formatMoney(order.amount, order.currency) }}</strong>
                    </div>
                    <div class="metric-row">
                      <span>Emanet (Escrow)</span>
                      <strong class="status-pill inline" :class="order.escrowStatus?.toLowerCase()">{{ order.escrowStatus }}</strong>
                    </div>
                  </div>
                </div>

                <!-- Ödeme Kartı -->
                <div v-if="payment" class="data-block-card">
                  <div class="data-block-header">
                    <h4>Ödeme Bilgisi</h4>
                    <span class="status-pill inline" :class="payment.status?.toLowerCase()">{{ payment.status }}</span>
                  </div>
                  <div class="data-block-body">
                    <div class="metric-row">
                      <span>Ödeme No</span>
                      <strong class="font-mono">{{ payment.id.substring(0, 8) }}</strong>
                    </div>
                    <div class="metric-row">
                      <span>Ödenen Tutar</span>
                      <strong class="font-mono text-success">{{ formatMoney(payment.amount, payment.currency) }}</strong>
                    </div>
                    <div class="metric-row">
                      <span>Ödeme Kanalı</span>
                      <strong class="font-semibold">{{ payment.provider || '-' }}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Zaman Tüneli -->
          <section class="glass-panel">
            <header class="panel-head">
              <h3><i class="pi pi-clock" /> Müzayede Zaman Tüneli</h3>
            </header>
            <div class="panel-body">
              <div v-if="!timeline || timeline.length === 0" class="empty-state">
                <p>Zaman tüneli bulunmamaktadır.</p>
              </div>
              <div v-else class="timeline-container">
                <div v-for="t in timeline" :key="t.id" class="timeline-step">
                  <div class="timeline-node"></div>
                  <div class="timeline-step-content">
                    <span class="timeline-label">{{ t.label }}</span>
                    <span class="timeline-time font-mono">{{ formatDate(t.createdAt) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>

    <!-- Müzayede İptal Modalı -->
    <div class="custom-modal-backdrop" v-if="showCancelModal">
      <div class="custom-modal-card">
        <header class="modal-header">
          <h4>Müzayedeyi İptal Et</h4>
          <button class="button icon-only ghost" type="button" @click="closeCancelModal">
            <i class="pi pi-times" />
          </button>
        </header>
        <div class="modal-body">
          <p class="modal-prompt warning-message">
            <i class="pi pi-exclamation-circle" />
            Bu müzayedeyi iptal etmek istediğinize emin misiniz? Bu işlem geri alınamaz ve varsa verilmiş olan tüm teklifler iptal edilir.
          </p>
          <div class="form-group">
            <label for="cancel-reason-input">İptal Gerekçesi (Zorunlu)</label>
            <textarea
              id="cancel-reason-input"
              v-model="cancelReason"
              placeholder="Müzayedenin iptal edilme gerekçesini giriniz..."
              rows="4"
              class="form-control"
            />
          </div>
        </div>
        <footer class="modal-footer">
          <button class="button ghost" type="button" @click="closeCancelModal">Vazgeç</button>
          <button 
            class="button danger" 
            type="button" 
            @click="submitCancel"
            :disabled="!cancelReason.trim() || submittingCancel"
          >
            <i v-if="submittingCancel" class="pi pi-spin pi-spinner" />
            Müzayedeyi İptal Et
          </button>
        </footer>
      </div>
    </div>

    <!-- Müzayede Sonlandırma Modalı -->
    <div class="custom-modal-backdrop" v-if="showFinalizeModal">
      <div class="custom-modal-card">
        <header class="modal-header">
          <h4>Müzayedeyi Sonlandır</h4>
          <button class="button icon-only ghost" type="button" @click="closeFinalizeModal">
            <i class="pi pi-times" />
          </button>
        </header>
        <div class="modal-body">
          <p class="modal-prompt warning-message">
            <i class="pi pi-exclamation-circle" />
            Müzayede şimdi sonlandırılacak: geçerli en yüksek teklif kazanır, teklif yoksa müzayede başarısız sayılır. Bu işlem geri alınamaz.
          </p>
          <div class="form-group">
            <label for="finalize-reason-input">Sonlandırma Gerekçesi (Zorunlu)</label>
            <textarea
              id="finalize-reason-input"
              v-model="finalizeReason"
              placeholder="Müzayedenin elle sonlandırılma gerekçesini giriniz..."
              rows="4"
              class="form-control"
            />
          </div>
        </div>
        <footer class="modal-footer">
          <button class="button ghost" type="button" @click="closeFinalizeModal">Vazgeç</button>
          <button
            class="button primary"
            type="button"
            @click="submitFinalize"
            :disabled="!finalizeReason.trim() || submittingFinalize"
          >
            <i v-if="submittingFinalize" class="pi pi-spin pi-spinner" />
            Müzayedeyi Sonlandır
          </button>
        </footer>
      </div>
    </div>

    <!-- Müzayede Yayınlama Onay Modalı -->
    <div class="custom-modal-backdrop" v-if="showPublishModal">
      <div class="custom-modal-card">
        <header class="modal-header">
          <h4>Müzayedeyi Yayınla</h4>
          <button class="button icon-only ghost" type="button" @click="closePublishModal">
            <i class="pi pi-times" />
          </button>
        </header>
        <div class="modal-body">
          <p class="modal-prompt">
            Yayınlandığında müzayede aşağıdaki plana göre <strong>otomatik olarak</strong> başlatılıp
            sonlandırılacaktır. Onaylıyor musunuz?
          </p>
          <div class="publish-summary">
            <div class="publish-summary-row">
              <span class="publish-summary-label"><i class="pi pi-play-circle" /> Otomatik Başlangıç</span>
              <strong class="publish-summary-value font-mono">{{ formatDate(auction?.startTime) }}</strong>
            </div>
            <div class="publish-summary-row">
              <span class="publish-summary-label"><i class="pi pi-stop-circle" /> Otomatik Bitiş</span>
              <strong class="publish-summary-value font-mono">{{ formatDate(auction?.endTime) }}</strong>
            </div>
            <div class="publish-summary-row">
              <span class="publish-summary-label"><i class="pi pi-tag" /> Başlangıç Fiyatı</span>
              <strong class="publish-summary-value font-mono">{{ formatMoney(auction?.startPrice) }}</strong>
            </div>
          </div>
          <p v-if="publishStartTimeInPast" class="modal-prompt warning-message">
            <i class="pi pi-exclamation-circle" />
            Başlangıç zamanı geçmişte görünüyor; yayınlama isteği backend doğrulaması tarafından
            reddedilebilir.
          </p>
        </div>
        <footer class="modal-footer">
          <button class="button ghost" type="button" @click="closePublishModal">Vazgeç</button>
          <button
            class="button primary"
            type="button"
            @click="submitPublish"
            :disabled="submittingPublish"
          >
            <i v-if="submittingPublish" class="pi pi-spin pi-spinner" />
            Yayınla
          </button>
        </footer>
      </div>
    </div>

    <!-- Alıcı Önizleme Modalı: mobil alıcının göreceği lot kartının yaklaşık temsili.
         Tamamen frontend'dir; bu ekranda zaten yüklü olan verilerle çizilir. -->
    <div class="custom-modal-backdrop" v-if="showPreviewModal">
      <div class="custom-modal-card preview-modal-card">
        <header class="modal-header">
          <h4><i class="pi pi-eye" /> Alıcı Önizlemesi</h4>
          <button class="button icon-only ghost" type="button" @click="closePreviewModal">
            <i class="pi pi-times" />
          </button>
        </header>
        <div class="modal-body preview-modal-body">
          <div class="buyer-preview-card">
            <div class="preview-media">
              <img
                v-if="previewImageUrl"
                :src="previewImageUrl"
                :alt="product?.title || 'Ürün görseli'"
                class="preview-image"
              />
              <div v-else class="preview-image-placeholder">
                <i class="pi pi-image" />
                <span>Görsel bulunmuyor</span>
              </div>
              <span class="preview-lot-chip font-mono">LOT #{{ auction?.lotNumber ?? '-' }}</span>
              <span class="preview-type-chip">{{ formatAuctionType(auction?.auctionType) }}</span>
            </div>
            <div class="preview-content">
              <h5 class="preview-title">{{ product?.title || auction?.productTitle || 'Bilinmeyen Ürün' }}</h5>
              <div class="preview-price-row">
                <div class="preview-price-block">
                  <span class="preview-label">Açılış Fiyatı</span>
                  <strong class="preview-price font-mono">{{ formatMoney(auction?.startPrice) }}</strong>
                </div>
                <div class="preview-price-block">
                  <span class="preview-label">Min. Artış</span>
                  <strong class="preview-increment font-mono">+{{ formatMoney(auction?.minIncrement) }}</strong>
                </div>
              </div>
              <div class="preview-meta-list">
                <div class="preview-meta-row">
                  <span class="preview-label"><i class="pi pi-shield" /> Rezerv</span>
                  <!-- Alıcı tarafında rezerv tutarı asla gösterilmez; yalnızca var/yok bilgisi -->
                  <span :class="['preview-reserve-chip', auction?.reservePrice != null ? 'has-reserve' : 'no-reserve']">
                    {{ auction?.reservePrice != null ? 'Rezerv var' : 'Rezerv yok' }}
                  </span>
                </div>
                <div class="preview-meta-row">
                  <span class="preview-label"><i class="pi pi-play-circle" /> Başlangıç</span>
                  <span class="preview-meta-value font-mono">{{ formatDate(auction?.startTime) }}</span>
                </div>
                <div class="preview-meta-row">
                  <span class="preview-label"><i class="pi pi-stop-circle" /> Bitiş</span>
                  <span class="preview-meta-value font-mono">{{ formatDate(auction?.endTime) }}</span>
                </div>
              </div>
            </div>
          </div>
          <p class="preview-note">
            <i class="pi pi-info-circle" />
            Bu önizleme, alıcının mobil uygulamada göreceği lot kartının yaklaşık bir temsilidir.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { adminApi, toApiMessage } from '../../services/api';
import { getAuctionSocket, disconnectAuctionSocket } from '../../services/socket';

const props = defineProps<{
  id: string;
}>();

const router = useRouter();

const loading = ref(true);
const error = ref<string | null>(null);

// Müzayede Temel Verileri
const auction = ref<any>(null);
const product = ref<any>(null);
const seller = ref<any>(null);
const summary = ref<any>(null);
const order = ref<any>(null);
const payment = ref<any>(null);
const bids = ref<any[]>([]);
const participants = ref<any[]>([]);
const timeline = ref<any[]>([]);

// İptal Modalı Kontrolleri
const showCancelModal = ref(false);
const cancelReason = ref('');
const submittingCancel = ref(false);

// Sonlandırma Modalı Kontrolleri (takılı/aktif lot için elle finalize)
const showFinalizeModal = ref(false);
const finalizeReason = ref('');
const submittingFinalize = ref(false);

// Yayınlama Modalı Kontrolleri
const showPublishModal = ref(false);
const submittingPublish = ref(false);
// Yayınlama hataları (ör. geçmiş startTime) hero'daki banner alanında gösterilir
const publishError = ref<string | null>(null);

// Alıcı Önizleme Modalı Kontrolü
const showPreviewModal = ref(false);

// Geri Sayım Sayacı
const timeLeftSeconds = ref(0);
let timerInterval: any = null;

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);

  // PUBLISHED durumunda otomatik başlangıca (startTime), ACTIVE durumunda bitişe
  // (endTime) geri sayılır; böylece zamanlanmış arka plan job'larının ne zaman
  // tetikleneceği kullanıcıya görünür olur.
  const status = auction.value?.status;
  const targetTimeStr =
    status === 'PUBLISHED'
      ? auction.value?.startTime
      : status === 'ACTIVE'
        ? auction.value?.endTime
        : null;

  if (!targetTimeStr) {
    timeLeftSeconds.value = 0;
    return;
  }

  const targetMs = new Date(targetTimeStr).getTime();
  // Sayfa açıldığında hedef zaman zaten geçmişse otomatik yenileme yapılmaz;
  // aksi halde loadDetail -> startTimer -> loadDetail sonsuz döngüsü oluşurdu.
  const startedWithTimeLeft = targetMs > Date.now();
  const update = () => {
    const now = Date.now();
    const diff = Math.max(0, Math.ceil((targetMs - now) / 1000));
    timeLeftSeconds.value = diff;
    if (diff <= 0) {
      clearInterval(timerInterval);
      // PUBLISHED geri sayımı ekran açıkken sıfırlandıysa durum tazelenir:
      // zamanlanmış başlangıç job'ı çalıştıysa ACTIVE görünür, çalışmadıysa
      // "başlangıç zamanı geçti" uyarısı devreye girer.
      if (status === 'PUBLISHED' && startedWithTimeLeft) {
        setTimeout(() => loadDetail(), 1500);
      }
    }
  };

  update();
  timerInterval = setInterval(update, 1000);
}

// Saniyeyi okunur geri sayım metnine çevirir; 24 saatten uzun sürelerde
// (yayında bekleyen lotlarda startTime günler sonrası olabilir) gün de gösterilir.
function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return 'Bitti';
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (days > 0) return `${days} gün ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

const formattedTimeLeft = computed(() => formatDuration(timeLeftSeconds.value));

// Start job'ı kaçtı mı? PUBLISHED olduğu halde startTime geçtiyse zamanlanmış
// başlangıç job'ı büyük olasılıkla çalışmamış demektir (yalnızca frontend uyarısı).
const startOverdue = computed(
  () =>
    auction.value?.status === 'PUBLISHED' &&
    Boolean(auction.value?.startTime) &&
    timeLeftSeconds.value <= 0,
);

type LifecycleBannerTone = 'info' | 'success' | 'warning' | 'live' | 'neutral' | 'danger';

interface LifecycleBanner {
  tone: LifecycleBannerTone;
  icon: string;
  text: string;
}

// Durum rozetinin altındaki açıklayıcı banner: her durumda kullanıcıya yaşam
// döngüsünün neresinde olunduğunu ve otomatik geçişleri (start/end job) anlatır.
const lifecycleBanner = computed<LifecycleBanner | null>(() => {
  const current = auction.value;
  if (!current?.status) return null;

  switch (current.status) {
    case 'DRAFT':
      return {
        tone: 'info',
        icon: 'pi-info-circle',
        text: `Taslak — müzayede henüz yayınlanmadı. Yayınlandığında ${formatDate(current.startTime)} tarihinde otomatik başlayacak.`,
      };
    case 'PUBLISHED':
      if (startOverdue.value) {
        return {
          tone: 'warning',
          icon: 'pi-exclamation-triangle',
          text: 'Başlangıç zamanı geçti ama müzayede hâlâ başlamadı — sistem yöneticisine bildirin.',
        };
      }
      return {
        tone: 'success',
        icon: 'pi-clock',
        text: `Yayında — ${formatDate(current.startTime)} tarihinde OTOMATİK başlayacak (kalan: ${formattedTimeLeft.value}). Bitiş: ${formatDate(current.endTime)}.`,
      };
    case 'ACTIVE':
      return {
        tone: 'live',
        icon: 'pi-bolt',
        text: `Canlı — müzayede şu an aktif, bitişe kalan: ${formattedTimeLeft.value}. ${formatDate(current.endTime)} tarihinde otomatik sonlanacak.`,
      };
    case 'ENDED':
      return {
        tone: 'neutral',
        icon: 'pi-flag',
        text: `Müzayede ${formatDate(current.endTime)} itibarıyla sona erdi.`,
      };
    case 'COMPLETED':
      return {
        tone: 'neutral',
        icon: 'pi-check-circle',
        text: 'Müzayede tamamlandı — satış ve ödeme süreci sonuçlandı.',
      };
    case 'CANCELLED':
      return {
        tone: 'danger',
        icon: 'pi-ban',
        text: 'Müzayede iptal edildi.',
      };
    case 'FAILED':
      return {
        tone: 'neutral',
        icon: 'pi-times-circle',
        text: 'Müzayede satış gerçekleşmeden sonuçlandı.',
      };
    default:
      return null;
  }
});

const heroStatusClass = computed(() => {
  if (!auction.value?.status) return 'draft';
  const s = auction.value.status.toLowerCase();
  if (s === 'active') return 'active';
  if (s === 'ended' || s === 'completed') return 'ended';
  if (s === 'cancelled') return 'cancelled';
  return 'draft';
});

// Soket Entegrasyonu
let activeSocket: any = null;
let onSocketConnect: (() => void) | null = null;

function setupSocketConnection() {
  cleanupSocketConnection();
  if (!props.id) return;

  activeSocket = getAuctionSocket();

  // (Re-)join on every 'connect': server-side room membership is lost across
  // reconnects, so a one-off join would leave the view frozen after a drop.
  onSocketConnect = () => {
    activeSocket?.emit('auction:join', { auctionId: props.id });
  };
  activeSocket.on('connect', onSocketConnect);
  if (activeSocket.connected) {
    onSocketConnect();
  }

  activeSocket.on('bid:new', (data: any) => {
    console.log('[Admin Socket] bid:new received for auction', data);
    if (data.auctionId === props.id) {
      loadDetail();
    }
  });

  activeSocket.on('bid:withdrawn', (data: any) => {
    console.log('[Admin Socket] bid:withdrawn received for auction', data);
    if (data.auctionId === props.id) {
      loadDetail();
    }
  });

  activeSocket.on('auction:extended', (data: any) => {
    console.log('[Admin Socket] auction:extended received for auction', data);
    if (data.auctionId === props.id) {
      loadDetail();
    }
  });

  activeSocket.on('auction:ended', (data: any) => {
    console.log('[Admin Socket] auction:ended received for auction', data);
    if (data.auctionId === props.id) {
      loadDetail();
    }
  });
}

function cleanupSocketConnection() {
  if (activeSocket) {
    activeSocket.emit('auction:leave', { auctionId: props.id });
    if (onSocketConnect) {
      activeSocket.off('connect', onSocketConnect);
      onSocketConnect = null;
    }
    activeSocket.off('bid:new');
    activeSocket.off('bid:withdrawn');
    activeSocket.off('auction:extended');
    activeSocket.off('auction:ended');
    activeSocket = null;
  }
  disconnectAuctionSocket();
}

async function loadDetail() {
  loading.value = true;
  error.value = null;
  try {
    const res = await adminApi.get(`/admin/auctions/${props.id}`);
    const data = res.data;
    
    auction.value = data.overview;
    
    if (data.relatedRecords) {
      const related = data.relatedRecords;
      product.value = related.product;
      seller.value = related.seller;
      summary.value = related.summary;
      order.value = related.order;
      payment.value = related.payment;
      bids.value = related.bids || [];
      participants.value = related.participants || [];
    }
    
    timeline.value = data.timeline || [];
    
    // Timer'ı başlat
    startTimer();
  } catch (err) {
    error.value = toApiMessage(err);
  } finally {
    loading.value = false;
  }
}

// İptal Modalı Fonksiyonları
function openCancelModal() {
  cancelReason.value = '';
  showCancelModal.value = true;
}

function closeCancelModal() {
  showCancelModal.value = false;
  cancelReason.value = '';
}

async function submitCancel() {
  if (!props.id) return;
  submittingCancel.value = true;
  try {
    await adminApi.patch(`/admin/auctions/${props.id}/cancel`, {
      reason: cancelReason.value,
    });
    closeCancelModal();
    await loadDetail();
  } catch (err) {
    error.value = toApiMessage(err);
  } finally {
    submittingCancel.value = false;
  }
}

// Satış Onayı: onay verilmeden kazanana ödeme penceresi açılmaz
const submittingSaleApproval = ref(false);

async function submitApproveSale() {
  if (!props.id) return;
  if (!window.confirm('Satış onaylansın mı? Kazanana ödeme penceresi (24 saat) açılacak ve ürün sepetine düşecek.')) {
    return;
  }
  submittingSaleApproval.value = true;
  try {
    await adminApi.patch(`/admin/auctions/${props.id}/approve-sale`);
    await loadDetail();
  } catch (err) {
    error.value = toApiMessage(err);
  } finally {
    submittingSaleApproval.value = false;
  }
}

// Sonlandırma Modalı Fonksiyonları
function openFinalizeModal() {
  finalizeReason.value = '';
  showFinalizeModal.value = true;
}

function closeFinalizeModal() {
  showFinalizeModal.value = false;
  finalizeReason.value = '';
}

async function submitFinalize() {
  if (!props.id) return;
  submittingFinalize.value = true;
  try {
    await adminApi.patch(`/admin/auctions/${props.id}/finalize`, {
      reason: finalizeReason.value,
    });
    closeFinalizeModal();
    await loadDetail();
  } catch (err) {
    error.value = toApiMessage(err);
  } finally {
    submittingFinalize.value = false;
  }
}

// Yayınlama Modalı Fonksiyonları
// Onay modalında ön-uyarı: geçmiş startTime backend doğrulamasınca reddedilebilir
const publishStartTimeInPast = computed(() => {
  const startTimeStr = auction.value?.startTime;
  if (!startTimeStr) return false;
  return new Date(startTimeStr).getTime() <= Date.now();
});

function openPublishModal() {
  publishError.value = null;
  showPublishModal.value = true;
}

function closePublishModal() {
  showPublishModal.value = false;
}

async function submitPublish() {
  if (!props.id) return;
  submittingPublish.value = true;
  try {
    // Yayınlama auction modülündedir (@Controller('auctions')) — /admin prefix'i yok.
    // Satıcı sahipliği gerektirir; admin hesabında backend hatası banner'da gösterilir.
    await adminApi.patch(`/auctions/${props.id}/publish`);
    publishError.value = null;
    showPublishModal.value = false;
    await loadDetail();
  } catch (err) {
    // Backend doğrulama hataları (ör. geçmiş startTime) banner alanında gösterilir
    publishError.value = toApiMessage(err);
    showPublishModal.value = false;
  } finally {
    submittingPublish.value = false;
  }
}

// Alıcı Önizleme Modalı Fonksiyonları
function openPreviewModal() {
  showPreviewModal.value = true;
}

function closePreviewModal() {
  showPreviewModal.value = false;
}

// Ürün görseli: admin detail payload'ında görsel alanı garanti değildir;
// olası alan adları sırayla denenir, hiçbiri yoksa placeholder gösterilir.
const previewImageUrl = computed<string | null>(() => {
  const currentProduct = product.value;
  if (!currentProduct) return null;
  const firstImage = Array.isArray(currentProduct.images) ? currentProduct.images[0] : null;
  const firstImageUrl = typeof firstImage === 'string' ? firstImage : firstImage?.url;
  return firstImageUrl || currentProduct.imageUrl || currentProduct.coverImageUrl || null;
});

function formatAuctionType(auctionType: string | null | undefined): string {
  const mapping: Record<string, string> = {
    REALTIME: 'Canlı Müzayede',
    TIMED: 'Süreli Müzayede',
  };
  // Admin detail payload'ında auctionType bulunmayabilir; jenerik etikete düşülür
  return (auctionType && mapping[auctionType.toUpperCase()]) || 'Müzayede';
}

// Format Yardımcıları
function formatDate(dateStr: string | Date | null | undefined): string {
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

function formatMoney(amount: number | string | null | undefined, currency: string = 'TRY'): string {
  const num = Number(amount ?? 0);
  return num.toLocaleString('tr-TR', {
    style: 'currency',
    currency: currency,
  });
}

function formatReserveLabel(reservePrice: number | null | undefined): string {
  if (reservePrice === null || reservePrice === undefined) {
    return 'Yok';
  }
  return formatMoney(reservePrice);
}

function formatReserveState(reservePrice: number | null | undefined, reserveMet: boolean | null | undefined): string {
  if (reservePrice === null || reservePrice === undefined) {
    return 'Rezerve Yok';
  }
  return reserveMet ? 'Rezerve Karşılandı' : 'Rezerve Karşılanmadı';
}

function formatStatus(status: string | null | undefined): string {
  if (!status) return '-';
  const mapping: Record<string, string> = {
    DRAFT: 'Taslak',
    PUBLISHED: 'Yayında',
    ACTIVE: 'Aktif İhalede',
    ENDED: 'Bitti',
    COMPLETED: 'Tamamlandı',
    CANCELLED: 'İptal Edildi',
    FAILED: 'Satılamadı',
  };
  return mapping[status.toUpperCase()] || status;
}

// Watchers & Lifecycle
watch(() => props.id, () => {
  loadDetail();
  setupSocketConnection();
}, { immediate: true });

onMounted(() => {
  setupSocketConnection();
});

onUnmounted(() => {
  cleanupSocketConnection();
  if (timerInterval) clearInterval(timerInterval);
});
</script>

<style scoped>
.auction-detail-view {
  padding: 1.5rem;
  max-width: 1600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.sticky-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(248, 250, 254, 0.9);
  backdrop-filter: blur(10px);
  padding: 1rem 0;
  border-bottom: 1px solid var(--border-soft);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

.breadcrumb-link:hover {
  color: var(--brand-500);
}

.subtitle {
  color: var(--text-muted);
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 1rem;
  color: var(--text-muted);
}

.spinner-lg {
  font-size: 3rem;
  color: var(--brand-500);
}

/* Hero Header Card */
.auction-hero-card {
  position: relative;
  border-radius: 16px;
  padding: 2rem;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
  color: #fff;
  transition: all 0.3s ease;
}

.auction-hero-card.active {
  background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%);
  border-left: 5px solid #3b82f6;
}

.auction-hero-card.ended {
  background: linear-gradient(135deg, #064e3b 0%, #022c22 100%);
  border-left: 5px solid #10b981;
}

.auction-hero-card.cancelled {
  background: linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%);
  border-left: 5px solid #ef4444;
}

.hero-glow-effect {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 60%);
  pointer-events: none;
}

.hero-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.lot-badge-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.lot-badge {
  background: rgba(255, 255, 255, 0.1);
  padding: 0.5rem 1rem;
  border-radius: 99px;
  font-weight: 700;
  letter-spacing: 0.5px;
  font-size: 0.9rem;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 99px;
  font-weight: 700;
  font-size: 0.85rem;
  text-transform: uppercase;
  background: rgba(255, 255, 255, 0.15);
}

.status-badge.active {
  background: #2563eb;
}

.status-badge.ended,
.status-badge.completed {
  background: #10b981;
}

.status-badge.cancelled {
  background: #ef4444;
}

.live-pulse-dot {
  width: 8px;
  height: 8px;
  background-color: #10b981;
  border-radius: 50%;
  display: inline-block;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.9); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.4; }
  100% { transform: scale(0.9); opacity: 1; }
}

.hero-main-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.product-title-area {
  flex: 1;
  min-width: 300px;
}

.product-title-area .eyebrow {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.6);
}

.product-title-area .title {
  margin: 0.25rem 0 0;
  font-size: 1.8rem;
  font-weight: 800;
  line-height: 1.2;
}

.countdown-card {
  background: rgba(0, 0, 0, 0.3);
  padding: 1rem 2rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-width: 220px;
  text-align: right;
}

.countdown-eyebrow {
  font-size: 0.75rem;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.5);
  display: block;
  margin-bottom: 0.25rem;
}

.countdown-timer {
  font-size: 1.8rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.timer-danger {
  color: #ef4444;
  animation: shake 0.5s infinite alternate;
}

@keyframes shake {
  0% { transform: translateX(0); }
  100% { transform: translateX(2px); }
}

/* KPI Cards Grid */
.hero-kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 1.5rem;
}

.kpi-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.03);
  padding: 1rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s ease;
}

.kpi-card:hover {
  background: rgba(255, 255, 255, 0.07);
  transform: translateY(-2px);
}

.kpi-icon {
  width: 42px;
  height: 42px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.8);
}

.kpi-data {
  display: flex;
  flex-direction: column;
}

.kpi-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 600;
}

.kpi-value {
  font-size: 1.25rem;
  font-weight: 700;
}

.highlight-text {
  color: #3b82f6;
  text-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
}

.winning-color {
  color: #10b981;
}

/* Layout Columns */
.dashboard-columns {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 1.5rem;
  align-items: start;
}

@media (max-width: 1024px) {
  .dashboard-columns {
    grid-template-columns: 1fr;
  }
}

.glass-panel {
  border: 1px solid var(--border-soft);
  border-radius: 14px;
  background: var(--bg-panel);
  box-shadow: var(--shadow-soft);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-head {
  padding: 1.25rem;
  border-bottom: 1px solid var(--border-soft);
  background: var(--bg-elevated);
}

.panel-head h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-strong);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.panel-body {
  padding: 1.25rem;
}

/* Product Info Card */
.product-media-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.product-title {
  margin: 0 0 1rem;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-strong);
}

.product-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.meta-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.meta-value {
  font-size: 0.95rem;
  color: var(--text-strong);
}

/* Seller Card */
.seller-profile-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.avatar-wrap {
  width: 50px;
  height: 50px;
  background: var(--brand-100);
  color: var(--brand-500);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.seller-profile-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.seller-name {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.verified-badge {
  color: #10b981;
  font-size: 0.95rem;
}

.seller-email {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.seller-meta-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.25rem;
}

/* Config Grid */
.config-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.25rem;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  border-bottom: 1px dashed var(--border-soft);
  padding-bottom: 0.75rem;
}

.config-label {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.config-value {
  font-size: 1rem;
  color: var(--text-strong);
}

/* Bid Stream & List */
.stream-panel {
  border-top: 3px solid #f59e0b;
}

.bids-stream-wrapper {
  max-height: 400px;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.bids-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.bid-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border-radius: 10px;
  background: var(--bg-soft);
  border: 1px solid var(--border-soft);
  transition: all 0.2s ease;
}

.bid-row:hover {
  transform: translateX(2px);
  box-shadow: var(--shadow-soft);
}

.winning-bid-card {
  background: #f0fdf4;
  border-color: #bbf7d0;
  border-left: 4px solid #10b981;
}

.is-newest {
  animation: flash-green 1s ease-out;
}

@keyframes flash-green {
  0% { background-color: #dcfce7; }
  100% { background-color: var(--bg-soft); }
}

.bidder-avatar-wrap {
  width: 36px;
  height: 36px;
  background: var(--border-strong);
  color: var(--text-muted);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

.winning-bid-card .bidder-avatar-wrap {
  background: #bbf7d0;
  color: #166534;
}

.bid-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.bidder-name-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.bidder-name {
  font-weight: 700;
  color: var(--text-strong);
}

.winning-badge {
  background: #10b981;
  color: #fff;
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  border-radius: 99px;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.bid-date {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.bid-amount-area {
  display: flex;
  flex-direction: column;
}

.bid-amount-area .amount {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-strong);
}

.winning-bid-card .bid-amount-area .amount {
  color: #15803d;
}

.max-amount {
  color: var(--text-muted);
}

/* Timeline */
.timeline-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  position: relative;
  padding-left: 1rem;
}

.timeline-container::before {
  content: '';
  position: absolute;
  left: 3px;
  top: 5px;
  bottom: 5px;
  width: 2px;
  background: var(--border-soft);
}

.timeline-step {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  position: relative;
}

.timeline-node {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--brand-500);
  border: 2px solid #fff;
  box-shadow: 0 0 0 2px var(--brand-500);
  position: absolute;
  left: -16px;
  top: 5px;
  z-index: 2;
}

.timeline-step-content {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.timeline-label {
  font-size: 0.9rem;
  color: var(--text-strong);
  font-weight: 500;
}

.timeline-time {
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* Order/Payment data blocks */
.order-payment-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}

.data-block-card {
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  background: var(--bg-soft);
  overflow: hidden;
}

.data-block-header {
  padding: 0.75rem 1rem;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border-soft);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.data-block-header h4 {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-strong);
}

.data-block-body {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.status-pill.inline {
  padding: 0.2rem 0.5rem;
  font-size: 0.75rem;
}

.font-gold {
  color: #f59e0b;
}

/* Yaşam Döngüsü Açıklayıcı Banner (hero kartı içinde, durum rozetinin altında) */
.lifecycle-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  margin-bottom: 1.5rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-left-width: 4px;
  font-size: 0.9rem;
  line-height: 1.5;
}

.lifecycle-banner-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.lifecycle-banner-text {
  margin: 0;
  flex: 1;
  color: rgba(255, 255, 255, 0.92);
}

.lifecycle-banner.info {
  border-left-color: #60a5fa;
}
.lifecycle-banner.info .lifecycle-banner-icon {
  color: #60a5fa;
}

.lifecycle-banner.success {
  border-left-color: #34d399;
}
.lifecycle-banner.success .lifecycle-banner-icon {
  color: #34d399;
}

.lifecycle-banner.warning {
  background: rgba(245, 158, 11, 0.14);
  border-color: rgba(245, 158, 11, 0.45);
  border-left-color: #f59e0b;
}
.lifecycle-banner.warning .lifecycle-banner-icon {
  color: #fbbf24;
}

.lifecycle-banner.live {
  border-left-color: #3b82f6;
}
.lifecycle-banner.live .lifecycle-banner-icon {
  color: #3b82f6;
}

.lifecycle-banner.neutral {
  border-left-color: rgba(255, 255, 255, 0.35);
}
.lifecycle-banner.neutral .lifecycle-banner-icon {
  color: rgba(255, 255, 255, 0.7);
}

.lifecycle-banner.danger {
  background: rgba(239, 68, 68, 0.14);
  border-color: rgba(239, 68, 68, 0.45);
  border-left-color: #ef4444;
}
.lifecycle-banner.danger .lifecycle-banner-icon {
  color: #f87171;
}

.lifecycle-publish-button {
  flex-shrink: 0;
}

/* Yayınlama Onay Modalı Özeti */
.publish-summary {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 1rem;
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  background: var(--bg-soft);
  margin-bottom: 1.5rem;
}

.publish-summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.publish-summary-label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 600;
}

.publish-summary-value {
  font-size: 0.9rem;
  color: var(--text-strong);
}

/* Alıcı Önizleme Kartı: mobil alıcı görünümünün koyu kart temsili */
.preview-modal-card {
  width: 430px;
}

.preview-modal-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.buyer-preview-card {
  border-radius: 14px;
  overflow: hidden;
  background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
}

.preview-media {
  position: relative;
  height: 190px;
  background: rgba(255, 255, 255, 0.04);
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.preview-image-placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.35);
  font-size: 0.8rem;
}

.preview-image-placeholder i {
  font-size: 2.25rem;
}

.preview-lot-chip {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  padding: 0.3rem 0.7rem;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.preview-type-chip {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: rgba(37, 99, 235, 0.85);
  padding: 0.3rem 0.7rem;
  border-radius: 99px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.preview-content {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.preview-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 800;
  line-height: 1.3;
}

.preview-price-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.preview-price-block {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.preview-price-block:last-child {
  text-align: right;
}

.preview-label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 700;
}

.preview-price {
  font-size: 1.35rem;
  font-weight: 800;
  color: #3b82f6;
}

.preview-increment {
  font-size: 1rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
}

.preview-meta-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.preview-meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.preview-meta-value {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.85);
}

.preview-reserve-chip {
  padding: 0.2rem 0.6rem;
  border-radius: 99px;
  font-size: 0.7rem;
  font-weight: 700;
}

.preview-reserve-chip.has-reserve {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.preview-reserve-chip.no-reserve {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.preview-note {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-muted);
}

/* Modal iskeleti: AuctionEventDetailView ile aynı görünüm. Scoped stiller
   dosyalar arasında sızmadığı için burada da tanımlanması gerekir (bu tanımlar
   olmadan mevcut iptal modalı da stilsiz kalıyordu). */
.custom-modal-backdrop {
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
  max-height: 90vh;
  overflow-y: auto;
  background: var(--bg-panel);
  border-radius: 20px;
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
  display: flex;
  align-items: center;
  gap: 0.5rem;
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

/* Modal Styling */
.warning-message {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: #fef2f2;
  border: 1px solid #fee2e2;
  border-radius: 8px;
  color: #991b1b;
  font-size: 0.9rem;
  line-height: 1.4;
}

.warning-message i {
  font-size: 1.2rem;
  margin-top: 0.1rem;
}
</style>
