# Requirements: Endemigo

**Defined:** 2026-04-07
**Core Value:** Kullanıcılar güvenli şekilde gerçek zamanlı müzayedeye katılabilmeli, ürün satın alabilmeli ve escrow korumalı ödeme sistemiyle güvenle alışveriş yapabilmelidir.

## v1 Requirements

### Authentication (AUTH)

- [ ] **AUTH-01**: Kullanıcı email ve şifre ile hesap oluşturabilir
- [ ] **AUTH-02**: Kullanıcı email doğrulaması alır
- [ ] **AUTH-03**: Kullanıcı şifresini email link ile sıfırlayabilir
- [ ] **AUTH-04**: Kullanıcı oturumu refresh token ile sürdürülür
- [ ] **AUTH-05**: Sistem JWT tabanlı kimlik doğrulama kullanır
- [ ] **AUTH-06**: Rol bazlı yetkilendirme (RBAC): kullanıcı, satıcı, admin

### User Management (USER)

- [ ] **USER-01**: Kullanıcı profil bilgilerini düzenleyebilir (ad, avatar, adres)
- [ ] **USER-02**: Kullanıcı satıcı hesabına geçiş yapabilir
- [ ] **USER-03**: Kullanıcı KVKK açık rıza onayı verir
- [ ] **USER-04**: Kullanıcı hesabını silebilir / verilerini anonimleştirebilir

### Product & Catalog (PROD)

- [ ] **PROD-01**: Satıcı ürün ekleyebilir (başlık, açıklama, görseller, fiyat, kategori)
- [ ] **PROD-02**: Satıcı ürün düzenleyebilir ve silebilir
- [ ] **PROD-03**: Ürün görselleri optimize edilir ve CloudFlare R2 + CDN üzerinden sunulur
- [ ] **PROD-04**: Kategori ve alt kategori sistemi oluşturulur
- [ ] **PROD-05**: Ürün detay sayfası tüm bilgileri gösterir
- [ ] **PROD-06**: Satıcı stok takibi yapabilir

### Search & Discovery (SRCH)

- [ ] **SRCH-01**: Kullanıcı sadece satıştaki ürünlerde arama yapabilir
- [ ] **SRCH-02**: Kullanıcı sadece müzayedelerde arama yapabilir (aktif/gelecek/bitmiş)
- [ ] **SRCH-03**: Kullanıcı tüm platformda birleşik arama yapabilir
- [ ] **SRCH-04**: Kullanıcı fiyata göre sıralayabilir (artan/azalan)
- [ ] **SRCH-05**: Kullanıcı tarihe göre sıralayabilir
- [ ] **SRCH-06**: Kullanıcı en çok favoriye eklenen ürünleri görebilir
- [ ] **SRCH-07**: Kullanıcı kategoriye göre filtreleyebilir
- [ ] **SRCH-08**: Kullanıcı müzayede durumuna göre filtreleyebilir
- [ ] **SRCH-09**: Kullanıcı ürünleri favorilere ekleyebilir

### Auction — Real-Time (AUCT)

- [ ] **AUCT-01**: Satıcı gerçek zamanlı müzayede oluşturabilir (başlangıç fiyatı, süre, min artış)
- [ ] **AUCT-02**: Kullanıcı canlı müzayedeye katılıp gerçek zamanlı teklif verebilir
- [ ] **AUCT-03**: Tüm teklifler anlık olarak tüm katılımcılara broadcast edilir (Socket.IO + Redis Pub/Sub)
- [ ] **AUCT-04**: Geri sayım sayacı gerçek zamanlı görünür
- [ ] **AUCT-05**: Teklif geçmişi şeffaf şekilde gösterilir
- [ ] **AUCT-06**: Anti-sniping: son 60 saniye kala teklif verilirse süre uzar
- [ ] **AUCT-07**: Aynı fiyata gelen tekliflerde timestamp + kuyruk ile öncelik belirlenir
- [ ] **AUCT-08**: Müzayede durum makinesi: taslak → yayında → aktif → bitti → tamamlandı → iptal
- [ ] **AUCT-09**: Kazanan kullanıcıya bildirim gönderilir
- [ ] **AUCT-10**: Müzayede teklif sırasında gerekli tutar bakiyeden bloke edilir
- [ ] **AUCT-11**: Anti-sniping maximum uzatma limiti (max 10 uzatma, kademeli süre azaltma: 60→45→30sn)
- [ ] **AUCT-12**: Minimum teklif artış miktarı system-enforced (satıcı tanımlar, sistem kontrol eder)
- [ ] **AUCT-13**: Müzayede odası katılımcı kapasitesi tanımlanır ve izlenir
- [ ] **AUCT-14**: Tüm müzayede zamanlama server-authoritative — client timestamp asla kullanılmaz
- [ ] **AUCT-15**: Teklif almayan müzayede otomatik "tamamlanamamış" durumuna geçer

