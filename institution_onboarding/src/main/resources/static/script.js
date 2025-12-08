/* src/main/resources/static/script.js */

const API_BASE = "http://localhost:8080/api";

// --- GLOBAL STATE ---
let currentInstId = null;     // Institution Side: ID from /me
let currentSelectedId = null; // Admin Side: ID being viewed

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

    // 3. ROUTER LOGIC
    //
    // The router checks the URL to decide which data fetch function to run.

    // IF INSTITUTION DASHBOARD -> Auto Fetch Profile
    if (window.location.pathname.includes("institution.html")) {
        fetchMyProfile();
    }

    // IF ADMIN DASHBOARD -> Load Pending List
    if (window.location.pathname.includes("admin.html")) {
        loadPendingRequests();
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
            //
            // Sending JSON data to the Spring Boot Controller
            const res = await fetch(`${API_BASE}/institutions/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            const result = await res.json();

            if (res.ok) {
                localStorage.setItem("saved_inst_id", result.id);
                alert(`Registration Successful!\n\nID: ${result.id}\n(Auto-login enabled next time)`);
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

// ==========================================
//  INSTITUTION WORKFLOW (THE NEW "ME" API)
// ==========================================

async function fetchMyProfile() {
    const loading = document.getElementById("loadingState");
    const content = document.getElementById("dashboardContent");

    try {
        const res = await fetch(`${API_BASE}/institutions/me`, {
            headers: getAuthHeaders()
        });

        if (res.status === 403 || res.status === 401) {
            alert("Session Expired or Unauthorized. Please Login.");
            logout();
            return;
        }

        if (res.ok) {
            const profile = await res.json();

            // 1. Store ID
            currentInstId = profile.id;
            sessionStorage.setItem("currentInstId", profile.id);

            // 2. Update UI
            document.getElementById("instNameDisplay").innerText = profile.name;
            document.getElementById("instEmailDisplay").innerText = profile.email;
            document.getElementById("userInfoBadge").classList.remove("hidden");

            // 3. Determine State (Local Flag Logic)
            const localUploadFlag = localStorage.getItem(`hasUploaded_${profile.id}`);
            let displayStatus = profile.status;

            // VIVA POINT: This prevents the "Rejection Loop".
            // If backend says PENDING but we haven't uploaded locally -> Treat as NEW
            if (displayStatus === "PENDING" && !localUploadFlag) {
                renderState("NEW", null);
            } else {
                renderState(displayStatus, profile.rejectionReason);
            }

            loading.classList.add("hidden");
            content.classList.remove("hidden");
        } else {
            showToast("Failed to fetch profile.", "error");
        }
    } catch (err) {
        console.error(err);
        showToast("Connection Error", "error");
    }
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

    // Hide All
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
                : "Admin did not provide specific details.";
            els.reason.innerHTML = `<strong>Reason:</strong> ${reasonText}<br><small>Please re-upload documents.</small>`;
        }
        if(els.upload) els.upload.classList.remove("hidden");
    }
}

// --- UPLOAD HANDLER ---
const uploadForm = document.getElementById("uploadForm");
if (uploadForm) {
    uploadForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if(!currentInstId) return showToast("Profile not loaded.", "error");

        const formData = new FormData();
        formData.append("file", document.getElementById("docFile").files[0]);

        try {
            const res = await fetch(`${API_BASE}/institutions/${currentInstId}/documents/upload`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${getToken()}` },
                body: formData
            });

            if (res.ok) {
                // Set flag to force PENDING state on next reload
                localStorage.setItem(`hasUploaded_${currentInstId}`, "true");
                showToast("Document Uploaded! Refreshing...");
                setTimeout(() => location.reload(), 1500);
            } else {
                showToast("Upload Failed", "error");
            }
        } catch (err) {
            showToast("Error uploading", "error");
        }
    });
}

