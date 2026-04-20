from fastapi.testclient import TestClient
from main import app, db

client = TestClient(app)

def setup_function():
    # Clear db before each test
    db.clear()
    import main
    main.current_id = 1

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "environment" in data
    assert "item_count" in data
    assert "uptime_seconds" in data

def test_create_item():
    response = client.post("/items/", json={"name": "Test Item", "description": "This is a test"})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Item"
    assert data["description"] == "This is a test"
    assert data["id"] == 1

def test_read_items():
    client.post("/items/", json={"name": "Test Item 1"})
    client.post("/items/", json={"name": "Test Item 2"})

    response = client.get("/items/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["name"] == "Test Item 1"

def test_read_item():
    post_response = client.post("/items/", json={"name": "Read Test"})
    item_id = post_response.json()["id"]

    response = client.get(f"/items/{item_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Read Test"

def test_update_item():
    post_response = client.post("/items/", json={"name": "Old Name"})
    item_id = post_response.json()["id"]

    response = client.put(f"/items/{item_id}", json={"name": "New Name", "description": "Updated"})
    assert response.status_code == 200
    assert response.json()["name"] == "New Name"

def test_delete_item():
    post_response = client.post("/items/", json={"name": "Delete Me"})
    item_id = post_response.json()["id"]

    response = client.delete(f"/items/{item_id}")
    assert response.status_code == 200

    # Verify it's gone
    response = client.get(f"/items/{item_id}")
    assert response.status_code == 404

def test_search_items_by_name():
    client.post("/items/", json={"name": "Apple", "description": "A red fruit"})
    client.post("/items/", json={"name": "Banana", "description": "A yellow fruit"})

    response = client.get("/items/?search=apple")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Apple"

def test_search_items_by_description():
    client.post("/items/", json={"name": "Apple", "description": "A red fruit"})
    client.post("/items/", json={"name": "Carrot", "description": "An orange vegetable"})

    response = client.get("/items/?search=vegetable")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Carrot"

def test_search_items_no_match():
    client.post("/items/", json={"name": "Apple"})

    response = client.get("/items/?search=xyz")
    assert response.status_code == 200
    assert response.json() == []

def test_health_item_count():
    client.post("/items/", json={"name": "Item A"})
    client.post("/items/", json={"name": "Item B"})

    response = client.get("/health")
    assert response.json()["item_count"] == 2
