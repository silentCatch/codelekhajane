import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static files in production
app.use(express.static(path.join(__dirname, '..', 'dist')));

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const AVAILABLE_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'LLaMA 3.3 70B', provider: 'Meta', description: 'Best for versatile coding tasks', category: 'recommended' },
  { id: 'qwen/qwen3-32b', name: 'Qwen3 32B', provider: 'Alibaba', description: 'Strong reasoning & code generation', category: 'recommended' },
  { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 70B', provider: 'DeepSeek', description: 'Advanced reasoning model', category: 'reasoning' },
  { id: 'llama-3.1-8b-instant', name: 'LLaMA 3.1 8B', provider: 'Meta', description: 'Ultra-fast responses', category: 'fast' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B', provider: 'Google', description: 'Efficient & accurate', category: 'fast' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', provider: 'Mistral', description: 'Great for long context', category: 'recommended' },
  { id: 'llama3-70b-8192', name: 'LLaMA 3 70B', provider: 'Meta', description: 'Powerful general purpose', category: 'recommended' },
  { id: 'llama3-8b-8192', name: 'LLaMA 3 8B', provider: 'Meta', description: 'Fast & lightweight', category: 'fast' },
];

// Get available models
app.get('/api/models', (req, res) => {
  res.json({ models: AVAILABLE_MODELS });
});

// Chat completion with streaming
app.post('/api/chat', async (req, res) => {
  const { messages, model, mode } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Build system prompt based on mode
  let systemPrompt = '';
  if (mode === 'agent') {
    systemPrompt = `You are CodeAgent, an expert AI coding assistant. You help users write, debug, and improve code.
When generating code:
- Always provide complete, working code
- Use modern best practices
- Add helpful comments
- If the user asks for HTML/CSS/JS, provide a single complete HTML file with embedded styles and scripts unless told otherwise
- When asked to fix or modify code, show the complete updated code
- Be concise in explanations but thorough in code

When responding with code, wrap it in proper markdown code blocks with the language specified like:
\`\`\`html
<!-- code here -->
\`\`\`

or

\`\`\`javascript
// code here
\`\`\`

Always respond with well-structured code that can be directly used.`;
  } else {
    systemPrompt = `You are a helpful coding assistant. Answer questions clearly and provide code examples when relevant. Use markdown formatting for code blocks.`;
  }

  const fullMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  try {
    const completion = await groq.chat.completions.create({
      model: model || 'llama-3.3-70b-versatile',
      messages: fullMessages,
      temperature: 0.6,
      max_completion_tokens: 4096,
      top_p: 0.95,
      stream: true,
      stop: null,
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`⚡ CodeAgent Server running on http://localhost:${PORT}`);
});
