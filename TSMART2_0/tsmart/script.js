/* T-Smart 2.0 — DB bağlantılı */
let oturum = null;
let curRole = 'antrenor';
let curBeltFilter = '';
let videoFilter = 'Tümü';

const KUSAK_SIRASI = ['Beyaz Kuşak','Sarı-Beyaz Kuşak','Sarı Kuşak','Yeşil-Sarı Kuşak','Yeşil Kuşak','Mavi-Yeşil Kuşak','Mavi Kuşak','Kırmızı-Mavi Kuşak','Kırmızı Kuşak','Siyah-Kırmızı Kuşak','Siyah Kuşak (1. Dan)','Siyah Kuşak (2. Dan)'];
const RENKLER = ['#0f3460','#e94560','#198754','#6f42c1','#fd7e14','#20c997','#0dcaf0','#ffc107'];

async function apiFetch(endpoint, options = {}) {
  try {
    const res = await fetch('api/' + endpoint, options);
    const txt = await res.text();
    try { return JSON.parse(txt); }
    catch(e){ console.error('JSON değil:', endpoint, txt); tError('API cevabı okunamadı: ' + endpoint); return null; }
  } catch (err) {
    console.error('API hatası:', endpoint, err);
    tError('Sunucuya bağlanılamadı. XAMPP/Apache açık mı?');
    return null;
  }
}

function safeText(v, empty='—') { return (v === null || v === undefined || v === '') ? empty : String(v); }
function norm(v){ return String(v || '').toLocaleLowerCase('tr-TR').trim(); }
function initialsFrom(name){ return String(name || '?').trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase(); }
function sporcuRenk(i){ return RENKLER[i % RENKLER.length]; }

function canonicalBelt(kusak){
  const s = norm(kusak).replace(/kuşak/g,'').replace(/kusak/g,'').replace(/\(.*?\)/g,'').replace(/\s+/g,' ').trim();
  if(!s) return 'Belirsiz';
  if(s.includes('kırmızı') && s.includes('siyah')) return 'Kırmızı-Siyah';
  if(s.includes('siyah') && s.includes('kırmızı')) return 'Kırmızı-Siyah';
  if(s.includes('mavi') && s.includes('kırmızı')) return 'Mavi-Kırmızı';
  if(s.includes('kırmızı') && s.includes('mavi')) return 'Mavi-Kırmızı';
  if(s.includes('yeşil') && s.includes('mavi')) return 'Yeşil-Mavi';
  if(s.includes('mavi') && s.includes('yeşil')) return 'Yeşil-Mavi';
  if(s.includes('sarı') && s.includes('yeşil')) return 'Sarı-Yeşil';
  if(s.includes('yeşil') && s.includes('sarı')) return 'Sarı-Yeşil';
  if(s.includes('beyaz')) return 'Beyaz';
  if(s.includes('sarı')) return 'Sarı';
  if(s.includes('yeşil')) return 'Yeşil';
  if(s.includes('kırmızı')) return 'Kırmızı';
  if(s.includes('mavi')) return 'Mavi';
  if(s.includes('siyah')) return 'Siyah';
  return kusak;
}
function beltLabel(k){ const c = canonicalBelt(k); return c === 'Belirsiz' ? 'Belirsiz' : c + ' Kuşak'; }
function beltColor(k){
  const c = canonicalBelt(k);
  if(c==='Beyaz') return '#e5e7eb';
  if(c==='Sarı') return '#facc15';
  if(c==='Sarı-Yeşil') return 'linear-gradient(135deg,#facc15,#84cc16)';
  if(c==='Yeşil') return '#22c55e';
  if(c==='Yeşil-Mavi') return 'linear-gradient(135deg,#22c55e,#3b82f6)';
  if(c==='Mavi') return '#3b82f6';
  if(c==='Mavi-Kırmızı') return 'linear-gradient(135deg,#3b82f6,#ef4444)';
  if(c==='Kırmızı') return '#ef4444';
  if(c==='Kırmızı-Siyah') return 'linear-gradient(135deg,#ef4444,#111827)';
  if(c==='Siyah') return '#111827';
  return '#cbd5e1';
}
function getBadgeClass(k){
  const c = canonicalBelt(k);
  return ({'Beyaz':'bwh','Sarı':'byy','Sarı-Yeşil':'bsy','Yeşil':'bgg','Yeşil-Mavi':'bgm','Mavi':'bmm','Mavi-Kırmızı':'bmk','Kırmızı':'bkr','Kırmızı-Siyah':'bks','Siyah':'bkk'}[c]) || 'bwh';
}
function formatDateTR(iso){
  if(!iso) return '—';
  const d = new Date(iso);
  if(isNaN(d.getTime())) return iso;
  const aylar = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  return String(d.getDate()).padStart(2,'0') + ' ' + aylar[d.getMonth()] + ' ' + d.getFullYear();
}
function getSonuc(skor){
  const parts = String(skor || '').split('-').map(x=>parseInt(x,10));
  const a = parts[0] || 0, b = parts[1] || 0;
  if(a>b) return 'Galibiyet';
  if(a<b) return 'Mağlubiyet';
  return 'Beraberlik';
}
function makeUrl(url){
  if(!url) return '';
  url = String(url).trim();
  if(url.startsWith('http://') || url.startsWith('https://')) return url;
  if(url.startsWith('youtu.be/')) return 'https://' + url;
  if(url.startsWith('youtube.com/')) return 'https://www.' + url;
  if(url.startsWith('www.')) return 'https://' + url;
  return url;
}
function openVideo(url){
  const finalUrl = makeUrl(url);
  if(!finalUrl){ tError('Video URL bulunamadı.'); return; }
  window.open(finalUrl, '_blank', 'noopener,noreferrer');
}

function t(msg){
  const x = document.getElementById('toast');
  if(!x){ alert(msg); return; }
  x.textContent = '✓ ' + msg;
  x.classList.remove('error');
  x.classList.add('show');
  setTimeout(()=>x.classList.remove('show'), 2300);
}
function tError(msg){
  const x = document.getElementById('toast');
  if(!x){ alert(msg); return; }
  x.textContent = '⚠ ' + msg;
  x.classList.add('error','show');
  setTimeout(()=>x.classList.remove('show'), 2600);
}

async function oturumYukle(){
  const data = await apiFetch('session_check.php');
  if(data && data.giris_yapildi){
    oturum = data;
    const _name = oturum.ad_soyad || oturum.kullanici_adi || '';
    const _role = oturum.rol || 'sporcu';

    // Sidebar isim ve rol
    document.querySelectorAll('.ui p').forEach(el => el.textContent = _name);
    document.querySelectorAll('.ui span').forEach(el => { el.textContent = rolTR(_role); el.style.display=''; });

    // Avatar kısaltma ve renk
    const renkMap = {admin:'#dc3545',antrenor:'#0f3460',sporcu:'#fdd835'};
    const textMap = {admin:'#fff',antrenor:'#fff',sporcu:'#5a4000'};
    document.querySelectorAll('.uav').forEach(el => {
      el.textContent = initialsFrom(_name);
      el.style.background = renkMap[_role] || '#6b7280';
      el.style.color      = textMap[_role] || '#fff';
      el.style.display    = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
    });
  }
}
function rolTR(r){ return r==='admin'?'Sistem Yöneticisi':r==='antrenor'?'Antrenör':r==='sporcu'?'Sporcu':safeText(r); }

function setRole(el, r){
  document.querySelectorAll('#role-tabs div').forEach(x=>x.classList.remove('a'));
  el.classList.add('a');
  curRole = r;
}
async function doLogin(){
  const userInput = document.getElementById('login-user');
  const passInput = document.getElementById('login-pass');
  const user = userInput?.value.trim() || '';
  const pass = passInput?.value.trim() || '';
  const role = document.querySelector('#role-tabs .a')?.dataset.role || curRole;
  if(!user && !pass){ tError('Lütfen kullanıcı adı ve şifre girin.'); userInput?.focus(); return; }
  if(!user){ tError('Lütfen kullanıcı adınızı girin.'); userInput?.focus(); return; }
  if(!pass){ tError('Lütfen şifrenizi girin.'); passInput?.focus(); return; }
  const fd = new FormData(); fd.append('kullanici_adi',user); fd.append('sifre',pass); fd.append('rol',role);
  const data = await apiFetch('login.php',{method:'POST',body:fd});
  if(data?.success) window.location.href = data.redirect || (role + '.html');
  else tError(data?.message || 'Giriş başarısız.');
}
async function doLogout(){ await apiFetch('logout.php'); window.location.href = 'giris.html'; }

function old_g_6655(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const el = document.getElementById(id);
  if(!el){
    const map = {'pg-login':'giris.html','pg-a-hata':'antrenor.html','pg-a-maç':'antrenor.html','pg-a-liste':'antrenor.html','pg-a-profil':'antrenor.html','pg-a-analiz':'antrenor.html','pg-a-gelisim':'antrenor.html','pg-a-hesap':'antrenor.html','pg-s-kariyer':'sporcu.html','pg-s-maç':'sporcu.html','pg-s-hata':'sporcu.html','pg-s-video':'sporcu.html','pg-s-hesap':'sporcu.html','pg-ad-video':'admin.html','pg-ad-kullanici':'admin.html','pg-ad-sporcu':'admin.html','pg-ad-kusak':'admin.html','pg-ad-hesap':'admin.html'};
    if(map[id]) window.location.href = map[id];
    return;
  }
  el.classList.add('active');
  window.scrollTo(0,0);
  loadPageData(id);
}
function loadPageData(id){
  if(id==='pg-a-hata') loadHataGiris();
  if(id==='pg-a-maç') loadMacFiltreleri().then(loadMaclar);
  if(id==='pg-a-liste') loadSporcuList();
  if(id==='pg-a-analiz') loadAnaliz();
  if(id==='pg-a-gelisim') loadGelisim();
  if(id==='pg-a-profil') loadSporcuProfilePage();
  if(id==='pg-a-hesap' || id==='pg-s-hesap' || id==='pg-ad-hesap') loadHesapAyarları();
  if(id==='pg-s-kariyer') loadKariyer();
  if(id==='pg-s-maç') loadSporcuMaclari();
  if(id==='pg-s-hata') loadSporcuHatalari();
  if(id==='pg-s-video') loadSporcuVideolari();
  if(id==='pg-ad-video') loadAdminVideolar();
  if(id==='pg-a-video') loadAntrenorVideolar();
  if(id==='pg-ad-kullanici') loadAdminKullanicilar();
  if(id==='pg-ad-sporcu') loadAdminSporcuYonetimi();
  if(id==='pg-ad-kusak') loadKusakAyarlar();
}

async function getAllSporcular(){ const d = await apiFetch('sporcular.php'); return d?.success ? d.data : []; }
async function getAllKusaklar(){ const d = await apiFetch('kusaklar.php'); return d?.success ? d.data : []; }
async function getAllKullanicilar(){ const d = await apiFetch('kullanicilar.php'); return d?.success ? d.data : []; }
function buildKusakCounts(rows){
  const counts = {}; KUSAK_SIRASI.forEach(k=>counts[k]=0);
  (rows||[]).forEach(s=>{ const c = canonicalBelt(s.Kusak_Adi); if(counts[c] !== undefined) counts[c]++; });
  return counts;
}

async function loadHataGiris(){
  const sporcular = await getAllSporcular();
  const sel = document.getElementById('hata-sporcu');
  if(sel){
    const old = sel.value;
    sel.innerHTML = sporcular.map(s=>`<option value="${s.Sporcu_ID}">${safeText(s.Ad_Soyad)} (${canonicalBelt(s.Kusak_Adi)})</option>`).join('');
    if(old) sel.value = old;
  }
  const vals = document.querySelectorAll('#pg-a-hata .sg .sv');
  if(vals[0]) vals[0].textContent = sporcular.length;
  const m = await apiFetch('maclar.php?donem=buay');
  if(vals[1]) vals[1].textContent = m?.istatistik?.toplam ?? 0;
  if(vals[2]) vals[2].textContent = m?.istatistik?.galibiyet ?? 0;
}
function onSporcuChange(){
  ['hata-rakip','hata-org','hata-rkulup'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  ['hata-spuan','hata-rpuan'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value='0'; });
}
function togH(el){ el.classList.toggle('sel'); }
function selH(type){ document.querySelectorAll('.hg').forEach(h=>h.classList.remove('sel')); document.getElementById('hg-'+type)?.classList.add('sel'); }
async function saveMaç(){ return saveMac(); }
async function saveMac(){
  const sporcu_id = document.getElementById('hata-sporcu')?.value || '';
  const rakip = document.getElementById('hata-rakip')?.value.trim() || '';
  if(!sporcu_id){ tError('Lütfen sporcu seçin.'); return; }
  if(!rakip){ tError('Lütfen rakip adını girin.'); return; }
  const hatalar = [...document.querySelectorAll('#hata-secim .hb.sel')].map(x=>x.textContent.replace(/[⚖️🛡️👣⚡🥊💨🔋📐➕]/g,'').trim());
  if(hatalar.length===0){ tError('Lütfen en az bir hata seçin.'); return; }
  const fd = new FormData();
  fd.append('sporcu_id',sporcu_id);
  fd.append('rakip_adi',rakip);
  fd.append('tarih',document.getElementById('hata-tarih')?.value || new Date().toISOString().slice(0,10));
  fd.append('skor',(document.getElementById('hata-spuan')?.value || '0') + '-' + (document.getElementById('hata-rpuan')?.value || '0'));
  hatalar.forEach(h=>fd.append('hatalar[]',h));
  const data = await apiFetch('maclar.php',{method:'POST',body:fd});
  if(data?.success){ t(data.message || 'Maç kaydedildi.'); loadHataGiris(); }
  else tError(data?.message || 'Maç kaydedilemedi.');
}
function clearHataForm(){ onSporcuChange(); document.querySelectorAll('#hata-secim .hb').forEach(h=>h.classList.remove('sel')); }