### Auction — Timed Online (AUCT-T)

- [ ] **AUCT-T-01**: Satıcı online süreli müzayede oluşturabilir (bitiş tarihi/saati)
- [ ] **AUCT-T-02**: Müzayede belirlenen tarihte otomatik kapanır
- [ ] **AUCT-T-03**: Süre sonunda ≥3 teklif son 60sn içinde gelirse süre 2 dakika uzar (max 3 uzatma)
- [ ] **AUCT-T-04**: Online süreli müzayede aynı durum makinesiyle yönetilir

### Wallet & Financial (WALL)

- [ ] **WALL-01**: Kullanıcı dijital cüzdanında bakiye görüntüleyebilir
- [ ] **WALL-02**: Sistem bakiyeyi bloke edebilir (müzayede teklifi sırasında)
- [ ] **WALL-03**: Bloke bakiye işlem sonuçlandığında otomatik çözülür
- [ ] **WALL-04**: Kullanıcı cüzdanına para yükleyebilir
- [ ] **WALL-05**: Detaylı işlem geçmişi görüntülenebilir
- [ ] **WALL-06**: Satıcı bağımsız bakiye sistemine sahiptir
- [ ] **WALL-07**: Satıcı bakiyesinden para çekme talebi oluşturabilir
- [ ] **WALL-08**: Para çekme talepleri admin tarafından manuel onaylanır
- [ ] **WALL-09**: Platform komisyonu otomatik hesaplanır ve kesilir
- [ ] **WALL-10**: Kullanıcı aynı anda birden fazla müzayedede bloke bakiye tutabilir (kümülatif bloke)
- [ ] **WALL-11**: Teklif aşıldığında (outbid) bloke bakiye derhal çözülür
- [ ] **WALL-12**: Kazanan kullanıcının bakiyesi yetersizse 24 saat grace period; aksi halde sıradaki teklif sahibine geçiş
- [ ] **WALL-13**: Cüzdan sistemi banka hesap hareketinin gölgesi olarak tasarlanır (kontrat §4 gereği)
- [ ] **WALL-14**: Komisyon oranları admin panelinden kategori/satıcı bazlı yapılandırılabilir (sabit/yüzde/karma)

### Payment (PAY)

- [ ] **PAY-01**: Ödeme sistemi İyzico ile entegre çalışır (marketplace escrow desteği)
- [ ] **PAY-02**: Escrow (güvenli ödeme) mekanizması uygulanır
- [ ] **PAY-03**: Ödeme sonucu webhook callback ile alınır
- [ ] **PAY-04**: Ödeme durum takibi yapılır
- [ ] **PAY-05**: İade mekanizması çalışır

### Order Management (ORDR)

- [ ] **ORDR-01**: Sipariş oluşturulur (müzayede veya doğrudan satış sonrası)
- [ ] **ORDR-02**: Sipariş akışı: ödeme → hazırlık → gönderim → teslim → tamamlanma
- [ ] **ORDR-03**: Kullanıcı teslim onayı verebilir
- [ ] **ORDR-04**: Teslimattan itibaren 14 gün içinde onay verilmezse sistem otomatik onaylar
- [ ] **ORDR-05**: Ödeme yapılmazsa admin onaylı sıradaki teklif sahibine geçiş
- [ ] **ORDR-06**: Kullanıcı sipariş geçmişini görüntüleyebilir

### Notification (NOTF)

