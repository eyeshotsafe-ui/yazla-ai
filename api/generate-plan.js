const { createJsonResponse } = require('./_lib/openai');

const schema = {
  type: 'object', additionalProperties: false,
  required: ['title', 'subtitle', 'estimatedWords', 'chapters'],
  properties: {
    title: { type: 'string' }, subtitle: { type: 'string' }, estimatedWords: { type: 'integer' },
    chapters: { type: 'array', minItems: 4, maxItems: 8, items: { type: 'object', additionalProperties: false, required: ['title', 'brief'], properties: { title: { type: 'string' }, brief: { type: 'string' } } } }
  }
};
function fallbackPlan(idea) {
  const title = idea.trim().split(/\s+/).slice(0, 7).join(' ');
  const labels = ['Temeli netleştirmek', 'Hedef kitleyi anlamak', 'Değer önerisini kurmak', 'Ürünü yapılandırmak', 'Satış sayfasını hazırlamak', 'Yayınla ve geliştir'];
  return { title, subtitle: 'Fikirden satışa pratik yol haritası', estimatedWords: 4200, generatedWithFallback: true, chapters: labels.map((label, index) => ({ title: `${index + 1}. ${label}`, brief: `${idea} için ${label.toLocaleLowerCase('tr-TR')} adımını örnekler ve uygulanabilir kontrol listeleriyle anlatır.` })) };
}
function isUsableTurkishPlan(plan) {
  if (!plan?.title || !Array.isArray(plan.chapters) || plan.chapters.length < 4) return false;
  const sample = `${plan.title} ${plan.subtitle || ''} ${plan.chapters.map(item => item.title).join(' ')}`.toLocaleLowerCase('tr-TR');
  return !/\b(chapter|guide to|selling your|how to|first digital|building your|launch your)\b/.test(sample);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Yalnızca POST desteklenir.' });
  const { idea, type = 'Pratik rehber', tone = 'Samimi ve güven veren' } = req.body || {};
  if (!idea || idea.length < 8) return res.status(400).json({ error: 'Lütfen daha ayrıntılı bir kitap fikri girin.' });
  try {
    const plan = await createJsonResponse({
      name: 'turkish_book_plan', schema,
      system: 'Sen deneyimli bir Türkçe editörsün. Ticari dijital kitaplar için özgün, faydalı ve doğrulanabilir planlar hazırlarsın. Uydurma istatistik, telifli metin veya garanti içeren iddialar kullanmazsın. Yanıt dilin Türkçedir.',
      input: `Kitap fikri: ${idea}\nTür: ${type}\nTon: ${tone}\n6 civarında mantıksal sırada bölümden oluşan, satılabilir kısa bir e-kitap planı üret. Başlıklar somut ve özgün olsun.`
    });
    res.status(200).json(isUsableTurkishPlan(plan) ? plan : fallbackPlan(idea));
  } catch { res.status(200).json(fallbackPlan(idea)); }
};