async function loadMacFiltreleri(){
  const sel = document.getElementById('fil-sporcu'); if(!sel) return;
  const old = sel.value;
  const sporcular = await getAllSporcular();
  sel.innerHTML = '<option value="">Tüm sporcular</option>' + sporcular.map(s=>`<option value="${s.Sporcu_ID}">${safeText(s.Ad_Soyad)}</option>`).join('');
  if(old) sel.value = old;
}
async function loadMaclar(){
  const qs = new URLSearchParams();
  const sp = document.getElementById('fil-sporcu')?.value || ''; if(sp) qs.set('sporcu_id',sp);
  const so = document.getElementById('fil-sonuc')?.value || ''; if(so) qs.set('sonuc',so);
  const do_ = document.getElementById('fil-tarih')?.value || ''; if(do_) qs.set('donem',do_);
  const data = await apiFetch('maclar.php?' + qs.toString()); if(!data?.success) return;
  const tbody = document.getElementById('maç-tbody') || document.getElementById('mac-tbody'); if(!tbody) return;
  tbody.innerHTML = (data.data||[]).map((m,i)=>{
    const sonuc = m.sonuc || getSonuc(m.Skor); const badge = sonuc==='Galibiyet'?'bss':sonuc==='Mağlubiyet'?'bdd':'bpp';
    const h = (m.hatalar||[]).map(x=>`<span class="tag">${x.Hata_Tipi}</span>`).join('');
    return `<tr><td><div class="scc"><div class="av" style="background:${sporcuRenk(i)}">${initialsFrom(m.Ad_Soyad)}</div>${safeText(m.Ad_Soyad)}</div></td><td>${formatDateTR(m.Tarih)}</td><td>${safeText(m.Organizasyon_Adi,'—')}</td><td>${safeText(m.Rakip_Adi)}</td><td><b>${safeText(m.Skor).replace('-','—')}</b></td><td><span class="badge ${badge}">${sonuc}</span></td><td>${h || '—'}</td></tr>`;
  }).join('') || '<tr><td colspan="7">DB’de maç kaydı bulunamadı.</td></tr>';
  const st = data.istatistik || {};
  const set = (id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
  set('maç-total', st.toplam ?? 0); set('mac-total', st.toplam ?? 0);
  set('maç-win', st.galibiyet ?? 0); set('mac-win', st.galibiyet ?? 0);
  set('maç-lose', st.maglubiyet ?? 0); set('mac-lose', st.maglubiyet ?? 0);
  set('maç-rate', '%' + (st.oran ?? 0)); set('mac-rate', '%' + (st.oran ?? 0));
  set('maç-count', `${(data.data||[]).length} maç gösteriliyor`); set('mac-count', `${(data.data||[]).length} maç gösteriliyor`);
}
function filterMaç(){ loadMaclar(); } function filterMac(){ loadMaclar(); }

async function rebuildSporcuChips(sporcular){
  const wrap = document.getElementById('sporcu-chips'); if(!wrap) return;
  const counts = buildKusakCounts(sporcular);
  let html = `<span class="chip ${curBeltFilter===''?'a':''}" onclick="filterSporcuByBelt(this,'')">Tümü (${sporcular.length})</span>`;
  KUSAK_SIRASI.forEach(k=>{ if(counts[k]>0 || k==='Siyah') html += `<span class="chip ${curBeltFilter===k?'a':''}" onclick="filterSporcuByBelt(this,'${k}')">${k} (${counts[k]||0})</span>`; });
  wrap.innerHTML = html;
}
async function loadSporcuList(){
  const sporcular = await getAllSporcular();
  await rebuildSporcuChips(sporcular);
  const vals = document.querySelectorAll('#pg-a-liste .sg .sv');
  const counts = buildKusakCounts(sporcular);
  if(vals[0]) vals[0].textContent = sporcular.length;
  if(vals[1]) vals[1].textContent = counts['Beyaz'] || 0;
  if(vals[2]) vals[2].textContent = counts['Sarı'] || 0;
  if(vals[3]) vals[3].textContent = counts['Sarı-Yeşil'] || 0;
  const search = norm(document.getElementById('sporcu-ara')?.value || '');
  const filtered = sporcular.filter(s => (!curBeltFilter || canonicalBelt(s.Kusak_Adi)===curBeltFilter) && (!search || norm(s.Ad_Soyad).includes(search)));
  const tbody = document.getElementById('sporcu-tbody'); if(!tbody) return;
  tbody.innerHTML = filtered.map((s,i)=>`<tr><td><div class="scc"><div class="av" style="background:${sporcuRenk(i)}">${initialsFrom(s.Ad_Soyad)}</div>${safeText(s.Ad_Soyad)}</div></td><td>${safeText(s.Kulup_Adi)}</td><td><span class="badge ${getBadgeClass(s.Kusak_Adi)}">${beltLabel(s.Kusak_Adi)}</span></td><td>${s.toplam_mac||0}</td><td>${s.galibiyet||0}</td><td>${safeText(s.en_sik_hata)}</td><td><button class="btn bo" style="padding:5px 9px;font-size:11px;" onclick="adminSporcuDuzenle(${s.Sporcu_ID}, this)">Profil</button></td></tr>`).join('') || '<tr><td colspan="7">Bu filtreye uygun sporcu yok.</td></tr>';
  const c = document.getElementById('sporcu-count'); if(c) c.textContent = `${filtered.length} / ${sporcular.length} sporcu gösteriliyor`;
}
function filterSporcuList(){ loadSporcuList(); }
function filterSporcuByBelt(el,belt){ document.querySelectorAll('#sporcu-chips .chip').forEach(c=>c.classList.remove('a')); el?.classList.add('a'); curBeltFilter = belt; loadSporcuList(); }


let selectedProfileSporcuId = null;

function prepareNewSporcuProfile(){
  selectedProfileSporcuId = null;
  setTimeout(()=>loadSporcuProfilePage(), 0);
}
async function loadSporcuProfil(id){
  selectedProfileSporcuId = id;
  await loadSporcuProfilePage(id);
}
function openSporcuProfil(id){
  selectedProfileSporcuId = id;
  g('pg-a-profil');
  setTimeout(()=>loadSporcuProfilePage(id), 0);
}
function setValue(id,val){ const el=document.getElementById(id); if(el) el.value = val || ''; }
function fullNameParts(name){ const p=String(name||'').trim().split(/\s+/); return {ad:p.slice(0,-1).join(' ') || p[0] || '', soyad:p.length>1?p[p.length-1]:''}; }
function calcAge(dateStr){ if(!dateStr) return ''; const d=new Date(dateStr); if(isNaN(d)) return ''; const n=new Date(); let y=n.getFullYear()-d.getFullYear(); const m=n.getMonth()-d.getMonth(); if(m<0 || (m===0 && n.getDate()<d.getDate())) y--; return y>0 ? y : ''; }
async function fillProfilSelects(sporcu=null){
  const kusakSel=document.getElementById('profil-kusak');
  const antSel=document.getElementById('profil-antrenor');
  const kusaklar=await getAllKusaklar();
  if(kusakSel){
    const used = new Set();
    kusakSel.innerHTML = kusaklar.filter(k=>{ const c=canonicalBelt(k.Kusak_Adi); if(used.has(c)) return false; used.add(c); return true; }).map(k=>`<option value="${k.Kusak_ID}">${beltLabel(k.Kusak_Adi)}</option>`).join('');
    if(sporcu?.Kusak_ID) kusakSel.value = sporcu.Kusak_ID;
  }
  const users=await getAllKullanicilar();
  if(antSel){
    const ants = users.filter(u=>String(u.Rol||'').toLowerCase()==='antrenor');
    antSel.innerHTML = ants.map(u=>`<option value="${u.Kullanici_ID}">${safeText(u.Ad_Soyad || u.Kullanici_Adi)}</option>`).join('') || '<option value="">Antrenör yok</option>';
    if(sporcu?.Antrenor_ID) antSel.value = sporcu.Antrenor_ID;
  }
}
async function loadSporcuProfilePage(id=selectedProfileSporcuId){
  await fillProfilSelects();
  const formIds=['profil-sporcu-id','profil-kullanici-id','profil-ad','profil-soyad','profil-kullanici','profil-sifre','profil-kulup'];
  formIds.forEach(x=>setValue(x,''));
  document.getElementById('profil-son-maclar') && (document.getElementById('profil-son-maclar').innerHTML='<tr><td colspan="4">Yeni kayıt modundasınız.</td></tr>');
  document.getElementById('profil-hata-dagilimi') && (document.getElementById('profil-hata-dagilimi').innerHTML='<p style="font-size:13px;color:var(--muted)">Yeni kayıt için önce sporcu kaydedin.</p>');
  ['profil-toplam-mac','profil-galibiyet','profil-maglubiyet'].forEach(x=>{ const el=document.getElementById(x); if(el) el.textContent='0'; });
  if(!id) return;
  const data = await apiFetch('sporcular.php?id=' + encodeURIComponent(id));
  const sporcu = data?.success ? (data.data?.[0] || data.data) : null;
  if(!sporcu){ tError('Sporcu DB kaydı bulunamadı.'); return; }
  selectedProfileSporcuId = sporcu.Sporcu_ID;
  await fillProfilSelects(sporcu);
  const parts=fullNameParts(sporcu.Ad_Soyad);
  setValue('profil-sporcu-id', sporcu.Sporcu_ID);
  setValue('profil-kullanici-id', sporcu.Kullanici_ID);
  setValue('profil-ad', parts.ad);
  setValue('profil-soyad', parts.soyad);
  setValue('profil-kullanici', sporcu.Kullanici_Adi);
  setValue('profil-kulup', sporcu.Kulup_Adi);
  await loadProfilPerformance(sporcu.Sporcu_ID);
}
async function loadProfilPerformance(sporcuId){
  const mac=await apiFetch('maclar.php?sporcu_id=' + encodeURIComponent(sporcuId));
  const st=mac?.istatistik || {};
  const setText=(id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
  setText('profil-toplam-mac', st.toplam ?? 0);
  setText('profil-galibiyet', st.galibiyet ?? 0);
  setText('profil-maglubiyet', st.maglubiyet ?? 0);
  const tbody=document.getElementById('profil-son-maclar');
  if(tbody){
    tbody.innerHTML=(mac?.data||[]).slice(0,3).map(m=>{ const sonuc=m.sonuc||getSonuc(m.Skor); const badge=sonuc==='Galibiyet'?'bss':sonuc==='Mağlubiyet'?'bdd':'bpp'; const h=(m.hatalar||[]).map(x=>x.Hata_Tipi).join(', '); return `<tr><td>${formatDateTR(m.Tarih)}</td><td>${safeText(m.Skor).replace('-','—')}</td><td><span class="badge ${badge}">${sonuc}</span></td><td>${h || '—'}</td></tr>`; }).join('') || '<tr><td colspan="4">DB’de maç kaydı yok.</td></tr>';
  }
  const hata=await apiFetch('hatalar.php?sporcu_id=' + encodeURIComponent(sporcuId));
  const box=document.getElementById('profil-hata-dagilimi');
  if(box){ const arr=hata?.data||[]; const max=Math.max(1,...arr.map(x=>Number(x.toplam_frekans||0))); box.innerHTML=arr.map(h=>`<div class="hbr"><div class="hbl">${h.Hata_Tipi}</div><div class="hbg"><div class="hbf" style="width:${Math.max(8,Math.round(h.toplam_frekans/max*100))}%;background:#6b7280"><div class="hbv">${h.toplam_frekans}</div></div></div></div>`).join('') || '<p style="font-size:13px;color:var(--muted)">DB’de hata kaydı yok.</p>'; }
}
async function saveSporcuProfile(){
  const id=document.getElementById('profil-sporcu-id')?.value || '';
  const ad=(document.getElementById('profil-ad')?.value || '').trim();
  const soyad=(document.getElementById('profil-soyad')?.value || '').trim();
  const kullanici=(document.getElementById('profil-kullanici')?.value || '').trim();
  const sifre=(document.getElementById('profil-sifre')?.value || '').trim();
  const kusak=document.getElementById('profil-kusak')?.value || '';
  if(!ad || !soyad || !kullanici || (!id && !sifre) || !kusak){ tError('Ad, soyad, kullanıcı adı, kuşak ve yeni kayıtta şifre zorunludur.'); return; }
  const fd=new FormData();
  if(id) fd.append('sporcu_id', id);
  fd.append('ad_soyad', `${ad} ${soyad}`.trim());
  fd.append('kullanici_adi', kullanici);
  fd.append('sifre', sifre);
  fd.append('kusak_id', kusak);
  fd.append('kulup_adi', document.getElementById('profil-kulup')?.value.trim() || '');
  fd.append('antrenor_id', document.getElementById('profil-antrenor')?.value || '');
  const data=await apiFetch('sporcular.php',{method:'POST',body:fd});
  if(data?.success){ t(data.message || 'Sporcu kaydedildi.'); selectedProfileSporcuId=data.sporcu_id || id; await loadSporcuProfilePage(selectedProfileSporcuId); await loadSporcuList(); }
  else tError(data?.message || 'Sporcu kaydedilemedi.');
}

async function loadAnaliz(){
  const qs = new URLSearchParams();
  const k = document.getElementById('analiz-kusak')?.value || ''; if(k) qs.set('kusak', k);
  const d = document.getElementById('analiz-tarih')?.value || ''; if(d) qs.set('donem', d);
  const data = await apiFetch('hatalar.php?' + qs.toString()); if(!data?.success) return;
  const set = (id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
  set('analiz-maç', data.mac_sayisi ?? 0); set('analiz-mac', data.mac_sayisi ?? 0);
  set('analiz-hata', data.toplam_hata ?? 0);
  set('analiz-kritik', data.kritik_hata || '-');
  set('analiz-ort', data.ortalama ?? 0);
  const bars = document.getElementById('analiz-bars');
  if(bars){ const arr=data.data||[]; const max=Math.max(1,...arr.map(h=>Number(h.toplam_frekans||0))); bars.innerHTML = arr.map(h=>`<div class="hbr"><div class="hbl">${h.Hata_Tipi}</div><div class="hbg"><div class="hbf" style="width:${Math.max(8,Math.round(h.toplam_frekans/max*100))}%;background:#6b7280;"><div class="hbv">${h.toplam_frekans}</div></div></div></div>`).join('') || '<p style="font-size:13px;color:var(--muted)">DB’de hata kaydı yok.</p>'; }
  const top5 = document.getElementById('analiz-top5');
  if(top5){ top5.innerHTML = (data.top5||[]).map((r,i)=>`<tr><td><b>${i+1}</b></td><td>${safeText(r.Ad_Soyad)}</td><td>${safeText(r.Kulup_Adi)}</td><td><span class="badge ${getBadgeClass(r.Kusak_Adi)}">${canonicalBelt(r.Kusak_Adi)}</span></td><td><b>${r.toplam_hata||0}</b></td><td>${safeText(r.en_sik_hata)}</td><td>${safeText(r.ortalama)}</td></tr>`).join('') || '<tr><td colspan="8">DB’de hata verisi yok.</td></tr>'; }
  const chart = document.getElementById('analiz-chart');
  if(chart && data.kusak_ortalama){ chart.innerHTML = data.kusak_ortalama.map(x=>`<div class="bg2"><div class="bv2">${x.ortalama}</div><div class="bf" style="height:${Math.max(8,Math.round(Number(x.ortalama||0)*25))}%;background:${beltColor(x.kusak)};"></div><div class="bl2">${x.kusak}</div></div>`).join(''); }
}
function filterAnaliz(){ loadAnaliz(); }

async function loadGelisim(){
  const sel = document.getElementById('gelisim-sporcu'); if(!sel) return;
  const sporcular = await getAllSporcular();
  const old = sel.value;
  sel.innerHTML = sporcular.map(s=>`<option value="${s.Sporcu_ID}">${safeText(s.Ad_Soyad)}</option>`).join('');
  if(old) sel.value = old;
  const spid = sel.value; if(!spid) return;
  const sp = sporcular.find(s=>String(s.Sporcu_ID)===String(spid));
  const donem = document.getElementById('gelisim-donem')?.value || '6maç';
  const data = await apiFetch('hatalar.php?tip=gelisim&sporcu_id=' + encodeURIComponent(spid) + '&donem=' + encodeURIComponent(donem)); if(!data?.success) return;
  const info = document.getElementById('gelisim-info'); if(info && sp) info.innerHTML = `<b>${safeText(sp.Ad_Soyad)}</b> — ${beltLabel(sp.Kusak_Adi)} — ${safeText(sp.Kulup_Adi)} — ${sp.toplam_mac||0} maç, ${sp.galibiyet||0} galibiyet`;
  const arr = data.maclar || [];
  const maxH = Math.max(1,...arr.map(m=>Number(m.toplam_hata||0)));
  const hataChart = document.getElementById('gelisim-hata-chart');
  if(hataChart) hataChart.innerHTML = arr.map(m=>{ const val=Number(m.toplam_hata||0); return `<div class="bg2"><div class="bv2">${val}</div><div class="bf" style="height:${Math.max(8,Math.round(val/maxH*90))}%;background:${val>3?'#ef476f':'#16a34a'};"></div><div class="bl2">${formatDateTR(m.Tarih)}</div></div>`; }).join('') || '<p style="font-size:13px;color:var(--muted)">Maç verisi bulunamadı.</p>';
  const gm = document.getElementById('gelisim-gm-chart');
  if(gm) gm.innerHTML = arr.map(m=>{ const ok=getSonuc(m.Skor)==='Galibiyet'; return `<div class="bg2"><div class="bv2">${ok?'✓':'×'}</div><div class="bf" style="height:${ok?80:30}%;background:${ok?'#16a34a':'#ef4444'};"></div><div class="bl2">${formatDateTR(m.Tarih)}</div></div>`; }).join('');
  const tbody = document.getElementById('gelisim-tablo');
  if(tbody && data.detaylar){ tbody.innerHTML = data.detaylar.map(d=>`<tr><td><b>${d.Hata_Tipi}</b></td><td colspan="6">Toplam frekans: ${d.toplam_frekans || d.frekans || 0}</td><td><span style="color:var(--muted);font-weight:700;">DB</span></td></tr>`).join(''); }
}
function updateGelisim(){ loadGelisim(); }


/* ── Sporcu Kariyer Sayfası ─────────────────────────────── */
async function loadKariyer(){
  if(!oturum || !oturum.sporcu_id){
    // Yeni kullanıcı - profili henüz oluşturulmamış
    const setText = (id,val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
    setText('k-kusak','Beyaz Kuşak'); setText('k-toplam-mac','0'); setText('k-galibiyet','0'); setText('k-en-sik-hata','—');
    setText('perf-oran','%0'); setText('perf-hata','0'); setText('perf-son-galibiyet','0'); setText('perf-video','—');
    const notu = document.getElementById('antrenor-notu');
    if(notu) notu.textContent = 'Hesabınız yeni oluşturuldu. Antrenörünüz maç ve hata kayıtlarınızı ekledikten sonra kariyer bilgileriniz burada görünecektir.';
    const sonMac = document.getElementById('son-maclar-kariyer');
    if(sonMac) sonMac.innerHTML = '<p style="color:var(--muted);font-size:13px;">Henüz maç kaydı bulunmuyor.</p>';
    // Beyaz kuşaktan başlayan roadmap
    buildKusakRoadmap('Beyaz Kuşak', 0, 0);
    return;
  }

  // Maç ve hata verilerini çekme
  const [macData, hataData, sporcuData] = await Promise.all([
    apiFetch('maclar.php?sporcu_id=' + oturum.sporcu_id),
    apiFetch('hatalar.php?sporcu_id=' + oturum.sporcu_id),
    apiFetch('sporcular.php?sporcu_id=' + oturum.sporcu_id),
  ]);

  const maclar   = macData?.data   || [];
  const hatalar  = hataData?.data  || [];
  const ist      = macData?.istatistik || {};
  const sporcu   = sporcuData?.data?.[0] || null;

  // ─ Stat box'ları doldur
  const setText = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
  setText('k-kusak',        oturum.kusak_adi || '—');
  setText('k-toplam-mac',   ist.toplam    ?? maclar.length);
  setText('k-galibiyet',    ist.galibiyet ?? 0);
  setText('k-en-sik-hata',  hataData?.kritik_hata || '—');


  // ─ Performans Özeti
  const oran = ist.oran ?? 0;
  const macBasiHata = maclar.length > 0
    ? (hatalar.reduce((s,h)=>s+Number(h.toplam_frekans||0),0) / maclar.length).toFixed(1)
    : '—';
  setText('perf-oran',          '%' + oran);
  setText('perf-hata',          macBasiHata);
  setText('perf-son-galibiyet', ist.galibiyet ?? 0);


  // Video sayısı (kuşağa ait)
  const vidData = await apiFetch('videolar.php');
  const vidSay = (vidData?.data||[]).filter(v => canonicalBelt(v.Kusak_Adi) === canonicalBelt(oturum.kusak_adi||'')).length;
  setText('perf-video', vidSay || '—');


  // ─ Son Maçlar
  const sonMacDiv = document.getElementById('son-maclar-kariyer');
  if(sonMacDiv){
    if(maclar.length === 0){
      sonMacDiv.innerHTML = '<p style="color:var(--muted);font-size:13px;">Henüz maç kaydı yok.</p>';
    } else {
      sonMacDiv.innerHTML = maclar.slice(0,3).map(m=>{
        const sonuc = getSonuc(m.Skor);
        const cls = sonuc==='Galibiyet' ? 'win' : 'loss';
        return `<div><span>${formatDateTR(m.Tarih)}</span><b>${(m.Skor||'').replace('-','—')}</b><em class="${cls}">${sonuc}</em></div>`;
      }).join('');
    }
  }


  // ─ Antrenör Notu - en sık hataya göre otomatik üret
  const notu = document.getElementById('antrenor-notu');
  if(notu){
    const enSik = hataData?.kritik_hata;
    if(!enSik || maclar.length===0){
      notu.textContent = 'Henüz maç ve hata verisi bulunmuyor. İlk maç kaydınız eklendikten sonra antrenör notunuz görünecektir.';
    } else {
      notu.textContent = enSik + ' hatasını azaltmak için antrenman öncesi özel egzersizler yapmanız önerilir.';
    }
  }

  // ─ Kuşak Roadmap
  buildKusakRoadmap(oturum.kusak_adi || '', ist.galibiyet ?? 0, ist.toplam ?? 0);
}

function buildKusakRoadmap(mevcutKusakAdi, galibiyet, toplamMac){
  const roadmap = document.getElementById('kusak-roadmap');
  if(!roadmap) return;

  const KUSAKLAR = [
    {ad:'Beyaz Kuşak',     kisa:'BEY', cls:'bw',  renk:'#e5e7eb', text:'#1f2937'},
    {ad:'Sarı Kuşak',      kisa:'SAR', cls:'by',  renk:'#facc15', text:'#5a4000'},
    {ad:'Sarı-Yeşil Kuşak',kisa:'SY',  cls:'',    renk:'#d9f99d', text:'#365314', border:'#84cc16'},
    {ad:'Yeşil Kuşak',     kisa:'YEŞ', cls:'bgr', renk:'#22c55e', text:'#fff'},
    {ad:'Yeşil-Mavi Kuşak',kisa:'YM',  cls:'',    renk:'#bfdbfe', text:'#1e3a8a', border:'#2563eb'},
    {ad:'Mavi-Kırmızı Kuşak',kisa:'MK',cls:'',    renk:'#fecaca', text:'#7f1d1d', border:'#ef4444'},
    {ad:'Kırmızı Kuşak',   kisa:'KIR', cls:'',    renk:'#ef4444', text:'#fff',    border:'#991b1b'},
    {ad:'Kırmızı-Siyah Kuşak',kisa:'KS',cls:'',  renk:'#7f1d1d', text:'#fff',    border:'#111827'},
    {ad:'Siyah Kuşak',     kisa:'SİY', cls:'bbk', renk:'#111827', text:'#fff'},
  ];

  const mevcutCanon = canonicalBelt(mevcutKusakAdi);
  const mevcutIdx   = KUSAKLAR.findIndex(k => canonicalBelt(k.ad) === mevcutCanon);


  // Hedef
  const hedefIdx = mevcutIdx >= 0 ? mevcutIdx + 1 : 0;
  const hedefKusak = KUSAKLAR[hedefIdx] || null;


  // Sıradaki hedef kartını güncelle
  const hedefEl = document.getElementById('hedef-kusak');
  const hedefBar = document.getElementById('hedef-bar');
  const hedefPct = document.getElementById('hedef-pct');
  const hedefListe = document.getElementById('hedef-liste');
  if(hedefEl) hedefEl.textContent = hedefKusak ? hedefKusak.ad : 'En üst seviye!';


  // İlerleme yüzdesi - galibiyet / 10 (basit hedef, özelleştirilebilir)
  const hedef = 10;
  const pct = hedefKusak ? Math.min(100, Math.round(galibiyet / hedef * 100)) : 100;
  if(hedefBar) hedefBar.style.width = pct + '%';
  if(hedefPct) hedefPct.textContent = '%' + pct;
  if(hedefListe) hedefListe.innerHTML =
    `<span>${toplamMac} maç kaydı</span><span>${galibiyet} galibiyet</span>` +
    (pct < 100 ? `<span>${hedef - galibiyet > 0 ? hedef - galibiyet : 0} galibiyet daha gerekiyor</span>` : '<span>Hedef tamamlandı!</span>');

  // Roadmap satırları
  roadmap.innerHTML = KUSAKLAR.map((k, idx) => {
    const bStyle = k.border ? `background:${k.renk};border-color:${k.border};color:${k.text};` : '';
    const bltHtml = bStyle
      ? `<div class="blt" style="${bStyle}">${k.kisa}</div>`
      : `<div class="blt ${k.cls}">${k.kisa}</div>`;

    if(idx < mevcutIdx){
      // Tamamlandı
      return `<div class="cst"><div class="blt-wrap">${bltHtml}</div><div class="bi"><div class="bn">${k.ad}</div><div class="bd2">Tamamlandı</div><div class="pw"><div class="pb" style="width:100%;background:#198754;"></div></div></div><div class="status-done">Tamam</div></div>`;
    } else if(idx === mevcutIdx){
      // Mevcut
      return `<div class="cst"><div class="blt-wrap">${bltHtml}</div><div class="bi"><div class="bn">${k.ad}</div><div class="bd2">Mevcut Seviye</div><div class="pw"><div class="pb" style="width:${pct}%;background:#facc15;"></div></div></div><div class="status-current">%${pct}</div></div>`;
    } else if(idx === hedefIdx){
      // Hedef
      return `<div class="cst"><div class="blt-wrap">${bltHtml}</div><div class="bi"><div class="bn">${k.ad}</div><div class="bd2">Hedef</div><div class="pw"><div class="pb" style="width:0%;background:#84cc16;"></div></div></div><div class="status-next">Sırada</div></div>`;
    } else {
      // İleri seviye
      const desc = idx === KUSAKLAR.length-1 ? 'Ustalık seviyesi' : idx > mevcutIdx+2 ? 'İleri seviye' : 'Sonraki seviye';
      return `<div class="cst muted-step"><div class="blt-wrap">${bltHtml}</div><div class="bi"><div class="bn">${k.ad}</div><div class="bd2">${desc}</div></div><div class="status-empty">—</div></div>`;
    }
  }).join('');
}

async function loadSporcuMaclari(){
  if(!oturum?.sporcu_id){
    // Yeni kullanıcı - Sporcular tablosunda kaydı yok
    const tbody = document.querySelector('#pg-s-maç tbody');
    if(tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px;">Henüz maç kaydınız bulunmuyor. Antrenörünüz maç kaydı eklediğinde burada görünecektir.</td></tr>';
    const page = document.getElementById('pg-s-maç');
    if(page){
      const vals = page.querySelectorAll('.sg .sv');
      vals.forEach(v => v.textContent = '0');
    }
    return;
  }
  const data = await apiFetch('maclar.php?sporcu_id=' + encodeURIComponent(oturum.sporcu_id)); if(!data?.success) return;
  const page = document.getElementById('pg-s-maç'); if(!page) return;
  const vals = page.querySelectorAll('.sg .sv'); const st=data.istatistik||{};
  if(vals[0]) vals[0].textContent=st.toplam??0; if(vals[1]) vals[1].textContent=st.galibiyet??0; if(vals[2]) vals[2].textContent=st.maglubiyet??0; if(vals[3]) vals[3].textContent='%'+(st.oran??0);
  const tbody = page.querySelector('tbody');
  if(tbody) tbody.innerHTML = (data.data||[]).map(m=>{ const sonuc=m.sonuc||getSonuc(m.Skor); const badge=sonuc==='Galibiyet'?'bss':sonuc==='Mağlubiyet'?'bdd':'bpp'; const h=(m.hatalar||[]).map(x=>`<span class="tag">${x.Hata_Tipi}</span>`).join(''); return `<tr><td>${formatDateTR(m.Tarih)}</td><td>${safeText(m.Organizasyon_Adi,'—')}</td><td>${safeText(m.Rakip_Adi)}</td><td>${safeText(m.Rakip_Kulup,'—')}</td><td><b>${safeText(m.Skor).replace('-','—')}</b></td><td><span class="badge ${badge}">${sonuc}</span></td><td>${h || '—'}</td></tr>`; }).join('') || '<tr><td colspan="7">DB’de maç kaydı yok.</td></tr>';
  const count = page.querySelector('.card div[style*="text-align:right"]'); if(count) count.textContent = `${(data.data||[]).length} / ${(data.data||[]).length} maç gösteriliyor`;
}
async function loadSporucMaclari(){ return loadSporcuMaclari(); }
async function loadSporcuHatalari(){
  if(!oturum?.sporcu_id) return;

  const analiz = await apiFetch('hatalar.php?sporcu_id=' + encodeURIComponent(oturum.sporcu_id) + '&donem=tum');
  if(!analiz?.success) return;

  const bars = document.getElementById('s-hata-bars');
  const arr = analiz.data || [];
  const max = Math.max(1, ...arr.map(x => Number(x.toplam_frekans || 0)));

  if(bars){
    bars.innerHTML = arr.length
      ? arr.map((h, i) => {
          const renkler = ['#ef476f','#0f3460','#fd7e14','#198754','#6f42c1','#20c997'];
          const val = Number(h.toplam_frekans || 0);
          return `<div class="hbr"><div class="hbl">${safeText(h.Hata_Tipi)}</div><div class="hbg"><div class="hbf" style="width:${Math.max(8, Math.round(val / max * 100))}%;background:${renkler[i % renkler.length]};"><div class="hbv">${val}</div></div></div></div>`;
        }).join('')
      : '<p style="font-size:13px;color:var(--muted)">DB’de bu sporcuya ait hata kaydı yok.</p>';
  }

  const notBox = document.getElementById('s-hata-not');
  if(notBox){
    if(arr.length){
      const enSik = arr[0].Hata_Tipi;
      notBox.innerHTML = `<b>Antrenörünüzden Not:</b> DB kayıtlarına göre en sık görülen hata: <b>${safeText(enSik)}</b>. Antrenman planınızı bu hata türüne göre takip edin.`;
      notBox.style.display = 'block';
    }else{
      notBox.style.display = 'none';
    }
  }

  const trend = await apiFetch('hatalar.php?tip=gelisim&sporcu_id=' + encodeURIComponent(oturum.sporcu_id) + '&donem=tum');
  const trendBox = document.getElementById('s-hata-trend');
  const trendMsg = document.getElementById('s-hata-trend-msg');
  const maclar = trend?.maclar || [];
  const maxTrend = Math.max(1, ...maclar.map(m => Number(m.toplam_hata || 0)));

  if(trendBox){
    trendBox.innerHTML = maclar.length
      ? maclar.map(m => {
          const val = Number(m.toplam_hata || 0);
          return `<div class="bg2"><div class="bv2">${val}</div><div class="bf" style="height:${Math.max(8, Math.round(val / maxTrend * 90))}%;background:${val > 3 ? '#ef476f' : '#16a34a'};"></div><div class="bl2">${formatDateTR(m.Tarih)}</div></div>`;
        }).join('')
      : '<p style="font-size:13px;color:var(--muted)">DB’de trend için maç kaydı yok.</p>';
  }

  if(trendMsg){
    if(maclar.length >= 2){
      const ilk = Number(maclar[0].toplam_hata || 0);
      const son = Number(maclar[maclar.length - 1].toplam_hata || 0);
      if(son < ilk) trendMsg.textContent = `DB’ye göre hata sayısı ${ilk} değerinden ${son} değerine düştü.`;
      else if(son > ilk) trendMsg.textContent = `DB’ye göre hata sayısı ${ilk} değerinden ${son} değerine yükseldi.`;
      else trendMsg.textContent = `DB’ye göre hata sayısı sabit kaldı: ${son}.`;
      trendMsg.style.color = son <= ilk ? 'var(--suc)' : 'var(--dan)';
    }else{
      trendMsg.textContent = '';
    }
  }
}
async function loadSporucHatalari(){ return loadSporcuHatalari(); }

async function buildVideoChips(wrapId, listId, data, selected='Tümü'){
  const wrap=document.getElementById(wrapId); if(!wrap) return;
  const counts={}; KUSAK_SIRASI.forEach(k=>counts[k]=0);
  (data.data||[]).forEach(v=>{ const c=canonicalBelt(v.Kusak_Adi); if(counts[c]!==undefined) counts[c]++; });
  let html = `<span class="chip ${selected==='Tümü'?'a':''}" onclick="${wrapId==='admin-video-chips'?'filterAdminVideos':wrapId==='antrenor-video-chips'?'filterAntrenorVideos':'filterSporcuVideos'}(this,'Tümü')">Tümü (${data.data.length})</span>`;
  KUSAK_SIRASI.forEach(k=>{ if(counts[k]>0) html += `<span class="chip ${selected===k?'a':''}" onclick="${wrapId==='admin-video-chips'?'filterAdminVideos':wrapId==='antrenor-video-chips'?'filterAntrenorVideos':'filterSporcuVideos'}(this,'${k}')">${k} (${counts[k]})</span>`; });
  wrap.innerHTML = html;
}
function renderVideoList(listId, videos, admin=false){
  const list=document.getElementById(listId); if(!list) return;
  list.innerHTML = (videos||[]).map(v=>{
    const url = String(v.Video_Url||'').replace(/'/g,"\'");
    const baslik = String(v.Baslik||'').replace(/'/g,"\'");
    const editBtns = admin ? ` <button class="btn bp" style="padding:6px 11px;font-size:12px;" onclick="adminVideoDuzenle(${v.Video_ID},'${baslik}','${url}')">Düzenle</button> <button class="btn bd" style="padding:6px 11px;font-size:12px;" onclick="adminVideoSil(${v.Video_ID})">Sil</button>` : '';
    return `<div class="vc" data-belt="${canonicalBelt(v.Kusak_Adi)}" data-id="${v.Video_ID}"><div class="vt">▶</div><div class="vi"><div class="vn">${safeText(v.Baslik)}</div><div class="vu">${safeText(v.Video_Url)} · <span class="badge ${getBadgeClass(v.Kusak_Adi)}">${beltLabel(v.Kusak_Adi)}</span></div></div><div class="va"><button class="btn bo" style="padding:6px 11px;font-size:12px;" onclick="openVideo('${url}')">${admin?'Aç':'İzle'}</button>${editBtns}</div></div>`;
  }).join('') || '<p style="color:var(--muted);font-size:13px;">DB\'de video yok.</p>';
}
async function loadSporcuVideolari(){ const data=await apiFetch('videolar.php'); if(!data?.success) return; await buildVideoChips('sporcu-video-chips','video-list',data,videoFilter); renderVideoList('video-list',data.data,false); filterVideoCards(null,'video-list',videoFilter); const info=document.getElementById('video-info'); if(info) info.innerHTML = `🎓 Veritabanında <b>${data.data.length} video</b> bulundu. Filtrelerden kuşak seçebilirsiniz.`; }
async function loadSporucVideolari(){ return loadSporcuVideolari(); }
function filterVideoCards(el,listId,belt){ videoFilter=belt; if(el){ el.closest('.chips')?.querySelectorAll('.chip').forEach(c=>c.classList.remove('a')); el.classList.add('a'); } document.querySelectorAll(`#${listId} .vc`).forEach(card=>{ card.style.display = (belt==='Tümü'||card.dataset.belt===belt)?'flex':'none'; }); }
function filterSporcuVideos(el,belt){ filterVideoCards(el,'video-list',belt); }
function filterAdminVideos(el,belt){ filterVideoCards(el,'admin-video-list',belt); }
async function loadAdminVideolar(){ const data=await apiFetch('videolar.php'); if(!data?.success) return; await buildVideoChips('admin-video-chips','admin-video-list',data,videoFilter); renderVideoList('admin-video-list',data.data,true); filterVideoCards(null,'admin-video-list',videoFilter); await loadKusakOptions(document.getElementById('admin-video-kusak')); }


// ── Antrenör Video Yönetimi ──────────────────────────────
async function loadAntrenorVideolar(){
  const data=await apiFetch('videolar.php'); if(!data?.success) return;
  await buildVideoChips('antrenor-video-chips','antrenor-video-list',data,'Tümü');
  renderVideoList('antrenor-video-list',data.data,true);
  filterVideoCards(null,'antrenor-video-list','Tümü');
  await loadKusakOptions(document.getElementById('antrenor-video-kusak'));
}
async function antrenorVideoEkle(){
  const fd=new FormData();
  fd.append('kusak_id',document.getElementById('antrenor-video-kusak')?.value||'');
  fd.append('baslik',document.getElementById('antrenor-video-baslik')?.value.trim()||'');
  fd.append('video_url',document.getElementById('antrenor-video-url')?.value.trim()||'');
  if(!fd.get('kusak_id')||!fd.get('baslik')||!fd.get('video_url')){ tError('Tüm video alanlarını doldurun.'); return; }
  const data=await apiFetch('videolar.php',{method:'POST',body:fd});
  if(data?.success){ t(data.message); loadAntrenorVideolar(); } else tError(data?.message||'Video eklenemedi.');
}
function filterAntrenorVideos(el,belt){ filterVideoCards(el,'antrenor-video-list',belt); }

async function adminVideoEkle(){
  const fd=new FormData(); fd.append('kusak_id',document.getElementById('admin-video-kusak')?.value||''); fd.append('baslik',document.getElementById('admin-video-baslik')?.value.trim()||''); fd.append('video_url',document.getElementById('admin-video-url')?.value.trim()||'');
  if(!fd.get('kusak_id')||!fd.get('baslik')||!fd.get('video_url')){ tError('Tüm video alanlarını doldurun.'); return; }
  const data=await apiFetch('videolar.php',{method:'POST',body:fd}); if(data?.success){ t(data.message); loadAdminVideolar(); } else tError(data?.message||'Video eklenemedi.');
}
async function adminVideoSil(id){
  if(!confirm('Bu video silinsin mi?')) return;
  const data=await apiFetch('videolar.php',{method:'DELETE',body:'id='+encodeURIComponent(id),headers:{'Content-Type':'application/x-www-form-urlencoded'}});
  if(data?.success){ t(data.message || 'Video silindi.'); loadAdminVideolar(); if(document.getElementById('antrenor-video-list')) loadAntrenorVideolar(); }
  else tError(data?.message||'Video silinemedi.');
}

async function old_adminVideoDuzenle_36180(id, baslik, url){
  const yeniBaslik = prompt('Yeni başlık:', baslik);
  if(yeniBaslik===null) return;
  const yeniUrl = prompt('Yeni video URL:', url);
  if(yeniUrl===null) return;
  if(!yeniBaslik.trim()||!yeniUrl.trim()){ tError('Başlık ve URL boş olamaz.'); return; }
  const fd=new FormData(); fd.append('id',id); fd.append('baslik',yeniBaslik.trim()); fd.append('video_url',yeniUrl.trim());
  const data=await apiFetch('videolar.php',{method:'PUT',body:fd});
  if(data?.success){ t('Video güncellendi!'); loadAdminVideolar(); if(document.getElementById('antrenor-video-list')) loadAntrenorVideolar(); }
  else tError(data?.message||'Video güncellenemedi.');
}

async function adminVideoTumunuSil(listId){
  if(!confirm('Görünen tüm videolar silinsin mi? Bu işlem geri alınamaz!')) return;
  const cards = document.querySelectorAll('#'+listId+' .vc[data-id]');
  let silindi=0;
  for(const card of cards){
    if(card.style.display==='none') continue;
    const id=card.dataset.id;
    const data=await apiFetch('videolar.php',{method:'DELETE',body:'id='+id,headers:{'Content-Type':'application/x-www-form-urlencoded'}});
    if(data?.success) silindi++;
  }
  t(silindi+' video silindi.');
  loadAdminVideolar();
  if(document.getElementById('antrenor-video-list')) loadAntrenorVideolar();
}

let adminSporcularCache = [];
async function loadAdminSporcuYonetimi(){
  const sporcular=await getAllSporcular(); adminSporcularCache = sporcular || [];
  const page=document.getElementById('pg-ad-sporcu'); if(!page) return;
  const vals=page.querySelectorAll('.sg .sv'); const counts=buildKusakCounts(adminSporcularCache);
  if(vals[0]) vals[0].textContent=adminSporcularCache.length;
  if(vals[1]) vals[1].textContent=new Set(adminSporcularCache.map(s=>s.Kulup_Adi).filter(Boolean)).size || '—';
  if(vals[2]) vals[2].textContent=KUSAK_SIRASI.filter(k=>counts[k]>0).length || '—';
  const chart=page.querySelector('.bc'); const max=Math.max(1,...Object.values(counts));
  if(chart) chart.innerHTML=KUSAK_SIRASI.filter(k=>counts[k]>0).map(k=>`<div class="bg2"><div class="bv2">${counts[k]}</div><div class="bf" style="height:${Math.max(8,Math.round(counts[k]/max*90))}%;background:${beltColor(k)};"></div><div class="bl2">${k}</div></div>`).join('');
  const tbody=page.querySelector('#admin-sporcu-tbody') || page.querySelectorAll('tbody')[page.querySelectorAll('tbody').length-1];
  if(tbody) tbody.innerHTML=adminSporcularCache.map(s=>`<tr><td>${safeText(s.Ad_Soyad)}</td><td>${safeText(s.Kulup_Adi)}</td><td><span class="badge ${getBadgeClass(s.Kusak_Adi)}">${beltLabel(s.Kusak_Adi)}</span></td><td><button class="btn bo" style="padding:5px 9px;font-size:11px;" onclick="adminSporcuDuzenle(${s.Sporcu_ID}, this)">Düzenle</button></td></tr>`).join('');
  const sporcuSel=document.getElementById('admin-kusak-sporcu');
  const mevcutSel=document.getElementById('admin-mevcut-kusak');
  const yeniSel=document.getElementById('admin-yeni-kusak');
  if(sporcuSel){
    sporcuSel.innerHTML=adminSporcularCache.map(s=>`<option value="${s.Sporcu_ID}">${safeText(s.Ad_Soyad)}</option>`).join('');
    sporcuSel.onchange = syncAdminMevcutKusak;
  }
  await loadKusakOptions(mevcutSel);
  await loadKusakOptions(yeniSel);
  if(mevcutSel) mevcutSel.disabled = true;
  syncAdminMevcutKusak();
}
async function loadKusakOptions(sel){
  if(!sel) return;
  const k=await getAllKusaklar();
  const used = new Set();
  const rows = (k||[]).filter(x=>{ const c=canonicalBelt(x.Kusak_Adi); if(used.has(c)) return false; used.add(c); return true; });
  sel.innerHTML=rows.map(x=>`<option value="${x.Kusak_ID}" data-belt="${canonicalBelt(x.Kusak_Adi)}">${beltLabel(x.Kusak_Adi)}</option>`).join('');
}
function syncAdminMevcutKusak(){
  const sporcuSel=document.getElementById('admin-kusak-sporcu');
  const mevcutSel=document.getElementById('admin-mevcut-kusak');
  if(!sporcuSel || !mevcutSel) return;
  const s = adminSporcularCache.find(x=>String(x.Sporcu_ID)===String(sporcuSel.value));
  if(!s) return;
  [...mevcutSel.options].forEach(opt=>{ if(opt.dataset.belt === canonicalBelt(s.Kusak_Adi)) mevcutSel.value = opt.value; });
}
async function adminKusakGuncelle(){
  const sporcuSel=document.getElementById('admin-kusak-sporcu');
  const yeniSel=document.getElementById('admin-yeni-kusak');
  const s = adminSporcularCache.find(x=>String(x.Sporcu_ID)===String(sporcuSel?.value));
  if(!s || !yeniSel?.value){ tError('Sporcu ve yeni kuşak seçin.'); return; }
  const fd = new FormData();
  fd.append('sporcu_id', s.Sporcu_ID);
  fd.append('kullanici_id', s.Kullanici_ID || '');
  fd.append('ad_soyad', s.Ad_Soyad || '');
  fd.append('kullanici_adi', s.Kullanici_Adi || '');
  fd.append('kulup_adi', s.Kulup_Adi || '');
  fd.append('kusak_id', yeniSel.value);
  if(s.Antrenor_ID) fd.append('antrenor_id', s.Antrenor_ID);
  const data = await apiFetch('sporcular.php', {method:'POST', body:fd});
  if(data?.success){ t('Kuşak güncellendi!'); await loadAdminSporcuYonetimi(); }
  else tError(data?.message || 'Kuşak güncellenemedi.');
}
async function loadKusakAyarlar(){ const data=await apiFetch('kusaklar.php'); if(!data?.success) return; const tbody=document.querySelector('#pg-ad-kusak tbody'); if(!tbody) return; const used=new Set(); const rows=(data.data||[]).filter(k=>{ const c=canonicalBelt(k.Kusak_Adi); if(used.has(c)) return false; used.add(c); return true; }); tbody.innerHTML=rows.map(k=>`<tr><td><span class="badge ${getBadgeClass(k.Kusak_Adi)}">${beltLabel(k.Kusak_Adi)}</span></td><td><div style="width:24px;height:24px;border-radius:50%;background:${beltColor(k.Kusak_Adi)};border:2px solid #cbd5e1;display:inline-block;"></div></td><td>${safeText(k.Min_Mac,'-')}</td><td>${safeText(k.Min_Galibiyet,'-')}</td><td>${safeText(k.Maks_Hata_Ort,'-')}</td><td><span class="badge bss">Aktif</span></td></tr>`).join(''); }
async function loadAdminKullanicilar(){ const data=await apiFetch('kullanicilar.php'); if(!data?.success) return; const page=document.getElementById('pg-ad-kullanici'); if(!page) return; const vals=page.querySelectorAll('.sg .sv'); if(vals[0]) vals[0].textContent=data.istatistik?.toplam??data.data.length; if(vals[1]) vals[1].textContent=data.istatistik?.antrenor??0; if(vals[2]) vals[2].textContent=data.istatistik?.sporcu??0; const tbody=document.getElementById('kullanici-tbody') || page.querySelector('tbody'); if(tbody) tbody.innerHTML=(data.data||[]).map(u=>`<tr><td>${safeText(u.Kullanici_Adi)}</td><td>${safeText(u.Kullanici_Adi)}</td><td><span class="badge ${u.Rol==='antrenor'?'bpp':u.Rol==='admin'?'bdd':'bkk'}">${rolTR(u.Rol)}</span></td><td><span class="badge bss">Aktif</span></td><td><button class="btn bo" style="padding:5px 9px;font-size:11px;" onclick="adminKullaniciDuzenle(${u.Kullanici_ID},'${String(u.Kullanici_Adi).replace(/'/g,"\\'")}','${u.Rol}')">Düzenle</button> <button class="btn bd" style="padding:5px 9px;font-size:11px;" onclick="adminKullaniciSil(${u.Kullanici_ID})">Sil</button></td></tr>`).join('') || `<tr><td colspan="5">DB’de kullanıcı yok.</td></tr>`; }
async function adminKullaniciSil(id){ if(!confirm('Bu kullanıcı silinsin mi?')) return; const data=await apiFetch('kullanicilar.php',{method:'DELETE',body:'id='+encodeURIComponent(id),headers:{'Content-Type':'application/x-www-form-urlencoded'}}); if(data?.success){t(data.message);loadAdminKullanicilar();} else tError(data?.message||'Silinemedi.'); }

async function adminKullaniciEkle(){
  const adEl  = document.getElementById('admin-adsoyad');
  const kaEl  = document.getElementById('admin-kullaniciadi');
  const siEl  = document.getElementById('admin-sifre');
  const rolEl = document.getElementById('admin-rol');
  if(!adEl||!kaEl||!siEl){ tError('Form alanları bulunamadı.'); return; }
  const ad = adEl.value.trim(), ka = kaEl.value.trim(), si = siEl.value.trim();
  const rol = (rolEl?.value||'Sporcu').toLowerCase() === 'antrenör' ? 'antrenor' : (rolEl?.value||'Sporcu').toLowerCase() === 'admin' ? 'admin' : 'sporcu';
  if(!ad){ tError('Ad Soyad zorunludur.'); adEl.focus(); return; }
  if(!ka){ tError('Kullanıcı adı zorunludur.'); kaEl.focus(); return; }
  if(!si){ tError('Şifre zorunludur.'); siEl.focus(); return; }
  const fd = new FormData();
  fd.append('kullanici_adi', ka);
  fd.append('sifre', si);
  fd.append('rol', rol);
  const data = await apiFetch('kullanicilar.php',{method:'POST',body:fd});
  if(data?.success){ t(data.message || 'Kullanıcı eklendi!'); adEl.value=''; kaEl.value=''; siEl.value=''; loadAdminKullanicilar(); }
  else tError(data?.message || 'Kullanıcı eklenemedi.');
}


// Kullanıcı düzenleme
let editingKullaniciId = null;
function old_adminKullaniciDuzenle_44850(id, adi, rol){
  editingKullaniciId = id;
  const modal = document.getElementById('kullanici-modal');
  if(!modal){ tError('Düzenleme modalı bulunamadı. Lütfen sayfayı yenileyin.'); return; }
  const kaEl = document.getElementById('modal-kullanici-adi');
  const rolEl = document.getElementById('modal-rol');
  if(kaEl) kaEl.value = adi;
  if(rolEl) rolEl.value = rol === 'antrenor' ? 'Antrenör' : rol === 'admin' ? 'Admin' : 'Sporcu';
  modal.style.display = 'flex';
}
function adminKullaniciModalKapat(){
  const modal = document.getElementById('kullanici-modal');
  if(modal) modal.style.display = 'none';
  editingKullaniciId = null;
}
async function adminKullaniciModalKaydet(){
  if(!editingKullaniciId){ tError('Düzenlenecek kullanıcı seçilmedi.'); return; }
  const kaEl = document.getElementById('modal-kullanici-adi');
  const siEl = document.getElementById('modal-sifre');
  const rolEl = document.getElementById('modal-rol');
  const ka = kaEl?.value.trim() || '';
  const si = siEl?.value.trim() || '';
  const rolRaw = rolEl?.value || 'Sporcu';
  const rol = rolRaw === 'Antrenör' ? 'antrenor' : rolRaw === 'Admin' ? 'admin' : 'sporcu';
  if(!ka){ tError('Kullanıcı adı boş olamaz.'); return; }
  const fd = new FormData();
  fd.append('id', editingKullaniciId);
  fd.append('kullanici_adi', ka);
  fd.append('rol', rol);
  if(si) fd.append('sifre', si);
  const data = await apiFetch('kullanicilar.php',{method:'PUT',body:fd});
  if(data?.success){ t('Kullanıcı güncellendi!'); adminKullaniciModalKapat(); loadAdminKullanicilar(); }
  else tError(data?.message || 'Güncellenemedi.');
}

async function old_loadHesapAyarları_46483(){
  if(!oturum) await oturumYukle(); if(!oturum) return;
  document.querySelectorAll('#pg-s-hesap input,#pg-a-hesap input,#pg-ad-hesap input').forEach(inp=>{
    const label=inp.closest('.f')?.querySelector('label')?.textContent || '';
    if(label.includes('Ad Soyad')) inp.value=oturum.ad_soyad || oturum.kullanici_adi || '';
    if(label.includes('Kullanıcı')) inp.value=oturum.kullanici_adi || '';
    if(label.includes('Rol')) inp.value=rolTR(oturum.rol);
  });
}

window.addEventListener('load', async ()=>{
  await oturumYukle();
  await loadHataGiris();
  await loadMacFiltreleri();
  if(document.getElementById('maç-tbody') || document.getElementById('mac-tbody')) await loadMaclar();
  if(document.getElementById('sporcu-tbody')) await loadSporcuList();
  if(document.getElementById('analiz-bars')) await loadAnaliz();
  if(document.getElementById('profil-kusak')) await loadSporcuProfilePage();
  if(document.getElementById('gelisim-sporcu')) await loadGelisim();
  if(document.getElementById('k-kusak')) await loadKariyer();
  if(document.getElementById('pg-s-maç')) await loadSporcuMaclari();
  if(document.getElementById('s-hata-bars')) await loadSporcuHatalari();
  if(document.getElementById('video-list')) await loadSporcuVideolari();
  if(document.getElementById('admin-video-list')) await loadAdminVideolar();
  if(document.getElementById('antrenor-video-list')) await loadAntrenorVideolar();
  if(document.getElementById('pg-ad-kullanici')) await loadAdminKullanicilar();
  if(document.getElementById('pg-ad-sporcu')) await loadAdminSporcuYonetimi();
  if(document.getElementById('pg-ad-kusak')) await loadKusakAyarlar();
});


/* Hogu sütunu tamamen kaldırıldı.
   Eski cache veya eski statik satır kalırsa tablo hizasını otomatik düzeltir. */
function temizleHoguSutunu(){
  document.querySelectorAll('table').forEach(table=>{
    const headers = Array.from(table.querySelectorAll('thead th')).map(th=>th.textContent.trim().toLowerCase());
    if(!headers.includes('hatalar')) return;
    if(headers.includes('hogu')) return;

    const headerCount = table.querySelectorAll('thead th').length;
    table.querySelectorAll('tbody tr').forEach(tr=>{
      while(tr.children.length > headerCount){
        /* Hatalar sütunundan hemen önceki fazla hücre eski Hogu hücresidir */
        const removeIndex = Math.max(0, headerCount - 1);
        tr.children[removeIndex]?.remove();
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', ()=>{
  temizleHoguSutunu();
  setTimeout(temizleHoguSutunu, 300);
  setTimeout(temizleHoguSutunu, 1000);
});

const hoguObserver = new MutationObserver(()=>temizleHoguSutunu());
hoguObserver.observe(document.documentElement, {childList:true, subtree:true});

/* =========================================================
   1) Mavi Kuşak sadece mavi görünür.
   2) Hesap Ayarları beyaz ekran yapmaz.
   3) Sayfa geçişi güvenli çalışır.
========================================================= */

function getBadgeClass(k){
  const c = canonicalBelt(k);
  return ({
    'Beyaz':'bwh',
    'Sarı':'byy',
    'Sarı-Yeşil':'bsy',
    'Yeşil':'bgg',
    'Yeşil-Mavi':'bgm',
    'Mavi':'bmm',
    'Mavi-Kırmızı':'bmk',
    'Kırmızı':'bkr',
    'Kırmızı-Siyah':'bks',
    'Siyah':'bkk'
  }[c]) || 'bwh';
}

function fixMaviKusakOnlyBlue(){
  document.querySelectorAll('span.badge').forEach(function(el){
    const text = (el.textContent || '').trim();
    if(text === 'Mavi Kuşak'){
      el.classList.remove('bgm');
      el.classList.add('bmm');
      el.style.background = '#bfdbfe';
      el.style.color = '#1e3a8a';
      el.style.border = 'none';
    }

    el.style.display = 'inline-block';
    el.style.width = 'auto';
    el.style.minWidth = '0';
    el.style.maxWidth = 'max-content';
    el.style.padding = '5px 10px';
    el.style.borderRadius = '999px';
    el.style.whiteSpace = 'nowrap';
    el.style.gridTemplateColumns = 'unset';
    el.style.gap = '0';
    el.style.marginTop = '0';
  });
}

async function old_loadHesapAyarları_50546(){
  if(!window.oturum && typeof oturumYukle === 'function'){
    try{ await oturumYukle(); }catch(e){}
  }

  const accountIds = ['pg-s-hesap','pg-a-hesap','pg-ad-hesap'];
  accountIds.forEach(function(pid){
    const page = document.getElementById(pid);
    if(!page) return;

    // Sayfanın içeriği tamamen boşsa güvenli içerik bas.
    if(page.textContent.trim().length < 20 || !page.querySelector('.mc')){
      const ad = (window.oturum && (oturum.ad_soyad || oturum.kullanici_adi)) || '';
      const kadi = (window.oturum && oturum.kullanici_adi) || '';
      const rol = (window.oturum && oturum.rol) ? rolTR(oturum.rol) : '';

      page.innerHTML = `
        <div class="al">
          <div class="mc" style="margin-left:0;width:100%;">
            <div class="mh">
              <h3>Hesap Ayarları</h3>
              <p>Profil bilgilerinizi görüntüleyin</p>
            </div>
            <div class="mb">
              <div class="card">
                <div class="ct">Profil Bilgileri</div>
                <div class="fg2 g2">
                  <div class="f"><label>Ad Soyad</label><input value="${ad}" readonly></div>
                  <div class="f"><label>Kullanıcı Adı</label><input value="${kadi}" readonly></div>
                </div>
                <div class="fg2 g2">
                  <div class="f"><label>Rol</label><input value="${rol}" readonly></div>
                </div>
              </div>
            </div>
          </div>
        </div>`;
    }

    page.querySelectorAll('input').forEach(function(inp){
      const label = inp.closest('.f')?.querySelector('label')?.textContent || '';
      if(label.includes('Ad Soyad')) inp.value = (window.oturum && (oturum.ad_soyad || oturum.kullanici_adi)) || inp.value || '';
      if(label.includes('Kullanıcı')) inp.value = (window.oturum && oturum.kullanici_adi) || inp.value || '';
      if(label.includes('Rol')) inp.value = (window.oturum && oturum.rol) ? rolTR(oturum.rol) : inp.value;
    });
  });
}

function old_g_52665(id){
  document.querySelectorAll('.page').forEach(function(p){
    p.classList.remove('active');
    p.style.display = '';
  });

  const el = document.getElementById(id);
  if(!el){
    const map = {
      'pg-login':'giris.html',
      'pg-a-hata':'antrenor.html',
      'pg-a-maç':'antrenor.html',
      'pg-a-liste':'antrenor.html',
      'pg-a-profil':'antrenor.html',
      'pg-a-analiz':'antrenor.html',
      'pg-a-gelisim':'antrenor.html',
      'pg-a-video':'antrenor.html',
      'pg-a-hesap':'antrenor.html',
      'pg-s-kariyer':'sporcu.html',
      'pg-s-maç':'sporcu.html',
      'pg-s-hata':'sporcu.html',
      'pg-s-video':'sporcu.html',
      'pg-s-hesap':'sporcu.html',
      'pg-ad-video':'admin.html',
      'pg-ad-kullanici':'admin.html',
      'pg-ad-sporcu':'admin.html',
      'pg-ad-kusak':'admin.html',
      'pg-ad-hesap':'admin.html'
    };
    if(map[id]) window.location.href = map[id];
    return;
  }

  el.classList.add('active');
  el.style.display = 'block';
  window.scrollTo(0,0);

  try{
    if(id==='pg-a-hata') loadHataGiris();
    if(id==='pg-a-maç') loadMacFiltreleri().then(loadMaclar);
    if(id==='pg-a-liste') loadSporcuList();
    if(id==='pg-a-analiz') loadAnaliz();
    if(id==='pg-a-gelisim') loadGelisim();
    if(id==='pg-a-profil') loadSporcuProfilePage();
    if(id==='pg-a-video') loadAntrenorVideolar();
    if(id==='pg-a-hesap' || id==='pg-s-hesap' || id==='pg-ad-hesap') loadHesapAyarları();
    if(id==='pg-s-kariyer') loadKariyer();
  if(id==='pg-s-maç') loadSporcuMaclari();
    if(id==='pg-s-hata') loadSporcuHatalari();
    if(id==='pg-s-video') loadSporcuVideolari();
    if(id==='pg-ad-video') loadAdminVideolar();
    if(id==='pg-ad-kullanici') loadAdminKullanicilar();
    if(id==='pg-ad-sporcu') loadAdminSporcuYonetimi();
    if(id==='pg-ad-kusak') loadKusakAyarlar();
  }catch(e){
    console.error(e);
  }

  setTimeout(fixMaviKusakOnlyBlue, 50);
  setTimeout(fixMaviKusakOnlyBlue, 300);
}

document.addEventListener('DOMContentLoaded', function(){
  setTimeout(fixMaviKusakOnlyBlue, 50);
  setTimeout(fixMaviKusakOnlyBlue, 300);
  setTimeout(fixMaviKusakOnlyBlue, 1000);
});

const maviBadgeObserver = new MutationObserver(function(){
  fixMaviKusakOnlyBlue();
});
maviBadgeObserver.observe(document.documentElement, {childList:true, subtree:true});


/* =========================================================
   ESKİ FONKSİYONLAR DEVRE DIŞI
========================================================= */

function __tsmartNameFallback(){
  try{
    if(typeof oturum !== 'undefined' && oturum && (oturum.ad_soyad || oturum.kullanici_adi)){
      return oturum.ad_soyad || oturum.kullanici_adi;
    }
  }catch(e){}
  if(location.pathname.includes('antrenor')) return 'Ahmet Antrenör';
  if(location.pathname.includes('admin')) return 'Admin';
  return 'Ege Kaya';
}

function __tsmartRoleFallback(){
  try{
    if(typeof oturum !== 'undefined' && oturum && oturum.rol) return oturum.rol;
  }catch(e){}
  if(location.pathname.includes('antrenor')) return 'antrenor';
  if(location.pathname.includes('admin')) return 'admin';
  return 'sporcu';
}

function __tsmartFixSidebar(){
  const name = __tsmartNameFallback();
  const role = __tsmartRoleFallback();

  document.querySelectorAll('.sb-u .ui p').forEach(el => {
    el.textContent = name;
    el.style.display = 'block';
  });

  document.querySelectorAll('.sb-u .ui span').forEach(el => {
    el.textContent = rolTR(role);
    el.style.display = '';
  });

  document.querySelectorAll('.sb-u .uav').forEach(el => {
    el.textContent = initialsFrom(name);
    el.style.display = 'flex';
    // Rengi role göre ayarla - sabit hardcoded değil
    if(role === 'admin') { el.style.background='#dc3545'; el.style.color='#fff'; }
    else if(role === 'antrenor') { el.style.background='#0f3460'; el.style.color='#fff'; }
    else { el.style.background='#fdd835'; el.style.color='#5a4000'; }
  });
}

async function loadHesapAyarları(){
  try{ if(typeof oturumYukle === 'function') await oturumYukle(); }catch(e){}

  const name  = (oturum?.ad_soyad  || oturum?.kullanici_adi || '');
  const role  = (oturum?.rol       || '');
  const user  = (oturum?.kullanici_adi || '');

  // Tüm hesap sayfalarındaki input'ları doldur (innerHTML kullanma - CSP uyumlu)
  ['pg-s-hesap','pg-a-hesap','pg-ad-hesap'].forEach(pid => {
    const page = document.getElementById(pid);
    if(!page) return;

    // Ad Soyad ve Kullanıcı Adı
    page.querySelectorAll('input').forEach(inp => {
      const lbl = inp.previousElementSibling?.textContent || inp.closest('.f')?.querySelector('label')?.textContent || '';
      if(lbl.includes('Ad Soyad'))       inp.value = name;
      if(lbl.includes('Kullanici') || lbl.includes('Kullanıcı')) inp.value = user;
      if(lbl.includes('Rol'))            inp.value = rolTR(role);
    });

    // Sidebar isim ve avatar
    page.querySelectorAll('.ui p').forEach(el => el.textContent = name);
    page.querySelectorAll('.ui span').forEach(el => el.textContent = rolTR(role));
    const renkMap = {admin:'#dc3545',antrenor:'#0f3460',sporcu:'#fdd835'};
    const textMap = {admin:'#fff',antrenor:'#fff',sporcu:'#5a4000'};
    page.querySelectorAll('.uav').forEach(el => {
      el.textContent = initialsFrom(name);
      el.style.background = renkMap[role] || '#6b7280';
      el.style.color      = textMap[role] || '#fff';
      el.style.display    = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
    });
  });
}


function g(id){
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
    p.style.display = 'none';
    p.style.width = '';
    p.style.minHeight = '';
  });

  const page = document.getElementById(id);
  if(!page){
    const map = {
      'pg-login':'giris.html',
      'pg-a-hata':'antrenor.html',
      'pg-a-maç':'antrenor.html',
      'pg-a-liste':'antrenor.html',
      'pg-a-profil':'antrenor.html',
      'pg-a-analiz':'antrenor.html',
      'pg-a-gelisim':'antrenor.html',
      'pg-a-video':'antrenor.html',
      'pg-a-hesap':'antrenor.html',
      'pg-s-kariyer':'sporcu.html',
      'pg-s-maç':'sporcu.html',
      'pg-s-hata':'sporcu.html',
      'pg-s-video':'sporcu.html',
      'pg-s-hesap':'sporcu.html',
      'pg-ad-video':'admin.html',
      'pg-ad-kullanici':'admin.html',
      'pg-ad-sporcu':'admin.html',
      'pg-ad-kusak':'admin.html',
      'pg-ad-hesap':'admin.html'
    };
    if(map[id]) location.href = map[id];
    return;
  }

  page.classList.add('active');
  page.style.display = 'block';
  page.style.width = '100%';
  page.style.minHeight = '100vh';
  window.scrollTo(0,0);

  try{
    if(id==='pg-a-hata') loadHataGiris();
    if(id==='pg-a-maç') loadMacFiltreleri().then(loadMaclar);
    if(id==='pg-a-liste') loadSporcuList();
    if(id==='pg-a-analiz') loadAnaliz();
    if(id==='pg-a-gelisim') loadGelisim();
    if(id==='pg-a-profil') loadSporcuProfilePage();
    if(id==='pg-a-video'){
      __tsmartFixSidebar();
      loadAntrenorVideolar();
      setTimeout(__tsmartFixSidebar, 50);
      setTimeout(__tsmartFixSidebar, 300);
    }
    if(id==='pg-a-hesap' || id==='pg-s-hesap' || id==='pg-ad-hesap') loadHesapAyarları();
    if(id==='pg-s-kariyer') loadKariyer();
  if(id==='pg-s-maç') loadSporcuMaclari();
    if(id==='pg-s-hata') loadSporcuHatalari();
    if(id==='pg-s-video') loadSporcuVideolari();
    if(id==='pg-ad-video') loadAdminVideolar();
    if(id==='pg-ad-kullanici') loadAdminKullanicilar();
    if(id==='pg-ad-sporcu') loadAdminSporcuYonetimi();
    if(id==='pg-ad-kusak') loadKusakAyarlar();
  }catch(e){
    console.error(e);
  }

  __tsmartFixSidebar();
}

async function adminKullaniciDuzenle(id, adi, rol){
  const yeniKadi = prompt('Yeni kullanıcı adı:', adi || '');
  if(yeniKadi === null) return;

  const yeniRol = prompt('Rol girin: admin / antrenor / sporcu', rol || 'sporcu');
  if(yeniRol === null) return;

  const kadi = yeniKadi.trim();
  let r = yeniRol.trim().toLowerCase().replace('antrenör','antrenor');

  if(!id || !kadi){
    tError('ID ve kullanıcı adı zorunludur.');
    return;
  }

  if(!['admin','antrenor','sporcu'].includes(r)) r = 'sporcu';

  const yeniSifre = prompt('Yeni şifre (değişmeyecekse boş bırak):', '');
  if(yeniSifre === null) return;

  const body = new URLSearchParams();
  body.append('id', id);
  body.append('kullanici_adi', kadi);
  body.append('rol', r);
  if(yeniSifre.trim()) body.append('sifre', yeniSifre.trim());

  const data = await apiFetch('kullanicilar.php', {
    method:'PUT',
    body: body.toString(),
    headers:{'Content-Type':'application/x-www-form-urlencoded'}
  });

  if(data?.success){
    t(data.message || 'Kullanıcı güncellendi!');
    loadAdminKullanicilar();
  }else{
    tError(data?.message || 'Kullanıcı güncellenemedi.');
  }
}

async function adminVideoDuzenle(id, baslik, url){
  const yeniBaslik = prompt('Yeni başlık:', baslik || '');
  if(yeniBaslik === null) return;

  const yeniUrl = prompt('Yeni video URL:', url || '');
  if(yeniUrl === null) return;

  const b = yeniBaslik.trim();
  const u = yeniUrl.trim();

  if(!id || !b || !u){
    tError('ID, başlık ve URL zorunludur.');
    return;
  }

  const body = new URLSearchParams();
  body.append('id', id);
  body.append('baslik', b);
  body.append('video_url', u);

  const data = await apiFetch('videolar.php', {
    method:'PUT',
    body: body.toString(),
    headers:{'Content-Type':'application/x-www-form-urlencoded'}
  });

  if(data?.success){
    t(data.message || 'Video güncellendi!');
    if(document.getElementById('admin-video-list')) loadAdminVideolar();
    if(document.getElementById('antrenor-video-list')) loadAntrenorVideolar();
  }else{
    tError(data?.message || 'Video güncellenemedi.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  __tsmartFixSidebar();
  setTimeout(__tsmartFixSidebar, 250);
  setTimeout(__tsmartFixSidebar, 1000);
});
window.addEventListener('load', () => {
  __tsmartFixSidebar();
  setTimeout(__tsmartFixSidebar, 250);
  setTimeout(__tsmartFixSidebar, 1000);
});


/* =========================================================
   Admin sporcu düzenle + Sporcu hesap ekranı
========================================================= */

function openSporcuHesapDirect(){
  const page = document.getElementById('pg-s-hesap');
  if(!page) return;

  document.querySelectorAll('.page').forEach(p=>{
    p.classList.remove('active');
    p.style.display='';
  });

  const name = (typeof oturum !== 'undefined' && oturum && (oturum.ad_soyad || oturum.kullanici_adi)) ? (oturum.ad_soyad || oturum.kullanici_adi) : '';
  const username = (typeof oturum !== 'undefined' && oturum && oturum.kullanici_adi) ? oturum.kullanici_adi : '';

  page.innerHTML = `
  <div class="al">
    <div class="sb">
      <div class="sb-l"><h2>T-Smart <span>2.0</span></h2><p>Taekwondo Yönetim Sistemi</p></div>
      <div class="sb-u"><div class="uav" style="background:#fdd835;color:#5a4000;">${initialsFrom(name)}</div><div class="ui"><p>${name}</p><span>Sporcu</span></div></div>
      <nav class="sb-n">
        <div class="ns">Profilim</div>
        <div class="ni" onclick="g('pg-s-kariyer')">Kariyer Haritam</div>
        <div class="ni" onclick="g('pg-s-maç')">Maç Geçmişim</div>
        <div class="ni" onclick="g('pg-s-hata')">Hata Analizim</div>
        <div class="ns">Kaynaklar</div>
        <div class="ni" onclick="g('pg-s-video')">Eğitim Videoları</div>
        <div class="ns">Hesap</div>
        <div class="ni a" onclick="openSporcuHesapDirect()">⚙️ Hesap Ayarları</div>
      </nav>
      <div class="sb-f"><button class="lo" onclick="doLogout()">Çıkış Yap</button></div>
    </div>
    <div class="mc">
      <div class="mh"><h3>Hesap Ayarları</h3><p>Profil ve güvenlik bilgilerinizi yönetin</p></div>
      <div class="mb">
        <div class="card">
          <div class="ct">Profil Bilgileri</div>
          <div class="fg2 g2">
            <div class="f"><label>Ad Soyad</label><input value="${name}"></div>
            <div class="f"><label>Kullanıcı Adı</label><input value="${username}"></div>
          </div>
          <div class="fg2 g1">
            <div class="f"><label>Rol</label><input value="Sporcu" disabled></div>
          </div>
          <div class="br"><button class="btn bp" onclick="t('Profil bilgileri kaydedildi!')">Kaydet</button></div>
        </div>
        <div class="card">
          <div class="ct">Şifre Değiştir</div>
          <div class="fg2 g3">
            <div class="f"><label>Mevcut Şifre</label><input type="password"></div>
            <div class="f"><label>Yeni Şifre</label><input type="password"></div>
            <div class="f"><label>Yeni Şifre Tekrar</label><input type="password"></div>
          </div>
          <div class="br"><button class="btn bp" onclick="t('Şifre güncellendi!')">Şifreyi Güncelle</button><button class="btn bo" onclick="doLogout()">Çıkış Yap</button></div>
        </div>
      </div>
    </div>
  </div>`;

  page.classList.add('active');
  page.style.display='';
  window.scrollTo(0,0);
}

async function loadAdminSporcuYonetimi(){
  const sporcular = await getAllSporcular();
  adminSporcularCache = sporcular || [];
  const page = document.getElementById('pg-ad-sporcu');
  if(!page) return;

  const vals = page.querySelectorAll('.sg .sv');
  const counts = buildKusakCounts(adminSporcularCache);

  if(vals[0]) vals[0].textContent = adminSporcularCache.length;
  if(vals[1]) vals[1].textContent = new Set(adminSporcularCache.map(s=>s.Kulup_Adi).filter(Boolean)).size || '—';
  if(vals[2]) vals[2].textContent = KUSAK_SIRASI.filter(k=>counts[k]>0).length || '—';

  const chart = page.querySelector('.bc');
  const max = Math.max(1, ...Object.values(counts));
  if(chart){
    chart.innerHTML = KUSAK_SIRASI.filter(k=>counts[k]>0).map(k=>`
      <div class="bg2">
        <div class="bv2">${counts[k]}</div>
        <div class="bf" style="height:${Math.max(8,Math.round(counts[k]/max*90))}%;background:${beltColor(k)};"></div>
        <div class="bl2">${k}</div>
      </div>`).join('');
  }

  const tbody = document.getElementById('admin-sporcu-tbody') || page.querySelectorAll('tbody')[page.querySelectorAll('tbody').length-1];
  if(tbody){
    tbody.innerHTML = adminSporcularCache.map(s=>`
      <tr>
        <td>${safeText(s.Ad_Soyad)}</td>
        <td>${safeText(s.Kulup_Adi)}</td>
        <td><span class="badge ${getBadgeClass(s.Kusak_Adi)}">${beltLabel(s.Kusak_Adi)}</span></td>
        <td><button class="btn bo" style="padding:5px 9px;font-size:11px;" onclick="adminSporcuDuzenleLocal(${s.Sporcu_ID})">Düzenle</button></td>
      </tr>`).join('');
  }

  const sporcuSel = document.getElementById('admin-kusak-sporcu');
  const mevcutSel = document.getElementById('admin-mevcut-kusak');
  const yeniSel = document.getElementById('admin-yeni-kusak');

  if(sporcuSel){
    sporcuSel.innerHTML = adminSporcularCache.map(s=>`<option value="${s.Sporcu_ID}">${safeText(s.Ad_Soyad)}</option>`).join('');
    sporcuSel.onchange = syncAdminMevcutKusak;
  }

  await loadKusakOptions(mevcutSel);
  await loadKusakOptions(yeniSel);
  if(mevcutSel) mevcutSel.disabled = true;
  syncAdminMevcutKusak();
}

function adminSporcuDuzenleLocal(id){
  const s = adminSporcularCache.find(x => String(x.Sporcu_ID) === String(id));
  if(!s){
    tError('Sporcu bulunamadı.');
    return;
  }

  const sporcuSel = document.getElementById('admin-kusak-sporcu');
  if(sporcuSel){
    sporcuSel.value = id;
    syncAdminMevcutKusak();
  }

  const kusakBox = document.querySelector('#pg-ad-sporcu .card:nth-of-type(2)') || document.getElementById('admin-kusak-sporcu')?.closest('.card');
  if(kusakBox){
    kusakBox.scrollIntoView({behavior:'smooth', block:'center'});
  }

  t(`${s.Ad_Soyad} seçildi. Sağdaki Kuşak Güncelle alanından düzenleyebilirsin.`);
}


/* 
   FINAL EXTRA FIX: Sporcu antrenör düzenleme + hesap sayfası
 */

async function getAllAntrenorler(){
  const d = await apiFetch('kullanicilar.php');
  if(!d?.success) return [];
  return (d.data || []).filter(u => String(u.Rol || '').toLowerCase() === 'antrenor');
}

async function loadAdminSporcuYonetimi(){
  const sporcular = await getAllSporcular();
  adminSporcularCache = sporcular || [];

  const page = document.getElementById('pg-ad-sporcu');
  if(!page) return;

  const vals = page.querySelectorAll('.sg .sv');
  const counts = buildKusakCounts(adminSporcularCache);

  if(vals[0]) vals[0].textContent = adminSporcularCache.length;
  if(vals[1]) vals[1].textContent = new Set(adminSporcularCache.map(s => s.Kulup_Adi).filter(Boolean)).size || '—';
  if(vals[2]) vals[2].textContent = KUSAK_SIRASI.filter(k => counts[k] > 0).length || '—';

  const chart = page.querySelector('.bc');
  const max = Math.max(1, ...Object.values(counts));
  if(chart){
    chart.innerHTML = KUSAK_SIRASI.filter(k => counts[k] > 0).map(k => `
      <div class="bg2">
        <div class="bv2">${counts[k]}</div>
        <div class="bf" style="height:${Math.max(8, Math.round(counts[k] / max * 90))}%;background:${beltColor(k)};"></div>
        <div class="bl2">${k}</div>
      </div>`).join('');
  }

  const tbody = document.getElementById('admin-sporcu-tbody') || page.querySelectorAll('tbody')[page.querySelectorAll('tbody').length - 1];
  if(tbody){
    tbody.innerHTML = adminSporcularCache.map(s => `
      <tr>
        <td>${safeText(s.Ad_Soyad)}</td>
        <td>${safeText(s.Kulup_Adi)}</td>
        <td><span class="badge ${getBadgeClass(s.Kusak_Adi)}">${beltLabel(s.Kusak_Adi)}</span></td>
        <td><button class="btn bo" style="padding:5px 9px;font-size:11px;" onclick="adminSporcuDuzenleLocal(${s.Sporcu_ID})">Düzenle</button></td>
      </tr>`).join('');
  }

  const sporcuSel = document.getElementById('admin-kusak-sporcu');
  const mevcutSel = document.getElementById('admin-mevcut-kusak');
  const yeniSel = document.getElementById('admin-yeni-kusak');

  if(sporcuSel){
    sporcuSel.innerHTML = adminSporcularCache.map(s => `<option value="${s.Sporcu_ID}">${safeText(s.Ad_Soyad)}</option>`).join('');
    sporcuSel.onchange = syncAdminMevcutKusak;
  }

  await loadKusakOptions(mevcutSel);
  await loadKusakOptions(yeniSel);
  if(mevcutSel) mevcutSel.disabled = true;

  await ensureAntrenorSelectInAdminSporcu();
  syncAdminMevcutKusak();
}

async function ensureAntrenorSelectInAdminSporcu(){
  const page = document.getElementById('pg-ad-sporcu');
  const formCard = document.getElementById('admin-kusak-sporcu')?.closest('.card');
  if(!page || !formCard) return;

  let wrap = document.getElementById('admin-antrenor-wrap');
  if(!wrap){
    const row = document.createElement('div');
    row.id = 'admin-antrenor-wrap';
    row.className = 'f';
    row.style.marginTop = '10px';
    row.innerHTML = `
      <label>Antrenör</label>
      <select id="admin-antrenor-sec">
        <option value="">Atanmamış</option>
      </select>
    `;
    const buttons = formCard.querySelector('.br');
    if(buttons) formCard.insertBefore(row, buttons);
    else formCard.appendChild(row);
    wrap = row;
  }

  const sel = document.getElementById('admin-antrenor-sec');
  const antrenorler = await getAllAntrenorler();
  sel.innerHTML = `<option value="">Atanmamış</option>` + antrenorler.map(a => 
    `<option value="${a.Kullanici_ID}">${safeText(a.Ad_Soyad || a.Kullanici_Adi)}</option>`
  ).join('');
}

function adminSporcuDuzenleLocal(id){
  const s = adminSporcularCache.find(x => String(x.Sporcu_ID) === String(id));
  if(!s){
    tError('Sporcu bulunamadı.');
    return;
  }

  const sporcuSel = document.getElementById('admin-kusak-sporcu');
  if(sporcuSel){
    sporcuSel.value = id;
    syncAdminMevcutKusak();
  }

  const antrenorSel = document.getElementById('admin-antrenor-sec');
  if(antrenorSel) antrenorSel.value = s.Antrenor_ID || '';

  const formCard = document.getElementById('admin-kusak-sporcu')?.closest('.card');
  if(formCard) formCard.scrollIntoView({behavior:'smooth', block:'center'});

  t(`${s.Ad_Soyad} seçildi. Kuşak ve antrenör alanından düzenleyebilirsin.`);
}

async function adminKusakGuncelle(){
  const sporcuSel = document.getElementById('admin-kusak-sporcu');
  const yeniSel = document.getElementById('admin-yeni-kusak');
  const antrenorSel = document.getElementById('admin-antrenor-sec');

  const s = adminSporcularCache.find(x => String(x.Sporcu_ID) === String(sporcuSel?.value));
  if(!s || !yeniSel?.value){
    tError('Sporcu ve yeni kuşak seçin.');
    return;
  }

  const fd = new FormData();
  fd.append('sporcu_id', s.Sporcu_ID);
  fd.append('kullanici_id', s.Kullanici_ID || '');
  fd.append('ad_soyad', s.Ad_Soyad || '');
  fd.append('kullanici_adi', s.Kullanici_Adi || '');
  fd.append('kulup_adi', s.Kulup_Adi || '');
  fd.append('kusak_id', yeniSel.value);
  if(antrenorSel && antrenorSel.value) fd.append('antrenor_id', antrenorSel.value);

  const data = await apiFetch('sporcular.php', { method:'POST', body:fd });

  if(data?.success){
    t('Sporcu bilgileri güncellendi.');
    await loadAdminSporcuYonetimi();
  }else{
    tError(data?.message || 'Güncelleme yapılamadı.');
  }
}

function openSporcuHesapDirect(){
  const page = document.getElementById('pg-s-hesap');
  if(!page){
    location.href = 'sporcu.html';
    return;
  }

  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
    p.style.display = 'none';
    p.style.width = '';
    p.style.minHeight = '';
  });

  const name = (typeof oturum !== 'undefined' && oturum && (oturum.ad_soyad || oturum.kullanici_adi)) ? (oturum.ad_soyad || oturum.kullanici_adi) : '';
  const username = (typeof oturum !== 'undefined' && oturum && oturum.kullanici_adi) ? oturum.kullanici_adi : '';

  page.innerHTML = `
  <div class="al">
    <div class="sb">
      <div class="sb-l"><h2>T-Smart <span>2.0</span></h2><p>Taekwondo Yönetim Sistemi</p></div>
      <div class="sb-u"><div class="uav" style="background:#fdd835;color:#5a4000;">${initialsFrom(name)}</div><div class="ui"><p>${name}</p><span>Sporcu</span></div></div>
      <nav class="sb-n">
        <div class="ns">Profilim</div>
        <div class="ni" onclick="g('pg-s-kariyer')">Kariyer Haritam</div>
        <div class="ni" onclick="g('pg-s-maç')">Maç Geçmişim</div>
        <div class="ni" onclick="g('pg-s-hata')">Hata Analizim</div>
        <div class="ns">Kaynaklar</div>
        <div class="ni" onclick="g('pg-s-video')">Eğitim Videoları</div>
        <div class="ns">Hesap</div>
        <div class="ni a" onclick="openSporcuHesapDirect()">⚙️ Hesap Ayarları</div>
      </nav>
      <div class="sb-f"><button class="lo" onclick="doLogout()">Çıkış Yap</button></div>
    </div>
    <div class="mc">
      <div class="mh"><h3>Hesap Ayarları</h3><p>Profil ve güvenlik bilgilerinizi yönetin</p></div>
      <div class="mb">
        <div class="card">
          <div class="ct">Profil Bilgileri</div>
          <div class="fg2 g2">
            <div class="f"><label>Ad Soyad</label><input value="${name}"></div>
            <div class="f"><label>Kullanıcı Adı</label><input value="${username}"></div>
          </div>
          <div class="fg2 g1">
            <div class="f"><label>Rol</label><input value="Sporcu" disabled></div>
          </div>
          <div class="br"><button class="btn bp" onclick="t('Profil bilgileri kaydedildi!')">Kaydet</button></div>
        </div>
        <div class="card">
          <div class="ct">Şifre Değiştir</div>
          <div class="fg2 g3">
            <div class="f"><label>Mevcut Şifre</label><input type="password"></div>
            <div class="f"><label>Yeni Şifre</label><input type="password"></div>
            <div class="f"><label>Yeni Şifre Tekrar</label><input type="password"></div>
          </div>
          <div class="br"><button class="btn bp" onclick="t('Şifre güncellendi!')">Şifreyi Güncelle</button><button class="btn bo" onclick="doLogout()">Çıkış Yap</button></div>
        </div>
      </div>
    </div>
  </div>`;

  page.classList.add('active');
  page.style.display = 'block';
  page.style.width = '100%';
  page.style.minHeight = '100vh';
  window.scrollTo(0,0);
}





/* 
   FINAL KUŞAK RENK JS DÜZELTMESİ
   Kariyer Haritam'daki Yeşil-Mavi ve Mavi-Kırmızı renkleri.
*/

function fixCareerBeltColorsFinal(){
  document.querySelectorAll('.career-dashboard .cst, .career-roadmap-card .cst, .cst').forEach(function(row){
    var text = row.textContent || '';
    var blt = row.querySelector('.blt');
    if(!blt) return;

    if(text.includes('Yeşil-Mavi') || text.includes('Yesil-Mavi')){
      blt.classList.add('ym','bgm');
      blt.style.background = 'linear-gradient(135deg,#22c55e 0%,#3b82f6 100%)';
      blt.style.color = '#fff';
      blt.style.borderColor = '#3b82f6';
    }

    if(text.includes('Mavi-Kırmızı') || text.includes('Mavi-Kirmizi')){
      blt.classList.add('mk','bmk');
      blt.style.background = 'linear-gradient(135deg,#3b82f6 0%,#ef4444 100%)';
      blt.style.color = '#fff';
      blt.style.borderColor = '#ef4444';
    }
  });

  document.querySelectorAll('span.badge, .badge').forEach(function(b){
    var txt = (b.textContent || '').trim();

    b.style.display = 'inline-block';
    b.style.width = 'auto';
    b.style.minWidth = '0';
    b.style.maxWidth = 'max-content';
    b.style.padding = '5px 10px';
    b.style.borderRadius = '999px';
    b.style.whiteSpace = 'nowrap';
    b.style.gridTemplateColumns = 'unset';
    b.style.gap = '0';
    b.style.marginTop = '0';

    if(txt === 'Yeşil-Mavi Kuşak' || txt === 'Yesil-Mavi Kuşak'){
      b.classList.remove('bmm');
      b.classList.add('bgm');
      b.style.background = 'linear-gradient(135deg,#22c55e 0%,#3b82f6 100%)';
      b.style.color = '#fff';
      b.style.border = 'none';
    }

    if(txt === 'Mavi-Kırmızı Kuşak' || txt === 'Mavi-Kirmizi Kuşak'){
      b.classList.add('bmk');
      b.style.background = 'linear-gradient(135deg,#3b82f6 0%,#ef4444 100%)';
      b.style.color = '#fff';
      b.style.border = 'none';
    }
  });
}

document.addEventListener('DOMContentLoaded', function(){
  setTimeout(fixCareerBeltColorsFinal, 100);
  setTimeout(fixCareerBeltColorsFinal, 600);
  setTimeout(fixCareerBeltColorsFinal, 1200);
});

window.addEventListener('load', function(){
  setTimeout(fixCareerBeltColorsFinal, 100);
  setTimeout(fixCareerBeltColorsFinal, 600);
});

var careerBeltObserverFinal = new MutationObserver(function(){
  fixCareerBeltColorsFinal();
});
careerBeltObserverFinal.observe(document.documentElement, {childList:true, subtree:true});


/* 
   SPORCU HESAP İSİM DÜZELTME
   Hesap Ayarları açılınca sabit Ege Kaya yazmaz.
   O an sidebar'da hangi sporcu varsa onu alır.
    */

function tsmartGetCurrentSporcuName(){
  var sidebarName = document.querySelector('.page.active .sb-u .ui p') || document.querySelector('.sb-u .ui p');
  var name = sidebarName && sidebarName.textContent.trim() ? sidebarName.textContent.trim() : 'Sporcu';
  return name;
}

function tsmartUsernameFromName(name){
  return String(name || 'sporcu')
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/[^a-z0-9]+/g,'')
    || 'sporcu';
}

function tsmartSporcuHesapAc(){
  var currentName = tsmartGetCurrentSporcuName();
  var currentUser = tsmartUsernameFromName(currentName);
  var initials = currentName.split(/\s+/).filter(Boolean).map(function(x){return x[0];}).join('').slice(0,2).toUpperCase();

  document.body.innerHTML = `
    <div id="toast" class="toast"></div>
    <div class="page active" style="display:block;">
      <div class="al">
        <div class="sb">
          <div class="sb-l">
            <h2>T-Smart <span>2.0</span></h2>
            <p>Taekwondo Yönetim Sistemi</p>
          </div>

          <div class="sb-u">
            <div class="uav" style="background:#fdd835;color:#5a4000;" id="hesap-uav">${initials}</div>
            <div class="ui"><p>${currentName}</p><span>Sporcu</span></div>
          </div>

          <nav class="sb-n">
            <div class="ns">Profilim</div>
            <div class="ni" onclick="location.href='sporcu.html'">Kariyer Haritam</div>
            <div class="ni" onclick="location.href='sporcu.html'">Maç Geçmişim</div>
            <div class="ni" onclick="location.href='sporcu.html'">Hata Analizim</div>
            <div class="ns">Kaynaklar</div>
            <div class="ni" onclick="location.href='sporcu.html'">Eğitim Videoları</div>
            <div class="ns">Hesap</div>
            <div class="ni a" onclick="tsmartSporcuHesapAc()">⚙️ Hesap Ayarları</div>
          </nav>

          <div class="sb-f">
            <button class="lo" onclick="doLogout()">Çıkış Yap</button>
          </div>
        </div>

        <div class="mc">
          <div class="mh">
            <h3>Hesap Ayarları</h3>
            <p>Profil ve güvenlik bilgilerinizi yönetin</p>
          </div>

          <div class="mb">
            <div class="card">
              <div class="ct">Profil Bilgileri</div>

              <div class="fg2 g2">
                <div class="f">
                  <label>Ad Soyad</label>
                  <input value="${currentName}">
                </div>
                <div class="f">
                  <label>Kullanıcı Adı</label>
                  <input value="${currentUser}">
                </div>
              </div>

              <div class="fg2 g1">
                <div class="f">
                  <label>Rol</label>
                  <input value="Sporcu" disabled>
                </div>
              </div>

              <div class="br">
                <button class="btn bp" onclick="t('Profil bilgileri kaydedildi!')">Kaydet</button>
              </div>
            </div>

            <div class="card">
              <div class="ct">Şifre Değiştir</div>

              <div class="fg2 g3">
                <div class="f">
                  <label>Mevcut Şifre</label>
                  <input type="password">
                </div>
                <div class="f">
                  <label>Yeni Şifre</label>
                  <input type="password">
                </div>
                <div class="f">
                  <label>Yeni Şifre Tekrar</label>
                  <input type="password">
                </div>
              </div>

              <div class="br">
                <button class="btn bp" onclick="t('Şifre güncellendi!')">Şifreyi Güncelle</button>
                <button class="btn bo" onclick="doLogout()">Çıkış Yap</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.style.background = '#f0f2f5';
  return false;
}


/* 
   FINAL DB UYUMLU KUŞAK + YENİ SPORCU DÜZELTMESİ
   - DB'deki gerçek kuşak sırasına göre çalışır.
   - Yeni kullanıcıda eski hazır maç/kariyer verisi göstermez.
   - E-posta alanı kullanılmaz.
 */

const TSMART_DB_KUSAKLAR = [
  {ad:'Beyaz Kuşak', kisa:'BEY', renk:'#e5e7eb', text:'#1f2937', border:'#cbd5e1'},
  {ad:'Sarı-Beyaz Kuşak', kisa:'SB', renk:'linear-gradient(135deg,#ffffff 0%,#facc15 100%)', text:'#5a4000', border:'#eab308'},
  {ad:'Sarı Kuşak', kisa:'SAR', renk:'#facc15', text:'#5a4000', border:'#ca8a04'},
  {ad:'Yeşil-Sarı Kuşak', kisa:'YS', renk:'linear-gradient(135deg,#22c55e 0%,#facc15 100%)', text:'#173b16', border:'#84cc16'},
  {ad:'Yeşil Kuşak', kisa:'YEŞ', renk:'#22c55e', text:'#fff', border:'#16a34a'},
  {ad:'Mavi-Yeşil Kuşak', kisa:'MY', renk:'linear-gradient(135deg,#3b82f6 0%,#22c55e 100%)', text:'#fff', border:'#2563eb'},
  {ad:'Mavi Kuşak', kisa:'MAV', renk:'#3b82f6', text:'#fff', border:'#1d4ed8'},
  {ad:'Kırmızı-Mavi Kuşak', kisa:'KM', renk:'linear-gradient(135deg,#ef4444 0%,#3b82f6 100%)', text:'#fff', border:'#ef4444'},
  {ad:'Kırmızı Kuşak', kisa:'KIR', renk:'#ef4444', text:'#fff', border:'#991b1b'},
  {ad:'Siyah-Kırmızı Kuşak', kisa:'SK', renk:'linear-gradient(135deg,#111827 0%,#ef4444 100%)', text:'#fff', border:'#111827'},
  {ad:'Siyah Kuşak (1. Dan)', kisa:'S1', renk:'#111827', text:'#fff', border:'#000'},
  {ad:'Siyah Kuşak (2. Dan)', kisa:'S2', renk:'#000', text:'#ffd700', border:'#ffd700'}
];

function canonicalBelt(kusak){
  if(!kusak) return 'Belirsiz';
  let s = String(kusak).toLocaleLowerCase('tr-TR').trim();
  s = s.replace(/\s+/g,' ');
  const direct = {
    'beyaz':'Beyaz Kuşak',
    'beyaz kuşak':'Beyaz Kuşak',
    'sarı-beyaz':'Sarı-Beyaz Kuşak',
    'sarı beyaz':'Sarı-Beyaz Kuşak',
    'sarı-beyaz kuşak':'Sarı-Beyaz Kuşak',
    'sarı beyaz kuşak':'Sarı-Beyaz Kuşak',
    'sarı':'Sarı Kuşak',
    'sarı kuşak':'Sarı Kuşak',
    'yeşil-sarı':'Yeşil-Sarı Kuşak',
    'yeşil sarı':'Yeşil-Sarı Kuşak',
    'yeşil-sarı kuşak':'Yeşil-Sarı Kuşak',
    'yeşil sarı kuşak':'Yeşil-Sarı Kuşak',
    'sarı-yeşil':'Yeşil-Sarı Kuşak',
    'sarı yeşil':'Yeşil-Sarı Kuşak',
    'sarı-yeşil kuşak':'Yeşil-Sarı Kuşak',
    'yeşil':'Yeşil Kuşak',
    'yeşil kuşak':'Yeşil Kuşak',
    'mavi-yeşil':'Mavi-Yeşil Kuşak',
    'mavi yeşil':'Mavi-Yeşil Kuşak',
    'mavi-yeşil kuşak':'Mavi-Yeşil Kuşak',
    'mavi yeşil kuşak':'Mavi-Yeşil Kuşak',
    'yeşil-mavi':'Mavi-Yeşil Kuşak',
    'yeşil mavi':'Mavi-Yeşil Kuşak',
    'yeşil-mavi kuşak':'Mavi-Yeşil Kuşak',
    'mavi':'Mavi Kuşak',
    'mavi kuşak':'Mavi Kuşak',
    'kırmızı-mavi':'Kırmızı-Mavi Kuşak',
    'kırmızı mavi':'Kırmızı-Mavi Kuşak',
    'kırmızı-mavi kuşak':'Kırmızı-Mavi Kuşak',
    'mavi-kırmızı':'Kırmızı-Mavi Kuşak',
    'mavi kırmızı':'Kırmızı-Mavi Kuşak',
    'mavi-kırmızı kuşak':'Kırmızı-Mavi Kuşak',
    'kırmızı':'Kırmızı Kuşak',
    'kırmızı kuşak':'Kırmızı Kuşak',
    'siyah-kırmızı':'Siyah-Kırmızı Kuşak',
    'siyah kırmızı':'Siyah-Kırmızı Kuşak',
    'siyah-kırmızı kuşak':'Siyah-Kırmızı Kuşak',
    'kırmızı-siyah':'Siyah-Kırmızı Kuşak',
    'kırmızı siyah':'Siyah-Kırmızı Kuşak',
    'kırmızı-siyah kuşak':'Siyah-Kırmızı Kuşak',
    'siyah':'Siyah Kuşak (1. Dan)',
    'siyah kuşak':'Siyah Kuşak (1. Dan)',
    'siyah kuşak (1. dan)':'Siyah Kuşak (1. Dan)',
    'siyah kuşak (2. dan)':'Siyah Kuşak (2. Dan)'
  };
  if(direct[s]) return direct[s];

  s = s.replace(/kuşak/g,'').replace(/kusak/g,'').replace(/[()0-9.]/g,'').trim();
  if(s.includes('siyah') && s.includes('kırmızı')) return 'Siyah-Kırmızı Kuşak';
  if(s.includes('kırmızı') && s.includes('mavi')) return 'Kırmızı-Mavi Kuşak';
  if(s.includes('mavi') && s.includes('yeşil')) return 'Mavi-Yeşil Kuşak';
  if(s.includes('yeşil') && s.includes('sarı')) return 'Yeşil-Sarı Kuşak';
  if(s.includes('sarı') && s.includes('beyaz')) return 'Sarı-Beyaz Kuşak';
  if(s.includes('beyaz')) return 'Beyaz Kuşak';
  if(s.includes('sarı')) return 'Sarı Kuşak';
  if(s.includes('yeşil')) return 'Yeşil Kuşak';
  if(s.includes('mavi')) return 'Mavi Kuşak';
  if(s.includes('kırmızı')) return 'Kırmızı Kuşak';
  if(s.includes('siyah')) return 'Siyah Kuşak (1. Dan)';
  return kusak;
}

function beltLabel(kusak){
  const c = canonicalBelt(kusak);
  return c === 'Belirsiz' ? 'Belirsiz' : c;
}

function getBadgeClass(kusak){
  const c = canonicalBelt(kusak);
  const map = {
    'Beyaz Kuşak':'bwh',
    'Sarı-Beyaz Kuşak':'byy',
    'Sarı Kuşak':'byy',
    'Yeşil-Sarı Kuşak':'bsy',
    'Yeşil Kuşak':'bgg',
    'Mavi-Yeşil Kuşak':'bgm',
    'Mavi Kuşak':'bmm',
    'Kırmızı-Mavi Kuşak':'bmk',
    'Kırmızı Kuşak':'bkr',
    'Siyah-Kırmızı Kuşak':'bks',
    'Siyah Kuşak (1. Dan)':'bkk',
    'Siyah Kuşak (2. Dan)':'bkk'
  };
  return map[c] || 'bwh';
}

function beltColor(kusak){
  const c = canonicalBelt(kusak);
  const item = TSMART_DB_KUSAKLAR.find(x => x.ad === c);
  return item ? item.renk : '#cbd5e1';
}

function tsmartBeltIndex(kusak){
  const c = canonicalBelt(kusak);
  const idx = TSMART_DB_KUSAKLAR.findIndex(x => x.ad === c);
  return idx < 0 ? 0 : idx;
}

function tsmartScoreResult(skor){
  const p = String(skor || '0-0').split('-');
  const a = parseInt(p[0] || '0', 10), b = parseInt(p[1] || '0', 10);
  if(a > b) return 'Galibiyet';
  if(a < b) return 'Mağlubiyet';
  return 'Beraberlik';
}

function buildKusakRoadmap(mevcutKusakAdi, galibiyet, toplamMac){
  const roadmap = document.getElementById('kusak-roadmap');
  if(!roadmap) return;

  const mevcutIdx = tsmartBeltIndex(mevcutKusakAdi);
  const hedefIdx = mevcutIdx + 1;
  const hedefKusak = TSMART_DB_KUSAKLAR[hedefIdx] || null;

  const hedefEl = document.getElementById('hedef-kusak');
  const hedefBar = document.getElementById('hedef-bar');
  const hedefPct = document.getElementById('hedef-pct');
  const hedefListe = document.getElementById('hedef-liste');

  const pct = toplamMac > 0 ? Math.min(100, Math.round((galibiyet / 10) * 100)) : 0;

  if(hedefEl) hedefEl.textContent = toplamMac === 0 ? 'İlk maç kaydı bekleniyor' : (hedefKusak ? hedefKusak.ad : 'En üst seviye');
  if(hedefBar) hedefBar.style.width = pct + '%';
  if(hedefPct) hedefPct.textContent = '%' + pct;
  if(hedefListe){
    hedefListe.innerHTML = toplamMac === 0
      ? '<span>0 maç kaydı</span><span>0 galibiyet</span><span>Yeni kullanıcı / kayıt bekleniyor</span>'
      : `<span>${toplamMac} maç kaydı</span><span>${galibiyet} galibiyet</span><span>${Math.max(0,10-galibiyet)} galibiyet daha gerekiyor</span>`;
  }

  roadmap.innerHTML = TSMART_DB_KUSAKLAR.map((k, idx) => {
    const blt = `<div class="blt" style="background:${k.renk};border-color:${k.border};color:${k.text};">${k.kisa}</div>`;
    if(idx < mevcutIdx){
      return `<div class="cst"><div class="blt-wrap">${blt}</div><div class="bi"><div class="bn">${k.ad}</div><div class="bd2">Tamamlandı</div><div class="pw"><div class="pb" style="width:100%;background:#198754;"></div></div></div><div class="status-done">Tamam</div></div>`;
    }
    if(idx === mevcutIdx){
      return `<div class="cst"><div class="blt-wrap">${blt}</div><div class="bi"><div class="bn">${k.ad}</div><div class="bd2">${toplamMac === 0 ? 'Yeni kayıt / mevcut seviye' : 'Mevcut Seviye'}</div><div class="pw"><div class="pb" style="width:${pct}%;background:${k.renk};"></div></div></div><div class="status-current">${toplamMac === 0 ? 'Mevcut' : '%'+pct}</div></div>`;
    }
    if(idx === hedefIdx){
      return `<div class="cst"><div class="blt-wrap">${blt}</div><div class="bi"><div class="bn">${k.ad}</div><div class="bd2">Sıradaki hedef</div><div class="pw"><div class="pb" style="width:0%;background:${k.renk};"></div></div></div><div class="status-next">Sırada</div></div>`;
    }
    return `<div class="cst muted-step"><div class="blt-wrap">${blt}</div><div class="bi"><div class="bn">${k.ad}</div><div class="bd2">İleri seviye</div></div><div class="status-empty">—</div></div>`;
  }).join('');
}

async function loadKariyer(){
  await oturumYukle();

  const setText = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  const sporcuId = oturum?.sporcu_id ? Number(oturum.sporcu_id) : 0;
  const kusakAdi = oturum?.kusak_adi || 'Beyaz Kuşak';

  const sidebarName = oturum?.ad_soyad || oturum?.kullanici_adi || 'Sporcu';
  document.querySelectorAll('#pg-s-kariyer .sb-u .ui p').forEach(x => x.textContent = sidebarName);
  document.querySelectorAll('#pg-s-kariyer .sb-u .uav').forEach(x => x.textContent = initialsFrom(sidebarName));

  let maclar = [];
  let ist = {toplam:0, galibiyet:0, maglubiyet:0, oran:0};
  let hataData = null;

  if(sporcuId){
    const [macData, hData] = await Promise.all([
      apiFetch('maclar.php?sporcu_id=' + encodeURIComponent(sporcuId)),
      apiFetch('hatalar.php?sporcu_id=' + encodeURIComponent(sporcuId) + '&donem=tum')
    ]);
    if(macData?.success){
      maclar = Array.isArray(macData.data) ? macData.data : [];
      ist = macData.istatistik || ist;
    }
    if(hData?.success) hataData = hData;
  }

  const toplamMac = Number(ist.toplam ?? maclar.length ?? 0);
  const galibiyet = Number(ist.galibiyet ?? maclar.filter(m => (m.sonuc || tsmartScoreResult(m.Skor)) === 'Galibiyet').length ?? 0);
  const oran = toplamMac ? Math.round(galibiyet / toplamMac * 100) : 0;
  const hatalar = hataData?.data || [];
  const enSikHata = hatalar.length ? safeText(hatalar[0].Hata_Tipi) : '—';
  const toplamHata = hatalar.reduce((s,h)=>s+Number(h.toplam_frekans || h.Frekans || 0),0);
  const macBasiHata = toplamMac ? (toplamHata / toplamMac).toFixed(1) : '0';

  setText('k-kusak', beltLabel(kusakAdi));
  setText('k-toplam-mac', toplamMac);
  setText('k-galibiyet', galibiyet);
  setText('k-en-sik-hata', enSikHata);
  setText('perf-oran', '%' + oran);
  setText('perf-hata', macBasiHata);
  setText('perf-son-galibiyet', galibiyet);
  setText('perf-video', '—');

  buildKusakRoadmap(kusakAdi, galibiyet, toplamMac);

  const sonMacDiv = document.getElementById('son-maclar-kariyer');
  if(sonMacDiv){
    if(!toplamMac){
      sonMacDiv.innerHTML = '<p style="color:var(--muted);font-size:13px;">Bu kullanıcı yenidir. Henüz maç kaydı bulunmuyor.</p>';
    }else{
      sonMacDiv.innerHTML = maclar.slice(0,3).map(m => {
        const sonuc = m.sonuc || tsmartScoreResult(m.Skor);
        const cls = sonuc === 'Galibiyet' ? 'win' : 'loss';
        return `<div><span>${formatDateTR(m.Tarih)}</span><b>${safeText(m.Skor).replace('-','—')}</b><em class="${cls}">${sonuc}</em></div>`;
      }).join('');
    }
  }

  const notu = document.getElementById('antrenor-notu');
  if(notu){
    notu.textContent = toplamMac === 0
      ? 'Bu kullanıcı yenidir. Antrenör maç/hata kaydı eklediğinde kariyer haritası otomatik dolacaktır.'
      : 'Kariyer haritası DB’deki maç ve hata kayıtlarına göre güncellenmektedir.';
  }
}

async function loadSporcuMaclari(){
  await oturumYukle();
  const page = document.getElementById('pg-s-maç');
  if(!page) return;
  const vals = page.querySelectorAll('.sg .sv');
  const tbody = page.querySelector('tbody');

  if(!oturum?.sporcu_id){
    vals.forEach(v => v.textContent = '0');
    if(tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px;">Bu kullanıcı yenidir. Henüz maç kaydı bulunmuyor.</td></tr>';
    return;
  }

  const data = await apiFetch('maclar.php?sporcu_id=' + encodeURIComponent(oturum.sporcu_id));
  const maclar = data?.success && Array.isArray(data.data) ? data.data : [];
  const st = data?.istatistik || {};
  if(vals[0]) vals[0].textContent = st.toplam ?? maclar.length ?? 0;
  if(vals[1]) vals[1].textContent = st.galibiyet ?? 0;
  if(vals[2]) vals[2].textContent = st.maglubiyet ?? 0;
  if(vals[3]) vals[3].textContent = '%' + (st.oran ?? 0);

  if(tbody){
    tbody.innerHTML = maclar.length ? maclar.map(m => {
      const sonuc = m.sonuc || tsmartScoreResult(m.Skor);
      const badge = sonuc === 'Galibiyet' ? 'bss' : sonuc === 'Mağlubiyet' ? 'bdd' : 'bpp';
      const h = (m.hatalar || []).map(x => `<span class="tag">${safeText(x.Hata_Tipi)}</span>`).join('');
      return `<tr><td>${formatDateTR(m.Tarih)}</td><td>${safeText(m.Organizasyon_Adi,'—')}</td><td>${safeText(m.Rakip_Adi)}</td><td>${safeText(m.Rakip_Kulup,'—')}</td><td><b>${safeText(m.Skor).replace('-','—')}</b></td><td><span class="badge ${badge}">${sonuc}</span></td><td>${h || '—'}</td></tr>`;
    }).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px;">Bu kullanıcı yenidir. Henüz maç kaydı bulunmuyor.</td></tr>';
  }
}

async function loadSporcuHatalari(){
  await oturumYukle();
  const bars = document.getElementById('s-hata-bars');
  const trendBox = document.getElementById('s-hata-trend');
  const trendMsg = document.getElementById('s-hata-trend-msg');
  const notBox = document.getElementById('s-hata-not');

  if(!oturum?.sporcu_id){
    if(bars) bars.innerHTML = '<p style="font-size:13px;color:var(--muted)">Bu kullanıcı yenidir. Henüz hata kaydı bulunmuyor.</p>';
    if(trendBox) trendBox.innerHTML = '<p style="font-size:13px;color:var(--muted)">Trend için maç kaydı yok.</p>';
    if(trendMsg) trendMsg.textContent = '';
    if(notBox) notBox.style.display = 'none';
    return;
  }

  const analiz = await apiFetch('hatalar.php?sporcu_id=' + encodeURIComponent(oturum.sporcu_id) + '&donem=tum');
  const arr = analiz?.success ? (analiz.data || []) : [];
  const max = Math.max(1, ...arr.map(x => Number(x.toplam_frekans || 0)));
  if(bars){
    bars.innerHTML = arr.length ? arr.map((h, i) => {
      const renkler = ['#ef476f','#0f3460','#fd7e14','#198754','#6f42c1','#20c997'];
      const val = Number(h.toplam_frekans || 0);
      return `<div class="hbr"><div class="hbl">${safeText(h.Hata_Tipi)}</div><div class="hbg"><div class="hbf" style="width:${Math.max(8, Math.round(val / max * 100))}%;background:${renkler[i % renkler.length]};"><div class="hbv">${val}</div></div></div></div>`;
    }).join('') : '<p style="font-size:13px;color:var(--muted)">Bu kullanıcıya ait hata kaydı yok.</p>';
  }
  if(notBox) notBox.style.display = arr.length ? 'block' : 'none';
  if(trendBox) trendBox.innerHTML = '<p style="font-size:13px;color:var(--muted)">Trend verisi maç kayıtlarına göre oluşacaktır.</p>';
  if(trendMsg) trendMsg.textContent = '';
}

// Sayfa açılışında kariyer sayfası aktifse verileri hemen düzelt
window.addEventListener('load', () => {
  setTimeout(() => {
    if(document.getElementById('pg-s-kariyer')?.classList.contains('active')) loadKariyer();
  }, 300);
});


/* 
   ADMIN KUŞAK DAĞILIMI KESİN DÜZELTME
   Eski KUSAK_SIRASI uyuşmazlığı yüzünden grafik boş kalıyordu.
 */

function tsmartAdminKusakCounts(rows){
  const order = (typeof TSMART_DB_KUSAKLAR !== 'undefined')
    ? TSMART_DB_KUSAKLAR.map(x => x.ad)
    : ['Beyaz Kuşak','Sarı-Beyaz Kuşak','Sarı Kuşak','Yeşil-Sarı Kuşak','Yeşil Kuşak','Mavi-Yeşil Kuşak','Mavi Kuşak','Kırmızı-Mavi Kuşak','Kırmızı Kuşak','Siyah-Kırmızı Kuşak','Siyah Kuşak (1. Dan)','Siyah Kuşak (2. Dan)'];

  const counts = {};
  order.forEach(k => counts[k] = 0);

  (rows || []).forEach(s => {
    const k = canonicalBelt(s.Kusak_Adi);
    if(counts[k] === undefined) counts[k] = 0;
    counts[k]++;
  });

  return {order, counts};
}

async function loadAdminSporcuYonetimi(){
  const sporcular = await getAllSporcular();
  adminSporcularCache = sporcular || [];

  const page = document.getElementById('pg-ad-sporcu');
  if(!page) return;

  const {order, counts} = tsmartAdminKusakCounts(adminSporcularCache);
  const filled = order.filter(k => (counts[k] || 0) > 0);

  const vals = page.querySelectorAll('.sg .sv');
  if(vals[0]) vals[0].textContent = adminSporcularCache.length;
  if(vals[1]) vals[1].textContent = new Set(adminSporcularCache.map(s => s.Kulup_Adi).filter(Boolean)).size || '—';
  if(vals[2]) vals[2].textContent = filled.length || '—';

  const chart = page.querySelector('.bc');
  const max = Math.max(1, ...filled.map(k => counts[k] || 0));

  if(chart){
    chart.innerHTML = filled.length
      ? filled.map(k => `
        <div class="bg2">
          <div class="bv2">${counts[k]}</div>
          <div class="bf" style="height:${Math.max(8, Math.round((counts[k] || 0) / max * 90))}%;background:${beltColor(k)};"></div>
          <div class="bl2">${k.replace(' Kuşak','').replace(' (1. Dan)','').replace(' (2. Dan)','')}</div>
        </div>
      `).join('')
      : '<p style="color:var(--muted);font-size:13px;">Kuşak dağılımı için sporcu kaydı bulunmuyor.</p>';
  }

  const tbody = document.getElementById('admin-sporcu-tbody') || page.querySelectorAll('tbody')[page.querySelectorAll('tbody').length - 1];
  if(tbody){
    tbody.innerHTML = adminSporcularCache.map(s => `
      <tr>
        <td>${safeText(s.Ad_Soyad)}</td>
        <td>${safeText(s.Kulup_Adi)}</td>
        <td><span class="badge ${getBadgeClass(s.Kusak_Adi)}">${beltLabel(s.Kusak_Adi)}</span></td>
        <td><button class="btn bo" style="padding:5px 9px;font-size:11px;" onclick="adminSporcuDuzenle(${s.Sporcu_ID}, this)">Düzenle</button></td>
      </tr>
    `).join('');
  }

  const sporcuSel = document.getElementById('admin-kusak-sporcu');
  const mevcutSel = document.getElementById('admin-mevcut-kusak');
  const yeniSel = document.getElementById('admin-yeni-kusak');

  if(sporcuSel){
    sporcuSel.innerHTML = adminSporcularCache.map(s => `<option value="${s.Sporcu_ID}">${safeText(s.Ad_Soyad)}</option>`).join('');
    sporcuSel.onchange = syncAdminMevcutKusak;
  }

  await loadKusakOptions(mevcutSel);
  await loadKusakOptions(yeniSel);
  if(mevcutSel) mevcutSel.disabled = true;
  syncAdminMevcutKusak();
}

window.addEventListener('load', () => {
  setTimeout(() => {
    if(document.getElementById('pg-ad-sporcu')?.classList.contains('active')) loadAdminSporcuYonetimi();
  }, 300);
});


/* =========================================================
   KUŞAK AYARLARI - DB VERİLERİYLE KRİTER DOLDURMA
   Min. Maç      = DB'de o kuşaktaki toplam maç sayısı        // bunlar silindi(?)
   Min. Galibiyet= DB'de o kuşaktaki toplam galibiyet sayısı  // bunlar silindi(?)
   Maks. Hata Ort.= DB'de o kuşaktaki maç başına hata ortalaması // bunlar silindi(?)
========================================================= */

async function loadKusakAyarlar(){
  const [kusakData, sporcuData, macData] = await Promise.all([
    apiFetch('kusaklar.php'),
    apiFetch('sporcular.php'),
    apiFetch('maclar.php')
  ]);

  if(!kusakData?.success) return;

  const tbody = document.querySelector('#pg-ad-kusak tbody');
  if(!tbody) return;

  const kusaklar = kusakData.data || [];
  const sporcular = sporcuData?.success ? (sporcuData.data || []) : [];
  const maclar = macData?.success ? (macData.data || []) : [];

  const used = new Set();
  const rows = kusaklar.filter(k => {
    const c = canonicalBelt(k.Kusak_Adi);
    if(used.has(c)) return false;
    used.add(c);
    return true;
  });

  const stats = {};
  rows.forEach(k => {
    const belt = canonicalBelt(k.Kusak_Adi);
    stats[belt] = {
      mac: 0,
      galibiyet: 0,
      hata: 0,
      sporcu: sporcular.filter(s => canonicalBelt(s.Kusak_Adi) === belt).length
    };
  });

  maclar.forEach(m => {
    const belt = canonicalBelt(m.Kusak_Adi);
    if(!stats[belt]){
      stats[belt] = {mac:0, galibiyet:0, hata:0, sporcu:0};
    }

    stats[belt].mac++;

    const sonuc = m.sonuc || getSonuc(m.Skor);
    if(sonuc === 'Galibiyet') stats[belt].galibiyet++;

    const hataToplam = (m.hatalar || []).reduce((toplam, h) => {
      return toplam + Number(h.Frekans || 0);
    }, 0);
    stats[belt].hata += hataToplam;
  });

  tbody.innerHTML = rows.map(k => {
    const belt = canonicalBelt(k.Kusak_Adi);
    const st = stats[belt] || {mac:0, galibiyet:0, hata:0, sporcu:0};
    const hataOrt = st.mac > 0 ? (st.hata / st.mac).toFixed(1) : '0.0';

    return `
      <tr>
        <td>
          <span class="badge ${getBadgeClass(k.Kusak_Adi)}">${beltLabel(k.Kusak_Adi)}</span>
        </td>
        <td>
          <div style="width:24px;height:24px;border-radius:50%;background:${beltColor(k.Kusak_Adi)};border:2px solid #cbd5e1;display:inline-block;"></div>
        </td>
        <td>${st.mac}</td>
        <td>${st.galibiyet}</td>
        <td>${hataOrt}</td>
        <td><span class="badge bss">Aktif</span></td>
      </tr>
    `;
  }).join('');
}


/* 
   ANTRENÖR ROUTER - INLINE ONCLICK BAĞIMSIZ DÜZELTME
 */

(function(){
  function antrenorShowPage(id){
    var page = document.getElementById(id);
    if(!page) return false;

    document.querySelectorAll('.page').forEach(function(p){
      p.classList.remove('active');
      p.style.display = '';
    });

    page.classList.add('active');
    page.style.display = '';

    document.querySelectorAll('[data-page]').forEach(function(n){
      n.classList.remove('a');
      if(n.getAttribute('data-page') === id) n.classList.add('a');
    });

    window.scrollTo(0,0);
    return true;
  }

  function trainerName(){
    var el = document.querySelector('#pg-a-hata .sb-u .ui p') || document.querySelector('.sb-u .ui p');
    return el && el.textContent.trim() ? el.textContent.trim() : 'Ahmet Antrenör';
  }

  window.openAntrenorHesapSafe = function(){
    var page = document.getElementById('pg-a-hesap');
    if(!page) return false;

    var ad = trainerName();
    var user = (typeof oturum !== 'undefined' && oturum && oturum.kullanici_adi) ? oturum.kullanici_adi : 'antrenor_hakan';

    page.innerHTML = `
      <div class="al">
        <div class="sb">
          <div class="sb-l"><h2>T-Smart <span>2.0</span></h2><p>Taekwondo Yönetim Sistemi</p></div>
          <div class="sb-u"><div class="uav">${typeof initialsFrom === 'function' ? initialsFrom(ad) : 'A'}</div><div class="ui"><p>${ad}</p><span>Antrenör</span></div></div>
          <nav class="sb-n">
            <div class="ns">Genel</div>
            <div class="ni" data-page="pg-a-hata">Hata Girişi</div>
            <div class="ni" data-page="pg-a-maç">Maç Kayıtları</div>
            <div class="ni" data-page="pg-a-liste">Sporcu Listesi</div>
            <div class="ns">Raporlar</div>
            <div class="ni" data-page="pg-a-analiz">Frekans Analizi</div>
            <div class="ni" data-page="pg-a-gelisim">Gelişim Grafikleri</div>
            <div class="ns">Kaynaklar</div>
            <div class="ni" data-page="pg-a-video">🎬 Video Yönetimi</div>
            <div class="ns">Hesap</div>
            <div class="ni a" data-page="pg-a-hesap">⚙️ Hesap Ayarları</div>
          </nav>
          <div class="sb-f"><button class="lo" onclick="doLogout()">Çıkış Yap</button></div>
        </div>

        <div class="mc">
          <div class="mh"><h3>Hesap Ayarları</h3><p>Antrenör profil ve güvenlik ayarları</p></div>
          <div class="mb">
            <div class="card">
              <div class="ct">Profil Bilgileri</div>
              <div class="fg2 g2">
                <div class="f"><label>Ad Soyad</label><input value="${ad}" readonly></div>
                <div class="f"><label>Kullanıcı Adı</label><input value="${user}" readonly></div>
              </div>
              <div class="fg2 g1">
                <div class="f"><label>Rol</label><input value="Antrenör" readonly></div>
              </div>
            </div>

            <div class="card">
              <div class="ct">Şifre Değiştir</div>
              <div class="fg2 g3">
                <div class="f"><label>Mevcut Şifre</label><input type="password"></div>
                <div class="f"><label>Yeni Şifre</label><input type="password"></div>
                <div class="f"><label>Yeni Şifre Tekrar</label><input type="password"></div>
              </div>
              <div class="br"><button class="btn bp">Şifreyi Güncelle</button></div>
            </div>
          </div>
        </div>
      </div>`;
    return antrenorShowPage('pg-a-hesap');
  };

  window.openAntrenorVideoSafe = function(){
    var ok = antrenorShowPage('pg-a-video');
    if(!ok) return false;

    var list = document.getElementById('antrenor-video-list');
    var chips = document.getElementById('antrenor-video-chips');

    if(chips && !chips.innerHTML.trim()) chips.innerHTML = '<span class="chip a">Tümü</span>';
    if(list) list.innerHTML = '<p style="color:var(--muted);font-size:13px;">Video Yönetimi açıldı. Video kayıtları DB/API bağlantısı çalıştığında burada listelenir.</p>';

    return false;
  };

  document.addEventListener('DOMContentLoaded', function(){
    if(!location.pathname.toLowerCase().includes('antrenor.html')) return;

    var active = document.querySelector('.page.active');
    if(!active || getComputedStyle(active).display === 'none'){
      antrenorShowPage('pg-a-hata');
    }

    document.addEventListener('click', function(e){
      var item = e.target.closest('[data-page]');
      if(!item) return;

      var id = item.getAttribute('data-page');
      e.preventDefault();
      e.stopPropagation();

      if(id === 'pg-a-hesap'){
        openAntrenorHesapSafe();
        return false;
      }

      if(id === 'pg-a-video'){
        openAntrenorVideoSafe();
        return false;
      }

      antrenorShowPage(id);

      try{
        if(id === 'pg-a-hata' && typeof loadHataGiris === 'function') loadHataGiris();
        if(id === 'pg-a-maç' && typeof loadMacFiltreleri === 'function') loadMacFiltreleri().then(loadMaclar);
        if(id === 'pg-a-liste' && typeof loadSporcuList === 'function') loadSporcuList();
        if(id === 'pg-a-analiz' && typeof loadAnaliz === 'function') loadAnaliz();
        if(id === 'pg-a-gelisim' && typeof loadGelisim === 'function') loadGelisim();
        if(id === 'pg-a-profil' && typeof loadSporcuProfilePage === 'function') loadSporcuProfilePage();
      }catch(err){
        console.error('Antrenör sayfa yükleme hatası:', err);
      }

      return false;
    }, true);
  });
})();



document.addEventListener('DOMContentLoaded', function(){
  try{
    ['pg-a-video','pg-a-hesap'].forEach(function(id){
      var el = document.getElementById(id);
      if(el && el.parentElement && el.parentElement.id !== ''){
        // Eğer parent başka bir page ise kesin body altına al
        if(el.parentElement.classList && el.parentElement.classList.contains('page')){
          document.body.appendChild(el);
        }
      }
    });

    // antrenor.html açılmama hatası fix deneme #3
    if(location.pathname.toLowerCase().includes('antrenor.html')){
      var active = document.querySelector('.page.active');
      if(!active || getComputedStyle(active).display === 'none'){
        var first = document.getElementById('pg-a-hata') || document.querySelector('.page');
        if(first){
          document.querySelectorAll('.page').forEach(function(p){
            p.classList.remove('active');
            p.style.display = 'none';
          });
          first.classList.add('active');
          first.style.display = 'block';
        }
      }
    }
  }catch(e){
    console.error('Runtime nesting fix hata:', e);
  }
});



/* Eski openSporcuProfil admin ekranında çalışırsa yönlendirme yapmasın */
const eskiOpenSporcuProfil_AdminFix = typeof openSporcuProfil === 'function' ? openSporcuProfil : null;
function openSporcuProfil(sporcuId){
  if(document.getElementById('pg-ad-sporcu')?.classList.contains('active')){
    return adminSporcuDuzenle(sporcuId);
  }
  if(eskiOpenSporcuProfil_AdminFix){
    return eskiOpenSporcuProfil_AdminFix(sporcuId);
  }
  return false;
}


/* =========================================================
   ADMIN SPORCU DÜZENLEME 
   Cache boş olsa bile satırdan sporcu adı/kuşak okunur.
   Yeşil başarı bildirimi yerine hata olursa kırmızı uyarı gösterir.
========================================================= */

function adminToast(msg, isError=false){
  if(typeof t === 'function'){
    try{
      if(isError){
        const toast = document.getElementById('toast');
        if(toast){
          toast.textContent = '⚠ ' + msg;
          toast.classList.add('show');
          toast.style.background = '#dc3545';
          setTimeout(()=>toast.classList.remove('show'), 2200);
          return;
        }
      }
      t(msg);
      return;
    }catch(e){}
  }
  alert(msg);
}

function adminFindSporcuFromRow(btn){
  const tr = btn ? btn.closest('tr') : null;
  if(!tr) return null;

  const tds = tr.querySelectorAll('td');
  return {
    Ad_Soyad: tds[0]?.textContent?.trim() || '',
    Kulup_Adi: tds[1]?.textContent?.trim() || '',
    Kusak_Adi: tds[2]?.textContent?.trim() || '',
    Antrenor_Adi: tds[3]?.textContent?.trim() || 'Atanmamış'
  };
}

function adminSporcuDuzenle(sporcuId, btn=null){
  let sporcu = null;

  if(Array.isArray(window.adminSporcularCache)){
    sporcu = window.adminSporcularCache.find(s => String(s.Sporcu_ID) === String(sporcuId));
  }

  // Cache yoksa satırdan oku
  if(!sporcu){
    const rowData = adminFindSporcuFromRow(btn);
    if(rowData && rowData.Ad_Soyad){
      sporcu = {
        Sporcu_ID: sporcuId,
        Ad_Soyad: rowData.Ad_Soyad,
        Kulup_Adi: rowData.Kulup_Adi,
        Kusak_Adi: rowData.Kusak_Adi,
        Antrenor_Adi: rowData.Antrenor_Adi
      };
    }
  }

  if(!sporcu){
    adminToast('Sporcu bilgisi alınamadı. Sayfayı yenileyip tekrar deneyin.', true);
    return false;
  }

  const sporcuSelect = document.getElementById('admin-kusak-sporcu');
  const mevcutKusak = document.getElementById('admin-mevcut-kusak');
  const yeniKusak = document.getElementById('admin-yeni-kusak');
  const antrenorSelect = document.getElementById('admin-sporcu-antrenor');

  if(sporcuSelect){
    // ID option yoksa ad üzerinden eşleştir
    let foundById = [...sporcuSelect.options].some(opt => String(opt.value) === String(sporcu.Sporcu_ID));
    if(foundById){
      sporcuSelect.value = String(sporcu.Sporcu_ID);
    }else{
      [...sporcuSelect.options].forEach(opt => {
        if(opt.textContent.trim() === String(sporcu.Ad_Soyad || '').trim()){
          sporcuSelect.value = opt.value;
        }
      });
    }
  }

  const kusakText = String(sporcu.Kusak_Adi || '').trim();

  [mevcutKusak, yeniKusak].forEach(sel => {
    if(!sel) return;
    [...sel.options].forEach(opt => {
      const optText = opt.textContent.trim();
      if(optText === kusakText || optText.replace(' Kuşak','') === kusakText.replace(' Kuşak','')){
        sel.value = opt.value;
      }
    });
  });

  if(antrenorSelect){
    const antText = String(sporcu.Antrenor_Adi || '').trim();
    if(antText === 'Atanmamış' || antText === '—'){
      antrenorSelect.value = '';
    }else{
      [...antrenorSelect.options].forEach(opt => {
        if(opt.textContent.trim() === antText || opt.value === String(sporcu.Antrenor_ID || '')){
          antrenorSelect.value = opt.value;
        }
      });
    }
  }

  const updateBox = document.querySelector('#pg-ad-sporcu .card:nth-of-type(2)') || document.querySelector('#pg-ad-sporcu .card');
  if(updateBox){
    updateBox.scrollIntoView({behavior:'smooth', block:'center'});
  }

  adminToast((sporcu.Ad_Soyad || 'Sporcu') + ' seçildi. Sağdaki alandan kuşak/antrenör düzenleyebilirsin.');
  return false;
}

const eskiOpenSporcuProfil_AdminFix2 = typeof openSporcuProfil === 'function' ? openSporcuProfil : null;
function openSporcuProfil(sporcuId){
  if(document.getElementById('pg-ad-sporcu')?.classList.contains('active')){
    return adminSporcuDuzenle(sporcuId, event?.target || null);
  }
  if(eskiOpenSporcuProfil_AdminFix2){
    return eskiOpenSporcuProfil_AdminFix2(sporcuId);
  }
  return false;
}




/* =========================================================
   ADMIN SPORCU YÖNETİMİ - ANTRENÖR HÜCRESİ TAM KALDIRMA (devre dışı?)
========================================================= */

function adminRemoveTrainerCellsReal(){
  const page = document.getElementById('pg-ad-sporcu');
  if(!page) return;

  const antSelect = document.getElementById('admin-sporcu-antrenor');
  if(antSelect){
    const wrap = antSelect.closest('.f') || antSelect.closest('div');
    if(wrap) wrap.remove();
  }

  page.querySelectorAll('table').forEach(table => {
    const ths = Array.from(table.querySelectorAll('thead th'));

    // Header'da Antrenör varsa komple kaldır
    let antIndex = ths.findIndex(th => th.textContent.trim().toLocaleLowerCase('tr-TR') === 'antrenör');
    if(antIndex !== -1){
      ths[antIndex].remove();
      table.querySelectorAll('tbody tr').forEach(tr => {
        if(tr.children[antIndex]) tr.children[antIndex].remove();
      });
      return;
    }

    // Header artık SPORCU-KULÜP-KUŞAK-İŞLEM ise ama satırlarda 5 td kalmışsa 4. td antrenördür, sil
    const headerTexts = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim().toLocaleLowerCase('tr-TR'));
    const hasNoTrainerHeader = !headerTexts.includes('antrenör');
    const hasActionHeader = headerTexts.includes('işlem');

    if(hasNoTrainerHeader && hasActionHeader){
      table.querySelectorAll('tbody tr').forEach(tr => {
        const tds = Array.from(tr.children);
        if(tds.length === 5){
          const possibleTrainer = tds[3].textContent.trim();
          if(possibleTrainer === 'Atanmamış' || possibleTrainer.startsWith('antrenor_') || possibleTrainer === '—'){
            tds[3].remove();
          }
        }
      });
    }
  });
}

if(typeof loadAdminSporcuYonetimi === 'function' && !window.__adminRemoveTrainerCellsRealWrapped){
  window.__adminRemoveTrainerCellsRealWrapped = true;
  const __oldLoadAdminSporcuYonetimiReal = loadAdminSporcuYonetimi;
  loadAdminSporcuYonetimi = async function(){
    const result = await __oldLoadAdminSporcuYonetimiReal.apply(this, arguments);
    setTimeout(adminRemoveTrainerCellsReal, 20);
    setTimeout(adminRemoveTrainerCellsReal, 100);
    setTimeout(adminRemoveTrainerCellsReal, 400);
    return result;
  };
}

document.addEventListener('DOMContentLoaded', function(){
  setTimeout(adminRemoveTrainerCellsReal, 300);
  setTimeout(adminRemoveTrainerCellsReal, 1000);
});


/* 
   KUŞAK SEVİYELERİ SADE TABLO
   Min. Maç / Min. Galibiyet / Maks. Hata Ort. kolonları kaldırıldı...
 */

async function loadKusakAyarlar(){
  const data = await apiFetch('kusaklar.php');
  if(!data?.success) return;

  const page = document.getElementById('pg-ad-kusak');
  const tbody = page?.querySelector('tbody');
  const theadRow = page?.querySelector('thead tr');

  if(theadRow){
    theadRow.innerHTML = `
      <th>KUŞAK</th>
      <th>RENK</th>
      <th>DURUM</th>
    `;
  }

  if(!tbody) return;

  const used = new Set();
  const rows = (data.data || []).filter(k => {
    const c = canonicalBelt(k.Kusak_Adi);
    if(used.has(c)) return false;
    used.add(c);
    return true;
  });

  tbody.innerHTML = rows.map(k => `
    <tr>
      <td><span class="badge ${getBadgeClass(k.Kusak_Adi)}">${beltLabel(k.Kusak_Adi)}</span></td>
      <td>
        <div style="width:24px;height:24px;border-radius:50%;background:${beltColor(k.Kusak_Adi)};border:2px solid #cbd5e1;display:inline-block;"></div>
      </td>
      <td><span class="badge bss">Aktif</span></td>
    </tr>
  `).join('');
}

document.addEventListener('DOMContentLoaded', function(){
  const page = document.getElementById('pg-ad-kusak');
  if(page){
    const title = page.querySelector('.mh h3');
    const desc = page.querySelector('.mh p');
    if(title) title.textContent = 'Kuşak Seviyeleri';
    if(desc) desc.textContent = 'Sistemdeki kuşak seviyelerini ve renklerini görüntüleyin';
  }
});