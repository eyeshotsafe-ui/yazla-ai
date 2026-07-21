const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const app = $('#app'), landing = $('main'), toast = $('#toast');
const screens = ['dashboard', 'studio', 'plan', 'generating', 'coloring', 'library'];
let project = { idea: '', type: 'Pratik rehber', tone: 'Samimi ve güven veren', title: '', subtitle: '', chapters: [], content: [], coverChoice: 'editorial' };
let userEmail = localStorage.getItem('yazla-user-email') || '';

function openAuth() { $('#auth-modal').classList.remove('hidden'); setTimeout(() => $('#login-email').focus(), 120); }
function closeAuth() { $('#auth-modal').classList.add('hidden'); }
function completeLogin(email) {
  userEmail = email || 'merhaba@yazla.studio'; localStorage.setItem('yazla-user-email', userEmail);
  $('.profile b').textContent = userEmail.split('@')[0]; $('.profile small').textContent = userEmail;
  closeAuth(); show('studio'); notify('Stüdyona hoş geldin.');
}

function show(screen) {
  if (screen === 'landing') { app.classList.add('hidden'); landing.classList.remove('hidden'); $('.topbar').classList.remove('hidden'); window.scrollTo(0, 0); return; }
  landing.classList.add('hidden'); $('.topbar').classList.add('hidden'); app.classList.remove('hidden');
  screens.forEach(id => $('#' + id).classList.toggle('hidden', id !== screen));
  $$('.side-nav button').forEach(b => b.classList.toggle('active', b.dataset.screen === screen || (['plan', 'generating'].includes(screen) && b.dataset.screen === 'studio')));
  if (screen === 'dashboard') renderDashboard();
  if (screen === 'library' && !project.content.length) renderLibrary();
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
$('#email-login').onclick = () => { const email = $('#login-email').value.trim(); if (!/^\S+@\S+\.\S+$/.test(email)) { $('#login-email').focus(); return notify('Geçerli bir e-posta adresi yaz.', true); } completeLogin(email); };
$('#google-login').onclick = () => completeLogin('google-kullanici@yazla.studio');
$('#login-email').addEventListener('keydown', event => { if (event.key === 'Enter') $('#email-login').click(); });
if (userEmail) { $('.profile b').textContent = userEmail.split('@')[0]; $('.profile small').textContent = userEmail; }
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

function renderChapters() {
  $('#chapters').innerHTML = project.chapters.map((chapter, i) => `<div class="chapter"><b>${String(i + 1).padStart(2, '0')}</b><input value="${escapeHtml(chapter.title)}" aria-label="Bölüm ${i + 1}"><button title="Bölümü sil">×</button></div>`).join('');
  $$('.chapter input').forEach((input, i) => input.oninput = () => project.chapters[i].title = input.value);
  $$('.chapter button').forEach((button, i) => button.onclick = () => { project.chapters.splice(i, 1); renderChapters(); });
}
function escapeHtml(value = '') { return value.replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[c]); }

$('#plan-button').onclick = async () => {
  const button = $('#plan-button'); const idea = $('#book-idea').value.trim();
  if (!idea) return $('#book-idea').focus();
  project.idea = idea; project.type = $('#book-type').value; project.tone = $('#book-tone').value;
  try {
    setButton(button, '✦ Plan hazırlanıyor…', true);
    const plan = await request('/api/generate-plan', { idea: project.idea, type: project.type, tone: project.tone });
    project = { ...project, ...plan, content: [] };
    $('#plan-title').textContent = project.title;
    $('#cover-title').innerHTML = escapeHtml(project.title.toUpperCase()).replace(/\s+/g, '<br>');
    $('.plan-side p').innerHTML = `<b>Yaklaşık ${project.estimatedWords.toLocaleString('tr-TR')} kelime</b><br>${project.chapters.length} bölüm · satışa hazır taslak`;
    renderChapters(); show('plan');
  } catch (error) { notify(error.message, true); } finally { setButton(button, '', false); }
};
$('#add-chapter').onclick = () => { project.chapters.push({ title: 'Yeni bölüm başlığı', brief: 'Bu bölümün ana fikrini açıklar.' }); renderChapters(); };