- [ ] **NOTF-01**: Teklifin geçildiğinde push bildirim gönderilir
- [ ] **NOTF-02**: Müzayede başlangıç/bitiş bildirimi gönderilir
- [ ] **NOTF-03**: Sipariş durumu değiştiğinde bildirim gönderilir
- [ ] **NOTF-04**: Ödeme hatırlatması gönderilir
- [ ] **NOTF-05**: Uygulama içi bildirimler gösterilir
- [ ] **NOTF-06**: Kullanıcı bildirim tercihlerini yönetebilir
- [ ] **NOTF-07**: Push bildirim gönderim başarısızlığında retry ve fallback (in-app bildirim)

### Ask Price & Private Negotiation (ASKP)

- [ ] **ASKP-01**: Satıcı fiyat gizleyerek ilan verebilir ("Fiyat Sor" modu)
- [ ] **ASKP-02**: Alıcı "Fiyat Sor" butonuyla kapalı mesajlaşma başlatabilir
- [ ] **ASKP-03**: Mesajlaşma yalnızca alıcı ve satıcıya görünür
- [ ] **ASKP-04**: Mesajlar sistem tarafından izlenir (platform dışı yönlendirme tespiti — URL/telefon/IBAN pattern matching ile keyword filtresi)
- [ ] **ASKP-05**: Satıcı fiyat bildirdiğinde teklif oluşturulur, alıcıya onay sunulur
- [ ] **ASKP-06**: Kabul edilen teklif otomatik escrow akışına yönlendirilir
- [ ] **ASKP-07**: Satıcı teklifin geçerlilik süresini tanımlayabilir
- [ ] **ASKP-08**: Müzayede ve Fiyat Sor aynı ürüne eş zamanlı aktif edilemez
- [ ] **ASKP-09**: Fiyat Sor satışları, sipariş ve finansal raporlarda ayrı kategori olarak izlenir
- [ ] **ASKP-10**: Kural ihlali tespit edilen kullanıcılar IP + cihaz ID bazlı otomatik sınırlandırılır
- [ ] **ASKP-11**: Ban edilen kullanıcının yeni hesap açması IP/cihaz kontrolü ile engellenir

### Campaign & Discount (CAMP)

- [ ] **CAMP-01**: Satıcı ürünlerine indirim tanımlayabilir (yüzde veya sabit tutar)
- [ ] **CAMP-02**: Kupon kodu oluşturulabilir (tek/çok kullanımlık)
- [ ] **CAMP-03**: Zaman kısıtlı kampanya oluşturulabilir (başlangıç/bitiş tarihi)
- [ ] **CAMP-04**: Toplu/kademeli indirim tanımlanabilir
- [ ] **CAMP-05**: Admin platform geneli kampanya oluşturabilir
- [ ] **CAMP-06**: Komisyon nihai (indirimli) satış fiyatı üzerinden hesaplanır

### Seller Ads (ADS)

- [ ] **ADS-01**: Satıcı arama sonuçlarında üst sıra öne çıkarma satın alabilir
- [ ] **ADS-02**: Satıcı kategori vitrin alanında yer alabilir
- [ ] **ADS-03**: Satıcı ana sayfa banner ile görünürlük kazanabilir
- [ ] **ADS-04**: Reklam bedeli cüzdandan bloke edilir, yayın başladığında kesilir
- [ ] **ADS-05**: Reklam yayına alma admin onayına tabidir
- [ ] **ADS-06**: Reklam içerikleri organik sonuçlardan ayrı etiketlenir

### Trust System (TRST)

- [ ] **TRST-01**: Kullanıcı işlem geçmişi ve tamamlama oranı analiz edilir
- [ ] **TRST-02**: Ödeme davranışı izlenir
- [ ] **TRST-03**: Şüpheli davranış tespit edildiğinde otomatik sınırlandırma uygulanır
- [ ] **TRST-04**: Aynı IP/cihaz/telefon numarasından birden fazla hesap tespit edilir ve işaretlenir

### Admin Panel (ADMN)

