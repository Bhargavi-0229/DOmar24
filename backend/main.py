from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import time

APP_VERSION = "1.0.0"
START_TIME = time.time()

app = FastAPI(title="Backend CRUD App")

# Configure CORS for the Next.js frontend
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "*"], # allow * for ease of development, but should be strictly frontend_url in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory dictionary to store items
# Structure: { item_id: { "id": int, "name": str, "description": str } }
db = {}
current_id = 1

class ItemCreate(BaseModel):
    name: str
    description: str | None = None

class Item(ItemCreate):
    id: int

@app.get("/items/", response_model=list[Item])
def read_items(search: str | None = Query(default=None)):
    items = list(db.values())
    if search:
        term = search.lower()
        items = [
            i for i in items
            if term in i.name.lower() or (i.description and term in i.description.lower())
        ]
    return items

@app.get("/items/{item_id}", response_model=Item)
def read_item(item_id: int):
    if item_id not in db:
        raise HTTPException(status_code=404, detail="Item not found")
    return db[item_id]

@app.post("/items/", response_model=Item)
def create_item(item: ItemCreate):
    global current_id
    new_item = Item(id=current_id, **item.model_dump())
    db[current_id] = new_item
    current_id += 1
    return new_item

@app.put("/items/{item_id}", response_model=Item)
def update_item(item_id: int, item: ItemCreate):
    if item_id not in db:
        raise HTTPException(status_code=404, detail="Item not found")

    updated_item = Item(id=item_id, **item.model_dump())
    db[item_id] = updated_item
    return updated_item

@app.delete("/items/{item_id}")
def delete_item(item_id: int):
    if item_id not in db:
        raise HTTPException(status_code=404, detail="Item not found")
    del db[item_id]
    return {"message": "Item deleted successfully"}

# Health check endpoint for Cloud Run — also used as liveness/readiness probe
@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "version": APP_VERSION,
        "environment": os.getenv("ENVIRONMENT", "development"),
        "item_count": len(db),
        "uptime_seconds": round(time.time() - START_TIME),
    }
