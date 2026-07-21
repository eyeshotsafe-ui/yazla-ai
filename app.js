const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const app = $('#app'), landing = $('main'), toast = $('#toast');
const screens = ['dashboard', 'studio', 'plan', 'generating', 'coloring', 'library'];
const supabaseClient = window.supabase?.createClient(window.EBOOKERA_CONFIG.supabaseUrl, window.EBOOKERA_CONFIG.supabasePublishableKey);
let project = { idea: '', type: 'Pratik rehber', tone: 'Samimi ve güven veren', language: 'tr', chapterCount: 18, title: '', subtitle: '', titleOptions: [], chapters: [], content: [], coverChoice: 'editorial' };
let userEmail = '';
let userId = '';
let credits = 40;
let uiLanguage = window.EbookeraI18n?.lang || localStorage.getItem('ebookera-ui-language') || 'tr';

function creditKey(id = userId) { return `ebookera-credits-${id || 'guest'}`; }
function loadCredits(user) {
  userId = user?.id || ''; userEmail = user?.email || '';
  const remoteCredits = Number(user?.user_metadata?.ebookera_credits);
  const stored = localStorage.getItem(creditKey()); credits = Number.isFinite(remoteCredits) ? remoteCredits : (stored === null ? 40 : Number(stored));
  updateCredits(credits, false);
  if (user && !Number.isFinite(remoteCredits)) supabaseClient.auth.updateUser({ data: { ebookera_credits: 40, ebookera_plan: 'free' } });
}

function openAuth() { $('#auth-modal').classList.remove('hidden'); setTimeout(() => $('#login-email').focus(), 120); }
function closeAuth() { $('#auth-modal').classList.add('hidden'); }
function completeLogin(email) {
  userEmail = email;
  $('.profile b').textContent = userEmail.split('@')[0]; $('.profile small').textContent = userEmail;
  closeAuth(); show('studio'); notify('Stüdyona hoş geldin.');
}
async function initAuth() {
  if (!supabaseClient) return notify('Oturum servisi yüklenemedi.', true);
  const { data } = await supabaseClient.auth.getSession();
  if (data.session?.user?.email) { loadCredits(data.session.user); $('.profile b').textContent = userEmail.split('@')[0]; $('.profile small').textContent = userEmail; }
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    loadCredits(session?.user);
    if (userEmail) { $('.profile b').textContent = userEmail.split('@')[0]; $('.profile small').textContent = userEmail; closeAuth(); if (_event === 'SIGNED_IN') show('dashboard'); }
  });
}
function updateCredits(amount = credits, sync = true) { credits = Math.max(0, amount); if (userId) localStorage.setItem(creditKey(), credits); $('#credit-count').textContent = credits; if ($('#toolbar-credits')) $('#toolbar-credits').textContent = credits; if (sync && userId) supabaseClient.auth.updateUser({ data: { ebookera_credits: credits } }); }

function show(screen) {
  if (screen === 'landing') { app.classList.add('hidden'); landing.classList.remove('hidden'); $('.topbar').classList.remove('hidden'); window.scrollTo(0, 0); return; }
  landing.classList.add('hidden'); $('.topbar').classList.add('hidden'); app.classList.remove('hidden');
  screens.forEach(id => $('#' + id).classList.toggle('hidden', id !== screen));
  $$('.side-nav button').forEach(b => b.classList.toggle('active', b.dataset.screen === screen || (['plan', 'generating'].includes(screen) && b.dataset.screen === 'studio')));
  if (screen === 'dashboard') renderDashboard();
  if (screen === 'library' && !project.content.length) renderLibrary();
  window.EbookeraI18n?.translate(document.body);
  window.scrollTo(0, 0);
}
function notify(message, isError = false) { toast.textContent = message; toast.style.background = isError ? '#a84837' : ''; toast.classList.remove('hidden'); setTimeout(() => toast.classList.add('hidden'), 4500); }
function setButton(button, text, busy) { button.disabled = busy; button.dataset.label ||= button.textContent; button.textContent = busy ? text : button.dataset.label; }
async function request(path, body) {
  const signal = AbortSignal.timeout(65000);
  let res;
  try { res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal }); }
  catch { throw new Error('Bağlantı zaman aşımına uğradı. Lütfen tekrar dene.'); }
  const raw = await res.text(); let data;
  try { data = JSON.parse(raw); } catch { data = { error: 'Sunucu yanıtı okunamadı. Lütfen tekrar dene.' }; }
  if (!res.ok) throw new Error(data.error || 'İstek tamamlanamadı.');
  return data;
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function requestWithRetry(path, body, attempts = 2) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try { return await request(path, body); }
    catch (error) { lastError = error; if (attempt < attempts - 1) await wait(900); }
  }
  throw lastError;
}

