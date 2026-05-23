import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static files in production
app.use(express.static(path.join(__dirname, '..', 'dist')));

// ===== Dynamic API Key & Groq Client =====
const settingsFilePath = path.join(__dirname, 'settings.json');
const trainingFilePath = path.join(__dirname, 'training.json');

function getApiKey() {
  // settings.json apiKey overrides .env if present
  try {
    const settings = getSettings();
    if (settings.apiKey && settings.apiKey.trim()) {
      return settings.apiKey;
    }
  } catch (e) { /* fall through */ }
  return process.env.GROQ_API_KEY;
}

function getDeepSeekApiKey() {
  try {
    const settings = getSettings();
    if (settings.deepseekApiKey && settings.deepseekApiKey.trim()) {
      return settings.deepseekApiKey;
    }
  } catch (e) { /* fall through */ }
  return process.env.DEEPSEEK_API_KEY;
}

function createGroqClient() {
  return new Groq({ apiKey: getApiKey() });
}

function isDeepSeekModel(modelId) {
  return modelId && modelId.startsWith('deepseek-');
}

// ===== Settings Management =====
function getSettings() {
  try {
    if (fs.existsSync(settingsFilePath)) {
      const data = fs.readFileSync(settingsFilePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to read settings:', e);
  }
  // Default settings
  return {
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'LLaMA 3.3 70B', provider: 'Meta', description: 'Best for versatile coding tasks', category: 'recommended' },
      { id: 'qwen/qwen3-32b', name: 'Qwen3 32B', provider: 'Alibaba', description: 'Strong reasoning & code generation', category: 'recommended' },
      { id: 'llama-3.1-8b-instant', name: 'LLaMA 3.1 8B', provider: 'Meta', description: 'Ultra-fast responses', category: 'fast' },
      { id: 'deepseek-chat', name: 'DeepSeek V4 Flash', provider: 'DeepSeek', description: 'Fast & efficient full-stack coding', category: 'deepseek' },
      { id: 'deepseek-reasoner', name: 'DeepSeek V4 Pro', provider: 'DeepSeek', description: 'Advanced reasoning & architecture', category: 'deepseek' },
    ]
  };
}

function saveSettings(settings) {
  fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2), 'utf8');
}

