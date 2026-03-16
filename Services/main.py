from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List
import sqlite3
import hashlib
import jwt
import datetime
import os
 
# ─────────────────────────────────────────
# App & Config
# ─────────────────────────────────────────
app = FastAPI(title="Inventory API", version="1.0.0")
 
# ─────────────────────────────────────────
# CORS — allows browser (JS) to call this API
# ─────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # Replace * with your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
 
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24
 
security = HTTPBearer()
 
# ─────────────────────────────────────────
# Database Setup
# ─────────────────────────────────────────
DB_PATH = "inventory.db"
 
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()
 
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
 
    # Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id   TEXT PRIMARY KEY,
            password  TEXT NOT NULL
        )
    """)
 
    # Inventory table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS inventory (
            item_id       TEXT PRIMARY KEY,
            item_name     TEXT NOT NULL,
            item_quantity INTEGER NOT NULL DEFAULT 0,
            updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
 
    # Seed demo user  (password: "password123")
    hashed = hashlib.sha256("password123".encode()).hexdigest()
    cursor.execute(
        "INSERT OR IGNORE INTO users (user_id, password) VALUES (?, ?)",
        ("admin", hashed)
    )
 
    # Seed demo inventory
    demo_items = [
        ("ITM001", "Laptop",       42),
        ("ITM002", "Mouse",        150),
        ("ITM003", "Keyboard",     95),
        ("ITM004", "Monitor",      30),
        ("ITM005", "USB-C Hub",    200),
    ]
    cursor.executemany(
        "INSERT OR IGNORE INTO inventory (item_id, item_name, item_quantity) VALUES (?, ?, ?)",
        demo_items
    )
 
    conn.commit()
    conn.close()
 
# Run on startup
init_db()
 
# ─────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────
class LoginRequest(BaseModel):
    UserId: str
    Password: str
 
class LoginResponse(BaseModel):
    token: str
    message: str
 
class InventoryItem(BaseModel):
    item_id: str
    item_name: str
    item_quantity: int
 
# ─────────────────────────────────────────
# Auth Helpers
# ─────────────────────────────────────────
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
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
 
# ─────────────────────────────────────────
# Routes
# ─────────────────────────────────────────
 
@app.post(
    "/login",
    response_model=LoginResponse,
    status_code=200,
    responses={403: {"description": "Invalid credentials"}},
    summary="Login and receive a JWT token"
)
def login(body: LoginRequest, db: sqlite3.Connection = Depends(get_db)):
    """
    **POST /login**
 
    Authenticate with UserId and Password.
    - Returns `200` with a JWT token on success.
    - Returns `403` if credentials are invalid.
    """
    row = db.execute(
        "SELECT password FROM users WHERE user_id = ?", (body.UserId,)
    ).fetchone()
 
    if not row or row["password"] != hash_password(body.Password):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid UserId or Password"
        )
 
    token = create_token(body.UserId)
    return LoginResponse(token=token, message="Login successful")
 
 
@app.get(
    "/GetLatestInventryStock",
    response_model=List[InventoryItem],
    status_code=200,
    summary="Get latest inventory stock (requires auth)"
)
def get_latest_inventory_stock(
    user_id: str = Depends(verify_token),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    **GET /GetLatestInventryStock**
 
    Returns the latest inventory stock as an array of items.
    Requires a valid Bearer token from `/login`.
 
    Each item contains:
    - `item_id`
    - `item_name`
    - `item_quantity`
    """
    rows = db.execute(
        "SELECT item_id, item_name, item_quantity FROM inventory ORDER BY updated_at DESC"
    ).fetchall()
 
    return [
        InventoryItem(
            item_id=row["item_id"],
            item_name=row["item_name"],
            item_quantity=row["item_quantity"]
        )
        for row in rows
    ]
 
 
# ─────────────────────────────────────────
# Health Check
# ─────────────────────────────────────────
@app.get("/health", include_in_schema=False)
def health():
    return {"status": "ok"}