// --- FETCH COURSES ---
async function fetchCourses() {
    if(!currentInstId) return;

    try {
        const res = await fetch(`${API_BASE}/institutions/${currentInstId}/courses`, {
            headers: getAuthHeaders()
        });

        if(res.ok) {
            const courses = await res.json();
            const list = document.getElementById("courseList");
            const msg = document.getElementById("noCoursesMsg");

            if(list) list.innerHTML = "";

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
        if(!currentInstId) return;

        const data = {
            courseName: document.getElementById("courseName").value,
            courseDescription: document.getElementById("courseDescription").value
        };

        try {
            const res = await fetch(`${API_BASE}/institutions/${currentInstId}/courses`, {
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
                fetchCourses();
            } else {
                showToast("Failed to add course", "error");
            }
        } catch (err) {
            showToast("Error adding course", "error");
        }
    });
}

// ==========================================
//   ADMIN DASHBOARD FUNCTIONALITY
// ==========================================

async function loadPendingRequests() {
    const listContainer = document.getElementById("pendingList");
    if(!listContainer) return;

    listContainer.innerHTML = "<div style='text-align:center; padding:20px; color:#94a3b8;'>Loading requests...</div>";

    try {
        const res = await fetch(`${API_BASE}/institutions/admin/pending`, {
            headers: getAuthHeaders()
        });

        if (res.status === 403) {
            listContainer.innerHTML = "<div style='color:red; text-align:center; padding:20px;'>⛔ Unauthorized Access</div>";
            return;
        }

        if (res.ok) {
            const requests = await res.json();
            renderPendingList(requests);
        } else {
            listContainer.innerHTML = "<div style='text-align:center; padding:20px;'>Error fetching data.</div>";
        }
    } catch (err) {
        listContainer.innerHTML = "<div style='text-align:center; padding:20px;'>Connection Error</div>";
    }
}

function renderPendingList(requests) {
    const container = document.getElementById("pendingList");
    container.innerHTML = "";

    if (requests.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px 20px; color:#94a3b8;">
                <div style="font-size:2rem; margin-bottom:10px;">🎉</div>
                <strong>All caught up!</strong><br>No pending requests.
            </div>`;
        document.getElementById("detailView").classList.remove("visible");
        document.getElementById("emptyState").classList.add("visible");
        return;
    }

    requests.forEach(req => {
        const date = new Date(req.createdAt).toLocaleDateString();
        const card = document.createElement("div");
        card.className = "request-card";
        card.innerHTML = `
            <div style="font-weight:600; color:#1e293b;">${req.name}</div>
            <div class="meta-text">${req.email}</div>
            <div class="meta-text" style="display:flex; justify-content:space-between;">
                <span>${req.registrationNumber}</span>
                <span>${date}</span>
            </div>
        `;
        card.onclick = () => selectRequest(req, card);
        container.appendChild(card);
    });
}

// Select Request & Generate HTML Dynamically (Removes dependency on <template>)
async function selectRequest(req, cardElement) {
    currentSelectedId = req.id;

    // Highlight UI
    document.querySelectorAll(".request-card").forEach(c => c.classList.remove("active"));
    cardElement.classList.add("active");

    // Show Panel
    document.getElementById("emptyState").classList.remove("visible");
    const detailPanel = document.getElementById("detailView");
    detailPanel.classList.add("visible");

    // Dynamic HTML Injection (Safer than cloning templates if HTML structure changes)
    detailPanel.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start;">
            <div>
                <h2 style="color: var(--primary); margin-bottom: 5px;">${req.name}</h2>
                <div class="badge" style="background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px; display: inline-block; font-size: 0.8rem; font-weight: 600;">PENDING APPROVAL</div>
            </div>
            <div style="text-align: right;">
                <p style="font-size: 0.85rem; color: #64748b; margin:0;">Date: ${new Date(req.createdAt).toLocaleDateString()}</p>
                <p style="font-size: 0.85rem; color: #64748b; margin:0;">Reg: ${req.registrationNumber}</p>
            </div>
        </div>
        <hr>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 2rem;">
            <div>
                <h4 style="color: #475569; margin-bottom: 10px;">Contact Info</h4>
                <p style="margin-bottom: 5px;"><strong>Email:</strong> ${req.email}</p>
            </div>
            <div>
                <h4 style="color: #475569; margin-bottom: 10px;">Submitted Documents</h4>
                <ul id="viewDocList" class="file-list">Loading docs...</ul>
                <p id="viewNoDocs" class="hidden" style="color: red; font-size: 0.9rem;">⚠️ No documents uploaded.</p>
            </div>
        </div>
        <div style="background: #f8fafc; padding: 1.5rem; border-radius: 8px; border: 1px solid #e2e8f0;">
            <h3 style="margin-top: 0;">Final Decision</h3>
            <p style="font-size: 0.9rem; margin-bottom: 15px;">Review the documents above carefully before taking action.</p>
            <div class="btn-group">
                <button onclick="approveCurrent()" class="success">✅ Approve Institution</button>
                <button onclick="showRejectBox()" class="danger">❌ Reject Institution</button>
            </div>
            <div id="rejectInputBox" class="hidden" style="margin-top: 15px; border-top: 1px solid #cbd5e1; padding-top: 15px;">
                <label style="font-weight: 600; font-size: 0.9rem; display: block; margin-bottom: 5px; color: #b91c1c;">Reason for Rejection (Mandatory):</label>
                <textarea id="rejectReasonText" placeholder="e.g., Documents are blurry, Incorrect Affiliation..." rows="3"></textarea>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button onclick="rejectCurrent()" class="danger">Confirm Rejection</button>
                    <button onclick="hideRejectBox()" class="secondary">Cancel</button>
                </div>
            </div>
        </div>
    `;

    // Fetch Documents
    const docList = document.getElementById("viewDocList");
    const noDocsMsg = document.getElementById("viewNoDocs");

    try {
        const res = await fetch(`${API_BASE}/institutions/${req.id}/documents`, {
            headers: getAuthHeaders()
        });
        if (res.ok) {
            const docs = await res.json();
            docList.innerHTML = "";
            if (docs.length > 0) {
                docs.forEach(doc => {
                    const li = document.createElement("li");
                    li.innerHTML = `
                        <span>${doc.fileName}</span>
                        <button class="secondary" style="padding:4px 8px; font-size:0.75rem;"
                                onclick="downloadAdminDoc(${req.id}, ${doc.id}, '${doc.fileName}')">⬇ Download</button>
                    `;
                    docList.appendChild(li);
                });
            } else {
                noDocsMsg.classList.remove("hidden");
            }
        }
    } catch (err) { console.error(err); }
}

// Action: Approve
async function approveCurrent() {
    if (!currentSelectedId) return;
    if (!confirm("Are you sure you want to APPROVE this institution?")) return;

    try {
        const res = await fetch(`${API_BASE}/institutions/${currentSelectedId}/verify?approve=true`, {
            method: "POST",
            headers: getAuthHeaders()
        });

        if (res.ok) {
            showToast("Institution Approved Successfully!");
            resetView();
        } else {
            showToast("Approval Failed", "error");
        }
    } catch (err) { showToast("Error connecting to server", "error"); }
}

// Action: Reject
async function rejectCurrent() {
    if (!currentSelectedId) return;

    const reason = document.getElementById("rejectReasonText").value;
    if (!reason || !reason.trim()) {
        showToast("Rejection Reason is mandatory", "error");
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/institutions/${currentSelectedId}/verify?approve=false&reason=${encodeURIComponent(reason)}`, {
            method: "POST",
            headers: getAuthHeaders()
        });

        if (res.ok) {
            showToast("Institution Rejected");
            resetView();
        } else {
            showToast("Rejection Failed", "error");
        }
    } catch (err) { showToast("Error connecting to server", "error"); }
}

// UI Helpers for Admin
function resetView() {
    document.getElementById("detailView").classList.remove("visible");
    document.getElementById("emptyState").classList.add("visible");
    currentSelectedId = null;
    loadPendingRequests(); // Refresh the list
}

function showRejectBox() { document.getElementById("rejectInputBox").classList.remove("hidden"); }
function hideRejectBox() { document.getElementById("rejectInputBox").classList.add("hidden"); }

// Admin Download
async function downloadAdminDoc(instId, docId, fileName) {
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