const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const app = $('#app'), landing = $('main'), toast = $('#toast');
const screens = ['dashboard','studio','plan','generating','coloring','library'];
let chapters = ['Fiyatını belirleyen görünmez unsurlar','Müşteriyi tanımak ve doğru teklif vermek','Kendinden emin fiyat konuşmaları','Teklifi değer odaklı sunmak','Sınırlarını koruyarak büyümek','Sürdürülebilir bir sistem kurmak'];

function show(screen){
  if(screen==='landing'){app.classList.add('hidden');landing.classList.remove('hidden');$('.topbar').classList.remove('hidden');window.scrollTo(0,0);return}
  landing.classList.add('hidden');$('.topbar').classList.add('hidden');app.classList.remove('hidden');
  screens.forEach(id=>$('#'+id).classList.toggle('hidden',id!==screen));
  $$('.side-nav button').forEach(b=>b.classList.toggle('active',b.dataset.screen===screen || (screen==='plan'||screen==='generating')&&b.dataset.screen==='studio'));
  window.scrollTo(0,0);
}
$$('[data-screen]').forEach(el=>el.addEventListener('click',()=>show(el.dataset.screen)));
$('.idea-chips').addEventListener('click',e=>{if(e.target.tagName==='BUTTON'){$('#hero-idea').value=e.target.textContent}});
$('#hero-submit').onclick=()=>{$('#book-idea').value=$('#hero-idea').value;show('studio')};
function renderChapters(){ $('#chapters').innerHTML=chapters.map((c,i)=>`<div class="chapter"><b>${String(i+1).padStart(2,'0')}</b><input value="${c}" aria-label="Bölüm ${i+1}"><button title="Bölümü sil">×</button></div>`).join(''); $$('.chapter input').forEach((x,i)=>x.oninput=()=>chapters[i]=x.value); $$('.chapter button').forEach((x,i)=>x.onclick=()=>{chapters.splice(i,1);renderChapters()}) }
$('#plan-button').onclick=()=>{let idea=$('#book-idea').value.trim();if(!idea){$('#book-idea').focus();return} let title=idea.split(' ').slice(0,5).join(' ');$('#plan-title').textContent=title+' için yol haritası';$('#cover-title').innerHTML=title.toUpperCase().replace(/ /g,'<br>');renderChapters();show('plan')};
$('#add-chapter').onclick=()=>{chapters.push('Yeni bölüm başlığı');renderChapters()};
$('#generate-button').onclick=()=>{show('generating');runGeneration()};
function runGeneration(){let progress=0,steps=$$('#generation-steps li'),msgs=['Fikir ve hedef kitle analiz ediliyor','Bölüm planı derinleştiriliyor','1. bölüm yazılıyor','Kapak için görsel yön belirleniyor','Dizgi ve sayfa düzeni hazırlanıyor','Kitabın tamamı hazır!'];$('#progress-bar').style.width='8%';$('#live-text').textContent='İlk sayfalar şekilleniyor...';const timer=setInterval(()=>{progress++;$('#progress-bar').style.width=(8+progress*17)+'%';$('#progress-label').textContent=msgs[progress]||msgs[5];if(steps[progress-1]){steps[progress-1].className='complete';steps[progress-1].textContent='✓ '+steps[progress-1].textContent.slice(2)}if(steps[progress]){steps[progress].className='current';steps[progress].textContent='○ '+steps[progress].textContent.slice(2)}$('#live-text').textContent=msgs[progress]||msgs[5];if(progress>=5){clearInterval(timer);setTimeout(()=>{show('library');toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),3500)},700)}},850)}
$('#color-button').onclick=()=>{let idea=$('#color-idea').value.trim();if(!idea){$('#color-idea').focus();return} chapters=['Karakterlerle tanışma','İlk macera','Şehrin gizli bahçesi','Yaratıcı oyun zamanı','Kutlama sayfası','Veda ve bonus sayfa'];$('#plan-title').textContent=idea+' — sayfa planı';$('#cover-title').innerHTML='RENKLİ<br/>BİR<br/>DÜNYA';renderChapters();show('plan')};