- [ ] **ADMN-01**: Admin kullanıcıları yönetebilir (listeleme, düzenleme, askıya alma)
- [ ] **ADMN-02**: Admin satıcıları yönetebilir
- [ ] **ADMN-03**: Admin ürünleri yönetebilir
- [ ] **ADMN-04**: Admin müzayedeleri yönetebilir (listeleme, iptal, durum değiştirme)
- [ ] **ADMN-05**: Admin siparişleri ve ödeme akışlarını izleyebilir
- [ ] **ADMN-06**: Admin teklif geçmişini görüntüleyebilir
- [ ] **ADMN-07**: Admin reklam kampanyalarını yönetebilir ve raporlayabilir
- [ ] **ADMN-08**: Admin kampanya ve indirim yönetimi yapabilir
- [ ] **ADMN-09**: Admin dashboard ile işlem hacmi, aktif müzayedeler, gelir izlenebilir
- [ ] **ADMN-10**: Admin satıcı para çekme taleplerini onaylayabilir
- [ ] **ADMN-11**: RBAC ile yönetici erişimleri ayrıştırılır
- [ ] **ADMN-12**: Sistem hataları ve kullanıcı hareketleri izlenebilir

### Mobile UI/UX (MUIX)

- [ ] **MUIX-01**: Profil menüsü: hesabım, siparişler, cüzdan, ilanlar, müzayede, favoriler, değerlendirmeler, mesajlar, ayarlar
- [ ] **MUIX-02**: Hızlı aksiyonlar (ilan verme, müzayede oluşturma) profilde öncelikli
- [ ] **MUIX-03**: Kullanıcı arayüzü nötr ve akış odaklı dil kullanır
- [ ] **MUIX-04**: Responsive ve performanslı UI

### Membership & Subscription (MEMB)

- [ ] **MEMB-01**: Kullanıcılar için aylık üyelik paketleri tanımlanır (Free / Premium vb.)
- [ ] **MEMB-02**: Üyelik ödemeleri İyzico recurring payment ile alınır (in-app purchase yok)
- [ ] **MEMB-03**: Paket avantajları tanımlanır (düşük komisyon, daha fazla ilan, öne çıkarma vb.)
- [ ] **MEMB-04**: Kullanıcı aktif paketini profil menüsünde ("Paketim") görüntüleyebilir
- [ ] **MEMB-05**: Paket yükseltme/düşürme işlemi yapılabilir
- [ ] **MEMB-06**: Üyelik süresi dolduğunda otomatik yenileme veya downgrade
- [ ] **MEMB-07**: Admin panelinden paket tanımlama ve fiyatlandırma yapılabilir

### Kargo Entegrasyonu — Mock (KARG)

- [ ] **KARG-01**: Sipariş bazlı mock takip numarası üretimi
- [ ] **KARG-02**: Mock kargo durumu bildirimi (hazırlanıyor → yolda → teslim edildi)
- [ ] **KARG-03**: Kargo API interface'i gerçek entegrasyon için hazır (strategy pattern)
- [ ] **KARG-04**: Kullanıcıya kargo durumu bildirimi gösterilir

### Review & Rating (REVW)

- [ ] **REVW-01**: Alıcı, sipariş tamamlandıktan sonra ürüne puan (1-5 yıldız) ve yorum verebilir
- [ ] **REVW-02**: Alıcı, sipariş tamamlandıktan sonra satıcıya puan (1-5 yıldız) ve yorum verebilir
- [ ] **REVW-03**: Ürün detay sayfasında ortalama puan ve yorumlar listelenir
- [ ] **REVW-04**: Satıcı profil sayfasında ortalama puan ve toplam değerlendirme sayısı görünür
- [ ] **REVW-05**: Satıcı değerlendirmeye yanıt verebilir
- [ ] **REVW-06**: Admin uygunsuz yorumları kaldırabilir
- [ ] **REVW-07**: Bir sipariş için yalnızca bir kez değerlendirme yapılabilir (duplicate engeli)

### Audit Trail (AUDT)

