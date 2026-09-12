const people = [
  "Mayedi",
  "Arham Gooner",
  "Hammu Impulsive",
  "Abbas Degenrate",
  "Ameer First One There",
  "Mujtaba Doctor",
  "Asad Bricked",
  "Ali Mehdi Copper",
  "Syedna Bhabi"
];

let hangouts = [];
let editingId = null;

const $ = id => document.getElementById(id);
const modal = $("modal");

let supabaseClient = null;

function isConfigured() {
  return SUPABASE_URL && SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes("PASTE_YOUR") &&
    !SUPABASE_ANON_KEY.includes("PASTE_YOUR");
}

function getClient() {
  if (!isConfigured()) return null;
  if (!supabaseClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

async function loadData() {
  const client = getClient();
  if (!client) {
    showSetupMessage();
    return;
  }

  const { data, error } = await client
    .from("hangouts")
    .select("id,name,date,attendees")
    .order("date", { ascending: false });

  if (error) {
    console.error(error);
    alert("Could not load the shared tracker. Check your Supabase setup and RLS policies.");
    return;
  }

  hangouts = data || [];
  render();
}

function showSetupMessage() {
  $("hangouts").innerHTML = `<div class="empty">Supabase is not connected yet.<br>Paste your Supabase URL and public/anon key into <b>supabase-config.js</b>.</div>`;
  render();
}

function formatDate(date) {
  if (!date) return "";
  return new Date(date + "T12:00:00").toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric"
  });
}

function render() {
  const total = hangouts.length;
  const checkins = hangouts.reduce((sum, h) => sum + (h.attendees || []).length, 0);
  const possible = total * people.length;
  const groupPct = possible ? Math.round(checkins / possible * 100) : 0;

  $("totalHangouts").textContent = total;
  $("totalCheckins").textContent = checkins;
  $("groupAttendance").textContent = groupPct + "%";

  const stats = people.map(name => {
    const count = hangouts.filter(h => (h.attendees || []).includes(name)).length;
    const pct = total ? Math.round(count / total * 100) : 0;
    return { name, count, pct };
  }).sort((a,b) => b.pct - a.pct || b.count - a.count);

  $("topFriend").textContent = total && stats[0].count ? stats[0].name : "—";

  $("leaderboard").innerHTML = stats.map((p, i) => `
    <div class="rank-row">
      <div class="rank">#${i + 1}</div>
      <div>
        <div class="friend-name">${escapeHtml(p.name)}</div>
        <div class="friend-sub">${p.count} of ${total} hangouts</div>
        <div class="bar"><div style="width:${p.pct}%"></div></div>
      </div>
      <div class="percent">${p.pct}%</div>
    </div>
  `).join("");

  const sorted = [...hangouts].sort((a,b) => b.date.localeCompare(a.date));
  $("hangouts").innerHTML = sorted.length ? sorted.map(h => `
    <div class="hangout" onclick="editHangout(${h.id})">
      <div>
        <div class="hangout-title">${escapeHtml(h.name || "Hangout")}</div>
        <div class="hangout-date">${formatDate(h.date)}</div>
      </div>
      <div class="checkins">${(h.attendees || []).length}/${people.length} showed up →</div>
    </div>
  `).join("") : `<div class="empty">No hangouts yet.<br>Add the first one and start keeping score.</div>`;
}

function openModal(h = null) {
  editingId = h?.id ?? null;
  $("modalTitle").textContent = h ? "Edit Hangout" : "Add Hangout";
  $("hangoutName").value = h?.name || "";
  $("hangoutDate").value = h?.date || new Date().toISOString().slice(0,10);
  $("deleteBtn").classList.toggle("hidden", !h);

  $("peopleList").innerHTML = people.map(name => {
    const checked = h?.attendees?.includes(name) ? "checked" : "";
    return `<label class="person"><input type="checkbox" value="${escapeHtml(name)}" ${checked}> <span>${escapeHtml(name)}</span></label>`;
  }).join("");

  modal.classList.remove("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
  editingId = null;
}

$("addBtn").onclick = () => openModal();
$("closeBtn").onclick = closeModal;
$("cancelBtn").onclick = closeModal;

$("toggleAll").onclick = () => {
  const boxes = [...document.querySelectorAll("#peopleList input")];
  const shouldCheck = boxes.some(b => !b.checked);
  boxes.forEach(b => b.checked = shouldCheck);
  $("toggleAll").textContent = shouldCheck ? "Deselect all" : "Select all";
};

$("saveBtn").onclick = async () => {
  const client = getClient();
  if (!client) return alert("Connect Supabase first by filling in supabase-config.js.");

  const name = $("hangoutName").value.trim() || "Hangout";
  const date = $("hangoutDate").value;
  const attendees = [...document.querySelectorAll("#peopleList input:checked")].map(x => x.value);

  if (!date) return alert("Please choose a date.");

  let error;
  if (editingId !== null) {
    ({ error } = await client.from("hangouts").update({ name, date, attendees }).eq("id", editingId));
  } else {
    ({ error } = await client.from("hangouts").insert({ name, date, attendees }));
  }

  if (error) {
    console.error(error);
    return alert("Could not save the hangout. Check your Supabase table and policies.");
  }

  closeModal();
  await loadData();
};

$("deleteBtn").onclick = async () => {
  const client = getClient();
  if (!client || editingId === null) return;
  if (!confirm("Delete this hangout?")) return;

  const { error } = await client.from("hangouts").delete().eq("id", editingId);
  if (error) {
    console.error(error);
    return alert("Could not delete the hangout.");
  }

  closeModal();
  await loadData();
};

$("resetBtn").onclick = async () => {
  const client = getClient();
  if (!client) return alert("Connect Supabase first by filling in supabase-config.js.");
  if (!confirm("Reset every hangout and attendance record for everyone?")) return;

  const { error } = await client.from("hangouts").delete().not("id", "is", null);
  if (error) {
    console.error(error);
    return alert("Could not reset the tracker.");
  }

  await loadData();
};

window.editHangout = id => {
  const h = hangouts.find(x => Number(x.id) === Number(id));
  if (h) openModal(h);
};

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}

loadData();
