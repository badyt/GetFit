# GetFit Docker Deployment (Quick Guide)

## Prerequisites
- [Docker](https://docs.docker.com/get-docker/) (version 20.10 or higher)
- [Docker Compose](https://docs.docker.com/compose/install/) (version 2.0 or higher)

## Deployment Flow

1. Copy `.env.example` to `.env` and set your configuration values.
2. Build and start all services:

   ```bash
   docker-compose up -d
   ```

3. Access the application:
   - **Frontend:** [http://localhost](http://localhost) (port 80)
   - **Backend API:** [http://localhost:3000](http://localhost:3000)

## Building Images Manually

```bash
docker-compose build
```

## Stopping Services

```bash
docker-compose down
```

---

For email setup instructions, see [EMAIL_SETUP_GUIDE.md](EMAIL_SETUP_GUIDE.md).
