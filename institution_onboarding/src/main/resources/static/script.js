/* src/main/resources/static/script.js */

const API_BASE = "http://localhost:8080/api";

// --- DEBUG HELPER ---
function debugLog(msg, data = null) {
    if (data) console.log(`[DEBUG]: ${msg}`, data);
    else console.log(`[DEBUG]: ${msg}`);
}

// --- UI INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    // 1. Inject Navbar
    const nav = document.getElementById("navbar");
    if(nav) {
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
        nav.innerHTML = navContent;
    }

    // 2. Create Toast Container
    const toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    document.body.appendChild(toastContainer);

    // 3. Auto-fill ID
    const instInput = document.getElementById("instIdInput");
    if(instInput) {
        const savedId = localStorage.getItem("saved_inst_id");
        if(savedId) instInput.value = savedId;
    }
});

// --- TOAST NOTIFICATION ---
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

// --- AUTH HELPERS ---
function getToken() { return localStorage.getItem("token"); }
function getAuthHeaders() { return { "Authorization": `Bearer ${getToken()}` }; }

function logout() {
    localStorage.removeItem("token");
    sessionStorage.clear();
    window.location.href = "login.html";
}

// --- REGISTRATION ---
const registerForm = document.getElementById("registerForm");
if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Password Validation
        const password = document.getElementById("registerPassword").value;
        const pwRegex = /^(?=.*[A-Z])(?=.*\d)[A-Za-z0-9]{8,}$/;

        if (!pwRegex.test(password)) {
            showToast("Password: Min 8 chars, 1 Upper, 1 Digit. (No Special Chars)", "error");
            return;
        }

        const data = {
            name: document.getElementById("name").value,
            type: document.getElementById("type").value,
            email: document.getElementById("email").value,
            phone: document.getElementById("phone").value,
            address: document.getElementById("address").value,
            website: document.getElementById("website").value,
            password: password
        };

        try {
            const res = await fetch(`${API_BASE}/institutions/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            const result = await res.json();

            if (res.ok) {
                localStorage.setItem("saved_inst_id", result.id);
                alert(`Registration Successful!\n\nID: ${result.id}\n(Saved for next login)`);
                window.location.href = "login.html";
            } else {
                showToast("Registration failed.", "error");
            }
        } catch (err) {
            console.error(err);
            showToast("Server error during registration", "error");
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
            showToast("Login Connection Error", "error");
        }
    });
}

// --- INSTITUTION DASHBOARD ---
async function loadInstitutionDashboard() {
    const instId = document.getElementById("instIdInput").value;
    if (!instId) return showToast("Please enter an ID", "error");

    try {
        const res = await fetch(`${API_BASE}/institutions/${instId}/status`, {
            headers: getAuthHeaders()
        });

        if (res.status === 403 || res.status === 401) {
            showToast("⛔ Access Denied: You do not own this ID.", "error");
            return;
        }

        // Save ID immediately if access is allowed
        sessionStorage.setItem("currentInstId", instId);

        if (res.status === 404 || res.status === 500) {
            showDashboard();
            renderState("NEW", null);
            return;
        }

        // --- REJECTION REASON DEBUGGING & PARSING ---
        const rawText = await res.text();
        debugLog("RAW STATUS RESPONSE (Check Console!):", rawText); // <--- CHECK THIS IN CONSOLE

        let status = "";
        let reason = null;

        try {
            const data = JSON.parse(rawText);
            if (typeof data === 'object' && data !== null) {
                // If backend returns the Entity Object
                status = data.status;
                // Check both possible field names
                reason = data.rejectionReason || data.reason;
            } else {
                // If backend returns simple string "REJECTED"
                status = data;
            }
        } catch (e) {
            // Fallback: it's a plain text string
            status = rawText;
        }

        showDashboard(instId);

        const localUploadFlag = localStorage.getItem(`hasUploaded_${instId}`);
        if (status === "PENDING" && !localUploadFlag) {
            renderState("NEW", null);
        } else {
            renderState(status, reason);
        }

    } catch (err) {
        console.error(err);
        showToast("Connection Error", "error");
    }
}

function showDashboard(instId) {
    document.getElementById("idSection").classList.add("hidden");
    document.getElementById("dashboardContent").classList.remove("hidden");
    const badge = document.getElementById("welcomeBadge");
    if(badge && instId) badge.innerText = `Session ID: ${instId}`;
}

// --- STATE RENDERER ---
function renderState(status, rejectionReasonText) {
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

        // TRIGGER COURSE FETCH HERE
        fetchCourses();
    }
    else if (status === "REJECTED") {
        if(els.status) els.status.classList.remove("hidden");
        if(els.display) {
            els.display.textContent = "APPLICATION REJECTED";
            els.display.className = "status-card status-REJECTED";
        }

        if(els.reason) {
            els.reason.classList.remove("hidden");
            const reasonText = (rejectionReasonText && rejectionReasonText.trim() !== "")
                ? rejectionReasonText
                : "Admin did not provide specific details (or backend returned plain string).";
            els.reason.innerHTML = `<strong>Reason:</strong> ${reasonText}<br><small style='opacity:0.8'>Please re-upload documents.</small>`;
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
                showToast("Upload Failed", "error");
            }
        } catch (err) {
            showToast("Error uploading", "error");
        }
    });
}

// --- FETCH COURSES (FIXED) ---
async function fetchCourses() {
    const instId = sessionStorage.getItem("currentInstId");
    debugLog(`Fetching courses for ID: ${instId}`);

    if(!instId) return;

    try {
        const res = await fetch(`${API_BASE}/institutions/${instId}/courses`, {
            headers: getAuthHeaders()
        });

        debugLog(`Course Fetch Status: ${res.status}`);

        if(res.ok) {
            const courses = await res.json();
            debugLog("Courses Received:", courses);

            const list = document.getElementById("courseList");
            const msg = document.getElementById("noCoursesMsg");

            if(list) list.innerHTML = ""; // Clear existing

            if(courses && courses.length > 0) {
                if(msg) msg.classList.add("hidden");

                courses.forEach(c => {
                    const li = document.createElement("li");
                    li.innerHTML = `
                        <div style="display:flex; flex-direction:column;">
                            <span style="font-weight:bold; color:var(--primary); font-size:1rem;">${c.courseName}</span>
                            <span style="font-size:0.9rem; color:var(--text-muted);">${c.courseDescription}</span>
                        </div>
                    `;
                    list.appendChild(li);
                });
            } else {
                if(msg) msg.classList.remove("hidden");
            }
        }
    } catch(err) {
        console.error("Failed to load courses:", err);
    }
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
                showToast("Course Added!");
                document.getElementById("courseForm").reset();
                fetchCourses(); // Refresh list immediately
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
        const res = await fetch(`${API_BASE}/institutions/${instId}/documents`, { headers: getAuthHeaders() });
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
                    li.innerHTML = `<span>${doc.fileName}</span> <button class="secondary" onclick="downloadDoc(${instId}, ${doc.id}, '${doc.fileName}')">Download</button>`;
                    list.appendChild(li);
                });
            }
        } else { showToast("Could not fetch documents", "error"); }
    } catch (err) { showToast("Error fetching", "error"); }
}

async function downloadDoc(instId, docId, fileName) {
    try {
        const res = await fetch(`${API_BASE}/institutions/${instId}/documents/${docId}`, { headers: getAuthHeaders() });
        if(res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = fileName;
            document.body.appendChild(a); a.click(); a.remove();
        } else { showToast("Download failed", "error"); }
    } catch(e) { showToast("Download error", "error"); }
}

function toggleRejectBox() { document.getElementById("rejectBox").classList.toggle("hidden"); }

async function verifyInstitution(approve) {
    const instId = sessionStorage.getItem("adminTargetId");
    let url = `${API_BASE}/institutions/${instId}/verify?approve=${approve}`;
    if (!approve) {
        const reason = document.getElementById("rejectReason").value;
        if (!reason) return showToast("Enter rejection reason", "error");
        url += `&reason=${encodeURIComponent(reason)}`;
    }
    try {
        const res = await fetch(url, { method: "POST", headers: getAuthHeaders() });
        if (res.ok) {
            showToast(approve ? "Approved" : "Rejected");
            setTimeout(() => location.reload(), 1500);
        } else { showToast("Action failed", "error"); }
    } catch (e) { showToast("Error", "error"); }
}