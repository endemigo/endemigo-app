# Modüler Mimari & UI/UX Kodlama Kuralları (AI Agent Yönergeleri)

Aşağıdaki kurallar, AI Agent'ların mobil uygulama (React Native/Expo) üzerinde yapacağı tüm işlemlerde **kesin ve değişmez (strict & immutable)** olarak uygulanmalıdır. Kod üretirken bu kuralları ihlal etmeyin:

## 1. Stilleri Ayırma (Separation of Styles)
- **KURAL:** Stil kodları (`StyleSheet`) daima ana bileşen (component/screen) kodundan KESİN OLARAK izole edilmelidir.
- **UYGULAMA VE İSTİSNA:** Sayfalarda (Screens) dosya büyüklüğüne bakılmaksızın stiller her zaman ayrılmalıdır. Component'lerde ise şu sınırlara uyulur:
  - **Sınır:** Eğer bir Component dosyasının toplam uzunluğu **100 satırı** geçiyorsa veya sadece `StyleSheet.create` mantığı **30 satırdan** fazla yer kaplıyorsa bu yapı "büyük (complex)" kabul edilir ve KESİN OLARAK koparılmalıdır. 
  - **İstisna:** Üzerinde tasarımı yöneten ancak çok az mantık barındıran (toplam ~50-60 satırlık, stilleri oldukça kısa) `ThemedText`, `IconSymbol` gibi "Atomik Yapılar" tek dosyada bırakılır.
- **DİZİN MİMARİSİ (Co-location):** Çıkarılan `*.styles.ts` dosyaları projenin başka bir yerindeki genel bir `styles/` klasörüne **ASLA konulmaz**. Stiller, her zaman kime aitse o bileşen veya sayfa ile **aynı dizinde (yan yana)** bulunmalıdır. (Örn: `components/ui/Banner.tsx` ve `components/ui/Banner.styles.ts` yan yana olmalıdır). Satır içi `style={{ marginTop: 10 }}` kullanımları kesinlikle yasaktır.

## 2. DRY & Component Mantığı (Reusable Components)
- **KURAL:** Tekrar eden UI yapıları (ikon, buton, scroll list, kart vb.) daima bir React Component'i olarak çıkarılmalıdır.
- **UYGULAMA:** Herhangi bir UI blokunu `app/(tabs)/` veya benzeri ekran dosyalarında manuel olarak kopyala-yapıştır yapmayın. `components/ui/` dizini altına modüler, props alan esnek bileşenler oluşturup onları çağırın.

## 3. Renk Paleti ve Tema Bağımlılığı (Strict Theming)
- **KURAL:** `constants/theme.ts` içerisinde tanımlanan renk paleti (`Colors.x`) dışına çıkmak KESİNLİKLE yasaktır.
- **UYGULAMA:** Yeni bir tasarım gerektiğinde `raw hex` veya `rgb` tonları kafanıza göre eklemeyin. Önceden var olan temayı (`colors`) kullanın. Eğer mevcut renkler kesinlikle yetmiyorsa ve palet dışına çıkılması teknik bir zorunluluksa, ilerlemeden önce **KULLANICIYA MUTLAKA SORUN/ONAY ALIN**.

