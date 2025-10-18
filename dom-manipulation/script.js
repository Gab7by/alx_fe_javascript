const LOCAL_KEY = "dqg_quotes_v1";        // key for localStorage
const SESSION_KEY_LAST = "dqg_lastQuote"; // key for sessionStorage

// default quotes (used only if localStorage is empty)
const DEFAULT_QUOTES = [
  { text: "The best way to predict the future is to invent it.", category: "Motivation" },
  { text: "Data is the new oil.", category: "Technology" },
  { text: "In the middle of difficulty lies opportunity.", category: "Inspiration" },
  { text: "An investment in knowledge pays the best interest.", category: "Education" }
];

// runtime array (will be loaded from localStorage)
let quotes = [];

// ---------- DOM refs ----------
const quoteDisplay = document.getElementById("quoteDisplay");
const newQuoteBtn = document.getElementById("newQuote");
const categorySelect = document.getElementById("categorySelect");
const addQuoteContainer = document.getElementById("addQuoteContainer");
const exportBtn = document.getElementById("exportBtn");
const importFile = document.getElementById("importFile");
const importBtn = document.getElementById("importBtn");
const clearStorageBtn = document.getElementById("clearStorageBtn");
const messageDiv = document.getElementById("message");
const errorDiv = document.getElementById("error");

// ---------- Utility & storage functions ----------
function showMessage(msg, isError = false, timeout = 3500) {
  if (isError) {
    errorDiv.textContent = msg;
    messageDiv.textContent = "";
  } else {
    messageDiv.textContent = msg;
    errorDiv.textContent = "";
  }
  if (timeout) setTimeout(() => { messageDiv.textContent = ""; errorDiv.textContent = ""; }, timeout);
}

function saveQuotesToLocal() {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(quotes));
  } catch (err) {
    showMessage("Failed to save to localStorage.", true);
    console.error(err);
  }
}

function loadQuotesFromLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) {
      quotes = [...DEFAULT_QUOTES];
      saveQuotesToLocal(); // seed storage
      return;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Saved data malformed");
    // Basic validation: ensure each item has text & category
    quotes = parsed.filter(q => q && typeof q.text === "string" && typeof q.category === "string");
    if (!quotes.length) quotes = [...DEFAULT_QUOTES];
  } catch (err) {
    console.error("Error loading quotes:", err);
    quotes = [...DEFAULT_QUOTES];
    saveQuotesToLocal();
  }
}

// session: store last viewed quote (object)
function saveLastViewedToSession(q) {
  try {
    sessionStorage.setItem(SESSION_KEY_LAST, JSON.stringify(q));
  } catch (err) {
    console.warn("sessionStorage save failed", err);
  }
}

function loadLastViewedFromSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY_LAST);
    if (!raw) return null;
    const q = JSON.parse(raw);
    if (q && q.text && q.category) return q;
  } catch (err) {
    console.warn("sessionStorage load error", err);
  }
  return null;
}

// ---------- Rendering & category logic ----------
function populateCategories() {
  const prev = categorySelect.value || "All";
  const categories = [...new Set(quotes.map(q => q.category))].sort();
  categorySelect.innerHTML = "";

  const allOpt = document.createElement("option");
  allOpt.value = "All";
  allOpt.textContent = "All Categories";
  categorySelect.appendChild(allOpt);

  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categorySelect.appendChild(opt);
  });

  const values = ["All", ...categories];
  categorySelect.value = values.includes(prev) ? prev : "All";
}

function renderQuote(q) {
  quoteDisplay.innerHTML = "";
  const p = document.createElement("p");
  p.textContent = `"${q.text}"`;
  p.style.fontStyle = "italic";
  p.style.marginBottom = "8px";

  const meta = document.createElement("div");
  meta.textContent = `— ${q.category}`;
  meta.style.fontSize = "0.9em";
  meta.style.color = "#555";

  // append action buttons (optional: copy or remove)
  const actions = document.createElement("div");
  actions.style.marginTop = "10px";

  const copyBtn = document.createElement("button");
  copyBtn.textContent = "Copy Quote";
  copyBtn.type = "button";
  copyBtn.style.marginRight = "6px";
  copyBtn.addEventListener("click", () => {
    navigator.clipboard?.writeText(`${q.text} — ${q.category}`)
      .then(() => showMessage("Quote copied to clipboard"))
      .catch(() => showMessage("Unable to copy", true));
  });

  actions.appendChild(copyBtn);

  // optional small remove button
  const removeBtn = document.createElement("button");
  removeBtn.textContent = "Remove Quote";
  removeBtn.type = "button";
  removeBtn.style.marginLeft = "6px";
  removeBtn.addEventListener("click", () => {
    if (!confirm("Remove this quote permanently?")) return;
    removeQuote(q);
  });
  actions.appendChild(removeBtn);

  quoteDisplay.appendChild(p);
  quoteDisplay.appendChild(meta);
  quoteDisplay.appendChild(actions);
}

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
  saveLastViewedToSession(q);
}

