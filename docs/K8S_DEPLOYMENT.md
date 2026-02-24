# GetFit — Kubernetes Deployment Guide

This guide covers deploying the GetFit application on Kubernetes using **Kustomize** overlays.

- **Minikube** — local dev with in-cluster PostgreSQL (StatefulSet)
- **GKE** — production with Google Cloud SQL + Cloud SQL Auth Proxy

## Manifest Structure

```
k8s/
├── base/                        # Shared resources (all environments)
│   ├── kustomization.yaml
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── backend.yaml             # Deployment + Service + PVC (uploads)
│   ├── frontend.yaml            # Deployment + Service
│   ├── ingress.yaml
│   └── secrets.example.yaml
├── overlays/
│   ├── minikube/                # Local dev cluster
│   │   ├── kustomization.yaml
│   │   ├── postgres.yaml        # StatefulSet + Service (in-cluster DB)
│   │   ├── migration-job.yaml
│   │   ├── seed-job.yaml
│   │   ├── secrets.example.yaml
│   │   └── secrets.yaml          ← you create (gitignored)
│   └── gke/                     # Google Kubernetes Engine
│       ├── kustomization.yaml
│       ├── service-account.yaml  # KSA for Workload Identity
│       ├── migration-job.yaml    # + Cloud SQL Proxy sidecar
│       ├── seed-job.yaml         # + Cloud SQL Proxy sidecar
│       ├── secrets.example.yaml
│       └── secrets.yaml          ← you create (gitignored)
```

---

## Minikube Deployment

### Prerequisites

