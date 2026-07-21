const { createJsonResponse } = require('./_lib/openai');

const schema = {
  type: 'object', additionalProperties: false, required: ['title', 'intro', 'sections', 'takeaway'],
  properties: {
    title: { type: 'string' }, intro: { type: 'string' }, takeaway: { type: 'string' },
    sections: { type: 'array', minItems: 3, maxItems: 5, items: { type: 'object', additionalProperties: false, required: ['heading', 'body'], properties: { heading: { type: 'string' }, body: { type: 'string' } } } }
  }
};
function fallbackChapter({ idea, chapter, chapterIndex, language = 'tr' }) {
  const title = chapter.title;
  if (language === 'en') return { title, generatedWithFallback: true, intro: `${title} is an important part of turning ${idea} into a clear and useful result. This chapter gives the reader a practical framework and a concrete next step.`, sections: [
    { heading: 'Clarify the focus', body: 'Begin by defining the desired outcome in one sentence. Identify the reader, the problem they are trying to solve, and the smallest useful result you can help them achieve.' },
    { heading: 'Build an actionable system', body: 'Break the larger goal into checkpoints. Add a question, template, or simple exercise at every stage so that information turns into visible progress.' },
    { heading: 'Improve through feedback', body: 'Treat the first version as a learning tool. Simplify unclear ideas, remove repetition, and strengthen the examples that help readers act with confidence.' }
  ], takeaway: `The strongest next step for ${title} is to give the reader one clear action they can apply immediately.` };
  return { title, generatedWithFallback: true, intro: `${title}, ${idea} fikrini somut ve uygulanabilir bir ürüne dönüştürmenin önemli duraklarından biridir. Bu bölüm, konuyu sadeleştirip bir sonraki doğru adımı seçmene yardımcı olur.`, sections: [
    { heading: 'Önce çerçeveyi netleştir', body: 'İyi bir başlangıç için hedefini tek bir cümleyle tarif et. Kimin hangi sorununu çözdüğünü, ortaya çıkan faydayı ve ilk küçük adımı belirle. Bu açıklık, hem içeriğini hem de satış mesajını güçlendirir.' },
    { heading: 'Uygulanabilir bir sistem kur', body: 'Büyük hedefleri küçük kontrol noktalarına ayır. Her adımın sonunda okuyucunun yapabileceği bir eylem, kullanabileceği bir şablon veya cevaplayabileceği bir soru bırak. Böylece bilgi, gerçek ilerlemeye dönüşür.' },
    { heading: 'Geri bildirimle iyileştir', body: 'İlk taslak nihai ürün değildir. Hedef kitlenin kullandığı dili dinle, anlaşılmayan bölümleri sadeleştir ve işe yarayan örnekleri çoğalt. Düzenli küçük iyileştirmeler, ürünü zamanla daha değerli yapar.' }
  ], takeaway: `${title} için odak noktan, okuyucunun hemen uygulayabileceği tek bir net sonraki adım vermek olmalıdır.` };
}
function isUsableChapter(content, language) {
  if (!content?.title || !content?.intro || !Array.isArray(content.sections) || content.sections.length < 3) return false;
  if (language === 'en') return true;
  const sample = `${content.title} ${content.intro} ${content.sections.map(item => item.heading).join(' ')}`.toLocaleLowerCase('tr-TR');
  return !/\b(chapter|introduction|key takeaway|how to|in this section)\b/.test(sample);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Yalnızca POST desteklenir.' });
  const { idea, type, tone, language = 'tr', bookTitle, chapter, chapterIndex, chapterCount } = req.body || {};
  if (!idea || !chapter?.title) return res.status(400).json({ error: 'Bölüm bilgisi eksik.' });
  try {
    const content = await createJsonResponse({
      name: 'turkish_book_chapter', schema, maxOutputTokens: 2600, timeoutMs: 12000,
      system: language === 'en' ? 'You are a meticulous English-language book writer and editor. Write original, practical, safe content. Never invent sources or promise guaranteed outcomes. Write entirely in English.' : 'Sen titiz bir Türkçe kitap yazarı ve editörsün. Özgün, anlaşılır, pratik ve güvenli içerik yazarsın. Uydurma kaynak veya sonuç garantisi vermezsin. Metnin bütünüyle Türkçe olmalıdır.',
      input: `Book title / Kitap başlığı: ${bookTitle}\nIdea / Fikir: ${idea}\nFormat: ${type}\nTone / Ton: ${tone}\nLanguage / Dil: ${language}\nChapter / Bölüm ${chapterIndex + 1}/${chapterCount}: ${chapter.title}\nBrief / Özet: ${chapter.brief}\nWrite 450-650 words with an introduction, 3-5 useful sections, and one actionable takeaway.`
    });
    res.status(200).json(isUsableChapter(content, language) ? content : fallbackChapter({ idea, chapter, chapterIndex, language }));
  } catch { res.status(200).json(fallbackChapter({ idea, chapter, chapterIndex, language })); }
};
