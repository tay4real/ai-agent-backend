# Google Cloud Run Deployment TODO

## Status: Steps 1-3 Complete

### Step 1: [COMPLETE] Containerize App ✓

- Created `Dockerfile` (Node 20-alpine, prod deps, healthcheck)
- Updated `package.json` (postinstall)
- Patched `server.js` (PORT handling w/ GCP_PORT fallback)

### Step 2: [PENDING] gcloud CLI Setup & Auth

```
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com
```

### Step 3: [PENDING] Build & Push Container

```
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/ai-agent
```

### Step 4: [PENDING] Deploy to Cloud Run

```
gcloud run deploy ai-agent \
  --image gcr.io/YOUR_PROJECT_ID/ai-agent \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10
```

### Step 5: [PENDING] Test Deployment

- Get service URL from output
- Test `/health`, `/api`, WebSocket (wss://)
- Verify free tier usage in console

### Step 6: [PENDING] Update Frontend & Docs

- Point frontend to Cloud Run URL
- Add env vars (GEMINI_API_KEY → Secret Manager)
- Monitor logs: `gcloud run services logs tail ai-agent`

**Next: Replace YOUR_PROJECT_ID and run Step 2 commands.**
