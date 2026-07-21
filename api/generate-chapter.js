const { createJsonResponse } = require('./_lib/openai');

const schema = {
  type: 'object', additionalProperties: false, required: ['title', 'intro', 'sections', 'takeaway'],
  properties: {
    title: { type: 'string' }, intro: { type: 'string' }, takeaway: { type: 'string' },
    sections: { type: 'array', minItems: 3, maxItems: 5, items: { type: 'object', additionalProperties: false, required: ['heading', 'body'], properties: { heading: { type: 'string' }, body: { type: 'string' } } } }
  }
};
function fallbackChapter({ idea, chapter, chapterIndex }) {
  const title = chapter.title;
  return { title, generatedWithFallback: true, intro: `${title}, ${idea} fikrini somut ve uygulanabilir bir ürüne dönüştürmenin önemli duraklarından biridir. Bu bölüm, konuyu sadeleştirip bir sonraki doğru adımı seçmene yardımcı olur.`, sections: [
    { heading: 'Önce çerçeveyi netleştir', body: 'İyi bir başlangıç için hedefini tek bir cümleyle tarif et. Kimin hangi sorununu çözdüğünü, ortaya çıkan faydayı ve ilk küçük adımı belirle. Bu açıklık, hem içeriğini hem de satış mesajını güçlendirir.' },
    { heading: 'Uygulanabilir bir sistem kur', body: 'Büyük hedefleri küçük kontrol noktalarına ayır. Her adımın sonunda okuyucunun yapabileceği bir eylem, kullanabileceği bir şablon veya cevaplayabileceği bir soru bırak. Böylece bilgi, gerçek ilerlemeye dönüşür.' },
    { heading: 'Geri bildirimle iyileştir', body: 'İlk taslak nihai ürün değildir. Hedef kitlenin kullandığı dili dinle, anlaşılmayan bölümleri sadeleştir ve işe yarayan örnekleri çoğalt. Düzenli küçük iyileştirmeler, ürünü zamanla daha değerli yapar.' }
  ], takeaway: `${title} için odak noktan, okuyucunun hemen uygulayabileceği tek bir net sonraki adım vermek olmalıdır.` };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Yalnızca POST desteklenir.' });
  const { idea, type, tone, bookTitle, chapter, chapterIndex, chapterCount } = req.body || {};
  if (!idea || !chapter?.title) return res.status(400).json({ error: 'Bölüm bilgisi eksik.' });
  try {
    const content = await createJsonResponse({
      name: 'turkish_book_chapter', schema, maxOutputTokens: 2600,
      system: 'Sen titiz bir Türkçe kitap yazarı ve editörsün. Özgün, anlaşılır, pratik ve güvenli içerik yazarsın. Tıbbi, hukuki ya da finansal konularda kesin tavsiye, uydurma kaynak veya sonuç garantisi vermezsin. Metin, dijital kitap için temiz paragraflar halinde Türkçe yazılmalıdır.',
      input: `Kitap başlığı: ${bookTitle}\nAna fikir: ${idea}\nTür: ${type}\nYazım tonu: ${tone}\nBölüm ${chapterIndex + 1}/${chapterCount}: ${chapter.title}\nBölüm özeti: ${chapter.brief}\nBu bölümü yaklaşık 450-600 kelime olacak şekilde yaz. Giriş, 3-5 alt başlık ve uygulanabilir bir kapanış çıkarımı sun.`
    });
    res.status(200).json(content);
  } catch { res.status(200).json(fallbackChapter({ idea, chapter, chapterIndex })); }
};
