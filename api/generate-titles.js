const { createJsonResponse } = require('./_lib/openai');

const schema = {
  type: 'object', additionalProperties: false, required: ['options'],
  properties: {
    options: {
      type: 'array', minItems: 3, maxItems: 3,
      items: { type: 'object', additionalProperties: false, required: ['title', 'subtitle'], properties: { title: { type: 'string' }, subtitle: { type: 'string' } } }
    }
  }
};

function fallbackTitles(idea, language) {
  const subject = idea.trim().split(/\s+/).slice(0, 7).join(' ');
  return language === 'en' ? [
    { title: `${subject}: The Blueprint`, subtitle: 'A practical path from first idea to finished product' },
    { title: `The Complete Guide to ${subject}`, subtitle: 'A clear system for building with confidence' },
    { title: `Make ${subject} Work`, subtitle: 'Simple decisions, useful tools, meaningful results' }
  ] : [
    { title: `${subject}: Yol Haritası`, subtitle: 'İlk fikirden tamamlanmış ürüne uzanan pratik sistem' },
    { title: `${subject} için Eksiksiz Rehber`, subtitle: 'Daha net kararlar ve uygulanabilir sonuçlar' },
    { title: `${subject} İşe Yarasın`, subtitle: 'Sade adımlar, güçlü araçlar, kalıcı ilerleme' }
  ];
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Yalnızca POST desteklenir.' });
  const { idea, type = 'guide', tone = '', language = 'tr', currentTitle = '' } = req.body || {};
  if (!idea || idea.length < 8) return res.status(400).json({ error: 'Kitap fikri eksik.' });
  try {
    const result = await createJsonResponse({
      name: 'book_title_options', schema, maxOutputTokens: 900, timeoutMs: 12000,
      system: language === 'en' ? 'You are an expert English publishing editor. Create original, concise, commercially strong ebook titles. Write entirely in English.' : 'Sen deneyimli bir Türkçe yayın editörüsün. Özgün, kısa ve ticari açıdan güçlü e-kitap başlıkları yazarsın. Yanıtın bütünüyle Türkçe olmalıdır.',
      input: `Idea: ${idea}\nFormat: ${type}\nTone: ${tone}\nLanguage: ${language}\nAvoid repeating this title: ${currentTitle || 'none'}\nReturn exactly three distinct title and subtitle options.`
    });
    const options = Array.isArray(result?.options) && result.options.length === 3 ? result.options : fallbackTitles(idea, language);
    return res.status(200).json({ options });
  } catch {
    return res.status(200).json({ options: fallbackTitles(idea, language), generatedWithFallback: true });
  }
};
