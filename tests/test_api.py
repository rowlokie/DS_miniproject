from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "llm_provider" in data

def test_settings_endpoints():
    get_res = client.get("/api/settings")
    assert get_res.status_code == 200
    assert "top_k" in get_res.json()

    post_res = client.post("/api/settings", json={"top_k": 5})
    assert post_res.status_code == 200
    assert post_res.json()["settings"]["top_k"] == 5

def test_websites_endpoint():
    res = client.get("/api/websites")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_ssrf_validation_via_api():
    res = client.post("/api/crawl", json={"url": "http://127.0.0.1:9000"})
    assert res.status_code == 400
    assert "blocked" in res.json()["detail"].lower() or "private" in res.json()["detail"].lower()

def test_chat_insufficient_evidence_when_empty():
    res = client.post("/api/chat", json={
        "message": "Tell me about quantum computing teleportation in detail"
    })
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert "sources" in data
