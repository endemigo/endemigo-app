# Strict Coverage Audit — Second Pass

**Date:** 2026-04-07 | **Method:** Line-by-line contract re-read, zero assumptions

---

## A. FULLY MISSING (not in plan at any level)

| # | Contract Ref | Exact Clause | Status |
|---|-------------|-------------|--------|
| A1 | §EK1-M21 | "Kargo API entegrasyonu. Sipariş bazlı takip numarası üretimi, kullanıcıya anlık kargo durumu bildirimi." Status: **Var** | ❌ Plan'da v2'ye ertelenmiş. Kontrat "Var" diyor. |
| A2 | §1, 3.satır | "Repository oluşturma, branch yapısı, commit disiplini, issue takibi, pull request akışı ve dokümantasyon güncelliği Geliştirici'nin sorumluluğundadır." | ❌ Branch naming convention, commit message formatı, PR template, issue template hiçbiri tanımlı değil. |
| A3 | §17, 4.satır | "Her iki haftada bir Müşteri'ye ilerleme raporu sunulur; tamamlanan iş paketleri, riskler, açıklar ve ihtiyaçlar yazılı olarak paylaşılır." | ❌ Rapor şablonu, formatı, teslim kanalı tanımlı değil. PROJECT.md'de mention var ama somut template yok. |
| A4 | §17, 5.satır | "Her sprint/faz sonunda ilgili modülün demo, test ve düzeltme süreci tamamlanır." | ❌ Demo süreci, katılımcılar, ortam (staging URL?) tanımsız. |
| A5 | §11, 2.satır | "Proje sahibinin hesabı veya projeye bağlı hizmetlerde yeni yönetici/servis hesapları oluşturmayacaktır." | ❌ Plan'da explicit requirement yok. SECU-06 sadece hard-coded credentials kapsar. |
| A6 | §11, 4.satır | "Tespit edilen güvenlik açıkları veya şüpheli aktiviteler derhal yazılı şekilde proje sahibine bildirilir." | ❌ Güvenlik açığı bildirim süreci/kanalı tanımlı değil. |

---

## B. PARTIALLY SPECIFIED (exists but incomplete)

