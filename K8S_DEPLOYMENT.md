# GetFit — Kubernetes Deployment Guide

This guide covers deploying the GetFit application on Kubernetes using **Kustomize** overlays.

## Manifest Structure

```
k8s/
├── base/                    # Shared resources (all environments)
│   ├── kustomization.yaml
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── postgres.yaml
│   ├── backend.yaml
│   ├── frontend.yaml
│   ├── migration-job.yaml
│   ├── seed-job.yaml
│   ├── ingress.yaml
│   └── secrets.example.yaml
├── overlays/
│   ├── minikube/            # Local dev cluster
│   │   ├── kustomization.yaml
│   │   ├── secrets.example.yaml
│   │   └── secrets.yaml      ← you create (gitignored)
│   └── gke/                 # Google Kubernetes Engine
│       ├── kustomization.yaml
│       ├── secrets.example.yaml
│       └── secrets.yaml      ← you create (gitignored)
```

---

## Minikube Deployment

### Prerequisites

- [Minikube](https://minikube.sigs.k8s.io/docs/start/) installed
- [kubectl](https://kubernetes.io/docs/tasks/tools/) installed
- Docker Desktop installed (used by minikube as a driver)

### 1. Start Minikube

```bash
minikube start --driver=docker
```

### 2. Enable the Ingress Addon

```bash
minikube addons enable ingress
```

### 3. Build Docker Images Inside Minikube

Minikube runs its own Docker daemon — images built on your host are **not** visible to it. You must build inside minikube's Docker environment:

**Option A — Point your shell at minikube's Docker (recommended):**

```bash
# On PowerShell
& minikube -p minikube docker-env --shell powershell | Invoke-Expression

# On Linux/macOS
eval $(minikube docker-env)
```

Then build the images normally:

```bash
docker build -t getfit-server:latest ./server
docker build -t getfit-frontend:latest ./frontend
```

**Option B — Build on host, then load into minikube:**

```bash
# Build normally with your host Docker
docker build -t getfit-server:latest ./server
docker build -t getfit-frontend:latest ./frontend

# Load the images into minikube
minikube image load getfit-server:latest
minikube image load getfit-frontend:latest
```

**Option C — Use `minikube image build`:**

```bash
minikube image build -t getfit-server:latest ./server
minikube image build -t getfit-frontend:latest ./frontend
```

### 4. Configure Secrets

Copy the example secrets file and fill in your real credentials:

```bash
cp k8s/overlays/minikube/secrets.example.yaml k8s/overlays/minikube/secrets.yaml
```

Edit `k8s/overlays/minikube/secrets.yaml` with your actual values:

| Key              | Description                              |
|------------------|------------------------------------------|
| `DB_PASSWORD`    | PostgreSQL password                      |
| `JWT_SECRET`     | Secret key for JWT token signing         |
| `EMAIL_USER`     | Gmail address for sending emails         |
| `EMAIL_PASSWORD` | Gmail App Password (not your login pass) |
| `DATABASE_URL`   | Full connection string (update password) |

> **Important:** `secrets.yaml` is gitignored — never commit real credentials.

### 5. Deploy

Deploy everything with a single Kustomize command:

```bash
kubectl apply -k k8s/overlays/minikube
```

Wait for resources to be ready:

```bash
kubectl wait --for=condition=ready pod -l app=postgres -n getfit --timeout=120s
kubectl wait --for=condition=complete job/prisma-migrate -n getfit --timeout=120s
kubectl wait --for=condition=complete job/db-seed -n getfit --timeout=120s
kubectl wait --for=condition=ready pod -l app=backend -n getfit --timeout=120s
```

> **Note:** The `db-seed` job imports food and exercise data from JSON files. It runs automatically after migrations complete.

### 6. Configure Host Routing

Get the minikube IP:

```bash
minikube ip
```

Add the following line to your hosts file:

- **Windows:** `C:\Windows\System32\drivers\etc\hosts` (edit as Administrator)
- **macOS/Linux:** `/etc/hosts`

```
<minikube-ip>  getfit.local
```

For example:

```
192.168.49.2  getfit.local
```

### 7. Access the Application

Open your browser and navigate to:

| URL                            | What it serves         |
|--------------------------------|------------------------|
| `http://getfit.local`          | Frontend (SPA)         |
| `http://getfit.local/api/*`    | Backend API            |
| `http://getfit.local/images/*` | Exercise & Food images |
| `http://getfit.local/uploads/*`| Profile pictures       |

No port number needed — Ingress listens on port **80** (default HTTP).

---

## GKE Deployment

### Prerequisites

- [`gcloud` CLI](https://cloud.google.com/sdk/docs/install) installed and configured
- Docker images pushed to Artifact Registry:
  - `europe-west1-docker.pkg.dev/getfit-prod-487511/getfit-repo/getfit-server:latest`
  - `europe-west1-docker.pkg.dev/getfit-prod-487511/getfit-repo/getfit-frontend:latest`

### 1. Create the GKE Cluster

```bash
gcloud container clusters create getfit-cluster \
  --zone europe-west1-b \
  --num-nodes 1 \
  --machine-type e2-medium \
  --disk-type pd-standard \
  --disk-size 30 \
  --release-channel regular
```

### 2. Connect to the Cluster

```bash
gcloud container clusters get-credentials getfit-cluster \
  --zone europe-west1-b \
  --project getfit-prod-487511
```

### 3. Configure Secrets

```bash
cp k8s/overlays/gke/secrets.example.yaml k8s/overlays/gke/secrets.yaml
```

Edit `k8s/overlays/gke/secrets.yaml` with **production** credentials.

### 4. Deploy

```bash
kubectl apply -k k8s/overlays/gke
```

Wait for resources:

```bash
kubectl wait --for=condition=ready pod -l app=postgres -n getfit --timeout=120s
kubectl wait --for=condition=complete job/prisma-migrate -n getfit --timeout=120s
kubectl wait --for=condition=complete job/db-seed -n getfit --timeout=120s
kubectl wait --for=condition=ready pod -l app=backend -n getfit --timeout=120s
```

Check ingress external IP:

```bash
kubectl get ingress -n getfit
```

---

## Useful Commands

### Check pod status

```bash
kubectl get pods -n getfit
```

### View logs

```bash
# Backend logs
kubectl logs -n getfit deployment/backend

# PostgreSQL logs
kubectl logs -n getfit statefulset/postgres

# Migration job logs
kubectl logs -n getfit job/prisma-migrate

# Seed job logs
kubectl logs -n getfit job/db-seed

# Frontend logs
kubectl logs -n getfit deployment/frontend
```

### Restart a deployment

```bash
kubectl rollout restart deployment backend -n getfit
kubectl rollout restart deployment frontend -n getfit
```

### Re-run migrations (after schema changes)

```bash
kubectl delete job prisma-migrate -n getfit
kubectl apply -k k8s/overlays/minikube   # or k8s/overlays/gke
```

### Re-run database seeding

If you need to re-import the food/exercise data:

```bash
kubectl delete job db-seed -n getfit
kubectl apply -k k8s/overlays/minikube   # or k8s/overlays/gke
```

> **Note:** The seed scripts use `upsert`, so re-running the seed job is safe — it won't create duplicates.

### Access PostgreSQL directly

```bash
kubectl exec -it -n getfit postgres-0 -- psql -U postgres -d getfit
```

### Stop / Start Minikube

```bash
# Stop (data persists)
minikube stop

# Start again
minikube start
```

> **Note:** `minikube stop` preserves all PVC data. Only `minikube delete` destroys everything.

### Import data from a local database backup

```bash
# Export from local PostgreSQL
pg_dump -U postgres -d getfit > backup.sql

# Copy into the pod
kubectl cp backup.sql getfit/postgres-0:/tmp/backup.sql

# Import
kubectl exec -n getfit postgres-0 -- psql -U postgres -d getfit -f /tmp/backup.sql
```

## Tear Down

To remove all GetFit resources but keep the cluster:

```bash
kubectl delete namespace getfit
```

### Minikube

To destroy the entire Minikube cluster (including all data):

```bash
minikube delete
```

### GKE

To delete the GKE cluster entirely:

```bash
gcloud container clusters delete getfit-cluster --zone europe-west1-b --project getfit-prod-487511
```

To also delete the Artifact Registry images:

```bash
gcloud artifacts docker images delete \
  europe-west1-docker.pkg.dev/getfit-prod-487511/getfit-repo/getfit-server --quiet
gcloud artifacts docker images delete \
  europe-west1-docker.pkg.dev/getfit-prod-487511/getfit-repo/getfit-frontend --quiet
```

## Architecture Overview

```
                        ┌─────────────────────────────────────────┐
                        │  Kubernetes Cluster (namespace: getfit) │
                        │                                         │
  Browser               │  ┌───────────┐      ┌───────────────┐  │
  http://getfit.local ──►  │  Ingress   │      │  ConfigMap +  │  │
                        │  │  (nginx)   │      │  Secrets      │  │
                        │  └─────┬──────┘      └───────────────┘  │
                        │    /   │    /api                         │
                        │   ▼    │    ▼                            │
                        │  ┌─────┴──┐  ┌──────────┐               │
                        │  │Frontend│  │ Backend  │               │
                        │  │(nginx) │  │(Node.js) │               │
                        │  │ :80    │  │ :3000    │               │
                        │  └────────┘  └────┬─────┘               │
                        │                   │                     │
                        │              ┌────▼─────┐               │
                        │              │PostgreSQL│               │
                        │              │  :5432   │               │
                        │              └────┬─────┘               │
                        │                   │                     │
                        │              ┌────▼─────┐               │
                        │              │   PVC    │               │
                        │              │  (1Gi)   │               │
                        │              └──────────┘               │
                        └─────────────────────────────────────────┘
```
