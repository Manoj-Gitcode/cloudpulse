from app import app
import app as backend


def test_health():
    client = app.test_client()

    response = client.get("/health")

    assert response.status_code == 200
    assert response.get_json()["status"] == "ok"


def test_resources():
    client = app.test_client()

    response = client.get("/api/resources")

    assert response.status_code == 200

    data = response.get_json()

    assert len(data) > 0

    required_keys = {
        "id",
        "name",
        "type",
        "status",
        "cpu",
        "memory",
        "cost"
    }

    for resource in data:
        assert required_keys.issubset(resource.keys())


def test_metrics():
    client = app.test_client()

    response = client.get("/api/metrics")

    assert response.status_code == 200

    data = response.get_json()

    assert len(data) == 12

    for point in data:
        assert "time" in point
        assert "cpu" in point
        assert "memory" in point


def test_costs():
    client = app.test_client()

    response = client.get("/api/costs")

    assert response.status_code == 200

    data = response.get_json()

    assert "budget" in data
    assert "total" in data
    assert "by_service" in data

    assert len(data["by_service"]) > 0


def test_budget_alert(monkeypatch):
    monkeypatch.setattr(backend, "BUDGET", 1)

    client = app.test_client()

    response = client.get("/api/alerts")

    assert response.status_code == 200

    alerts = response.get_json()

    assert any(
        alert["severity"] == "critical"
        for alert in alerts
    )