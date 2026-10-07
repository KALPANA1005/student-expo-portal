const adminToken = localStorage.getItem("token");
const adminUser = JSON.parse(localStorage.getItem("user") || "null");

if (!adminToken || !adminUser || adminUser.role !== "admin") window.location.href = "index.html";

let allProjects = [];   // cached so search filter doesn't need a re-fetch
let allJudges = [];

// ---------------- Shared helpers ----------------
async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}`, ...options.headers },
  });
  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "index.html";
    throw new Error("Session expired");
  }
  const data = await response.json();
  if (!response.ok || data.success === false) throw new Error(data.message || "Something went wrong");
  return data;
}

function showStatus(message, type) {
  const box = document.getElementById("statusMsg");
  box.textContent = message;
  box.className = "status-msg " + type;
  setTimeout(() => { box.className = "status-msg"; }, 4000);
}

function showSection(name, link) {
  document.querySelectorAll(".section").forEach((s) => s.classList.add("hidden"));
  document.getElementById("section-" + name).classList.remove("hidden");
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
  link.classList.add("active");
}

// ---------------- Page load ----------------
window.onload = async function () {
  document.getElementById("avatarInitials").textContent = adminUser.name.substring(0, 2).toUpperCase();
  await loadStats();
  await loadProjects();
  await loadJudges();
  await loadEventForAdmin();
  await loadActivity();
};

// ---------------- STATS ----------------
async function loadStats() {
  try {
    const data = await apiFetch("/admin/stats");
    const s = data.stats;
    document.getElementById("regCount").textContent = `${s.totalRegistrations}/${s.maxRegistrations}`;
    document.getElementById("approvedCount").textContent = s.approved;
    document.getElementById("rejectedCount").textContent = s.rejected;
    document.getElementById("judgeCount").textContent = s.totalJudges;
    document.getElementById("pptCount").textContent = s.totalPPTUploads;
  } catch (err) { showStatus(err.message, "error"); }
}

// ---------------- PROJECTS (Student management + PPT verification) ----------------
async function loadProjects() {
  try {
    const data = await apiFetch("/admin/projects");
    allProjects = data.projects;
    renderStudentTable(allProjects);
    renderPPTTable(allProjects);
  } catch (err) { showStatus(err.message, "error"); }
}

function judgeDropdown(project) {
  const options = allJudges
    .map((j) => `<option value="${j._id}" ${project.assignedJudge?._id === j._id ? "selected" : ""}>${j.name}</option>`)
    .join("");
  return `<select class="judge-select" onchange="assignJudge('${project._id}', this.value)">
            <option value="">-- Assign --</option>${options}
          </select>`;
}

function renderStudentTable(list) {
  const tbody = document.getElementById("studentTableBody");
  if (!list.length) { tbody.innerHTML = `<tr><td colspan="5">No projects registered yet.</td></tr>`; return; }

  tbody.innerHTML = list.map((p) => `
    <tr>
      <td>${p.student?.name || "—"}</td>
      <td>${p.student?.department || "—"}</td>
      <td><span class="status-badge ${p.status}">${p.status}</span></td>
      <td>${judgeDropdown(p)}</td>
      <td class="action-btns">
        <button class="btn-approve" onclick="approveProject('${p._id}')">Approve</button>
        <button class="btn-reject" onclick="rejectProject('${p._id}')">Reject</button>
      </td>
    </tr>`).join("");
}

function renderPPTTable(list) {
  const tbody = document.getElementById("pptTableBody");
  if (!list.length) { tbody.innerHTML = `<tr><td colspan="5">No projects yet.</td></tr>`; return; }

  tbody.innerHTML = list.map((p) => `
    <tr>
      <td>${p.teamName}</td>
      <td>${p.projectTitle}</td>
      <td>${p.filePath ? `<a href="http://localhost:5000${p.filePath}" target="_blank">View file</a>` : "Not uploaded"}</td>
      <td><span class="status-badge ${p.status}">${p.status}</span></td>
      <td class="action-btns">
        <button class="btn-approve" onclick="approveProject('${p._id}')">Approve</button>
        <button class="btn-reject" onclick="rejectProject('${p._id}')">Reject</button>
      </td>
    </tr>`).join("");
}

function filterStudents() {
  const query = document.getElementById("searchInput").value.toLowerCase();
  const filtered = allProjects.filter((p) => (p.student?.name || "").toLowerCase().includes(query));
  renderStudentTable(filtered);
}

// Approve/Reject call the real backend -> updates MongoDB, creates a
// Notification, and sends the automatic email (handled server-side)
async function approveProject(id) {
  try {
    await apiFetch(`/admin/projects/${id}/approve`, { method: "PUT" });
    showStatus("Project approved. Student notified by email.", "success");
    await loadStats();
    await loadProjects();
    await loadActivity();
  } catch (err) { showStatus(err.message, "error"); }
}

async function rejectProject(id) {
  try {
    await apiFetch(`/admin/projects/${id}/reject`, { method: "PUT" });
    showStatus("Project rejected. Student notified by email.", "success");
    await loadStats();
    await loadProjects();
    await loadActivity();
  } catch (err) { showStatus(err.message, "error"); }
}

async function assignJudge(projectId, judgeId) {
  if (!judgeId) return;
  try {
    await apiFetch(`/admin/projects/${projectId}/assign-judge`, {
      method: "PUT",
      body: JSON.stringify({ judgeId }),
    });
    showStatus("Judge assigned", "success");
    await loadProjects();
    await loadActivity();
  } catch (err) { showStatus(err.message, "error"); }
}

// ---------------- JUDGES ----------------
async function loadJudges() {
  try {
    const data = await apiFetch("/admin/judges");
    allJudges = data.judges;
    renderJudgeTable(allJudges);
  } catch (err) { showStatus(err.message, "error"); }
}

function renderJudgeTable(list) {
  const tbody = document.getElementById("judgeTableBody");
  if (!list.length) { tbody.innerHTML = `<tr><td colspan="4">No judges added yet.</td></tr>`; return; }

  tbody.innerHTML = list.map((j) => `
    <tr>
      <td>${j.name}</td><td>${j.department}</td><td>${j.email}</td>
      <td class="action-btns"><button class="btn-delete" onclick="deleteJudge('${j._id}')">Delete</button></td>
    </tr>`).join("");
}

async function addJudge(event) {
  event.preventDefault();
  try {
    await apiFetch("/admin/judges", {
      method: "POST",
      body: JSON.stringify({
        name: document.getElementById("j_name").value,
        department: document.getElementById("j_department").value,
        email: document.getElementById("j_email").value,
        phone: document.getElementById("j_phone").value,
        password: document.getElementById("j_password").value,
      }),
    });
    showStatus("Judge added successfully", "success");
    document.getElementById("judgeForm").reset();
    await loadJudges();
    await loadStats();
  } catch (err) { showStatus(err.message, "error"); }
}

async function deleteJudge(id) {
  try {
    await apiFetch(`/admin/judges/${id}`, { method: "DELETE" });
    showStatus("Judge deleted", "success");
    await loadJudges();
    await loadStats();
  } catch (err) { showStatus(err.message, "error"); }
}

// ---------------- EVENT MANAGEMENT ----------------
async function loadEventForAdmin() {
  try {
    const data = await apiFetch("/admin/event");
    if (data.event) {
      const e = data.event;
      document.getElementById("e_regStart").value = e.registrationStartDate.substring(0, 10);
      document.getElementById("e_regEnd").value = e.registrationEndDate.substring(0, 10);
      document.getElementById("e_eventDate").value = e.eventDate.substring(0, 10);
      document.getElementById("e_venue").value = e.venue;
      document.getElementById("e_fees").value = e.registrationFees;
      document.getElementById("e_maxReg").value = e.maxRegistrations;
      document.getElementById("e_rules").value = e.rules;
      document.getElementById("e_instructions").value = e.instructions;
      document.getElementById("resultStatusText").textContent = e.isResultPublished
        ? "✅ Result is currently PUBLISHED to students."
        : "Result is not published yet.";
    } else {
      document.getElementById("resultStatusText").textContent = "No event set up yet. Fill the form and save.";
    }
  } catch (err) { showStatus(err.message, "error"); }
}

async function saveEvent(event) {
  event.preventDefault();
  try {
    await apiFetch("/admin/event", {
      method: "POST",
      body: JSON.stringify({
        registrationStartDate: document.getElementById("e_regStart").value,
        registrationEndDate: document.getElementById("e_regEnd").value,
        eventDate: document.getElementById("e_eventDate").value,
        venue: document.getElementById("e_venue").value,
        registrationFees: Number(document.getElementById("e_fees").value),
        maxRegistrations: Number(document.getElementById("e_maxReg").value),
        rules: document.getElementById("e_rules").value,
        instructions: document.getElementById("e_instructions").value,
      }),
    });
    showStatus("Event details saved", "success");
    await loadStats();
  } catch (err) { showStatus(err.message, "error"); }
}

async function publishResult() {
  try {
    await apiFetch("/admin/publish-result", { method: "PUT" });
    showStatus("Result published to all students", "success");
    await loadEventForAdmin();
  } catch (err) { showStatus(err.message, "error"); }
}

// ---------------- ACTIVITY FEED ----------------
async function loadActivity() {
  try {
    const data = await apiFetch("/admin/activity");
    const list = document.getElementById("activityList");

    if (!data.activities.length) {
      list.textContent = "No activity yet.";
      return;
    }

    list.innerHTML = data.activities
      .map(
        (a) => `
        <div class="activity-item">
          <div>${a.icon}</div>
          <div>
            <div>${a.text}</div>
            <div class="activity-time">${new Date(a.time).toLocaleString("en-IN")}</div>
          </div>
        </div>`
      )
      .join("");
  } catch (err) { showStatus(err.message, "error"); }
}

document.getElementById("logoutBtn").addEventListener("click", function () {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "index.html";
});