// ===== Training Instructions =====
function getTrainingInstructions() {
  try {
    if (fs.existsSync(trainingFilePath)) {
      const data = fs.readFileSync(trainingFilePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to read training instructions:', e);
  }
  return {
    chat: "You are a helpful coding assistant. Answer questions clearly and provide code examples when relevant. Use markdown formatting for code blocks.",
    agent: "You are CodeAgent, an expert AI coding assistant. You help users write, debug, and improve code.\nWhen generating code:\n- Always provide complete, working code\n- Use modern best practices\n- Add helpful comments\n- If the user asks for HTML/CSS/JS, provide a single complete HTML file with embedded styles and scripts unless told otherwise\n- When asked to fix or modify code, show the complete updated code\n- Be concise in explanations but thorough in code\n\nWhen responding with code, wrap it in proper markdown code blocks with the language specified like:\n```html\n<!-- code here -->\n```\n\nor\n\n```javascript\n// code here\n```\n\nAlways respond with well-structured code that can be directly used.",
    auto: "You are CodeAgent in Auto-Apply mode. Your main objective is to output ready-to-run code updates that can be directly written into files.\nWhen modifications are requested, output only the clean code or exact segments that need to be changed. Do not output conversational filler. Focus entirely on precision and clean code."
  };
}

// ===== Intent Classification for Auto Mode =====
async function classifyIntent(userMessage) {
  try {
    const groq = createGroqClient();
    /** @type {any} */
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant', // Use fast model for classification
      messages: [
        {
          role: 'system',
          content: `You are an intent classifier. Analyze the user's message and determine if they want to:
1. "code" — build, create, modify, fix, design, update, or generate code/UI/website/app/component
2. "question" — ask a question, seek explanation, get help understanding concepts, debug advice, or general conversation

Respond with ONLY one word: either "code" or "question". Nothing else.`
        },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.1,
      max_tokens: 10,
      top_p: 1,
    });

    const intent = response.choices[0]?.message?.content?.trim().toLowerCase();
    return intent === 'code' ? 'code' : 'question';
  } catch (error) {
    console.error('Intent classification failed, defaulting to code:', error.message);
    return 'code'; // Default to code mode on failure
  }
}

// ===== DeepSeek Streaming Completion =====
async function streamDeepSeekCompletion(res, messages, model) {
  const apiKey = getDeepSeekApiKey();
  if (!apiKey) {
    res.write(`data: ${JSON.stringify({ error: 'DeepSeek API key not configured. Add it in Settings or .env' })}\n\n`);
    res.end();
    return;
  }

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'deepseek-chat',
        messages: messages,
        temperature: 0.6,
        max_tokens: 8192,
        top_p: 0.95,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API Error:', response.status, errorText);
      res.write(`data: ${JSON.stringify({ error: `DeepSeek API error: ${response.status} - ${errorText}` })}\n\n`);
      res.end();
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') {
          res.write(`data: [DONE]\n\n`);
          continue;
        }
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content || '';
          // DeepSeek reasoner may also send reasoning_content
          const reasoning = parsed.choices?.[0]?.delta?.reasoning_content || '';
          if (content) {
            res.write(`data: ${JSON.stringify({ content })}\n\n`);
          }
          // For reasoner model, we can also stream reasoning tokens as content
          if (reasoning && !content) {
            res.write(`data: ${JSON.stringify({ content: reasoning })}\n\n`);
          }
        } catch (e) { /* skip parse errors */ }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      const trimmed = buffer.trim();
      if (trimmed.startsWith('data: ') && trimmed.slice(6) !== '[DONE]') {
        try {
          const parsed = JSON.parse(trimmed.slice(6));
          const content = parsed.choices?.[0]?.delta?.content || '';
          if (content) {
            res.write(`data: ${JSON.stringify({ content })}\n\n`);
          }
        } catch (e) { /* skip */ }
      }
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error) {
    console.error('DeepSeek streaming error:', error.message);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
}

// ===== API Routes =====

// Get available models (now from settings.json)
app.get('/api/models', (req, res) => {
  const settings = getSettings();
  res.json({ models: settings.models || [] });
});

// Get training instructions
app.get('/api/training', (req, res) => {
  res.json(getTrainingInstructions());
});

