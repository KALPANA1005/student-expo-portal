let selectedRole = "student";

function selectRole(role, btn) {
  selectedRole = role;
  document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  btn.classList.add("active");
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  document.getElementById("submitBtn").textContent = "Sign in as " + roleLabel;
  document.getElementById("email").placeholder = role + "@gmail.com";
  document.getElementById("errorBox").style.display = "none";
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorBox = document.getElementById("errorBox");
  const submitBtn = document.getElementById("submitBtn");
  errorBox.style.display = "none";

  if (!email || !password) {
    errorBox.textContent = "Please enter both email and password";
    errorBox.style.display = "block";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Signing in...";

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login/${selectedRole}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || "Login failed");

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    if (selectedRole === "student") window.location.href = "student-dashboard.html";
    else if (selectedRole === "admin") window.location.href = "admin-dashboard.html";
    else window.location.href = "judge-dashboard.html";
  } catch (err) {
    errorBox.textContent = err.message === "Failed to fetch"
      ? "Cannot reach the server. Is the backend running on port 5000?"
      : err.message;
    errorBox.style.display = "block";
  } finally {
    submitBtn.disabled = false;
    const roleLabel = selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1);
    submitBtn.textContent = "Sign in as " + roleLabel;
  }
}
