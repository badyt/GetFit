# GetFit -- Cloud-Native Workout Management Platform

GetFit is a fullstack workout management platform supporting Trainer and
Trainee roles. It is designed and deployed using production-style
architecture with Docker and Kubernetes.

------------------------------------------------------------------------

## 🚀 Overview

GetFit allows trainers to create structured workout and meal plans for
their trainees, while trainees can track their daily progress, weight,
and nutrition intake.

The project demonstrates real-world fullstack development,
containerization, and cloud-native deployment practices.

------------------------------------------------------------------------

## 🧩 Features

### 👨‍🏫 Trainer
- Manage assigned trainees.
- Create and assign workout plans.
- Create and assign meal plans.
- Track trainee weight and nutrition history.
- Invite trainees via secure email invitations.
- Generate and share unique join codes for trainee enrollment.

---

### 🧍 Trainee
- View assigned workout and meal plans.
- Log daily weight measurements.
- Log calorie and protein intake.
- Upload profile images.
- Join a trainer using a secure invitation code.
- View historical progress data.

---

### 🛡 Admin (Environment-Generated Account)
- Admin account generated securely during deployment via environment variables / Kubernetes secrets.
- Promote trainees to trainers.
- Delete users.
- Add and manage food catalog entries.
- Add and manage exercise catalog entries.
- System-level management and moderation capabilities.

---

### 🔐 Authentication & Email Workflow
- Secure registration and login using JWT-based authentication.
- SMTP-based transactional email delivery implemented with Nodemailer.
- Trainer invitation flow with secure email-based verification.
- Role-based access control (Admin / Trainer / Trainee).

------------------------------------------------------------------------

## 🛠 Tech Stack

Frontend: - Expo (React Native Web) - Static export served via nginx

Backend: - Node.js + Express - Prisma ORM - JWT Authentication

Database: - PostgreSQL - Cloud SQL (GKE production)

Infrastructure: - Docker & Docker Compose - Kubernetes (GKE) - nginx
reverse proxy - Runtime environment injection 

------------------------------------------------------------------------

## 🚀 Deployment

Detailed deployment instructions are available in the `/docs` directory.

### 📧 Email Configuration

Setup and configuration for SMTP email service:

👉 [Email Setup Guide](docs/email-setup.md)

### 🐳 Docker Compose (Local / Single-Host)

Run the full stack locally using Docker Compose:

👉 [Docker Compose Deployment Guide](docs/DOCKER_DEPLOYMENT.md)

---

### ☸ Kubernetes (Minikube/GKE Production Deployment)

Deploy the application using kubernetes locally (minikube) or to Google Kubernetes Engine:

👉 [Kubernetes (Minikube/GKE) Deployment Guide](docs/K8S_DEPLOYMENT.md)

---

------------------------------------------------------------------------

## 🔐 Configuration

Environment variables include:

Backend: - DATABASE_URL - JWT_SECRET - EMAIL_USER - EMAIL_PASSWORD

Frontend: - build-time environment variables using EXPO_PUBLIC_* pattern - Defaults to "/api" in production (Ingress routing)

------------------------------------------------------------------------

## 📚 What This Project Demonstrates

-   Fullstack system design and implementation
-   Containerized multi-service architecture
-   Kubernetes deployment (GKE)
-   Managed PostgreSQL integration (Cloud SQL)
-   Health checks and service dependencies
-   Environment-specific configuration handling
-   Production-ready nginx setup

------------------------------------------------------------------------

## 🏗 Architecture (GKE – Cloud SQL Auth Proxy Sidecar)

User Browser
  ↓
Kubernetes Ingress (routes: `/`, `/api`, `/uploads`)
  ↓
+-----------------------------------------------+
|                 GKE Cluster                   |
|                                               |
|  Frontend Service (ClusterIP) → Frontend Pod  |
|    - nginx serving Expo Web build             |
|                                               |
|  Backend Service (ClusterIP)  → Backend Pod   |
|  +-----------------------------------------+  |
|  | Backend Container (Node.js + Express)   |  |
|  |   - Prisma ORM                          |  |
|  |   - connects to DB at `localhost:5432`  |  |
|  |                                         |  |
|  | Cloud SQL Auth Proxy (sidecar)          |  |
|  |   - listens on `127.0.0.1:5432`         |  |
|  |   - tunnels/authenticates to Cloud SQL  |  |
|  +-----------------------------------------+  |
+-----------------------------------------------+
                    ↓
           Cloud SQL (PostgreSQL)

Backend → SMTP Provider (Email Service)
.
