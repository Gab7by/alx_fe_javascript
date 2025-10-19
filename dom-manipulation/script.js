// ---------- Config ----------
const LOCAL_KEY = "dqg_sync_quotes_v1";
const SELECTED_CAT_KEY = "dqg_selected_category_v1";
const SESSION_LAST_KEY = "dqg_lastQuote_v1";
const SERVER_URL = "https://jsonplaceholder.typicode.com/posts"; // mock server
const SYNC_INTERVAL_MS = 30000; // 30 seconds

// ---------- State ----------
let quotes = []; // each quote: { id, text, category, source: 'local'|'server', updatedAt }
let conflicts = []; // detected conflicts to resolve

// ---------- DOM refs ----------
const categoryFilter = document.getElementById("categoryFilter");
const quoteDisplay = document.getElementById("quoteDisplay");
const quoteMeta = document.getElementById("quoteMeta");
const newQuoteBtn = document.getElementById("newQuote");
const syncNowBtn = document.getElementById("syncNowBtn");
const syncStatus = document.getElementById("syncStatus");
const addQuoteForm = document.getElementById("addQuoteForm");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importFile = document.getElementById("importFile");
const conflictPanel = document.getElementById("conflictPanel");
const conflictList = document.getElementById("conflictList");
const closeConflictsBtn = document.getElementById("closeConflictsBtn");
const messageDiv = document.getElementById("message");

