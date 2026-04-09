from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List
import sqlite3
import hashlib
import jwt
import datetime
import os
import random
import time

app = FastAPI(title="Inventory API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24

security = HTTPBearer()

DB_PATH = "inventory.db"


# DB CONNECTION
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


# 🔥 INIT DB (FORCE RESET + 500 PRODUCTS)
def init_db():
    print("🔥 RUNNING INIT_DB - SEEDING 500 PRODUCTS")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # USERS TABLE
    cursor.execute("DROP TABLE IF EXISTS users")
    cursor.execute("""
        CREATE TABLE users (
            user_id TEXT PRIMARY KEY,
            password TEXT NOT NULL
        )
    """)

    # INVENTORY TABLE (RESET)
    cursor.execute("DROP TABLE IF EXISTS inventory")
    cursor.execute("""
        CREATE TABLE inventory (
            item_id TEXT PRIMARY KEY,
            item_name TEXT NOT NULL,
            category TEXT,
            item_quantity INTEGER NOT NULL DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # SEED USER
    hashed = hashlib.sha256("password123".encode()).hexdigest()
    cursor.execute(
        "INSERT INTO users (user_id, password) VALUES (?, ?)",
        ("admin", hashed)
    )

    # SEED 500 PRODUCTS
    categories = ["Fruits", "Vegetables", "Dairy", "Snacks", "Beverages", "Grocery", "Personal Care"]

    demo_items = []

    for i in range(1, 501):
        demo_items.append((
            f"ITM{i:03}",
            f"{random.choice(['Fresh', 'Premium', 'Organic', 'Daily'])} Item {i}",
            random.choice(categories),
            random.randint(50, 200)
        ))

    cursor.executemany(
        "INSERT INTO inventory (item_id, item_name, category, item_quantity) VALUES (?, ?, ?, ?)",
        demo_items
    )

    # ✅ VERIFY COUNT
    count = cursor.execute("SELECT COUNT(*) FROM inventory").fetchone()[0]
    print(f"✅ TOTAL PRODUCTS INSERTED: {count}")

    conn.commit()
    conn.close()


# RUN INIT
init_db()


# SCHEMAS
class LoginRequest(BaseModel):
    UserId: str
    Password: str


class LoginResponse(BaseModel):
    token: str
    message: str


class InventoryItem(BaseModel):
    item_id: str
    item_name: str
    category: str
    item_quantity: int


# AUTH
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=TOKEN_EXPIRE_HOURS)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload["sub"]
    except:
        raise HTTPException(status_code=401, detail="Invalid token")


# LOGIN
@app.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, db: sqlite3.Connection = Depends(get_db)):
    row = db.execute(
        "SELECT password FROM users WHERE user_id = ?", (body.UserId,)
    ).fetchone()

    if not row or row["password"] != hash_password(body.Password):
        raise HTTPException(status_code=403, detail="Invalid credentials")

    token = create_token(body.UserId)
    return LoginResponse(token=token, message="Login successful")


# 🔥 INVENTORY API (SLOW UPDATE)
import time

last_update = 0

@app.get("/GetLatestInventryStock", response_model=List[InventoryItem])
def get_latest_inventory_stock(
    user_id: str = Depends(verify_token),
    db: sqlite3.Connection = Depends(get_db)
):
    global last_update

    current_time = time.time()

    # ✅ STRICT CONTROL: only update every 30 seconds
    if current_time - last_update > 30:
        rows = db.execute("SELECT item_id, item_quantity FROM inventory").fetchall()

        # ✅ Update ONLY 1 product
        if rows:
            item = random.choice(rows)

            decrease = 1  # VERY slow decrease
            new_qty = max(0, item["item_quantity"] - decrease)

            db.execute(
                "UPDATE inventory SET item_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE item_id = ?",
                (new_qty, item["item_id"])
            )

            db.commit()

        last_update = current_time

    # ✅ Fetch data
    rows = db.execute(
        "SELECT item_id, item_name, category, item_quantity FROM inventory"
    ).fetchall()

    return [
        InventoryItem(
            item_id=row["item_id"],
            item_name=row["item_name"],
            category=row["category"],
            item_quantity=row["item_quantity"]
        )
        for row in rows
    ]

# HEALTH
@app.get("/health")
def health():
    return {"status": "ok"}