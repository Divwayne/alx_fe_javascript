// script.js — Sync simulation with server + conflict handling
// Repo: dom-manipulation
// Server: using JSONPlaceholder as a mock endpoint for demonstration

const LS_KEY = 'dqg_quotes_v1';
const LS_LAST_CAT = 'dqg_last_category';
const SESSION_LAST = 'dqg_last_viewed';
const SESSION_BACKUP = 'dqg_backup_local'; // session key for local backup during conflict
const SERVER_URL = 'https://jsonplaceholder.typicode.com/posts?_limit=5'; // mock endpoint
const SERVER_POST_URL = 'https://jsonplaceholder.typicode.com/posts'; // mock POST

let quotes = [];
let lastSyncTimestamp = null;

/* ---------- DOM refs ---------- */
const get = id => document.getElementById(id);
const quoteDisplay = () => get('quoteDisplay');
const categoryFilter = () => get('categoryFilter');
const statusLine = () => get('statusLine');
const notif = () => get('notif');
const notifTitle = () => get('notif-title');
const notifBody = () => get('notif-body');
const notifAccept = () => get('notif-accept');
const notifRevert = () => get('notif-revert');
const quotesList = () => get('quotesList');

/* ---------- Defaults ---------- */
const DEFAULT_QUOTES = [
  { text: "Make each day your masterpiece.", category: "Motivation" },
  { text: "Simplicity is the soul of efficiency.", category: "Design" },
  { text: "Write code that humans can read.", category: "Programming" }
];

/* ---------- Storage helpers ---------- */
function saveLocal() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(quotes));
  } catch (e) {
    console.error('saveLocal error', e);
  }
}
function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      quotes = DEFAULT_QUOTES.slice();
      saveLocal();
      return;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      quotes = parsed;
    } else {
      quotes = DEFAULT_QUOTES.slice();
      saveLocal();
    }
  } catch (e) {
    console.warn('loadLocal error', e);
    quotes = DEFAULT_QUOTES.slice();
    saveLocal();
  }
}

/* ---------- UI helpers ---------- */
function renderQuotesPreview() {
  const container = quotesList();
  container.innerHTML = '';
  quotes.forEach((q, idx) => {
    const el = document.createElement('div');
    el.style.padding = '6px';
    el.style.border = '1px solid #f0f0f0';
    el.style.borderRadius = '6px';
    el.innerHTML = `<strong>${escapeHtml(q.category)}</strong>: ${escapeHtml(q.text)} <button data-idx="${idx}" style="float:right">View</button>`;
    el.querySelector('button').addEventListener('click', (e) => {
      showQuote(quotes[Number(e.target.dataset.idx)]);
    });
    container.appendChild(el);
  });
}

function showQuote(q) {
  if (!q) return;
  quoteDisplay().innerHTML = `<blockquote style="margin:0 0 6px">"${escapeHtml(q.text)}"</blockquote><div style="color:#666;font-size:0.9rem">Category: ${escapeHtml(q.category)}</div>`;
  try {
    sessionStorage.setItem(SESSION_LAST, JSON.stringify({ text: q.text, category: q.category, timestamp: Date.now() }));
  } catch (e) {}
}

/* ---------- category helpers (required) ---------- */
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
  const oAll = document.createElement('option'); oAll.value = 'all'; oAll.textContent = 'All'; sel.appendChild(oAll);
  Array.from(map.values()).sort((a,b) => a.localeCompare(b)).forEach(cat => {
    const o = document.createElement('option'); o.value = cat; o.textContent = cat; sel.appendChild(o);
  });
  // restore saved category if available
  const saved = localStorage.getItem(LS_LAST_CAT);
  if (saved && Array.from(sel.options).some(opt => opt.value.toLowerCase() === saved.toLowerCase())) {
    for (const opt of sel.options) {
      if (opt.value.toLowerCase() === saved.toLowerCase()) { sel.value = opt.value; break; }
    }
  } else if (prev && Array.from(sel.options).some(opt => opt.value === prev)) {
    sel.value = prev;
  } else {
    sel.value = 'all';
  }
}

