# GetFit — Kubernetes Deployment Guide

This guide walks you through deploying the GetFit application on a local **Minikube** Kubernetes cluster.

## Prerequisites

- [Minikube](https://minikube.sigs.k8s.io/docs/start/) installed
- [kubectl](https://kubernetes.io/docs/tasks/tools/) installed
- Docker Desktop installed (used by minikube as a driver)

## 1. Start Minikube

```bash
minikube start --driver=docker
```

## 2. Enable the Ingress Addon

```bash
minikube addons enable ingress
```

## 3. Build Docker Images Inside Minikube

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
docker build -t getfit-frontend:latest --build-arg API_URL=http://getfit.local/api ./frontend
```

**Option B — Build on host, then load into minikube:**

```bash
# Build normally with your host Docker
docker build -t getfit-server:latest ./server
docker build -t getfit-frontend:latest --build-arg API_URL=http://getfit.local/api ./frontend

# Load the images into minikube
minikube image load getfit-server:latest
minikube image load getfit-frontend:latest
```

**Option C — Use `minikube image build`:**

```bash
minikube image build -t getfit-server:latest ./server
minikube image build -t getfit-frontend:latest --build-arg API_URL=http://getfit.local/api ./frontend
```

## 4. Configure Secrets

Copy the example secrets file and fill in your real credentials:

```bash
cp k8s/secrets.example.yaml k8s/secrets.yaml
```

Edit `k8s/secrets.yaml` with your actual values:

| Key              | Description                              |
|------------------|------------------------------------------|
| `DB_PASSWORD`    | PostgreSQL password                      |
| `JWT_SECRET`     | Secret key for JWT token signing         |
| `EMAIL_USER`     | Gmail address for sending emails         |
| `EMAIL_PASSWORD` | Gmail App Password (not your login pass) |
| `DATABASE_URL`   | Full connection string (update password) |

> **Important:** `k8s/secrets.yaml` is gitignored — never commit real credentials.

## 5. Deploy (In Order)

Apply the manifests in this order:

```bash
# 1. Namespace
kubectl apply -f k8s/namespace.yaml

# 2. Configuration & Secrets
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml

# 3. Database
kubectl apply -f k8s/postgres.yaml

# 4. Wait for PostgreSQL to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n getfit --timeout=120s

# 5. Run database migrations
kubectl apply -f k8s/migration-job.yaml

# 6. Wait for migrations to complete
kubectl wait --for=condition=complete job/prisma-migrate -n getfit --timeout=120s

# 7. Backend & Frontend
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml

# 8. Ingress
kubectl apply -f k8s/ingress.yaml
```

## 6. Configure Host Routing

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

## 7. Access the Application

Open your browser and navigate to:

| URL                            | What it serves         |
|--------------------------------|------------------------|
| `http://getfit.local`          | Frontend (SPA)         |
| `http://getfit.local/api/*`    | Backend API            |
| `http://getfit.local/images/*` | Exercise & Food images |
| `http://getfit.local/uploads/*`| Profile pictures       |

No port number needed — Ingress listens on port **80** (default HTTP).

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
kubectl apply -f k8s/migration-job.yaml
```

### Access PostgreSQL directly

```bash
kubectl exec -it -n getfit postgres-0 -- psql -U postgres -d getfit
```

### Stop / Start the cluster

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

To remove everything but keep the cluster:

```bash
kubectl delete namespace getfit
```

To destroy the entire cluster (including all data):

```bash
minikube delete
```

## Architecture Overview

```
                        ┌─────────────────────────────────────────┐
                        │  Minikube Cluster (namespace: getfit)   │
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
