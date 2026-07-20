const OPENAI_URL = 'https://api.openai.com/v1/responses';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function readOutput(response) {
  if (response.output_text) return response.output_text;
  return (response.output || []).flatMap(item => item.content || [])
    .filter(item => item.type === 'output_text')
    .map(item => item.text).join('');
}

async function createJsonResponse({ name, schema, system, input, maxOutputTokens = 5000 }) {
  if (process.env.OPENROUTER_API_KEY) {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://bu-blond.vercel.app',
        'X-Title': 'Yazla'
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'openrouter/free',
        messages: [{ role: 'system', content: system }, { role: 'user', content: input }],
        response_format: { type: 'json_schema', json_schema: { name, strict: true, schema } },
        max_tokens: maxOutputTokens
      })
    });
    const payload = await response.json();
    if (!response.ok) {
      const error = new Error(payload?.error?.message || 'OpenRouter isteği başarısız oldu.');
      error.statusCode = response.status;
      throw error;
    }
    try { return JSON.parse(payload.choices?.[0]?.message?.content || ''); }
    catch { throw new Error('Ücretsiz model beklenen biçimde yanıt vermedi. Lütfen yeniden deneyin.'); }
  }
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error('OPENROUTER_API_KEY veya OPENAI_API_KEY ortam değişkeni eksik.');
    error.statusCode = 503;
    throw error;
  }
  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.OPENAI_TEXT_MODEL || 'gpt-5.6-terra',
      input: [{ role: 'system', content: system }, { role: 'user', content: input }],
      text: { format: { type: 'json_schema', name, strict: true, schema } },
      max_output_tokens: maxOutputTokens
    })
  });
  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload?.error?.message || 'OpenAI isteği başarısız oldu.');
    error.statusCode = response.status;
    throw error;
  }
  try { return JSON.parse(readOutput(payload)); }
  catch { throw new Error('Yapay zekâ yanıtı beklenen biçimde gelmedi. Lütfen tekrar deneyin.'); }
}

module.exports = { createJsonResponse };
