const { createJsonResponse } = require('./_lib/openai');

const schema = {
  type: 'object', additionalProperties: false,
  required: ['title', 'subtitle', 'estimatedWords', 'chapters'],
  properties: {
    title: { type: 'string' }, subtitle: { type: 'string' }, estimatedWords: { type: 'integer' },
    chapters: { type: 'array', minItems: 4, maxItems: 8, items: { type: 'object', additionalProperties: false, required: ['title', 'brief'], properties: { title: { type: 'string' }, brief: { type: 'string' } } } }
  }
};

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
    res.status(200).json(plan);
  } catch (error) { res.status(error.statusCode || 500).json({ error: error.message || 'Plan üretilemedi.' }); }
};
