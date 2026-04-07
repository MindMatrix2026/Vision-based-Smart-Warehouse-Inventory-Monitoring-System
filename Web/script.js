// ================= SESSION CHECK =================
document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("loggedIn") === "true") {
        showDashboard();
    }

    renderTable();
});

// ================= USER AUTH =================
function login() {
    const user = document.getElementById("username").value.trim();
    const pass = document.getElementById("password").value.trim();

    if (user === "MindMatrix" && pass === "123456789") {
        localStorage.setItem("loggedIn", "true");
        showDashboard();
        showSection("dashboardSection");
    } else {
        showToast("Invalid Credentials ❌");
    }
}

function logout() {
    localStorage.removeItem("loggedIn");
    location.reload();
}

function showDashboard() {
    document.getElementById("login-section").style.display = "none";
    document.getElementById("dashboard").classList.add("active");
}

// ================= SECTION SWITCHING =================
function showSection(sectionId) {
    const section = document.getElementById(sectionId);

    if (!section) {
        console.error("❌ Section not found:", sectionId);
        return;
    }

    const sections = document.querySelectorAll(".content-section");
    const sidebarItems = document.querySelectorAll(".sidebar li");

    sections.forEach(section => section.style.display = "none");
    sidebarItems.forEach(item => item.classList.remove("active-menu"));

    section.style.display = "block";

    const clickedItem = [...sidebarItems].find(li =>
        li.getAttribute("onclick")?.includes(sectionId)
    );

    if (clickedItem) clickedItem.classList.add("active-menu");
}
// ================= INVENTORY DATA =================
let inventory = [
    { id: 1, name: "RFID Scanner", qty: 15 },
    { id: 2, name: "Barcode Labels", qty: 8 },
    { id: 3, name: "Storage Box", qty: 25 }
];

let nextId = 4;
let chart;

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
                    <button onclick="removeProduct(${item.id})">Remove</button>
                </td>
            </tr>
        `;
    });

    document.getElementById("totalItems").innerText = inventory.length;
    document.getElementById("lowStockCount").innerText = lowStock;

    generateAlerts();
    updateChart();
}

// ================= ADD PRODUCT =================
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

// ================= REMOVE PRODUCT =================
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
setInterval(() => {
    inventory.forEach(item => {
        if (item.qty > 0) {
            const decrease = Math.floor(Math.random() * 3);
            item.qty = Math.max(0, item.qty - decrease);
        }
    });

    // 🔥 THIS LINE IS IMPORTANT
    console.log("📦 Live Inventory Update:", JSON.stringify(inventory, null, 2));

    renderTable(); // optional (keep if UI needed)
}, 3000);

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