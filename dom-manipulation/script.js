let quotes = JSON.parse(localStorage.getItem("quotes")) || [
  { text: "Stay positive.", category: "Motivation" },
  { text: "Learn from failure.", category: "Inspiration" },
  { text: "Focus on growth.", category: "Motivation" },
];

function showQuotes(filteredQuotes) {
  const display = document.getElementById("quoteDisplay");
  display.innerHTML = "";
  filteredQuotes.forEach(q => {
    const p = document.createElement("p");
    p.textContent = `${q.text} — (${q.category})`;
    display.appendChild(p);
  });
}

function populateCategories() {
  const categorySelect = document.getElementById("categoryFilter");
  const categories = [...new Set(quotes.map(q => q.category))];
  categorySelect.innerHTML = '<option value="all">All Categories</option>';
  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categorySelect.appendChild(opt);
  });

  // restore last selected filter
  const lastSelected = localStorage.getItem("selectedCategory");
  if (lastSelected) {
    categorySelect.value = lastSelected;
    filterQuotes();
  } else {
    showQuotes(quotes);
  }
}

function filterQuotes() {
  const selected = document.getElementById("categoryFilter").value;
  localStorage.setItem("selectedCategory", selected);

  if (selected === "all") {
    showQuotes(quotes);
  } else {
    const filtered = quotes.filter(q => q.category === selected);
    showQuotes(filtered);
  }
}

function addQuote() {
  const text = document.getElementById("newQuoteText").value.trim();
  const category = document.getElementById("newQuoteCategory").value.trim();
  if (!text || !category) {
    alert("Please fill both fields");
    return;
  }

  quotes.push({ text, category });
  localStorage.setItem("quotes", JSON.stringify(quotes));
  populateCategories();
  filterQuotes();
  document.getElementById("newQuoteText").value = "";
  document.getElementById("newQuoteCategory").value = "";
}

document.addEventListener("DOMContentLoaded", () => {
  populateCategories();
});