// Update training instructions
app.post('/api/training', (req, res) => {
  try {
    const { chat, agent, auto } = req.body;
    const instructions = { chat, agent, auto };
    fs.writeFileSync(trainingFilePath, JSON.stringify(instructions, null, 2), 'utf8');
    res.json({ success: true, message: 'Training instructions saved successfully!' });
  } catch (error) {
    console.error('Failed to save training instructions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get settings (models, masked API key)
app.get('/api/settings', (req, res) => {
  const settings = getSettings();
  const apiKey = getApiKey();
  const deepseekApiKey = getDeepSeekApiKey();
  res.json({
    models: settings.models || [],
    apiKey: apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : '',
    hasApiKey: !!apiKey,
    deepseekApiKey: deepseekApiKey ? `${deepseekApiKey.slice(0, 8)}...${deepseekApiKey.slice(-4)}` : '',
    hasDeepSeekApiKey: !!deepseekApiKey,
  });
});

// Update settings
app.post('/api/settings', (req, res) => {
  try {
    const { models, apiKey, deepseekApiKey } = req.body;
    const currentSettings = getSettings();

    // Update models if provided
    if (models && Array.isArray(models)) {
      currentSettings.models = models;
    }

    // Update API key if provided (not masked)
    if (apiKey && !apiKey.includes('...')) {
      currentSettings.apiKey = apiKey;
    }

    // Update DeepSeek API key if provided (not masked)
    if (deepseekApiKey && !deepseekApiKey.includes('...')) {
      currentSettings.deepseekApiKey = deepseekApiKey;
    }

    saveSettings(currentSettings);
    res.json({ success: true, message: 'Settings saved successfully!' });
  } catch (error) {
    console.error('Failed to save settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Chat completion with streaming (+ Auto mode intent detection)
app.post('/api/chat', async (req, res) => {
  const { messages, model, mode } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Build system prompt based on mode and training instructions
  const instructions = getTrainingInstructions();
  let systemPrompt = '';
  let detectedIntent = null;

  if (mode === 'auto') {
    // Smart Auto Mode: classify intent first
    const lastUserMsg = messages.filter(m => m.role === 'user').pop();
    const userText = typeof lastUserMsg?.content === 'string'
      ? lastUserMsg.content
      : (Array.isArray(lastUserMsg?.content)
        ? lastUserMsg.content.find(c => c.type === 'text')?.text || ''
        : '');

    if (userText) {
      detectedIntent = await classifyIntent(userText);
    } else {
      detectedIntent = 'code';
    }

    // Send intent as first SSE event so frontend knows how to handle
    res.write(`data: ${JSON.stringify({ intent: detectedIntent })}\n\n`);

    if (detectedIntent === 'question') {
      systemPrompt = instructions.chat || '';
    } else {
      systemPrompt = instructions.agent || '';
    }
  } else if (mode === 'agent') {
    systemPrompt = instructions.agent || '';
  } else {
    systemPrompt = instructions.chat || '';
  }

  const fullMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  // ===== Route to DeepSeek or Groq =====
  if (isDeepSeekModel(model)) {
    // DeepSeek API streaming
    await streamDeepSeekCompletion(res, fullMessages, model);
    return;
  }

  // ===== Groq API (default) =====
  try {
    const groq = createGroqClient();
    /** @type {any} */
    const completion = await groq.chat.completions.create({
      model: model || 'llama-3.3-70b-versatile',
      messages: fullMessages,
      temperature: 0.6,
      max_tokens: 4096,
      top_p: 0.95,
      stream: true,
      user: 'codeagent-developer',
    });

    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error) {
    console.error('Groq API Error:', error.message);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// Serve training page specifically
app.get('/training', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'training.html'));
});

// Serve mobile page specifically
app.get('/mobile', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'mobile.html'));
});

// Serve settings page
app.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'settings.html'));
});

// Wildcard route to serve index.html for SPA fallback
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(`
      <html>
        <head>
          <title>CodeAgent - Frontend Build Missing</title>
          <style>
            body {
              font-family: 'Inter', -apple-system, sans-serif;
              text-align: center;
              padding: 50px;
              background: #0f0c1b;
              color: #fff;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 80vh;
              margin: 0;
            }
            .card {
              background: rgba(255, 255, 255, 0.05);
              padding: 40px;
              border-radius: 12px;
              border: 1px solid rgba(255, 255, 255, 0.1);
              max-width: 500px;
              box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
            }
            h1 { color: #00f0ff; margin-bottom: 20px; }
            p { color: #a0aec0; line-height: 1.6; }
            code {
              background: #1a1528;
              padding: 4px 8px;
              border-radius: 4px;
              color: #ff3366;
              font-family: monospace;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Frontend Build Missing</h1>
            <p>The CodeAgent backend server is running successfully! However, the compiled frontend build files are missing from the <code>dist</code> folder.</p>
            <p>Please make sure your Render <strong>Build Command</strong> is configured exactly as:</p>
            <p><code>npm install && npm run build</code></p>
            <p>If you set it correctly, Render will automatically compile the frontend during deployment.</p>
          </div>
        </body>
      </html>
    `);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`⚡ CodeAgent Server running on http://localhost:${PORT}`);
});
