const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !user || user.role !== "student") window.location.href = "index.html";

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
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

window.onload = async function () {
  document.getElementById("welcomeText").textContent = "Welcome back, " + user.name;
  document.getElementById("avatarInitials").textContent = user.name.substring(0, 2).toUpperCase();
  await loadProfile();
  await loadProject();
  await loadEvent();
  await loadJudge();
  await loadNotifications();
  await loadResult();
};

async function loadProfile() {
  try {
    const data = await apiFetch("/students/profile");
    const p = data.profile;
    document.getElementById("subText").textContent = `Register no: ${p.registerNumber} · ${p.department} · Year ${p.year}`;
    document.getElementById("p_name").value = p.name;
    document.getElementById("p_regNo").value = p.registerNumber;
    document.getElementById("p_department").value = p.department;
    document.getElementById("p_year").value = p.year;
    document.getElementById("p_email").value = p.email;
    document.getElementById("p_phone").value = p.phone;
  } catch (err) { showStatus(err.message, "error"); }
}

async function saveProfile(event) {
  event.preventDefault();
  try {
    await apiFetch("/students/profile", {
      method: "PUT",
      body: JSON.stringify({
        name: document.getElementById("p_name").value,
        department: document.getElementById("p_department").value,
        year: document.getElementById("p_year").value,
        phone: document.getElementById("p_phone").value,
      }),
    });
    showStatus("Profile updated successfully", "success");
    loadProfile();
  } catch (err) { showStatus(err.message, "error"); }
}

async function loadProject() {
  try {
    const data = await apiFetch("/students/project");
    if (data.project) {
      document.getElementById("pr_title").value = data.project.projectTitle;
      document.getElementById("pr_domain").value = data.project.projectDomain;
      document.getElementById("pr_guide").value = data.project.guideName;
      document.getElementById("pr_team").value = data.project.teamName;
      document.getElementById("pr_members").value = data.project.teamMembers.join(", ");
      document.getElementById("projectStatusText").innerHTML = `Current status: <span class="badge ${data.project.status}">${data.project.status}</span>`;
      document.getElementById("pptStatusText").textContent = data.project.filePath ? "File already uploaded: " + data.project.filePath : "No file uploaded yet.";
    } else {
      document.getElementById("projectStatusText").textContent = "You haven't registered a project yet.";
    }
  } catch (err) { showStatus(err.message, "error"); }
}

async function saveProject(event) {
  event.preventDefault();
  try {
    await apiFetch("/students/project", {
      method: "POST",
      body: JSON.stringify({
        projectTitle: document.getElementById("pr_title").value,
        projectDomain: document.getElementById("pr_domain").value,
        guideName: document.getElementById("pr_guide").value,
        teamName: document.getElementById("pr_team").value,
        teamMembers: document.getElementById("pr_members").value,
      }),
    });
    showStatus("Project details saved", "success");
    loadProject();
  } catch (err) { showStatus(err.message, "error"); }
}

async function uploadPPT(event) {
  event.preventDefault();
  const fileInput = document.getElementById("pptFile");
  if (!fileInput.files.length) return;
  const formData = new FormData();
  formData.append("file", fileInput.files[0]);
  try {
    const data = await apiFetch("/students/upload-ppt", { method: "POST", body: formData });
    showStatus("File uploaded successfully", "success");
    document.getElementById("pptStatusText").textContent = "Uploaded: " + data.filePath;
    loadProject();
  } catch (err) { showStatus(err.message, "error"); }
}

async function loadEvent() {
  try {
    const data = await apiFetch("/students/event");
    const grid = document.getElementById("eventInfoGrid");
    if (!data.event) { grid.textContent = "Event details not set by Admin yet."; return; }
    const e = data.event;
    const fmt = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    grid.innerHTML = `
      <div><span>Registration ends</span><strong>${fmt(e.registrationEndDate)}</strong></div>
      <div><span>Event date</span><strong>${fmt(e.eventDate)}</strong></div>
      <div><span>Venue</span><strong>${e.venue}</strong></div>
      <div><span>Fee</span><strong>₹${e.registrationFees}</strong></div>
      <div><span>Registration status</span><strong>${e.isRegistrationOpen ? "Open" : "Closed"}</strong></div>`;
  } catch (err) { showStatus(err.message, "error"); }
}

async function loadJudge() {
  try {
    const data = await apiFetch("/students/judge");
    const box = document.getElementById("judgeInfoBox");
    if (!data.judge) { box.textContent = "No judge assigned yet."; return; }
    box.innerHTML = `<div class="judge-row"><div class="judge-avatar">${data.judge.name.substring(0, 2).toUpperCase()}</div><div><strong>${data.judge.name}</strong><br><span class="muted">Dept: ${data.judge.department}</span></div></div>`;
  } catch (err) { showStatus(err.message, "error"); }
}

async function loadNotifications() {
  try {
    const data = await apiFetch("/students/notifications");
    const list = document.getElementById("notificationsList");
    if (!data.notifications.length) { list.textContent = "No notifications yet."; return; }
    list.innerHTML = data.notifications.map((n) => `
      <div class="notif-item"><div class="notif-title">${n.title}</div><div>${n.message}</div>
      <div class="notif-time">${new Date(n.createdAt).toLocaleString("en-IN")}</div></div>`).join("");
  } catch (err) { showStatus(err.message, "error"); }
}

async function loadResult() {
  try {
    const data = await apiFetch("/students/result");
    const box = document.getElementById("resultBox");
    if (!data.published) { box.textContent = "Result has not been published yet."; return; }
    if (!data.result) { box.textContent = "Result published, but your project hasn't been evaluated yet."; return; }
    box.innerHTML = `<div class="muted">Team: ${data.result.teamName}</div>
      <div class="result-marks">${data.result.totalMarks}<small style="font-size:14px;color:#8791AC;">/100</small></div>
      <span class="badge Approved">Rank ${data.result.rank}</span>`;
  } catch (err) { showStatus(err.message, "error"); }
}

document.getElementById("logoutBtn").addEventListener("click", function () {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "index.html";
});