- [ ] **AUDT-01**: Müzayede durum geçişleri zaman damgasıyla kayıt altına alınır (kontrat maddesi)
- [ ] **AUDT-02**: Tüm cüzdan bakiye değişiklikleri (yükleme, bloke, çözme, kesinti, transfer) audit log'a yazılır
- [ ] **AUDT-03**: Sipariş durum değişiklikleri loglanır (kim, ne zaman, önceki/yeni durum)
- [ ] **AUDT-04**: Admin aksiyonları loglanır (kullanıcı askıya alma, sipariş override, reklam onay/red)
- [ ] **AUDT-05**: Ödeme işlemleri (başlatma, webhook, onay, iade) zaman damgasıyla kayıt altına alınır
- [ ] **AUDT-06**: Teklif geçmişi değiştirilemez şekilde saklanır (immutable bid history)
- [ ] **AUDT-07**: Admin panelinde audit log görüntüleme ve filtreleme ekranı

### Security (SECU)

- [ ] **SECU-01**: Tüm API'ler HTTPS üzerinden çalışır
- [ ] **SECU-02**: API rate limiting uygulanır
- [ ] **SECU-03**: Input validation ve SQL injection koruması
- [ ] **SECU-04**: XSS önleme ve hassas veri maskeleme
- [ ] **SECU-05**: KVKK uyumlu veri işleme akışları (açık rıza onayı + VER-BİS uyumlu veri işleme kaydı + silme/anonimleştirme log)
- [ ] **SECU-06**: Kaynak kodda hard-coded credential/API key/secret bulunmaz — tümü environment variable ile yönetilir
- [ ] **SECU-07**: Prod sunucu erişimi sadece SSH key ile, password login kapalı
- [ ] **SECU-08**: Admin hesap oluşturma yalnızca super admin tarafından yapılabilir
- [ ] **SECU-09**: Güvenlik olayı bildirim kanalı ve süreci tanımlanır (kontrat §11)
- [ ] **SECU-10**: API endpoint bazlı rate limit konfigürasyonu (auth: 5/dk, bid: 30/dk, search: 60/dk)

### Reliability & Error Handling (RELY)

#### Backend — Transaction & Rollback
- [ ] **RELY-01**: Tüm kritik DB işlemleri (bid, payment, order, wallet) TypeORM transaction içinde çalışır; hata durumunda otomatik rollback
- [ ] **RELY-02**: Müzayede teklif işlemi atomik transaction — bid insert + wallet bloke + auction update tek transaction'da
- [ ] **RELY-03**: Escrow ödeme akışı transactional — ödeme onay + order status + wallet update tek transaction'da
- [ ] **RELY-04**: Sipariş durum geçişleri transactional — sadece geçerli state transition'lar izinli (state machine enforced)
- [ ] **RELY-05**: Cüzdan bakiye işlemleri double-entry bookkeeping ile — her debit'in credit karşılığı var, tutarsızlık engellenir
- [ ] **RELY-06**: Database migration rollback desteği — her migration'ın up/down methodu var

#### Backend — Error Handling
- [ ] **RELY-07**: NestJS global exception filter — tüm unhandled hatalar yakalanır, loglanır, kullanıcıya anlamlı mesaj döner
- [ ] **RELY-08**: Custom business exception sınıfları (InsufficientBalanceException, AuctionClosedException, BidTooLowException vb.)
- [ ] **RELY-09**: Webhook processing idempotent — aynı webhook birden fazla gelirse duplicate işlem yapılmaz
- [ ] **RELY-10**: Failed job retry mekanizması — BullMQ job'ları hata durumunda configurable retry (max 3 deneme, exponential backoff)
- [ ] **RELY-11**: Dead letter queue — retry sonrası başarısız olan job'lar DLQ'ya taşınır, admin bilgilendirilir
- [ ] **RELY-12**: Circuit breaker pattern — 3rd party servisler (PayTR/İyzico, OneSignal) yanıt vermezse circuit açılır, fallback uygulanır
- [ ] **RELY-13**: Database connection pool monitoring — bağlantı tükenmesi durumunda alarm
- [ ] **RELY-14**: Graceful shutdown — sunucu kapanırken aktif transaction'lar tamamlanır, WebSocket bağlantıları düzgün kapatılır