// ---------- Add / remove quotes ----------
function addQuote(text, category, { showAlert = true } = {}) {
  if (!text || !category) {
    showMessage("Please provide both quote text and category.", true);
    return false;
  }
  const cleanText = text.trim();
  const cleanCat = category.trim();

  // prevent duplicates (same text + category)
  const exists = quotes.some(q => q.text === cleanText && q.category === cleanCat);
  if (exists) {
    if (showAlert) showMessage("This quote already exists.", true);
    return false;
  }

  const newQ = { text: cleanText, category: cleanCat };
  quotes.push(newQ);
  saveQuotesToLocal();
  populateCategories();
  categorySelect.value = cleanCat;
  renderQuote(newQ);
  saveLastViewedToSession(newQ);
  if (showAlert) showMessage("New quote added!");
  return true;
}

function removeQuote(target) {
  const idx = quotes.findIndex(q => q.text === target.text && q.category === target.category);
  if (idx === -1) { showMessage("Quote not found", true); return; }
  quotes.splice(idx, 1);
  saveQuotesToLocal();
  populateCategories();
  quoteDisplay.textContent = "Quote removed.";
  showMessage("Quote removed.");
}

// ---------- Dynamic Add Quote form ----------
function createAddQuoteForm() {
  addQuoteContainer.innerHTML = "";
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
  catInput.style.width = "20%";

  const quickCat = document.createElement("select");
  quickCat.id = "quickCategory";
  const noneOpt = document.createElement("option");
  noneOpt.value = "";
  noneOpt.textContent = "-- choose existing category --";
  quickCat.appendChild(noneOpt);
  const existingCats = [...new Set(quotes.map(q => q.category))].sort();
  existingCats.forEach(c => {
    const o = document.createElement("option");
    o.value = c;
    o.textContent = c;
    quickCat.appendChild(o);
  });
  quickCat.style.width = "18%";
  quickCat.addEventListener("change", () => {
    if (quickCat.value) catInput.value = quickCat.value;
  });

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.id = "addQuoteBtn";
  submitBtn.textContent = "Add Quote";

  form.appendChild(textInput);
  form.appendChild(catInput);
  form.appendChild(quickCat);
  form.appendChild(submitBtn);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = textInput.value.trim();
    const category = catInput.value.trim();
    const ok = addQuote(text, category);
    if (ok) form.reset();
    quickCat.selectedIndex = 0;
  });

  addQuoteContainer.appendChild(form);
}

// ---------- JSON Export / Import ----------
function exportQuotesToJson() {
  try {
    const dataStr = JSON.stringify(quotes, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const now = new Date();
    const fname = `dqg_quotes_${now.toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showMessage("Quotes exported.");
  } catch (err) {
    console.error(err);
    showMessage("Export failed.", true);
  }
}

function importFromJsonFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (ev) {
    try {
      const parsed = JSON.parse(ev.target.result);
      if (!Array.isArray(parsed)) throw new Error("Imported JSON must be an array of quotes.");
      // validate items
      const valid = parsed.filter(item => item && typeof item.text === "string" && typeof item.category === "string");
      if (!valid.length) throw new Error("No valid quote objects found in file.");
      // add non-duplicates
      let added = 0;
      valid.forEach(item => {
        const ok = addQuote(item.text.trim(), item.category.trim(), { showAlert: false });
        if (ok) added++;
      });
      if (added > 0) {
        saveQuotesToLocal();
        populateCategories();
        showMessage(`${added} quote(s) imported successfully.`);
      } else {
        showMessage("No new quotes were imported (duplicates only).", true);
      }
    } catch (err) {
      console.error("Import error", err);
      showMessage("Import failed: " + (err.message || "Invalid file"), true);
    }
  };
  reader.onerror = function () {
    showMessage("Error reading file", true);
  };
  reader.readAsText(file);
}

// ---------- Clear storage ----------
function clearSavedQuotes() {
  if (!confirm("This will remove all saved quotes and restore defaults. Continue?")) return;
  localStorage.removeItem(LOCAL_KEY);
  loadQuotesFromLocal(); // will re-seed defaults
  populateCategories();
  quoteDisplay.textContent = "Storage cleared; default quotes restored.";
  showMessage("Saved quotes cleared.");
}

// ---------- Initialization ----------
function init() {
  loadQuotesFromLocal();
  populateCategories();
  createAddQuoteForm();

  // render last viewed from session if present
  const last = loadLastViewedFromSession();
  if (last) renderQuote(last);

  // event wiring
  newQuoteBtn.addEventListener("click", showRandomQuote);
  categorySelect.addEventListener("change", showRandomQuote);

  exportBtn.addEventListener("click", exportQuotesToJson);
  importBtn.addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", (ev) => {
    const file = ev.target.files?.[0];
    if (file) importFromJsonFile(file);
    importFile.value = ""; // reset input so same file can be chosen again
  });

  clearStorageBtn.addEventListener("click", clearSavedQuotes);
}

// run
init();
