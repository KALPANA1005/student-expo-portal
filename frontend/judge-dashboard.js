// ================================================================
// AUTH CHECK — must be logged in as judge (real backend login)
// ================================================================
const judgeToken = localStorage.getItem("token");
const judgeUser = JSON.parse(localStorage.getItem("user") || "null");

if (!judgeToken || !judgeUser || judgeUser.role !== "judge") {
  window.location.href = "index.html";
}

let projects = [];          // cached list from the backend
let selectedProjectId = null;

// ================================================================
// Helper: calls the backend with the JWT token attached automatically
// ================================================================
async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${judgeToken}`,
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
  if (!response.ok || data.success === false) {
    throw new Error(data.message || "Something went wrong");
  }
  return data;
}

function showStatus(message, type) {
  const box = document.getElementById("statusMsg");
  box.textContent = message;
  box.className = "status-msg " + type;
  setTimeout(() => { box.className = "status-msg"; }, 4000);
}

// ================================================================
// PAGE LOAD
// ================================================================
window.onload = async function () {
  document.getElementById("welcomeText").textContent = "Welcome, " + judgeUser.name;
  document.getElementById("avatarInitials").textContent = judgeUser.name.substring(0, 2).toUpperCase();
  await loadProjects();
};

// ---------------- LOAD ASSIGNED PROJECTS ----------------
// Only shows projects Admin has approved AND assigned to this judge
async function loadProjects() {
  try {
    const data = await apiFetch("/judge/projects");
    projects = data.projects;
    document.getElementById("subText").textContent = `${projects.length} project(s) assigned`;
    renderProjectList();
  } catch (err) {
    showStatus(err.message, "error");
  }
}

function renderProjectList() {
  const list = document.getElementById("projectList");

  if (!projects.length) {
    list.innerHTML = `<div class="muted small">No projects assigned to you yet. Admin will assign approved projects here.</div>`;
    return;
  }

  list.innerHTML = projects
    .map(
      (p) => `
      <div class="project-item ${p._id === selectedProjectId ? "selected" : ""}" onclick="selectProject('${p._id}')">
        <div>${p.teamName}</div>
        <div class="p-domain">${p.projectTitle}</div>
        ${p.evaluated ? '<div class="evaluated-tag">✓ Marks submitted</div>' : ""}
      </div>`
    )
    .join("");
}

// ---------------- SELECT A PROJECT TO EVALUATE ----------------
function selectProject(id) {
  const project = projects.find((p) => p._id === id);

  if (project.evaluated) {
    showStatus("Marks already submitted for this project. You cannot edit them.", "error");
    return;
  }

  selectedProjectId = id;
  renderProjectList();

  document.getElementById("noProjectSelected").classList.add("hidden");
  document.getElementById("evalFormBox").classList.remove("hidden");

  document.getElementById("evalTeamName").textContent = project.teamName;
  document.getElementById("evalProjectTitle").textContent = project.projectTitle + " · " + project.projectDomain;

  // Real PPT/PDF download link — file is served by the backend's /uploads route
  const downloadBtn = document.getElementById("downloadBtn");
  if (project.filePath) {
    downloadBtn.href = "http://localhost:5000" + project.filePath;
    downloadBtn.textContent = "⬇ Download " + (project.fileType === "pdf" ? "PDF" : "PPT");
    downloadBtn.classList.remove("hidden");
  } else {
    downloadBtn.href = "#";
    downloadBtn.textContent = "No file uploaded";
    downloadBtn.classList.add("hidden");
  }

  // Reset the evaluation form for the newly selected project
  ["presentation", "technicalKnowledge", "innovation", "documentation"].forEach((id2) => {
    document.getElementById(id2).value = 0;
  });
  document.getElementById("remarks").value = "";
  updateTotal();
}

// ---------------- LIVE TOTAL WHILE DRAGGING SLIDERS ----------------
function updateTotal() {
  const presentation = Number(document.getElementById("presentation").value);
  const technical = Number(document.getElementById("technicalKnowledge").value);
  const innovation = Number(document.getElementById("innovation").value);
  const documentation = Number(document.getElementById("documentation").value);

  document.getElementById("val_presentation").textContent = presentation + "/30";
  document.getElementById("val_technical").textContent = technical + "/30";
  document.getElementById("val_innovation").textContent = innovation + "/20";
  document.getElementById("val_documentation").textContent = documentation + "/20";

  const total = presentation + technical + innovation + documentation;
  document.getElementById("totalScore").innerHTML = total + "<small>/100</small>";
}

// ---------------- SUBMIT EVALUATION (REAL backend, saves to MongoDB) ----------------
async function submitEvaluation(event) {
  event.preventDefault();

  const payload = {
    presentation: Number(document.getElementById("presentation").value),
    technicalKnowledge: Number(document.getElementById("technicalKnowledge").value),
    innovation: Number(document.getElementById("innovation").value),
    documentation: Number(document.getElementById("documentation").value),
    remarks: document.getElementById("remarks").value,
  };

  const submitBtn = document.getElementById("submitEvalBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  try {
    await apiFetch(`/judge/evaluate/${selectedProjectId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    showStatus("Marks submitted successfully. This project is now locked.", "success");

    document.getElementById("evalFormBox").classList.add("hidden");
    document.getElementById("noProjectSelected").classList.remove("hidden");
    selectedProjectId = null;

    await loadProjects(); // refresh list so the "✓ Marks submitted" tag shows
  } catch (err) {
    showStatus(err.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit marks";
  }
}

// ---------------- LOGOUT ----------------
document.getElementById("logoutBtn").addEventListener("click", function () {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "index.html";
});
