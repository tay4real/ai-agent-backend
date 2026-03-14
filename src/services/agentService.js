import { GoogleGenerativeAI } from '@google/generative-ai';

// In-memory conversation memory with expiration
// Key: session ID, Value: { messages: array, lastActivity: timestamp }
const conversationMemory = {};
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Clean up old sessions periodically
setInterval(
  () => {
    const now = Date.now();
    for (const [sessionId, data] of Object.entries(conversationMemory)) {
      if (now - data.lastActivity > SESSION_TIMEOUT) {
        delete conversationMemory[sessionId];
      }
    }
  },
  5 * 60 * 1000
); // Check every 5 minutes

// Transcribe audio to text using Gemini
export const transcribeAudio = async (audioBase64, mimeType = 'audio/mp3') => {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: audioBase64,
        },
      },
      {
        text: 'Transcribe this audio to text verbatim and accurately. Only return the transcription, no additional commentary.',
      },
    ]);

    const transcript = result.response.text().trim();
    console.log('✅ Audio transcribed:', transcript.substring(0, 100) + '...');
    return transcript;
  } catch (error) {
    console.error('Transcription error:', error);
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
};

export const runAgent = async (text, sessionId = 'default') => {
  try {
    // Initialize Gemini API
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
    });

    // Get previous messages for this session
    if (!conversationMemory[sessionId]) {
      conversationMemory[sessionId] = {
        messages: [],
        lastActivity: Date.now(),
      };
    }

    const session = conversationMemory[sessionId];
    session.lastActivity = Date.now();

    // Build prompt with memory using the prompt builder
    const { buildTutorPrompt } = await import('../utils/promptBuilder.js');

    const systemPrompt = buildTutorPrompt('');

    // Start chat with system instruction
    const chat = model.startChat({
      history: session.messages,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
      },
    });

    // Send message with system context
    const result = await chat.sendMessage(text);
    const response = result.response.text();

    // Save user and AI messages to memory
    session.messages.push({ role: 'user', parts: [{ text }] });
    session.messages.push({ role: 'model', parts: [{ text: response }] });

    return response;
  } catch (error) {
    console.error('Gemini Error:', error);
    throw error;
  }
};

// Streaming version for real-time responses
export const runAgentStream = async (text, sessionId = 'default', onChunk) => {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
    });

    // Get or create session
    if (!conversationMemory[sessionId]) {
      conversationMemory[sessionId] = {
        messages: [],
        lastActivity: Date.now(),
      };
    }

    const session = conversationMemory[sessionId];
    session.lastActivity = Date.now();

    // Start chat
    const chat = model.startChat({
      history: session.messages,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
      },
    });

    // Use streaming
    const result = await chat.sendMessageStream(text);

    let fullResponse = '';

    for await (const chunk of result) {
      const chunkText = chunk.text();
      fullResponse += chunkText;
      if (onChunk) {
        onChunk(chunkText);
      }
    }

    // Save to memory
    session.messages.push({ role: 'user', parts: [{ text }] });
    session.messages.push({ role: 'model', parts: [{ text: fullResponse }] });

    return fullResponse;
  } catch (error) {
    console.error('Gemini Streaming Error:', error);
    throw error;
  }
};

// Function to process audio input
export const runAgentWithAudio = async (
  audioBase64,
  mimeType = 'audio/mp3',
  sessionId = 'default'
) => {
  try {
    // First transcribe the audio to text
    const transcript = await transcribeAudio(audioBase64, mimeType);

    // Then process the transcript through the regular agent pipeline
    const response = await runAgent(transcript, sessionId);

    // Memory is already updated by runAgent with actual transcript

    console.log(`🔄 Audio processed: "${transcript}" → Agent responded`);
    return response;
  } catch (error) {
    console.error('Audio agent error:', error);
    throw error;
  }
};