// ---------- Utility ----------
function uid(prefix = "local") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random()*1000)}`;
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) {
      // seed defaults
      quotes = [
        { id: uid("local"), text: "The best way to predict the future is to invent it.", category: "Motivation", source: "local", updatedAt: Date.now() },
        { id: uid("local"), text: "Data is the new oil.", category: "Technology", source: "local", updatedAt: Date.now() },
        { id: uid("local"), text: "In difficulty lies opportunity.", category: "Inspiration", source: "local", updatedAt: Date.now() }
      ];
      saveLocal();
      return;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) quotes = parsed;
    else throw new Error("invalid local data");
  } catch (err) {
    console.error("Failed to load local quotes, seeding defaults", err);
    quotes = [
      { id: uid("local"), text: "The best way to predict the future is to invent it.", category: "Motivation", source: "local", updatedAt: Date.now() },
      { id: uid("local"), text: "Data is the new oil.", category: "Technology", source: "local", updatedAt: Date.now() }
    ];
    saveLocal();
  }
}

function saveLocal() {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(quotes));
  } catch (err) {
    console.error("saveLocal failed", err);
  }
}

function showMessage(msg, timeout = 3000) {
  messageDiv.textContent = msg;
  if (timeout) setTimeout(() => { if (messageDiv.textContent === msg) messageDiv.textContent = ""; }, timeout);
}

// ---------- Rendering & categories ----------
function populateCategories() {
  const cats = [...new Set(quotes.map(q => q.category))].sort();
  const opts = ["all", ...cats];
  categoryFilter.innerHTML = "";
  opts.forEach(c => {
    const o = document.createElement("option");
    o.value = c;
    o.textContent = c === "all" ? "All Categories" : c;
    categoryFilter.appendChild(o);
  });
  const saved = localStorage.getItem(SELECTED_CAT_KEY) || "all";
  categoryFilter.value = opts.includes(saved) ? saved : "all";
}

function renderQuote(q) {
  quoteDisplay.innerHTML = "";
  const p = document.createElement("p");
  p.textContent = `"${q.text}"`;
  p.style.margin = "0 0 8px 0";
  const meta = document.createElement("div");
  meta.textContent = `— ${q.category} (${q.source})`;
  meta.className = "small";
  quoteDisplay.appendChild(p);
  quoteDisplay.appendChild(meta);
  quoteMeta.textContent = `id: ${q.id} • updatedAt: ${new Date(q.updatedAt).toLocaleString()}`;
  // save last to session
  sessionStorage.setItem(SESSION_LAST_KEY, JSON.stringify(q));
}

function showRandomQuote() {
  const sel = categoryFilter.value;
  const pool = sel === "all" ? quotes : quotes.filter(q => q.category === sel);
  if (pool.length === 0) {
    quoteDisplay.textContent = "No quotes for this category.";
    quoteMeta.textContent = "";
    return;
  }
  const q = pool[Math.floor(Math.random()*pool.length)];
  renderQuote(q);
}

// ---------- Add quote (local) ----------
function createAddForm() {
  addQuoteForm.innerHTML = "";
  const inputText = document.createElement("input");
  inputText.placeholder = "Quote text";
  inputText.id = "newText";
  inputText.style.width = "45%";
  const inputCat = document.createElement("input");
  inputCat.placeholder = "Category";
  inputCat.id = "newCat";
  inputCat.style.width = "20%";
  const btn = document.createElement("button");
  btn.textContent = "Add Quote (Local)";
  btn.type = "button";
  btn.addEventListener("click", () => {
    const text = inputText.value.trim();
    const category = inputCat.value.trim() || "Uncategorized";
    if (!text) { alert("Please enter text"); return; }
    const newQ = { id: uid("local"), text, category, source: "local", updatedAt: Date.now() };
    quotes.push(newQ);
    saveLocal();
    populateCategories();
    showMessage("Added local quote");
    inputText.value = ""; inputCat.value = "";
    renderQuote(newQ);
  });
  addQuoteForm.appendChild(inputText);
  addQuoteForm.appendChild(inputCat);
  addQuoteForm.appendChild(btn);
}

// ---------- Import / Export ----------
function exportToJson() {
  const blob = new Blob([JSON.stringify(quotes, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dqg_quotes_export_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function importFromFile(file) {
  if (!file) return;
  const fr = new FileReader();
  fr.onload = (ev) => {
    try {
      const parsed = JSON.parse(ev.target.result);
      if (!Array.isArray(parsed)) throw new Error("Imported JSON must be an array");
      // attach ids for imported items if missing
      let added = 0;
      parsed.forEach(item => {
        if (item && item.text && item.category) {
          const id = item.id || uid("local");
          const q = { id, text: item.text, category: item.category, source: item.source || "local", updatedAt: Date.now() };
          // avoid exact duplicates (text+category)
          const exists = quotes.some(x => x.text === q.text && x.category === q.category);
          if (!exists) { quotes.push(q); added++; }
        }
      });
      if (added) {
        saveLocal();
        populateCategories();
        showMessage(`${added} imported`);
      } else showMessage("No new quotes to import", 2500);
    } catch (err) {
      alert("Import failed: " + err.message);
    }
  };
  fr.readAsText(file);
}

// ---------- Server sync (fetch & merge) ----------
async function fetchServerQuotes() {
  // Fetch from JSONPlaceholder and map to our shape
  const res = await fetch(SERVER_URL + "?_limit=20"); // limit to 20 for demo
  if (!res.ok) throw new Error("Failed to fetch server data");
  const data = await res.json();
  // Map: server post -> quote { id: server-<id>, text: body, category: title }
  return data.map(p => ({
    id: `server-${p.id}`,
    text: p.body || p.title || `server post ${p.id}`,
    category: p.title ? p.title.slice(0,20) : "Server",
    source: "server",
    updatedAt: Date.now()
  }));
}

function findById(id) { return quotes.find(q => q.id === id); }

function detectConflicts(serverList) {
  const newConflicts = [];
  // Build map of server items by id
  const serverMap = new Map(serverList.map(s => [s.id, s]));

  // 1) Items present in both: check differing fields
  serverList.forEach(s => {
    const local = findById(s.id);
    if (local) {
      if (local.text !== s.text || local.category !== s.category) {
        // conflict: different content for same id
        newConflicts.push({ id: s.id, local, server: s });
      }
    }
  });

  // 2) Server has new items not in local -> will be added (not a conflict)
  // 3) Local-only items (ids not present on server) -> candidate to push (no conflict)
  return newConflicts;
}

async function mergeServerData(serverList) {
  // Strategy: server wins by default. We'll still collect conflicts for manual resolution.
  const serverIds = new Set(serverList.map(s => s.id));
  const localIds = new Set(quotes.map(q => q.id));

  // Detect conflicts
  conflicts = detectConflicts(serverList);
  if (conflicts.length) {
    // Show conflicts UI but still apply server versions (server wins)
    // Overwrite local items with server items
    conflicts.forEach(c => {
      const idx = quotes.findIndex(q => q.id === c.id);
      if (idx !== -1) quotes[idx] = { ...c.server };
    });
  }

  // Add or update server items
  serverList.forEach(s => {
    const idx = quotes.findIndex(q => q.id === s.id);
    if (idx === -1) {
      // add new server item
      quotes.push({ ...s });
    } else {
      // already overwritten above if conflict; ensure source is server
      quotes[idx] = { ...quotes[idx], source: "server", updatedAt: s.updatedAt };
    }
  });

  // Optionally: local-only items (not on server) remain as local; we may push them later.
  saveLocal();
  populateCategories();
  if (conflicts.length) {
    showConflictPanel();
    showMessage(`${conflicts.length} conflict(s) detected; server changes applied by default.`, 6000);
  } else {
    showMessage("Server sync applied (no conflicts).", 3000);
  }
}

// Push local-only items to server (simulate by POST to JSONPlaceholder)
async function pushLocalToServer() {
  // local-only items are those with id starting local- (or not starting 'server-')
  const localOnly = quotes.filter(q => !q.id.startsWith("server-") && q.source === "local");
  let pushed = 0;
  for (const item of localOnly) {
    try {
      // JSONPlaceholder accepts posts and returns an id — we treat that as server id
      const payload = { title: item.category.slice(0,50), body: item.text, userId: 1 };
      const res = await fetch(SERVER_URL, { method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("post failed");
      const data = await res.json();
      // transform local id to server id
      const serverId = `server-${data.id}`;
      item.id = serverId;
      item.source = "server";
      item.updatedAt = Date.now();
      pushed++;
    } catch (err) {
      console.warn("Failed to push item to server", err);
    }
  }
  if (pushed) {
    saveLocal();
    populateCategories();
    showMessage(`${pushed} local item(s) pushed to server`);
  }
}

// ---------- Full sync orchestration ----------
let syncTimer = null;
async function doSync(showStatus = true) {
  try {
    if (showStatus) syncStatus.textContent = "Sync: fetching...";
    const serverList = await fetchServerQuotes();
    if (showStatus) syncStatus.textContent = "Sync: merging...";
    await mergeServerData(serverList);
    if (showStatus) syncStatus.textContent = "Sync: pushing local changes...";
    await pushLocalToServer();
    if (showStatus) syncStatus.textContent = "Sync: idle";
  } catch (err) {
    console.error("Sync error", err);
    if (showStatus) syncStatus.textContent = "Sync: error";
    showMessage("Sync failed: " + (err.message || "network"), 4000);
  }
}

// ---------- Conflict UI ----------
function showConflictPanel() {
  conflictList.innerHTML = "";
  conflicts.forEach(c => {
    const el = document.createElement("div");
    el.className = "conflictItem";
    const title = document.createElement("div");
    title.innerHTML = `<strong>ID:</strong> ${c.id}`;
    const localDiv = document.createElement("div");
    localDiv.innerHTML = `<em>Local:</em> "${c.local.text}" — ${c.local.category}`;
    const serverDiv = document.createElement("div");
    serverDiv.innerHTML = `<em>Server:</em> "${c.server.text}" — ${c.server.category}`;
    const btns = document.createElement("div");
    btns.className = "conflictBtns";

    const acceptServerBtn = document.createElement("button");
    acceptServerBtn.textContent = "Accept Server";
    acceptServerBtn.addEventListener("click", () => {
      // apply server version (already applied in merge) — just remove conflict
      conflicts = conflicts.filter(x => x.id !== c.id);
      saveLocal(); populateCategories(); renderIfMatchesCurrent();
      el.remove();
      showMessage("Server version accepted.");
    });

    const keepLocalBtn = document.createElement("button");
    keepLocalBtn.textContent = "Keep Local (Push to Server)";
    keepLocalBtn.addEventListener("click", async () => {
      // We will POST local content to server; in a real service you'd PATCH the server id
      try {
        const payload = { title: c.local.category.slice(0,50), body: c.local.text, userId: 1 };
        const res = await fetch(SERVER_URL, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(payload) });
        const data = await res.json();
        // Adopt the returned server id, remove conflict
        const newServerId = `server-${data.id}`;
        // replace local item id with server id
        const idx = quotes.findIndex(q => q.id === c.local.id);
        if (idx !== -1) {
          quotes[idx].id = newServerId;
          quotes[idx].source = "server";
          quotes[idx].updatedAt = Date.now();
        }
        saveLocal(); populateCategories(); renderIfMatchesCurrent();
        conflicts = conflicts.filter(x => x.id !== c.id);
        el.remove();
        showMessage("Local kept and pushed to server (new server id assigned).");
      } catch (err) {
        console.error("Push local for conflict failed", err);
        alert("Failed to push local version to server.");
      }
    });

    btns.appendChild(acceptServerBtn);
    btns.appendChild(keepLocalBtn);

    el.appendChild(title);
    el.appendChild(localDiv);
    el.appendChild(serverDiv);
    el.appendChild(btns);

    conflictList.appendChild(el);
  });

  conflictPanel.style.display = conflicts.length ? "block" : "none";
}

closeConflictsBtn.addEventListener("click", () => { conflictPanel.style.display = "none"; });

// Helper: re-render displayed quote if it matches current filter
function renderIfMatchesCurrent() {
  const last = JSON.parse(sessionStorage.getItem(SESSION_LAST_KEY) || "null");
  const sel = categoryFilter.value || "all";
  if (last && (sel === "all" || last.category === sel)) renderQuote(last);
}

// ---------- Remove quote helper (for UI use) ----------
function removeQuoteById(id) {
  const idx = quotes.findIndex(q => q.id === id);
  if (idx === -1) return false;
  quotes.splice(idx, 1);
  saveLocal();
  populateCategories();
  showMessage("Removed quote");
  return true;
}

// ---------- Initialize app ----------
function init() {
  loadLocal();
  populateCategories();
  createAddForm();

  // restore last category
  const savedCat = localStorage.getItem(SELECTED_CAT_KEY) || "all";
  categoryFilter.value = savedCat;

  // show last session quote if matches
  const last = JSON.parse(sessionStorage.getItem(SESSION_LAST_KEY) || "null");
  if (last && (savedCat === "all" || last.category === savedCat)) renderQuote(last);

  // events
  newQuoteBtn.addEventListener("click", () => {
    showRandomQuote();
  });
  categoryFilter.addEventListener("change", () => {
    localStorage.setItem(SELECTED_CAT_KEY, categoryFilter.value);
    showRandomQuote();
  });
  syncNowBtn.addEventListener("click", () => doSync(true));
  exportBtn.addEventListener("click", exportToJson);
  importBtn.addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", (e) => {
    importFromFile(e.target.files[0]);
    importFile.value = "";
  });

  // start periodic sync
  syncTimer = setInterval(() => { doSync(false); }, SYNC_INTERVAL_MS);

  // initial sync (non-intrusive)
  setTimeout(() => doSync(false), 2000);
}

init();
