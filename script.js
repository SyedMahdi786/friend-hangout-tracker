const people = [
  "Mayedi",
  "Arslan Bona",
  "Arham Gooner",
  "Hammu Impulsive",
  "Abbas Degenrate",
  "Ameer First One There",
  "Mujtaba Doctor",
  "Ali Mehdi Copper",
  "Syedna Bhabi"
];

let hangouts = JSON.parse(localStorage.getItem("friendHangouts") || "[]");
let editingId = null;

const $ = id => document.getElementById(id);
const modal = $("modal");

function saveData() {
  localStorage.setItem("friendHangouts", JSON.stringify(hangouts));
}

function formatDate(date) {
  if (!date) return "";
  return new Date(date + "T12:00:00").toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric"
  });
}

function render() {
  const total = hangouts.length;
  const checkins = hangouts.reduce((sum, h) => sum + h.attendees.length, 0);
  const possible = total * people.length;
  const groupPct = possible ? Math.round(checkins / possible * 100) : 0;

  $("totalHangouts").textContent = total;
  $("totalCheckins").textContent = checkins;
  $("groupAttendance").textContent = groupPct + "%";

  const stats = people.map(name => {
    const count = hangouts.filter(h => h.attendees.includes(name)).length;
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
    <div class="hangout" onclick="editHangout('${h.id}')">
      <div>
        <div class="hangout-title">${escapeHtml(h.name || "Hangout")}</div>
        <div class="hangout-date">${formatDate(h.date)}</div>
      </div>
      <div class="checkins">${h.attendees.length}/${people.length} showed up →</div>
    </div>
  `).join("") : `<div class="empty">No hangouts yet.<br>Add the first one and start keeping score.</div>`;
}

function openModal(h = null) {
  editingId = h?.id || null;
  $("modalTitle").textContent = h ? "Edit Hangout" : "Add Hangout";
  $("hangoutName").value = h?.name || "";
  $("hangoutDate").value = h?.date || new Date().toISOString().slice(0,10);
  $("deleteBtn").classList.toggle("hidden", !h);

  $("peopleList").innerHTML = people.map(name => {
    const checked = h?.attendees.includes(name) ? "checked" : "";
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

$("saveBtn").onclick = () => {
  const name = $("hangoutName").value.trim() || "Hangout";
  const date = $("hangoutDate").value;
  const attendees = [...document.querySelectorAll("#peopleList input:checked")].map(x => x.value);

  if (!date) return alert("Please choose a date.");

  const record = { id: editingId || Date.now().toString(), name, date, attendees };
  if (editingId) {
    hangouts = hangouts.map(h => h.id === editingId ? record : h);
  } else {
    hangouts.push(record);
  }

  saveData();
  render();
  closeModal();
};

$("deleteBtn").onclick = () => {
  if (!editingId) return;
  if (confirm("Delete this hangout?")) {
    hangouts = hangouts.filter(h => h.id !== editingId);
    saveData();
    render();
    closeModal();
  }
};

$("resetBtn").onclick = () => {
  if (confirm("Reset every hangout and attendance record?")) {
    hangouts = [];
    saveData();
    render();
  }
};

window.editHangout = id => {
  const h = hangouts.find(x => x.id === id);
  if (h) openModal(h);
};

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}

render();