#### Frontend (Mobile) — Error Handling
- [ ] **RELY-15**: React Native Error Boundary — kritik hatalarda crash yerine error ekranı gösterilir
- [ ] **RELY-16**: API hata durumlarında kullanıcıya anlamlı Türkçe hata mesajı gösterilir (toast/alert)
- [ ] **RELY-17**: Optimistic update rollback — müzayede teklifi veya sipariş işlemi başarısız olursa UI eski durumuna döner
- [ ] **RELY-18**: Network connectivity kontrolü — offline durumda kullanıcı bilgilendirilir, kritik aksiyonlar engellenir
- [ ] **RELY-19**: Retry mekanizması — başarısız API çağrıları otomatik retry (TanStack Query ile configurable)
- [ ] **RELY-20**: WebSocket reconnection — bağlantı koptuğunda otomatik yeniden bağlanma (exponential backoff)
- [ ] **RELY-21**: Cüzdan bakiye işlemleri row-level lock ile serialize edilir — concurrent deductions yarış koşuluna girmez
- [ ] **RELY-22**: WebSocket broadcast mesajları sequence number içerir; client tarafında out-of-order mesajlar düzeltilir

### Infrastructure (INFR)

- [ ] **INFR-01**: CI/CD pipeline (staging + production)
- [ ] **INFR-02**: Sentry error tracking entegrasyonu
- [ ] **INFR-03**: Swagger/OpenAPI dokümantasyonu
- [ ] **INFR-04**: OTA güncelleme (Expo Updates)
- [ ] **INFR-05**: Email servisi entegrasyonu (SendGrid/Resend/AWS SES) — doğrulama ve şifre sıfırlama için

### Testing (TEST)

#### Unit Tests
- [ ] **TEST-01**: Auth service unit testleri (JWT, refresh token, RBAC logic)
- [ ] **TEST-02**: Auction engine unit testleri (durum makinesi geçişleri, anti-sniping logic, bid validation)
- [ ] **TEST-03**: Wallet service unit testleri (bakiye hesaplama, bloke/çözme, komisyon)
- [ ] **TEST-04**: Order service unit testleri (durum geçişleri, otomatik onay logic)
- [ ] **TEST-05**: Campaign/discount unit testleri (kupon doğrulama, indirim hesaplama)

#### Integration Tests
- [ ] **TEST-06**: Auth → User → Seller kayıt akışı entegrasyon testi
- [ ] **TEST-07**: Auction → Bid → Wallet bakiye bloke entegrasyon testi
- [ ] **TEST-08**: Payment webhook → Order status → Wallet update entegrasyon testi
- [ ] **TEST-09**: AskPrice → Messaging → Escrow entegrasyon testi
- [ ] **TEST-10**: Campaign → Order → Commission hesaplama entegrasyon testi

#### Component Tests (Mobile)
- [ ] **TEST-11**: Müzayede ekranı component testi (geri sayım, teklif listesi, bid input)
- [ ] **TEST-12**: Ürün detay component testi (görseller, bilgiler, aksiyonlar)
- [ ] **TEST-13**: Cüzdan component testi (bakiye gösterimi, işlem geçmişi)
- [ ] **TEST-14**: Profil menüsü component testi (navigasyon, hızlı aksiyonlar)

#### Service Tests (Backend)
- [ ] **TEST-15**: AuctionService — müzayede CRUD, durum geçişleri, zamanlayıcı
- [ ] **TEST-16**: BidService — teklif doğrulama, race condition, concurrent bid handling
- [ ] **TEST-17**: WalletService — double-entry bookkeeping, bakiye tutarlılığı
- [ ] **TEST-18**: PaymentService — webhook processing, idempotency

#### API Tests
- [ ] **TEST-19**: Tüm REST API endpoint'leri Swagger tanımlarına uygun çalışır
- [ ] **TEST-20**: Auth API testleri (register, login, refresh, logout, RBAC)
- [ ] **TEST-21**: Auction API testleri (create, bid, status transitions)
- [ ] **TEST-22**: Payment API testleri (initiate, webhook callback, refund)

#### Contract Tests
- [ ] **TEST-23**: Mobile ↔ Backend API contract testleri (request/response schema uyumu)
- [ ] **TEST-24**: Admin Panel ↔ Backend API contract testleri