$$('[data-screen]').forEach(el => el.addEventListener('click', event => {
  if (el.dataset.screen === 'studio' && !userEmail) { event.preventDefault(); openAuth(); return; }
  show(el.dataset.screen);
}));
$$('[data-open="login"]').forEach(el => el.addEventListener('click', openAuth));
$$('[data-close-auth]').forEach(el => el.addEventListener('click', closeAuth));
$('#email-login').onclick = async () => {
  const email = $('#login-email').value.trim(); const password = $('#login-password').value;
  if (!/^\S+@\S+\.\S+$/.test(email)) { $('#login-email').focus(); return notify('Geçerli bir e-posta adresi yaz.', true); }
  if (password.length < 6) { $('#login-password').focus(); return notify('Şifre en az 6 karakter olmalı.', true); }
  setButton($('#email-login'), 'Bağlanıyor…', true);
  let result = await supabaseClient.auth.signInWithPassword({ email, password });
  if (result.error) result = await supabaseClient.auth.signUp({ email, password });
  setButton($('#email-login'), '', false);
  if (result.error) return notify(result.error.message, true);
  if (!result.data.session) return notify('Supabase panelinde Confirm email ayarını kapatmalısın.', true);
  completeLogin(email);
};
$('#google-login').onclick = async () => {
  try {
    const response = await fetch(`${window.EBOOKERA_CONFIG.supabaseUrl}/auth/v1/settings`, { headers: { apikey: window.EBOOKERA_CONFIG.supabasePublishableKey } });
    const settings = await response.json();
    if (!settings?.external?.google) return notify(uiLanguage === 'en' ? 'Google sign-in is being configured. Please use email for now.' : 'Google girişi Supabase panelinde henüz etkinleştirilmedi. Şimdilik e-posta ile giriş yapabilirsin.', true);
  } catch { return notify(uiLanguage === 'en' ? 'The sign-in service could not be reached.' : 'Giriş servisine ulaşılamadı.', true); }
  const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/` } });
  if (error) notify(error.message, true);
};
$('#login-email').addEventListener('keydown', event => { if (event.key === 'Enter') $('#email-login').click(); });
$('#login-password').addEventListener('keydown', event => { if (event.key === 'Enter') $('#email-login').click(); });
$('#logout-button').onclick = async () => { await supabaseClient.auth.signOut(); userEmail = ''; userId = ''; credits = 40; show('landing'); notify(uiLanguage === 'en' ? 'Signed out.' : 'Oturum kapatıldı.'); };
updateCredits(); initAuth();
$('.idea-chips').addEventListener('click', e => { if (e.target.tagName === 'BUTTON') $('#hero-idea').value = e.target.textContent; });
$('#hero-submit').onclick = () => { $('#book-idea').value = $('#hero-idea').value; if (!userEmail) return openAuth(); show('studio'); };
$$('[data-preview]').forEach(button => button.addEventListener('click', () => {
  $$('[data-preview]').forEach(item => item.classList.toggle('active', item === button));
  $$('[data-preview-page]').forEach(page => page.classList.toggle('active', page.dataset.previewPage === button.dataset.preview));
  $('.preview-count').textContent = button.dataset.preview === 'cover' ? '01 / 02' : '02 / 02';
}));
$$('[data-cover-choice]').forEach(button => button.addEventListener('click', () => {
  project.coverChoice = button.dataset.coverChoice;
  $$('[data-cover-choice]').forEach(item => item.classList.toggle('active', item === button));
  $('#plan-cover-preview').dataset.cover = project.coverChoice;
}));

const typeLabels = {
  tr: { guide: 'Pratik rehber', workbook: 'Çalışma kitabı', report: 'Otorite raporu', fiction: 'Hikâye / kurgu', course: 'Eğitim materyali' },
  en: { guide: 'Practical guide', workbook: 'Workbook', report: 'Authority report', fiction: 'Fiction', course: 'Learning material' }
};
function updateIdeaCount() {
  const length = $('#book-idea').value.length;
  $('#idea-count').textContent = `${length} / 600`;
  $('#idea-hint').textContent = length < 25 ? 'Daha iyi sonuç için detay ekle' : 'Fikrin planlanmaya hazır';
}
function updateFormatSummary() {
  const language = $('#book-language').value; const count = Number($('#book-length').value); const type = $('#book-type').value;
  const detail = language === 'en' ? `English · ${count} chapters · approx. ${Math.round(count * 3)}–${Math.round(count * 5)} pages` : `Türkçe · ${count} bölüm · yaklaşık ${Math.round(count * 3)}–${Math.round(count * 5)} sayfa`;
  $('#format-summary-title').textContent = `${count === 12 ? 'Standart' : count === 18 ? 'Detaylı' : 'Uzun'} ${typeLabels[language][type]}`;
  $('#format-summary-detail').textContent = detail;
}
$('#book-idea').addEventListener('input', updateIdeaCount);
$$('[data-inspiration]').forEach(button => button.onclick = () => { $('#book-idea').value = button.dataset.inspiration; updateIdeaCount(); });
['#book-type', '#book-language', '#book-length'].forEach(selector => $(selector).addEventListener('change', updateFormatSummary));
$('#book-language').value = uiLanguage;
updateFormatSummary();
window.addEventListener('ebookera:language', event => {
  uiLanguage = event.detail.language;
  $('#book-language').value = uiLanguage;
  updateIdeaCount(); updateFormatSummary(); updateGenerationCost();
  if (!$('#dashboard').classList.contains('hidden')) renderDashboard();
  if (!$('#library').classList.contains('hidden') && !project.content.length) renderLibrary();
  window.EbookeraI18n?.translate(document.body);
});

function selectTitle(index) {
  const option = project.titleOptions[index]; if (!option) return;
  project.title = option.title; project.subtitle = option.subtitle;
  $$('.title-option').forEach((button, i) => button.classList.toggle('active', i === index));
  $('#plan-title').textContent = project.title; $('#cover-title').innerHTML = escapeHtml(project.title.toUpperCase()).replace(/\s+/g, '<br>');
  $('#cover-subtitle').textContent = project.subtitle;
}
function renderTitles() {
  $('#title-options').innerHTML = project.titleOptions.map((option, index) => `<button class="title-option${option.title === project.title ? ' active' : ''}" data-title-index="${index}"><span>${String(index + 1).padStart(2, '0')}</span><b>${escapeHtml(option.title)}</b><small>${escapeHtml(option.subtitle)}</small><i>✓</i></button>`).join('');
  $$('[data-title-index]').forEach(button => button.onclick = () => selectTitle(Number(button.dataset.titleIndex)));
}

function renderChapters() {
  $('#chapters').innerHTML = project.chapters.map((chapter, i) => `<div class="chapter"><b>${String(i + 1).padStart(2, '0')}</b><input value="${escapeHtml(chapter.title)}" aria-label="Bölüm ${i + 1}"><button title="Bölümü sil">×</button></div>`).join('');
  $$('.chapter input').forEach((input, i) => input.oninput = () => project.chapters[i].title = input.value);
  $$('.chapter button').forEach((button, i) => button.onclick = () => { project.chapters.splice(i, 1); renderChapters(); });
  updateGenerationCost();
}
function bookCreditCost() { return project.chapters.length + 4; }
function updateGenerationCost() {
  const cost = bookCreditCost(); const label = uiLanguage === 'en' ? `Create ebook · ${cost} credits →` : `E-kitabı oluştur · ${cost} kredi →`;
  ['#generate-button', '#generate-button-mobile'].forEach(selector => { if ($(selector)) $(selector).textContent = label; });
}
function escapeHtml(value = '') { return value.replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[c]); }

$('#plan-button').onclick = async () => {
  const button = $('#plan-button'); const idea = $('#book-idea').value.trim();
  if (!idea) return $('#book-idea').focus();
  project.idea = idea; project.type = $('#book-type').value; project.tone = $('#book-tone').value;
  project.language = $('#book-language').value; project.chapterCount = Number($('#book-length').value);
  try {
    setButton(button, '✦ Plan hazırlanıyor…', true);
    const plan = await request('/api/generate-plan', { idea: project.idea, type: project.type, tone: project.tone, language: project.language, chapterCount: project.chapterCount });
    project = { ...project, ...plan, content: [] };
    project.titleOptions = project.titleOptions?.length === 3 ? project.titleOptions : [{ title: project.title, subtitle: project.subtitle }];
    $('#outline-language').textContent = project.language === 'en' ? 'EN · English' : 'TR · Türkçe';
    $('#outline-summary').textContent = project.language === 'en' ? 'Edit, remove, or add chapters before generation.' : 'Üretimden önce bölümleri düzenleyebilir, silebilir veya ekleyebilirsin.';
    $('#plan-metrics').innerHTML = `<b>${project.language === 'en' ? 'Approx.' : 'Yaklaşık'} ${project.estimatedWords.toLocaleString(project.language === 'en' ? 'en-US' : 'tr-TR')} ${project.language === 'en' ? 'words' : 'kelime'}</b><br>${project.chapters.length} ${project.language === 'en' ? 'chapters · publication-ready draft' : 'bölüm · satışa hazır taslak'}`;
    renderTitles(); selectTitle(Math.max(0, project.titleOptions.findIndex(option => option.title === project.title)));
    renderChapters(); show('plan');
  } catch (error) { notify(error.message, true); } finally { setButton(button, '', false); }
};
$('#add-chapter').onclick = () => { project.chapters.push(project.language === 'en' ? { title: 'New chapter title', brief: 'Explain the central idea of this chapter.' } : { title: 'Yeni bölüm başlığı', brief: 'Bu bölümün ana fikrini açıklar.' }); renderChapters(); };
$('#custom-title').onclick = () => {
  const title = window.prompt(project.language === 'en' ? 'Write your book title' : 'Kitap başlığını yaz', project.title);
  if (!title?.trim()) return;
  const subtitle = window.prompt(project.language === 'en' ? 'Write a subtitle (optional)' : 'Alt başlığını yaz (isteğe bağlı)', project.subtitle) ?? project.subtitle;
  project.titleOptions.unshift({ title: title.trim(), subtitle: subtitle.trim() }); project.titleOptions = project.titleOptions.slice(0, 3);
  project.title = title.trim(); project.subtitle = subtitle.trim(); renderTitles(); selectTitle(0);
};
$('#regenerate-titles').onclick = async () => {
  const button = $('#regenerate-titles');
  if (credits < 1) return notify('Yeni başlıklar için en az 1 kredi gerekiyor.', true);
  try {
    setButton(button, '✦ Başlıklar hazırlanıyor…', true);
    const { options } = await request('/api/generate-titles', { idea: project.idea, type: project.type, tone: project.tone, language: project.language, currentTitle: project.title });
    project.titleOptions = options; updateCredits(credits - 1); renderTitles(); selectTitle(0); notify('3 yeni başlık hazırlandı. 1 kredi kullanıldı.');
  } catch (error) { notify(error.message, true); } finally { setButton(button, '', false); }
};

async function startGeneration() {
  if (!project.chapters.length) return notify('En az bir bölüm eklemelisin.', true);
  const cost = bookCreditCost();
  if (!project.generationCostCharged && credits < cost) return notify(uiLanguage === 'en' ? `You need ${cost} credits for this ebook. Upgrade to Pro to continue.` : `Bu e-kitap için ${cost} kredi gerekiyor. Devam etmek için Pro’ya geçebilirsin.`, true);
  if (!project.generationCostCharged) { updateCredits(credits - cost); project.generationCostCharged = cost; }
  show('generating'); await generateBook();
}
$('#generate-button').onclick = startGeneration;
$('#generate-button-mobile').onclick = startGeneration;
async function generateBook() {
  project.content = []; const list = $('#generation-steps');
  const ui = project.language === 'en' ? { chapter: 'Chapter', writing: 'is being written', ready: 'draft ready', cover: 'Designing cover', layout: 'Formatting book', complete: 'Your book is ready' } : { chapter: 'Bölüm', writing: 'yazılıyor', ready: 'yayın taslağı hazır', cover: 'Kapak tasarlanıyor', layout: 'Kitap düzenleniyor', complete: 'Kitabın hazır' };
  list.innerHTML = project.chapters.map((chapter, i) => `<li>○ ${ui.chapter} ${i + 1}: ${escapeHtml(chapter.title)}</li>`).join('') + `<li>○ ${ui.cover}</li><li>○ ${ui.layout}</li>`;
  const items = $$('#generation-steps li');
  const content = new Array(project.chapters.length); let completed = 0; let cursor = 0;
  async function worker() {
    while (cursor < project.chapters.length) {
      const i = cursor++; items[i].className = 'current';
      $('#progress-label').textContent = `${ui.chapter} ${i + 1}/${project.chapters.length} ${ui.writing}`; $('#live-text').textContent = project.chapters[i].title;
      try {
        content[i] = await requestWithRetry('/api/generate-chapter', { ...project, bookTitle: project.title, chapter: project.chapters[i], chapterIndex: i, chapterCount: project.chapters.length });
        items[i].textContent = `✓ ${ui.chapter} ${i + 1}: ${content[i].title}`;
      } catch { content[i] = createLocalChapter(project.chapters[i], i); items[i].textContent = `✓ ${ui.chapter} ${i + 1}: ${ui.ready}`; }
      items[i].className = 'complete'; completed++; $('#progress-bar').style.width = `${Math.round((completed / (project.chapters.length + 2)) * 100)}%`;
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, project.chapters.length) }, worker)); project.content = content;
  const coverIndex = project.chapters.length;
  items[coverIndex].className = 'current'; $('#progress-label').textContent = ui.cover; $('#live-text').textContent = project.language === 'en' ? 'Preparing typography and the cover color system…' : 'Kapak tipografisi ve renk dünyası hazırlanıyor...';
  await wait(800); project.cover = createCover(); items[coverIndex].className = 'complete'; items[coverIndex].textContent = `✓ ${ui.cover}`;
  items[coverIndex + 1].className = 'complete'; items[coverIndex + 1].textContent = `✓ ${ui.layout}`;
  $('#progress-bar').style.width = '100%'; $('#progress-label').textContent = ui.complete;
  saveProject(); setTimeout(() => { renderBook(); show('library'); notify(project.language === 'en' ? 'Your book is ready. Export it as a PDF.' : 'Kitabın hazır! PDF olarak dışa aktarabilirsin.'); }, 500);
}
function createLocalChapter(chapter, index) {
  const topic = chapter.title || `Bölüm ${index + 1}`;
  const idea = project.idea || 'fikrin';
  if (project.language === 'en') return { title: topic, intro: `${topic} is an important part of turning ${idea} into a useful and publishable product. This chapter offers a clear framework that readers can put into practice.`, sections: [
    { heading: 'Define the focus', body: 'Reduce the desired outcome to one clear sentence. Name the reader, the problem they face today, and the smallest useful result this chapter can help them achieve.' },
    { heading: 'Choose one concrete action', body: 'Break the larger idea into testable parts. A checklist, a short exercise, or a practical template helps the reader turn information into visible progress.' },
    { heading: 'Create a feedback loop', body: 'Read the material in the language of your audience. Simplify unclear points, remove repetition, and end with a specific next step the reader can take with confidence.' }
  ], takeaway: `The best starting point for ${topic} is one clear reader need and one action they can apply immediately.` };
  return { title: topic, intro: `${topic}, ${idea} fikrini uygulanabilir bir ürüne dönüştürmenin en önemli adımlarından biridir. Bu bölümde net, pratik ve tekrar kullanılabilir bir çerçeve bulacaksın.`, sections: [
    { heading: 'Neye odaklanmalısın?', body: `Önce hedefini tek bir cümleye indir. Okuyucunun bugün yaşadığı sorunu, ulaşmak istediği sonucu ve bu sonuca giden en kısa yolu tarif et. Karmaşıklığı azaltmak, ürünün değerini daha görünür kılar.` },
    { heading: 'Küçük ama somut bir adım seç', body: `Her büyük fikri test edilebilir parçalara ayır. Bir kontrol listesi, örnek şablon veya kısa egzersiz; okuyucunun öğrendiğini hemen kullanmasını sağlar. İlk taslağın kusursuz olmasına değil, yararlı olmasına odaklan.` },
    { heading: 'Kendine geri bildirim döngüsü kur', body: `İçeriğini hedef kitlenin diliyle tekrar oku. Anlaşılmayan noktaları sadeleştir, tekrar eden fikirleri çıkar ve her bölümün sonunda net bir sonraki adım bırak. Böylece kitap sadece bilgi değil, hareket de üretir.` }
  ], takeaway: `${topic} için en iyi başlangıç, tek bir okuyucu ihtiyacını netleştirip ona hemen uygulanabilir bir çözüm sunmaktır.` };
}
function createCover() {
  return createCoverFor(project);
}
function createCoverFor(book) {
  const choices = { editorial: ['#293f34','#d8ef68'], warm: ['#9a5d4c','#f0c991'], bold: ['#191e3b','#f25840'] };
  const pick = choices[book.coverChoice] || choices.editorial;
  return { background: pick[0], accent: pick[1], label: book.type || 'Pratik rehber' };
}
function booksKey() { return `ebookera-books-${userEmail || 'guest'}`; }
function saveProject() { const books = savedBooks(); books.unshift({ ...project, savedAt: new Date().toISOString() }); localStorage.setItem(booksKey(), JSON.stringify(books.slice(0, 10))); }
function savedBooks() { try { return JSON.parse(localStorage.getItem(booksKey()) || localStorage.getItem(`yazla-books-${userEmail || 'guest'}`) || '[]'); } catch { return []; } }
function countWords(book) { return (book.content || []).reduce((total, chapter) => total + JSON.stringify(chapter).split(/\s+/).length, 0); }
function projectCard(book, index) {
  const cover = book.cover || createCoverFor(book); const date = book.savedAt ? new Date(book.savedAt).toLocaleDateString('tr-TR') : 'Taslak';
  return `<button class="project-card saved-project" data-project-index="${index}"><div class="project-cover" style="background:linear-gradient(145deg,${cover.background},#17231e)"><small>EBOOKERA STUDIO</small>${escapeHtml(book.title || 'İsimsiz kitap')}</div><span>Hazır</span><h3>${escapeHtml(book.title || 'İsimsiz kitap')}</h3><p>${date} · ${book.content?.length || 0} bölüm</p></button>`;
}
function bindProjectCards(books) { $$('[data-project-index]').forEach(card => card.onclick = () => { project = books[Number(card.dataset.projectIndex)]; renderBook(); show('library'); }); }
function renderDashboard() {
  const books = savedBooks(); const chapters = books.reduce((sum, book) => sum + (book.content?.length || 0), 0); const words = books.reduce((sum, book) => sum + countWords(book), 0);
  $('#book-count').textContent = books.length; $('#chapter-count').textContent = chapters; $('#word-count').textContent = words.toLocaleString('tr-TR');
  $('#projects').innerHTML = books.slice(0, 2).map((book, index) => projectCard(book, index)).join('') + `<button class="new-project" data-new-project>＋<b>Yeni proje</b><small>Sıfırdan başla</small></button>`;
  $$('[data-new-project]').forEach(button => button.onclick = () => show('studio')); bindProjectCards(books);
}
function renderLibrary() {
  const books = savedBooks(); const page = $('#library');
  page.innerHTML = `<div class="welcome"><span>KİTAPLIĞIN</span><h2>Ürettiğin işler</h2><p>Projelerini görüntüle ve satışa hazır dosyalarını indir.</p></div><div class="projects library-projects">${books.length ? books.map((book, index) => projectCard(book, index)).join('') : '<div class="empty-library"><span>✦</span><h3>İlk kitabın burada görünecek.</h3><p>Bir fikirle başla; Ebookera planı, kapağı ve içeriği birlikte hazırlasın.</p><button class="button primary" data-empty-create>İlk kitabımı oluştur →</button></div>'}</div>`;
  bindProjectCards(books); $('[data-empty-create]')?.addEventListener('click', () => show('studio'));
}
function renderBook() {
  const page = $('#library');
  const cover = project.cover || createCover();
  const uiEn = uiLanguage === 'en'; const bookEn = project.language === 'en';
  const copy = uiEn ? { done: 'COMPLETE · COVER + CONTENT', desc: 'Your original AI-assisted ebook draft.', coverDone: 'COVER DESIGN COMPLETE', coverTitle: 'A distinct color and typography system is ready for your book.', coverBody: 'The cover, layout, and content are packaged as one publication-ready product.', pdf: 'Save as PDF', fresh: 'Create another book →' } : { done: 'TAMAMLANDI · KAPAK + İÇERİK', desc: 'Yapay zekâ ile oluşturulan özgün e-kitap taslağın.', coverDone: 'KAPAK TASARIMI TAMAMLANDI', coverTitle: 'Kitabın için özgün renk ve tipografi dünyası hazır.', coverBody: 'Kapak, sayfa düzeni ve içerik birlikte satışa uygun bir ürün olarak paketlendi.', pdf: 'PDF olarak kaydet', fresh: 'Yeni kitap oluştur →' };
  const readerCopy = bookEn ? { publisher: 'EBOOKERA PUBLISHING', toc: 'Contents', chapter: 'CHAPTER', takeaway: 'Key takeaway' } : { publisher: 'EBOOKERA YAYINLARI', toc: 'İçindekiler', chapter: 'BÖLÜM', takeaway: 'Bu bölümden aklında kalsın' };
  page.innerHTML = `<div class="welcome"><span>${copy.done}</span><h2>${escapeHtml(project.title)}</h2><p>${escapeHtml(project.subtitle || copy.desc)}</p></div><div class="cover-finish"><div class="cover-swatch" style="--cover-bg:${cover.background};--cover-accent:${cover.accent}"><small>EBOOKERA STUDIO</small><b>${escapeHtml(project.title)}</b><i>${escapeHtml(project.subtitle || cover.label)}</i></div><div><span class="kicker">${copy.coverDone}</span><h3>${copy.coverTitle}</h3><p>${copy.coverBody}</p></div></div><div class="book-actions"><button class="button dark" id="print-book">${copy.pdf}</button><button class="button primary" id="new-book">${copy.fresh}</button></div><article class="reader" id="reader"><div class="reader-cover" style="--cover-bg:${cover.background};--cover-accent:${cover.accent}"><small>${readerCopy.publisher}</small><h1>${escapeHtml(project.title)}</h1><p>${escapeHtml(project.subtitle || '')}</p><b>2026</b></div><div class="reader-page toc"><h2>${readerCopy.toc}</h2>${project.content.map((c, i) => `<p><span>${String(i + 1).padStart(2, '0')}</span>${escapeHtml(c.title)}</p>`).join('')}</div>${project.content.map((chapter, i) => `<section class="reader-page"><small>${readerCopy.chapter} ${String(i + 1).padStart(2, '0')}</small><h2>${escapeHtml(chapter.title)}</h2><p class="intro">${escapeHtml(chapter.intro)}</p>${chapter.sections.map(s => `<h3>${escapeHtml(s.heading)}</h3><p>${escapeHtml(s.body)}</p>`).join('')}<aside><b>${readerCopy.takeaway}</b><p>${escapeHtml(chapter.takeaway)}</p></aside></section>`).join('')}</article>`;
  $('#new-book').onclick = () => { project = { idea: '', type: 'guide', tone: 'Samimi ve güven veren', language: uiLanguage, chapterCount: 18, title: '', subtitle: '', titleOptions: [], chapters: [], content: [], coverChoice: 'editorial', generationCostCharged: 0 }; $('#book-idea').value = ''; $('#book-type').value = 'guide'; $('#book-language').value = uiLanguage; $('#book-length').value = '18'; updateIdeaCount(); updateFormatSummary(); show('studio'); }; $('#print-book').onclick = printBook;
}
function printBook() {
  const content = $('#reader').innerHTML;
  const popup = window.open('', '_blank');
  popup.document.write(`<!doctype html><html lang="${project.language === 'en' ? 'en' : 'tr'}"><head><meta charset="UTF-8"><title>${escapeHtml(project.title)}</title><style>@page{size:A4;margin:20mm}body{font:16px/1.65 Georgia,serif;color:#24352e}.reader-cover{min-height:240mm;background:#6c8051;color:white;padding:35mm 22mm;display:flex;flex-direction:column}.reader-cover h1{font-size:48px;margin:auto 0 10px}.reader-page{page-break-before:always}.reader-page h2{font-size:34px;line-height:1.1}.reader-page h3{margin-top:25px}.intro{font-size:18px;font-style:italic}.toc p{border-bottom:1px solid #ddd;padding:8px 0}.toc span{display:inline-block;width:40px;color:#78972e}aside{background:#eef5cf;padding:15px 20px;margin-top:28px}small{letter-spacing:1px;color:#78972e;font-weight:bold}</style></head><body>${content}<script>window.onload=()=>window.print()<\/script></body></html>`); popup.document.close();
}

$('#color-button').onclick = () => { notify('Boyama kitabı üretim motoru ikinci fazda eklenecek. İlk sürümde e-kitap üretimi aktiftir.'); };
$$('[data-upgrade]').forEach(button => button.onclick = async () => {
  if (!userEmail) return openAuth();
  try { setButton(button, uiLanguage === 'en' ? 'Opening checkout…' : 'Ödeme açılıyor…', true); const { url } = await request('/api/create-checkout', {}); window.location.assign(url); }
  catch (error) { notify(error.message, true); setButton(button, '', false); }
});
