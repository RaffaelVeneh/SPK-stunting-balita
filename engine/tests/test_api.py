from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_list_methods():
    response = client.get("/methods")
    assert response.status_code == 200
    methods = [m["name"] for m in response.json()["methods"]]
    assert "saw" in methods
    assert "moora" in methods

def test_api_calculate_saw():
    payload = {
        "method": "saw",
        "criteria": [
            {"code": "C1", "name": "Kondisi Gizi", "weight": 0.5, "criterion_type": "benefit"},
            {"code": "C2", "name": "Sanitasi", "weight": 0.5, "criterion_type": "benefit"}
        ],
        "alternatives": [
            {"id": "A1", "name": "Balita 1", "values": {"C1": 5.0, "C2": 5.0}},
            {"id": "A2", "name": "Balita 2", "values": {"C1": 1.0, "C2": 1.0}}
        ]
    }
    response = client.post("/calculate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["method"] == "saw"
    assert len(data["results"]) == 2
    assert data["results"][0]["id"] == "A1"
    assert data["results"][0]["rank"] == 1
    assert data["results"][1]["id"] == "A2"
    assert data["results"][1]["rank"] == 2