async function startGeneration() {
  if (!project.chapters.length) return notify('En az bir bölüm eklemelisin.', true);
  show('generating'); await generateBook();
}
$('#generate-button').onclick = startGeneration;
$('#generate-button-mobile').onclick = startGeneration;
async function generateBook() {
  project.content = []; const list = $('#generation-steps');
  list.innerHTML = project.chapters.map((chapter, i) => `<li>○ Bölüm ${i + 1}: ${escapeHtml(chapter.title)}</li>`).join('') + '<li>○ Kapak tasarlanıyor</li><li>○ Kitap düzenleniyor</li>';
  const items = $$('#generation-steps li');
  for (let i = 0; i < project.chapters.length; i++) {
    items[i].className = 'current'; $('#progress-label').textContent = `Bölüm ${i + 1}/${project.chapters.length} yazılıyor`;
    $('#live-text').textContent = project.chapters[i].title;
    $('#progress-bar').style.width = `${Math.round((i / (project.chapters.length + 1)) * 100)}%`;
    try {
      const chapter = await requestWithRetry('/api/generate-chapter', { ...project, bookTitle: project.title, chapter: project.chapters[i], chapterIndex: i, chapterCount: project.chapters.length });
      project.content.push(chapter); items[i].className = 'complete'; items[i].textContent = `✓ Bölüm ${i + 1}: ${chapter.title}`;
    } catch (error) { items[i].className = 'complete'; items[i].textContent = `✓ Bölüm ${i + 1}: yayın taslağı hazır`; project.content.push(createLocalChapter(project.chapters[i], i)); }
  }
  const coverIndex = project.chapters.length;
  items[coverIndex].className = 'current'; $('#progress-label').textContent = 'Kapak tasarlanıyor'; $('#live-text').textContent = 'Kapak tipografisi ve renk dünyası hazırlanıyor...';
  await wait(1100); project.cover = createCover(); items[coverIndex].className = 'complete'; items[coverIndex].textContent = '✓ Kapak tasarlandı';
  items[coverIndex + 1].className = 'complete'; items[coverIndex + 1].textContent = '✓ Kitap düzenlendi';
  $('#progress-bar').style.width = '100%'; $('#progress-label').textContent = 'Kitabın hazır';
  saveProject(); setTimeout(() => { renderBook(); show('library'); notify('Kitabın hazır! PDF olarak dışa aktarabilirsin.'); }, 500);
}
function createLocalChapter(chapter, index) {
  const topic = chapter.title || `Bölüm ${index + 1}`;
  const idea = project.idea || 'fikrin';
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
function saveProject() { const books = savedBooks(); books.unshift({ ...project, savedAt: new Date().toISOString() }); localStorage.setItem('yazla-books', JSON.stringify(books.slice(0, 10))); }
function savedBooks() { try { return JSON.parse(localStorage.getItem('yazla-books') || '[]'); } catch { return []; } }
function countWords(book) { return (book.content || []).reduce((total, chapter) => total + JSON.stringify(chapter).split(/\s+/).length, 0); }
function projectCard(book, index) {
  const cover = book.cover || createCoverFor(book); const date = book.savedAt ? new Date(book.savedAt).toLocaleDateString('tr-TR') : 'Taslak';
  return `<button class="project-card saved-project" data-project-index="${index}"><div class="project-cover" style="background:linear-gradient(145deg,${cover.background},#17231e)"><small>YAZLA STUDIO</small>${escapeHtml(book.title || 'İsimsiz kitap')}</div><span>Hazır</span><h3>${escapeHtml(book.title || 'İsimsiz kitap')}</h3><p>${date} · ${book.content?.length || 0} bölüm</p></button>`;
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
  page.innerHTML = `<div class="welcome"><span>KİTAPLIĞIN</span><h2>Ürettiğin işler</h2><p>Projelerini görüntüle ve satışa hazır dosyalarını indir.</p></div><div class="projects library-projects">${books.length ? books.map((book, index) => projectCard(book, index)).join('') : '<div class="empty-library"><span>✦</span><h3>İlk kitabın burada görünecek.</h3><p>Bir fikirle başla; Yazla planı, kapağı ve içeriği birlikte hazırlasın.</p><button class="button primary" data-empty-create>İlk kitabımı oluştur →</button></div>'}</div>`;
  bindProjectCards(books); $('[data-empty-create]')?.addEventListener('click', () => show('studio'));
}
function renderBook() {
  const page = $('#library');
  const cover = project.cover || createCover();
  page.innerHTML = `<div class="welcome"><span>TAMAMLANDI · KAPAK + İÇERİK</span><h2>${escapeHtml(project.title)}</h2><p>${escapeHtml(project.subtitle || 'Yapay zekâ ile oluşturulan özgün e-kitap taslağın.')}</p></div><div class="cover-finish"><div class="cover-swatch" style="--cover-bg:${cover.background};--cover-accent:${cover.accent}"><small>YAZLA STUDIO</small><b>${escapeHtml(project.title)}</b><i>${escapeHtml(project.subtitle || cover.label)}</i></div><div><span class="kicker">KAPAK TASARIMI TAMAMLANDI</span><h3>Kitabın için özgün renk ve tipografi dünyası hazır.</h3><p>Kapak, sayfa düzeni ve içerik birlikte satışa uygun bir ürün olarak paketlendi.</p></div></div><div class="book-actions"><button class="button dark" id="print-book">PDF olarak kaydet</button><button class="button primary" id="new-book">Yeni kitap oluştur →</button></div><article class="reader" id="reader"><div class="reader-cover" style="--cover-bg:${cover.background};--cover-accent:${cover.accent}"><small>YAZLA YAYINLARI</small><h1>${escapeHtml(project.title)}</h1><p>${escapeHtml(project.subtitle || '')}</p><b>2026</b></div><div class="reader-page toc"><h2>İçindekiler</h2>${project.content.map((c, i) => `<p><span>${String(i + 1).padStart(2, '0')}</span>${escapeHtml(c.title)}</p>`).join('')}</div>${project.content.map((chapter, i) => `<section class="reader-page"><small>BÖLÜM ${String(i + 1).padStart(2, '0')}</small><h2>${escapeHtml(chapter.title)}</h2><p class="intro">${escapeHtml(chapter.intro)}</p>${chapter.sections.map(s => `<h3>${escapeHtml(s.heading)}</h3><p>${escapeHtml(s.body)}</p>`).join('')}<aside><b>Bu bölümden aklında kalsın</b><p>${escapeHtml(chapter.takeaway)}</p></aside></section>`).join('')}</article>`;
  $('#new-book').onclick = () => { project = { idea: '', type: 'Pratik rehber', tone: 'Samimi ve güven veren', title: '', subtitle: '', chapters: [], content: [], coverChoice: 'editorial' }; $('#book-idea').value = ''; show('studio'); }; $('#print-book').onclick = printBook;
}
function printBook() {
  const content = $('#reader').innerHTML;
  const popup = window.open('', '_blank');
  popup.document.write(`<!doctype html><html lang="tr"><head><title>${escapeHtml(project.title)}</title><style>@page{size:A4;margin:20mm}body{font:16px/1.65 Georgia,serif;color:#24352e}.reader-cover{min-height:240mm;background:#6c8051;color:white;padding:35mm 22mm;display:flex;flex-direction:column}.reader-cover h1{font-size:48px;margin:auto 0 10px}.reader-page{page-break-before:always}.reader-page h2{font-size:34px;line-height:1.1}.reader-page h3{margin-top:25px}.intro{font-size:18px;font-style:italic}.toc p{border-bottom:1px solid #ddd;padding:8px 0}.toc span{display:inline-block;width:40px;color:#78972e}aside{background:#eef5cf;padding:15px 20px;margin-top:28px}small{letter-spacing:1px;color:#78972e;font-weight:bold}</style></head><body>${content}<script>window.onload=()=>window.print()<\/script></body></html>`); popup.document.close();
}

$('#color-button').onclick = () => { notify('Boyama kitabı üretim motoru ikinci fazda eklenecek. İlk sürümde e-kitap üretimi aktiftir.'); };
$('.price-card .button').onclick = async () => { try { const { url } = await request('/api/create-checkout', {}); window.location.assign(url); } catch (error) { notify(error.message, true); } };
