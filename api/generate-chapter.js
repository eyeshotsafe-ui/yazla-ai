const { createJsonResponse } = require('./_lib/openai');

const schema = {
  type: 'object', additionalProperties: false, required: ['title', 'intro', 'sections', 'takeaway'],
  properties: {
    title: { type: 'string' }, intro: { type: 'string' }, takeaway: { type: 'string' },
    sections: { type: 'array', minItems: 3, maxItems: 5, items: { type: 'object', additionalProperties: false, required: ['heading', 'body'], properties: { heading: { type: 'string' }, body: { type: 'string' } } } }
  }
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Yalnızca POST desteklenir.' });
  const { idea, type, tone, bookTitle, chapter, chapterIndex, chapterCount } = req.body || {};
  if (!idea || !chapter?.title) return res.status(400).json({ error: 'Bölüm bilgisi eksik.' });
  try {
    const content = await createJsonResponse({
      name: 'turkish_book_chapter', schema, maxOutputTokens: 5500,
      system: 'Sen titiz bir Türkçe kitap yazarı ve editörsün. Özgün, anlaşılır, pratik ve güvenli içerik yazarsın. Tıbbi, hukuki ya da finansal konularda kesin tavsiye, uydurma kaynak veya sonuç garantisi vermezsin. Metin, dijital kitap için temiz paragraflar halinde Türkçe yazılmalıdır.',
      input: `Kitap başlığı: ${bookTitle}\nAna fikir: ${idea}\nTür: ${type}\nYazım tonu: ${tone}\nBölüm ${chapterIndex + 1}/${chapterCount}: ${chapter.title}\nBölüm özeti: ${chapter.brief}\nBu bölümü yaklaşık 700-950 kelime olacak şekilde yaz. Giriş, 3-5 alt başlık ve uygulanabilir bir kapanış çıkarımı sun.`
    });
    res.status(200).json(content);
  } catch (error) { res.status(error.statusCode || 500).json({ error: error.message || 'Bölüm üretilemedi.' }); }
};