/* ---------- filter function (required) ---------- */
function filterQuote() {
  const sel = categoryFilter();
  if (!sel) return;
  const chosen = sel.value;
  try {
    localStorage.setItem(LS_LAST_CAT, chosen);
  } catch (e) { console.warn('Could not save lastCategory', e); }
  if (chosen === 'all') {
    showRandomQuote();
    return;
  }
  const filtered = quotes.filter(q => String(q.category).toLowerCase() === String(chosen).toLowerCase());
  if (filtered.length === 0) {
    quoteDisplay().textContent = 'No quotes for this category.';
    return;
  }
  const q = filtered[Math.floor(Math.random() * filtered.length)];
  showQuote(q);
}

/* ---------- add quote (posts to mock server for simulation) ---------- */
async function addQuote() {
  const textEl = get('newQuoteText');
  const catEl = get('newQuoteCategory');
  if (!textEl || !catEl) return;
  const text = textEl.value.trim();
  const category = catEl.value.trim();
  if (!text || !category) return alert('Enter quote and category');
  const newQ = { text, category };
  quotes.push(newQ);
  saveLocal();
  populateCategories();
  renderQuotesPreview();
  textEl.value = ''; catEl.value = '';
  // attempt to POST to mock server (JSONPlaceholder will respond with created object)
  try {
    const res = await fetch(SERVER_POST_URL, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ title: text, body: category }) });
    if (res.ok) {
      // simulation: treat response as acknowledgment
      console.info('Posted to server (simulated)', await res.json());
    }
  } catch (e) {
    console.warn('Server POST failed (simulated)', e);
  }
}

/* ---------- export/import ---------- */
function exportToJsonFile() {
  try {
    const data = JSON.stringify(quotes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'quotes_export.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  } catch (e) { alert('Export failed'); }
}
function importFromJsonFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const parsed = JSON.parse(evt.target.result);
      if (!Array.isArray(parsed)) throw new Error('JSON must be array');
      const validated = parsed.filter(it => it && typeof it.text === 'string' && typeof it.category === 'string');
      let added=0; const seen=new Set(quotes.map(q=>q.text+'||'+q.category));
      validated.forEach(it=>{ const k=it.text+'||'+it.category; if(!seen.has(k)){ quotes.push(it); seen.add(k); added++; }});
      if (added) { saveLocal(); populateCategories(); renderQuotesPreview(); showStatus('Imported ' + added + ' quote(s)'); }
      else showStatus('No new quotes imported');
    } catch (err) { alert('Import failed: ' + err.message); }
  };
  reader.readAsText(file);
}

/* ---------- server sync logic ---------- */
async function fetchQuotesFromServer() {
  showStatus('Fetching server updates...');
  try {
    const res = await fetch(SERVER_URL, {cache:'no-store'});
    if (!res.ok) throw new Error('Network response not ok');
    const data = await res.json();
    // Map server posts to quote objects for simulation
    const serverQuotes = (Array.isArray(data) ? data : []).map(item => ({
      text: item.title ? String(item.title).trim() : String(item.body || '').trim(),
      category: 'Server' // label as Server for simulation
    }));
    return serverQuotes;
  } catch (e) {
    console.warn('fetchQuotesFromServer error', e);
    showStatus('Server fetch failed');
    return null;
  }
}

function arraysEqualByKey(a,b){
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  // compare sorted serializations
  const sa = a.map(x=>JSON.stringify(x)).sort();
  const sb = b.map(x=>JSON.stringify(x)).sort();
  return sa.join('|') === sb.join('|');
}