| # | Contract Ref | Exact Clause | What's in Plan | What's Missing |
|---|-------------|-------------|----------------|----------------|
| B1 | §4, 1.paragraf | "Sistem banka onayı yani bankaya geçen para üzerinden çalışır. Banka hesap hareketinin kullanıcı açısından gölgesi niteliğindedir. **O sebeple banka entegrasyonu öncesinde tasarımı yapılmalıdır.**" | WALL-13 sadece "gölge olarak tasarlanır" diyor | Tasarımın banka entegrasyonundan **önce** yapılması gerekliliği, tasarım dokümanı çıktısı yok |
| B2 | §4, 4.bullet | "Platformun gelir modeli (satış komisyonları, işlem kesintileri, **reklam-üyelik ödemeleri** vb.) backend tarafından otomatik hesaplanacak şekilde teknik olarak entegre edilir." | WALL-09/14 komisyon var, ADS-04 reklam cüzdandan var | **Üyelik ödemeleri** (paket sistemi?) hiç tanımlı değil. Kontrat açıkça "üyelik" diyor. |
| B3 | §6, 4.satır | "Akış tamamlanamadığında... sistem, admin onaylı manuel müdahale **veya** sıradaki teklif sahibine **otomatik geçiş** senaryolarını uygular." | ORDR-05 sadece "admin onaylı sıradaki teklif sahibine geçiş" | Admin onaylı **manuel müdahale** seçeneği detaylandırılmamış. Admin panelde hangi araçlar var? Override, iptal, iade tetikleme? |
| B4 | §7, 7.satır | "Arama sonuçları: Kullanıcı tercihine göre **kişiselleştirilmiş sıralama**" | SRCH-01..09 arama/filtreleme var | **Kişiselleştirilmiş sıralama** algoritması yok. Kullanıcı geçmişine, favorilere, görüntüleme pattern'ına dayalı sıralama tanımsız. |
| B5 | §7, 5.bullet | "Popülerlik ve teklif yoğunluğu bazlı sıralama" | SRCH-06 "en çok favoriye eklenen" var | **Teklif yoğunluğu bazlı sıralama** eksik. Müzayedeler arası sıralama kriteri olarak aktif bid count tanımsız. |
| B6 | §9, 3.bullet | "Kullanıcının işlem geçmişi, tamamlama oranı, ödeme davranışları ve **genel kullanım alışkanlıkları** sistem tarafından analiz edilir." | TRST-01..03 temel güven kontrolü var | **Genel kullanım alışkanlıkları** analizi ne kadar detaylı? Oturum süresi? Arama pattern'ı? Browse-to-bid oranı? |
| B7 | §9, 4.bullet | "Şüpheli davranışlar **(aynı ürüne tekrar eden teklifler, anormal işlem yoğunluğu, çoklu hesap kullanımı vb.)** tespit edilerek otomatik olarak sınırlandırılır." | TRST-03 genel "şüpheli davranış", TRST-04 multi-account | **Aynı ürüne tekrar eden teklif** tespiti ve **anormal işlem yoğunluğu** tespiti ayrı birer kural olarak tanımlı değil |
| B8 | §12, 1.bullet | "Hesabım ve **Paketim**" | MUIX-01 "hesabım" var | **"Paketim"** nedir? Üyelik paketi mi? Satıcı paketi mi? Tanımsız. |
| B9 | §13, 7.bullet | "Reklam modülü kullanımı **manuel onay ile yayına alınır**. Onaya tabiidir. Reklam vermek isteyen kullanıcı her ne kadar sistem içinde hareket etsede **uygunluk muhakkak onaya tabidir**." | ADS-05 "admin onayına tabi" | **Uygunluk kriterleri** neler? Hangi reklamlar reddedilir? İçerik politikası tanımsız. |
| B10 | §14, 4.bullet | "**Toplu indirim**: Belirli adet veya tutar üzeri siparişlerde otomatik uygulanan **kademeli indirim yapısı**." | CAMP-04 "Toplu/kademeli indirim" var | Kademeli yapı detayı yok: kaç kademe? Eşik değerleri admin-configurable mı? Ürün bazlı mı sepet bazlı mı? |
| B11 | §15, 9.bullet | "Bu modülü kullanan kullanıcıların kurallara uymadığı tespit edildiğinde üyelikleri **ip check, kullanıcı bilgileri vb benzeri yöntemler** üzerinden iptal edilir." | ASKP-10/11 IP + cihaz ID ban var | **"Kullanıcı bilgileri"** ile ne kastediliyor? TC kimlik? Email domain? Telefon numarası? Device fingerprint detayı yok. |
| B12 | §11, 1.bullet | "Yönetim paneli yalnızca içerik yönetimi aracı değil, aynı zamanda **sistem izleme** ve **operasyonel kontrol** platformudur." | ADMN-09/12 izleme var | **Operasyonel kontrol**: hangi sistem parametreleri admin tarafından değiştirilebilir? Escrow süresi? Anti-sniping süresi? Komisyon oranı? Rate limit parametreleri? Bunlar ayrı ayrı tanımlı değil. |
| B13 | §23, 4.satır | "App Store ve Google Play başvuruları için gereken teknik hazırlık **(gizlilik politikası, uygulama açıklamaları, ekran görüntüleri vb.)** Geliştirici tarafından tamamlanır." | Phase 12'de genel mention | Gizlilik politikası içeriği, uygulama açıklama metinleri, ekran görüntüleri, age rating, content rating — hiçbiri tanımlı değil. Kullanıcı "en son halledecek" dedi ama kontrat geliştirici sorumluluğunda. |
| B14 | §4, 5.bullet | "Bu sistem için, varsa güvenilir muhasebe uygulamaları veya banka/ödeme sistemi entegrasyonları, tarafların **yazılı mutabakatıyla** alternatif olarak hayata geçirilebilir." | Out of scope (muhasebe) | Muhasebe entegrasyonu out of scope ama kontrat **alternatif** olarak kapı açık bırakıyor. Karar loglanmalı. |

---

## C. AMBIGUOUS (contract unclear, plan assumes one interpretation)

