# Ebookera MVP

Ebookera, tek bir fikirden Türkçe veya İngilizce, satışa hazır uzun biçimli e-kitap üreten Vercel tabanlı bir yayın stüdyosudur.

## Vercel ortam değişkenleri

Production ve Preview için aşağıdaki değerleri Vercel Project Settings > Environment Variables alanına ekleyin:

| Değişken | Amaç |
| --- | --- |
| `OPENAI_API_KEY` | Sunucu tarafında kullanılan OpenAI API anahtarı |
| `OPENAI_TEXT_MODEL` | Opsiyonel; varsayılan `gpt-5.6-terra` |
| `OPENROUTER_API_KEY` | Opsiyonel; varsa ücretsiz `openrouter/free` modeli öncelikli kullanılır |
| `OPENROUTER_MODEL` | Opsiyonel; varsayılan `openrouter/free` |
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
