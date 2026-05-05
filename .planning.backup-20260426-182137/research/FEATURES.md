# Features Research — Endemigo

## Table Stakes (Olmazsa Olmaz)

### Authentication & Profile
- Email/şifre kayıt ve giriş
- Email doğrulama, şifre sıfırlama
- JWT session (refresh token)
- Profil düzenleme, rol ayrımı (alıcı/satıcı/admin)

### Product & Catalog
- Ürün listeleme (başlık, açıklama, görseller, fiyat, kategori)
- Kategori ağacı, arama, filtreleme, sıralama
- Ürün detay, favoriler

### Auction (Core Differentiator)
- Gerçek zamanlı teklif (< 200ms latency)
- Geri sayım, teklif geçmişi, anti-sniping
- Durum makinesi (taslak → yayında → aktif → bitti → tamamlandı)
- Online süreli müzayede (zamanlı)

### Payments & Wallet
- PayTR/İyzico gateway, escrow
- Dijital cüzdan (bakiye, bloke, kullanılabilir)
- İşlem geçmişi, iade

### Order Management
- Sipariş akışı (ödeme → hazırlık → gönderim → teslim → tamamlanma)
- Otomatik onay mekanizması

### Notifications
- OneSignal push + uygulama içi bildirimler
- Bildirim tercih yönetimi

### Seller Tools
- Satıcı kaydı, ürün/müzayede yönetimi, cüzdan, para çekme

### Admin Panel
- Kullanıcı/satıcı/ürün/müzayede/sipariş/ödeme yönetimi
- RBAC, dashboard, raporlama

## Differentiators (Rekabet Avantajı)

| Feature | Complexity | Notes |
|---------|-----------|-------|
| Fiyat Sor & Kapalı Devre Pazarlık | HIGH | Unique — rakiplerde yok |
| Satıcı Reklam Sistemi | MEDIUM | Platform gelir modeli |
| Kampanya & İndirim Yönetimi | MEDIUM | Kupon, toplu indirim |
| Kullanıcı Güven Sistemi | MEDIUM | Davranış analizi |
| İki Türlü Müzayede (canlı + süreli) | HIGH | İki farklı motor |

## Anti-Features (Yapılmamalı)

| Feature | Neden |
|---------|-------|
| Canlı video yayın müzayedesi | Altyapı maliyeti çok yüksek |
| Sosyal medya login | Kontrat kapsamı dışı |
| AI fiyat önerisi | v1 için erken |
| Çoklu dil desteği | v1 Türkiye odaklı |

## Dependency Chain
```
Auth → Profile → Seller → Product → Search
Product → Auction → Bidding → Anti-sniping
Auth → Wallet → Escrow → Payment → Order
Product → "Fiyat Sor" → Messaging → Escrow
Seller → Ads → Wallet
Admin → All modules
```