| # | Contract Ref | Ambiguous Clause | Plan's Assumption | Alternative Interpretation | Risk |
|---|-------------|-----------------|-------------------|--------------------------|------|
| C1 | §5, son paragraf | "İkinci tür müzayede ise online süreli olarak düzenlenecektir... Süre sonunda hızlı üst üste ve **çok pey** verilmesi halinde süre otomatik olarak **2-3 dakika** arttırılabilir." | AUCT-T-03: ≥3 teklif son 60sn → 2dk uzatma, max 3 uzatma | "Çok pey" 5 veya 10 olabilir. "2-3 dakika" 2 mi 3 mü? | Medium — müşteri farklı beklenti olabilir |
| C2 | §EK1-M8 | "Gerekli görülmesi halinde, Redis Pub/Sub... ölçeklenebilir hale getirilebilir." Status: **Gerekli Görülürse** | Baştan kurulacak (karar verildi) | Müşteri "gerekli görülürse" opsiyonel görebilir, maliyet sorusu çıkabilir | Low — doğru karar ama müşteriye bildir |
| C3 | §EK1-M10 | "Yüksek teklif trafiğinde veri kaybını önlemek için RabbitMQ entegrasyonu." Status: **Gerekli Görülürse** | BullMQ kullanılacak, RabbitMQ yerine | Müşteri "neden RabbitMQ değil?" diyebilir | Low — gerekçe belgeli |
| C4 | §12 | "Hesabım ve **Paketim**" | Paket = profil bilgileri / hesap ayarları | Paket = aylık/yıllık üyelik paketi (premium gibi) | Medium — revenue model etkileyebilir |
| C5 | §4 | "Sistem banka onayı yani bankaya geçen para üzerinden çalışır." | Cüzdan = İyzico marketplace alt yapısı | Müşteri kendi banka hesabından direkt yönetim isteyebilir | Medium — İyzico marketplace bunu karşılar mı? |
| C6 | §6, son | "admin onaylı **manuel** müdahale veya sıradaki teklif sahibine **otomatik** geçiş" | ORDR-05: admin onaylı geçiş (semi-manual) | İkisi birden mi olmalı? Bazı case'ler otomatik, bazıları admin onaylı mı? | Medium — iş kuralı belirsiz |
| C7 | §14, son | "İndirimli fiyatlar, komisyon hesaplamalarında **orijinal satış fiyatı esas alınarak değil nihai (indirimli) satış fiyatı** üzerinden hesaplanır" | CAMP-06 doğru yansıtıyor | Satıcı indirimli fiyatta komisyon düşerse platform geliri azalır — bu bilinçli mi? | Low — kontrat açık ama müşteriye onaylat |
| C8 | §15, last | "Bu modül, müzayede modülünden **bağımsız** çalışır ve her iki mod aynı ürün için **eş zamanlı aktif edilemez**." | ASKP-08 doğru yansıtıyor | Ama eğer bir ürün müzayedede iken satıcı "Fiyat Sor" açmak isterse UX ne olacak? Hata mesajı? Otomatik engel? | Low — UX detayı |

---

## D. HIGH-LEVEL ONLY (covered in principle, lacks implementation detail)

| # | Contract Ref | Clause | Plan Ref | What's Missing at Implementation Level |
|---|-------------|--------|----------|---------------------------------------|
| D1 | §EK1-M20 | "Kullanıcı davranışlarını izleyen ve değerlendiren bir güven sistemi kurulur." | TRST-01..04 | **Güven puanı algoritması** tanımsız. Hangi metrikler? Ağırlıkları? Eşik değerleri? Puan = weighted average mi? ML mi? Basit kural seti mi? |
| D2 | §EK1-M22 | "Ürün görselleri ve medya içerikleri sisteme yüklenirken optimize edilir. Bu optimizasyon kalite ve dosya boyutu dönüştürme açısından **en verimli** şekilde oluşturulmalıdır." | PROD-03 | **Optimizasyon parametreleri** tanımsız. Max dosya boyutu? Hedef çözünürlük? WebP/AVIF format? Thumbnail boyutları? Lazy loading stratejisi? |
| D3 | §5, 4.satır | "Müzayede süreci bir durum makinesiyle yönetilir: taslak → yayında → aktif → bitti → tamamlandı → iptal." | AUCT-08 | **Geçiş koşulları** tam belirtilmemiş. taslak→yayında: admin onay mı? yayında→aktif: başlangıç zamanı mı? bitti→tamamlandı: ödeme alındı mı? İptal: kim iptal edebilir? |
| D4 | §EK1-M18 | "Bildirim sistemi gerçek zamanlı çalışır... Bildirimler hem push notification (OneSignal) hem de uygulama içi mesaj olarak sunulur." | NOTF-01..07 | **Bildirim template'leri** tanımsız. Hangi bildirim hangi kanalda (push/in-app/email)? Her bildirim tipi için metin şablonu? Deeplinking hedefi? |
| D5 | §13, 6.bullet | "Reklam yönetim modülü, organik sıralama sisteminden teknik olarak ayrıştırılır; reklam içerikleri **açıkça etiketlenerek** kullanıcıya sunulur." | ADS-06 "etiketlenir" | **Etiketleme formatı** tanımsız. "Sponsorlu" badge mi? Renk farkı mı? Ayrı bölüm mü? UI tasarım detayı yok. |

