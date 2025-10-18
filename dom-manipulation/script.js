const quotes = [
  { text: "The best way to predict the future is to invent it.", category: "Motivation" },
  { text: "Data is the new oil.", category: "Technology" },
  { text: "In the middle of difficulty lies opportunity.", category: "Inspiration" },
  { text: "An investment in knowledge pays the best interest.", category: "Education" }
];

// --- DOM refs ---
const quoteDisplay = document.getElementById("quoteDisplay");
const newQuoteBtn = document.getElementById("newQuote");
const categorySelect = document.getElementById("categorySelect");
const addQuoteContainer = document.getElementById("addQuoteContainer");

// --- Populate categories dropdown (keeps current selection when possible) ---
function populateCategories() {
  const prev = categorySelect.value || "All";
  const categories = [...new Set(quotes.map(q => q.category))].sort();
  // clear
  categorySelect.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "All";
  allOption.textContent = "All Categories";
  categorySelect.appendChild(allOption);

  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categorySelect.appendChild(opt);
  });

  // restore previous selection if still present, otherwise default to All
  const values = ["All", ...categories];
  categorySelect.value = values.includes(prev) ? prev : "All";
}

// --- Display a random quote (from selected category) ---
function showRandomQuote() {
  const selectedCategory = categorySelect.value;
  let pool = quotes;
  if (selectedCategory && selectedCategory !== "All") {
    pool = quotes.filter(q => q.category === selectedCategory);
  }
  if (pool.length === 0) {
    quoteDisplay.textContent = "No quotes available for this category.";
    return;
  }
  const idx = Math.floor(Math.random() * pool.length);
  const q = pool[idx];
  renderQuote(q);
}

// --- Render a specific quote object into the display area ---
function renderQuote(q) {
  // make the display more structured (quote + category + actions)
  quoteDisplay.innerHTML = "";
  const p = document.createElement("p");
  p.textContent = `"${q.text}"`;
  p.style.fontStyle = "italic";
  p.style.marginBottom = "8px";

  const meta = document.createElement("div");
  meta.textContent = `— ${q.category}`;
  meta.style.fontSize = "0.9em";
  meta.style.color = "#555";

  quoteDisplay.appendChild(p);
  quoteDisplay.appendChild(meta);
}

// --- Dynamically create the Add Quote form and attach listeners ---
function createAddQuoteForm() {
  addQuoteContainer.innerHTML = ""; // clear any existing content

  const form = document.createElement("form");
  form.id = "addQuoteForm";
  form.autocomplete = "off";

  const textInput = document.createElement("input");
  textInput.type = "text";
  textInput.id = "newQuoteText";
  textInput.placeholder = "Enter a new quote";
  textInput.required = true;
  textInput.style.width = "45%";

  const catInput = document.createElement("input");
  catInput.type = "text";
  catInput.id = "newQuoteCategory";
  catInput.placeholder = "Enter quote category";
  catInput.required = true;
  catInput.style.width = "25%";

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.id = "addQuoteBtn";
  submitBtn.textContent = "Add Quote";

  // optional: quick-add by choosing an existing category from a small dropdown
  const quickCat = document.createElement("select");
  quickCat.id = "quickCategory";
  const noneOpt = document.createElement("option");
  noneOpt.value = "";
  noneOpt.textContent = "-- or choose existing category --";
  quickCat.appendChild(noneOpt);

  // fill quickCat with current categories
  const existingCats = [...new Set(quotes.map(q => q.category))].sort();
  existingCats.forEach(c => {
    const o = document.createElement("option");
    o.value = c;
    o.textContent = c;
    quickCat.appendChild(o);
  });
  quickCat.style.width = "20%";

  // when quickCat changes, populate catInput
  quickCat.addEventListener("change", () => {
    if (quickCat.value) catInput.value = quickCat.value;
  });

  // assemble form
  form.appendChild(textInput);
  form.appendChild(catInput);
  form.appendChild(quickCat);
  form.appendChild(submitBtn);

  // handle form submit
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    addQuote(textInput.value.trim(), catInput.value.trim());
    // reset quick selector and inputs
    quickCat.selectedIndex = 0;
    form.reset();
  });

  addQuoteContainer.appendChild(form);
}

// --- Add a new quote into the array and update the DOM ---
function addQuote(text, category) {
  if (!text || !category) {
    alert("Please enter both quote text and category.");
    return;
  }

  // push new quote
  const newQuote = { text, category };
  quotes.push(newQuote);

  // update categories dropdown (keep newly added category selected)
  populateCategories();
  categorySelect.value = category;

  // show the newly added quote immediately
  renderQuote(newQuote);

  // optional feedback
  // using setTimeout to avoid blocking UI flashes (not necessary, but friendly)
  setTimeout(() => {
    alert("New quote added successfully!");
  }, 50);
}

// --- Initialization ---
function init() {
  populateCategories();
  createAddQuoteForm();

  // events
  newQuoteBtn.addEventListener("click", showRandomQuote);
  categorySelect.addEventListener("change", () => {
    // when user changes category, immediately show a quote from that category if possible
    showRandomQuote();
  });
}

// run
init();
