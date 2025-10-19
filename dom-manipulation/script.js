// script.js — Server-sync simulation with conflict handling
// Required functions exposed: fetchQuotesFromServer(), postQuoteToServer(), syncQuotes(), populateCategories(), filterQuote()
// Uses JSONPlaceholder for mock server interactions.

const LS_KEY = 'dqg_quotes_v1';
const LS_LAST_CAT = 'lastCategory';
const SESSION_LAST = 'dqg_last_viewed';
const SESSION_BACKUP = 'dqg_backup_local';
const SERVER_GET_URL = 'https://jsonplaceholder.typicode.com/posts?_limit=6';
const SERVER_POST_URL = 'https://jsonplaceholder.typicode.com/posts';
let quotes = [];

/* DOM helpers */
const $ = id => document.getElementById(id);
const quoteDisplay = () => $('quoteDisplay');
const categoryFilter = () => $('categoryFilter');
const statusLine = () => $('statusLine');
const notif = () => $('notif');
const notifTitle = () => $('notif-title');
const notifBody = () => $('notif-body');
const notifAccept = () => $('notif-accept');
const notifRevert = () => $('notif-revert');
const quotesList = () => $('quotesList');

/* Default data */
const DEFAULT_QUOTES = [
  { text: "Make each day your masterpiece.", category: "Motivation" },
  { text: "Write code that humans can read.", category: "Programming" },
  { text: "Small steps every day lead to big results.", category: "Life" }
];

/* Storage helpers */
function saveLocal() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(quotes)); } catch(e){ console.error(e); }
}
function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) { quotes = DEFAULT_QUOTES.slice(); saveLocal(); return; }
    const parsed = JSON.parse(raw);
    quotes = Array.isArray(parsed) ? parsed : DEFAULT_QUOTES.slice();
  } catch(e) { quotes = DEFAULT_QUOTES.slice(); saveLocal(); }
}

/* ========== populateCategories() ========== */
function populateCategories() {
  const sel = categoryFilter();
  if (!sel) return;
  const prev = sel.value || 'all';
  const map = new Map();
  quotes.forEach(q => {
    const cat = String(q.category || '').trim();
    if (!cat) return;
    const key = cat.toLowerCase();
    if (!map.has(key)) map.set(key, cat);
  });
  sel.innerHTML = '';
  const allOpt = document.createElement('option'); allOpt.value='all'; allOpt.textContent='All'; sel.appendChild(allOpt);
  Array.from(map.values()).sort((a,b)=>a.localeCompare(b)).forEach(cat => {
    const o=document.createElement('option'); o.value=cat; o.textContent=cat; sel.appendChild(o);
  });
  const saved = localStorage.getItem(LS_LAST_CAT);
  if (saved && Array.from(sel.options).some(o=>o.value.toLowerCase()===saved.toLowerCase())) {
    for (const o of sel.options) { if (o.value.toLowerCase()===saved.toLowerCase()) { sel.value=o.value; break; } }
  } else if (prev && Array.from(sel.options).some(o=>o.value===prev)) {
    sel.value = prev;
  } else sel.value='all';
}

/* ========== filterQuote() ========== */
function filterQuote() {
  const sel = categoryFilter();
  if (!sel) return;
  const chosen = sel.value;
  try { localStorage.setItem(LS_LAST_CAT, chosen); } catch(e){}
  if (chosen === 'all') { showRandomQuote(); return; }
  const filtered = quotes.filter(q => String(q.category).toLowerCase() === String(chosen).toLowerCase());
  if (!filtered.length) { quoteDisplay().textContent = 'No quotes for this category.'; return; }
  const q = filtered[Math.floor(Math.random()*filtered.length)];
  displayQuote(q);
  try { sessionStorage.setItem(SESSION_LAST, JSON.stringify({ text: q.text, category: q.category, timestamp: Date.now() })); } catch(e){}
}

/* Display helpers */
function displayQuote(q) {
  if (!q) { quoteDisplay().textContent = ''; return; }
  quoteDisplay().innerHTML = `<blockquote style="margin:0 0 6px">"${escapeHtml(q.text)}"</blockquote><div style="color:#666;font-size:0.9rem">Category: ${escapeHtml(q.category)}</div>`;
}
function showRandomQuote() {
  if (!quotes.length) { quoteDisplay().textContent = 'No quotes.'; return; }
  const sel = categoryFilter();
  const chosen = sel ? sel.value : 'all';
  const pool = (chosen && chosen !== 'all') ? quotes.filter(q=>q.category.toLowerCase()===chosen.toLowerCase()) : quotes;
  if (!pool.length) { quoteDisplay().textContent = 'No quotes for this category.'; return; }
  const q = pool[Math.floor(Math.random()*pool.length)];
  displayQuote(q);
  try { sessionStorage.setItem(SESSION_LAST, JSON.stringify({ text: q.text, category: q.category, timestamp: Date.now() })); } catch(e){}
}

