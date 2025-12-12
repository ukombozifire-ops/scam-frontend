const API_BASE = window.API_BASE || '';

window.imgData = null;
window.stats = JSON.parse(localStorage.getItem('scam_stats') || '{"total":0,"scam":0,"safe":0}');
updateStats();
fetchAds();

document.getElementById('imageUpload').addEventListener('change', handleImg);

function escapeHtml(text){ const d=document.createElement('div'); d.textContent=text; return d.innerHTML; }

function updateStats(){
  document.getElementById('total').textContent = window.stats.total;
  document.getElementById('scams').textContent = window.stats.scam;
  document.getElementById('safe').textContent = window.stats.safe;
}

async function fetchAds(){
  try {
    const r = await fetch(`${API_BASE}/ads`);
    if (!r.ok) return;
    const j = await r.json();
    document.getElementById('adsContent').innerHTML = j.adsHtml || '';
  } catch (e) { console.warn('Failed to fetch ads', e); }
}

function handleImg(e){
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { alert('Picha ni kubwa sana (limit 2MB)'); e.target.value=''; return; }
  const reader = new FileReader();
  reader.onload = (ev) => {
    window.imgData = ev.target.result;
    document.getElementById('previewImg').src = window.imgData;
    document.getElementById('imagePreview').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function clearImg(){ window.imgData = null; document.getElementById('imageUpload').value=''; document.getElementById('imagePreview').style.display='none'; }
function resetAll(){ document.getElementById('message').value=''; clearImg(); document.getElementById('result').style.display='none'; }

function showResult(type, text){
  const el = document.getElementById('result');
  el.className = 'result ' + type;
  el.innerHTML = '<h3>' + (type==='scam' ? '⚠️ UJUMBE WA SCAM' : (type==='suspicious' ? '🔍 UJUMBE UNASHUKU' : '✅ UJUMBE SALAMA')) + '</h3><div style="white-space:pre-wrap;">' + escapeHtml(text) + '</div>';
  el.style.display = 'block';
}
function showError(msg){
  const el = document.getElementById('result');
  el.className = 'result error';
  el.innerHTML = '<h3>❌ Hitilafu</h3><div>' + escapeHtml(msg) + '</div>';
  el.style.display = 'block';
}

async function analyze(){
  const msg = document.getElementById('message').value.trim();
  const lang = document.getElementById('language').value;
  if (!msg && !window.imgData) { showError('Tafadhali ingiza ujumbe au pakia picha'); return; }

  document.getElementById('loading').style.display = 'block';
  document.getElementById('analyzeBtn').disabled = true;
  try {
    const payload = { message: msg, language: lang, image: window.imgData || null };
    const r = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Unknown error');
    showResult(j.type, j.analysis);
    window.stats.total++;
    if (j.type === 'scam' || j.type === 'suspicious') window.stats.scam++; else window.stats.safe++;
    localStorage.setItem('scam_stats', JSON.stringify(window.stats));
    updateStats();
  } catch (e) {
    showError('❌ ' + e.message);
  } finally {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('analyzeBtn').disabled = false;
  }
}

async function loginAdmin(){
  const pass = document.getElementById('adminPassword').value;
  if (!pass) { alert('Ingiza password'); return; }
  try {
    const r = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pass })
    });
    const j = await r.json();
    if (!r.ok) { alert('Password si sahihi'); return; }
    localStorage.setItem('admin_token', j.token);
    document.getElementById('passwordModal').classList.remove('show');
    document.getElementById('adminPanel').style.display = 'block';
    const ads = await fetch(`${API_BASE}/ads`);
    const adjson = await ads.json();
    document.getElementById('adsHtml').value = adjson.adsHtml || '';
  } catch (e) { alert('Hitilafu ya mtandao'); }
}

async function saveAds(){
  const token = localStorage.getItem('admin_token');
  if (!token) { alert('Haujafungua session ya admin'); return; }
  const adsHtml = document.getElementById('adsHtml').value;
  try {
    const r = await fetch(`${API_BASE}/admin/ads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ adsHtml })
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Error');
    alert('Matangazo yamehifadhiwa');
    fetchAds();
  } catch (e) { alert('Hitilafu: ' + e.message); }
}

function logoutAdmin(){ localStorage.removeItem('admin_token'); document.getElementById('adminPanel').style.display='none'; }
