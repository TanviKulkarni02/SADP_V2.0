/* src/main/resources/static/script.js */

const API_BASE = "/api";

// --- UI HELPERS (Navbar & Toasts) ---
document.addEventListener("DOMContentLoaded", () => {
    // 1. Inject Navbar
    const nav = document.getElementById("navbar");
    const token = localStorage.getItem("token");

    let navContent = `<a href="index.html" class="nav-brand">EduConnect</a>`;

    if (token) {
        navContent += `
            <div class="nav-links">
                <button onclick="logout()" class="secondary" style="padding: 0.5rem 1rem; font-size: 0.85rem;">Logout</button>
            </div>
        `;
    } else {
        if (!window.location.pathname.includes('login.html') && !window.location.pathname.includes('register.html')) {
             navContent += `
                <div class="nav-links">
                    <button onclick="window.location.href='login.html'" class="primary">Login</button>
                </div>
            `;
        }
    }
    if(nav) nav.innerHTML = navContent;

    // 2. Create Toast Container
    const toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    document.body.appendChild(toastContainer);

    // 3. AUTO-FILL ID (New Feature)
    // If we are on the dashboard, check if we have a saved ID from registration
    const instInput = document.getElementById("instIdInput");
    if(instInput) {
        const savedId = localStorage.getItem("saved_inst_id");
        if(savedId) {
            instInput.value = savedId;
            // Optional: Auto-load if you prefer, but let's let user click to be safe
            // loadInstitutionDashboard();
        }
    }
});

function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- AUTH HELPER ---
function getToken() { return localStorage.getItem("token"); }
function getAuthHeaders() { return { "Authorization": `Bearer ${getToken()}` }; }

function logout() {
    localStorage.removeItem("token");
    sessionStorage.clear();
    window.location.href = "login.html";
}

// --- REGISTRATION (Updated to Save ID) ---
const registerForm = document.getElementById("registerForm");
if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = {
            name: document.getElementById("name").value,
            type: document.getElementById("type").value,
            email: document.getElementById("email").value,
            phone: document.getElementById("phone").value,
            address: document.getElementById("address").value,
            website: document.getElementById("website").value
        };

        try {
            const res = await fetch(`${API_BASE}/institutions/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            const result = await res.json();

            if (res.ok) {
                // FEATURE: Save ID to local storage so they don't forget it
                localStorage.setItem("saved_inst_id", result.id);

                alert(`Registration Successful!\n\nIMPORTANT: Your Institution ID is: ${result.id}\nWe have auto-saved this for your next login.`);
                window.location.href = "login.html";
            } else {
                showToast("Registration failed", "error");
            }
        } catch (err) {
            console.error(err);
            showToast("Error connecting to server", "error");
        }
    });
}

// --- LOGIN ---
const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const loginData = {
            username: document.getElementById("username").value,
            password: document.getElementById("password").value
        };

        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(loginData)
            });

            if (res.ok) {
                const token = await res.text();
                localStorage.setItem("token", token);
                const isAdmin = document.getElementById("isAdmin").checked;
                window.location.href = isAdmin ? "admin.html" : "institution.html";
            } else {
                showToast("Invalid Credentials", "error");
            }
        } catch (err) {
            console.error(err);
            showToast("Login Error: " + err.message, "error");
        }
    });
}

// --- INSTITUTION DASHBOARD (FIXED VALIDATION) ---
async function loadInstitutionDashboard() {
    const instId = document.getElementById("instIdInput").value;
    if (!instId) return showToast("Please enter an ID", "error");

    // Do NOT hide ID section yet. Verify first.

    try {
        const res = await fetch(`${API_BASE}/institutions/${instId}/status`, {
            headers: getAuthHeaders()
        });

        // --- SECURITY CHECK ---
        if (res.status === 403 || res.status === 401) {
            // STOP! This ID does not belong to the logged-in user
            showToast("⛔ Access Denied: You do not own this Institution ID.", "error");
            return; // Exit function, do not show dashboard
        }

        // Only proceed if status is OK (200) or Not Found (404 - means new/no docs) or Server Error (500)

        sessionStorage.setItem("currentInstId", instId);
        // NOW we can hide the input section
        document.getElementById("idSection").classList.add("hidden");
        document.getElementById("dashboardContent").classList.remove("hidden");

        const badge = document.getElementById("welcomeBadge");
        if(badge) badge.innerText = `Session ID: ${instId}`;

        if (res.status === 404 || res.status === 500) {
            renderState("NEW");
        } else {
            const status = await res.text();
            const localUploadFlag = localStorage.getItem(`hasUploaded_${instId}`);

            if (status === "PENDING" && !localUploadFlag) {
                renderState("NEW");
            } else {
                renderState(status);
            }
        }
    } catch (err) {
        console.error(err);
        showToast("Connection Error", "error");
    }
}

function renderState(status) {
    const els = {
        status: document.getElementById("statusSection"),
        display: document.getElementById("statusDisplay"),
        upload: document.getElementById("uploadSection"),
        wait: document.getElementById("waitMessage"),
        course: document.getElementById("courseSection"),
        reason: document.getElementById("rejectionReason")
    };

    Object.values(els).forEach(el => { if(el) el.classList.add("hidden"); });

    if (status === "NEW") {
        if(els.upload) els.upload.classList.remove("hidden");
    }
    else if (status === "PENDING") {
        if(els.status) els.status.classList.remove("hidden");
        if(els.display) {
            els.display.textContent = "VERIFICATION PENDING";
            els.display.className = "status-card status-PENDING";
        }
        if(els.wait) els.wait.classList.remove("hidden");
    }
    else if (status === "APPROVED") {
        if(els.status) els.status.classList.remove("hidden");
        if(els.display) {
            els.display.textContent = "ACTIVE & APPROVED";
            els.display.className = "status-card status-APPROVED";
        }
        if(els.course) els.course.classList.remove("hidden");
    }
    else if (status === "REJECTED") {
        if(els.status) els.status.classList.remove("hidden");
        if(els.display) {
            els.display.textContent = "APPLICATION REJECTED";
            els.display.className = "status-card status-REJECTED";
        }
        if(els.reason) {
            els.reason.classList.remove("hidden");
            els.reason.innerText = "Application Rejected. Please upload corrected documents.";
        }
        if(els.upload) els.upload.classList.remove("hidden");
    }
}

// --- UPLOAD HANDLER ---
const uploadForm = document.getElementById("uploadForm");
if (uploadForm) {
    uploadForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const instId = sessionStorage.getItem("currentInstId");
        const formData = new FormData();
        formData.append("file", document.getElementById("docFile").files[0]);

        try {
            const res = await fetch(`${API_BASE}/institutions/${instId}/documents/upload`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${getToken()}` },
                body: formData
            });

            if (res.ok) {
                localStorage.setItem(`hasUploaded_${instId}`, "true");
                showToast("Document Uploaded! Verification Pending.");
                setTimeout(() => location.reload(), 1500);
            } else {
                if(res.status === 403) showToast("You are not authorized to upload for this ID", "error");
                else showToast("Upload Failed", "error");
            }
        } catch (err) {
            showToast("Error uploading", "error");
        }
    });
}