- [Minikube](https://minikube.sigs.k8s.io/docs/start/) installed
- [kubectl](https://kubernetes.io/docs/tasks/tools/) installed
- Docker Desktop installed (used by minikube as a driver)

### 1. Start Minikube

```bash
minikube start --driver=docker / --driver=hyperv
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
docker build -t getfit-server:latest ./server
docker build -t getfit-frontend:latest ./frontend

minikube image load getfit-server:latest
minikube image load getfit-frontend:latest
```

**Option C — Use `minikube image build`:**

```bash
minikube image build -t getfit-server:latest ./server
minikube image build -t getfit-frontend:latest ./frontend
```

### 4. Configure Secrets

```bash
cp k8s/overlays/minikube/secrets.example.yaml k8s/overlays/minikube/secrets.yaml
```

Edit `k8s/overlays/minikube/secrets.yaml`:

| Key              | Description                              |
|------------------|------------------------------------------|
| `DB_PASSWORD`    | PostgreSQL password                      |
| `JWT_SECRET`     | Secret key for JWT token signing         |
| `EMAIL_USER`     | Gmail address for sending emails         |
| `EMAIL_PASSWORD` | Gmail App Password (not your login pass) |
| `DATABASE_URL`   | Full connection string (update password) |

> **Important:** `secrets.yaml` is gitignored — never commit real credentials.

### 5. Deploy

```bash
kubectl apply -k k8s/overlays/minikube
```

> **Note:** If you get a `field is immutable` error for Jobs, delete them first:
> ```bash
> kubectl delete job prisma-migrate db-seed -n getfit --ignore-not-found
> kubectl apply -k k8s/overlays/minikube
> ```

Wait for resources to be ready:

```bash
kubectl wait --for=condition=ready pod -l app=postgres -n getfit --timeout=120s
kubectl wait --for=condition=complete job/prisma-migrate -n getfit --timeout=120s
kubectl wait --for=condition=complete job/db-seed -n getfit --timeout=180s
kubectl wait --for=condition=ready pod -l app=backend -n getfit --timeout=120s
```

> The `db-seed` job imports food and exercise data from JSON files after migrations complete.

### 6. Configure Host Routing

```bash
minikube ip
```

Add to your hosts file (`C:\Windows\System32\drivers\etc\hosts` or `/etc/hosts`):

```
<minikube-ip>  getfit.local
```

### 7. Access the Application

| URL                            | What it serves         |
|--------------------------------|------------------------|
| `http://getfit.local`          | Frontend (SPA)         |
| `http://getfit.local/api/*`    | Backend API            |
| `http://getfit.local/images/*` | Exercise & Food images |
| `http://getfit.local/uploads/*`| Profile pictures       |

---

## GKE Deployment (Cloud SQL)

### Prerequisites

- [`gcloud` CLI](https://cloud.google.com/sdk/docs/install) installed and configured
- Docker images pushed to Artifact Registry
- A Cloud SQL for PostgreSQL instance created

### 1. Create the Cloud SQL Instance

```bash
# Create the instance
gcloud sql instances create getfit-postgres \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=europe-west1 \
  --storage-size=10GB \
  --storage-type=SSD \
  --project=getfit-prod-487511

# Create the database
gcloud sql databases create getfit \
  --instance=getfit-postgres \
  --project=getfit-prod-487511

# Create the user (CHANGE THIS PASSWORD to something secure!)
gcloud sql users create getfit_user \
  --instance=getfit-postgres \
  --password=YOUR_SECURE_PASSWORD_HERE \
  --project=getfit-prod-487511
```

### 2. Create the GKE Cluster (with Workload Identity)

```bash
gcloud container clusters create getfit-cluster \
  --zone europe-west1-b \
  --num-nodes 1 \
  --machine-type e2-standard-2 \
  --disk-type pd-standard \
  --disk-size 30 \
  --release-channel regular \
  --workload-pool=getfit-prod-487511.svc.id.goog
```

> If the cluster already exists without Workload Identity:
> ```bash
> gcloud container clusters update getfit-cluster \
>   --zone europe-west1-b \
>   --workload-pool=getfit-prod-487511.svc.id.goog
> ```

### 3. Set Up Workload Identity (Cloud SQL Auth)

Create a Google Service Account and bind it to the Kubernetes ServiceAccount:

```bash
# Create the Google Service Account
gcloud iam service-accounts create getfit-backend \
  --display-name="GetFit Backend (Cloud SQL)" \
  --project=getfit-prod-487511

# Grant it Cloud SQL Client role
gcloud projects add-iam-policy-binding getfit-prod-487511 \
  --member="serviceAccount:getfit-backend@getfit-prod-487511.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

# Allow the Kubernetes SA to impersonate the Google SA
gcloud iam service-accounts add-iam-policy-binding \
  getfit-backend@getfit-prod-487511.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:getfit-prod-487511.svc.id.goog[getfit/backend-sa]"
```

### 4. Connect to the Cluster

```bash
gcloud container clusters get-credentials getfit-cluster \
  --zone europe-west1-b \
  --project getfit-prod-487511
```

### 5. Push Docker Images

```bash
docker build -t europe-west1-docker.pkg.dev/getfit-prod-487511/getfit-repo/getfit-server:latest ./server
docker build -t europe-west1-docker.pkg.dev/getfit-prod-487511/getfit-repo/getfit-frontend:latest ./frontend

docker push europe-west1-docker.pkg.dev/getfit-prod-487511/getfit-repo/getfit-server:latest
docker push europe-west1-docker.pkg.dev/getfit-prod-487511/getfit-repo/getfit-frontend:latest
```

### 6. Configure Secrets

```bash
cp k8s/overlays/gke/secrets.example.yaml k8s/overlays/gke/secrets.yaml
```

Edit `k8s/overlays/gke/secrets.yaml`:

| Key              | Description                                                |
|------------------|------------------------------------------------------------|
| `JWT_SECRET`     | Strong production JWT secret                               |
| `EMAIL_USER`     | Gmail address for sending emails                           |
| `EMAIL_PASSWORD` | Gmail App Password                                         |
| `DATABASE_URL`   | `postgresql://getfit_user:<password>@127.0.0.1:5432/getfit`|

> The `DATABASE_URL` points to `127.0.0.1:5432` because the Cloud SQL Auth Proxy sidecar
> tunnels the connection inside each pod.

### 7. Deploy

```bash
kubectl apply -k k8s/overlays/gke
```

> **Note:** If you get a `field is immutable` error for Jobs, delete them first:
> ```bash
> kubectl delete job prisma-migrate db-seed -n getfit --ignore-not-found
> kubectl apply -k k8s/overlays/gke
> ```

Wait for resources:

```bash
kubectl wait --for=condition=complete job/prisma-migrate -n getfit --timeout=180s
kubectl wait --for=condition=complete job/db-seed -n getfit --timeout=300s
kubectl wait --for=condition=ready pod -l app=backend -n getfit --timeout=120s
```

Check ingress external IP:

```bash
kubectl get ingress -n getfit
```

> The GKE Load Balancer may take 3-5 minutes to provision an external IP.

---

## How Cloud SQL Auth Proxy Works

In the GKE overlay, the backend Deployment, migration Job, and seed Job each include a
**Cloud SQL Auth Proxy v2** sidecar container:

```
┌────────────────────────────────────────┐
│  Backend Pod                           │
│                                        │
│  ┌──────────┐     ┌────────────────┐   │
│  │ backend  │────►│ cloud-sql-proxy│──────► Cloud SQL
│  │ :3000    │     │ :5432          │   │    (getfit-postgres)
│  └──────────┘     └────────────────┘   │
│   127.0.0.1:5432                       │
└────────────────────────────────────────┘
```

- The proxy authenticates via **Workload Identity** (no JSON key files)
- Backend connects to `127.0.0.1:5432` — the proxy forwards to Cloud SQL
- No database traffic leaves the pod unencrypted

---

## Useful Commands

### Check pod status

```bash
kubectl get pods -n getfit
```

### View logs

```bash
# Backend logs
kubectl logs -n getfit deployment/backend -c backend

# Cloud SQL Proxy logs (GKE only)
kubectl logs -n getfit deployment/backend -c cloud-sql-proxy

# PostgreSQL logs (minikube only)
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

### Re-run migrations

```bash
kubectl delete job prisma-migrate -n getfit
kubectl apply -k k8s/overlays/minikube   # or k8s/overlays/gke
```

### Re-run database seeding

```bash
kubectl delete job db-seed -n getfit
kubectl apply -k k8s/overlays/minikube   # or k8s/overlays/gke
```

> The seed scripts use `upsert`, so re-running is safe — no duplicates.

### Access PostgreSQL directly (minikube only)

```bash
kubectl exec -it -n getfit postgres-0 -- psql -U postgres -d getfit
```

### Access Cloud SQL directly (GKE)

```bash
gcloud sql connect getfit-postgres --user=getfit_user --project=getfit-prod-487511
```

### Stop / Start Minikube

```bash
minikube stop     # data persists
minikube start    # resume
```

> `minikube stop` preserves PVC data. Only `minikube delete` destroys everything.

---

## Tear Down

Remove all GetFit resources but keep the cluster:

```bash
kubectl delete namespace getfit
```

### Minikube

```bash
minikube delete
```

### GKE

Delete the cluster:

```bash
gcloud container clusters delete getfit-cluster \
  --zone europe-west1-b \
  --project getfit-prod-487511
```

Delete Cloud SQL instance (WARNING: destroys all data):

```bash
gcloud sql instances delete getfit-postgres --project=getfit-prod-487511
```

Delete Artifact Registry images:

```bash
gcloud artifacts docker images delete \
  europe-west1-docker.pkg.dev/getfit-prod-487511/getfit-repo/getfit-server --quiet
gcloud artifacts docker images delete \
  europe-west1-docker.pkg.dev/getfit-prod-487511/getfit-repo/getfit-frontend --quiet
```

Delete the Google Service Account:

```bash
gcloud iam service-accounts delete \
  getfit-backend@getfit-prod-487511.iam.gserviceaccount.com \
  --project=getfit-prod-487511
```

---

## Fallback: Service Account Key (not recommended)

If Workload Identity is not available, you can use a JSON key file instead:

```bash
# Create a key for the Google SA
gcloud iam service-accounts keys create key.json \
  --iam-account=getfit-backend@getfit-prod-487511.iam.gserviceaccount.com

# Create a Kubernetes Secret from the key
kubectl create secret generic cloudsql-sa-key \
  --from-file=key.json=key.json \
  -n getfit

# Clean up local key
rm key.json
```

Then add to the Cloud SQL Proxy container args:
```yaml
args:
  - "getfit-prod-487511:europe-west1:getfit-postgres"
  - "--port=5432"
  - "--credentials-file=/secrets/key.json"
volumeMounts:
  - name: cloudsql-sa-key
    mountPath: /secrets
    readOnly: true
```

And add the volume to the pod spec:
```yaml
volumes:
  - name: cloudsql-sa-key
    secret:
      secretName: cloudsql-sa-key
```

> **Warning:** JSON key files are long-lived credentials. Prefer Workload Identity.

---

## Architecture Overview

### Minikube (Local Dev)

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
                        │              │StatefulSet               │
                        │              │  :5432   │               │
                        │              └────┬─────┘               │
                        │              ┌────▼─────┐               │
                        │              │   PVC    │               │
                        │              │  (1Gi)   │               │
                        │              └──────────┘               │
                        └─────────────────────────────────────────┘
```

### GKE (Production — Cloud SQL)

```
                        ┌─────────────────────────────────────────┐
                        │  GKE Cluster (namespace: getfit)        │
                        │                                         │
  Browser               │  ┌───────────┐      ┌───────────────┐  │
  http://<LB-IP> ──────►  │  Ingress   │      │  ConfigMap +  │  │
                        │  │  (GCE LB) │      │  Secrets      │  │
                        │  └─────┬──────┘      └───────────────┘  │
                        │    /   │    /api                         │
                        │   ▼    │    ▼                            │
                        │  ┌─────┴──┐  ┌──────────────────────┐   │
                        │  │Frontend│  │  Backend Pod          │   │
                        │  │(nginx) │  │ ┌────────┐ ┌───────┐ │   │
                        │  │ :80    │  │ │backend │►│ proxy │─┼───┼──► Cloud SQL
                        │  └────────┘  │ │ :3000  │ │ :5432 │ │   │   (getfit-postgres)
                        │              │ └────────┘ └───────┘ │   │
                        │              └──────────────────────┘   │
                        └─────────────────────────────────────────┘
```

