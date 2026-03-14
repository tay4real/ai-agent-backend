import { WebSocketServer } from 'ws';
import {
  runAgent,
  runAgentStream,
  runAgentWithAudio,
  runAgentWithTools,
  runAgentWithImage,
  executeFunctionCall,
  clearSession,
  getSessionInfo,
} from '../services/agentService.js';

// Simple UUID generator for sessions
const generateSessionId = () => {
  return (
    'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  );
};

// Define available tools for function calling
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
          description: 'Math expression to evaluate (e.g., 2+2, sqrt(16))',
        },
      },
      required: ['expression'],
    },
  },
  {
    name: 'get_weather',
    description: 'Get weather information for a location',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City name or location' },
      },
      required: ['location'],
    },
  },
];

export const startSocket = server => {
  const wss = new WebSocketServer({ server });

  wss.on('connection', ws => {
    // Generate unique session ID for each connection
    const sessionId = generateSessionId();
    console.log(`Client connected: ${sessionId}`);

    // Send welcome message with session info
    ws.send(
      JSON.stringify({
        type: 'session_init',
        sessionId,
        message: 'Connected to Live Agent',
      })
    );

    ws.on('message', async message => {
      try {
        const data = JSON.parse(message);

        // Handle different message types
        switch (data.type) {
          case 'text':
            await handleTextMessage(ws, data, sessionId);
            break;

          case 'stream':
            await handleStreamMessage(ws, data, sessionId);
            break;

          case 'audio':
            await handleAudioMessage(ws, data, sessionId);
            break;

          case 'tools':
            await handleToolMessage(ws, data, sessionId);
            break;

          case 'clear':
            handleClearSession(ws, sessionId);
            break;

          case 'image':
            await handleImageMessage(ws, data, sessionId);
            break;
          case 'info':
            handleGetInfo(ws, sessionId);
            break;

          default:
            ws.send(
              JSON.stringify({
                error: `Unknown message type: ${data.type}`,
              })
            );
        }
      } catch (error) {
        console.error('Message handling error:', error);
        ws.send(
          JSON.stringify({
            error: 'Failed to process message',
            details: error.message,
          })
        );
      }
    });

    // Handle streaming text messages
    const handleStreamMessage = async (ws, data, sessionId) => {
      const { text, useTools } = data;

      if (useTools) {
        // Use tool-enabled version
        const result = await runAgentWithTools(text, sessionId, availableTools);

        if (result.type === 'function_call') {
          // Execute each function call
          const functionResults = [];
          for (const call of result.calls) {
            const funcResult = await executeFunctionCall(call.name, call.args);
            functionResults.push({
              name: call.name,
              result: funcResult,
            });
          }

          ws.send(
            JSON.stringify({
              type: 'function_calls',
              calls: result.calls,
              results: functionResults,
            })
          );

          // Continue conversation with function results
          // Note: This would require additional implementation to send back to model
          return;
        }

        ws.send(
          JSON.stringify({
            type: 'response',
            content: result.content,
          })
        );
      } else {
        // Use streaming version for real-time response
        ws.send(JSON.stringify({ type: 'stream_start' }));

        await runAgentStream(text, sessionId, chunk => {
          ws.send(
            JSON.stringify({
              type: 'stream_chunk',
              content: chunk,
            })
          );
        });

        ws.send(JSON.stringify({ type: 'stream_end' }));
      }
    };

    // Handle regular text messages
    const handleTextMessage = async (ws, data, sessionId) => {
      const { text, useTools } = data;

      let response;
      if (useTools) {
        response = await runAgentWithTools(text, sessionId, availableTools);
        if (response.type === 'function_call') {
          // Execute function calls
          const functionResults = [];
          for (const call of response.calls) {
            const funcResult = await executeFunctionCall(call.name, call.args);
            functionResults.push({ name: call.name, result: funcResult });
          }

          ws.send(
            JSON.stringify({
              type: 'function_calls',
              calls: response.calls,
              results: functionResults,
            })
          );
          return;
        }
        response = response.content;
      } else {
        response = await runAgent(text, sessionId);
      }

      ws.send(JSON.stringify({ response }));
    };

    // Handle audio messages
    const handleAudioMessage = async (ws, data, sessionId) => {
      const { audio } = data;

      if (!audio) {
        ws.send(JSON.stringify({ error: 'No audio data provided' }));
        return;
      }

      // Acknowledge audio receipt
      ws.send(JSON.stringify({ type: 'audio_processing' }));

      const audioMimeType = data.mimeType || 'audio/mp3';
      const response = await runAgentWithAudio(audio, audioMimeType, sessionId);

      // Send matching text handler format: { response }
      ws.send(JSON.stringify({ response }));
    };

    // Handle tool-specific messages
    const handleToolMessage = async (ws, data, sessionId) => {
      const { text, toolName, toolArgs } = data;

      if (toolName && toolArgs) {
        // Direct tool call
        const result = await executeFunctionCall(toolName, toolArgs);
        ws.send(
          JSON.stringify({
            type: 'tool_result',
            toolName,
            result,
          })
        );
      } else {
        // Use AI with tools
        const response = await runAgentWithTools(
          text,
          sessionId,
          availableTools
        );
        ws.send(JSON.stringify({ response }));
      }
    };

    // Handle session clear
    const handleClearSession = (ws, sessionId) => {
      const success = clearSession(sessionId);
      ws.send(
        JSON.stringify({
          type: 'session_cleared',
          success,
        })
      );
    };

    // Handle image + text messages with vision
    const handleImageMessage = async (ws, data, sessionId) => {
      const { text, image } = data;

      if (!image) {
        ws.send(JSON.stringify({ error: 'No image data provided' }));
        return;
      }

      // Acknowledge image processing
      ws.send(JSON.stringify({ type: 'image_processing' }));

      try {
        const response = await runAgentWithImage(text, image, sessionId);
        ws.send(
          JSON.stringify({
            type: 'image_response',
            response,
          })
        );
      } catch (error) {
        console.error('Image processing error:', error);
        ws.send(
          JSON.stringify({
            error: 'Failed to process image',
            details: error.message,
          })
        );
      }
    };

    // Handle get session info
    const handleGetInfo = (ws, sessionId) => {
      const info = getSessionInfo(sessionId);
      ws.send(
        JSON.stringify({
          type: 'session_info',
          info,
        })
      );
    };

    ws.on('close', () => {
      console.log(`Client disconnected: ${sessionId}`);
    });

    ws.on('error', error => {
      console.error(`WebSocket error for ${sessionId}:`, error);
    });
  });
};