#### UI Tests (E2E)
- [ ] **TEST-25**: Kullanıcı kayıt → giriş → ürün arama → favorilere ekleme E2E akışı
- [ ] **TEST-26**: Müzayedeye katılma → teklif verme → kazanma → ödeme E2E akışı
- [ ] **TEST-27**: Satıcı ürün ekleme → müzayede oluşturma → sipariş yönetimi E2E akışı

#### Functional Tests
- [ ] **TEST-28**: Escrow ödeme akışı fonksiyonel testi (ödeme → beklet → onay → çözüm)
- [ ] **TEST-29**: Anti-sniping mekanizması fonksiyonel testi (son 60sn uzatma doğrulaması)
- [ ] **TEST-30**: Fiyat sor → pazarlık → kabul → escrow fonksiyonel testi

#### Smoke Tests
- [ ] **TEST-31**: Uygulama açılır ve ana sayfa yüklenir
- [ ] **TEST-32**: Kullanıcı giriş yapabilir
- [ ] **TEST-33**: Ürün listesi yüklenir ve arama çalışır
- [ ] **TEST-34**: Admin panel giriş yapılır ve dashboard açılır

#### Regression Tests
- [ ] **TEST-35**: Her faz sonrası önceki fazların temel işlevleri bozulmamış
- [ ] **TEST-36**: Auth, product, auction, payment critical path regression suite

#### Security Tests
- [ ] **TEST-37**: SQL injection penetration testi
- [ ] **TEST-38**: XSS ve CSRF saldırı testi
- [ ] **TEST-39**: Rate limiting doğrulama testi
- [ ] **TEST-40**: Yetki yükseltme (privilege escalation) testi
- [ ] **TEST-41**: Hassas veri maskeleme doğrulama testi

#### Load & Performance Tests
- [ ] **TEST-42**: 10.000 eş zamanlı kullanıcı yük testi (k6/Artillery)
- [ ] **TEST-43**: Müzayede motoru yoğun teklif trafiği stres testi
- [ ] **TEST-44**: WebSocket bağlantı kapasitesi testi (5K concurrent connections)
- [ ] **TEST-45**: Veritabanı sorgu performans testi (response time < 200ms)

#### Additional Critical Tests
- [ ] **TEST-46**: Escrow otomatik onay zamanlayıcısı testi — süre dolunca ödeme satıcıya aktarılır
- [ ] **TEST-47**: Aynı kullanıcının birden fazla cihazdan eş zamanlı teklif verme testi
- [ ] **TEST-48**: Admin panel E2E — giriş → kullanıcı yönetimi → müzayede yönetimi → sipariş izleme akışı
- [ ] **TEST-49**: Cüzdan bakiye tutarlılık testi — tüm debit/credit toplamları sıfıra eşit (double-entry doğrulama)

#### Module Coverage Tests
- [ ] **TEST-50**: Membership subscription lifecycle testi (üyelik oluşturma → ödeme → yenileme → iptal)
- [ ] **TEST-51**: Mock kargo status transition testi (hazırlanıyor → yolda → teslim)
- [ ] **TEST-52**: Trust system rule engine testi (kural tetiklenme, sınırlandırma uygulama)
- [ ] **TEST-53**: Timed auction spesifik testi (bitiş zamanı, uzatma, no-bid durumu)
- [ ] **TEST-54**: Notification delivery testi (push başarılı/başarısız, in-app fallback)
- [ ] **TEST-55**: Ads module testi (oluşturma → admin onay → yayın → cüzdan ödeme)
- [ ] **TEST-56**: Concurrent bid idempotency testi (aynı bid retry → duplicate yok)

## v2 Requirements

### Kargo Gerçek Entegrasyonu
- **KARG-v2-01**: Gerçek kargo firması API entegrasyonu (mock yerine — Aras, Yurtiçi, MNG vb.)

### Gelişmiş Özellikler
- **ADV-01**: Rezerve fiyat mekanizması (minimum satış fiyatı)
- **ADV-02**: Otomatik teklif (proxy bidding)
- **ADV-03**: Sosyal medya ile giriş (Google, Apple)
- **ADV-04**: Çoklu dil desteği

## Out of Scope

