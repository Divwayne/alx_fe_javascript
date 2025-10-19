// === Dynamic Quote Generator: Server Sync Simulation ===

// Fetch quotes from a mock API
function fetchQuotesFromServer() {
  return fetch("https://jsonplaceholder.typicode.com/posts?_limit=5")
    .then(response => response.json())
    .then(data => data.map(item => ({
      text: item.title,
      category: "Server"
    })))
    .catch(err => {
      console.error("Error fetching server data:", err);
      return [];
    });
}

// Post a quote to the server (simulation)
function postQuoteToServer(quote) {
  return fetch("https://jsonplaceholder.typicode.com/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(quote)
  })
    .then(res => res.json())
    .then(data => console.log("Posted to server:", data))
    .catch(err => console.error("Post failed:", err));
}

// Merge logic and local storage update
function syncQuotes() {
  fetchQuotesFromServer().then(serverQuotes => {
    const localQuotes = JSON.parse(localStorage.getItem("quotes") || "[]");
    const merged = mergeQuotes(serverQuotes, localQuotes);
    localStorage.setItem("quotes", JSON.stringify(merged));
    showNotification("Quotes synced successfully with server (server data takes precedence).");
  });
}

// Merge logic — server-precedence conflict resolution
function mergeQuotes(server, local) {
  const seen = new Set();
  const result = [];
  server.forEach(q => {
    const key = q.text + "|" + q.category;
    seen.add(key);
    result.push(q);
  });
  local.forEach(q => {
    const key = q.text + "|" + q.category;
    if (!seen.has(key)) result.push(q);
  });
  return result;
}

// UI Notification
function showNotification(msg) {
  const el = document.getElementById("notification");
  el.textContent = msg;
  el.style.display = "block";
  setTimeout(() => el.style.display = "none", 4000);
}

// Periodic sync
setInterval(syncQuotes, 30000);

// Manual sync button
document.getElementById("syncBtn").addEventListener("click", syncQuotes);

// On page load
document.addEventListener("DOMContentLoaded", () => {
  if (!localStorage.getItem("quotes")) {
    localStorage.setItem("quotes", JSON.stringify([{ text: "Start strong!", category: "Motivation" }]));
  }
  syncQuotes();
});
