const quoteDisplay = document.getElementById('quoteDisplay');
const categoryFilter = document.getElementById('categoryFilter');
const addQuoteForm = document.getElementById('addQuoteForm');
const notification = document.getElementById('notification');

// Default quotes
let quotes = JSON.parse(localStorage.getItem('quotes')) || [
  { text: "The best way to predict the future is to create it.", category: "Motivation" },
  { text: "In the middle of difficulty lies opportunity.", category: "Inspiration" },
  { text: "Stay hungry, stay foolish.", category: "Life" }
];

// Display quotes
function displayQuotes(filteredQuotes = quotes) {
  quoteDisplay.innerHTML = "";
  filteredQuotes.forEach((quote) => {
    const div = document.createElement('div');
    div.classList.add('quote');
    div.textContent = `${quote.text} — (${quote.category})`;
    quoteDisplay.appendChild(div);
  });
}

// Populate categories dynamically
function populateCategories() {
  const categories = [...new Set(quotes.map(q => q.category))];
  categoryFilter.innerHTML = `<option value="all">All Categories</option>`;
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    categoryFilter.appendChild(option);
  });

  // Restore last selected filter
  const savedFilter = localStorage.getItem('selectedCategory');
  if (savedFilter) {
    categoryFilter.value = savedFilter;
    filterQuotes();
  }
}

// Filter quotes by category
function filterQuotes() {
  const selectedCategory = categoryFilter.value;
  localStorage.setItem('selectedCategory', selectedCategory);
  const filteredQuotes =
    selectedCategory === "all"
      ? quotes
      : quotes.filter(q => q.category === selectedCategory);
  displayQuotes(filteredQuotes);
}

// Add new quote
addQuoteForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const newText = document.getElementById('quoteText').value.trim();
  const newCategory = document.getElementById('quoteCategory').value.trim();

  if (newText && newCategory) {
    const newQuote = { text: newText, category: newCategory };
    quotes.push(newQuote);
    localStorage.setItem('quotes', JSON.stringify(quotes));
    populateCategories();
    filterQuotes();
    syncQuotesToServer(); // sync new quote to server
    addQuoteForm.reset();
    showNotification("✅ Quote added and synced with server!");
  }
});

// Show notification
function showNotification(message) {
  notification.textContent = message;
  notification.style.display = 'block';
  setTimeout(() => (notification.style.display = 'none'), 3000);
}

// === SERVER SIMULATION ===

// Fetch quotes from server (GET)
async function fetchQuotesFromServer() {
  try {
    const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const serverData = await response.json();

    // Simulate server quotes
    const serverQuotes = serverData.slice(0, 3).map(item => ({
      text: item.title,
      category: "Server Sync"
    }));

    // Conflict resolution (server takes precedence)
    const mergedQuotes = [...quotes, ...serverQuotes];
    const uniqueQuotes = Array.from(new Set(mergedQuotes.map(q => q.text)))
      .map(text => mergedQuotes.find(q => q.text === text));

    quotes = uniqueQuotes;
    localStorage.setItem('quotes', JSON.stringify(quotes));
    populateCategories();
    filterQuotes();

    showNotification("🔄 Quotes synced with server!");
  } catch (error) {
    console.error("Error fetching from server:", error);
  }
}

// Sync local quotes to server (POST)
async function syncQuotesToServer() {
  try {
    const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(quotes)
    });

    if (response.ok) {
      console.log("Quotes synced to server successfully!");
    } else {
      console.error("Failed to sync quotes to server!");
    }
  } catch (error) {
    console.error("Error syncing to server:", error);
  }
}

// Periodically sync every 30 seconds
setInterval(fetchQuotesFromServer, 30000);

// Initialize
populateCategories();
filterQuotes();
displayQuotes();
