# GetFit

A fitness tracking and coaching application with a Node.js/Express backend, Expo (React Native) web frontend, and PostgreSQL database.

## Project Structure

```
├── server/           # Backend API (Node.js + Express + Prisma)
├── frontend/         # Frontend SPA (Expo web → nginx)
├── k8s/              # Kubernetes manifests (Kustomize)
│   ├── base/         #   Shared resources
│   ├── overlays/
│   │   ├── minikube/ #   Local development cluster
│   │   └── gke/      #   Google Kubernetes Engine
├── docker-compose.yml
└── docker-compose.dev.yml
```

---

## Deployment Options

### 1. Docker Compose (simplest)

**Prerequisites:** Docker and Docker Compose installed.

Create a `.env` file with your credentials:

```env
DB_PASSWORD=postgres
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_email_app_password
APP_URL=http://localhost:3000
API_URL=http://localhost:3000/api
```

Start the stack:

```bash
# Production
docker compose up -d --build

# Development (with hot-reload)
docker compose -f docker-compose.dev.yml up -d --build
```

| URL                        | Service            |
|----------------------------|--------------------|
| `http://localhost`         | Frontend           |
| `http://localhost:3000`    | Backend API        |

Stop:

```bash
docker compose down          # stop containers (data persists)
docker compose down -v       # stop containers and delete volumes
```

---

### 2. Kubernetes — Minikube (local)

Deploy to a local Minikube cluster using Kustomize.

**Prerequisites:** Minikube, kubectl, Docker Desktop.

```bash
# Start minikube
minikube start --driver=docker
minikube addons enable ingress

# Build images inside minikube's Docker daemon
& minikube -p minikube docker-env --shell powershell | Invoke-Expression
docker build -t getfit-server:latest ./server
docker build -t getfit-frontend:latest ./frontend

# Create secrets (copy example, fill in real values)
cp k8s/overlays/minikube/secrets.example.yaml k8s/overlays/minikube/secrets.yaml
# Edit k8s/overlays/minikube/secrets.yaml with your credentials

# Deploy
kubectl apply -k k8s/overlays/minikube

# Wait for pods
kubectl wait --for=condition=ready pod -l app=postgres -n getfit --timeout=120s
kubectl wait --for=condition=complete job/prisma-migrate -n getfit --timeout=120s
kubectl wait --for=condition=ready pod -l app=backend -n getfit --timeout=120s

# Add host entry (run as Administrator)
# Add to C:\Windows\System32\drivers\etc\hosts:
#   <minikube-ip>  getfit.local
minikube ip
```

Access at **http://getfit.local**

See [K8S_DEPLOYMENT.md](K8S_DEPLOYMENT.md) for detailed instructions.

---

### 3. Kubernetes — GKE (production)

Deploy to Google Kubernetes Engine using Kustomize with Artifact Registry images.

**Prerequisites:** GKE cluster created, `gcloud` CLI configured, images pushed to Artifact Registry.

```bash
# Authenticate with GKE
gcloud container clusters get-credentials YOUR_CLUSTER --region YOUR_REGION --project getfit-prod-487511

# Create secrets (copy example, fill in production values)
cp k8s/overlays/gke/secrets.example.yaml k8s/overlays/gke/secrets.yaml
# Edit k8s/overlays/gke/secrets.yaml with production credentials

# Deploy
kubectl apply -k k8s/overlays/gke

# Check status
kubectl get pods -n getfit
kubectl get ingress -n getfit
```

Images are pulled from Artifact Registry:
- `europe-west1-docker.pkg.dev/getfit-prod-487511/getfit-repo/getfit-server:latest`
- `europe-west1-docker.pkg.dev/getfit-prod-487511/getfit-repo/getfit-frontend:latest`

---

## Useful Commands

```bash
# Check pod status
kubectl get pods -n getfit

# View logs
kubectl logs -n getfit deployment/backend
kubectl logs -n getfit deployment/frontend
kubectl logs -n getfit job/prisma-migrate

# Restart deployments
kubectl rollout restart deployment backend -n getfit
kubectl rollout restart deployment frontend -n getfit

# Re-run migrations
kubectl delete job prisma-migrate -n getfit
kubectl apply -k k8s/overlays/minikube   # or k8s/overlays/gke

# Tear down (remove namespace, keep cluster)
kubectl delete namespace getfit
```