| Feature | Reason |
|---------|--------|
| Canlı video yayın müzayedesi | Altyapı maliyeti, kontrat kapsamı dışı |
| AI fiyat önerisi | Veri birikimi gerekli, v2+ |
| Muhasebe yazılımı entegrasyonu | Müşteri kararıyla ertelenmiş |
| Masaüstü native uygulama | Kontrat mobil + web admin kapsamlı |
| RabbitMQ | BullMQ (Redis-based) yeterli |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01..06 | Phase 1 | Pending |
| USER-01..04 | Phase 2 | Pending |
| PROD-01..06 | Phase 3 | Pending |
| SRCH-01..09 | Phase 4 | Pending |
| AUCT-01..15 | Phase 5 | Pending |
| AUCT-T-01..04 | Phase 5 | Pending |
| WALL-01..14 | Phase 6 | Pending |
| PAY-01..05 | Phase 6 | Pending |
| ORDR-01..06 | Phase 7 | Pending |
| NOTF-01..07 | Phase 8 | Pending |
| ASKP-01..11 | Phase 9 | Pending |
| CAMP-01..06 | Phase 10 | Pending |
| ADS-01..06 | Phase 10 | Pending |
| TRST-01..04 | Phase 10 | Pending |
| ADMN-01..12 | Phase 11 | Pending |
| MUIX-01..04 | Phase 8 | Pending |
| MEMB-01..07 | Phase 10 (üyelik sistemi) | Pending |
| KARG-01..04 | Phase 7 (mock kargo) | Pending |
| REVW-01..05 | Phase 7 (sipariş sonrası değerlendirme) | Pending |
| REVW-06..07 | Phase 11 (admin yorum yönetimi) | Pending |
| AUDT-01..06 | Phase 1-7 (her modül kendi audit logunu yazar) | Pending |
| AUDT-07 | Phase 11 (admin audit log ekranı) | Pending |
| SECU-01..06 | Phase 1 | Pending |
| RELY-01..06 | Phase 1 (backend transaction altyapısı) | Pending |
| RELY-07..08 | Phase 1 (global exception handling) | Pending |
| RELY-09 | Phase 6 (payment webhook idempotency) | Pending |
| RELY-10..11 | Phase 5 (BullMQ retry + DLQ) | Pending |
| RELY-12 | Phase 6 (3rd party circuit breaker) | Pending |
| RELY-13..14 | Phase 1 (DB pool + graceful shutdown) | Pending |
| RELY-15..16 | Phase 1 (mobile error boundary + API error) | Pending |
| RELY-17 | Phase 5 (optimistic update rollback) | Pending |
| RELY-18..19 | Phase 1 (offline detection + retry) | Pending |
| RELY-20 | Phase 5 (WebSocket reconnection) | Pending |
| RELY-21 | Phase 6 (wallet row-level lock) | Pending |
| RELY-22 | Phase 5 (WebSocket message sequencing) | Pending |
| INFR-01..05 | Phase 1+12 (email Phase 1, CI/CD Phase 12) | Pending |
| TEST-01..05 | Phase 1-11 (her faz kendi unit testleri) | Pending |
| TEST-06..10 | Phase 5-10 (entegrasyon fazları) | Pending |
| TEST-11..14 | Phase 8 (mobil UI) | Pending |
| TEST-15..18 | Phase 5-7 (backend service) | Pending |
| TEST-19..22 | Phase 12 (API tam test) | Pending |
| TEST-23..24 | Phase 12 (contract tests) | Pending |
| TEST-25..27 | Phase 12 (E2E UI tests) | Pending |
| TEST-28..30 | Phase 12 (functional tests) | Pending |
| TEST-31..34 | Phase 12 (smoke tests) | Pending |
| TEST-35..36 | Phase 2-12 (her faz sonrası regression) | Pending |
| TEST-37..41 | Phase 12 (security tests) | Pending |
| TEST-42..45 | Phase 12 (load & perf tests) | Pending |
| TEST-46..49 | Phase 12 (escrow timer, multi-device, admin E2E, reconciliation) | Pending |

**Coverage:**
- v1 requirements: 222 total (141 functional + 25 reliability/concurrency + 56 test)
- Mapped to phases: 222
- Unmapped: 0 ✓
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-07*
*Last updated: 2026-04-07 after initial definition*