// Tool/Function calling support
export const runAgentWithTools = async (
  text,
  sessionId = 'default',
  tools = []
) => {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      tools: tools, // Pass tools to the model
    });

    // Get or create session
    if (!conversationMemory[sessionId]) {
      conversationMemory[sessionId] = {
        messages: [],
        lastActivity: Date.now(),
      };
    }

    const session = conversationMemory[sessionId];
    session.lastActivity = Date.now();

    const chat = model.startChat({
      history: session.messages,
    });

    const result = await chat.sendMessage(text);
    const response = result.response;

    // Check if model wants to call a function
    if (response.functionCalls && response.functionCalls.length > 0) {
      return {
        type: 'function_call',
        calls: response.functionCalls,
        sessionId,
      };
    }

    const textResponse = response.text();

    // Save to memory
    session.messages.push({ role: 'user', parts: [{ text }] });
    session.messages.push({ role: 'model', parts: [{ text: textResponse }] });

    return { type: 'text', content: textResponse };
  } catch (error) {
    console.error('Gemini Tools Error:', error);
    throw error;
  }
};

// Process image + text input with Gemini Vision
export const runAgentWithImage = async (
  text,
  imageDataUrl,
  sessionId = 'default'
) => {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' }); // Known vision model

    // Get or create session
    if (!conversationMemory[sessionId]) {
      conversationMemory[sessionId] = {
        messages: [],
        lastActivity: Date.now(),
      };
    }

    const session = conversationMemory[sessionId];
    session.lastActivity = Date.now();

    // Extract mimeType and base64 (support data URL or raw base64)
    console.log(
      'Processing image data. First 50:',
      imageDataUrl.substring(0, 50) + '...'
    );

    let mimeType = 'image/jpeg'; // default
    let base64Data;

    const trimmedUrl = imageDataUrl.trim();

    if (trimmedUrl.startsWith('data:')) {
      const mimeTypeMatch = trimmedUrl.match(/^data:([^;]+);base64,/i);
      if (!mimeTypeMatch) {
        console.error('Data URL failed:', trimmedUrl.substring(0, 100));
        throw new Error('Invalid data URL format');
      }
      mimeType = mimeTypeMatch[1];
      base64Data = trimmedUrl.split(',')[1];
    } else {
      // Raw base64 - frontend sends /9j/... directly
      console.log('Raw base64 mode');
      base64Data = trimmedUrl;
    }

    if (!base64Data || base64Data.length < 100) {
      throw new Error('Base64 too short');
    }

    console.log(`Using MIME: ${mimeType}, data length: ${base64Data.length}`);

    // Build multimodal content array
    const content = [];
    if (text && text.trim()) {
      content.push({ text: text.trim() });
    }
    content.push({
      inlineData: {
        mimeType,
        data: base64Data,
      },
    });

    // Create chat with history
    const chat = model.startChat({
      history: session.messages,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
      },
    });

    const result = await chat.sendMessage(content);
    const response = result.response.text();

    // Save to memory (serialize image as reference)
    const userParts = content.map(part =>
      part.text ? { text: part.text } : { text: `[Image: ${mimeType}]` }
    );
    session.messages.push({ role: 'user', parts: userParts });
    session.messages.push({ role: 'model', parts: [{ text: response }] });

    return response;
  } catch (error) {
    console.error('Gemini Image Error:', error);
    throw error;
  }
};

// Execute a function call and return results
export const executeFunctionCall = async (functionName, args) => {
  console.log(`Executing function: ${functionName}`, args);

  // Implement your tool functions here
  switch (functionName) {
    case 'search':
      // Implement search functionality
      return { results: `Search results for: ${args.query}` };
    case 'calculator':
      // Safe evaluation of math expressions
      try {
        // Only allow safe math operations
        const result = Function(`"use strict"; return (${args.expression})`)();
        return { result };
      } catch {
        return { error: 'Invalid expression' };
      }
    case 'get_weather':
      // Implement weather lookup
      return { weather: 'Sunny, 72°F' };
    default:
      return { error: 'Unknown function' };
  }
};

// Clear session memory
export const clearSession = sessionId => {
  if (conversationMemory[sessionId]) {
    delete conversationMemory[sessionId];
    return true;
  }
  return false;
};

// Get session info
export const getSessionInfo = sessionId => {
  const session = conversationMemory[sessionId];
  if (!session) return null;

  return {
    messageCount: session.messages.length,
    lastActivity: session.lastActivity,
  };
};
