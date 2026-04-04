// ─────────────────────────────────────────
// Config
// ─────────────────────────────────────────
const BASE_URL = "http://localhost:8000"; // Change this to your server URL
 
// ─────────────────────────────────────────
// Token helpers
// ─────────────────────────────────────────
function saveToken(token) {
  localStorage.setItem("auth_token", token);
}
 
function getToken() {
  return localStorage.getItem("auth_token");
}
 
function clearToken() {
  localStorage.removeItem("auth_token");
}
 
// ─────────────────────────────────────────
// POST /login
// ─────────────────────────────────────────
/**
 * Login with UserId and Password.
 * Saves the JWT token to localStorage on success.
 *
 * @param {string} userId
 * @param {string} password
 * @returns {Promise<{ token: string, message: string }>}
 * @throws Will throw on 403 (invalid credentials) or network error
 */
async function login(userId, password) {
  const response = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      UserId: userId,
      Password: password,
    }),
  });
 
  if (response.status === 403) {
    throw new Error("Invalid UserId or Password");
  }
 
  if (!response.ok) {
    throw new Error(`Login failed with status: ${response.status}`);
  }
 
  const data = await response.json();
  saveToken(data.token); // Auto-save token for future requests
  return data;
}
 
// ─────────────────────────────────────────
// GET /GetLatestInventryStock
// ─────────────────────────────────────────
/**
 * Fetch the latest inventory stock.
 * Requires a valid JWT token (login first).
 *
 * @returns {Promise<Array<{ item_id: string, item_name: string, item_quantity: number }>>}
 * @throws Will throw on 401 (unauthorized) or network error
 */
async function getLatestInventoryStock() {
  const token = getToken();
 
  if (!token) {
    throw new Error("Not authenticated. Please login first.");
  }
 
  const response = await fetch(`${BASE_URL}/GetLatestInventryStock`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
 
  if (response.status === 401) {
    clearToken(); // Token expired or invalid — clear it
    throw new Error("Session expired. Please login again.");
  }
 
  if (!response.ok) {
    throw new Error(`Failed to fetch inventory: ${response.status}`);
  }
 
  const data = await response.json();
  return data;
}
 
// ─────────────────────────────────────────
// Example Usage
// ─────────────────────────────────────────
async function main() {
  try {
    // Step 1: Login
    console.log("Logging in...");
    const loginResult = await login("admin", "password123");
    console.log("Login successful:", loginResult.message);
 
    // Step 2: Fetch inventory
    console.log("\nFetching inventory...");
    const inventory = await getLatestInventoryStock();
    console.log("Inventory stock:", inventory);
 
    // Example: loop through items
    inventory.forEach((item) => {
      console.log(`[${item.item_id}] ${item.item_name} — Qty: ${item.item_quantity}`);
    });
 
  } catch (error) {
    console.error("Error:", error.message);
  }
}
 
main();