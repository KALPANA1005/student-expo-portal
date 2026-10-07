async function handleRegister(event) {
  event.preventDefault();
  const errorBox = document.getElementById("errorBox");
  const successBox = document.getElementById("successBox");
  const submitBtn = document.getElementById("submitBtn");
  errorBox.style.display = "none";
  successBox.style.display = "none";

  const payload = {
    name: document.getElementById("name").value.trim(),
    registerNumber: document.getElementById("registerNumber").value.trim(),
    department: document.getElementById("department").value.trim(),
    year: document.getElementById("year").value,
    email: document.getElementById("email").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    password: document.getElementById("password").value,
  };

  submitBtn.disabled = true;
  submitBtn.textContent = "Creating account...";

  try {
    const response = await fetch(`${API_BASE_URL}/auth/register/student`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || data.errors?.[0]?.msg || "Registration failed");
    }
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    successBox.textContent = "Account created! Redirecting...";
    successBox.style.display = "block";
    setTimeout(() => { window.location.href = "student-dashboard.html"; }, 800);
  } catch (err) {
    errorBox.textContent = err.message === "Failed to fetch"
      ? "Cannot reach the server. Is the backend running on port 5000?"
      : err.message;
    errorBox.style.display = "block";
    submitBtn.disabled = false;
    submitBtn.textContent = "Create account";
  }
}
