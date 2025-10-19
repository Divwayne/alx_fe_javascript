// Dynamic Quote Generator — localStorage, sessionStorage, JSON import/export
// Author: Divwayne

// Keys
const LS_KEY = 'dqg_quotes_v1';
const SESSION_LAST = 'dqg_last_viewed';

// Default initial quotes (used only if no saved quotes exist)
const DEFAULT_QUOTES = [
  { text: "The best way to get started is to quit talking and begin doing.", category: "motivation" },
  { text: "Don’t let yesterday take up too much of today.", category: "inspiration" },
  { text: "Success is not final; failure is not fatal.", category: "success" },
  { text: "Creativity is intelligence having fun.", category: "creativity" }
];

// DOM elements
const quoteDisplay = document.getElementById('quoteDisplay');
const newQuoteBtn = document.getElementById('newQuote');
const addQuoteBtn = document.getElementById('addQuote');
const categorySelect = document.getElementById('categorySelect');
const newQuoteText = document.getElementById('newQuoteText');
const newQuoteCategory = document.getElementById('newQuoteCategory');
const exportBtn = document.getElementById('exportJson');
const importFile = document.getElementById('importFile');
const clearBtn = document.getElementById('clearStorage');
const quotesList = document.getElementById('quotesList');
const lastViewedNote = document.getElementById('lastViewedNote');

let quotes = [];

/* ---------- Storage helpers ---------- */
function saveQuotesToLocal() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(quotes));
  } catch (err) {
    console.error('Failed to save to localStorage', err);
    alert('Error saving to localStorage.');
  }
}

function loadQuotesFromLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Invalid quotes format in storage');
    quotes = parsed;
    return true;
  } catch (err) {
    console.warn('Could not load quotes from localStorage:', err);
    return false;
  }
}

/* ---------- Initialization ---------- */
function init() {
  const loaded = loadQuotesFromLocal();
  if (!loaded) {
    quotes = DEFAULT_QUOTES.slice();
    saveQuotesToLocal();
  }
  populateCategories();
  renderQuotesPreview();
  restoreLastViewed();
}

/* ---------- UI helpers ---------- */
function populateCategories() {
  const cats = Array.from(new Set(quotes.map(q => q.category.toLowerCase()))).sort();
  categorySelect.innerHTML = '';
  const allOpt = document.createElement('option');
  allOpt.value = 'all';
  allOpt.textContent = 'All';
  categorySelect.appendChild(allOpt);
  cats.forEach(c => {
    const o = document.createElement('option');
    o.value = c;
    // display capitalized
    o.textContent = c.charAt(0).toUpperCase() + c.slice(1);
    categorySelect.appendChild(o);
  });
}

function renderQuotesPreview() {
  quotesList.innerHTML = '';
  quotes.forEach((q, idx) => {
    const el = document.createElement('div');
    el.style.padding = '8px';
    el.style.border = '1px solid #eee';
    el.style.borderRadius = '6px';
    el.innerHTML = `<strong>${q.category}</strong>: ${escapeHtml(q.text)} <button data-idx="${idx}" style="margin-left:8px;">View</button>`;
    const btn = el.querySelector('button');
    btn.addEventListener('click', () => {
      showQuote(q);
      sessionStorage.setItem(SESSION_LAST, JSON.stringify({ index: idx, timestamp: Date.now() }));
    });
    quotesList.appendChild(el);
  });
}

/* ---------- Core features ---------- */
function showRandomQuote() {
  const sel = categorySelect.value;
  const filtered = sel === 'all'
    ? quotes
    : quotes.filter(q => q.category.toLowerCase() === sel);
  if (filtered.length === 0) {
    quoteDisplay.textContent = 'No quotes in that category yet.';
    lastViewedNote.textContent = '';
    return;
  }
  const idx = Math.floor(Math.random() * filtered.length);
  showQuote(filtered[idx]);
  // store last viewed in session
  try {
    sessionStorage.setItem(SESSION_LAST, JSON.stringify({ text: filtered[idx].text, category: filtered[idx].category, timestamp: Date.now() }));
  } catch (err) {
    console.warn('Could not write to sessionStorage', err);
  }
}

