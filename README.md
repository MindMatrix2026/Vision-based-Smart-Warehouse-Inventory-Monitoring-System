# 🏭 Smart Warehouse System

A full-stack inventory management system for warehouse administrators. Built with a **Python FastAPI** backend and a **vanilla JavaScript** frontend dashboard.

---

## 🚀 Features

- 🔐 JWT-based login authentication
- 📦 Real-time inventory stock tracking
- 📊 Inventory analytics bar chart
- 🔔 Smart low-stock alerts
- 🔄 Auto-refresh every 5 seconds from API


---

## 🗂 Project Structure

```
smart-warehouse-system/
├── Services/               # Backend (Python / FastAPI)
│   ├── main.py             # API routes, DB setup, JWT auth
│   ├── Requirements.txt    # Python dependencies
│   └── API.js              # JS API client helper
├── Web/                    # Frontend (HTML / CSS / JS)
│   ├── index.html          # Dashboard UI
│   ├── script.js           # API calls, table rendering, charts
│   └── style.css           # Dashboard styles
└── .gitignore
```

---

## ⚙️ Tech Stack

| Layer    | Technology        |
|----------|-------------------|
| Backend  | Python / FastAPI  |
| Database | SQLite            |
| Auth     | JWT Token         |
| Frontend | HTML / CSS / JS   |
| Charts   | Chart.js          |

---

## 🛠 Setup & Installation

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/smart-warehouse-system.git
cd smart-warehouse-system
```

### 2. Install backend dependencies
```bash
cd Services
pip install -r Requirements.txt
```

### 3. Start the backend server
```bash
uvicorn main:app --reload --port 8000
```
API runs at: `http://localhost:8000`  
Swagger docs: `http://localhost:8000/docs`

### 4. Open the frontend
Open `Web/index.html` in your browser. No extra server needed.

---

## 🔑 API Endpoints

### `POST /login`
Authenticate and receive a JWT token.

**Request Body:**
```json
{
  "UserId": "admin",
  "Password": "password123"
}
```

**Responses:**
| Code | Description |
|------|-------------|
| 200  | Login successful — returns JWT token |
| 403  | Invalid credentials |

---

### `GET /GetLatestInventryStock`
Returns latest inventory as an array. Requires Bearer token.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
[
  { "item_id": "ITM001", "item_name": "Laptop",  "item_quantity": 42 },
  { "item_id": "ITM002", "item_name": "Mouse",   "item_quantity": 150 }
]
```

---

## 🔐 Demo Credentials

| UserId | Password     |
|--------|--------------|
| admin  | password123  |

---

## 📝 Environment Variables

| Variable   | Default                                | Description         |
|------------|----------------------------------------|---------------------|
| SECRET_KEY | `your-secret-key-change-in-production` | JWT signing secret  |

Set in production:
```bash
export SECRET_KEY="your-very-long-random-secret"
```

---

## ⚠️ Notes

- `inventory.db` is excluded from git (auto-created on first run)
- Add/Remove product is local only — does not persist to DB
- Use `bcrypt` instead of SHA-256 for passwords in production
- Replace SQLite with PostgreSQL/MySQL for production deployments

---

## 📄 License

This project is for educational and internal use.
