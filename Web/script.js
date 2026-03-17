// ================= CONFIG =================
const BASE_URL = "http://localhost:8000"; // Change to your server URL
 
// ================= SESSION CHECK =================
document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("auth_token")) {
        showDashboard();
        showSection("dashboardSection");
    }
 
    renderTable();
});
 
// ================= API HELPERS =================
function saveToken(token) {
    localStorage.setItem("auth_token", token);
}
 
function getToken() {
    return localStorage.getItem("auth_token");
}
 
function clearToken() {
    localStorage.removeItem("auth_token");
}
 
// ================= USER AUTH =================
async function login() {
    console.log("inside login");
    const user = document.getElementById("username").value.trim();
    const pass = document.getElementById("password").value.trim();
 
    if (!user || !pass) {
        showToast("Please enter username and password ⚠");
        return;
    }
 
    try {
        const response = await fetch(`${BASE_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ UserId: user, Password: pass }),
        });
 
        if (response.status === 403) {
            showToast("Invalid Credentials ❌");
            return;
        }
 
        if (!response.ok) {
            showToast("Server error. Please try again ❌");
            return;
        }
        console.log("response.ok");

 
        const data = await response.json();
        saveToken(data.token);
        console.log("Token saved");

        showDashboard();

        showSection("dashboardSection");
        fetchInventory(); // Load inventory right after login
 
    } catch (error) {
        showToast("Something went wrong.");
        console.error("Login error:", error);
    }
}
 
function logout() {
    clearToken();
    location.reload();
}
 
function showDashboard() {
    document.getElementById("login-section").style.display = "none";
    document.getElementById("dashboard").classList.add("active");
}
 
// ================= SECTION SWITCHING =================
function showSection(sectionId) {
    const sections = document.querySelectorAll(".panel");
    const sidebarItems = document.querySelectorAll(".sidebar li");
 
    sections.forEach(section => {
        section.style.display = "none";
    });
 
    sidebarItems.forEach(item => {
        item.classList.remove("active-menu");
    });
 
    if(sectionId === "dashboardSection"){
        document.getElementById(sectionId).style.display = "grid";
    } else{
        document.getElementById(sectionId).style.display = "block";
    }
 
    const clickedItem = [...sidebarItems].find(li =>
        li.getAttribute("onclick") && li.getAttribute("onclick").includes(sectionId)
    );
    if (clickedItem) clickedItem.classList.add("active-menu");
}
 
// ================= INVENTORY DATA =================
let inventory = [];
let nextId = 1;
let chart;
 
// ================= FETCH INVENTORY FROM API =================
async function fetchInventory() {
    const token = getToken();
    console.log("Inside Fetch inventory")
 
    if (!token) {
        showToast("Not logged in ❌");
        return;
    }
 
    try {
        const response = await fetch(`${BASE_URL}/GetLatestInventryStock`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });
 
        if (response.status === 401) {
            clearToken();
            showToast("Session expired. Please login again ❌");
            location.reload();
            return;
        }
 
        if (!response.ok) {
            showToast("Failed to fetch inventory ❌");
            return;
        }
        console.log("Fetch inventory success.")

 
        const data = await response.json();
