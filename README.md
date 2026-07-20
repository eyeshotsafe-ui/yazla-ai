# Yazla MVP

Yazla, bir fikirden Türkçe e-kitap planı ve bölüm içeriği üreten Vercel tabanlı bir MVP'dir.

## Vercel ortam değişkenleri

Production ve Preview için aşağıdaki değerleri Vercel Project Settings > Environment Variables alanına ekleyin:

| Değişken | Amaç |
| --- | --- |
| `OPENAI_API_KEY` | Sunucu tarafında kullanılan OpenAI API anahtarı |
| `OPENAI_TEXT_MODEL` | Opsiyonel; varsayılan `gpt-5.6-terra` |
| `POLAR_ACCESS_TOKEN` | Polar Organization Access Token |
| `POLAR_PRODUCT_ID` | Üretici paketine ait Polar ürün UUID'si |
| `POLAR_SERVER` | Opsiyonel; test için `https://sandbox-api.polar.sh/v1` |

Anahtarlar tarayıcı koduna eklenmez ve GitHub'a commit edilmez.

## Akış

1. Kullanıcı fikir girer, `/api/generate-plan` kitap planını üretir.
2. Kullanıcı planı düzenler.
3. `/api/generate-chapter` her bölümü ayrı üretir; ilerleme arayüzde gösterilir.
4. Tamamlanan kitap tarayıcıda saklanır ve sistem yazdırma penceresi üzerinden PDF olarak kaydedilir.
5. Ücretli paket butonu `/api/create-checkout` üzerinden Polar Checkout'a yönlendirir.
