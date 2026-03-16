#!/bin/bash

# Google Cloud Run Deployment Script for Math Tutor AI Agent Backend
# Prerequisites: Docker, gcloud CLI installed
# Usage: bash deploy.sh

set -e  # Exit on error

# Configuration
PROJECT_ID="math-tutor-live"
REGION="us-central1"
SERVICE_NAME="mathtutor-agent-backend"
REPO_NAME="ai-agent-repo"
IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}"
ENV_VARS="GEMINI_API_KEY= ${GEMINI_API_KEY}"

echo "🚀 Deploying ${SERVICE_NAME} to Cloud Run..."

# Step 1: Check prerequisites
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Install Docker Desktop."
    exit 1
fi

# Step 2: Authenticate (will prompt browser login first time)
echo "🔐 Authenticating gcloud..."
gcloud auth login --brief

# Step 3: Set project
echo "📋 Setting project to ${PROJECT_ID}..."
gcloud config set project ${PROJECT_ID}
gcloud config set run/region ${REGION}

# Step 4: Enable required APIs
echo "🔧 Enabling APIs..."
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com

# Step 5: Create Artifact Registry repository
echo "📦 Creating Artifact Registry repo..."
gcloud artifacts repositories create ${REPO_NAME} \
    --repository-format=docker \
    --location=${REGION} \
    --description="Docker repo for AI Agent Backend" || echo "Repo exists, continuing..."

# Step 6: Build and push Docker image using Cloud Build
echo "🐳 Building and pushing image: ${IMAGE_NAME}"
gcloud builds submit --tag ${IMAGE_NAME}

# Step 7: Deploy to Cloud Run
echo "☁️  Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME} \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --port 8080 \
    --cpu 1 \
    --memory 1Gi \
    --max-instances 10 \
    --set-env-vars ${ENV_VARS} \
    --timeout 300 \
    --service-account default \
    --quiet

echo "✅ Deployment complete!"
echo "🌐 Service URL: $(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format='value(status.url)')"
echo "🔍 Console: https://console.cloud.google.com/run/services/${SERVICE_NAME}?project=${PROJECT_ID}&region=${REGION}"
echo "📋 Logs: gcloud run services logs tail ${SERVICE_NAME} --region ${REGION}"
echo ""
echo "🧪 Test health: curl <service-url>/health"

