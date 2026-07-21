const { createJsonResponse } = require('./_lib/openai');

const schema = {
  type: 'object', additionalProperties: false,
  required: ['title', 'subtitle', 'titleOptions', 'estimatedWords', 'chapters'],
  properties: {
    title: { type: 'string' }, subtitle: { type: 'string' }, estimatedWords: { type: 'integer' },
    titleOptions: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'object', additionalProperties: false, required: ['title', 'subtitle'], properties: { title: { type: 'string' }, subtitle: { type: 'string' } } } },
    chapters: { type: 'array', minItems: 12, maxItems: 24, items: { type: 'object', additionalProperties: false, required: ['title', 'brief'], properties: { title: { type: 'string' }, brief: { type: 'string' } } } }
  }
};
function fallbackPlan(idea, language = 'tr', chapterCount = 18) {
  const isEnglish = language === 'en'; const baseTitle = idea.trim().split(/\s+/).slice(0, 8).join(' ');
  const tr = ['Başlangıç noktasını belirlemek','Okuyucuyu ve ihtiyacını anlamak','Doğru problemi seçmek','Net bir değer önerisi kurmak','Fikri doğrulamak','İçerik sistemini tasarlamak','İlk taslağı oluşturmak','Güçlü bir anlatı kurmak','Örneklerle derinleştirmek','Uygulanabilir araçlar eklemek','Görsel yönü belirlemek','Ürünü paketlemek','Fiyatı konumlandırmak','Satış mesajını yazmak','Mağaza sayfasını hazırlamak','İlk lansmanı yapmak','Geri bildirim toplamak','Ürünü iyileştirmek','Yeni kanallar açmak','Sadık bir kitle kurmak','Katalog stratejisi geliştirmek','Süreçleri otomatikleştirmek','Ölçmek ve öğrenmek','Sürdürülebilir biçimde büyümek'];
  const en = ['Define the starting point','Understand the reader','Choose the right problem','Build a clear value proposition','Validate the idea','Design the content system','Create the first draft','Build a compelling narrative','Deepen with examples','Add practical tools','Define the visual direction','Package the product','Position the price','Write the sales message','Prepare the storefront','Launch the first version','Collect feedback','Improve the product','Open new channels','Build a loyal audience','Develop a catalog strategy','Automate the workflow','Measure and learn','Grow sustainably'];
  const labels = (isEnglish ? en : tr).slice(0, chapterCount);
  const titleOptions = isEnglish ? [{ title: baseTitle, subtitle: 'A practical roadmap from idea to market' },{ title: `The Complete Guide to ${baseTitle}`, subtitle: 'Build, publish, and grow with confidence' },{ title: `${baseTitle}: The Blueprint`, subtitle: 'A step-by-step system for meaningful results' }] : [{ title: baseTitle, subtitle: 'Fikirden sonuca uzanan pratik yol haritası' },{ title: `${baseTitle}: Eksiksiz Rehber`, subtitle: 'Adım adım oluştur, yayınla ve geliştir' },{ title: `${baseTitle} için Yol Haritası`, subtitle: 'Daha net, uygulanabilir ve sürdürülebilir bir sistem' }];
  return { title: titleOptions[0].title, subtitle: titleOptions[0].subtitle, titleOptions, estimatedWords: chapterCount * 700, generatedWithFallback: true, chapters: labels.map((label, index) => ({ title: `${index + 1}. ${label}`, brief: isEnglish ? `${label} for ${idea}, supported by practical examples and an actionable checklist.` : `${idea} için ${label.toLocaleLowerCase('tr-TR')} adımını örnekler ve uygulanabilir kontrol listeleriyle anlatır.` })) };
}
function isUsablePlan(plan, language, chapterCount) {
  if (!plan?.title || !Array.isArray(plan.titleOptions) || plan.titleOptions.length !== 3 || !Array.isArray(plan.chapters) || plan.chapters.length !== chapterCount) return false;
  const sample = `${plan.title} ${plan.subtitle || ''} ${plan.chapters.map(item => item.title).join(' ')}`.toLocaleLowerCase('tr-TR');
  return language === 'en' || !/\b(chapter|guide to|selling your|how to|first digital|building your|launch your)\b/.test(sample);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Yalnızca POST desteklenir.' });
  const { idea, type = 'guide', tone = 'Samimi ve güven veren', language = 'tr', chapterCount: requestedCount = 18 } = req.body || {};
  const chapterCount = Math.min(24, Math.max(12, Number(requestedCount) || 18));
  if (!idea || idea.length < 8) return res.status(400).json({ error: 'Lütfen daha ayrıntılı bir kitap fikri girin.' });
  try {
    const plan = await createJsonResponse({
      name: 'turkish_book_plan', schema,
      system: language === 'en' ? 'You are an experienced English-language book editor. Create original, useful, verifiable commercial ebook plans. Never invent statistics or copy copyrighted text. Respond entirely in English.' : 'Sen deneyimli bir Türkçe kitap editörüsün. Özgün, faydalı ve doğrulanabilir ticari e-kitap planları hazırlarsın. Uydurma istatistik veya telifli metin kullanmazsın. Yanıtın bütünüyle Türkçe olmalıdır.',
      input: `Book idea / Kitap fikri: ${idea}\nFormat: ${type}\nTone / Ton: ${tone}\nLanguage / Dil: ${language}\nCreate exactly ${chapterCount} logically ordered chapters and exactly 3 strong title/subtitle options. Produce a detailed, commercially useful ebook plan.`
    });
    res.status(200).json(isUsablePlan(plan, language, chapterCount) ? plan : fallbackPlan(idea, language, chapterCount));
  } catch { res.status(200).json(fallbackPlan(idea, language, chapterCount)); }
};
