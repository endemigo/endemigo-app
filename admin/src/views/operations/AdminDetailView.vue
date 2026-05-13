<template>
  <section class="field-grid">
    <header class="page-header">
      <div>
        <h1>{{ title }}</h1>
        <p>{{ resource }} / {{ id }}</p>
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
        <button
          v-if="resource === 'products'"
          class="button primary"
          type="button"
          @click="goToProductEdit"
        >
          <i class="pi pi-pencil" aria-hidden="true" />
          Ürünü Düzenle
        </button>
        <button
          v-for="action in rowActions"
          :key="action.key"
          class="button"
          :class="action.tone"
          type="button"
          @click="openAction(action)"
        >
          <i :class="action.icon ?? 'pi pi-play'" aria-hidden="true" />
          {{ action.label }}
        </button>
      </div>
    </header>

    <section class="panel">
      <nav class="tabs" aria-label="Detay sekmeleri">
        <button
          v-for="tab in tabs"
          :key="tab"
          class="tab-button"
          :class="{ 'is-active': activeTab === tab }"
          type="button"
          @click="activeTab = tab"
        >
          {{ tab }}
        </button>
      </nav>

      <div class="panel-body">
        <div v-if="loading" class="muted">Detay yükleniyor...</div>
        <div v-else-if="activeTab === 'Genel Bakış'">
          <template v-if="isUserResource && userRelated">
            <section class="overview-grid">
              <article class="overview-hero-card">
                <header class="overview-hero-header">
                  <div>
                    <p class="overview-eyebrow">Üye Genel Durum</p>
                    <h3 class="overview-title">{{ userDisplayName }}</h3>
                  </div>
                  <span class="status-pill">{{ getString(overview, 'isActive') === 'true' ? 'ACTIVE' : 'INACTIVE' }}</span>
                </header>
                <div class="overview-kpi-grid">
                  <article class="overview-kpi">
                    <p>Toplam Sipariş</p>
                    <strong>{{ userRelated.summary.orderCount }}</strong>
                  </article>
                  <article class="overview-kpi">
                    <p>Toplam Satış</p>
                    <strong>{{ userRelated.summary.salesCount }}</strong>
                  </article>
                  <article class="overview-kpi">
                    <p>Favori</p>
                    <strong>{{ userRelated.summary.favoriteCount }}</strong>
                  </article>
                  <article class="overview-kpi">
                    <p>Sepet Kalemi</p>
                    <strong>{{ userRelated.summary.cartLineCount }}</strong>
                  </article>
                </div>
              </article>

              <article class="overview-card">
                <h4>Alım/Satım Dengesi</h4>
                <div class="metric-row">
                  <span>Satış Payı</span>
                  <strong>{{ userSalesRate }}%</strong>
                </div>
                <div class="metric-track">
                  <div class="metric-fill is-success" :style="{ width: `${userSalesRate}%` }"></div>
                </div>
                <div class="metric-row">
                  <span>Sipariş Payı</span>
                  <strong>{{ userOrderRate }}%</strong>
                </div>
                <div class="metric-track">
                  <div class="metric-fill" :style="{ width: `${userOrderRate}%` }"></div>
                </div>
              </article>

              <article class="overview-card">
                <h4>Etkileşim</h4>
                <div class="metric-row">
                  <span>Favori Sayısı</span>
                  <strong>{{ userRelated.summary.favoriteCount }}</strong>
                </div>
                <div class="metric-row">
                  <span>Sepette Ürün Adedi</span>
                  <strong>{{ userRelated.summary.cartQuantityTotal }}</strong>
                </div>
                <div class="metric-row">
                  <span>Tanımlı Kupon</span>
                  <strong>{{ userRelated.summary.definedCouponCount }}</strong>
                </div>
                <div class="metric-row">
                  <span>Kupon Kullanımı</span>
                  <strong>{{ userRelated.summary.couponUsageCount }}</strong>
                </div>
              </article>

              <article class="overview-card">
                <h4>Hızlı Profil</h4>
                <div class="metric-row">
                  <span>E-posta</span>
                  <strong>{{ getString(overview, 'email') || '-' }}</strong>
                </div>
                <div class="metric-row">
                  <span>Telefon</span>
                  <strong>{{ getString(overview, 'phone') || '-' }}</strong>
                </div>
                <div class="metric-row">
                  <span>Üye Tipi</span>
                  <strong>{{ getString(overview, 'isSeller') === 'true' ? 'SELLER' : 'BUYER' }}</strong>
                </div>
                <div class="metric-row">
                  <span>Kayıt</span>
                  <strong>{{ getString(overview, 'createdAt') ? formatDate(getString(overview, 'createdAt')) : '-' }}</strong>
                </div>
              </article>
            </section>
          </template>
          <template v-else-if="isProductResource && productRelated">
            <div class="summary-grid">
              <article class="summary-card">
                <p class="summary-label">Toplam Sipariş</p>
                <strong>{{ productRelated.summary.orderCount }}</strong>
              </article>
              <article class="summary-card">
                <p class="summary-label">Tamamlanan Sipariş</p>
                <strong>{{ productRelated.summary.completedOrderCount }}</strong>
              </article>
              <article class="summary-card">
                <p class="summary-label">Benzersiz Alıcı</p>
                <strong>{{ productRelated.summary.buyerCount }}</strong>
              </article>
              <article class="summary-card">
                <p class="summary-label">Toplam Ciro</p>
                <strong>{{ formatMoney(productRelated.summary.grossSales, 'TRY') }}</strong>
              </article>
              <article class="summary-card">
                <p class="summary-label">Favori</p>
                <strong>{{ productRelated.summary.favoriteCount }}</strong>
              </article>
              <article class="summary-card">
                <p class="summary-label">Sepet (Kalem/Adet)</p>
                <strong>{{ productRelated.summary.cartLineCount }} / {{ productRelated.summary.cartQuantityTotal }}</strong>
              </article>
              <article class="summary-card">
                <p class="summary-label">Müzayede (Aktif/Toplam)</p>
                <strong>{{ productRelated.summary.activeAuctionCount }} / {{ productRelated.summary.auctionCount }}</strong>
              </article>
              <article class="summary-card">
                <p class="summary-label">Teklif / Ödeme</p>
                <strong>{{ productRelated.summary.bidCount }} / {{ productRelated.summary.paymentCount }}</strong>
              </article>
            </div>

            <section class="record-block">
              <h3>Satın Alanlar</h3>
              <p v-if="productRelated.buyers.length === 0" class="muted">Alıcı kaydı yok.</p>
              <div v-else class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>Alıcı</th>
                      <th>Sipariş</th>
                      <th>Toplam Tutar</th>
                      <th>Son Sipariş</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="buyer in productRelated.buyers" :key="buyer.buyerId">
                      <td>
                        <button type="button" class="link-inline" @click="goToUserDetail(buyer.buyerId)">
                          {{ buyer.buyerName || buyer.buyerEmail || shortId(buyer.buyerId) }}
                        </button>
                      </td>
                      <td>{{ buyer.orderCount }}</td>
                      <td>{{ formatMoney(buyer.totalSpend, 'TRY') }}</td>
                      <td>{{ formatDate(buyer.lastOrderAt) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="record-block">
              <h3>Sipariş Geçmişi</h3>
              <p v-if="productRelated.orders.length === 0" class="muted">Sipariş kaydı yok.</p>
              <div v-else class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Alıcı</th>
                      <th>Tutar</th>
                      <th>Durum</th>
                      <th>Kaynak</th>
                      <th>Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="order in productRelated.orders" :key="order.id">
                      <td>
                        <button type="button" class="link-inline" @click="goToOrderDetail(order.id)">
                          {{ shortId(order.id) }}
                        </button>
                      </td>
                      <td>
                        <button type="button" class="link-inline" @click="goToUserDetail(order.buyerId)">
                          {{ order.buyerName || order.buyerEmail || shortId(order.buyerId) }}
                        </button>
                      </td>
                      <td>{{ formatMoney(order.amount, order.currency) }}</td>
                      <td><span class="status-pill">{{ order.status }}</span></td>
                      <td>{{ order.source }}</td>
                      <td>{{ formatDate(order.createdAt) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="record-block">
              <h3>Favori ve Sepet Hareketleri</h3>
              <p v-if="productRelated.favorites.length === 0 && productRelated.cart.length === 0" class="muted">
                Favori veya sepet hareketi yok.
              </p>
              <div v-if="productRelated.favorites.length > 0" class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>Favori ID</th>
                      <th>Kullanıcı</th>
                      <th>Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="favorite in productRelated.favorites" :key="favorite.id">
                      <td>{{ shortId(favorite.id) }}</td>
                      <td>
                        <button type="button" class="link-inline" @click="goToUserDetail(favorite.userId)">
                          {{ favorite.userName || favorite.userEmail || shortId(favorite.userId) }}
                        </button>
                      </td>
                      <td>{{ formatDate(favorite.createdAt) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-if="productRelated.cart.length > 0" class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>Sepet ID</th>
                      <th>Kullanıcı</th>
                      <th>Adet</th>
                      <th>Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in productRelated.cart" :key="item.id">
                      <td>{{ shortId(item.id) }}</td>
                      <td>
                        <button type="button" class="link-inline" @click="goToUserDetail(item.userId)">
                          {{ item.userName || item.userEmail || shortId(item.userId) }}
                        </button>
                      </td>
                      <td>{{ item.quantity }}</td>
                      <td>{{ formatDate(item.createdAt) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="record-block">
              <h3>Müzayedeler ve Teklifler</h3>
              <p v-if="productRelated.auctions.length === 0 && productRelated.bids.length === 0" class="muted">
                Müzayede/teklif kaydı yok.
              </p>
              <div v-if="productRelated.auctions.length > 0" class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>Müzayede</th>
                      <th>Durum</th>
                      <th>Güncel Fiyat</th>
                      <th>Teklif</th>
                      <th>Bitiş</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="auction in productRelated.auctions" :key="auction.id">
                      <td>
                        <button type="button" class="link-inline" @click="goToAuctionDetail(auction.id)">
                          {{ shortId(auction.id) }}
                        </button>
                      </td>
                      <td><span class="status-pill">{{ auction.status }}</span></td>
                      <td>{{ formatMoney(auction.currentPrice, 'TRY') }}</td>
                      <td>{{ auction.bidCount }}</td>
                      <td>{{ formatDate(auction.endTime) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-if="productRelated.bids.length > 0" class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>Teklif</th>
                      <th>Müzayede</th>
                      <th>Teklif Veren</th>
                      <th>Tutar</th>
                      <th>Prim</th>
                      <th>Durum</th>
                      <th>Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="bid in productRelated.bids" :key="bid.id">
                      <td>{{ shortId(bid.id) }}</td>
                      <td>
                        <button type="button" class="link-inline" @click="goToAuctionDetail(bid.auctionId)">
                          {{ shortId(bid.auctionId) }}
                        </button>
                      </td>
                      <td>
                        <button type="button" class="link-inline" @click="goToUserDetail(bid.bidderId)">
                          {{ bid.bidderName || bid.bidderEmail || shortId(bid.bidderId) }}
                        </button>
                      </td>
                      <td>{{ formatMoney(bid.amount, 'TRY') }}</td>
                      <td>{{ formatMoney(bid.premiumAmount, 'TRY') }}</td>
                      <td><span class="status-pill">{{ bid.status }}{{ bid.isWinningBid ? ' (Kazanan)' : '' }}</span></td>
                      <td>{{ formatDate(bid.createdAt) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="record-block">
              <h3>Ödeme Kayıtları</h3>
              <p v-if="productRelated.payments.length === 0" class="muted">Ödeme kaydı yok.</p>
              <div v-else class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>Ödeme</th>
                      <th>Sipariş</th>
                      <th>Alıcı</th>
                      <th>Sağlayıcı</th>
                      <th>Tutar</th>
                      <th>Durum</th>
                      <th>Ödendi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="payment in productRelated.payments" :key="payment.id">
                      <td>
                        <button type="button" class="link-inline" @click="goToPaymentDetail(payment.id)">
                          {{ shortId(payment.id) }}
                        </button>
                      </td>
                      <td>
                        <button
                          v-if="payment.orderId"
                          type="button"
                          class="link-inline"
                          @click="goToOrderDetail(String(payment.orderId))"
                        >
                          {{ shortId(String(payment.orderId)) }}
                        </button>
                        <span v-else>-</span>
                      </td>
                      <td>
                        <button type="button" class="link-inline" @click="goToUserDetail(payment.buyerId)">
                          {{ payment.buyerName || payment.buyerEmail || shortId(payment.buyerId) }}
                        </button>
                      </td>
                      <td>{{ payment.provider }}</td>
                      <td>{{ formatMoney(payment.amount, payment.currency) }}</td>
                      <td><span class="status-pill">{{ payment.status }}</span></td>
                      <td>{{ payment.paidAt ? formatDate(payment.paidAt) : '-' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </template>
          <template v-else-if="isSellerResource && sellerRelated">
            <section class="overview-grid">
              <article class="overview-hero-card">
                <header class="overview-hero-header">
                  <div>
                    <p class="overview-eyebrow">Satıcı Genel Durum</p>
                    <h3 class="overview-title">{{ getString(overview, 'businessName') || 'Satıcı' }}</h3>
                  </div>
                  <span class="status-pill">{{ getString(overview, 'status') || '-' }}</span>
                </header>
                <div class="overview-kpi-grid">
                  <article class="overview-kpi">
                    <p>Toplam Ciro</p>
                    <strong>{{ formatMoney(sellerRelated.summary.grossMerchandiseValue, 'TRY') }}</strong>
                  </article>
                  <article class="overview-kpi">
                    <p>Toplam Satış</p>
                    <strong>{{ sellerRelated.summary.saleCount }}</strong>
                  </article>
                  <article class="overview-kpi">
                    <p>Aktif Ürün</p>
                    <strong>{{ sellerRelated.summary.activeProductCount }}</strong>
                  </article>
                  <article class="overview-kpi">
                    <p>Aktif Müzayede</p>
                    <strong>{{ sellerRelated.summary.activeAuctionCount }}</strong>
                  </article>
                </div>
              </article>

              <article class="overview-card">
                <h4>Ürün Sağlığı</h4>
                <div class="metric-row">
                  <span>Aktif Ürün Oranı</span>
                  <strong>{{ sellerActiveProductRate }}%</strong>
                </div>
                <div class="metric-track">
                  <div class="metric-fill is-success" :style="{ width: `${sellerActiveProductRate}%` }"></div>
                </div>
                <div class="metric-row">
                  <span>Taslak Ürün Oranı</span>
                  <strong>{{ sellerDraftProductRate }}%</strong>
                </div>
                <div class="metric-track">
                  <div class="metric-fill is-warning" :style="{ width: `${sellerDraftProductRate}%` }"></div>
                </div>
              </article>

              <article class="overview-card">
                <h4>Ödeme & Risk</h4>
                <div class="metric-row">
                  <span>Bekleyen Ödeme Talebi</span>
                  <strong>{{ sellerRelated.summary.pendingPayoutCount }}</strong>
                </div>
                <div class="metric-row">
                  <span>İnceleme Bekleyen Ödeme</span>
                  <strong>{{ sellerRelated.summary.adminReviewPaymentCount }}</strong>
                </div>
                <div class="metric-row">
                  <span>Toplam Ödeme Talebi</span>
                  <strong>{{ sellerRelated.summary.payoutRequestCount }}</strong>
                </div>
              </article>

              <article class="overview-card">
                <h4>Hızlı Profil</h4>
                <div class="metric-row">
                  <span>Kullanıcı ID</span>
                  <strong>{{ getString(overview, 'userId') || '-' }}</strong>
                </div>
                <div class="metric-row">
                  <span>Telefon</span>
                  <strong>{{ getString(overview, 'phone') || '-' }}</strong>
                </div>
                <div class="metric-row">
                  <span>Komisyon</span>
                  <strong>%{{ Number(getString(overview, 'commissionRate') || 0) * 100 }}</strong>
                </div>
                <div class="metric-row">
                  <span>Onay Tarihi</span>
                  <strong>{{ getString(overview, 'approvedAt') ? formatDate(getString(overview, 'approvedAt')) : '-' }}</strong>
                </div>
              </article>
            </section>
          </template>
          <template v-else-if="isProductResource && productRelated">
            <section class="overview-grid">
              <article class="overview-hero-card">
                <header class="overview-hero-header">
                  <div>
                    <p class="overview-eyebrow">Ürün Genel Durum</p>
                    <h3 class="overview-title">{{ getString(overview, 'title') || shortId(id) }}</h3>
                  </div>
                  <span class="status-pill">{{ getString(overview, 'status') || '-' }}</span>
                </header>
                <div class="overview-kpi-grid">
                  <article class="overview-kpi">
                    <p>Toplam Ciro</p>
                    <strong>{{ formatMoney(productRelated.summary.grossSales, 'TRY') }}</strong>
                  </article>
                  <article class="overview-kpi">
                    <p>Toplam Sipariş</p>
                    <strong>{{ productRelated.summary.orderCount }}</strong>
                  </article>
                  <article class="overview-kpi">
                    <p>Tamamlanan Sipariş</p>
                    <strong>{{ productRelated.summary.completedOrderCount }}</strong>
                  </article>
                  <article class="overview-kpi">
                    <p>Benzersiz Alıcı</p>
                    <strong>{{ productRelated.summary.buyerCount }}</strong>
                  </article>
                </div>
              </article>

              <article class="overview-card">
                <h4>Ürün Bilgisi</h4>
                <div class="metric-row">
                  <span>Fiyat</span>
                  <strong>{{ formatMoney(Number(getString(overview, 'price') || 0), 'TRY') }}</strong>
                </div>
                <div class="metric-row">
                  <span>Stok</span>
                  <strong>{{ getString(overview, 'stockQuantity') || '0' }}</strong>
                </div>
                <div class="metric-row">
                  <span>Kategori</span>
                  <strong>{{ productCategoryName }}</strong>
                </div>
                <div class="metric-row">
                  <span>Oluşturulma</span>
                  <strong>{{ getString(overview, 'createdAt') ? formatDate(getString(overview, 'createdAt')) : '-' }}</strong>
                </div>
              </article>

              <article class="overview-card">
                <h4>Etkileşim</h4>
                <div class="metric-row">
                  <span>Favoriye Eklenme</span>
                  <strong>{{ productRelated.summary.favoriteCount }}</strong>
                </div>
                <div class="metric-row">
                  <span>Sepet Kalemi</span>
                  <strong>{{ productRelated.summary.cartLineCount }}</strong>
                </div>
                <div class="metric-row">
                  <span>Sepette Adet</span>
                  <strong>{{ productRelated.summary.cartQuantityTotal }}</strong>
                </div>
                <div class="metric-row">
                  <span>Teklif Sayısı</span>
                  <strong>{{ productRelated.summary.bidCount }}</strong>
                </div>
              </article>

              <article class="overview-card">
                <h4>Satıcı ve Müzayede</h4>
                <div class="metric-row">
                  <span>Satıcı</span>
                  <strong>{{ productSellerLabel }}</strong>
                </div>
                <div class="metric-row">
                  <span>Aktif/Toplam Müzayede</span>
                  <strong>{{ productRelated.summary.activeAuctionCount }} / {{ productRelated.summary.auctionCount }}</strong>
                </div>
                <div class="metric-row">
                  <span>Ödeme Kaydı</span>
                  <strong>{{ productRelated.summary.paymentCount }}</strong>
                </div>
                <div class="metric-row">
                  <span>Satıcı ID</span>
                  <strong>{{ getString(overview, 'sellerId') || '-' }}</strong>
                </div>
              </article>
            </section>
          </template>
          <pre v-else class="json-box">{{ pretty(overview) }}</pre>
        </div>
        <div v-else-if="activeTab === 'Zaman Çizelgesi'" class="timeline">
          <p v-if="timeline.length === 0" class="muted">Zaman çizelgesi kaydı yok.</p>
          <article v-for="event in timeline" :key="timelineKey(event)" class="timeline-item">
            <strong>{{ event.label }}</strong>
            <p class="muted">{{ formatDate(event.createdAt) }}</p>
          </article>
        </div>
        <div v-else-if="activeTab === 'İlgili Kayıtlar'" class="related-section">
          <template v-if="isUserResource && userRelated">
            <div class="summary-grid">
              <article class="summary-card">
                <p class="summary-label">Toplam Sipariş</p>
                <strong>{{ userRelated.summary.orderCount }}</strong>
              </article>
              <article class="summary-card">
                <p class="summary-label">Toplam Satış</p>
                <strong>{{ userRelated.summary.salesCount }}</strong>
              </article>
              <article class="summary-card">
                <p class="summary-label">Favoriler</p>
                <strong>{{ userRelated.summary.favoriteCount }}</strong>
              </article>
              <article class="summary-card">
                <p class="summary-label">Sepet Kalemi</p>
                <strong>{{ userRelated.summary.cartLineCount }}</strong>
              </article>
              <article class="summary-card">
                <p class="summary-label">Sepette Ürün Adedi</p>
                <strong>{{ userRelated.summary.cartQuantityTotal }}</strong>
              </article>
              <article class="summary-card">
                <p class="summary-label">Tanımlı Kupon</p>
                <strong>{{ userRelated.summary.definedCouponCount }}</strong>
              </article>
              <article class="summary-card">
                <p class="summary-label">Kupon Kullanımı</p>
                <strong>{{ userRelated.summary.couponUsageCount }}</strong>
              </article>
            </div>

            <section class="record-block">
              <h3>Geçmiş Siparişler</h3>
              <p v-if="userRelated.orders.length === 0" class="muted">Sipariş kaydı yok.</p>
              <div v-else class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Ürün</th>
                      <th>Satıcı</th>
                      <th>Tutar</th>
                      <th>Durum</th>
                      <th>Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="order in userRelated.orders" :key="order.id">
                      <td>
                        <button type="button" class="link-inline" @click="goToOrderDetail(order.id)">
                          {{ shortId(order.id) }}
                        </button>
                      </td>
                      <td>
                        <button type="button" class="link-inline" @click="goToProductDetail(order.productId)">
                          {{ order.productTitle || shortId(order.productId) }}
                        </button>
                      </td>
                      <td>{{ order.counterpartName || order.counterpartEmail || shortId(order.counterpartId) }}</td>
                      <td>{{ formatMoney(order.amount, order.currency) }}</td>
                      <td><span class="status-pill">{{ order.status }}</span></td>
                      <td>{{ formatDate(order.createdAt) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="record-footer" v-if="canLoadMore('orders')">
                <button
                  type="button"
                  class="button ghost load-more-button"
                  :disabled="isLoadingMore('orders')"
                  @click="loadMore('orders')"
                >
                  {{ isLoadingMore('orders') ? 'Yükleniyor...' : 'Daha fazla göster' }}
                </button>
              </div>
            </section>

            <section class="record-block">
              <h3>Geçmiş Satışlar</h3>
              <p v-if="userRelated.sales.length === 0" class="muted">Satış kaydı yok.</p>
              <div v-else class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Ürün</th>
                      <th>Alıcı</th>
                      <th>Tutar</th>
                      <th>Durum</th>
                      <th>Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="sale in userRelated.sales" :key="sale.id">
                      <td>
                        <button type="button" class="link-inline" @click="goToOrderDetail(sale.id)">
                          {{ shortId(sale.id) }}
                        </button>
                      </td>
                      <td>
                        <button type="button" class="link-inline" @click="goToProductDetail(sale.productId)">
                          {{ sale.productTitle || shortId(sale.productId) }}
                        </button>
                      </td>
                      <td>{{ sale.counterpartName || sale.counterpartEmail || shortId(sale.counterpartId) }}</td>
                      <td>{{ formatMoney(sale.amount, sale.currency) }}</td>
                      <td><span class="status-pill">{{ sale.status }}</span></td>
                      <td>{{ formatDate(sale.createdAt) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="record-footer" v-if="canLoadMore('sales')">
                <button
                  type="button"
                  class="button ghost load-more-button"
                  :disabled="isLoadingMore('sales')"
                  @click="loadMore('sales')"
                >
                  {{ isLoadingMore('sales') ? 'Yükleniyor...' : 'Daha fazla göster' }}
                </button>
              </div>
            </section>

            <section class="record-block">
              <h3>Favoriye Eklenen Ürünler</h3>
              <p v-if="userRelated.favorites.length === 0" class="muted">Favori kaydı yok.</p>
              <div v-else class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Ürün</th>
                      <th>Durum</th>
                      <th>Fiyat</th>
                      <th>Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="favorite in userRelated.favorites" :key="favorite.id">
                      <td>{{ shortId(favorite.id) }}</td>
                      <td>
                        <button type="button" class="link-inline" @click="goToProductDetail(favorite.productId)">
                          {{ favorite.productTitle || shortId(favorite.productId) }}
                        </button>
                      </td>
                      <td><span class="status-pill">{{ favorite.productStatus || '-' }}</span></td>
                      <td>{{ favorite.productPrice === null ? '-' : formatMoney(favorite.productPrice, 'TRY') }}</td>
                      <td>{{ formatDate(favorite.createdAt) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="record-footer" v-if="canLoadMore('favorites')">
                <button
                  type="button"
                  class="button ghost load-more-button"
                  :disabled="isLoadingMore('favorites')"
                  @click="loadMore('favorites')"
                >
                  {{ isLoadingMore('favorites') ? 'Yükleniyor...' : 'Daha fazla göster' }}
                </button>
              </div>
            </section>

            <section class="record-block">
              <h3>Sepet</h3>
              <p v-if="userRelated.cart.length === 0" class="muted">Sepet boş.</p>
              <div v-else class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Ürün</th>
                      <th>Adet</th>
                      <th>Durum</th>
                      <th>Fiyat</th>
                      <th>Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in userRelated.cart" :key="item.id">
                      <td>{{ shortId(item.id) }}</td>
                      <td>
                        <button type="button" class="link-inline" @click="goToProductDetail(item.productId)">
                          {{ item.productTitle || shortId(item.productId) }}
                        </button>
                      </td>
                      <td>{{ item.quantity }}</td>
                      <td><span class="status-pill">{{ item.productStatus || '-' }}</span></td>
                      <td>{{ item.productPrice === null ? '-' : formatMoney(item.productPrice, 'TRY') }}</td>
                      <td>{{ formatDate(item.createdAt) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="record-footer" v-if="canLoadMore('cart')">
                <button
                  type="button"
                  class="button ghost load-more-button"
                  :disabled="isLoadingMore('cart')"
                  @click="loadMore('cart')"
                >
                  {{ isLoadingMore('cart') ? 'Yükleniyor...' : 'Daha fazla göster' }}
                </button>
              </div>
            </section>

            <section class="record-block">
              <h3>Tanımlanan Kuponlar</h3>
              <p v-if="userRelated.coupons.defined.length === 0" class="muted">Tanımlı kupon yok.</p>
              <div v-else class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>Kod</th>
                      <th>Durum</th>
                      <th>Kullanım Durumu</th>
                      <th>İndirim</th>
                      <th>Kullanım</th>
                      <th>Limit</th>
                      <th>Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="coupon in userRelated.coupons.defined" :key="coupon.id">
                      <td>{{ coupon.code }}</td>
                      <td><span class="status-pill">{{ coupon.status }}</span></td>
                      <td>
                        <span class="status-pill" :class="couponUsageStateClass(coupon)">
                          {{ couponUsageStateLabel(coupon) }}
                        </span>
                      </td>
                      <td>{{ coupon.discountType }} / {{ coupon.discountValue }}</td>
                      <td>{{ coupon.totalUses }}</td>
                      <td>{{ coupon.maxUses === null ? 'Sınırsız' : coupon.maxUses }}</td>
                      <td>{{ formatDate(coupon.startsAt) }} - {{ formatDate(coupon.endsAt) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="record-footer" v-if="canLoadMore('couponDefinitions')">
                <button
                  type="button"
                  class="button ghost load-more-button"
                  :disabled="isLoadingMore('couponDefinitions')"
                  @click="loadMore('couponDefinitions')"
                >
                  {{ isLoadingMore('couponDefinitions') ? 'Yükleniyor...' : 'Daha fazla göster' }}
                </button>
              </div>
            </section>

            <section class="record-block">
              <h3>Kupon Kullanım Geçmişi</h3>
              <p v-if="userRelated.coupons.usage.length === 0" class="muted">Kupon kullanım kaydı yok.</p>
              <div v-else class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Kupon</th>
                      <th>Durum</th>
                      <th>Sipariş</th>
                      <th>İndirim</th>
                      <th>Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="usage in userRelated.coupons.usage" :key="usage.id">
                      <td>{{ shortId(usage.id) }}</td>
                      <td>{{ usage.couponCode || shortId(usage.couponId) }}</td>
                      <td><span class="status-pill">{{ usage.couponStatus || '-' }}</span></td>
                      <td>
                        <button type="button" class="link-inline" @click="goToOrderDetail(usage.orderId)">
                          {{ shortId(usage.orderId) }}
                        </button>
                      </td>
                      <td>{{ formatMoney(usage.discountAmount, usage.currency) }}</td>
                      <td>{{ formatDate(usage.createdAt) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="record-footer" v-if="canLoadMore('couponUsage')">
                <button
                  type="button"
                  class="button ghost load-more-button"
                  :disabled="isLoadingMore('couponUsage')"
                  @click="loadMore('couponUsage')"
                >
                  {{ isLoadingMore('couponUsage') ? 'Yükleniyor...' : 'Daha fazla göster' }}
                </button>
              </div>
            </section>
          </template>
          <template v-else-if="isSellerResource && sellerRelated">
            <div class="summary-grid">
              <article class="summary-card">
                <p class="summary-label">Toplam Ürün</p>
                <strong>{{ sellerRelated.summary.productCount }}</strong>
              </article>
              <article class="summary-card">
                <p class="summary-label">Aktif Ürün</p>
                <strong>{{ sellerRelated.summary.activeProductCount }}</strong>
              </article>
              <article class="summary-card">
                <p class="summary-label">Taslak Ürün</p>
                <strong>{{ sellerRelated.summary.draftProductCount }}</strong>
              </article>
              <article class="summary-card">
                <p class="summary-label">Toplam Satış</p>
                <strong>{{ sellerRelated.summary.saleCount }}</strong>
              </article>
              <article class="summary-card">
                <p class="summary-label">Toplam Ciro</p>
                <strong>{{ formatMoney(sellerRelated.summary.grossMerchandiseValue, 'TRY') }}</strong>
              </article>
              <article class="summary-card">
                <p class="summary-label">Müzayede (Aktif/Toplam)</p>
                <strong>{{ sellerRelated.summary.activeAuctionCount }} / {{ sellerRelated.summary.auctionCount }}</strong>
              </article>
              <article class="summary-card">
                <p class="summary-label">Kupon Sayısı</p>
                <strong>{{ sellerRelated.summary.couponCount }}</strong>
              </article>
              <article class="summary-card">
                <p class="summary-label">Ödeme Talepleri</p>
                <strong>{{ sellerRelated.summary.payoutRequestCount }}</strong>
              </article>
              <article class="summary-card">
                <p class="summary-label">Bekleyen Ödeme Talebi</p>
                <strong>{{ sellerRelated.summary.pendingPayoutCount }}</strong>
              </article>
              <article class="summary-card">
                <p class="summary-label">İnceleme Bekleyen Ödeme</p>
                <strong>{{ sellerRelated.summary.adminReviewPaymentCount }}</strong>
              </article>
            </div>

            <section class="record-block">
              <h3>Son Ürünler</h3>
              <p v-if="sellerRelated.products.length === 0" class="muted">Ürün kaydı yok.</p>
              <div v-else class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Başlık</th>
                      <th>Durum</th>
                      <th>Fiyat</th>
                      <th>Stok</th>
                      <th>Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="product in sellerRelated.products" :key="product.id">
                      <td>
                        <button type="button" class="link-inline" @click="goToProductDetail(product.id)">
                          {{ shortId(product.id) }}
                        </button>
                      </td>
                      <td>
                        <button type="button" class="link-inline" @click="goToProductDetail(product.id)">
                          {{ product.title || shortId(product.id) }}
                        </button>
                      </td>
                      <td><span class="status-pill">{{ product.status }}</span></td>
                      <td>{{ formatMoney(product.price, 'TRY') }}</td>
                      <td>{{ product.stockQuantity }}</td>
                      <td>{{ formatDate(product.createdAt) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="record-block">
              <h3>Son Satışlar</h3>
              <p v-if="sellerRelated.sales.length === 0" class="muted">Satış kaydı yok.</p>
              <div v-else class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Ürün</th>
                      <th>Alıcı</th>
                      <th>Tutar</th>
                      <th>Durum</th>
                      <th>Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="sale in sellerRelated.sales" :key="sale.id">
                      <td>
                        <button type="button" class="link-inline" @click="goToOrderDetail(sale.id)">
                          {{ shortId(sale.id) }}
                        </button>
                      </td>
                      <td>
                        <button type="button" class="link-inline" @click="goToProductDetail(sale.productId)">
                          {{ sale.productTitle || shortId(sale.productId) }}
                        </button>
                      </td>
                      <td>{{ sale.counterpartName || sale.counterpartEmail || shortId(sale.counterpartId) }}</td>
                      <td>{{ formatMoney(sale.amount, sale.currency) }}</td>
                      <td><span class="status-pill">{{ sale.status }}</span></td>
                      <td>{{ formatDate(sale.createdAt) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="record-block">
              <h3>Son Müzayedeler</h3>
              <p v-if="sellerRelated.auctions.length === 0" class="muted">Müzayede kaydı yok.</p>
              <div v-else class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Ürün</th>
                      <th>Durum</th>
                      <th>Güncel Fiyat</th>
                      <th>Teklif</th>
                      <th>Bitiş</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="auction in sellerRelated.auctions" :key="auction.id">
                      <td>
                        <button type="button" class="link-inline" @click="goToAuctionDetail(auction.id)">
                          {{ shortId(auction.id) }}
                        </button>
                      </td>
                      <td>
                        <button type="button" class="link-inline" @click="goToProductDetail(auction.productId)">
                          {{ shortId(auction.productId) }}
                        </button>
                      </td>
                      <td><span class="status-pill">{{ auction.status }}</span></td>
                      <td>{{ formatMoney(auction.currentPrice, 'TRY') }}</td>
                      <td>{{ auction.bidCount }}</td>
                      <td>{{ formatDate(auction.endTime) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="record-block">
              <h3>Son Kuponlar</h3>
              <p v-if="sellerRelated.coupons.length === 0" class="muted">Kupon kaydı yok.</p>
              <div v-else class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>Kod</th>
                      <th>Durum</th>
                      <th>İndirim</th>
                      <th>Limit</th>
                      <th>Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="coupon in sellerRelated.coupons" :key="coupon.id">
                      <td>{{ coupon.code }}</td>
                      <td><span class="status-pill">{{ coupon.status }}</span></td>
                      <td>{{ coupon.discountType }} / {{ coupon.discountValue }}</td>
                      <td>{{ coupon.maxUses === null ? 'Sınırsız' : coupon.maxUses }}</td>
                      <td>{{ formatDate(coupon.startsAt) }} - {{ formatDate(coupon.endsAt) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="record-block">
              <h3>Satış Ödemeleri</h3>
              <p v-if="sellerRelated.payments.length === 0" class="muted">Ödeme kaydı yok.</p>
              <div v-else class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Sipariş</th>
                      <th>Durum</th>
                      <th>Tutar</th>
                      <th>Ödendi</th>
                      <th>Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="payment in sellerRelated.payments" :key="payment.id">
                      <td>
                        <button type="button" class="link-inline" @click="goToPaymentDetail(payment.id)">
                          {{ shortId(payment.id) }}
                        </button>
                      </td>
                      <td>
                        <button
                          v-if="payment.orderId"
                          type="button"
                          class="link-inline"
                          @click="goToOrderDetail(payment.orderId)"
                        >
                          {{ shortId(payment.orderId) }}
                        </button>
                        <span v-else>-</span>
                      </td>
                      <td><span class="status-pill">{{ payment.status }}</span></td>
                      <td>{{ formatMoney(payment.amount, payment.currency) }}</td>
                      <td>{{ payment.paidAt ? formatDate(payment.paidAt) : '-' }}</td>
                      <td>{{ formatDate(payment.createdAt) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="record-block">
              <h3>Ödeme Talepleri</h3>
              <p v-if="sellerRelated.payouts.length === 0" class="muted">Ödeme talebi kaydı yok.</p>
              <div v-else class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Durum</th>
                      <th>Tutar</th>
                      <th>İnceleme</th>
                      <th>Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="payout in sellerRelated.payouts" :key="payout.id">
                      <td>
                        <button type="button" class="link-inline" @click="goToPayoutDetail(payout.id)">
                          {{ shortId(payout.id) }}
                        </button>
                      </td>
                      <td><span class="status-pill">{{ payout.status }}</span></td>
                      <td>{{ formatMoney(payout.amount, payout.currency) }}</td>
                      <td>{{ payout.reviewedAt ? formatDate(payout.reviewedAt) : '-' }}</td>
                      <td>{{ formatDate(payout.createdAt) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </template>
          <pre v-else class="json-box">{{ pretty(relatedRecords) }}</pre>
        </div>
        <AdminAuditTimeline v-else :events="auditEvents" />
      </div>
    </section>

    <p v-if="error" class="error-text">{{ error }}</p>

    <AdminDrawerForm
      :open="drawerOpen"
      :title="drawerTitle"
      :fields="drawerFields"
      :reason-required="true"
      :confirm-label="drawerConfirmLabel"
      :presentation="drawerPresentation"
      :page-size="drawerPageSize"
      @close="closeDrawer"
      @confirm="confirmAction"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import AdminDrawerForm, {
  type DrawerConfirmPayload,
  type DrawerField,
} from '../../components/AdminDrawerForm.vue';
import AdminAuditTimeline, { type AuditEvent } from '../../components/AdminAuditTimeline.vue';
import type { AdminTableAction } from '../../components/AdminDataTable.vue';
import { adminApi, toApiMessage, type ApiEnvelope } from '../../services/api';

type DetailTab = 'Genel Bakış' | 'Zaman Çizelgesi' | 'İlgili Kayıtlar' | 'Denetim';
type ActionMethod = 'delete' | 'patch' | 'post';

interface DetailResponse extends ApiEnvelope {
  resource: string;
  overview: Record<string, unknown>;
  timeline: TimelineEvent[];
  relatedRecords: Record<string, unknown>;
  audit: {
    targetType: string;
    targetId: string;
  };
}

interface AuditListResponse extends ApiEnvelope {
  items: AuditEvent[];
}

interface TimelineEvent {
  id?: string;
  label: string;
  createdAt: string;
}

interface UserOrderItem {
  id: string;
  productId: string;
  productTitle: string;
  counterpartId: string;
  counterpartName: string;
  counterpartEmail: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface UserFavoriteItem {
  id: string;
  productId: string;
  productTitle: string;
  productStatus: string | null;
  productPrice: number | null;
  createdAt: string;
}

interface UserCartItem {
  id: string;
  productId: string;
  productTitle: string;
  productStatus: string | null;
  productPrice: number | null;
  quantity: number;
  createdAt: string;
}

interface UserDefinedCouponItem {
  id: string;
  code: string;
  status: string;
  discountType: string;
  discountValue: number;
  startsAt: string;
  endsAt: string;
  maxUses: number | null;
  perUserLimit: number;
  totalUses: number;
  isExhausted: boolean;
}

interface UserCouponUsageItem {
  id: string;
  couponId: string;
  couponCode: string;
  couponStatus: string;
  orderId: string;
  discountAmount: number;
  currency: string;
  createdAt: string;
}

interface UserRelatedPaginationItem {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

type UserRelatedSectionKey =
  | 'orders'
  | 'sales'
  | 'favorites'
  | 'cart'
  | 'couponDefinitions'
  | 'couponUsage';

type UserRelatedApiSection =
  | 'orders'
  | 'sales'
  | 'favorites'
  | 'cart'
  | 'coupon-definitions'
  | 'coupon-usage';

interface UserRelatedRecords {
  summary: {
    orderCount: number;
    salesCount: number;
    favoriteCount: number;
    cartLineCount: number;
    cartQuantityTotal: number;
    definedCouponCount: number;
    couponUsageCount: number;
  };
  orders: UserOrderItem[];
  sales: UserOrderItem[];
  favorites: UserFavoriteItem[];
  cart: UserCartItem[];
  coupons: {
    defined: UserDefinedCouponItem[];
    usage: UserCouponUsageItem[];
  };
  pagination: {
    orders: UserRelatedPaginationItem;
    sales: UserRelatedPaginationItem;
    favorites: UserRelatedPaginationItem;
    cart: UserRelatedPaginationItem;
    couponDefinitions: UserRelatedPaginationItem;
    couponUsage: UserRelatedPaginationItem;
  };
}

interface UserRelatedSectionResponse extends ApiEnvelope {
  section: UserRelatedApiSection;
  items: unknown[];
  pagination: UserRelatedPaginationItem;
}

interface SellerProductItem {
  id: string;
  title: string;
  status: string;
  price: number;
  stockQuantity: number;
  createdAt: string;
}

interface SellerAuctionItem {
  id: string;
  productId: string;
  status: string;
  currentPrice: number;
  bidCount: number;
  startTime: string;
  endTime: string;
  createdAt: string;
}

interface SellerPayoutItem {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
}

interface SellerCouponItem {
  id: string;
  code: string;
  status: string;
  discountType: string;
  discountValue: number;
  startsAt: string;
  endsAt: string;
  maxUses: number | null;
}

interface SellerPaymentItem {
  id: string;
  orderId: string;
  status: string;
  amount: number;
  currency: string;
  paidAt: string | null;
  createdAt: string;
}

interface SellerRelatedRecords {
  summary: {
    productCount: number;
    activeProductCount: number;
    draftProductCount: number;
    saleCount: number;
    grossMerchandiseValue: number;
    auctionCount: number;
    activeAuctionCount: number;
    couponCount: number;
    payoutRequestCount: number;
    pendingPayoutCount: number;
    adminReviewPaymentCount: number;
  };
  products: SellerProductItem[];
  sales: UserOrderItem[];
  auctions: SellerAuctionItem[];
  payouts: SellerPayoutItem[];
  coupons: SellerCouponItem[];
  payments: SellerPaymentItem[];
}

interface ProductOrderItem {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  amount: number;
  currency: string;
  status: string;
  source: string;
  createdAt: string;
  completedAt: string | null;
}

interface ProductBuyerItem {
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  orderCount: number;
  totalSpend: number;
  lastOrderAt: string;
}

interface ProductFavoriteItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  createdAt: string;
}

interface ProductCartItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  quantity: number;
  createdAt: string;
}

interface ProductBidItem {
  id: string;
  auctionId: string;
  bidderId: string;
  bidderName: string;
  bidderEmail: string;
  amount: number;
  premiumAmount: number;
  status: string;
  isWinningBid: boolean;
  createdAt: string;
}

interface ProductPaymentItem {
  id: string;
  orderId: string | null;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  status: string;
  provider: string;
  amount: number;
  currency: string;
  paidAt: string | null;
  createdAt: string;
}

interface ProductRelatedRecords {
  summary: {
    orderCount: number;
    completedOrderCount: number;
    buyerCount: number;
    favoriteCount: number;
    cartLineCount: number;
    cartQuantityTotal: number;
    auctionCount: number;
    activeAuctionCount: number;
    bidCount: number;
    paymentCount: number;
    grossSales: number;
  };
  orders: ProductOrderItem[];
  buyers: ProductBuyerItem[];
  favorites: ProductFavoriteItem[];
  cart: ProductCartItem[];
  auctions: SellerAuctionItem[];
  bids: ProductBidItem[];
  payments: ProductPaymentItem[];
}

interface ActionConfig extends AdminTableAction {
  method: ActionMethod;
  path: (id: string) => string;
  fields?: (row: Record<string, unknown>) => DrawerField[];
  confirmLabel?: string;
  presentation?: 'drawer' | 'modal';
  pageSize?: number;
}

const props = withDefaults(
  defineProps<{
    resource: string;
    id: string;
    title: string;
    readOnly?: boolean;
  }>(),
  {
    readOnly: false,
  },
);

const router = useRouter();
const tabs: DetailTab[] = ['Genel Bakış', 'Zaman Çizelgesi', 'İlgili Kayıtlar', 'Denetim'];
const activeTab = ref<DetailTab>('Genel Bakış');
const loading = ref(false);
const error = ref<string | null>(null);
const overview = ref<Record<string, unknown>>({});
const timeline = ref<TimelineEvent[]>([]);
const relatedRecords = ref<Record<string, unknown>>({});
const userRelated = ref<UserRelatedRecords | null>(null);
const sellerRelated = ref<SellerRelatedRecords | null>(null);
const productRelated = ref<ProductRelatedRecords | null>(null);
const auditTarget = ref<{ targetType: string; targetId: string } | null>(null);
const auditEvents = ref<AuditEvent[]>([]);
const drawerOpen = ref(false);
const selectedAction = ref<ActionConfig | null>(null);
const relatedLoadings = ref<Record<UserRelatedSectionKey, boolean>>({
  orders: false,
  sales: false,
  favorites: false,
  cart: false,
  couponDefinitions: false,
  couponUsage: false,
});
const USER_RELATED_PAGE_SIZE = 25;
const sectionApiKeyMap: Record<UserRelatedSectionKey, UserRelatedApiSection> = {
  orders: 'orders',
  sales: 'sales',
  favorites: 'favorites',
  cart: 'cart',
  couponDefinitions: 'coupon-definitions',
  couponUsage: 'coupon-usage',
};

const categoryFields = (row: Record<string, unknown>): DrawerField[] => [
  { key: 'name', label: 'Ad', required: true, value: getString(row, 'name') },
  { key: 'slug', label: 'Kısa ad', value: getString(row, 'slug') },
  { key: 'description', label: 'Açıklama', type: 'textarea', value: getString(row, 'description') },
  { key: 'imageUrl', label: 'Görsel URL', value: getString(row, 'imageUrl') },
  { key: 'parentId', label: 'Üst ID', value: getString(row, 'parentId') },
  { key: 'sortOrder', label: 'Sıralama', type: 'number', value: getString(row, 'sortOrder') },
];

const productionSeasonOptions = [
  { label: 'Her zaman', value: 'ALL_TIME' },
  { label: 'İlkbahar', value: 'SPRING' },
  { label: 'Yaz', value: 'SUMMER' },
  { label: 'Sonbahar', value: 'AUTUMN' },
  { label: 'Kış', value: 'WINTER' },
];

const statusOptions = [
  { label: 'Taslak', value: 'DRAFT' },
  { label: 'İnceleme', value: 'PENDING_REVIEW' },
  { label: 'Aktif', value: 'ACTIVE' },
  { label: 'Müzayedede', value: 'UNDER_AUCTION' },
  { label: 'Satıldı', value: 'SOLD' },
  { label: 'Stok Yok', value: 'OUT_OF_STOCK' },
  { label: 'Arşiv', value: 'ARCHIVED' },
  { label: 'Askıda', value: 'SUSPENDED' },
];

const yesNoOptions = [
  { label: 'Evet', value: 'true' },
  { label: 'Hayır', value: 'false' },
];

const productFields = (row: Record<string, unknown>): DrawerField[] => {
  const extra = parseProductExtendedContent(getString(row, 'additionalCertificates'));
  return [
    { key: 'sellerId', label: 'Satıcı ID', required: true, value: getString(row, 'sellerId') },
    { key: 'title', label: 'Ürün Adı', required: true, value: getString(row, 'title') },
    { key: 'description', label: 'Açıklama', type: 'textarea', value: getString(row, 'description') },
    { key: 'price', label: 'Fiyat', type: 'number', required: true, value: getString(row, 'price') },
    { key: 'stockQuantity', label: 'Stok', type: 'number', value: getString(row, 'stockQuantity') },
    { key: 'sku', label: 'Ürün Kodu / SKU', value: getString(row, 'sku') },
    { key: 'barcodeNo', label: 'GTIN / Barkod', value: getString(row, 'barcodeNo') },
    { key: 'brand', label: 'Marka', value: getString(row, 'brand') },
    { key: 'categoryId', label: 'Kategori ID', value: getString(row, 'categoryId') },
    { key: 'status', label: 'Ürün Durumu', type: 'select', value: getString(row, 'status'), options: statusOptions },
    {
      key: 'isEndemigoBrandCandidate',
      label: 'Endemigo markasıyla satılsın mı?',
      type: 'select',
      value: toBooleanString(row?.isEndemigoBrandCandidate),
      options: yesNoOptions,
    },
    { key: 'productContent', label: 'Ürün İçeriği', type: 'textarea', value: getString(row, 'productContent') },
    { key: 'sellerNotes', label: 'Satıcı Notları', type: 'textarea', value: getString(row, 'sellerNotes') },
    { key: 'geoIndicationCertNo', label: 'Coğrafi İşaret Sertifika No', value: getString(row, 'geoIndicationCertNo') },
    { key: 'geoIndicationRegion', label: 'Coğrafi İşaret Bölgesi', value: getString(row, 'geoIndicationRegion') },
    { key: 'geoIndicationReceivedAt', label: 'Coğrafi İşaret Tarihi', type: 'date', value: getString(row, 'geoIndicationReceivedAt') },
    { key: 'originCountry', label: 'Menşei Ülke', value: getString(row, 'originCountry') || 'TR' },
    { key: 'originRegion', label: 'Menşei Bölge', value: getString(row, 'originRegion') },
    { key: 'productionProvince', label: 'Üretim İl', value: getString(row, 'productionProvince') },
    { key: 'productionDistrict', label: 'Üretim İlçe', value: getString(row, 'productionDistrict') },
    { key: 'productionSeason', label: 'Üretim Dönemi', type: 'select', value: getString(row, 'productionSeason') || 'ALL_TIME', options: productionSeasonOptions },
    { key: 'salesMonths', label: 'Satış Ayları (1,2,3...)', value: normalizeSalesMonths(row?.salesMonths) },
    { key: 'wholesalePrice', label: 'Toptan Fiyat', type: 'number', value: getString(row, 'wholesalePrice') },
    { key: 'retailPrice', label: 'Perakende Fiyat', type: 'number', value: getString(row, 'retailPrice') },
    { key: 'askPriceMinAmount', label: 'Pazarlık Min Tutar', type: 'number', value: getString(row, 'askPriceMinAmount') },
    { key: 'askPriceEnabled', label: 'Pazarlık aktif mi?', type: 'select', value: toBooleanString(row?.askPriceEnabled), options: yesNoOptions },
    { key: 'shippingProvince', label: 'Teslimat İl', value: getString(row, 'shippingProvince') },
    { key: 'shippingDistrict', label: 'Teslimat İlçe', value: getString(row, 'shippingDistrict') },
    { key: 'shippingAddress', label: 'Teslimat Adresi', type: 'textarea', value: getString(row, 'shippingAddress') },
    { key: 'productImageUrls', label: 'Ürün Görselleri (satır satır URL)', type: 'textarea', value: listToMultiline(row?.images, 'url') || getString(row, 'imageUrl') },
    { key: 'certificateNotes', label: 'Sertifika Notları', type: 'textarea', value: extra.notes },
    { key: 'certificateImageUrls', label: 'Sertifika Görselleri (satır satır URL)', type: 'textarea', value: extra.certificateImageUrls.join('\n') },
    { key: 'deliveryLocations', label: 'Teslimat Yerleri (satır satır)', type: 'textarea', value: extra.deliveryLocations.join('\n') },
  ];
};

const actionConfigs: Record<string, ActionConfig[]> = {
  users: [
    {
      key: 'restrict',
      label: 'Kısıtla',
      icon: 'pi pi-ban',
      tone: 'danger',
      method: 'patch',
      path: (id) => `/admin/users/${id}/restrict`,
    },
    {
      key: 'reactivate',
      label: 'Yeniden etkinleştir',
      icon: 'pi pi-check-circle',
      tone: 'primary',
      method: 'patch',
      path: (id) => `/admin/users/${id}/reactivate`,
    },
  ],
  sellers: [
    {
      key: 'approve',
      label: 'Onayla',
      icon: 'pi pi-check',
      tone: 'primary',
      method: 'patch',
      path: (id) => `/admin/sellers/${id}/approve`,
      when: (row) => String(row.status ?? '').toUpperCase() === 'PENDING',
    },
    {
      key: 'reject',
      label: 'Reddet',
      icon: 'pi pi-times',
      tone: 'danger',
      method: 'patch',
      path: (id) => `/admin/sellers/${id}/reject`,
      when: (row) => String(row.status ?? '').toUpperCase() === 'PENDING',
    },
  ],
  products: [
    {
      key: 'remove',
      label: 'Kaldır',
      icon: 'pi pi-trash',
      tone: 'danger',
      method: 'patch',
      path: (id) => `/admin/products/${id}/remove`,
    },
  ],
  categories: [
    {
      key: 'updateCategory',
      label: 'Güncelle',
      icon: 'pi pi-pencil',
      method: 'patch',
      path: (id) => `/admin/categories/${id}`,
      fields: categoryFields,
      confirmLabel: 'Kategori güncelle',
    },
    {
      key: 'deleteCategory',
      label: 'Devre dışı bırak',
      icon: 'pi pi-trash',
      tone: 'danger',
      method: 'delete',
      path: (id) => `/admin/categories/${id}`,
      confirmLabel: 'Kategori devre dışı bırak',
    },
  ],
  auctions: [
    {
      key: 'cancel',
      label: 'İptal et',
      icon: 'pi pi-stop-circle',
      tone: 'danger',
      method: 'patch',
      path: (id) => `/admin/auctions/${id}/cancel`,
    },
  ],
  orders: [
    {
      key: 'adminReview',
      label: 'İncele',
      icon: 'pi pi-eye',
      method: 'patch',
      path: (id) => `/admin/orders/${id}/admin-review`,
    },
  ],
  payments: [
    {
      key: 'adminReview',
      label: 'İncele',
      icon: 'pi pi-eye',
      method: 'patch',
      path: (id) => `/admin/payments/${id}/admin-review`,
    },
  ],
  bids: [],
  'payout-requests': [
    {
      key: 'approve',
      label: 'Onayla',
      icon: 'pi pi-check',
      tone: 'primary',
      method: 'patch',
      path: (id) => `/admin/payout-requests/${id}/approve`,
    },
    {
      key: 'reject',
      label: 'Reddet',
      icon: 'pi pi-times',
      tone: 'danger',
      method: 'patch',
      path: (id) => `/admin/payout-requests/${id}/reject`,
    },
  ],
};

const rowActions = computed(() => {
  if (props.readOnly) return [];
  const actions = actionConfigs[props.resource] ?? [];
  return actions.filter((action) => {
    if (!action.when) return true;
    return action.when(overview.value);
  });
});
const drawerTitle = computed(() => selectedAction.value?.label ?? 'Yönetici işlemi');
const drawerFields = computed(() => selectedAction.value?.fields?.(overview.value) ?? []);
const drawerConfirmLabel = computed(() => selectedAction.value?.confirmLabel ?? 'Onayla');
const drawerPresentation = computed(() => selectedAction.value?.presentation ?? 'drawer');
const drawerPageSize = computed(() => selectedAction.value?.pageSize ?? 0);
const endpoint = computed(() => `/admin/${props.resource}/${props.id}`);
const isUserResource = computed(() => props.resource === 'users');
const isSellerResource = computed(() => props.resource === 'sellers');
const isProductResource = computed(() => props.resource === 'products');
const userDisplayName = computed(() => {
  const firstName = getString(overview.value, 'firstName');
  const lastName = getString(overview.value, 'lastName');
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || getString(overview.value, 'email') || 'Üye';
});
const productCategoryName = computed(() => {
  const category = overview.value.category;
  if (!category || typeof category !== 'object') return '-';
  return String((category as Record<string, unknown>).name ?? '-');
});
const productSellerLabel = computed(() => {
  const seller = overview.value.seller;
  if (!seller || typeof seller !== 'object') return '-';
  const sellerRecord = seller as Record<string, unknown>;
  const firstName = String(sellerRecord.firstName ?? '');
  const lastName = String(sellerRecord.lastName ?? '');
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || String(sellerRecord.email ?? '-');
});
const userSalesRate = computed(() => {
  const sales = userRelated.value?.summary.salesCount ?? 0;
  const orders = userRelated.value?.summary.orderCount ?? 0;
  const total = sales + orders;
  if (total <= 0) return 0;
  return Math.min(100, Math.round((sales / total) * 100));
});
const userOrderRate = computed(() => {
  const sales = userRelated.value?.summary.salesCount ?? 0;
  const orders = userRelated.value?.summary.orderCount ?? 0;
  const total = sales + orders;
  if (total <= 0) return 0;
  return Math.min(100, Math.round((orders / total) * 100));
});
const sellerActiveProductRate = computed(() => {
  const total = sellerRelated.value?.summary.productCount ?? 0;
  const active = sellerRelated.value?.summary.activeProductCount ?? 0;
  if (total <= 0) return 0;
  return Math.min(100, Math.round((active / total) * 100));
});
const sellerDraftProductRate = computed(() => {
  const total = sellerRelated.value?.summary.productCount ?? 0;
  const draft = sellerRelated.value?.summary.draftProductCount ?? 0;
  if (total <= 0) return 0;
  return Math.min(100, Math.round((draft / total) * 100));
});

function getString(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  return value === null || value === undefined ? '' : String(value);
}

function toBooleanString(value: unknown): string {
  if (value === true || value === 'true') return 'true';
  if (value === false || value === 'false') return 'false';
  return 'false';
}

function listToMultiline(value: unknown, key: string): string {
  if (!Array.isArray(value)) return '';
  return value
    .map((item) => {
      if (item && typeof item === 'object' && key in (item as Record<string, unknown>)) {
        return String((item as Record<string, unknown>)[key] ?? '');
      }
      return '';
    })
    .filter((item) => item.length > 0)
    .join('\n');
}

function normalizeSalesMonths(value: unknown): string {
  if (!Array.isArray(value)) return '';
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item))
    .join(',');
}

function parseProductExtendedContent(value: string): {
  notes: string;
  certificateImageUrls: string[];
  deliveryLocations: string[];
} {
  if (!value) {
    return { notes: '', certificateImageUrls: [], deliveryLocations: [] };
  }
  try {
    const parsed = JSON.parse(value) as {
      notes?: unknown;
      certificateImageUrls?: unknown;
      deliveryLocations?: unknown;
    };
    return {
      notes: typeof parsed.notes === 'string' ? parsed.notes : '',
      certificateImageUrls: Array.isArray(parsed.certificateImageUrls)
        ? parsed.certificateImageUrls.map(String)
        : [],
      deliveryLocations: Array.isArray(parsed.deliveryLocations)
        ? parsed.deliveryLocations.map(String)
        : [],
    };
  } catch {
    return { notes: value, certificateImageUrls: [], deliveryLocations: [] };
  }
}

function openAction(action: AdminTableAction) {
  selectedAction.value = action as ActionConfig;
  drawerOpen.value = true;
}

async function goToProductEdit() {
  if (props.resource !== 'products') return;
  await router.push(`/products/${props.id}/edit`);
}

function closeDrawer() {
  drawerOpen.value = false;
  selectedAction.value = null;
}

async function confirmAction(payload: DrawerConfirmPayload) {
  if (!selectedAction.value) return;

  const body: Record<string, unknown> = { reason: payload.reason, metadata: payload.values };

  try {
    if (selectedAction.value.method === 'delete') {
      await adminApi.delete(selectedAction.value.path(props.id), { data: body });
    } else if (selectedAction.value.method === 'post') {
      await adminApi.post(selectedAction.value.path(props.id), body);
    } else {
      await adminApi.patch(selectedAction.value.path(props.id), body);
    }
    closeDrawer();
    await loadDetail();
  } catch (actionError) {
    error.value = toApiMessage(actionError);
  }
}

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function timelineKey(event: TimelineEvent): string {
  return event.id ?? `${event.label}-${event.createdAt}`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('tr-TR');
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency || 'TRY',
    maximumFractionDigits: 2,
  }).format(Number(amount ?? 0));
}

function shortId(value: string): string {
  if (!value) return '-';
  return value.slice(0, 8);
}

function toDefaultPagination(): UserRelatedPaginationItem {
  return {
    page: 1,
    limit: USER_RELATED_PAGE_SIZE,
    total: 0,
    hasMore: false,
  };
}

function normalizeUserRelated(candidate: Partial<UserRelatedRecords>): UserRelatedRecords | null {
  if (!candidate.summary || !Array.isArray(candidate.orders) || !Array.isArray(candidate.sales)) {
    return null;
  }
  return {
    summary: candidate.summary,
    orders: candidate.orders ?? [],
    sales: candidate.sales ?? [],
    favorites: candidate.favorites ?? [],
    cart: candidate.cart ?? [],
    coupons: {
      defined: candidate.coupons?.defined ?? [],
      usage: candidate.coupons?.usage ?? [],
    },
    pagination: {
      orders: candidate.pagination?.orders ?? toDefaultPagination(),
      sales: candidate.pagination?.sales ?? toDefaultPagination(),
      favorites: candidate.pagination?.favorites ?? toDefaultPagination(),
      cart: candidate.pagination?.cart ?? toDefaultPagination(),
      couponDefinitions: candidate.pagination?.couponDefinitions ?? toDefaultPagination(),
      couponUsage: candidate.pagination?.couponUsage ?? toDefaultPagination(),
    },
  };
}

function normalizeSellerRelated(candidate: Partial<SellerRelatedRecords>): SellerRelatedRecords | null {
  if (
    !candidate.summary ||
    !Array.isArray(candidate.products) ||
    !Array.isArray(candidate.sales) ||
    !Array.isArray(candidate.auctions) ||
    !Array.isArray(candidate.payouts) ||
    !Array.isArray(candidate.coupons) ||
    !Array.isArray(candidate.payments)
  ) {
    return null;
  }
  return {
    summary: candidate.summary,
    products: candidate.products,
    sales: candidate.sales,
    auctions: candidate.auctions,
    payouts: candidate.payouts,
    coupons: candidate.coupons,
    payments: candidate.payments,
  };
}

function normalizeProductRelated(candidate: Partial<ProductRelatedRecords>): ProductRelatedRecords | null {
  if (
    !candidate.summary ||
    !Array.isArray(candidate.orders) ||
    !Array.isArray(candidate.buyers) ||
    !Array.isArray(candidate.favorites) ||
    !Array.isArray(candidate.cart) ||
    !Array.isArray(candidate.auctions) ||
    !Array.isArray(candidate.bids) ||
    !Array.isArray(candidate.payments)
  ) {
    return null;
  }
  return {
    summary: candidate.summary,
    orders: candidate.orders,
    buyers: candidate.buyers,
    favorites: candidate.favorites,
    cart: candidate.cart,
    auctions: candidate.auctions,
    bids: candidate.bids,
    payments: candidate.payments,
  };
}

function relatedPagination(section: UserRelatedSectionKey): UserRelatedPaginationItem {
  return userRelated.value?.pagination?.[section] ?? toDefaultPagination();
}

function canLoadMore(section: UserRelatedSectionKey): boolean {
  if (!isUserResource.value || !userRelated.value) return false;
  return relatedPagination(section).hasMore;
}

function isLoadingMore(section: UserRelatedSectionKey): boolean {
  return relatedLoadings.value[section];
}

function goToUserDetail(userId: string): void {
  if (!userId) return;
  void router.push(`/users/${userId}`);
}

function goToOrderDetail(orderId: string): void {
  if (!orderId) return;
  void router.push(`/orders/${orderId}`);
}

function goToProductDetail(productId: string): void {
  if (!productId) return;
  void router.push(`/products/${productId}`);
}

function goToAuctionDetail(auctionId: string): void {
  if (!auctionId) return;
  void router.push(`/auctions/${auctionId}`);
}

function goToPaymentDetail(paymentId: string): void {
  if (!paymentId) return;
  void router.push(`/payments/${paymentId}`);
}

function goToPayoutDetail(payoutId: string): void {
  if (!payoutId) return;
  void router.push(`/payouts/${payoutId}`);
}

function couponUsageStateLabel(coupon: UserDefinedCouponItem): string {
  const now = Date.now();
  const endsAt = new Date(coupon.endsAt).getTime();
  if (Number.isFinite(endsAt) && endsAt < now) return 'SÜRESİ GEÇMİŞ';
  if (coupon.isExhausted) return 'LİMİT DOLU';
  if (coupon.totalUses > 0) return 'KULLANILDI';
  return 'KULLANILMADI';
}

function couponUsageStateClass(coupon: UserDefinedCouponItem): string {
  const label = couponUsageStateLabel(coupon);
  if (label === 'KULLANILMADI') return 'is-muted';
  if (label === 'KULLANILDI') return 'is-success';
  if (label === 'LİMİT DOLU') return 'is-warning';
  return 'is-danger';
}

async function loadMore(section: UserRelatedSectionKey) {
  if (!isUserResource.value || !userRelated.value || relatedLoadings.value[section]) return;
  const current = relatedPagination(section);
  if (!current.hasMore) return;

  relatedLoadings.value[section] = true;
  error.value = null;
  try {
    const response = await adminApi.get<UserRelatedSectionResponse>(`/admin/users/${props.id}/related`, {
      params: {
        section: sectionApiKeyMap[section],
        page: current.page + 1,
        limit: current.limit || USER_RELATED_PAGE_SIZE,
      },
    });

    const incoming = Array.isArray(response.data.items) ? response.data.items : [];
    if (section === 'orders') userRelated.value.orders.push(...(incoming as UserOrderItem[]));
    if (section === 'sales') userRelated.value.sales.push(...(incoming as UserOrderItem[]));
    if (section === 'favorites') userRelated.value.favorites.push(...(incoming as UserFavoriteItem[]));
    if (section === 'cart') userRelated.value.cart.push(...(incoming as UserCartItem[]));
    if (section === 'couponDefinitions') {
      userRelated.value.coupons.defined.push(...(incoming as UserDefinedCouponItem[]));
    }
    if (section === 'couponUsage') {
      userRelated.value.coupons.usage.push(...(incoming as UserCouponUsageItem[]));
    }

    userRelated.value.pagination[section] = response.data.pagination ?? current;
  } catch (loadMoreError) {
    error.value = toApiMessage(loadMoreError);
  } finally {
    relatedLoadings.value[section] = false;
  }
}

async function loadAudit() {
  if (!auditTarget.value) return;
  try {
    const response = await adminApi.get<AuditListResponse>('/admin/audit-logs', {
      params: {
        targetType: auditTarget.value.targetType,
        targetId: auditTarget.value.targetId,
      },
    });
    auditEvents.value = Array.isArray(response.data.items) ? response.data.items : [];
  } catch {
    auditEvents.value = [];
  }
}

async function loadDetail() {
  loading.value = true;
  error.value = null;

  try {
    const response = await adminApi.get<DetailResponse>(endpoint.value);
    overview.value = response.data.overview ?? {};
    timeline.value = Array.isArray(response.data.timeline) ? response.data.timeline : [];
    relatedRecords.value = response.data.relatedRecords ?? {};
    if (isUserResource.value && relatedRecords.value && typeof relatedRecords.value === 'object') {
      userRelated.value = normalizeUserRelated(relatedRecords.value as Partial<UserRelatedRecords>);
      sellerRelated.value = null;
      productRelated.value = null;
    } else if (isSellerResource.value && relatedRecords.value && typeof relatedRecords.value === 'object') {
      sellerRelated.value = normalizeSellerRelated(relatedRecords.value as Partial<SellerRelatedRecords>);
      userRelated.value = null;
      productRelated.value = null;
    } else if (isProductResource.value && relatedRecords.value && typeof relatedRecords.value === 'object') {
      productRelated.value = normalizeProductRelated(relatedRecords.value as Partial<ProductRelatedRecords>);
      userRelated.value = null;
      sellerRelated.value = null;
    } else {
      userRelated.value = null;
      sellerRelated.value = null;
      productRelated.value = null;
    }
    auditTarget.value = response.data.audit ?? null;
    await loadAudit();
  } catch (loadError) {
    error.value = toApiMessage(loadError);
  } finally {
    loading.value = false;
  }
}

watch(
  () => [props.resource, props.id],
  () => {
    activeTab.value = 'Genel Bakış';
    relatedLoadings.value = {
      orders: false,
      sales: false,
      favorites: false,
      cart: false,
      couponDefinitions: false,
      couponUsage: false,
    };
    void loadDetail();
  },
);

onMounted(loadDetail);
</script>

<style scoped>
.overview-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(12, minmax(0, 1fr));
}

.overview-hero-card {
  grid-column: span 12;
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  background: linear-gradient(135deg, var(--bg-panel), var(--bg-elevated));
  padding: 14px;
  display: grid;
  gap: 12px;
}

.overview-hero-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.overview-eyebrow {
  margin: 0;
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.overview-title {
  margin: 4px 0 0;
  font-size: 20px;
  color: var(--text-strong);
}

.overview-kpi-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}

.overview-kpi {
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  padding: 10px;
  background: var(--bg-panel);
  display: grid;
  gap: 4px;
}

.overview-kpi p {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
}

.overview-kpi strong {
  color: var(--text-strong);
  font-size: 18px;
}

.overview-card {
  grid-column: span 6;
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  background: var(--bg-panel);
  padding: 12px;
  display: grid;
  gap: 10px;
}

.overview-card h4 {
  margin: 0;
  font-size: 14px;
  color: var(--text-strong);
}

.metric-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
}

.metric-row span {
  color: var(--text-muted);
}

.metric-row strong {
  color: var(--text-strong);
}

.metric-track {
  width: 100%;
  height: 8px;
  background: var(--bg-soft);
  border-radius: 999px;
  overflow: hidden;
}

.metric-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.2s ease;
  background: var(--brand-600);
}

.metric-fill.is-success {
  background: #1f7a3d;
}

.metric-fill.is-warning {
  background: #9a6700;
}

@media (max-width: 960px) {
  .overview-card {
    grid-column: span 12;
  }
}

.related-section {
  display: grid;
  gap: 16px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
}

.summary-card {
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  background: var(--bg-elevated);
  padding: 10px 12px;
  display: grid;
  gap: 4px;
}

.summary-label {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
}

.summary-card strong {
  color: var(--text-strong);
  font-size: 18px;
}

.record-block {
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  padding: 12px;
  background: var(--bg-panel);
}

.record-block h3 {
  margin: 0 0 10px;
  font-size: 14px;
  color: var(--text-strong);
}

.record-footer {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}

.load-more-button {
  min-height: 30px;
  padding: 4px 10px;
  font-size: 12px;
}

.table-wrap {
  overflow-x: auto;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;
}

.detail-table th,
.detail-table td {
  text-align: left;
  padding: 8px;
  border-bottom: 1px solid var(--border-soft);
  font-size: 12px;
  white-space: nowrap;
}

.detail-table th {
  color: var(--text-muted);
  font-weight: 700;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  background: var(--bg-soft);
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-body);
}

.status-pill.is-muted {
  background: var(--bg-soft);
  color: var(--text-muted);
}

.status-pill.is-success {
  background: #eaf8ef;
  border-color: #bde3c9;
  color: #1f7a3d;
}

.status-pill.is-warning {
  background: #fff6e7;
  border-color: #f2d9a9;
  color: #9a6700;
}

.status-pill.is-danger {
  background: #fdecef;
  border-color: #f5c7d0;
  color: #b9384f;
}

.link-inline {
  border: 0;
  background: transparent;
  color: var(--brand-600);
  font-size: 12px;
  font-weight: 700;
  padding: 0;
  text-align: left;
}

.link-inline:hover {
  text-decoration: underline;
}
</style>
