let quotes = [];

// Load quotes and last filter from local storage
function loadQuotes() {
  const savedQuotes = localStorage.getItem("quotes");
  const lastFilter = localStorage.getItem("lastCategory");
  if (savedQuotes) {
    quotes = JSON.parse(savedQuotes);
  } else {
    quotes = [
      { text: "The best way to predict the future is to create it.", category: "Motivation" },
      { text: "Code is like humor. When you have to explain it, it’s bad.", category: "Programming" },
      { text: "Do what you can, with what you have, where you are.", category: "Life" }
    ];
  }
  populateCategories();
  if (lastFilter) document.getElementById("categoryFilter").value = lastFilter;
  filterQuotes();
}

// Save quotes to localStorage
function saveQuotes() {
  localStorage.setItem("quotes", JSON.stringify(quotes));
}

// Show random quote
function showRandomQuote() {
  const category = document.getElementById("categoryFilter").value;
  const filtered = category === "all" ? quotes : quotes.filter(q => q.category === category);
  if (filtered.length === 0) {
    document.getElementById("quoteDisplay").textContent = "No quotes available for this category.";
    return;
  }
  const randomQuote = filtered[Math.floor(Math.random() * filtered.length)];
  document.getElementById("quoteDisplay").textContent = `"${randomQuote.text}" — ${randomQuote.category}`;
  sessionStorage.setItem("lastQuote", JSON.stringify(randomQuote));
}

// Add new quote
function addQuote() {
  const text = document.getElementById("newQuoteText").value.trim();
  const category = document.getElementById("newQuoteCategory").value.trim();

  if (!text || !category) {
    alert("Please fill in both quote and category.");
    return;
  }

  quotes.push({ text, category });
  saveQuotes();
  populateCategories();
  document.getElementById("newQuoteText").value = "";
  document.getElementById("newQuoteCategory").value = "";
  alert("Quote added successfully!");
}

// Populate category dropdown dynamically
function populateCategories() {
  const select = document.getElementById("categoryFilter");
  const currentValue = select.value;
  select.innerHTML = '<option value="all">All Categories</option>';
  const categories = [...new Set(quotes.map(q => q.category))];
  categories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    select.appendChild(option);
  });
  if (currentValue) select.value = currentValue;
}

// Filter quotes by selected category
function filterQuotes() {
  const selected = document.getElementById("categoryFilter").value;
  localStorage.setItem("lastCategory", selected);
  showRandomQuote();
}

// Export quotes to JSON
function exportToJsonFile() {
  const dataStr = JSON.stringify(quotes, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "quotes.json";
  a.click();
  URL.revokeObjectURL(url);
}

// Import quotes from JSON
function importFromJsonFile(event) {
  const fileReader = new FileReader();
  fileReader.onload = function(event) {
    try {
      const importedQuotes = JSON.parse(event.target.result);
      if (Array.isArray(importedQuotes)) {
        quotes.push(...importedQuotes);
        saveQuotes();
        populateCategories();
        alert("Quotes imported successfully!");
      } else {
        alert("Invalid JSON format!");
      }
    } catch (error) {
      alert("Error reading file. Please upload a valid JSON.");
    }
  };
  fileReader.readAsText(event.target.files[0]);
}

// Event listeners
window.onload = loadQuotes;
document.getElementById("newQuote").addEventListener("click", showRandomQuote);