function showQuote(q) {
  quoteDisplay.innerHTML = `<blockquote style="margin:0 0 6px;font-size:1.05rem">"${escapeHtml(q.text)}"</blockquote><div style="color:#666;font-size:0.9rem">Category: ${escapeHtml(q.category)}</div>`;
  lastViewedNote.textContent = `Last viewed: ${new Date().toLocaleString()}`;
}

function addQuote() {
  const text = newQuoteText.value.trim();
  const category = newQuoteCategory.value.trim();
  if (!text || !category) {
    alert('Please enter both quote text and category.');
    return;
  }
  const obj = { text, category };
  quotes.push(obj);
  saveQuotesToLocal();
  populateCategories();
  renderQuotesPreview();
  newQuoteText.value = '';
  newQuoteCategory.value = '';
  alert('Quote added and saved to localStorage!');
}

/* ---------- JSON export/import ---------- */
function exportToJson() {
  try {
    const data = JSON.stringify(quotes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quotes_export.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Export failed', err);
    alert('Export failed. See console for details.');
  }
}

function importFromJsonFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const parsed = JSON.parse(evt.target.result);
      if (!Array.isArray(parsed)) throw new Error('JSON must be an array of quotes');
      // validate entries
      const valid = parsed.filter(item => item && typeof item.text === 'string' && typeof item.category === 'string');
      if (valid.length === 0) {
        alert('No valid quotes found in file.');
        return;
      }
      // Merge: avoid duplicates (simple check by exact text+category)
      const existingSet = new Set(quotes.map(q => q.text + '||' + q.category));
      let added = 0;
      valid.forEach(q => {
        const key = q.text + '||' + q.category;
        if (!existingSet.has(key)) {
          quotes.push({ text: q.text, category: q.category });
          existingSet.add(key);
          added++;
        }
      });
      saveQuotesToLocal();
      populateCategories();
      renderQuotesPreview();
      alert(`Imported ${added} new quote(s).`);
    } catch (err) {
      console.error('Import error', err);
      alert('Failed to import JSON: ' + err.message);
    }
  };
  reader.readAsText(file);
}

/* ---------- Utilities ---------- */
function escapeHtml(unsafe) {
  return unsafe.replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function restoreLastViewed() {
  try {
    const raw = sessionStorage.getItem(SESSION_LAST);
    if (!raw) return;
    const info = JSON.parse(raw);
    if (info && info.text) {
      quoteDisplay.innerHTML = `<blockquote style="margin:0 0 6px;font-size:1.05rem">"${escapeHtml(info.text)}"</blockquote><div style="color:#666;font-size:0.9rem">Category: ${escapeHtml(info.category)}</div>`;
      lastViewedNote.textContent = `Last viewed (session): ${new Date(info.timestamp).toLocaleString()}`;
    }
  } catch (err) {
    console.warn('Could not restore last viewed from sessionStorage', err);
  }
}

/* ---------- Clear storage ---------- */
function clearAllStorage() {
  if (!confirm('This will clear all stored quotes in localStorage. Continue?')) return;
  try {
    localStorage.removeItem(LS_KEY);
    quotes = DEFAULT_QUOTES.slice();
    saveQuotesToLocal();
    populateCategories();
    renderQuotesPreview();
    quoteDisplay.textContent = 'Storage cleared; restored default quotes.';
    lastViewedNote.textContent = '';
  } catch (err) {
    console.error('Clear storage failed', err);
  }
}

/* ---------- Event wiring ---------- */
newQuoteBtn.addEventListener('click', showRandomQuote);
addQuoteBtn.addEventListener('click', addQuote);
exportBtn.addEventListener('click', exportToJson);
importFile.addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (f) importFromJsonFile(f);
});
clearBtn.addEventListener('click', clearAllStorage);
categorySelect.addEventListener('change', () => {
  // when changing category, show a random quote from that category immediately
  showRandomQuote();
});

/* ---------- Initialize app ---------- */
init();
