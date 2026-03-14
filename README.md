# 🧮 Math Tutor AI Agent Backend - Gemini-Powered Math Master

## The Story Begins...

Imagine midnight coding session frustration: \"Why won't this integral solve?\"

Enter **Math Tutor AI** – your tireless, multimodal math genius. Speak equations, snap graphs, chat calculus... it remembers, teaches step-by-step, verifies with tools.

No more Stack Overflow rabbit holes. This Node.js backend specializes your AI as the ultimate math coach:

- Voice a problem → transcribed + solved
- Photo of handwritten math → LaTeX'd explanation
- Complex calc → precise evaluation
- Stateful tutoring sessions

Powered by Gemini 2.5 Flash. Production-ready with REST + WebSockets.

**MathTutor AI stays on-topic – asks \"What's your math challenge?\" for off-topic queries.**

## 🚀 Features at a Glance

| Modality               | REST Endpoint           | WebSocket Type | Description                                |
| ---------------------- | ----------------------- | -------------- | ------------------------------------------ |
| **Text Chat**          | `POST /api/chat`        | `text`         | Stateful conversations with 30min memory   |
| **Streaming**          | `POST /api/chat/stream` | `stream`       | Real-time token-by-token responses         |
| **Audio**              | `POST /api/audio`       | `audio`        | Transcribe → AI process (MP3 base64)       |
| **Vision/Math Graphs** | `POST /api/image`       | `image`        | Analyze handwritten math, graphs, diagrams |
| **Tools**              | `POST /api/tools`       | `tools`        | Function calling: math search + calculator |
| **Sessions**           | `/api/session/*`        | `clear`/`info` | Manage memory per session                  |

**Math-Focused Tools:**

- `search(query)` - Math concept lookups
- `calculator(expression)` - Safe math evaluation

## ⚙️ Quickstart (2 minutes)

1. **Clone & Install**

   ```bash
   git clone <repo> ai-agent-backend
   cd ai-agent-backend
   cp .env.example .env
   # Add your GEMINI_API_KEY from Google AI Studio
   npm install
   ```

2. **Run Dev Server**

   ```bash
   npm run dev  # nodemon src/server.js
   ```

   Server on `http://localhost:5000`

3. **Test Live Chat (WebSocket)**

   ```bash
   # Use ws client or your frontend
   wscat -c ws://localhost:5000
   # Send: {\"type\":\"text\",\"text\":\"Hello, solve 2+2*3\"}
   ```

4. **Docker (Production)**
   ```bash
   docker build -t ai-agent .
   docker run -p 5000:5000 -e GEMINI_API_KEY=yourkey ai-agent
   ```

## 🛠️ API Examples

**Text Chat (cURL):**

```bash
curl -X POST http://localhost:5000/api/chat \
  -H \"Content-Type: application/json\" \
  -d '{\"text\":\"Explain quantum computing simply\",\"sessionId\":\"user1\"}'
```

**Streaming:**

```bash
curl -X POST http://localhost:5000/api/chat/stream \
  -H \"Content-Type: application/json\" \
  -d '{\"text\":\"Write a haiku about code\"}'
# Streams SSE events!
```

**Audio:** Send base64 MP3 + `sessionId`

**Tools:** AI decides when to call functions automatically.

## 🏗️ Architecture

```
[Frontend] ↔ WebSocket (Live) / REST API
                ↓
     Express Server (src/server.js)
        ↕
WebSocketServer (liveSocket.js) + Session Memory
        ↕
   AgentService (Gemini AI + Tools)
        ↕
Google Gemini 2.5 Flash (Multimodal)
```

- **Memory:** In-memory sessions (30min TTL, auto-clean)
- **Scalability:** Stateless design, Redis-ready
- **Security:** Safe tool eval, API key env-only

## 🤝 Connect & Extend

- **Frontend Example:** React/Vue + native WebSocket
- **Extend Tools:** Add to `availableTools` array
- **Scale:** Kubernetes + Redis sessions
- **Vision Pro:** Full Gemini image support ready

## 📈 Stats

- **AI Model:** Gemini 2.5 Flash Lite (fast + cheap)
- **Sessions:** Unlimited (memory-limited)
- **Rate Limits:** Gemini API defaults

Built with ❤️ for AI builders. **Fork, deploy, create!**

**Questions?** Open an issue.

---

_Powered by [Google Gemini](https://ai.google.dev) | Node.js | WebSockets_