/* ========== postQuoteToServer() ========== */
async function postQuoteToServer(q) {
  try {
    const payload = { title: q.text, body: q.category };
    const res = await fetch(SERVER_POST_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('post failed');
    const data = await res.json();
    console.info('postQuoteToServer simulated response:', data);
    return data;
  } catch (e) {
    console.warn('postQuoteToServer error', e);
    return null;
  }
}

/* Add quote (also attempts to POST) */
async function addQuote() {
  const t = $('newQuoteText').value.trim();
  const c = $('newQuoteCategory').value.trim();
  if (!t || !c) return alert('Please enter both quote and category');
  const obj = { text: t, category: c };
  quotes.push(obj);
  saveLocal();
  populateCategories();
  renderQuotesPreview();
  $('newQuoteText').value = ''; $('newQuoteCategory').value = '';
  await postQuoteToServer(obj);
}

/* ========== fetchQuotesFromServer() ========== */
async function fetchQuotesFromServer() {
  try {
    const res = await fetch(SERVER_GET_URL, { cache:'no-store' });
    if (!res.ok) throw new Error('Network response not ok');
    const data = await res.json();
    const serverQuotes = (Array.isArray(data) ? data : []).map(item => ({
      text: item.title ? String(item.title).trim() : String(item.body || '').trim(),
      category: 'Server'
    }));
    return serverQuotes;
  } catch (e) {
    console.warn('fetchQuotesFromServer error', e);
    return null;
  }
}

/* ========== syncQuotes() ========== */
/* Server takes precedence. Save session backup for revert. Show notification. */
async function syncQuotes(manual=false) {
  const serverData = await fetchQuotesFromServer();
  if (!serverData) { setStatus('Server fetch failed'); return; }
  const serverKeys = serverData.map(q=>q.text+'||'+q.category).sort();
  const localKeys = quotes.map(q=>q.text+'||'+q.category).sort();
  const identical = serverKeys.length === localKeys.length && serverKeys.every((v,i)=>v===localKeys[i]);
  if (identical && !manual) { setStatus('No changes from server'); return; }
  // backup local
  try { sessionStorage.setItem(SESSION_BACKUP, JSON.stringify(quotes)); } catch(e){}
  // merge: start with server, append local-only
  const serverSet = new Set(serverData.map(q=>q.text+'||'+q.category));
  const merged = serverData.slice();
  quotes.forEach(lq => {
    const k = lq.text+'||'+lq.category;
    if (!serverSet.has(k)) merged.push(lq);
  });
  quotes = merged;
  saveLocal();
  populateCategories();
  renderQuotesPreview();
  const now = Date.now();
  setStatus('Synced at ' + new Date(now).toLocaleTimeString());
  showNotification('Server changes merged', 'Server data was merged into your local quotes. You can accept server changes or revert to your previous local backup.');
}

/* Notification helpers */
function showNotification(title, body) {
  const n = notif();
  if (!n) return;
  $('notif-title').textContent = title;
  $('notif-body').textContent = body;
  n.style.display = 'block';
}
function hideNotification() {
  const n = notif();
  if (!n) return;
  n.style.display = 'none';
}
function revertToLocalBackup() {
  try {
    const raw = sessionStorage.getItem(SESSION_BACKUP);
    if (!raw) { alert('No backup available'); return; }
    const localBackup = JSON.parse(raw);
    if (!Array.isArray(localBackup)) throw new Error('Invalid backup');
    quotes = localBackup;
    saveLocal();
    populateCategories();
    renderQuotesPreview();
    hideNotification();
    setStatus('Reverted to local backup');
  } catch (e) { alert('Revert failed: ' + (e && e.message)); }
}
function acceptServerChanges() { hideNotification(); setStatus('Server changes accepted'); }

/* Misc helpers */
function setStatus(msg){ const el = statusLine(); if(el) el.textContent = 'Status: ' + msg; }
function renderQuotesPreview(){ const c = quotesList(); if(!c) return; c.innerHTML=''; quotes.forEach((q,idx)=>{ const d=document.createElement('div'); d.style.padding='6px'; d.style.border='1px solid #f0f0f0'; d.style.borderRadius='6px'; d.innerHTML=`<strong>${escapeHtml(q.category)}</strong>: ${escapeHtml(q.text)} <button data-idx="${idx}" style="float:right">View</button>`; d.querySelector('button').addEventListener('click',(e)=>{ showQuote(quotes[Number(e.target.dataset.idx)]) }); c.appendChild(d); }); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function restoreSessionLast(){ try{ const raw=sessionStorage.getItem(SESSION_LAST); if(raw){ const info=JSON.parse(raw); if(info && info.text) showQuote(info); } }catch(e){} }

/* Init and event wiring */
function init() {
  loadLocal();
  populateCategories();
  renderQuotesPreview();
  restoreSessionLast();
  $('newQuoteBtn').addEventListener('click', showRandomQuote);
  $('addQuoteBtn').addEventListener('click', () => addQuote());
  $('exportBtn').addEventListener('click', exportToJsonFile);
  $('importBtn').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', (e)=>{ const f = e.target.files && e.target.files[0]; if(f) importFromJsonFile(f); });
  $('syncNowBtn').addEventListener('click', ()=> syncQuotes(true));
  $('notif-accept').addEventListener('click', acceptServerChanges);
  $('notif-revert').addEventListener('click', revertToLocalBackup);
  // periodic sync (every 30s)
  syncQuotes(false);
  setInterval(()=>syncQuotes(false), 30000);
}

/* Export/Import helpers */
function exportToJsonFile(){ try{ const data=JSON.stringify(quotes,null,2); const blob=new Blob([data],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='quotes_export.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }catch(e){alert('Export failed')} }
function importFromJsonFile(file){ if(!file) return; const r=new FileReader(); r.onload = function(evt){ try{ const parsed=JSON.parse(evt.target.result); if(!Array.isArray(parsed)) throw new Error('JSON must be array'); const valid = parsed.filter(it=>it && typeof it.text==='string' && typeof it.category==='string'); let added=0; const seen=new Set(quotes.map(q=>q.text+'||'+q.category)); valid.forEach(it=>{ const k=it.text+'||'+it.category; if(!seen.has(k)){ quotes.push(it); seen.add(k); added++; } }); if(added){ saveLocal(); populateCategories(); renderQuotesPreview(); setStatus('Imported '+added+' quotes'); } else setStatus('No new quotes imported'); }catch(e){ alert('Import failed: '+e.message); } }; r.readAsText(file); }

/* Start app */
window.addEventListener('DOMContentLoaded', init);
