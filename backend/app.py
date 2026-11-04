from flask import Flask, jsonify
import random
import os

app = Flask(__name__)

BUDGET = 5000


def get_resources():
    rng = random.Random(42)

    services = ["EC2", "S3", "RDS", "Lambda"]

    resources = []

    for i in range(8):
        service = services[i % len(services)]

        resources.append({
            "id": i + 1,
            "name": f"{service}-resource-{i + 1}",
            "type": service,
            "status": rng.choice([
                "running",
                "stopped",
                "warning"
            ]),
            "cpu": rng.randint(10, 95),
            "memory": rng.randint(20, 90),
            "cost": round(rng.uniform(100, 800), 2)
        })

    return resources


@app.route("/api/resources")
def resources():
    return jsonify(get_resources())


@app.route("/api/metrics")
def metrics():
    rng = random.Random(100)

    data = []

    for hour in range(12):
        data.append({
            "time": f"{hour:02d}:00",
            "cpu": rng.randint(20, 90),
            "memory": rng.randint(30, 85)
        })

    return jsonify(data)


@app.route("/api/costs")
def costs():
    resources = get_resources()

    total = sum(
        resource["cost"]
        for resource in resources
    )

    service_costs = {}

    for resource in resources:
        service = resource["type"]

        service_costs[service] = (
            service_costs.get(service, 0)
            + resource["cost"]
        )

    by_service = [
        {
            "service": service,
            "cost": round(cost, 2)
        }
        for service, cost in service_costs.items()
    ]

    return jsonify({
        "budget": BUDGET,
        "total": round(total, 2),
        "by_service": by_service
    })


@app.route("/api/alerts")
def alerts():
    resources = get_resources()

    total = sum(
        resource["cost"]
        for resource in resources
    )

    alert_list = []

    if total > BUDGET:
        alert_list.append({
            "id": 1,
            "severity": "critical",
            "message": "Monthly cost exceeded the budget"
        })

    elif total >= BUDGET * 0.8:
        alert_list.append({
            "id": 1,
            "severity": "warning",
            "message": (
                f"Monthly cost reached "
                f"{(total / BUDGET) * 100:.0f}% of budget"
            )
        })

    alert_id = 2

    for resource in resources:
        if resource["cpu"] > 85:
            alert_list.append({
                "id": alert_id,
                "severity": "warning",
                "message": (
                    f"High CPU usage on "
                    f"{resource['name']}"
                )
            })

            alert_id += 1

    return jsonify(alert_list)


@app.route("/health")
def health():
    return jsonify({
        "status": "ok"
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))

    app.run(
        host="0.0.0.0",
        port=port,
        debug=True
    )