// --- ADD COURSE ---
const courseForm = document.getElementById("courseForm");
if (courseForm) {
    courseForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const instId = sessionStorage.getItem("currentInstId");

        const data = {
            courseName: document.getElementById("courseName").value,
            courseDescription: document.getElementById("courseDescription").value
        };

        try {
            const res = await fetch(`${API_BASE}/institutions/${instId}/courses`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${getToken()}`
                },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                showToast("Course Added Successfully!");
                e.target.reset();
            } else {
                showToast("Failed to add course", "error");
            }
        } catch (err) {
            showToast("Error adding course", "error");
        }
    });
}

// --- ADMIN DASHBOARD ---
async function loadAdminView() {
    const instId = document.getElementById("adminInstId").value;
    if (!instId) return showToast("Enter ID", "error");
    sessionStorage.setItem("adminTargetId", instId);

    try {
        const res = await fetch(`${API_BASE}/institutions/${instId}/documents`, {
            headers: getAuthHeaders()
        });

        if (res.ok) {
            const docs = await res.json();
            const list = document.getElementById("docList");
            list.innerHTML = "";
            document.getElementById("adminContent").classList.remove("hidden");

            if (docs.length === 0) {
                document.getElementById("noDocsMsg").classList.remove("hidden");
            } else {
                document.getElementById("noDocsMsg").classList.add("hidden");
                docs.forEach(doc => {
                    const li = document.createElement("li");
                    li.innerHTML = `
                        <span>${doc.fileName}</span>
                        <button class="secondary" onclick="downloadDoc(${instId}, ${doc.id}, '${doc.fileName}')">Download</button>
                    `;
                    list.appendChild(li);
                });
            }
        } else {
            showToast("Could not fetch documents. Check ID.", "error");
        }
    } catch (err) {
        showToast("Error fetching documents", "error");
    }
}

async function downloadDoc(instId, docId, fileName) {
    try {
        const res = await fetch(`${API_BASE}/institutions/${instId}/documents/${docId}`, {
            headers: getAuthHeaders()
        });

        if(res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } else {
            showToast("Download failed", "error");
        }
    } catch(err) {
        showToast("Error downloading file", "error");
    }
}

function toggleRejectBox() {
    document.getElementById("rejectBox").classList.toggle("hidden");
}

async function verifyInstitution(approve) {
    const instId = sessionStorage.getItem("adminTargetId");
    let url = `${API_BASE}/institutions/${instId}/verify?approve=${approve}`;

    if (!approve) {
        const reason = document.getElementById("rejectReason").value;
        if (!reason) return showToast("Please provide a rejection reason", "error");
        url += `&reason=${encodeURIComponent(reason)}`;
    }

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: getAuthHeaders()
        });

        if (res.ok) {
            showToast(approve ? "Institution Approved" : "Institution Rejected");
            setTimeout(() => location.reload(), 1500);
        } else {
            showToast("Action failed", "error");
        }
    } catch (err) {
        showToast("Error processing verification", "error");
    }
}