/* Merge strategy: server takes precedence. Keep unique local quotes not present on server.
   Save a session backup of former local data for manual revert.
*/
async function syncQuotes(manual=false) {
  const serverQuotes = await fetchQuotesFromServer();
  if (!serverQuotes) return;
  // check if different enough
  const serverKey = serverQuotes.map(q=>q.text+'||'+q.category).sort();
  const localKey = quotes.map(q=>q.text+'||'+q.category).sort();
  const identical = serverKey.length === localKey.length && serverKey.every((v,i)=>v===localKey[i]);
  if (identical && !manual) { showStatus('No server updates'); return; }

  // Prepare backup of current local
  try { sessionStorage.setItem(SESSION_BACKUP, JSON.stringify(quotes)); } catch(e){}

  // Server precedence: start with server quotes, then add local-only quotes (by key)
  const serverSet = new Set(serverQuotes.map(q=>q.text+'||'+q.category));
  const merged = serverQuotes.slice();
  quotes.forEach(lq => {
    const k = lq.text+'||'+lq.category;
    if (!serverSet.has(k)) merged.push(lq);
  });

  // apply merged to local
  quotes = merged;
  saveLocal();
  populateCategories();
  renderQuotesPreview();
  lastSyncTimestamp = Date.now();

  // Show notification and actions
  notifTitle().textContent = 'Data synchronized with server';
  notifBody().textContent = 'Server data was merged into your local quotes. You can keep server changes or revert to your previous local data.';
  showNotification();
  showStatus('Synced at ' + new Date(lastSyncTimestamp).toLocaleTimeString());
}

/* User chooses to revert to previous local backup */
function revertToLocalBackup() {
  try {
    const raw = sessionStorage.getItem(SESSION_BACKUP);
    if (!raw) { alert('No local backup available'); return; }
    const localBackup = JSON.parse(raw);
    if (!Array.isArray(localBackup)) throw new Error('Invalid backup');
    quotes = localBackup;
    saveLocal();
    populateCategories();
    renderQuotesPreview();
    hideNotification();
    showStatus('Reverted to local backup');
  } catch (e) {
    alert('Revert failed: ' + (e && e.message ? e.message : 'unknown'));
  }
}

/* Accept server changes (already applied) */
function acceptServerChanges() { hideNotification(); showStatus('Server changes accepted'); }

/* ---------- helpers ---------- */
function showNotification() {
  const n = notif();
  if (!n) return;
  n.style.display = 'block';
}
function hideNotification() {
  const n = notif();
  if (!n) return;
  n.style.display = 'none';
}
function showStatus(msg) { const s=statusLine(); if(s) s.textContent = 'Status: ' + msg; }

/* ---------- init & periodic sync ---------- */
async function init() {
  loadLocal();
  populateCategories();
  renderQuotesPreview();
  // restore session last viewed quote if present
  try {
    const raw = sessionStorage.getItem(SESSION_LAST);
    if (raw) {
      const info = JSON.parse(raw);
      if (info && info.text) showQuote(info);
    }
  } catch(e){}

  // attach events
  get('newQuoteBtn').addEventListener('click', () => { showRandomQuote(); });
  get('addQuoteBtn').addEventListener('click', () => { addQuote(); });
  get('exportBtn').addEventListener('click', exportToJsonFile);
  get('importBtn').addEventListener('click', () => { get('importFile').click(); });
  get('importFile').addEventListener('change', (e)=>{ const f=e.target.files && e.target.files[0]; if(f) importFromJsonFile(f); });
  get('syncNowBtn').addEventListener('click', ()=> syncQuotes(true));
  notifAccept().addEventListener('click', acceptServerChanges);
  notifRevert().addEventListener('click', revertToLocalBackup);

  // Periodic sync every 30 seconds
  await syncQuotes(false);
  setInterval(()=>syncQuotes(false), 30000);
}

/* ---------- utility display and random ---------- */
function showRandomQuote() {
  if (!quotes.length) { quoteDisplay().textContent = 'No quotes.'; return; }
  const sel = categoryFilter();
  const chosen = sel ? sel.value : 'all';
  const pool = (chosen && chosen !== 'all') ? quotes.filter(q=>q.category.toLowerCase() === chosen.toLowerCase()) : quotes;
  if (!pool.length) { quoteDisplay().textContent = 'No quotes for this category.'; return; }
  const q = pool[Math.floor(Math.random()*pool.length)];
  showQuote(q);
}

function exportToJsonFile() {
  try {
    const data = JSON.stringify(quotes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'quotes_export.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  } catch (e) { alert('Export failed'); }
}

/* ---------- small escape util ---------- */
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

/* ---------- Start ---------- */
window.addEventListener('DOMContentLoaded', init);
