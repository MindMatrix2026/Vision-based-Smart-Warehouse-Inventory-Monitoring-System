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

     // Map API response fields to local inventory format
        inventory = data.map(item => ({
            id: item.item_id,
            name: item.item_name,
            qty: item.item_quantity,
        }));
        console.log("item recieved: " + inventory.length)
 
        // Set nextId for any locally added items
        nextId = inventory.length + 1;
 
        renderTable();
 
    } catch (error) {
        showToast("Cannot reach server ❌");
        console.error("Fetch inventory error:", error);
    }
}
 
// ================= RENDER TABLE =================
function renderTable() {
    const tbody = document.querySelector("#inventoryTable tbody");
    if (!tbody) return;
 
    tbody.innerHTML = "";
 
    let lowStock = 0;
 
    inventory.forEach(item => {
        const isLow = item.qty < 10;
        const status = isLow ? "Low Stock" : "In Stock";
 
        if (isLow) lowStock++;
 
        tbody.innerHTML += `
            <tr>
                <td>${item.id}</td>
                <td>${item.name}</td>
                <td>${item.qty}</td>
                <td class="${isLow ? "low" : "in-stock"}">${status}</td>
                <td>
                    <button onclick="removeProduct('${item.id}')">Remove</button>
                </td>
            </tr>
        `;
    });
 
    document.getElementById("totalItems").innerText = inventory.length;
    document.getElementById("lowStockCount").innerText = lowStock;
 
    generateAlerts();
    updateChart();
}
 
// ================= ADD PRODUCT (local only) =================
function addProduct() {
    const nameInput = document.getElementById("productName");
    const qtyInput = document.getElementById("productQty");
 
    const name = nameInput.value.trim();
    const qty = parseInt(qtyInput.value);
 
    if (!name || isNaN(qty) || qty < 0) {
        showToast("Enter valid product details ⚠");
        return;
    }
 
    inventory.push({ id: nextId++, name, qty });
 
    nameInput.value = "";
    qtyInput.value = "";
 
    showToast("Product Added ✅");
    renderTable();
}
 
// ================= REMOVE PRODUCT (local only) =================
function removeProduct(id) {
    inventory = inventory.filter(item => item.id !== id);
    showToast("Product Removed 🗑");
    renderTable();
}
 
// ================= SMART ALERTS =================
function generateAlerts() {
    const alertDiv = document.getElementById("alerts");
    if (!alertDiv) return;
 
    alertDiv.innerHTML = "";
 
    inventory.forEach(item => {
        if (item.qty < 10) {
            alertDiv.innerHTML += `
                <p>⚠ ${item.name} is low (${item.qty} left)</p>
            `;
        }
    });
}
 
// ================= REAL-TIME SIMULATION =================
// Refreshes inventory from the API every 5 seconds
setInterval(() => {
    if (getToken()) {
        fetchInventory();
    }
}, 5000);
 
// ================= CHART =================
function updateChart() {
    const chartCanvas = document.getElementById("inventoryChart");
    if (!chartCanvas) return;
 
    const ctx = chartCanvas.getContext("2d");
 
    const labels = inventory.map(item => item.name);
    const data = inventory.map(item => item.qty);
 
    if (chart) chart.destroy();
 
    chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: "#0a66c2",
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}
 
// ================= TOAST =================
function showToast(message) {
    const toast = document.createElement("div");
    toast.innerText = message;
    toast.className = "toast";
    document.body.appendChild(toast);
 
    setTimeout(() => {
        toast.remove();
    }, 3000);
}
