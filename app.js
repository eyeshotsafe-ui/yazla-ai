const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const app = $('#app'), landing = $('main'), toast = $('#toast');
const screens = ['dashboard', 'studio', 'plan', 'generating', 'coloring', 'library'];
let project = { idea: '', type: 'Pratik rehber', tone: 'Samimi ve güven veren', title: '', subtitle: '', chapters: [], content: [] };
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
  window.scrollTo(0, 0);
}
function notify(message, isError = false) { toast.textContent = message; toast.style.background = isError ? '#a84837' : ''; toast.classList.remove('hidden'); setTimeout(() => toast.classList.add('hidden'), 4500); }
function setButton(button, text, busy) { button.disabled = busy; button.dataset.label ||= button.textContent; button.textContent = busy ? text : button.dataset.label; }
async function request(path, body) { const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const data = await res.json(); if (!res.ok) throw new Error(data.error || 'İstek tamamlanamadı.'); return data; }

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

function renderChapters() {
  $('#chapters').innerHTML = project.chapters.map((chapter, i) => `<div class="chapter"><b>${String(i + 1).padStart(2, '0')}</b><input value="${escapeHtml(chapter.title)}" aria-label="Bölüm ${i + 1}"><button title="Bölümü sil">×</button></div>`).join('');
  $$('.chapter input').forEach((input, i) => input.oninput = () => project.chapters[i].title = input.value);
  $$('.chapter button').forEach((button, i) => button.onclick = () => { project.chapters.splice(i, 1); renderChapters(); });
}
function escapeHtml(value = '') { return value.replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[c]); }

$('#plan-button').onclick = async () => {
  const button = $('#plan-button'); const idea = $('#book-idea').value.trim();
  if (!idea) return $('#book-idea').focus();
  project.idea = idea; project.type = $('#book-type').value; project.tone = $('.builder-options select:nth-of-type(2)')?.value || 'Samimi ve güven veren';
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

$('#generate-button').onclick = async () => { show('generating'); await generateBook(); };
async function generateBook() {
  project.content = []; const list = $('#generation-steps');
  list.innerHTML = project.chapters.map((chapter, i) => `<li>○ Bölüm ${i + 1}: ${escapeHtml(chapter.title)}</li>`).join('') + '<li>○ Kitap düzenleniyor</li>';
  const items = $$('#generation-steps li');
  for (let i = 0; i < project.chapters.length; i++) {
    items[i].className = 'current'; $('#progress-label').textContent = `Bölüm ${i + 1}/${project.chapters.length} yazılıyor`;
    $('#live-text').textContent = project.chapters[i].title;
    $('#progress-bar').style.width = `${Math.round((i / (project.chapters.length + 1)) * 100)}%`;
    try {
      const chapter = await request('/api/generate-chapter', { ...project, bookTitle: project.title, chapter: project.chapters[i], chapterIndex: i, chapterCount: project.chapters.length });
      project.content.push(chapter); items[i].className = 'complete'; items[i].textContent = `✓ Bölüm ${i + 1}: ${chapter.title}`;
    } catch (error) { items[i].className = 'current'; items[i].textContent = `! Bölüm ${i + 1} üretilemedi`; notify(error.message, true); return; }
  }
  items[items.length - 1].className = 'complete'; items[items.length - 1].textContent = '✓ Kitap düzenlendi';
  $('#progress-bar').style.width = '100%'; $('#progress-label').textContent = 'Kitabın hazır';
  saveProject(); setTimeout(() => { renderBook(); show('library'); notify('Kitabın hazır! PDF olarak dışa aktarabilirsin.'); }, 500);
}
function saveProject() { const books = JSON.parse(localStorage.getItem('yazla-books') || '[]'); books.unshift({ ...project, savedAt: new Date().toISOString() }); localStorage.setItem('yazla-books', JSON.stringify(books.slice(0, 10))); }
function renderBook() {
  const page = $('#library');
  page.innerHTML = `<div class="welcome"><span>TAMAMLANDI</span><h2>${escapeHtml(project.title)}</h2><p>${escapeHtml(project.subtitle || 'Yapay zekâ ile oluşturulan özgün e-kitap taslağın.')}</p></div><div class="book-actions"><button class="button dark" id="print-book">PDF olarak kaydet</button><button class="button primary" id="new-book">Yeni kitap oluştur →</button></div><article class="reader" id="reader"><div class="reader-cover"><small>YAZLA YAYINLARI</small><h1>${escapeHtml(project.title)}</h1><p>${escapeHtml(project.subtitle || '')}</p><b>2026</b></div><div class="reader-page toc"><h2>İçindekiler</h2>${project.content.map((c, i) => `<p><span>${String(i + 1).padStart(2, '0')}</span>${escapeHtml(c.title)}</p>`).join('')}</div>${project.content.map((chapter, i) => `<section class="reader-page"><small>BÖLÜM ${String(i + 1).padStart(2, '0')}</small><h2>${escapeHtml(chapter.title)}</h2><p class="intro">${escapeHtml(chapter.intro)}</p>${chapter.sections.map(s => `<h3>${escapeHtml(s.heading)}</h3><p>${escapeHtml(s.body)}</p>`).join('')}<aside><b>Bu bölümden aklında kalsın</b><p>${escapeHtml(chapter.takeaway)}</p></aside></section>`).join('')}</article>`;
  $('#new-book').onclick = () => show('studio'); $('#print-book').onclick = printBook;
}
function printBook() {
  const content = $('#reader').innerHTML;
  const popup = window.open('', '_blank');
  popup.document.write(`<!doctype html><html lang="tr"><head><title>${escapeHtml(project.title)}</title><style>@page{size:A4;margin:20mm}body{font:16px/1.65 Georgia,serif;color:#24352e}.reader-cover{min-height:240mm;background:#6c8051;color:white;padding:35mm 22mm;display:flex;flex-direction:column}.reader-cover h1{font-size:48px;margin:auto 0 10px}.reader-page{page-break-before:always}.reader-page h2{font-size:34px;line-height:1.1}.reader-page h3{margin-top:25px}.intro{font-size:18px;font-style:italic}.toc p{border-bottom:1px solid #ddd;padding:8px 0}.toc span{display:inline-block;width:40px;color:#78972e}aside{background:#eef5cf;padding:15px 20px;margin-top:28px}small{letter-spacing:1px;color:#78972e;font-weight:bold}</style></head><body>${content}<script>window.onload=()=>window.print()<\/script></body></html>`); popup.document.close();
}

$('#color-button').onclick = () => { notify('Boyama kitabı üretim motoru ikinci fazda eklenecek. İlk sürümde e-kitap üretimi aktiftir.'); };
$('.price-card .button').onclick = async () => { try { const { url } = await request('/api/create-checkout', {}); window.location.assign(url); } catch (error) { notify(error.message, true); } };