## 4. Modüler Dosya Yapısı (File Modularity)
- **KURAL:** Mobil uygulama kodu "modüler" olmak zorundadır. Tek bir dosyayı binlerce satır şişirmek kabul edilemez.
- **UYGULAMA:** Karmaşık logic'leri Custom Hook'lara (`hooks/`), API/Servis adaptörlerini kendi sınıflarına (`lib/`), büyük UI bölümlerini (örneğin Dashboard'daki Carousel alanı, Product Grid alanı) küçük Sub-Component'lere ayırın ve ana ekrana import ederek kullanın.

## 5. Doğru Dosyalama ve Temiz Kod Stili (Self-Documenting Code)
- **KURAL:** Kodlarda neyin neden yapıldığını belirten, geliştiriciye rehberlik edecek anlaşılır açıklamalar mutlaka yazılmalıdır.
- **UYGULAMA:** Yazılan bir algoritma, hook kullanım kararı veya bir veritabanı sorgusu **karmaşık veya alışılmışın dışındaysa**, "neden bu yapının, bu şekilde tercih edildiği" koda yorum satırı (comment) olarak eklenmelidir. İsimlendirmeler "ne yaptığı" hakkında fikir vermeli, projedeki her karmaşık düğümde karar gerekçeniz belgelenmelidir.

## 6. İsimlendirme Standartları (Naming Conventions)
- **KURAL:** İsimlendirmelerde kesinlikle Türkçe karakter veya Türkçe kelime kullanılmayacak. Tüm yapılar dünya standartlarına (Global Naming Conventions) uygun olmalıdır.
- **UYGULAMA:** Kafaya göre büyük/küçük harf veya _, -, . gibi sembolik ayırıcılar kullanılmayacaktır:
  - **Bileşenler, Sınıflar ve Interface'ler:** `PascalCase` kullanılmalı (Örn: `ProductCard`, `AuthService`, `UserDto`).
  - **Değişkenler ve Fonksiyonlar:** `camelCase` kullanılmalı (Örn: `getUserProfile`, `discountedPrice`).
  - **Sabit Değerler (Constants):** `SCREAMING_SNAKE_CASE` kullanılmalı (Örn: `MAX_UPLOAD_SIZE`, `API_URL`).
  - **Dosya İsimleri:** Kategoriye göre standartlaşmalı (React Component'ler için `PascalCase.tsx`, utils/hooks için `camelCase.ts` veya `kebab-case.ts`).

## 7. Klasörlendirme Standartları (Folder Structure & Segregation)
- **KURAL:** Projede karmaşaya yer vermeyecek, neyin nerede olduğunun ilk bakışta anlaşılacağı, amaca yönelik bir dizin (folder) yapısı kullanılacaktır.
- **UYGULAMA:**
  - `components/`: Uygulama genelinde tekrar edilebilir (button, card vb.) veya sayfalara özel UI parçaları (örn. `components/ui/`, `components/forms/`).
  - `hooks/`: Sadece React Custom Hook'ları dahil edilmeli. Veri çekme (React Query vb.) ve state logic işlemleri burada izole edilmeli.
  - `services/`: API endpoint istekleri, backend haberleşmeleri ve asenkron veri servis fonksiyonları (Örn: `authService.ts`, `api.ts`).
  - `utils/`: Uygulama genelinde tekrar edilen saf (pure) yardımcı fonksiyonlar (Örn: tarih formatlama, fiyat hesaplama, string manipülasyonu - `dateUtils.ts`).
  - `lib/`: Üçüncü parti kütüphane adaptörleri veya framework konfigürasyonları (Örn: `mockService.ts`, `supabase.ts`).
  - `assets/`: Resimler, ikonlar, fontlar ve dışarıdan alınan statik materyaller.
  - `constants/`: Tema (`theme.ts`), API linkleri ve global sabitlerin bulunduğu dizin.
  - **Uygulama İçi İhlal:** Fonksiyonlar (helper veya API bazlı) UI bileşenlerinin (`components/` veya `app/`) içerisinde tanımlanamaz; doğru klasöre (`utils/` veya `services/`) taşınıp oradan çağrılmalıdır. Her klasör *tek bir anlam ve amaç* barındırır.

## 8. State (Durum) Yönetimi Standardı (State Management Hierarchy)
- **KURAL:** Verinin kaynağına göre doğru state yönetim aracı kullanılmalıdır.
- **UYGULAMA:**
  - **Server State:** Veritabanından, servislerden veya API'den gelen asenkron veriler DAİMA `TanStack Query (React Query)` ile yönetilecek, önbellekleme (caching) buradan yapılacaktır.
  - **Global Client State:** Uygulama genelini ilgilendiren, ekranlar arası paylaşılan (Örn: aktif kullanıcı bilgisi, tema tercihi, sepet içeriği) veriler DAİMA `Zustand` ile yönetilecektir. `Zustand` store'ları modüler olmalı (`authStore.ts`, `cartStore.ts`).
  - **Local State:** Sadece bulunduğu ekranı veya bileşeni ilgilendiren senkron veriler (Örn: dropdown'ın açık/kapalı olması, form geçici input verisi) React'in kendi `useState` veya `useReducer` hook'u ile tutulacaktır. Bu veriler gereksiz yere Global State'e taşınmaz.

## 9. Çoklu Dil Bağımlılığı (Strict i18n)
- **KURAL:** Ekrana (Kullanıcıya) basılan metinlerde hardcoded (doğrudan yazılmış) string kullanımı KESİNLİKLE YASAKTIR.
- **UYGULAMA:** `<Text>`, `<Button>`, `Alert()` veya Toast mesajlarında görünen metinlerin tamamı `react-i18next` kullanımından (`const { t } = useTranslation()`) geçerek `t('key.name')` formatıyla basılacaktır. Eklenen her anahtar mutlaka projedeki (`i18n/tr.json` ve `i18n/en.json`) sözlüklere senkron olarak işlenmelidir.

## 10. Type Safety (Tip Güvenliği - TypeScript) Constraints
- **KURAL:** "Saldım çayıra, mevlam kayıra" yaklaşımıyla güvensiz değişken atamak yasaktır. 
- **UYGULAMA:** Hiçbir koşulda veri yapılarında tembelce `any` kullanılamaz. Fonksiyonlardan dönen sonuçlar, parametreler, Custom Hook'lar ve Props yapıları mutlaka `interface` veya `type` kullanılarak tipleştirilmelidir. Kodlar statik tipleme zafiyeti veya ts hatası bırakmayacak şekilde kusursuz üretilmelidir.

## 11. Native Alert / Prompt Yasakları (Custom UI Modals)
- **KURAL:** React Native'in yerleşik `Alert.alert()` veya `Prompt` metodları kesinlikle KULLANILMAYACAKTIR.
- **UYGULAMA:** Uygulamanın "premium/hibrit" hissiyatını korumak için, işletim sisteminin (iOS/Android) default sistem pencereleri yerine uygulamanın kendi tasarım diline (tema ve fontlarına) uygun, animasyonlu *Custom Modal* bileşenleri (`components/ui/CustomModal`) kullanılacaktır. Sistem uyarıları, onay kutuları ve hata mesajları da dahil olmak üzere tüm bildirimler bu özel modallar üzerinden gösterilmelidir.

## 12. API Yanıt Formatı — Hibrit Mesaj Kodu (Strict API Response Codes)
- **KURAL:** Backend'den dönen TÜM yanıtlar (başarılı veya hata) **hem makine tarafından okunabilir bir `code`** hem de **insana yönelik bir `message`** içermelidir. Sadece Türkçe/İngilizce metin döndürmek KESİNLİKLE YASAKTIR.
- **UYGULAMA:**
  - **Başarılı yanıtlar:** `{ "code": "ACCOUNT_REACTIVATED", "message": "Hesabınız başarıyla geri aktifleştirildi", ...data }`
  - **Hata yanıtları:** `{ "code": "ALREADY_SELLER", "message": "Zaten satıcısınız" }`
  - Kodlar `SCREAMING_SNAKE_CASE` formatında olmalıdır (Örn: `REGISTER_SUCCESS`, `INVALID_CREDENTIALS`, `INSUFFICIENT_BALANCE`)
  - Mobile tarafta çeviri: `t(\`api.${response.code}\`) || response.message` — code i18n key olarak kullanılır, message fallback'tir
  - Tüm kodlar `backend/src/shared/constants/response-codes.ts` dosyasında merkezi olarak tanımlanmalıdır
  - Yeni bir endpoint yazıldığında ilgili kodun bu dosyaya eklenmesi **zorunludur**

## 13. Veritabanı Enum Stratejisi — PostgreSQL ENUM Zorunlu
- **KURAL:** Tüm durum/tip kolonları PostgreSQL `ENUM` tipi ile tanımlanmalıdır. VARCHAR ile enum simülasyonu YASAKTIR.
- **UYGULAMA:**
  - TypeScript enum'lar `backend/src/shared/types/` altında `string` değerli olarak tanımlanmalı
  - Entity'lerde `{ type: 'enum', enum: MyEnum, default: MyEnum.DEFAULT }` kullanılmalı
  - Yeni enum değeri eklemek: TypeScript enum'a satır ekle → TypeORM `synchronize:true` (dev) veya `ALTER TYPE ADD VALUE` (prod)
  - Her enum için ilgili `.enum.ts` dosyası oluşturulmalı ve export edilmeli

## 14. Test Standardı — Fazlara Bağlı Progresif Test
- **KURAL:** Her backend service dosyası için `.spec.ts` unit test dosyası ZORUNLUDUR. Bir phase tamamlandığında ilgili service testleri de yazılmış olmalıdır.
- **ZORUNLU (her phase'de):**
  - Service unit test: happy path + error case + edge case üçlüsü minimum
  - E2E: her yeni endpoint en az 1 happy + 1 error test
- **PHASE-BAZLI EK TESTLER:**
  - Phase 5 (Müzayede): concurrent bid, anti-sniping, transaction lock testleri
  - Phase 6 (Ödeme): escrow flow, webhook idempotency, refund edge case
  - Phase 10 (Deploy): load test (k6, 10K user), DTO validation testleri, code coverage >%80
- **DEFERRED (launch öncesi):**
  - Controller-level testler
  - Guard/Middleware unit testleri
  - Security testleri (injection, XSS)

> **AGENT DİREKTİFİ:** Bu kurallar esnemez kısıtlamalar (hard constraints) olup, prompt veya revizyon isteklerinde aksi açıkça belirtilmedikçe otomatik olarak uygulanacaktır. GSD komutları dahilindeki tüm ajanların en yüksek öncelikte dikkate alacağı metin budur.
