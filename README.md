# CloudPulse

**Cloud Resource Monitoring & Cost Dashboard**

CloudPulse is a simulated cloud-resource management platform. It shows a set of cloud resources (servers, databases, storage), their health (CPU, memory, status) and their monthly cost against a budget. All data is simulated, so no real cloud account is needed.

This project is built as a DevOps team project: a small web app, packaged with Docker, tested and built automatically with GitHub Actions, and deployed on Render.

---

## Features

- Resource table with status badges (running / stopped / warning)
- CPU and memory chart over time
- Monthly cost breakdown by service
- Budget alert banner when cost crosses 80% of the budget
- `/health` endpoint for uptime checks

---

## Team and branches

| Member | Branch | Responsibility |
|---|---|---|
| 1 | `frontend` | Dashboard page: table, charts, alert banner |
| 2 | `backend` | Flask API with simulated data, plus unit tests |
| 3 | `devops` | Dockerfile, GitHub Actions CI/CD, Render deployment |
| 4 | `main` | Integration, bug fixing, documentation |

Workflow: everyone works on their own branch and opens a pull request into `main`. Nobody pushes directly to `main`.

---

## Project structure

```
cloudpulse/
├── frontend/            # index.html, style.css, app.js (Member 1)
├── backend/             # app.py, requirements.txt, test_app.py (Member 2)
├── Dockerfile           # Container build (Member 3)
├── .github/workflows/   # ci-cd.yml pipeline (Member 3)
└── README.md
```

Keep files inside these folders, or the Dockerfile and pipeline will not find them.

---

## API contract (frontend and backend must follow this exactly)

The frontend and backend are built separately and talk only through JSON. If a field name differs, the dashboard shows blank data, so **do not rename any URL or field.**

```
GET /api/resources -> [{"id": 1, "name": "web-server-1", "type": "EC2", "status": "running", "cpu": 45, "memory": 62, "cost": 120.50}]
GET /api/metrics   -> [{"time": "10:00", "cpu": 45, "memory": 62}]
GET /api/costs     -> {"budget": 5000, "total": 4200.75, "by_service": [{"service": "EC2", "cost": 2100.00}]}
GET /api/alerts    -> [{"id": 1, "severity": "warning", "message": "Monthly cost reached 84% of budget"}]
GET /health        -> {"status": "ok"}
```

- `status` is one of `running`, `stopped`, `warning`
- Resource fields: `id`, `name`, `type`, `status`, `cpu`, `memory`, `cost`

---

## Requirements for the backend (needed for Docker and Render)

1. Read the port from the `PORT` environment variable (default 5000)
2. Run with `host="0.0.0.0"`
3. Provide a `/health` endpoint
4. Keep `requirements.txt` complete (every imported package listed)
5. Keep tests in `backend/test_app.py` (run with `pytest`)
6. Serve the files in `frontend/` so the whole app runs from one server

---

## Run locally

### With Docker

```
docker build -t cloudpulse .
docker run -p 5000:5000 cloudpulse
```

Open http://localhost:5000. If port 5000 is busy (on a Mac, AirPlay Receiver often uses it), run `docker run -p 5001:5000 cloudpulse` and open http://localhost:5001.

### Without Docker

```
cd backend
pip install -r requirements.txt
python app.py
```

### Run tests

```
cd backend
pytest
```

---

## CI/CD pipeline

Defined in `.github/workflows/ci-cd.yml`. On every push to `main` or `devops`, and on every pull request, GitHub Actions:

1. Checks out the code
2. Installs Python dependencies
3. Runs the tests with `pytest`
4. Builds the Docker image

A green tick on the **Actions** tab means the app installs, passes its tests and builds as a container.

---

## Deployment

The app is deployed on Render from the `main` branch using the Dockerfile. Every merge to `main` redeploys automatically.

- Live URL: _add the Render link here_
- Health check: `<live URL>/health`

Note: Render's free tier sleeps after inactivity, so the first load may take about 30 seconds.

---

## Tech stack

Python (Flask), HTML/CSS/JavaScript with Chart.js, Docker, GitHub Actions, Render.
