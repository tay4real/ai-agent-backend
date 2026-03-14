import http from 'http';
import app from './app.js';
import { startSocket } from './sockets/liveSocket.js';
import {
  runAgent,
  runAgentStream,
  runAgentWithAudio,
  runAgentWithTools,
  executeFunctionCall,
  clearSession,
  getSessionInfo,
} from './services/agentService.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || process.env.GCP_PORT || 5000;
console.log(`Using PORT: ${PORT}`);

const server = http.createServer(app);

// Start WebSocket server
startSocket(server);

// Define available tools
const availableTools = [
  {
    name: 'search',
    description: 'Search for information on the web',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query' },
      },
      required: ['query'],
    },
  },
  {
    name: 'calculator',
    description: 'Evaluate a mathematical expression',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'Math expression to evaluate',
        },
      },
      required: ['expression'],
    },
  },
];

// REST API Routes

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { text, sessionId, useTools } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const sid = sessionId || 'http_' + Date.now();
    let response;

    if (useTools) {
      const result = await runAgentWithTools(text, sid, availableTools);
      if (result.type === 'function_call') {
        const functionResults = [];
        for (const call of result.calls) {
          const funcResult = await executeFunctionCall(call.name, call.args);
          functionResults.push({ name: call.name, result: funcResult });
        }
        return res.json({
          type: 'function_calls',
          calls: result.calls,
          results: functionResults,
          sessionId: sid,
        });
      }
      response = result.content;
    } else {
      response = await runAgent(text, sid);
    }

    res.json({ response, sessionId: sid });
  } catch (error) {
    console.error('Chat error:', error);
    res
      .status(500)
      .json({ error: 'Failed to process message', details: error.message });
  }
});

// Streaming chat endpoint
app.post('/api/chat/stream', async (req, res) => {
  try {
    const { text, sessionId } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const sid = sessionId || 'http_stream_' + Date.now();

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send session info
    res.write(
      `data: ${JSON.stringify({ type: 'session', sessionId: sid })}\n\n`
    );

    await runAgentStream(text, sid, chunk => {
      res.write(
        `data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`
      );
    });

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Stream error:', error);
    res
      .status(500)
      .json({ error: 'Failed to stream message', details: error.message });
  }
});

// Audio processing endpoint
app.post('/api/audio', async (req, res) => {
  try {
    const { audio, mimeType, sessionId } = req.body;

    if (!audio) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    const sid = sessionId || 'http_audio_' + Date.now();
    const response = await runAgentWithAudio(audio, sid);

    res.json({ response, sessionId: sid });
  } catch (error) {
    console.error('Audio error:', error);
    res
      .status(500)
      .json({ error: 'Failed to process audio', details: error.message });
  }
});

// Tools endpoint
app.post('/api/tools', async (req, res) => {
  try {
    const { text, sessionId, toolName, toolArgs } = req.body;

    const sid = sessionId || 'http_tools_' + Date.now();

    if (toolName && toolArgs) {
      // Direct tool call
      const result = await executeFunctionCall(toolName, toolArgs);
      return res.json({ toolName, result, sessionId: sid });
    }

    if (!text) {
      return res.status(400).json({ error: 'Text or toolName is required' });
    }

    const response = await runAgentWithTools(text, sid, availableTools);

    if (response.type === 'function_call') {
      const functionResults = [];
      for (const call of response.calls) {
        const funcResult = await executeFunctionCall(call.name, call.args);
        functionResults.push({ name: call.name, result: funcResult });
      }
      return res.json({
        type: 'function_calls',
        calls: response.calls,
        results: functionResults,
        sessionId: sid,
      });
    }

    res.json({ response: response.content, sessionId: sid });
  } catch (error) {
    console.error('Tools error:', error);
    res
      .status(500)
      .json({ error: 'Failed to process tools', details: error.message });
  }
});

// Session endpoints
app.post('/api/session/clear', (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  const success = clearSession(sessionId);
  res.json({ success, sessionId });
});

app.get('/api/session/info', (req, res) => {
  const { sessionId } = req.query;

  if (!sessionId) {
    return res
      .status(400)
      .json({ error: 'sessionId query parameter is required' });
  }

  const info = getSessionInfo(sessionId);

  if (!info) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({ sessionId, info });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
  console.log(`REST API available at http://localhost:${PORT}/api`);
});
