let quotes = JSON.parse(localStorage.getItem("quotes")) || [
  { text: "The best way to get started is to quit talking and begin doing.", category: "Motivation" },
  { text: "Life is what happens when you're busy making other plans.", category: "Life" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", category: "Success" }
];

const quoteDisplay = document.getElementById("quoteDisplay");
const quoteCategory = document.getElementById("quoteCategory");
const categoryFilter = document.getElementById("categoryFilter");

// --- Initialize the App ---
document.addEventListener("DOMContentLoaded", () => {
  createAddQuoteForm();
  populateCategories();

  // Restore last selected category
  const lastCategory = localStorage.getItem("selectedCategory") || "all";
  categoryFilter.value = lastCategory;
  filterQuotes();

  document.getElementById("newQuote").addEventListener("click", showRandomQuote);
});

// --- Save Quotes to Local Storage ---
function saveQuotes() {
  localStorage.setItem("quotes", JSON.stringify(quotes));
}

// --- Show Random Quote ---
function showRandomQuote() {
  const selectedCategory = categoryFilter.value;
  const filteredQuotes =
    selectedCategory === "all"
      ? quotes
      : quotes.filter(q => q.category === selectedCategory);

  if (filteredQuotes.length === 0) {
    quoteDisplay.textContent = "No quotes available in this category.";
    quoteCategory.textContent = "";
    return;
  }

  const randomQuote = filteredQuotes[Math.floor(Math.random() * filteredQuotes.length)];
  quoteDisplay.textContent = `"${randomQuote.text}"`;
  quoteCategory.textContent = `— ${randomQuote.category}`;

  // Save last viewed quote in session storage
  sessionStorage.setItem("lastViewedQuote", JSON.stringify(randomQuote));
}

// --- Create Add Quote Form (using DOM methods) ---
function createAddQuoteForm() {
  const formContainer = document.getElementById("addQuoteForm");

  const title = document.createElement("h3");
  title.textContent = "Add a New Quote";
  formContainer.appendChild(title);

  const quoteInput = document.createElement("input");
  quoteInput.id = "newQuoteText";
  quoteInput.type = "text";
  quoteInput.placeholder = "Enter a new quote";
  formContainer.appendChild(quoteInput);

  const categoryInput = document.createElement("input");
  categoryInput.id = "newQuoteCategory";
  categoryInput.type = "text";
  categoryInput.placeholder = "Enter quote category";
  formContainer.appendChild(categoryInput);

  const addButton = document.createElement("button");
  addButton.textContent = "Add Quote";
  addButton.addEventListener("click", addQuote);
  formContainer.appendChild(addButton);
}

// --- Add a New Quote ---
function addQuote() {
  const text = document.getElementById("newQuoteText").value.trim();
  const category = document.getElementById("newQuoteCategory").value.trim();

  if (!text || !category) {
    alert("Please fill in both fields.");
    return;
  }

  quotes.push({ text, category });
  saveQuotes();
  populateCategories();

  document.getElementById("newQuoteText").value = "";
  document.getElementById("newQuoteCategory").value = "";
  alert("Quote added successfully!");
}

// --- Populate Category Dropdown ---
function populateCategories() {
  const uniqueCategories = ["all", ...new Set(quotes.map(q => q.category))];
  
  // Clear existing options
  categoryFilter.innerHTML = "";

  uniqueCategories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    categoryFilter.appendChild(option);
  });

  const lastCategory = localStorage.getItem("selectedCategory");
  if (lastCategory && uniqueCategories.includes(lastCategory)) {
    categoryFilter.value = lastCategory;
  }
}

// --- Filter Quotes by Category ---
function filterQuotes() {
  const selectedCategory = categoryFilter.value;
  localStorage.setItem("selectedCategory", selectedCategory);
  showRandomQuote();
}

// --- Export Quotes to JSON ---
function exportToJsonFile() {
  const dataStr = JSON.stringify(quotes, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "quotes.json";
  link.click();

  URL.revokeObjectURL(url);
}

// --- Import Quotes from JSON ---
function importFromJsonFile(event) {
  const fileReader = new FileReader();
  fileReader.onload = function (event) {
    try {
      const importedQuotes = JSON.parse(event.target.result);
      if (!Array.isArray(importedQuotes)) throw new Error("Invalid JSON format");
      quotes.push(...importedQuotes);
      saveQuotes();
      populateCategories();
      alert("Quotes imported successfully!");
    } catch (error) {
      alert("Failed to import quotes: " + error.message);
    }
  };
  fileReader.readAsText(event.target.files[0]);
}
