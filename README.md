# 🧮 MathTutor AI Agent Backend

[![Live Demo](https://img.shields.io/badge/Live-https://mathtutor-agent-backend-1087118236338.us-central1.run.app-blue?logo=googlecloud)](https://mathtutor-agent-backend-1087118236338.us-central1.run.app/health) [![Docker](https://img.shields.io/badge/Docker-Ready-green?logo=docker)](https://hub.docker.com) [![Node](https://img.shields.io/badge/Node-20-green?logo=node.js)](https://nodejs.org)

## 🎯 Problem We Solve

Midnight coding frustration: \"Why won't this integral solve?\"

**MathTutor AI** - multimodal math genius for developers/students:

- Snap handwritten equations → LaTeX solutions
- Voice calculus problems → step-by-step reasoning
- Stateful tutoring with 30min memory
- Tool-powered verification (calculator, search)

**Live right now:** [Health check](https://mathtutor-agent-backend-1087118236338.us-central1.run.app/health) → `{\"status\":\"ok\"}`

## 🏗️ System Architecture

![Architecture](./src/architecture/math_tutor_system_architecture.svg)

**3-Tier Design:**
| Tier | Components | Tech |
|------|------------|------|
| **Client** | React UI, Multimodal input, WebSocket | [Vite + KaTeX](https://github.com/tay4real/ai-agent-frontend) |
| **Backend** | Express REST + WebSocket, Session memory, Agent service | Node.js 20 |
| **AI** | Gemini 2.5 Flash + Tools (calculator/search) | Google AI Studio |

## 🚀 Spin-up Instructions (Judges: 2 minutes!)

### 1. Local Development (30s)

```bash
git clone <repo> && cd ai-agent-backend
cp .env.example .env  # Add GEMINI_API_KEY from ai.google.dev
npm install
npm run dev  # http://localhost:5000
```

**Test immediately:**

```bash
curl -X POST http://localhost:5000/api/chat -H "Content-Type: application/json" -d '{"text":"solve x^2 + 2x + 1 = 0"}'
```

### 2. Docker Production (60s)

```bash
docker build -t mathtutor-agent .
docker run -p 5000:8080 -e GEMINI_API_KEY=your-key mathtutor-agent
```

**Port:** `$PORT` or `8080` (Cloud Run compatible)

### 3. GCP Cloud Run (Live Deploy - 3min)

```bash
# Prerequisites: gcloud CLI, Docker Desktop
bash deploy.sh
```

→ **Live URL printed** (already deployed!)

## 📋 API Reference

| Endpoint                | Type                 | Example                                          |
| ----------------------- | -------------------- | ------------------------------------------------ |
| `POST /api/chat`        | Text chat            | `{\"text\":\"∫x^2dx\", \"sessionId\":\"user1\"}` |
| `POST /api/chat/stream` | Streaming            | Server-Sent Events                               |
| `POST /api/audio`       | Voice (base64 MP3)   | Transcribe → AI                                  |
| `POST /api/image`       | Vision (math photos) | OCR + solve                                      |
| `wss:// /`              | WebSocket            | Live bidirectional                               |

**WebSocket Example:**

```js
const ws = new WebSocket('ws://localhost:5000');
ws.send(JSON.stringify({ type: 'text', text: '2+2*3', sessionId: 'user1' }));
```

## 🛠️ Tech Stack & Decisions

| Component | Choice             | Why                                 |
| --------- | ------------------ | ----------------------------------- |
| Framework | Express + ws       | Lightweight, WebSocket native       |
| AI        | Gemini 2.5 Flash   | Multimodal, cheap ($0.35/1M tokens) |
| Memory    | In-memory TTL      | Simple, scales with Redis           |
| Deploy    | Docker → Cloud Run | Zero-config scaling                 |
| Health    | `nc` script        | Cloud Run compatible                |

**Production Dockerfile:**

```dockerfile
FROM node:20-alpine
RUN npm ci --only=production
HEALTHCHECK CMD nc localhost $PORT
USER node
CMD [\"npm\", \"start\"]
```

## 🎪 Live Demo Results

**Health:** ✅ `{\"status\":\"ok\"}`

**Math Test:**

```
POST /api/chat: \"solve ∫(x^2+1)dx\"
→ \"The antiderivative is (1/3)x³ + x + C\"
```

**Architecture validates:** Full multimodal → tool calling → streaming flow.

## 🌐 Production Live

**URL:** https://mathtutor-agent-backend-1087118236338.us-central1.run.app  
**Project:** math-tutor-live (GCP Cloud Run)
**Scaling:** 1 vCPU/1GiB, auto-scale to 10 instances

## 🔮 Next: Frontend Integration

Connect this backend to React client for fullstack math tutoring app!

---

**Built for hackathons** - clone → npm dev → working in 60s. Questions? Open issue.

![Hackathon Ready](https://img.shields.io/badge/Hackathon-Ready-brightgreen)
