let quotes = JSON.parse(localStorage.getItem("quotes")) || [
  { id: 1, text: "Stay positive.", category: "Motivation", updatedAt: Date.now() },
  { id: 2, text: "Learn from failure.", category: "Inspiration", updatedAt: Date.now() }
];

// Simulated server data
let serverQuotes = [
  { id: 1, text: "Stay positive.", category: "Motivation", updatedAt: Date.now() },
  { id: 2, text: "Learn from failure.", category: "Inspiration", updatedAt: Date.now() }
];

// Show notifications
function showNotification(message, duration = 3000) {
  const note = document.getElementById("notification");
  note.textContent = message;
  note.style.display = "block";
  setTimeout(() => note.style.display = "none", duration);
}

// Simulate fetching from server
function fetchQuotesFromServer() {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve([...serverQuotes]);
    }, 500);
  });
}

// Simulate posting to server
function postQuoteToServer(quote) {
  return new Promise(resolve => {
    setTimeout(() => {
      const index = serverQuotes.findIndex(q => q.id === quote.id);
      if (index >= 0) {
        serverQuotes[index] = quote;
      } else {
        serverQuotes.push(quote);
      }
      resolve({ success: true });
    }, 500);
  });
}

// Sync logic
async function syncQuotes() {
  const serverData = await fetchQuotesFromServer();
  let localChanged = false;
  let conflictResolved = false;

  serverData.forEach(serverQuote => {
    const localQuote = quotes.find(q => q.id === serverQuote.id);
    if (!localQuote) {
      quotes.push(serverQuote);
      localChanged = true;
    } else if (serverQuote.updatedAt > localQuote.updatedAt) {
      const idx = quotes.findIndex(q => q.id === serverQuote.id);
      quotes[idx] = serverQuote;
      conflictResolved = true;
      localChanged = true;
    }
  });

  // Push any local quotes not on server
  for (const localQuote of quotes) {
    if (!serverData.find(sq => sq.id === localQuote.id)) {
      await postQuoteToServer(localQuote);
    }
  }

  if (localChanged) {
    localStorage.setItem("quotes", JSON.stringify(quotes));
    populateCategories();
    filterQuotes();
    showNotification(conflictResolved ? "Conflicts resolved (server data applied)." : "Quotes synced with server.");
  }
}

// Populate dropdown
function populateCategories() {
  const select = document.getElementById("categoryFilter");
  const categories = [...new Set(quotes.map(q => q.category))];
  select.innerHTML = '<option value="all">All Categories</option>';
  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });

  const saved = localStorage.getItem("selectedCategory");
  if (saved) {
    select.value = saved;
    filterQuotes();
  } else {
    showQuotes(quotes);
  }
}

// Show quotes
function showQuotes(list) {
  const display = document.getElementById("quoteDisplay");
  display.innerHTML = "";
  list.forEach(q => {
    const p = document.createElement("p");
    p.textContent = `${q.text} — (${q.category})`;
    display.appendChild(p);
  });
}

// Filter quotes
function filterQuotes() {
  const selected = document.getElementById("categoryFilter").value;
  localStorage.setItem("selectedCategory", selected);
  const filtered = selected === "all" ? quotes : quotes.filter(q => q.category === selected);
  showQuotes(filtered);
}

// Add quote
async function addQuote() {
  const text = document.getElementById("newQuoteText").value.trim();
  const category = document.getElementById("newQuoteCategory").value.trim();
  if (!text || !category) {
    alert("Please fill both fields");
    return;
  }

  const newQuote = { id: Date.now(), text, category, updatedAt: Date.now() };
  quotes.push(newQuote);
  localStorage.setItem("quotes", JSON.stringify(quotes));
  await postQuoteToServer(newQuote);
  populateCategories();
  filterQuotes();
  showNotification("New quote added and synced with server!");
  document.getElementById("newQuoteText").value = "";
  document.getElementById("newQuoteCategory").value = "";
}

document.addEventListener("DOMContentLoaded", () => {
  populateCategories();
  syncQuotes();
  setInterval(syncQuotes, 10000); // sync every 10 seconds
});
