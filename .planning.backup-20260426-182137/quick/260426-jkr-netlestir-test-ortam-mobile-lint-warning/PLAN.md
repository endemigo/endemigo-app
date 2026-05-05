# Quick Task: Test Ortami, Mobile Lint, README Sadelestirme

Tarih: 2026-04-26

## Kapsam

- Backend E2E test ortamını netleştir.
- Mobile lint warninglerini temizle.
- README icinden istenmeyen bolumleri kaldir.
- `.planning/` lokal GSD alani olarak kullanilsin, GitHub'a gitmesin.

## Uygulama Adimlari

- E2E icin izole Docker Compose servisleri ekle.
- Backend package scriptlerine servis baslatma, kapatma ve lokal E2E kosma komutlari ekle.
- Redis configini test ortamlarinda port/password uyumlu hale getir.
- Mobile lint warninglerini koddan temizle.
- README'yi yeni duruma gore sadeleştir.
- Build/lint/unit testleri tekrar kos.

## Kabul Kriterleri

- `npm run lint` mobile tarafinda 0 warning ile gecer.
- Backend unit testleri gecer.
- Backend build gecer.
- E2E servisleri icin tek komutlu lokal calisma yolu vardir.
- README'de istenmeyen bolumler bulunmaz.