---

## E. RISKY ASSUMPTIONS (plan assumes something not stated in contract)

| # | Assumption in Plan | Contract Says | Risk | Impact |
|---|-------------------|---------------|------|--------|
| E1 | AUCT-11: "max 10 uzatma, kademeli 60→45→30sn" | §5: "süre otomatik uzatılır" — limit yok | Medium | Müşteri limitsiz uzatma bekleyebilir |
| E2 | AUCT-T-03: "≥3 teklif son 60sn → 2dk, max 3 uzatma" | §5: "hızlı üst üste ve çok pey verilmesi halinde 2-3 dakika" | Medium | "Çok pey" = 3 mü, 5 mi, 10 mu? |
| E3 | WALL-12: "24 saat grace period" | §6: "ödeme yapılmaması durumunda" — süre belirtilmemiş | Low | Müşteri 48h veya 72h bekleyebilir |
| E4 | Escrow 14 gün otomatik onay | §6: "belirlenen süre" — süre yok | Low | Kullanıcı onayladı ama müşteri fikir değiştirebilir |
| E5 | Kargo API v2'ye ertelenmiş | §EK1-M21: Status "Var" (zorunlu kapsam) | **HIGH** | **Kontrat ihlali riski** — yazılı onay şart |
| E6 | BullMQ yeterli, RabbitMQ gerekmez | §EK1-M10: "RabbitMQ entegrasyonu" | Low | Gerekçe belgelenmiş, teknik alternatif hakkı var |
| E7 | Caddy kullanılacak (Nginx yerine) | Kontrat teknoloji belirtmiyor | Low | §12 geliştirici alternatif hakkı tanıyor |
| E8 | "Paketim" = profil/hesap bilgileri | §12: "Hesabım ve Paketim" | Medium | Üyelik paketi sistemi ise scope büyür |
| E9 | Mesajlaşma sadece Fiyat Sor kapsamında | §12: "Mesajlar ve Bildirimler" profil menüsünde | Low | Genel alıcı-satıcı mesajlaşma da istenebilir — kullanıcı "sadece Fiyat Sor yeterli" dedi |

---

## SUMMARY

| Category | Count | Critical |
|----------|-------|----------|
| A — Fully Missing | 6 | A1 (Kargo), A5 (servis hesabı yasağı) |
| B — Partially Specified | 14 | B2 (üyelik ödemeleri), B4 (kişiselleştirilmiş sıralama) |
| C — Ambiguous | 8 | C4 (Paketim), C5 (banka/cüzdan ilişkisi) |
| D — High-Level Only | 5 | D1 (güven algoritması), D3 (durum makinesi geçişleri) |
| E — Risky Assumptions | 9 | E5 (kargo), E8 (paketim) |
| **TOTAL** | **42** | |

---

## TOP 5 ACTION ITEMS

| Priority | Item | Action | Urgency |
|----------|------|--------|---------|
| 🔴 1 | **E5/A1 — Kargo API** | Müşteriden yazılı "v2'ye ertelendi" onayı al | **Bu hafta** |
| 🔴 2 | **C4/E8/B8 — "Paketim" ne?** | Müşteriye sor: üyelik paketi mi, hesap bilgileri mi? | **Bu hafta** |
| 🟡 3 | **B2 — "Üyelik ödemeleri"** | Kontrat §4 "reklam-üyelik ödemeleri" diyor — üyelik sistemi var mı? | **Phase 1 öncesi** |
| 🟡 4 | **B4 — Kişiselleştirilmiş sıralama** | Basit kural seti (favoriler + son görüntüleme) yeterli mi? | **Phase 4 öncesi** |
| 🟡 5 | **D3 — Durum makinesi geçiş kuralları** | Her geçiş için trigger + guard + action dokumentasyonu | **Phase 5 öncesi** |
