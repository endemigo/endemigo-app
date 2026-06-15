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
          <template v-if="(isUserResource || isSellerResource) && userRelated">
            <section class="overview-grid" style="margin-bottom: 2rem;">
              <article class="overview-hero-card">
                <header class="overview-hero-header">
                  <div>
                    <p class="overview-eyebrow">Üye Genel Durum</p>
                    <h3 class="overview-title">{{ userDisplayName }}</h3>
                  </div>
                  <span class="status-pill">{{ (isUserResource ? getString(overview, 'isActive') : (overview.user ? getString(overview.user, 'isActive') : '')) === 'true' ? 'ACTIVE' : 'INACTIVE' }}</span>
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
                  <strong>{{ (isUserResource ? getString(overview, 'email') : (overview.user ? getString(overview.user, 'email') : '')) || '-' }}</strong>
                </div>
                <div class="metric-row">
                  <span>Telefon</span>
                  <strong>{{ (isUserResource ? getString(overview, 'phone') : (overview.user ? getString(overview.user, 'phone') : '')) || '-' }}</strong>
                </div>
                <div class="metric-row">
                  <span>Üye Tipi</span>
                  <strong>{{ (isUserResource ? getString(overview, 'isSeller') === 'true' : (overview.user ? getString(overview.user, 'isSeller') === 'true' : false)) ? 'SELLER' : 'BUYER' }}</strong>
                </div>
                <div class="metric-row">
                  <span>Adres</span>
                  <strong>{{ userRelated.summary.addressCount }}</strong>
                </div>
                <div class="metric-row">
                  <span>Kayıt</span>
                  <strong>{{ (isUserResource ? getString(overview, 'createdAt') : (overview.user ? getString(overview.user, 'createdAt') : '')) ? formatDate(isUserResource ? getString(overview, 'createdAt') : (overview.user ? getString(overview.user, 'createdAt') : '')) : '-' }}</strong>
                </div>
              </article>
            </section>
          </template>

          <template v-if="(isUserResource || isSellerResource) && sellerRelated">
            <section class="overview-grid">
              <article class="overview-hero-card">
                <header class="overview-hero-header">
                  <div>
                    <p class="overview-eyebrow">Satıcı Genel Durum</p>
                    <h3 class="overview-title">{{ (isSellerResource ? getString(overview, 'businessName') : (overview.sellerProfile ? getString(overview.sellerProfile, 'businessName') : '')) || 'Satıcı' }}</h3>
                  </div>
                  <span class="status-pill">{{ (isSellerResource ? getString(overview, 'status') : (overview.sellerProfile ? getString(overview.sellerProfile, 'status') : '')) || '-' }}</span>
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
                <div class="metric-row">
                  <span>İncelemedeki Ürün</span>
                  <strong>{{ sellerRelated.summary.reviewProductCount }}</strong>
                </div>
                <div class="metric-row">
                  <span>Askıdaki/Stoksuz</span>
                  <strong>{{ sellerRelated.summary.suspendedProductCount }} / {{ sellerRelated.summary.outOfStockProductCount }}</strong>
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
                <div class="metric-row">
                  <span>Benzersiz Alıcı</span>
                  <strong>{{ sellerRelated.summary.uniqueBuyerCount }}</strong>
                </div>
              </article>

              <article class="overview-card">
                <h4>Hızlı Profil (Satıcı)</h4>
                <div class="metric-row">
                  <span>Kullanıcı ID</span>
                  <strong>{{ (isSellerResource ? getString(overview, 'userId') : (overview.sellerProfile ? getString(overview.sellerProfile, 'userId') : '')) || '-' }}</strong>
                </div>
                <div class="metric-row">
                  <span>Telefon</span>
                  <strong>{{ (isSellerResource ? getString(overview, 'phone') : (overview.sellerProfile ? getString(overview.sellerProfile, 'phone') : '')) || '-' }}</strong>
                </div>
                <div class="metric-row">
                  <span>Komisyon</span>
                  <strong>%{{ Number((isSellerResource ? getString(overview, 'commissionRate') : (overview.sellerProfile ? getString(overview.sellerProfile, 'commissionRate') : '')) || 0) * 100 }}</strong>
                </div>
                <div class="metric-row">
                  <span>Adres Sayısı</span>
                  <strong>{{ sellerRelated.summary.addressCount }}</strong>
                </div>
                <div class="metric-row">
                  <span>Sözleşme Versiyonu</span>
                  <strong>{{ (isSellerResource ? getString(overview, 'agreementVersion') : (overview.sellerProfile ? getString(overview.sellerProfile, 'agreementVersion') : '')) || '-' }}</strong>
                </div>
                <div class="metric-row">
                  <span>Sözleşme Tarihi</span>
                  <strong>{{ (isSellerResource ? getString(overview, 'agreementAcceptedAt') : (overview.sellerProfile ? getString(overview.sellerProfile, 'agreementAcceptedAt') : '')) ? formatDate(isSellerResource ? getString(overview, 'agreementAcceptedAt') : getString(overview.sellerProfile, 'agreementAcceptedAt')) : '-' }}</strong>
                </div>
                <div class="metric-row">
                  <span>Onay Tarihi</span>
                  <strong>{{ (isSellerResource ? getString(overview, 'approvedAt') : (overview.sellerProfile ? getString(overview.sellerProfile, 'approvedAt') : '')) ? formatDate(isSellerResource ? getString(overview, 'approvedAt') : getString(overview.sellerProfile, 'approvedAt')) : '-' }}</strong>
                </div>
              </article>
            </section>
          </template>
          <template v-else-if="isProductResource && productRelated">
             <div class="summary-grid">
               <article class="summary-card">
                 <div class="summary-card-header">
                   <span class="summary-icon-wrap"><i class="pi pi-shopping-bag" /></span>
                   <p class="summary-label">Toplam Sipariş</p>
                 </div>
                 <strong>{{ productRelated.summary.orderCount }}</strong>
               </article>
               <article class="summary-card">
                 <div class="summary-card-header">
                   <span class="summary-icon-wrap"><i class="pi pi-check-circle" /></span>
                   <p class="summary-label">Tamamlanan Sipariş</p>
                 </div>
                 <strong>{{ productRelated.summary.completedOrderCount }}</strong>
               </article>
               <article class="summary-card">
                 <div class="summary-card-header">
                   <span class="summary-icon-wrap"><i class="pi pi-users" /></span>
                   <p class="summary-label">Benzersiz Alıcı</p>
                 </div>
                 <strong>{{ productRelated.summary.buyerCount }}</strong>
               </article>
               <article class="summary-card">
                 <div class="summary-card-header">
                   <span class="summary-icon-wrap"><i class="pi pi-money-bill" /></span>
                   <p class="summary-label">Toplam Ciro</p>
                 </div>
                 <strong>{{ formatMoney(productRelated.summary.grossSales, 'TRY') }}</strong>
               </article>
               <article class="summary-card">
                 <div class="summary-card-header">
                   <span class="summary-icon-wrap"><i class="pi pi-heart" /></span>
                   <p class="summary-label">Favori</p>
                 </div>
                 <strong>{{ productRelated.summary.favoriteCount }}</strong>
               </article>
               <article class="summary-card">
                 <div class="summary-card-header">
                   <span class="summary-icon-wrap"><i class="pi pi-shopping-cart" /></span>
                   <p class="summary-label">Sepet (Kalem/Adet)</p>
                 </div>
                 <strong>{{ productRelated.summary.cartLineCount }} / {{ productRelated.summary.cartQuantityTotal }}</strong>
               </article>
               <article class="summary-card">
                 <div class="summary-card-header">
                   <span class="summary-icon-wrap"><i class="pi pi-clock" /></span>
                   <p class="summary-label">Müzayede (Aktif/Toplam)</p>
                 </div>
                 <strong>{{ productRelated.summary.activeAuctionCount }} / {{ productRelated.summary.auctionCount }}</strong>
               </article>
               <article class="summary-card">
                 <div class="summary-card-header">
                   <span class="summary-icon-wrap"><i class="pi pi-tag" /></span>
                   <p class="summary-label">Teklif / Ödeme</p>
                 </div>
                 <strong>{{ productRelated.summary.bidCount }} / {{ productRelated.summary.paymentCount }}</strong>
               </article>
               <article class="summary-card">
                 <div class="summary-card-header">
                   <span class="summary-icon-wrap"><i class="pi pi-comments" /></span>
                   <p class="summary-label">Sohbetler</p>
                 </div>
                 <strong>{{ productRelated.summary.negotiationCount || 0 }}</strong>
               </article>
             </div>

            <section class="record-block">
              <h3>Satın Alanlar</h3>
              <div v-if="productRelated.buyers.length === 0" class="empty-state">
                <i class="pi pi-users empty-icon" />
                <p>Kayıtlı alıcı bulunamadı.</p>
              </div>
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
              <div v-if="productRelated.orders.length === 0" class="empty-state">
                <i class="pi pi-shopping-bag empty-icon" />
                <p>Sipariş geçmişi bulunamadı.</p>
              </div>
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
              <div v-if="productRelated.favorites.length === 0 && productRelated.cart.length === 0" class="empty-state">
                <i class="pi pi-heart empty-icon" />
                <p>Favori veya sepet hareketi bulunamadı.</p>
              </div>
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
              <div v-if="productRelated.auctions.length === 0 && productRelated.bids.length === 0" class="empty-state">
                <i class="pi pi-clock empty-icon" />
                <p>Ürünle ilgili müzayede veya teklif kaydı bulunamadı.</p>
              </div>
              <div v-if="productRelated.auctions.length > 0" class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>Müzayede</th>
                      <th>Durum</th>
                      <th>Güncel Fiyat</th>
                      <th>Reserve</th>
                      <th>Reserve Durumu</th>
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
                      <td>{{ formatReserveLabel(auction.reservePrice) }}</td>
                      <td>{{ formatReserveState(auction.reservePrice, auction.reserveMet) }}</td>
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
                      <th>Max</th>
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
                      <td>{{ bid.maxAmount === null ? '-' : formatMoney(bid.maxAmount, 'TRY') }}</td>
                      <td><span class="status-pill">{{ formatStatus(bid.status) }}{{ bid.isWinningBid ? ' (Kazanan)' : '' }}</span></td>
                      <td>{{ formatDate(bid.createdAt) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="record-block">
              <h3>Ödeme Kayıtları</h3>
              <div v-if="productRelated.payments.length === 0" class="empty-state">
                <i class="pi pi-credit-card empty-icon" />
                <p>Ödeme kaydı bulunamadı.</p>
              </div>
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

            <section class="record-block">
              <h3>İlişkili Sohbetler / Pazarlıklar</h3>
              <div v-if="productRelated.negotiations.length === 0" class="empty-state">
                <i class="pi pi-comments empty-icon" />
                <p>Bu ürünle ilgili sohbet kaydı bulunamadı.</p>
              </div>
              <div v-else class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>Sohbet No</th>
                      <th>Alıcı</th>
                      <th>Satıcı</th>
                      <th>Adet</th>
                      <th>Durum</th>
                      <th>Son Aktivite</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="neg in productRelated.negotiations" :key="neg.id">
                      <td>
                        <button type="button" class="link-inline" @click="goToNegotiationDetail(neg.id)">
                          #{{ shortId(neg.id) }}
                        </button>
                      </td>
                      <td>
                        <button type="button" class="link-inline" @click="goToUserDetail(neg.buyerId)">
                          {{ neg.buyerName }}
                        </button>
                      </td>
                      <td>
                        <button type="button" class="link-inline" @click="goToUserDetail(neg.sellerId)">
                          {{ neg.sellerName }}
                        </button>
                      </td>
                      <td>{{ neg.quantity }}</td>
                      <td><span class="status-pill">{{ formatStatus(neg.status) }}</span></td>
                      <td>{{ formatDate(neg.updatedAt) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
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
                  <span class="status-pill">{{ formatStatus(getString(overview, 'status')) || '-' }}</span>
                </header>
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
          <template v-else-if="(isBidResource || isAuctionResource) && bidRelated">
            <section class="overview-grid">
              <article class="overview-hero-card">
                <header class="overview-hero-header">
                  <div>
                    <p class="overview-eyebrow">Müzayede Teklif Özeti</p>
                    <h3 class="overview-title">
                      {{ getString(overview, 'lotNumber') || shortId(getString(overview, 'auctionId')) }}
                    </h3>
                  </div>
                  <span class="status-pill">{{ formatStatus(getString(overview, 'status')) }}</span>
                </header>
                <div class="overview-kpi-grid">
                  <article class="overview-kpi">
                    <p>Toplam Teklif</p>
                    <strong>{{ bidRelated.summary.totalBidCount }}</strong>
                  </article>
                  <article class="overview-kpi">
                    <p>Katılımcı</p>
                    <strong>{{ bidRelated.summary.uniqueBidderCount }}</strong>
                  </article>
                  <article class="overview-kpi">
                    <p>En Yüksek Teklif</p>
                    <strong>{{ formatMoney(bidRelated.summary.highestBidAmount, 'TRY') }}</strong>
                  </article>
                  <article class="overview-kpi">
                    <p>Anlık Fiyat</p>
                    <strong>{{ formatMoney(Number(getString(overview, 'currentPrice') || 0), 'TRY') }}</strong>
                  </article>
                </div>
              </article>

              <article class="overview-card">
                <h4>Müzayede</h4>
                <div class="metric-row">
                  <span>Ürün</span>
                  <strong>{{ getString(overview, 'productTitle') || '-' }}</strong>
                </div>
                <div class="metric-row">
                  <span>Satıcı</span>
                  <strong>{{ getString(overview, 'sellerName') || '-' }}</strong>
                </div>
                <div class="metric-row">
                  <span>Başlangıç</span>
                  <strong>{{ formatMoney(Number(getString(overview, 'startPrice') || 0), 'TRY') }}</strong>
                </div>
                <div class="metric-row">
                  <span>Min Artış</span>
                  <strong>{{ formatMoney(Number(getString(overview, 'minIncrement') || 0), 'TRY') }}</strong>
                </div>
                <div class="metric-row">
                  <span>Reserve</span>
                  <strong>{{ formatReserveLabel(getNullableNumber(overview, 'reservePrice')) }}</strong>
                </div>
                <div class="metric-row">
                  <span>Reserve Durumu</span>
                  <strong>{{ formatReserveState(getNullableNumber(overview, 'reservePrice'), getBoolean(overview, 'reserveMet')) }}</strong>
                </div>
                <div class="metric-row">
                  <span>Bitiş</span>
                  <strong>{{ getString(overview, 'endTime') ? formatDate(getString(overview, 'endTime')) : '-' }}</strong>
                </div>
              </article>

              <article class="overview-card">
                <h4>Satış Durumu</h4>
                <div class="metric-row">
                  <span>Kazanan</span>
                  <strong>{{ bidRelated.summary.winningBidderName || '-' }}</strong>
                </div>
                <div class="metric-row">
                  <span>Kazanan Teklif</span>
                  <strong>{{ formatMoney(bidRelated.summary.winningBidAmount, 'TRY') }}</strong>
                </div>
                <div class="metric-row">
                  <span>Sipariş</span>
                  <strong>{{ bidRelated.summary.hasOrder ? 'VAR' : 'YOK' }}</strong>
                </div>
                <div class="metric-row">
                  <span>Ödeme</span>
                  <strong>{{ bidRelated.summary.hasPayment ? 'VAR' : 'YOK' }}</strong>
                </div>
                <div class="metric-row">
                  <span>Son Teklif</span>
                  <strong>{{ bidRelated.summary.lastBidAt ? formatDate(bidRelated.summary.lastBidAt) : '-' }}</strong>
                </div>
              </article>
            </section>
          </template>
          <template v-else-if="isNegotiationResource && negotiationRelated">
            <section class="overview-grid">
              <article class="overview-hero-card">
                <header class="overview-hero-header">
                  <div>
                    <p class="overview-eyebrow">Sohbet No</p>
                    <h3 class="overview-title">#{{ shortId(getString(overview, 'id')) }}</h3>
                  </div>
                  <span class="status-pill">{{ formatStatus(getString(overview, 'status')) }}</span>
                </header>
                <div class="overview-kpi-grid">
                  <article class="overview-kpi">
                    <p>AI İhlal Sayısı</p>
                    <strong :class="{ 'text-danger': Number(getString(overview, 'violationCount')) > 0 }">
                      {{ getString(overview, 'violationCount') || '0' }}
                    </strong>
                  </article>
                  <article class="overview-kpi">
                    <p>Politika Kilidi</p>
                    <strong :class="{ 'text-danger': getString(overview, 'lockedByPolicy') === 'true' }">
                      {{ getString(overview, 'lockedByPolicy') === 'true' ? 'KİLİTLİ' : 'TEMİZ' }}
                    </strong>
                  </article>
                  <article class="overview-kpi">
                    <p>Ürün</p>
                    <strong>
                      <button type="button" class="link-inline" @click="goToProductDetail(getString(overview, 'productId'))">
                        {{ getString(overview, 'productTitle') || 'Ürün Detayı' }}
                      </button>
                    </strong>
                  </article>
                </div>
              </article>

              <article class="overview-card">
                <h4>Sohbet Bilgisi</h4>
                <div class="metric-row">
                  <span>Alıcı</span>
                  <strong>
                    <button type="button" class="link-inline" @click="goToUserDetail(getString(overview, 'buyerId'))">
                      {{ getString(overview, 'buyerName') }}
                    </button>
                  </strong>
                </div>
                <div class="metric-row">
                  <span>Satıcı</span>
                  <strong>
                    <button type="button" class="link-inline" @click="goToUserDetail(getString(overview, 'sellerId'))">
                      {{ getString(overview, 'sellerName') }}
                    </button>
                  </strong>
                </div>
                <div class="metric-row">
                  <span>Miktar</span>
                  <strong>{{ getString(overview, 'quantity') || '1' }} Adet</strong>
                </div>
                <div class="metric-row">
                  <span>Başlangıç</span>
                  <strong>{{ formatDate(getString(overview, 'createdAt')) }}</strong>
                </div>
                <div class="metric-row">
                  <span>Son İşlem</span>
                  <strong>{{ formatDate(getString(overview, 'updatedAt')) }}</strong>
                </div>
              </article>
            </section>

            <section class="record-block chat-panel">
              <h3>Sohbet Akışı & AI Denetimi</h3>
              <div class="chat-container">
                <div v-if="negotiationRelated.messages.length === 0" class="muted text-center py-4">
                  Bu sohbette henüz mesaj kaydı yok.
                </div>
                <div v-else class="chat-stream">
                  <div
                    v-for="msg in negotiationRelated.messages"
                    :key="msg.id"
                    :class="[
                      'chat-bubble-wrap',
                      msg.isSystem ? 'system-wrap' : (msg.senderId === getString(overview, 'buyerId') ? 'buyer-wrap' : 'seller-wrap')
                    ]"
                  >
                    <!-- Sistem Mesajı -->
                    <div v-if="msg.isSystem" class="chat-bubble chat-bubble-system">
                      <p>{{ msg.content }}</p>
                      <small>{{ formatDate(msg.createdAt) }}</small>
                    </div>

                    <!-- AI Tarafından Engellenen / İhlal Mesajı -->
                    <div v-else-if="msg.isViolation" class="chat-bubble chat-bubble-violation">
                      <div class="violation-header">
                        <i class="pi pi-shield-ban"></i>
                        <strong>⚠️ AI ENGELLEDİ</strong>
                      </div>
                      <p class="violation-attempt"><strong>Gönderilmek istenen:</strong> "{{ msg.content }}"</p>
                      <div class="violation-footer">
                        <span>Güvenlik Politikası Tetiklendi</span>
                        <small>{{ formatDate(msg.createdAt) }}</small>
                      </div>
                    </div>

                    <!-- Normal Kullanıcı Mesajı -->
                    <div v-else class="chat-bubble" :class="msg.senderId === getString(overview, 'buyerId') ? 'bubble-buyer' : 'bubble-seller'">
                      <div class="bubble-sender">{{ msg.senderName }}</div>
                      <p class="bubble-content">{{ msg.content }}</p>
                      <small class="bubble-time">{{ formatDate(msg.createdAt) }}</small>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </template>
          <template v-else-if="isAuditResource">
            <section class="overview-grid">
              <article class="overview-hero-card">
                <header class="overview-hero-header">
                  <div>
                    <p class="overview-eyebrow">Denetim Özeti</p>
                    <h3 class="overview-title">{{ auditActionLabel(getString(overview, 'action')) }}</h3>
                  </div>
                  <span class="status-pill">{{ auditTargetLabel(getString(overview, 'targetType')) }}</span>
                </header>
                <div class="overview-kpi-grid">
                  <article class="overview-kpi">
                    <p>Hedef Kayıt</p>
                    <strong>{{ shortId(getString(overview, 'targetId')) }}</strong>
                  </article>
                  <article class="overview-kpi">
                    <p>Yapan</p>
                    <strong>{{ auditActorLabel(overview) }}</strong>
                  </article>
                  <article class="overview-kpi">
                    <p>IP</p>
                    <strong>{{ getString(overview, 'ipAddress') || '-' }}</strong>
                  </article>
                  <article class="overview-kpi">
                    <p>Tarih</p>
                    <strong>{{ getString(overview, 'createdAt') ? formatDate(getString(overview, 'createdAt')) : '-' }}</strong>
                  </article>
                </div>
              </article>

              <article class="overview-card">
                <h4>Sebep</h4>
                <p>{{ getString(overview, 'reason') || '-' }}</p>
              </article>

              <article class="overview-card">
                <h4>Tam Kayıt Kimliği</h4>
                <div class="metric-row">
                  <span>Denetim ID</span>
                  <strong>{{ getString(overview, 'id') || '-' }}</strong>
                </div>
                <div class="metric-row">
                  <span>Hedef ID</span>
                  <strong>{{ getString(overview, 'targetId') || '-' }}</strong>
                </div>
                <div class="metric-row">
                  <span>Yönetici ID</span>
                  <strong>{{ getString(overview, 'actorAdminId') || '-' }}</strong>
                </div>
              </article>
            </section>
          </template>
          <template v-else-if="isCategoryResource">
            <section class="overview-grid">
              <article class="overview-hero-card">
                <header class="overview-hero-header">
                  <div class="category-hero-title-area">
                    <div v-if="getString(overview, 'imageUrl')" class="category-hero-img-wrap">
                      <img :src="getString(overview, 'imageUrl')" class="category-hero-img" alt="Kategori Görseli" />
                    </div>
                    <div v-else class="category-hero-icon-wrap">
                      <i class="pi pi-folder category-hero-icon"></i>
                    </div>
                    <div>
                      <p class="overview-eyebrow">Kategori Genel Durum</p>
                      <h3 class="overview-title">{{ getString(overview, 'name') }}</h3>
                    </div>
                  </div>
                  <span class="status-pill" :class="{ 'is-success': getString(overview, 'isActive') === 'true' || getString(overview, 'isActive') === 'Aktif', 'is-muted': getString(overview, 'isActive') !== 'true' && getString(overview, 'isActive') !== 'Aktif' }">
                    {{ getString(overview, 'isActive') === 'true' || getString(overview, 'isActive') === 'Aktif' ? 'AKTİF' : 'KAPALI' }}
                  </span>
                </header>
                <div class="overview-kpi-grid">
                  <article class="overview-kpi">
                    <p>Sıralama Önceliği</p>
                    <strong>{{ getString(overview, 'sortOrder') || '0' }}</strong>
                  </article>
                  <article class="overview-kpi">
                    <p>Kültürel Varlık</p>
                    <strong>{{ getString(overview, 'isCulturalAsset') === 'true' || getString(overview, 'isCulturalAsset') === 'Evet' ? 'Evet' : 'Hayır' }}</strong>
                  </article>
                  <article class="overview-kpi">
                    <p>Alıcı/Satıcı İletişimi</p>
                    <strong>
                      <span class="badge-comm" :class="{ 'is-active': getCategoryCommunicationEnabled(overview) === 'true' }">
                        {{ getCategoryCommunicationEnabled(overview) === 'true' ? 'Aktif' : 'Kapalı' }}
                      </span>
                    </strong>
                  </article>
                  <article class="overview-kpi">
                    <p>Bağlı Varyasyon</p>
                    <strong>{{ getCategoryVariationOptionIds(overview).length }}</strong>
                  </article>
                </div>
              </article>

              <article class="overview-card">
                <h4>Kategori Bilgileri</h4>
                <div class="metric-row">
                  <span>Kategori ID</span>
                  <strong class="text-mono">{{ getString(overview, 'id') }}</strong>
                </div>
                <div class="metric-row">
                  <span>Kısa Ad (Slug)</span>
                  <strong class="text-mono">{{ getString(overview, 'slug') || '-' }}</strong>
                </div>
                <div class="metric-row">
                  <span>Üst Kategori</span>
                  <strong>{{ getCategoryParentPath(getString(overview, 'parentId')) }}</strong>
                </div>
                <div class="metric-row">
                  <span>Açıklama</span>
                  <span class="category-desc">{{ getString(overview, 'description') || 'Açıklama girilmemiş.' }}</span>
                </div>
              </article>

              <article class="overview-card">
                <h4>Bağlı Varyasyonlar</h4>
                <p v-if="getCategoryVariationOptionIds(overview).length === 0" class="muted">
                  Bu kategoriye bağlı herhangi bir varyasyon tanımlanmamış.
                </p>
                <div v-else class="variant-tags-container">
                  <span v-for="varId in getCategoryVariationOptionIds(overview)" :key="varId" class="variant-tag-badge">
                    <i class="pi pi-tags tag-icon"></i> {{ getVariationName(varId) }}
                  </span>
                </div>
              </article>

              <article class="overview-card span-12" v-if="getCategoryListingFields(overview).length > 0">
                <h4>Dinamik İlan Şablon Alanları</h4>
                <div class="table-wrap">
                  <table class="detail-table category-fields-table">
                    <thead>
                      <tr>
                        <th>Alan Adı (Key)</th>
                        <th>Veri Tipi (Type)</th>
                        <th>Zorunlu mu? (Required)</th>
                        <th>Seçenekler (Options)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="field in getCategoryListingFields(overview)" :key="field.key">
                        <td class="text-mono-bold">
                          <div class="field-label-tr">{{ getFieldLabel(field.key) }}</div>
                          <div class="field-key-sub">{{ field.key }}</div>
                        </td>
                        <td>
                          <span class="type-badge" :class="field.type">{{ getFieldTypeLabel(field.type) }}</span>
                        </td>
                        <td>
                          <span class="required-badge" :class="{ 'is-required': field.required }">
                            {{ field.required ? 'Zorunlu' : 'Opsiyonel' }}
                          </span>
                        </td>
                        <td>
                          <div v-if="field.options && field.options.length > 0" class="field-options-list">
                            <span v-for="opt in field.options" :key="opt" class="field-option-pill">
                              {{ opt }}
                            </span>
                          </div>
                          <span v-else class="muted">-</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </article>
            </section>
          </template>
          <template v-else-if="isOrderResource">
            <section class="overview-grid">
              <article class="overview-hero-card">
                <header class="overview-hero-header">
                  <div>
                    <p class="overview-eyebrow">Sipariş Genel Durum</p>
                    <h3 class="overview-title">Sipariş #{{ shortId(getString(overview, 'id')) }}</h3>
                  </div>
                  <span class="status-pill status-order" :class="getString(overview, 'status')">{{ getString(overview, 'status') }}</span>
                </header>
                <div class="overview-kpi-grid">
                  <article class="overview-kpi">
                    <p>Toplam Tutar</p>
                    <strong>{{ formatMoney(Number(getString(overview, 'amount') || 0), getString(overview, 'currency') || 'TRY') }}</strong>
                  </article>
                  <article class="overview-kpi">
                    <p>Ödeme Durumu (Escrow)</p>
                    <strong>{{ getString(overview, 'escrowStatus') }}</strong>
                  </article>
                  <article class="overview-kpi">
                    <p>Kaynak</p>
                    <strong>{{ getString(overview, 'source') }}</strong>
                  </article>
                  <article class="overview-kpi">
                    <p>Oluşturulma Tarihi</p>
                    <strong>{{ formatDate(getString(overview, 'createdAt')) }}</strong>
                  </article>
                </div>
              </article>

              <article class="overview-card">
                <h4>Sipariş Detayları</h4>
                <div class="metric-row">
                  <span>Alıcı</span>
                  <button type="button" class="link-inline" @click="goToUserDetail(getString(overview, 'buyerId'))">
                    {{ shortId(getString(overview, 'buyerId')) }} <i class="pi pi-external-link"></i>
                  </button>
                </div>
                <div class="metric-row">
                  <span>Satıcı</span>
                  <button type="button" class="link-inline" @click="goToSellerDetail(getString(overview, 'sellerId'))">
                    {{ shortId(getString(overview, 'sellerId')) }} <i class="pi pi-external-link"></i>
                  </button>
                </div>
                <div class="metric-row">
                  <span>Ürün</span>
                  <button type="button" class="link-inline" @click="goToProductDetail(getString(overview, 'productId'))">
                    {{ shortId(getString(overview, 'productId')) }} <i class="pi pi-external-link"></i>
                  </button>
                </div>
                <div class="metric-row" v-if="getString(overview, 'paymentId')">
                  <span>Ödeme ID</span>
                  <strong class="text-mono">{{ getString(overview, 'paymentId') }}</strong>
                </div>
                <div class="metric-row">
                  <span>Referans ID</span>
                  <strong class="text-mono">{{ getString(overview, 'sourceReferenceId') }}</strong>
                </div>
              </article>

              <article class="overview-card">
                <h4>Süreç Zamanlamaları</h4>
                <div class="metric-row" v-if="getString(overview, 'autoConfirmAt')">
                  <span>Otomatik Onay</span>
                  <strong>{{ formatDate(getString(overview, 'autoConfirmAt')) }}</strong>
                </div>
                <div class="metric-row" v-if="getString(overview, 'deliveryConfirmedAt')">
                  <span>Teslimat Onay</span>
                  <strong>{{ formatDate(getString(overview, 'deliveryConfirmedAt')) }}</strong>
                </div>
                <div class="metric-row" v-if="getString(overview, 'completedAt')">
                  <span>Tamamlanma</span>
                  <strong>{{ formatDate(getString(overview, 'completedAt')) }}</strong>
                </div>
                <div class="metric-row" v-if="getString(overview, 'updatedAt')">
                  <span>Son Güncelleme</span>
                  <strong>{{ formatDate(getString(overview, 'updatedAt')) }}</strong>
                </div>
              </article>

              <!-- İADE TALEBİ BİLGİLERİ -->
              <article v-if="getString(overview, 'returnReasonCode') || (overview.returnImages && Array.isArray(overview.returnImages) && overview.returnImages.length > 0)" class="overview-card span-12 return-details-card">
                <h4>İade Talebi Bilgileri</h4>
                <div class="return-info-grid">
                  <div class="return-info-fields">
                    <div class="metric-row" v-if="getString(overview, 'returnReasonCode')">
                      <span>İade Nedeni</span>
                      <strong class="reason-badge">{{ getString(overview, 'returnReasonCode') }}</strong>
                    </div>
                    <div class="metric-row" v-if="getString(overview, 'returnReasonNote')">
                      <span>İade Notu</span>
                      <span class="return-note-text">{{ getString(overview, 'returnReasonNote') }}</span>
                    </div>
                    <div class="metric-row" v-if="getString(overview, 'returnShipmentId')">
                      <span>İade Kargo ID</span>
                      <strong class="text-mono">{{ getString(overview, 'returnShipmentId') }}</strong>
                    </div>
                    <div class="metric-row" v-if="getString(overview, 'returnRequestedAt')">
                      <span>Talep Tarihi</span>
                      <strong>{{ formatDate(getString(overview, 'returnRequestedAt')) }}</strong>
                    </div>
                    <div class="metric-row" v-if="getString(overview, 'returnApprovedAt')">
                      <span>Onay Tarihi</span>
                      <strong>{{ formatDate(getString(overview, 'returnApprovedAt')) }}</strong>
                    </div>
                    <div class="metric-row" v-if="getString(overview, 'returnDeliveredAt')">
                      <span>Teslim Tarihi</span>
                      <strong>{{ formatDate(getString(overview, 'returnDeliveredAt')) }}</strong>
                    </div>
                    <div class="metric-row" v-if="getString(overview, 'refundedAt')">
                      <span>Geri Ödeme Tarihi</span>
                      <strong>{{ formatDate(getString(overview, 'refundedAt')) }}</strong>
                    </div>
                  </div>

                  <div class="return-gallery-section" v-if="overview.returnImages && Array.isArray(overview.returnImages) && overview.returnImages.length > 0">
                    <h5>İade Kanıt Görselleri</h5>
                    <div class="return-gallery">
                      <a v-for="(imgUrl, idx) in (overview.returnImages as string[])" :key="idx" :href="imgUrl" target="_blank" class="gallery-item">
                        <img :src="imgUrl" alt="İade Kanıtı" />
                        <span class="zoom-overlay">
                          <i class="pi pi-search-plus"></i>
                        </span>
                      </a>
                    </div>
                  </div>
                </div>
              </article>
            </section>
          </template>
          <pre v-else class="json-box">{{ pretty(overview) }}</pre>
        </div>
        <div v-else-if="activeTab === 'Zaman Çizelgesi'" class="timeline">
          <div v-if="timeline.length === 0" class="empty-state">
            <i class="pi pi-clock empty-icon" />
            <p>Zaman çizelgesi kaydı yok.</p>
          </div>
          <article v-for="event in timeline" :key="timelineKey(event)" class="timeline-item">
            <strong>{{ event.label }}</strong>
            <p class="muted">{{ formatDate(event.createdAt) }}</p>
          </article>
        </div>
        <div v-else-if="activeTab === 'İlgili Kayıtlar'" class="related-section">
          <template v-if="isUserResource || isSellerResource">
            <!-- ALICI GEÇMİŞİ VE HESAP BİLGİLERİ -->
            <template v-if="userRelated">
              <h2 class="section-title" style="margin-top: 1rem; margin-bottom: 0.5rem; font-size: 1.25rem; font-weight: 700; color: var(--text-strong);">Alıcı Geçmişi</h2>
              
              <section class="record-block">
                <h3>Adresler</h3>
                <div v-if="userRelated.addresses.length === 0" class="empty-state">
                  <i class="pi pi-map-marker empty-icon" />
                  <p>Adres kaydı yok.</p>
                </div>
                <div v-else class="table-wrap">
                  <table class="detail-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Tip</th>
                        <th>Başlık</th>
                        <th>Ad Soyad</th>
                        <th>Telefon</th>
                        <th>Konum</th>
                        <th>Varsayılan</th>
                        <th>Tarih</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="address in userRelated.addresses" :key="address.id">
                        <td>{{ shortId(address.id) }}</td>
                        <td><span class="status-pill">{{ address.type }}</span></td>
                        <td>{{ address.title || '-' }}</td>
                        <td>{{ address.fullName || '-' }}</td>
                        <td>{{ address.phone || '-' }}</td>
                        <td>{{ `${address.city}/${address.district}` }}</td>
                        <td>
                          <span class="status-pill" :class="address.isDefault ? 'is-success' : 'is-muted'">
                            {{ address.isDefault ? 'EVET' : 'HAYIR' }}
                          </span>
                        </td>
                        <td>{{ formatDate(address.createdAt) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section class="record-block">
                <h3>Geçmiş Siparişler</h3>
                <div v-if="userRelated.orders.length === 0" class="empty-state">
                  <i class="pi pi-shopping-bag empty-icon" />
                  <p>Sipariş kaydı yok.</p>
                </div>
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
                <h3>Favoriye Eklenen Ürünler</h3>
                <div v-if="userRelated.favorites.length === 0" class="empty-state">
                  <i class="pi pi-heart empty-icon" />
                  <p>Favori kaydı yok.</p>
                </div>
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
                <div v-if="userRelated.cart.length === 0" class="empty-state">
                  <i class="pi pi-shopping-cart empty-icon" />
                  <p>Sepet boş.</p>
                </div>
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
                <h3>Kupon Kullanım Geçmişi</h3>
                <div v-if="userRelated.coupons.usage.length === 0" class="empty-state">
                  <i class="pi pi-percentage empty-icon" />
                  <p>Kupon kullanım kaydı yok.</p>
                </div>
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

            <!-- SATICI GEÇMİŞİ -->
            <template v-if="sellerRelated">
              <h2 class="section-title" style="margin-top: 2rem; margin-bottom: 0.5rem; font-size: 1.25rem; font-weight: 700; color: var(--text-strong);">Satıcı Geçmişi</h2>
              
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
                  <p class="summary-label">İncelemede Ürün</p>
                  <strong>{{ sellerRelated.summary.reviewProductCount }}</strong>
                </article>
                <article class="summary-card">
                  <p class="summary-label">Askıdaki Ürün</p>
                  <strong>{{ sellerRelated.summary.suspendedProductCount }}</strong>
                </article>
                <article class="summary-card">
                  <p class="summary-label">Stoksuz Ürün</p>
                  <strong>{{ sellerRelated.summary.outOfStockProductCount }}</strong>
                </article>
                <article class="summary-card">
                  <p class="summary-label">Toplam Satış</p>
                  <strong>{{ sellerRelated.summary.saleCount }}</strong>
                </article>
                <article class="summary-card">
                  <p class="summary-label">Tamamlanan Satış</p>
                  <strong>{{ sellerRelated.summary.completedSaleCount }}</strong>
                </article>
                <article class="summary-card">
                  <p class="summary-label">Benzersiz Alıcı</p>
                  <strong>{{ sellerRelated.summary.uniqueBuyerCount }}</strong>
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
                <article class="summary-card">
                  <p class="summary-label">Adres Sayısı</p>
                  <strong>{{ sellerRelated.summary.addressCount }}</strong>
                </article>
              </div>

              <!-- Only show Address block from sellerRelated if userRelated is NOT present -->
              <section v-if="!userRelated" class="record-block">
                <h3>Adresler</h3>
                <div v-if="sellerRelated.addresses.length === 0" class="empty-state">
                  <i class="pi pi-map-marker empty-icon" />
                  <p>Adres kaydı yok.</p>
                </div>
                <div v-else class="table-wrap">
                  <table class="detail-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Tip</th>
                        <th>Başlık</th>
                        <th>Ad Soyad</th>
                        <th>Telefon</th>
                        <th>Konum</th>
                        <th>Varsayılan</th>
                        <th>Tarih</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="address in sellerRelated.addresses" :key="address.id">
                        <td>{{ shortId(address.id) }}</td>
                        <td><span class="status-pill">{{ address.type }}</span></td>
                        <td>{{ address.title || '-' }}</td>
                        <td>{{ address.fullName || '-' }}</td>
                        <td>{{ address.phone || '-' }}</td>
                        <td>{{ `${address.city}/${address.district}` }}</td>
                        <td>
                          <span class="status-pill" :class="address.isDefault ? 'is-success' : 'is-muted'">
                            {{ address.isDefault ? 'EVET' : 'HAYIR' }}
                          </span>
                        </td>
                        <td>{{ formatDate(address.createdAt) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section class="record-block">
                <h3>Son Ürünler</h3>
                <div v-if="sellerRelated.products.length === 0" class="empty-state">
                  <i class="pi pi-box empty-icon" />
                  <p>Ürün kaydı yok.</p>
                </div>
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

              <!-- Only show sales block from sellerRelated if userRelated is NOT present (since userRelated.sales has pagination and loadMore) -->
              <section v-if="!userRelated" class="record-block">
                <h3>Son Satışlar</h3>
                <div v-if="sellerRelated.sales.length === 0" class="empty-state">
                  <i class="pi pi-money-bill empty-icon" />
                  <p>Satış kaydı yok.</p>
                </div>
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
                <div v-if="sellerRelated.auctions.length === 0" class="empty-state">
                  <i class="pi pi-clock empty-icon" />
                  <p>Müzayede kaydı yok.</p>
                </div>
                <div v-else class="table-wrap">
                  <table class="detail-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Ürün</th>
                        <th>Durum</th>
                        <th>Güncel Fiyat</th>
                        <th>Reserve</th>
                        <th>Reserve Durumu</th>
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
                        <td>{{ formatReserveLabel(auction.reservePrice) }}</td>
                        <td>{{ formatReserveState(auction.reservePrice, auction.reserveMet) }}</td>
                        <td>{{ auction.bidCount }}</td>
                        <td>{{ formatDate(auction.endTime) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <!-- Only show coupons block from sellerRelated if userRelated is NOT present (since userRelated.coupons.defined has pagination and loadMore) -->
              <section v-if="!userRelated" class="record-block">
                <h3>Son Kuponlar</h3>
                <div v-if="sellerRelated.coupons.length === 0" class="empty-state">
                  <i class="pi pi-ticket empty-icon" />
                  <p>Kupon kaydı yok.</p>
                </div>
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

              <!-- If userRelated IS loaded, we render the paginated Tanımlanan Kuponlar block here under Satıcı Geçmişi -->
              <section v-else class="record-block">
                <h3>Tanımlanan Kuponlar</h3>
                <div v-if="userRelated.coupons.defined.length === 0" class="empty-state">
                  <i class="pi pi-ticket empty-icon" />
                  <p>Tanımlı kupon yok.</p>
                </div>
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
                <h3>Satış Ödemeleri</h3>
                <div v-if="sellerRelated.payments.length === 0" class="empty-state">
                  <i class="pi pi-credit-card empty-icon" />
                  <p>Ödeme kaydı yok.</p>
                </div>
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
                <div v-if="sellerRelated.payouts.length === 0" class="empty-state">
                  <i class="pi pi-wallet empty-icon" />
                  <p>Ödeme talebi kaydı yok.</p>
                </div>
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
          </template>
          <template v-else-if="isProductResource && productRelated">
            <div class="summary-grid">
              <article class="summary-card">
                <div class="summary-card-header">
                  <span class="summary-icon-wrap"><i class="pi pi-shopping-bag" /></span>
                  <p class="summary-label">Toplam Sipariş</p>
                </div>
                <strong>{{ productRelated.summary.orderCount }}</strong>
              </article>
              <article class="summary-card">
                <div class="summary-card-header">
                  <span class="summary-icon-wrap"><i class="pi pi-check-circle" /></span>
                  <p class="summary-label">Tamamlanan Sipariş</p>
                </div>
                <strong>{{ productRelated.summary.completedOrderCount }}</strong>
              </article>
              <article class="summary-card">
                <div class="summary-card-header">
                  <span class="summary-icon-wrap"><i class="pi pi-users" /></span>
                  <p class="summary-label">Benzersiz Alıcı</p>
                </div>
                <strong>{{ productRelated.summary.buyerCount }}</strong>
              </article>
              <article class="summary-card">
                <div class="summary-card-header">
                  <span class="summary-icon-wrap"><i class="pi pi-money-bill" /></span>
                  <p class="summary-label">Toplam Ciro</p>
                </div>
                <strong>{{ formatMoney(productRelated.summary.grossSales, 'TRY') }}</strong>
              </article>
              <article class="summary-card">
                <div class="summary-card-header">
                  <span class="summary-icon-wrap"><i class="pi pi-heart" /></span>
                  <p class="summary-label">Favori</p>
                </div>
                <strong>{{ productRelated.summary.favoriteCount }}</strong>
              </article>
              <article class="summary-card">
                <div class="summary-card-header">
                  <span class="summary-icon-wrap"><i class="pi pi-shopping-cart" /></span>
                  <p class="summary-label">Sepet (Kalem/Adet)</p>
                </div>
                <strong>{{ productRelated.summary.cartLineCount }} / {{ productRelated.summary.cartQuantityTotal }}</strong>
              </article>
              <article class="summary-card">
                <div class="summary-card-header">
                  <span class="summary-icon-wrap"><i class="pi pi-clock" /></span>
                  <p class="summary-label">Müzayede (Aktif/Toplam)</p>
                </div>
                <strong>{{ productRelated.summary.activeAuctionCount }} / {{ productRelated.summary.auctionCount }}</strong>
              </article>
              <article class="summary-card">
                <div class="summary-card-header">
                  <span class="summary-icon-wrap"><i class="pi pi-tag" /></span>
                  <p class="summary-label">Teklif / Ödeme</p>
                </div>
                <strong>{{ productRelated.summary.bidCount }} / {{ productRelated.summary.paymentCount }}</strong>
              </article>
              <article class="summary-card">
                <div class="summary-card-header">
                  <span class="summary-icon-wrap"><i class="pi pi-comments" /></span>
                  <p class="summary-label">Sohbetler</p>
                </div>
                <strong>{{ productRelated.summary.negotiationCount || 0 }}</strong>
              </article>
            </div>

            <section class="record-block">
              <h3>Alıcılar</h3>
              <div v-if="productRelated.buyers.length === 0" class="empty-state">
                <i class="pi pi-users empty-icon" />
                <p>Kayıtlı alıcı bulunamadı.</p>
              </div>
              <div v-else class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>Alıcı</th>
                      <th>E-posta</th>
                      <th>Satın Alma Sayısı</th>
                      <th>Son Satın Alma</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="buyer in productRelated.buyers" :key="buyer.buyerId">
                      <td>
                        <button type="button" class="link-inline" @click="goToUserDetail(buyer.buyerId)">
                          {{ buyer.buyerName || shortId(buyer.buyerId) }}
                        </button>
                      </td>
                      <td>{{ buyer.buyerEmail || '-' }}</td>
                      <td>{{ buyer.purchaseCount }}</td>
                      <td>{{ buyer.latestPurchaseAt ? formatDate(buyer.latestPurchaseAt) : '-' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="record-block">
              <h3>Siparişler</h3>
              <div v-if="productRelated.orders.length === 0" class="empty-state">
                <i class="pi pi-shopping-bag empty-icon" />
                <p>Sipariş kaydı bulunamadı.</p>
              </div>
              <div v-else class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>Sipariş</th>
                      <th>Alıcı</th>
                      <th>Tutar</th>
                      <th>Durum</th>
                      <th>Emanet (Escrow)</th>
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
                          {{ order.buyerName || shortId(order.buyerId) }}
                        </button>
                      </td>
                      <td>{{ formatMoney(order.amount, order.currency) }}</td>
                      <td><span class="status-pill">{{ formatStatus(order.status) }}</span></td>
                      <td><span class="status-pill">{{ formatStatus(order.escrowStatus) }}</span></td>
                      <td>{{ formatDate(order.createdAt) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="record-block">
              <h3>Favoriler</h3>
              <div v-if="productRelated.favorites.length === 0" class="empty-state">
                <i class="pi pi-heart empty-icon" />
                <p>Favoriye ekleyen üye yok.</p>
              </div>
              <div v-else class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>Kullanıcı</th>
                      <th>Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="favorite in productRelated.favorites" :key="favorite.id">
                      <td>
                        <button type="button" class="link-inline" @click="goToUserDetail(favorite.userId)">
                          {{ favorite.userEmail || shortId(favorite.userId) }}
                        </button>
                      </td>
                      <td>{{ formatDate(favorite.createdAt) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="record-block">
              <h3>Alışveriş Sepetleri</h3>
              <div v-if="productRelated.cart.length === 0" class="empty-state">
                <i class="pi pi-shopping-cart empty-icon" />
                <p>Sepetinde tutan üye yok.</p>
              </div>
              <div v-else class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>Kullanıcı</th>
                      <th>Miktar</th>
                      <th>Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in productRelated.cart" :key="item.id">
                      <td>
                        <button type="button" class="link-inline" @click="goToUserDetail(item.userId)">
                          {{ item.userEmail || shortId(item.userId) }}
                        </button>
                      </td>
                      <td>{{ item.quantity }}</td>
                      <td>{{ formatDate(item.updatedAt) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="record-block">
              <h3>Müzayedeler</h3>
              <div v-if="productRelated.auctions.length === 0" class="empty-state">
                <i class="pi pi-clock empty-icon" />
                <p>Müzayede kaydı yok.</p>
              </div>
              <div v-else class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>Müzayede</th>
                      <th>Durum</th>
                      <th>Başlangıç Fiyatı</th>
                      <th>Anlık Fiyat</th>
                      <th>Teklif Sayısı</th>
                      <th>Bitiş Tarihi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="auction in productRelated.auctions" :key="auction.id">
                      <td>
                        <button type="button" class="link-inline" @click="goToAuctionDetail(auction.id)">
                          {{ auction.lotNumber ? `#${auction.lotNumber}` : shortId(auction.id) }}
                        </button>
                      </td>
                      <td><span class="status-pill">{{ formatStatus(auction.status) }}</span></td>
                      <td>{{ formatMoney(auction.startPrice, 'TRY') }}</td>
                      <td>{{ formatMoney(auction.currentPrice, 'TRY') }}</td>
                      <td>{{ auction.bidCount }}</td>
                      <td>{{ formatDate(auction.endTime) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="record-block">
              <h3>Teklifler</h3>
              <div v-if="productRelated.bids.length === 0" class="empty-state">
                <i class="pi pi-tag empty-icon" />
                <p>Teklif kaydı yok.</p>
              </div>
              <div v-else class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>Teklif ID</th>
                      <th>Müzayede</th>
                      <th>Teklif Veren</th>
                      <th>Tutar</th>
                      <th>Maksimum Tutar</th>
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
                      <td>{{ bid.maxAmount === null ? '-' : formatMoney(bid.maxAmount, 'TRY') }}</td>
                      <td><span class="status-pill">{{ formatStatus(bid.status) }}{{ bid.isWinningBid ? ' (Kazanan)' : '' }}</span></td>
                      <td>{{ formatDate(bid.createdAt) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="record-block">
              <h3>Ödemeler</h3>
              <div v-if="productRelated.payments.length === 0" class="empty-state">
                <i class="pi pi-credit-card empty-icon" />
                <p>Ödeme kaydı yok.</p>
              </div>
              <div v-else class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>Ödeme ID</th>
                      <th>Sipariş</th>
                      <th>Alıcı</th>
                      <th>Sağlayıcı</th>
                      <th>Tutar</th>
                      <th>Durum</th>
                      <th>Tarih</th>
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
                        <button type="button" class="link-inline" @click="goToOrderDetail(payment.orderId)">
                          {{ shortId(payment.orderId) }}
                        </button>
                      </td>
                      <td>
                        <button type="button" class="link-inline" @click="goToUserDetail(payment.buyerId)">
                          {{ payment.buyerEmail || shortId(payment.buyerId) }}
                        </button>
                      </td>
                      <td>{{ payment.provider }}</td>
                      <td>{{ formatMoney(payment.amount, payment.currency) }}</td>
                      <td><span class="status-pill">{{ formatStatus(payment.status) }}</span></td>
                      <td>{{ formatDate(payment.createdAt) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="record-block">
              <h3>İlişkili Sohbetler / Pazarlıklar</h3>
              <div v-if="productRelated.negotiations.length === 0" class="empty-state">
                <i class="pi pi-comments empty-icon" />
                <p>Bu ürünle ilgili sohbet kaydı yok.</p>
              </div>
              <div v-else class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>Sohbet No</th>
                      <th>Alıcı</th>
                      <th>Satıcı</th>
                      <th>Adet</th>
                      <th>Durum</th>
                      <th>Son Aktivite</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="neg in productRelated.negotiations" :key="neg.id">
                      <td>
                        <button type="button" class="link-inline" @click="goToNegotiationDetail(neg.id)">
                          #{{ shortId(neg.id) }}
                        </button>
                      </td>
                      <td>
                        <button type="button" class="link-inline" @click="goToUserDetail(neg.buyerId)">
                          {{ neg.buyerName }}
                        </button>
                      </td>
                      <td>
                        <button type="button" class="link-inline" @click="goToUserDetail(neg.sellerId)">
                          {{ neg.sellerName }}
                        </button>
                      </td>
                      <td>{{ neg.quantity }}</td>
                      <td><span class="status-pill">{{ formatStatus(neg.status) }}</span></td>
                      <td>{{ formatDate(neg.updatedAt) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </template>
          <template v-else-if="(isBidResource || isAuctionResource) && bidRelated">
            <div class="summary-grid">
              <article class="summary-card">
                <p class="summary-label">Toplam Teklif</p>
                <strong>{{ bidRelated.summary.totalBidCount }}</strong>
              </article>
              <article class="summary-card">
                <p class="summary-label">Katılımcı</p>
                <strong>{{ bidRelated.summary.uniqueBidderCount }}</strong>
              </article>
              <article class="summary-card">
                <p class="summary-label">En Yüksek Teklif</p>
                <strong>{{ formatMoney(bidRelated.summary.highestBidAmount, 'TRY') }}</strong>
              </article>
            </div>

            <section class="record-block">
              <h3>Satış Kaydı</h3>
              <div v-if="!bidRelated.order" class="empty-state">
                <i class="pi pi-shopping-bag empty-icon" />
                <p>Satış siparişi henüz oluşmamış.</p>
              </div>
              <div v-else class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>Sipariş</th>
                      <th>Alıcı</th>
                      <th>Satıcı</th>
                      <th>Tutar</th>
                      <th>Durum</th>
                      <th>Escrow</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <button type="button" class="link-inline" @click="goToOrderDetail(getString(bidRelated.order, 'id'))">
                          {{ shortId(getString(bidRelated.order, 'id')) }}
                        </button>
                      </td>
                      <td>{{ getString(bidRelated.order, 'buyerName') || shortId(getString(bidRelated.order, 'buyerId')) }}</td>
                      <td>{{ getString(bidRelated.order, 'sellerName') || shortId(getString(bidRelated.order, 'sellerId')) }}</td>
                      <td>{{ formatMoney(Number(getString(bidRelated.order, 'amount') || 0), getString(bidRelated.order, 'currency') || 'TRY') }}</td>
                      <td><span class="status-pill">{{ formatStatus(getString(bidRelated.order, 'status')) }}</span></td>
                      <td><span class="status-pill">{{ formatStatus(getString(bidRelated.order, 'escrowStatus')) }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="record-block">
              <h3>Ödeme Kaydı</h3>
              <div v-if="!bidRelated.payment" class="empty-state">
                <i class="pi pi-credit-card empty-icon" />
                <p>Ödeme kaydı henüz oluşmamış.</p>
              </div>
              <div v-else class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>Ödeme</th>
                      <th>Durum</th>
                      <th>Tutar</th>
                      <th>Sağlayıcı</th>
                      <th>Ödendi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <button type="button" class="link-inline" @click="goToPaymentDetail(getString(bidRelated.payment, 'id'))">
                          {{ shortId(getString(bidRelated.payment, 'id')) }}
                        </button>
                      </td>
                      <td><span class="status-pill">{{ formatStatus(getString(bidRelated.payment, 'status')) || '-' }}</span></td>
                      <td>{{ formatMoney(Number(getString(bidRelated.payment, 'amount') || 0), getString(bidRelated.payment, 'currency') || 'TRY') }}</td>
                      <td>{{ getString(bidRelated.payment, 'provider') || '-' }}</td>
                      <td>{{ getString(bidRelated.payment, 'paidAt') ? formatDate(getString(bidRelated.payment, 'paidAt')) : '-' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="record-block">
              <h3>Katılımcılar</h3>
              <div v-if="bidRelated.participants.length === 0" class="empty-state">
                <i class="pi pi-users empty-icon" />
                <p>Katılımcı yok.</p>
              </div>
              <div v-else class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>Kullanıcı</th>
                      <th>Teklif Adedi</th>
                      <th>En Yüksek Teklif</th>
                      <th>Son Teklif</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="participant in bidRelated.participants" :key="participant.bidderId">
                      <td>
                        <button type="button" class="link-inline" @click="goToUserDetail(participant.bidderId)">
                          {{ participant.bidderName || participant.bidderEmail || shortId(participant.bidderId) }}
                        </button>
                      </td>
                      <td>{{ participant.bidCount }}</td>
                      <td>{{ formatMoney(participant.highestBidAmount, 'TRY') }}</td>
                      <td>{{ formatDate(participant.latestBidAt) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="record-block">
              <h3>Teklif Geçmişi</h3>
              <div v-if="bidRelated.bids.length === 0" class="empty-state">
                <i class="pi pi-tag empty-icon" />
                <p>Teklif kaydı yok.</p>
              </div>
              <div v-else class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>Teklif</th>
                      <th>Kullanıcı</th>
                      <th>Tutar</th>
                      <th>Max</th>
                      <th>Durum</th>
                      <th>Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="bid in bidRelated.bids" :key="bid.id">
                      <td>{{ shortId(bid.id) }}</td>
                      <td>
                        <button type="button" class="link-inline" @click="goToUserDetail(bid.bidderId)">
                          {{ bid.bidderName || bid.bidderEmail || shortId(bid.bidderId) }}
                        </button>
                      </td>
                      <td>{{ formatMoney(bid.amount, 'TRY') }}</td>
                      <td>{{ bid.maxAmount === null ? '-' : formatMoney(bid.maxAmount, 'TRY') }}</td>
                      <td><span class="status-pill">{{ formatStatus(bid.status) }}{{ bid.isWinningBid ? ' (Kazanan)' : '' }}</span></td>
                      <td>{{ formatDate(bid.createdAt) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </template>
          <template v-else-if="isNegotiationResource && negotiationRelated">
            <section class="record-block">
              <h3>AI Güvenlik & Politika İhlal Kayıtları</h3>
              <div v-if="negotiationRelated.violations.length === 0" class="empty-state">
                <i class="pi pi-shield empty-icon" />
                <p>Bu sohbette güvenlik politikası ihlali veya AI engelleme kaydı bulunmuyor.</p>
              </div>
              <div v-else class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>Tarih</th>
                      <th>Kullanıcı</th>
                      <th>Gönderilmek İstenen</th>
                      <th>İhlal Türü</th>
                      <th>IP / Cihaz</th>
                      <th>Risk Skoru</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="violation in negotiationRelated.violations" :key="violation.id">
                      <td>{{ formatDate(violation.createdAt) }}</td>
                      <td>
                        <button type="button" class="link-inline" @click="goToUserDetail(violation.userId)">
                          {{ violation.userName || shortId(violation.userId) }}
                        </button>
                      </td>
                      <td class="text-danger">"{{ violation.attemptedContent }}"</td>
                      <td>
                        <span
                          v-for="vType in violation.violationTypes"
                          :key="vType"
                          class="status-pill is-danger"
                          style="margin-right: 4px;"
                        >
                          {{ vType }}
                        </span>
                      </td>
                      <td>
                        <div style="font-size: 0.85em;">
                          <div><strong>IP:</strong> {{ violation.ipAddress }}</div>
                          <div><strong>Cihaz:</strong> {{ violation.deviceId }}</div>
                        </div>
                      </td>
                      <td>
                        <span
                          class="status-pill"
                          :class="violation.aiRiskScore >= 0.8 ? 'is-danger' : 'is-warning'"
                        >
                          %{{ Math.round(violation.aiRiskScore * 100) }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </template>
          <template v-else-if="isAuditResource">
            <section class="record-block">
              <h3>Önceki Durum</h3>
              <pre class="json-box">{{ pretty(relatedRecords.before ?? {}) }}</pre>
            </section>
            <section class="record-block">
              <h3>Sonraki Durum</h3>
              <pre class="json-box">{{ pretty(relatedRecords.after ?? {}) }}</pre>
            </section>
            <section class="record-block">
              <h3>Ek Bilgiler</h3>
              <pre class="json-box">{{ pretty(relatedRecords.metadata ?? {}) }}</pre>
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
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { getAuctionSocket, disconnectAuctionSocket } from '../../services/socket';
import AdminDrawerForm, {
  type DrawerConfirmPayload,
  type DrawerField,
} from '../../components/AdminDrawerForm.vue';
import AdminAuditTimeline, { type AuditEvent } from '../../components/AdminAuditTimeline.vue';
import type { AdminTableAction } from '../../components/AdminDataTable.vue';
import { adminApi, toApiMessage, type ApiEnvelope, type ApiListResponse } from '../../services/api';

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

interface UserAddressItem {
  id: string;
  type: string;
  title: string;
  fullName: string;
  phone: string;
  city: string;
  district: string;
  neighborhood: string | null;
  addressLine: string;
  postalCode: string | null;
  country: string;
  isDefault: boolean;
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
    addressCount: number;
    definedCouponCount: number;
    couponUsageCount: number;
  };
  orders: UserOrderItem[];
  sales: UserOrderItem[];
  addresses: UserAddressItem[];
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
  reservePrice: number | null;
  reserveMet: boolean;
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

interface SellerAddressItem {
  id: string;
  type: string;
  title: string;
  fullName: string;
  phone: string;
  city: string;
  district: string;
  neighborhood: string | null;
  addressLine: string;
  postalCode: string | null;
  country: string;
  isDefault: boolean;
  createdAt: string;
}

interface SellerRelatedRecords {
  summary: {
    productCount: number;
    activeProductCount: number;
    draftProductCount: number;
    reviewProductCount: number;
    suspendedProductCount: number;
    outOfStockProductCount: number;
    saleCount: number;
    completedSaleCount: number;
    uniqueBuyerCount: number;
    grossMerchandiseValue: number;
    auctionCount: number;
    activeAuctionCount: number;
    couponCount: number;
    payoutRequestCount: number;
    pendingPayoutCount: number;
    adminReviewPaymentCount: number;
    addressCount: number;
  };
  products: SellerProductItem[];
  sales: UserOrderItem[];
  auctions: SellerAuctionItem[];
  payouts: SellerPayoutItem[];
  coupons: SellerCouponItem[];
  payments: SellerPaymentItem[];
  addresses: SellerAddressItem[];
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
  maxAmount: number | null;
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

interface ProductNegotiationItem {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  status: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
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
    negotiationCount: number;
  };
  orders: ProductOrderItem[];
  buyers: ProductBuyerItem[];
  favorites: ProductFavoriteItem[];
  cart: ProductCartItem[];
  auctions: SellerAuctionItem[];
  bids: ProductBidItem[];
  payments: ProductPaymentItem[];
  negotiations: ProductNegotiationItem[];
}

interface BidAuctionOverview {
  auctionId: string;
  status: string;
  lotNumber: string | null;
  productId: string;
  productTitle: string;
  sellerId: string;
  sellerName: string;
  winnerId: string | null;
  winnerName: string;
  startPrice: number;
  currentPrice: number;
  reservePrice: number | null;
  reserveMet: boolean;
  minIncrement: number;
  bidCount: number;
  startTime: string;
  endTime: string;
  createdAt: string;
}

interface BidAuctionSummary {
  totalBidCount: number;
  uniqueBidderCount: number;
  highestBidAmount: number;
  winningBidAmount: number;
  winningBidderName: string;
  lastBidAt: string | null;
  hasOrder: boolean;
  hasPayment: boolean;
}

interface BidAuctionParticipant {
  bidderId: string;
  bidderName: string;
  bidderEmail: string;
  bidCount: number;
  highestBidAmount: number;
  latestBidAt: string;
}

interface BidAuctionBid {
  id: string;
  bidderId: string;
  bidderName: string;
  bidderEmail: string;
  amount: number;
  maxAmount: number | null;
  status: string;
  isWinningBid: boolean;
  createdAt: string;
}

interface BidAuctionRelatedRecords {
  summary: BidAuctionSummary;
  auction: Record<string, unknown>;
  product: Record<string, unknown> | null;
  seller: Record<string, unknown> | null;
  winner: Record<string, unknown> | null;
  order: Record<string, unknown> | null;
  payment: Record<string, unknown> | null;
  participants: BidAuctionParticipant[];
  bids: BidAuctionBid[];
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
const activeTab = ref<DetailTab>('Genel Bakış');
const loading = ref(false);
const error = ref<string | null>(null);
const overview = ref<Record<string, unknown>>({});
const timeline = ref<TimelineEvent[]>([]);
const relatedRecords = ref<Record<string, unknown>>({});
const userRelated = ref<UserRelatedRecords | null>(null);
const sellerRelated = ref<SellerRelatedRecords | null>(null);
const productRelated = ref<ProductRelatedRecords | null>(null);
const bidRelated = ref<BidAuctionRelatedRecords | null>(null);
const negotiationRelated = ref<{
  messages: Array<{
    id: string;
    senderId: string | null;
    senderName: string;
    type: string;
    content: string;
    isSystem: boolean;
    isViolation: boolean;
    metadata: Record<string, unknown>;
    createdAt: string;
  }>;
  violations: Array<{
    id: string;
    userId: string;
    userName: string;
    attemptedContent: string;
    violationTypes: string[];
    ipAddress: string;
    deviceId: string;
    aiRiskScore: number;
    aiReason: string;
    aiShouldBlock: boolean;
    createdAt: string;
  }>;
} | null>(null);
const auditTarget = ref<{ targetType: string; targetId: string } | null>(null);
const auditEvents = ref<AuditEvent[]>([]);
const drawerOpen = ref(false);
const selectedAction = ref<ActionConfig | null>(null);
const categoryParentOptions = ref<{ label: string; value: string }[]>([]);
const variationOptions = ref<{ label: string; value: string; kind?: string }[]>([]);
const listingTemplatesOptions = ref<{ label: string; value: string }[]>([]);
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

function getCategoryListingTemplate(row: Record<string, unknown> | null): Record<string, unknown> {
  if (!row) return { fields: [], variant: { enabled: false, allowedKinds: [], requiredKinds: [], maxGroups: 0 } };
  const meta = row.metadata as Record<string, unknown> | undefined;
  if (!meta || !meta.listingTemplate) return { fields: [], variant: { enabled: false, allowedKinds: [], requiredKinds: [], maxGroups: 0 } };
  return meta.listingTemplate as Record<string, unknown>;
}

function getCategoryTemplateId(row: Record<string, unknown> | null): string {
  if (!row) return '';
  const meta = row.metadata as Record<string, unknown> | undefined;
  return meta && typeof meta.templateId === 'string' ? meta.templateId : '';
}

function getCategoryIsCulturalAsset(row: Record<string, unknown> | null): string {
  if (!row) return 'false';
  const val = row.isCulturalAsset;
  return val === true || val === 'true' ? 'true' : 'false';
}

const categoryFields = (row: Record<string, unknown>): DrawerField[] => [
  { key: 'name', label: 'Ad', required: true, value: getString(row, 'name') },
  { key: 'slug', label: 'Kısa ad', value: getString(row, 'slug') },
  { key: 'description', label: 'Açıklama', type: 'textarea', value: getString(row, 'description') },
  { key: 'imageUrl', label: 'Görsel URL', value: getString(row, 'imageUrl') },
  {
    key: 'parentId',
    label: 'Üst kategori',
    type: 'select',
    value: getString(row, 'parentId'),
    options: categoryParentOptions.value,
  },
  {
    key: 'isCommunicationEnabled',
    label: 'İletişim Aktif mi?',
    type: 'select',
    value: getCategoryCommunicationEnabled(row),
    options: [
      { label: 'Evet (Alıcı ve satıcı mesajlaşabilir)', value: 'true' },
      { label: 'Hayır (Mesajlaşma kapalı)', value: 'false' },
    ],
  },
  {
    key: 'isCulturalAsset',
    label: 'Kültürel Varlık mı?',
    type: 'select',
    value: getCategoryIsCulturalAsset(row),
    options: [
      { label: 'Evet (Kültürel Varlık Kapsamında)', value: 'true' },
      { label: 'Hayır (Normal Kategori)', value: 'false' },
    ],
  },
  { key: 'sortOrder', label: 'Sıralama', type: 'number', value: getString(row, 'sortOrder') },
  {
    key: 'variationOptionIds',
    label: 'Bağlı varyasyonlar',
    type: 'multiselect',
    value: getCategoryVariationOptionIds(row),
    options: variationOptions.value,
  },
  {
    key: 'listingTemplate',
    label: 'Dinamik İlan Şablon Alanları',
    type: 'template_editor',
    value: getCategoryListingTemplate(row),
  },
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

const sellerStatusOptions = [
  { label: 'Beklemede', value: 'PENDING' },
  { label: 'Onaylandı', value: 'APPROVED' },
  { label: 'Askıda', value: 'SUSPENDED' },
  { label: 'Sonlandırıldı', value: 'TERMINATED' },
];

const sellerFields = (row: Record<string, unknown>): DrawerField[] => [
  { key: 'businessName', label: 'Mağaza / İşletme Adı', required: true, value: getString(row, 'businessName') },
  { key: 'phone', label: 'Telefon', value: getString(row, 'phone') },
  { key: 'taxOffice', label: 'Vergi Dairesi', value: getString(row, 'taxOffice') },
  { key: 'taxNumber', label: 'Vergi Numarası', value: getString(row, 'taxNumber') },
  { key: 'commissionRate', label: 'Komisyon Oranı', type: 'number', value: getString(row, 'commissionRate') },
  {
    key: 'status',
    label: 'Durum',
    type: 'select',
    value: getString(row, 'status') || 'PENDING',
    options: sellerStatusOptions,
  },
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
      when: (row) => String(row.isActive ?? '').toLowerCase() !== 'false',
    },
    {
      key: 'reactivate',
      label: 'Yeniden etkinleştir',
      icon: 'pi pi-check-circle',
      tone: 'primary',
      method: 'patch',
      path: (id) => `/admin/users/${id}/reactivate`,
      when: (row) => String(row.isActive ?? '').toLowerCase() === 'false',
    },
  ],
  sellers: [
    {
      key: 'editSeller',
      label: 'Düzenle',
      icon: 'pi pi-pencil',
      tone: 'primary',
      method: 'patch',
      path: (id) => `/admin/sellers/${id}`,
      fields: sellerFields,
      confirmLabel: 'Satıcı güncelle',
    },
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
      presentation: 'modal',
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
  const list: ActionConfig[] = [];

  // Core Resource Actions
  const coreActions = actionConfigs[props.resource] ?? [];
  coreActions.forEach((action) => {
    if (!action.when || action.when(overview.value)) {
      list.push(action);
    }
  });

  // Auxiliary Resource Actions (User/Seller merge)
  if (isUserResource.value) {
    const sellerProfile = overview.value.sellerProfile as Record<string, unknown> | null;
    if (sellerProfile) {
      const sellerActions = actionConfigs.sellers ?? [];
      sellerActions.forEach((action) => {
        if (!action.when || action.when(sellerProfile)) {
          list.push(action);
        }
      });
    }
  } else if (isSellerResource.value) {
    const user = overview.value.user as Record<string, unknown> | null;
    if (user) {
      const userActions = actionConfigs.users ?? [];
      userActions.forEach((action) => {
        if (!action.when || action.when(user)) {
          list.push(action);
        }
      });
    }
  }

  return list;
});
const drawerTitle = computed(() => selectedAction.value?.label ?? 'Yönetici işlemi');
const drawerFields = computed(() => {
  if (!selectedAction.value?.fields) return [];
  let targetRow = overview.value;
  if (isUserResource.value && (selectedAction.value.key === 'editSeller' || selectedAction.value.key === 'approve' || selectedAction.value.key === 'reject')) {
    targetRow = (overview.value.sellerProfile as Record<string, unknown>) ?? overview.value;
  } else if (isSellerResource.value && (selectedAction.value.key === 'restrict' || selectedAction.value.key === 'reactivate')) {
    targetRow = (overview.value.user as Record<string, unknown>) ?? overview.value;
  }
  return selectedAction.value.fields(targetRow);
});
const drawerConfirmLabel = computed(() => selectedAction.value?.confirmLabel ?? 'Onayla');
const drawerPresentation = computed(() => selectedAction.value?.presentation ?? 'drawer');
const drawerPageSize = computed(() => selectedAction.value?.pageSize ?? 0);
const endpoint = computed(() => `/admin/${props.resource}/${props.id}`);
const isUserResource = computed(() => props.resource === 'users');
const isSellerResource = computed(() => props.resource === 'sellers');
const isProductResource = computed(() => props.resource === 'products');
const isOrderResource = computed(() => props.resource === 'orders');
const isBidResource = computed(() => props.resource === 'bids');
const isAuctionResource = computed(() => props.resource === 'auctions');
const isAuditResource = computed(() => props.resource === 'audit-logs');
const isNegotiationResource = computed(() => props.resource === 'negotiations');
const isCategoryResource = computed(() => props.resource === 'categories');
const tabs = computed<DetailTab[]>(() => {
  const list: DetailTab[] = ['Genel Bakış'];

  if (timeline.value.length > 0) {
    list.push('Zaman Çizelgesi');
  }

  const hasRelated = isUserResource.value ||
                    isSellerResource.value ||
                    isProductResource.value ||
                    isAuctionResource.value ||
                    isBidResource.value ||
                    (isNegotiationResource.value && negotiationRelated.value && (negotiationRelated.value.messages.length > 0 || negotiationRelated.value.violations.length > 0));
  if (hasRelated) {
    list.push('İlgili Kayıtlar');
  }

  list.push('Denetim');
  return list;
});
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

function getNullableNumber(row: Record<string, unknown>, key: string): number | null {
  const value = row[key];
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getBoolean(row: Record<string, unknown>, key: string): boolean {
  const value = row[key];
  return value === true || value === 'true';
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

function getCategoryCommunicationEnabled(row: Record<string, unknown> | null): string {
  const metadata = row?.metadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return 'false';
  }
  const enabled = (metadata as Record<string, unknown>).isCommunicationEnabled;
  return enabled === true || enabled === 'true' ? 'true' : 'false';
}

function getCategoryVariationOptionIds(row: Record<string, unknown>): string[] {
  const metadata = row.metadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return [];
  }
  const ids = (metadata as Record<string, unknown>).variationOptionIds;
  if (!Array.isArray(ids)) return [];
  return ids.map((item) => String(item ?? '').trim()).filter((item) => item.length > 0);
}

function getCategoryParentPath(parentId: string | null): string {
  if (!parentId || parentId.trim() === '') return 'Yok (Kök Kategori)';
  const found = categoryParentOptions.value.find(opt => opt.value === parentId);
  return found ? found.label : parentId;
}

function getVariationName(varId: string): string {
  const found = variationOptions.value.find(opt => opt.value === varId);
  return found ? found.label : varId;
}

interface ListingField {
  key: string;
  type: string;
  required?: boolean;
  options?: string[];
}

function getCategoryListingFields(row: Record<string, unknown> | null): ListingField[] {
  const metadata = row?.metadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return [];
  }
  const listingTemplate = (metadata as Record<string, unknown>).listingTemplate;
  if (!listingTemplate || typeof listingTemplate !== 'object' || Array.isArray(listingTemplate)) {
    return [];
  }
  const fields = (listingTemplate as Record<string, unknown>).fields;
  if (!Array.isArray(fields)) return [];
  return fields as ListingField[];
}

function getFieldTypeLabel(type: string): string {
  const translations: Record<string, string> = {
    text: 'Metin',
    number: 'Sayı',
    select: 'Seçim Kutusu',
    dimension: 'Boyut / Ebat',
    image: 'Görsel',
    textarea: 'Uzun Metin',
    date: 'Tarih',
  };
  return translations[type.toLowerCase()] ?? type.toUpperCase();
}

function getFieldLabel(key: string): string {
  const translations: Record<string, string> = {
    brand: 'Marka',
    condition: 'Durum',
    sku: 'Stok Kodu (SKU)',
    price: 'Fiyat',
    stock: 'Stok Adedi',
    color: 'Renk',
    size: 'Beden / Ebat',
    material: 'Malzeme',
    fabric_type: 'Kumaş Türü',
    fabrictype: 'Kumaş Türü',
    material_type: 'Malzeme Türü',
    materialtype: 'Malzeme Türü',
    origin: 'Menşei',
    weight: 'Ağırlık / Kütle',
    dimensions: 'Boyutlar',
    productiondate: 'Üretim Tarihi',
    warranty: 'Garanti Süresi',
    shipping: 'Kargo Detayı',
    model: 'Model',
    year: 'Yıl',
    grade: 'Derece / Sınıf',
    authenticity: 'Orijinallik Belgesi',
    author: 'Yazar / Sanatçı',
    medium: 'Yapım Tekniği',
    publisher: 'Yayınevi',
    isbn: 'ISBN',
    page_count: 'Sayfa Sayısı',
    pagecount: 'Sayfa Sayısı',
    format: 'Format / Biçim',
    language: 'Dil',
    artist: 'Sanatçı',
    height: 'Yükseklik',
    width: 'Genişlik',
    depth: 'Derinlik',
    diameter: 'Çap',
    thickness: 'Kalınlık',
    volume: 'Hacim',
    capacity: 'Kapasite',
    power: 'Güç',
    voltage: 'Voltaj',
    fuel_type: 'Yakıt Tipi',
    fueltype: 'Yakıt Tipi',
    transmission: 'Şanzıman',
    engine_power: 'Motor Gücü',
    enginepower: 'Motor Gücü',
    engine_size: 'Motor Hacmi',
    enginesize: 'Motor Hacmi',
    mileage: 'Kilometre (Km)',
    body_type: 'Kasa Tipi',
    bodytype: 'Kasa Tipi',
    gear: 'Vites',
    room_count: 'Oda Sayısı',
    roomcount: 'Oda Sayısı',
    square_meters: 'Metrekare (m²)',
    squaremeters: 'Metrekare (m²)',
    floor: 'Bulunduğu Kat',
    heating: 'Isıtma',
    furnished: 'Eşyalı mı?',
    title_deed: 'Tapu Durumu',
    titledeed: 'Tapu Durumu',
    using_status: 'Kullanım Durumu',
    usingstatus: 'Kullanım Durumu',
    certifications: 'Sertifikalar / Belgeler',
    certification: 'Sertifikalar / Belgeler',
  };
  
  const normalizedKey = key.toLowerCase().replace(/_/g, '').replace(/-/g, '');
  return translations[key.toLowerCase()] ?? translations[normalizedKey] ?? key;
}

function normalizeCategoryRows(loadedRows: Record<string, unknown>[]): Record<string, unknown>[] {
  const byId = new Map<string, Record<string, unknown>>();
  loadedRows.forEach((row) => {
    const id = getString(row, 'id');
    if (id) byId.set(id, row);
  });

  const buildPath = (row: Record<string, unknown>): string => {
    const labels: string[] = [];
    const visited = new Set<string>();
    let cursor: Record<string, unknown> | undefined = row;
    while (cursor) {
      const cursorId = getString(cursor, 'id');
      if (!cursorId || visited.has(cursorId)) break;
      visited.add(cursorId);
      labels.unshift(getString(cursor, 'name') || getString(cursor, 'slug') || cursorId);
      const parentId = getString(cursor, 'parentId');
      cursor = parentId ? byId.get(parentId) : undefined;
    }
    return labels.join(' > ');
  };

  return loadedRows
    .map((row) => ({
      ...row,
      categoryPath: buildPath(row),
    }))
    .sort((left, right) =>
      String(left.categoryPath ?? '').localeCompare(String(right.categoryPath ?? ''), 'tr'),
    );
}

function openAction(action: AdminTableAction) {
  selectedAction.value = action as ActionConfig;
  drawerOpen.value = true;
  if (props.resource === 'categories' && variationOptions.value.length === 0) {
    void loadVariationOptions();
  }
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

  let targetId = props.id;
  if (isSellerResource.value && (selectedAction.value.key === 'restrict' || selectedAction.value.key === 'reactivate')) {
    const userId = overview.value.userId || (overview.value.user as any)?.id;
    if (userId) targetId = String(userId);
  } else if (isUserResource.value && (selectedAction.value.key === 'approve' || selectedAction.value.key === 'reject' || selectedAction.value.key === 'editSeller')) {
    const sellerId = (overview.value.sellerProfile as any)?.id;
    if (sellerId) targetId = String(sellerId);
  }

  try {
    if (selectedAction.value.method === 'delete') {
      await adminApi.delete(selectedAction.value.path(targetId), { data: body });
    } else if (selectedAction.value.method === 'post') {
      await adminApi.post(selectedAction.value.path(targetId), body);
    } else {
      await adminApi.patch(selectedAction.value.path(targetId), body);
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

function formatStatus(status: unknown): string {
  const s = String(status ?? '').toUpperCase().trim();
  const translations: Record<string, string> = {
    DRAFT: 'TASLAK',
    PUBLISHED: 'YAYINLANDI',
    ACTIVE: 'AKTİF',
    ENDED: 'BİTTİ',
    COMPLETED: 'TAMAMLANDI',
    CANCELLED: 'İPTAL EDİLDİ',
    OUTBID: 'GEÇİLDİ',
    WITHDRAWN: 'GERİ ÇEKİLDİ',
    CREATED: 'OLUŞTURULDU',
    PROCESSING: 'HAZIRLANIYOR',
    SHIPPED: 'KARGODA',
    DELIVERED: 'TESLİM EDİLDİ',
    ADMIN_REVIEW: 'İNCELENİYOR',
    HELD: 'BLOKEDE',
    RELEASED: 'SERBEST',
    CAPTURED: 'ÇEKİLDİ',
    REFUNDED: 'İADE EDİLDİ',
    PAID: 'ÖDENDİ',
    PENDING: 'BEKLEMEDE',
    FAILED: 'BAŞARISIZ',
    NONE: 'YOK',
    OPEN: 'AÇIK',
    NEGOTIATING: 'GÖRÜŞÜLÜYOR',
    OFFER_PENDING: 'TEKLİF BEKLİYOR',
    ACCEPTED: 'KABUL EDİLDİ',
    PAYMENT_PENDING: 'ÖDEME BEKLİYOR',
    EXPIRED: 'SÜRESİ DOLDU',
  };
  return translations[s] ?? s;
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

function auditActionLabel(action: string): string {
  const labels: Record<string, string> = {
    SELLER_APPROVED: 'Satıcı onaylandı',
    SELLER_REJECTED: 'Satıcı reddedildi',
    USER_RESTRICTED: 'Üye kısıtlandı',
    USER_REACTIVATED: 'Üye yeniden etkinleştirildi',
    PRODUCT_REMOVED: 'Ürün yayından kaldırıldı',
    AUCTION_CANCELLED: 'Müzayede iptal edildi',
    ORDER_MARKED_ADMIN_REVIEW: 'Sipariş incelemeye alındı',
    PAYMENT_MARKED_ADMIN_REVIEW: 'Ödeme incelemeye alındı',
    CATEGORY_CREATED: 'Kategori oluşturuldu',
    CATEGORY_UPDATED: 'Kategori güncellendi',
    CATEGORY_DELETED: 'Kategori devre dışı bırakıldı',
    BRAND_CREATED: 'Marka oluşturuldu',
    BRAND_UPDATED: 'Marka güncellendi',
    BRAND_DELETED: 'Marka devre dışı bırakıldı',
    PAYOUT_APPROVED: 'Ödeme talebi onaylandı',
    PAYOUT_REJECTED: 'Ödeme talebi reddedildi',
    ADMIN_LOGIN: 'Yönetici girişi',
    SETTING_UPDATED: 'Ayar güncellendi',
    NEGOTIATION_VIEWED: 'Pazarlık kaydı görüntülendi',
    TRUST_REVIEWED: 'Güven değerlendirmesi yapıldı',
    AD_APPROVED: 'İlan onaylandı',
    AD_REJECTED: 'İlan reddedildi',
  };

  if (labels[action]) return labels[action];
  if (!action) return '-';
  return action
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

function auditTargetLabel(targetType: string): string {
  const labels: Record<string, string> = {
    USER: 'Üye',
    SELLER: 'Satıcı',
    PRODUCT: 'Ürün',
    AUCTION: 'Müzayede',
    ORDER: 'Sipariş',
    PAYMENT: 'Ödeme',
    CATEGORY: 'Kategori',
    BRAND: 'Marka',
    ADMIN: 'Yönetici',
    BID: 'Teklif',
    PAYOUT_REQUEST: 'Ödeme talebi',
  };
  return labels[targetType] ?? (targetType || 'Kayıt');
}

function auditActorLabel(record: Record<string, unknown>): string {
  const actorAdminId = getString(record, 'actorAdminId');
  const actorRolesRaw = record.actorRoles;
  const roles = Array.isArray(actorRolesRaw) ? actorRolesRaw.map(String) : [];
  const roleLabel = roles[0] ? roles[0].replace(/_/g, ' ') : 'Yönetici';
  return `${roleLabel} (${shortId(actorAdminId)})`;
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
    addresses: candidate.addresses ?? [],
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
    !Array.isArray(candidate.payments) ||
    !Array.isArray(candidate.addresses)
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
    addresses: candidate.addresses,
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
    !Array.isArray(candidate.payments) ||
    !Array.isArray(candidate.negotiations)
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
    negotiations: candidate.negotiations,
  };
}

function normalizeBidRelated(candidate: Partial<BidAuctionRelatedRecords>): BidAuctionRelatedRecords | null {
  if (
    !candidate.summary ||
    !Array.isArray(candidate.participants) ||
    !Array.isArray(candidate.bids)
  ) {
    return null;
  }
  return {
    summary: candidate.summary,
    auction: candidate.auction ?? {},
    product: candidate.product ?? null,
    seller: candidate.seller ?? null,
    winner: candidate.winner ?? null,
    order: candidate.order ?? null,
    payment: candidate.payment ?? null,
    participants: candidate.participants,
    bids: candidate.bids,
  };
}

function formatReserveLabel(reservePrice: number | null | undefined): string {
  if (reservePrice === null || reservePrice === undefined) {
    return 'Yok';
  }
  return formatMoney(reservePrice, 'TRY');
}

function formatReserveState(
  reservePrice: number | null | undefined,
  reserveMet: boolean | null | undefined,
): string {
  if (reservePrice === null || reservePrice === undefined) {
    return 'Yok';
  }
  return reserveMet ? 'Karşılandı' : 'Karşılanmadı';
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

function goToSellerDetail(sellerId: string): void {
  if (!sellerId) return;
  void router.push(`/sellers/${sellerId}`);
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

function goToNegotiationDetail(negotiationId: string): void {
  if (!negotiationId) return;
  void router.push(`/negotiations/${negotiationId}`);
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

async function loadCategoryParentOptions() {
  if (props.resource !== 'categories') return;
  try {
    const response = await adminApi.get<ApiListResponse>('/admin/categories', {
      params: { page: 1, limit: 100 },
    });
    const categoryRows = Array.isArray(response.data.items) ? response.data.items : [];
    const normalizedRows = normalizeCategoryRows(categoryRows);
    categoryParentOptions.value = normalizedRows.map((item) => ({
      label: String(item.categoryPath ?? item.name ?? item.slug ?? item.id ?? 'Kategori'),
      value: String(item.id ?? ''),
    }));
  } catch {
    categoryParentOptions.value = [];
  }
}

async function loadVariationOptions() {
  if (props.resource !== 'categories') return;
  try {
    const response = await adminApi.get<ApiListResponse>('/admin/variants/numbers', {
      params: { page: 1, limit: 200 },
    });
    const items = Array.isArray(response.data.items) ? response.data.items : [];
    variationOptions.value = items
      .filter((item) => String(item.status ?? 'ACTIVE') === 'ACTIVE')
      .map((item) => ({
        label: `${String(item.nameTr ?? item.nameEn ?? item.id ?? 'Varyasyon')} (${String(item.kind ?? '-')})`,
        value: String(item.id ?? ''),
        kind: String(item.kind ?? ''),
      }));
  } catch (err) {
    console.error('Failed to load variation options:', err);
    variationOptions.value = [];
  }
}

async function loadListingTemplatesOptions() {
  if (props.resource !== 'categories') return;
  try {
    const response = await adminApi.get<ApiListResponse>('/admin/listing-templates', {
      params: { page: 1, limit: 100 },
    });
    const items = Array.isArray(response.data.items) ? response.data.items : [];
    listingTemplatesOptions.value = items.map((item) => ({
      label: String(item.name ?? 'İsimsiz Şablon'),
      value: String(item.id ?? ''),
    }));
  } catch (err) {
    console.error('Failed to load listing template options:', err);
    listingTemplatesOptions.value = [];
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
      if (relatedRecords.value.sellerSummary) {
        sellerRelated.value = normalizeSellerRelated({
          summary: relatedRecords.value.sellerSummary as any,
          products: relatedRecords.value.products as any,
          sales: relatedRecords.value.sales as any,
          auctions: relatedRecords.value.auctions as any,
          payouts: relatedRecords.value.payouts as any,
          coupons: (relatedRecords.value.coupons as any)?.defined ?? [],
          payments: relatedRecords.value.payments as any,
          addresses: relatedRecords.value.addresses as any,
        });
      } else {
        sellerRelated.value = null;
      }
      productRelated.value = null;
      bidRelated.value = null;
    } else if (isSellerResource.value && relatedRecords.value && typeof relatedRecords.value === 'object') {
      sellerRelated.value = normalizeSellerRelated(relatedRecords.value as Partial<SellerRelatedRecords>);
      if (relatedRecords.value.userSummary) {
        userRelated.value = normalizeUserRelated({
          summary: relatedRecords.value.userSummary as any,
          orders: relatedRecords.value.orders as any,
          sales: relatedRecords.value.sales as any,
          addresses: relatedRecords.value.addresses as any,
          favorites: relatedRecords.value.favorites as any,
          cart: relatedRecords.value.cart as any,
          coupons: {
            defined: [],
            usage: relatedRecords.value.couponUsage as any,
          },
          pagination: {
            orders: toDefaultPagination(),
            sales: toDefaultPagination(),
            favorites: toDefaultPagination(),
            cart: toDefaultPagination(),
            couponDefinitions: toDefaultPagination(),
            couponUsage: toDefaultPagination(),
          },
        });
      } else {
        userRelated.value = null;
      }
      productRelated.value = null;
      bidRelated.value = null;
    } else if (isProductResource.value && relatedRecords.value && typeof relatedRecords.value === 'object') {
      productRelated.value = normalizeProductRelated(relatedRecords.value as Partial<ProductRelatedRecords>);
      userRelated.value = null;
      sellerRelated.value = null;
      bidRelated.value = null;
    } else if ((isBidResource.value || isAuctionResource.value) && relatedRecords.value && typeof relatedRecords.value === 'object') {
      bidRelated.value = normalizeBidRelated(relatedRecords.value as Partial<BidAuctionRelatedRecords>);
      userRelated.value = null;
      sellerRelated.value = null;
      productRelated.value = null;
      negotiationRelated.value = null;
    } else if (isNegotiationResource.value && relatedRecords.value && typeof relatedRecords.value === 'object') {
      negotiationRelated.value = relatedRecords.value as any;
      userRelated.value = null;
      sellerRelated.value = null;
      productRelated.value = null;
      bidRelated.value = null;
    } else {
      userRelated.value = null;
      sellerRelated.value = null;
      productRelated.value = null;
      bidRelated.value = null;
      negotiationRelated.value = null;
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
    void loadCategoryParentOptions();
    void loadVariationOptions();
    void loadListingTemplatesOptions();
    void loadDetail();
    setupSocketConnection();
  },
);

let activeSocket: any = null;

function setupSocketConnection() {
  cleanupSocketConnection();

  if (props.resource !== 'auctions' || !props.id) return;

  activeSocket = getAuctionSocket();
  activeSocket.emit('auction:join', { auctionId: props.id });

  activeSocket.on('bid:new', (data: any) => {
    console.log('[Admin Socket] bid:new received for auction', data);
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
    activeSocket.off('bid:new');
    activeSocket.off('auction:extended');
    activeSocket.off('auction:ended');
    activeSocket = null;
  }
  disconnectAuctionSocket();
}

onMounted(() => {
  loadDetail();
  setupSocketConnection();
});
onMounted(loadCategoryParentOptions);
onMounted(loadVariationOptions);
onMounted(loadListingTemplatesOptions);

onUnmounted(cleanupSocketConnection);
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
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.summary-card {
  position: relative;
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.summary-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--brand-500), #60a5fa);
  opacity: 0.8;
}

.summary-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  border-color: var(--brand-500);
}

.summary-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.summary-icon-wrap {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--brand-100);
  color: var(--brand-600);
}

.summary-icon-wrap i {
  font-size: 14px;
}

.summary-label {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
}

.summary-card strong {
  color: var(--text-strong);
  font-size: 22px;
  font-weight: 700;
  font-family: 'Manrope', sans-serif;
}

.record-block {
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  padding: 20px;
  background: #ffffff;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
  margin-bottom: 20px;
}

.record-block h3 {
  margin: 0 0 14px;
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 8px;
}

.record-block h3::before {
  content: '';
  display: inline-block;
  width: 4px;
  height: 16px;
  background: var(--brand-500);
  border-radius: 2px;
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

/* Category Specific Styles */
.category-hero-title-area {
  display: flex;
  align-items: center;
  gap: 16px;
}

.category-hero-img-wrap {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background: var(--bg-soft);
}

.category-hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.category-hero-img-wrap:hover .category-hero-img {
  transform: scale(1.1);
}

.category-hero-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(234, 179, 8, 0.1), rgba(234, 179, 8, 0.2));
  border: 1px solid rgba(234, 179, 8, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.category-hero-icon {
  font-size: 24px;
  color: #eab308;
}

.badge-comm {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #e5e7eb;
}

.badge-comm.is-active {
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.1);
}

.variant-tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.variant-tag-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  background: var(--bg-soft);
  color: var(--text-body);
  border: 1px solid var(--border-soft);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
  transition: all 0.2s ease;
}

.variant-tag-badge:hover {
  background: var(--bg-elevated);
  border-color: var(--brand-400);
  transform: translateY(-1px);
}

.variant-tag-badge .tag-icon {
  font-size: 10px;
  color: var(--brand-500);
}

.text-mono {
  font-family: var(--font-mono, monospace);
  font-size: 11px;
  color: var(--text-muted);
}

.text-mono-bold {
  font-family: var(--font-mono, monospace);
  font-size: 12px;
  font-weight: 700;
  color: var(--text-strong);
}

.category-desc {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-body);
  max-width: 480px;
}

.span-12 {
  grid-column: span 12 !important;
}

.type-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
}

.type-badge.select {
  background: #f5f3ff;
  color: #6d28d9;
  border: 1px solid #ddd6fe;
}

.type-badge.number {
  background: #f0fdf4;
  color: #15803d;
  border: 1px solid #bbf7d0;
}

.type-badge.boolean {
  background: #fff7ed;
  color: #c2410c;
  border: 1px solid #ffedd5;
}

.required-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  background: #f3f4f6;
  color: #4b5563;
}

.required-badge.is-required {
  background: #fff7ed;
  color: #ea580c;
  border: 1px solid #fed7aa;
}

.field-options-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.field-option-pill {
  font-size: 10px;
  font-weight: 600;
  background: var(--bg-soft);
  color: var(--text-muted);
  border: 1px solid var(--border-soft);
  padding: 1px 6px;
  border-radius: 4px;
}

.field-label-tr {
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-strong);
}

.field-key-sub {
  font-family: var(--font-mono, monospace);
  font-size: 10px;
  font-weight: 500;
  color: var(--text-muted);
  margin-top: 2px;
}

/* Chat Panel & Container */
.chat-panel {
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  padding: 20px;
  margin-top: 24px;
}

.chat-panel h3 {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-strong);
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.chat-container {
  background: var(--bg-soft);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  padding: 16px;
  max-height: 500px;
  overflow-y: auto;
}

.chat-stream {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Bubble Wrappers */
.chat-bubble-wrap {
  display: flex;
  width: 100%;
}

.system-wrap {
  justify-content: center;
}

.buyer-wrap {
  justify-content: flex-start;
}

.seller-wrap {
  justify-content: flex-end;
}

/* Chat Bubbles Base */
.chat-bubble {
  max-width: 75%;
  border-radius: 12px;
  padding: 12px 16px;
  position: relative;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

/* System Message Style */
.chat-bubble-system {
  background: var(--bg-card);
  border: 1px solid var(--border-soft);
  color: var(--text-muted);
  text-align: center;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  max-width: 90%;
}

.chat-bubble-system p {
  margin: 0;
}

.chat-bubble-system small {
  display: block;
  font-size: 10px;
  margin-top: 2px;
  color: var(--text-muted);
}

/* Normal Chat Bubbles */
.bubble-buyer {
  background: #f1f5f9;
  color: #1e293b;
  border-bottom-left-radius: 2px;
  border: 1px solid #e2e8f0;
}

.bubble-seller {
  background: #e0f2fe;
  color: #0369a1;
  border-bottom-right-radius: 2px;
  border: 1px solid #bae6fd;
}

.bubble-sender {
  font-size: 11px;
  font-weight: 700;
  margin-bottom: 4px;
}

.bubble-buyer .bubble-sender {
  color: #475569;
}

.bubble-seller .bubble-sender {
  color: #0284c7;
}

.bubble-content {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.bubble-time {
  display: block;
  font-size: 10px;
  margin-top: 6px;
  text-align: right;
  color: var(--text-muted);
  opacity: 0.8;
}

/* Violation Message Style (AI Blocked) */
.chat-bubble-violation {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fca5a5;
  border-radius: 12px;
  border-bottom-left-radius: 2px;
  max-width: 80%;
  padding: 12px 16px;
  box-shadow: 0 1px 3px rgba(153, 27, 27, 0.05);
}

.violation-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 800;
  color: #dc2626;
  margin-bottom: 8px;
}

.violation-header i {
  font-size: 14px;
}

.violation-attempt {
  margin: 0 0 8px 0;
  font-size: 13px;
  line-height: 1.4;
  background: #fff;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px dashed #f87171;
  color: #7f1d1d;
}

.violation-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  color: #b91c1c;
  opacity: 0.9;
  margin-top: 4px;
}

/* Order & Return Specific Styles */
.status-order {
  font-weight: 600;
  text-transform: uppercase;
}

.span-12 {
  grid-column: span 12 !important;
}

.return-details-card {
  border: 1px solid var(--border-soft);
  background: var(--bg-panel);
  padding: 16px;
  border-radius: 12px;
}

.return-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 10px;
}

.return-info-fields {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reason-badge {
  background: var(--bg-elevated);
  border: 1px solid var(--border-soft);
  padding: 4px 8px;
  border-radius: 6px;
  color: var(--text-strong);
  font-size: 13px;
}

.return-note-text {
  color: var(--text-normal);
  font-size: 13px;
  line-height: 1.5;
  background: var(--bg-elevated);
  padding: 8px 12px;
  border-radius: 8px;
  border-left: 3px solid var(--border-soft);
}

.return-gallery-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.return-gallery-section h5 {
  margin: 0;
  font-size: 13px;
  color: var(--text-strong);
  font-weight: 600;
}

.return-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 10px;
}

.gallery-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-soft);
  background: var(--bg-elevated);
  display: block;
}

.gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;
}

.gallery-item:hover img {
  transform: scale(1.05);
}

.zoom-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.gallery-item:hover .zoom-overlay {
  opacity: 1;
}

.zoom-overlay i {
  color: #fff;
  font-size: 18px;
}
</style>
