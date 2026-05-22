import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, highlightActiveLine, rectangularSelection, crosshairCursor } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, indentOnInput, bracketMatching, foldGutter, foldKeymap } from '@codemirror/language';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { marked } from 'marked';

// ===== State =====
const state = {
  currentFile: 'html',
  currentView: 'editor',
  currentMode: 'agent',
  currentModel: 'llama-3.3-70b-versatile',
  isGenerating: false,
  messages: [],
  files: {
    html: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My Project</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>Hello World!</h1>\n  <p>Start coding or ask the AI agent to generate code for you.</p>\n  <script src="script.js"><\/script>\n</body>\n</html>`,
    css: `* {\n  margin: 0;\n  padding: 0;\n  box-sizing: border-box;\n}\n\nbody {\n  font-family: system-ui, sans-serif;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 100vh;\n  background: #0a0a0f;\n  color: #e8e8f0;\n}\n\nh1 {\n  font-size: 2.5rem;\n  margin-bottom: 0.5rem;\n}`,
    javascript: `// Your JavaScript code here\nconsole.log('Hello from CodeAgent!');\n`,
  },
  editors: {},
  models: [],
  mobileLayout: 'tabbed',
  activeMobileTab: 'chat',
};

// Language map
const langMap = { html: html(), css: css(), javascript: javascript() };

// ===== Editor Setup =====
function createEditor(lang) {
  const extensions = [
    lineNumbers(), highlightActiveLineGutter(), highlightSpecialChars(),
    history(), foldGutter(), drawSelection(), indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(), closeBrackets(), autocompletion(),
    rectangularSelection(), crosshairCursor(), highlightActiveLine(),
    highlightSelectionMatches(), oneDark,
    keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, ...foldKeymap, ...completionKeymap, indentWithTab]),
    langMap[lang],
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        state.files[lang] = update.state.doc.toString();
        if (state.currentView === 'split') updatePreview();
      }
    }),
    EditorView.theme({
      '&': { height: '100%', fontSize: '13px' },
      '.cm-scroller': { fontFamily: "'JetBrains Mono', monospace" },
    }),
  ];

  const editorState = EditorState.create({ doc: state.files[lang], extensions });
  const view = new EditorView({ state: editorState, parent: document.getElementById('editorContainer') });
  state.editors[lang] = view;
  return view;
}

function switchFile(lang) {
  state.currentFile = lang;
  // Hide all editors, show selected
  Object.entries(state.editors).forEach(([key, editor]) => {
    editor.dom.style.display = key === lang ? 'block' : 'none';
  });
  // Update tabs
  document.querySelectorAll('.file-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.lang === lang);
  });
}

function setEditorContent(lang, content) {
  state.files[lang] = content;
  const editor = state.editors[lang];
  if (editor) {
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: content } });
  }
}

// ===== Preview =====
function updatePreview() {
  const frame = document.getElementById('previewFrame');
  const htmlContent = state.files.html;
  const cssContent = state.files.css;
  const jsContent = state.files.javascript;

  const fullHTML = htmlContent
    .replace(/<link[^>]*href=["']style\.css["'][^>]*>/i, `<style>${cssContent}</style>`)
    .replace(/<script[^>]*src=["']script\.js["'][^>]*><\/script>/i, `<script>${jsContent}<\/script>`);

  const blob = new Blob([fullHTML], { type: 'text/html' });
  frame.src = URL.createObjectURL(blob);
}

// ===== View Switching =====
function switchView(view) {
  state.currentView = view;
  const content = document.querySelector('.editor-content');
  const editorEl = document.getElementById('editorContainer');
  const previewEl = document.getElementById('previewContainer');

  content.classList.remove('split-view');
  editorEl.classList.remove('active');
  previewEl.classList.remove('active');

  document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-view="${view}"]`).classList.add('active');

  if (view === 'editor') {
    editorEl.classList.add('active');
  } else if (view === 'preview') {
    previewEl.classList.add('active');
    updatePreview();
  } else if (view === 'split') {
    content.classList.add('split-view');
    updatePreview();
  }
}

// ===== Model Selector =====
async function loadModels() {
  try {
    const res = await fetch('/api/models');
    const data = await res.json();
    state.models = data.models;
    renderModelList();
  } catch (e) {
    console.error('Failed to load models:', e);
  }
}

function renderModelList() {
  const list = document.getElementById('modelList');
  const categories = { recommended: '⚡ Recommended', fast: '🚀 Fast', reasoning: '🧠 Reasoning' };
  let html = '';

  Object.entries(categories).forEach(([cat, label]) => {
    const models = state.models.filter(m => m.category === cat);
    if (!models.length) return;
    html += `<div class="model-category">${label}</div>`;
    models.forEach(m => {
      const active = m.id === state.currentModel ? 'active' : '';
      const badgeClass = `badge-${cat}`;
      html += `<div class="model-option ${active}" data-model-id="${m.id}">
        <div class="model-option-info">
          <div class="model-option-name">${m.name}</div>
          <div class="model-option-desc">${m.description} · ${m.provider}</div>
        </div>
        <span class="model-option-badge ${badgeClass}">${cat}</span>
      </div>`;
    });
  });

  list.innerHTML = html;
  list.querySelectorAll('.model-option').forEach(opt => {
    opt.addEventListener('click', () => {
      state.currentModel = opt.dataset.modelId;
      const model = state.models.find(m => m.id === state.currentModel);
      document.getElementById('currentModelName').textContent = model?.name || state.currentModel;
      document.getElementById('modelDropdown').classList.remove('open');
      renderModelList();
    });
  });
}

// ===== Chat =====
function addMessage(role, content) {
  state.messages.push({ role, content });
  renderMessages();
}

function renderMessages() {
  const container = document.getElementById('chatMessages');
  const welcome = container.querySelector('.welcome-message');
  if (welcome && state.messages.length > 0) welcome.remove();

  // Clear only message elements (keep welcome if no messages)
  container.querySelectorAll('.message').forEach(m => m.remove());

  state.messages.forEach((msg, i) => {
    const div = document.createElement('div');
    div.className = `message ${msg.role === 'user' ? 'user' : 'assistant'}`;

    const avatar = msg.role === 'user' ? '👤' : '⚡';
    const sender = msg.role === 'user' ? 'You' : 'CodeAgent';
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Parse markdown for assistant messages
    let contentHTML = msg.role === 'assistant' ? parseMessageContent(msg.content) : escapeHtml(msg.content);

    div.innerHTML = `
      <div class="message-avatar">${avatar}</div>
      <div class="message-body">
        <div class="message-header">
          <span class="message-sender">${sender}</span>
          <span class="message-time">${time}</span>
        </div>
        <div class="message-content">${contentHTML}</div>
      </div>`;

    container.appendChild(div);
  });

  // Add apply buttons to code blocks
  container.querySelectorAll('.code-block-wrapper').forEach(wrapper => {
    wrapper.querySelectorAll('.apply-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = wrapper.querySelector('code').textContent;
        const lang = btn.dataset.lang || 'html';
        applyCodeToEditor(code, lang);
      });
    });
    wrapper.querySelectorAll('.copy-code-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = wrapper.querySelector('code').textContent;
        navigator.clipboard.writeText(code);
        btn.textContent = '✓ Copied';
        setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
      });
    });
  });

  container.scrollTop = container.scrollHeight;
}

function parseMessageContent(content) {
  // Custom renderer for code blocks with actions
  const renderer = new marked.Renderer();
  renderer.code = function ({ text, lang }) {
    const language = lang || 'text';
    const escapedCode = escapeHtml(text);
    const targetLang = detectTargetLang(language);
    return `<div class="code-block-wrapper">
      <div class="code-block-header">
        <span class="code-lang">${language}</span>
        <div class="code-actions">
          <button class="code-action-btn copy-code-btn">Copy</button>
          <button class="code-action-btn apply-btn" data-lang="${targetLang}">▶ Apply to Editor</button>
        </div>
      </div>
      <pre><code class="language-${language}">${escapedCode}</code></pre>
    </div>`;
  };

  marked.setOptions({ renderer, breaks: true, gfm: true });
  return marked.parse(content);
}

function detectTargetLang(lang) {
  if (['html', 'htm'].includes(lang)) return 'html';
  if (['css', 'scss', 'sass'].includes(lang)) return 'css';
  if (['javascript', 'js', 'jsx', 'ts', 'typescript'].includes(lang)) return 'javascript';
  return 'html'; // default
}

function applyCodeToEditor(code, lang) {
  setEditorContent(lang, code);
  switchFile(lang);
  switchView('editor');

  // Flash status
  const status = document.getElementById('statusIndicator');
  status.querySelector('.status-text').textContent = `Applied to ${lang}`;
  status.querySelector('.status-dot').style.background = 'var(--accent-cyan)';
  setTimeout(() => {
    status.querySelector('.status-text').textContent = 'Ready';
    status.querySelector('.status-dot').style.background = '#00e676';
  }, 2000);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===== Streaming Chat =====
async function sendMessage(text) {
  if (state.isGenerating || !text.trim()) return;

  addMessage('user', text);
  state.isGenerating = true;
  document.getElementById('sendBtn').disabled = true;

  const statusEl = document.getElementById('statusIndicator');
  statusEl.classList.add('generating');
  statusEl.querySelector('.status-text').textContent = 'Generating...';

  // Add thinking indicator
  const chatContainer = document.getElementById('chatMessages');
  const thinkingDiv = document.createElement('div');
  thinkingDiv.className = 'message assistant';
  thinkingDiv.id = 'thinkingMsg';
  thinkingDiv.innerHTML = `
    <div class="message-avatar">⚡</div>
    <div class="message-body">
      <div class="message-header"><span class="message-sender">CodeAgent</span></div>
      <div class="thinking-indicator">
        <div class="thinking-dots"><span></span><span></span><span></span></div>
        <span class="thinking-text">Thinking...</span>
      </div>
    </div>`;
  chatContainer.appendChild(thinkingDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  try {
    const apiMessages = state.messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: apiMessages, model: state.currentModel, mode: state.currentMode }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let assistantContent = '';

    // Remove thinking indicator
    thinkingDiv.remove();

    // Add empty assistant message
    state.messages.push({ role: 'assistant', content: '' });
    const msgIndex = state.messages.length - 1;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              assistantContent += `\n\n**Error:** ${parsed.error}`;
            } else if (parsed.content) {
              assistantContent += parsed.content;
            }
          } catch (e) { /* skip parse errors */ }
        }
      }

      state.messages[msgIndex].content = assistantContent;
      renderMessages();
    }

    // Auto-apply if agent mode and single full HTML detected
    if (state.currentMode === 'agent') {
      autoApplyCode(assistantContent);
    }
  } catch (error) {
    const thinkEl = document.getElementById('thinkingMsg');
    if (thinkEl) thinkEl.remove();
    addMessage('assistant', `**Error:** ${error.message}. Make sure the server is running.`);
  } finally {
    state.isGenerating = false;
    document.getElementById('sendBtn').disabled = false;
    statusEl.classList.remove('generating');
    statusEl.querySelector('.status-text').textContent = 'Ready';
    statusEl.querySelector('.status-dot').style.background = '#00e676';
  }
}

function autoApplyCode(content) {
  // Extract code blocks and auto-apply to relevant editors
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  const blocks = [];
  while ((match = codeBlockRegex.exec(content)) !== null) {
    blocks.push({ lang: match[1] || 'html', code: match[2].trim() });
  }

  if (blocks.length === 1) {
    // Single block - auto apply
    const block = blocks[0];
    const target = detectTargetLang(block.lang);

    // Check if it's a complete HTML with embedded styles/scripts
    if (target === 'html' && block.code.includes('<!DOCTYPE') || block.code.includes('<html')) {
      setEditorContent('html', block.code);
      // Extract and set CSS/JS if embedded
      const styleMatch = block.code.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
      const scriptMatch = block.code.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
      // Don't split - keep as single file
    } else {
      setEditorContent(target, block.code);
    }
    switchFile(target === 'html' ? 'html' : target);
    if (state.currentView === 'editor') switchView('split');
    updatePreview();
  } else if (blocks.length > 1) {
    // Multiple blocks - apply each to its target
    blocks.forEach(block => {
      const target = detectTargetLang(block.lang);
      setEditorContent(target, block.code);
    });
    switchView('split');
    updatePreview();
  }
}

// ===== Resizer =====
function initResizer() {
  const resizer = document.getElementById('panelResizer');
  const editorPanel = document.getElementById('editorPanel');
  const chatPanel = document.getElementById('chatPanel');
  let isResizing = false;

  resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    resizer.classList.add('active');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const containerWidth = document.getElementById('mainLayout').offsetWidth;
    const chatWidth = containerWidth - e.clientX;
    const clampedWidth = Math.max(320, Math.min(chatWidth, containerWidth - 400));
    chatPanel.style.width = clampedWidth + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      resizer.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
}

// ===== Event Listeners =====
function initEvents() {
  // File tabs
  document.querySelectorAll('.file-tab').forEach(tab => {
    tab.addEventListener('click', () => switchFile(tab.dataset.lang));
  });

  // View tabs
  document.querySelectorAll('.view-tab').forEach(tab => {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  });

  // Mode toggle
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentMode = btn.dataset.mode;
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Model selector
  document.getElementById('modelSelectBtn').addEventListener('click', () => {
    document.getElementById('modelDropdown').classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.model-selector')) {
      document.getElementById('modelDropdown').classList.remove('open');
    }
  });

  // Chat input
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(chatInput.value);
      chatInput.value = '';
      chatInput.style.height = 'auto';
    }
  });

  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
  });

  sendBtn.addEventListener('click', () => {
    sendMessage(chatInput.value);
    chatInput.value = '';
    chatInput.style.height = 'auto';
  });

  // Quick actions
  document.querySelectorAll('.quick-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      chatInput.value = btn.dataset.prompt;
      sendMessage(btn.dataset.prompt);
      chatInput.value = '';
    });
  });

  // Run code
  document.getElementById('runCodeBtn').addEventListener('click', () => {
    switchView('preview');
    updatePreview();
  });

  // Copy code
  document.getElementById('copyCodeBtn').addEventListener('click', () => {
    const code = state.files[state.currentFile];
    navigator.clipboard.writeText(code);
  });

  // Download
  document.getElementById('downloadBtn').addEventListener('click', downloadProject);

  // Clear chat
  document.getElementById('clearChatBtn').addEventListener('click', () => {
    state.messages = [];
    const container = document.getElementById('chatMessages');
    container.innerHTML = '';
    // Re-add welcome
    container.innerHTML = `<div class="welcome-message">
      <div class="welcome-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="url(#w2)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><defs><linearGradient id="w2" x1="3" y1="2" x2="21" y2="22"><stop stop-color="#00f0ff"/><stop offset="1" stop-color="#b400ff"/></linearGradient></defs></svg></div>
      <h3>Welcome to CodeAgent</h3>
      <p>I can help you write, debug, and improve code in real-time.</p>
      <div class="quick-actions">
        <button class="quick-action-btn" data-prompt="Create a beautiful landing page with animated gradients and modern design"><span>✨</span> Create a landing page</button>
        <button class="quick-action-btn" data-prompt="Build a todo app with local storage, animations, and a sleek dark theme"><span>📋</span> Build a todo app</button>
        <button class="quick-action-btn" data-prompt="Create an interactive animated particle background using canvas"><span>🎨</span> Particle animation</button>
        <button class="quick-action-btn" data-prompt="Build a real-time clock with analog and digital display, dark theme"><span>⏰</span> Animated clock</button>
      </div>
    </div>`;
    // Re-bind quick actions
    container.querySelectorAll('.quick-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        chatInput.value = btn.dataset.prompt;
        sendMessage(btn.dataset.prompt);
        chatInput.value = '';
      });
    });
  });
}

function downloadProject() {
  const htmlContent = state.files.html;
  const cssContent = state.files.css;
  const jsContent = state.files.javascript;

  // Create a single HTML file with embedded CSS/JS
  let fullHTML = htmlContent;
  if (!fullHTML.includes('<style') && cssContent.trim()) {
    fullHTML = fullHTML.replace('</head>', `  <style>\n${cssContent}\n  </style>\n</head>`);
  }
  if (!fullHTML.includes('<script') && jsContent.trim()) {
    fullHTML = fullHTML.replace('</body>', `  <script>\n${jsContent}\n  <\/script>\n</body>`);
  }

  const blob = new Blob([fullHTML], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'project.html';
  a.click();
  URL.revokeObjectURL(url);
}

function initMobileLayout() {
  const toggleBtn = document.getElementById('mobileLayoutToggleBtn');
  const navButtons = document.querySelectorAll('#mobileBottomNav .mobile-nav-btn');

  // Set default body classes
  document.body.classList.add(`layout-${state.mobileLayout}`);
  document.body.classList.add(`tab-${state.activeMobileTab}-active`);

  // Handle mobile layout toggle button
  toggleBtn.addEventListener('click', () => {
    document.body.classList.remove(`layout-${state.mobileLayout}`);
    state.mobileLayout = state.mobileLayout === 'tabbed' ? 'stacked' : 'tabbed';
    document.body.classList.add(`layout-${state.mobileLayout}`);

    // Update button visual state / styling
    if (state.mobileLayout === 'stacked') {
      toggleBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" stroke-width="2">
          <rect x="3" y="3" width="7" height="18" rx="1"/>
          <rect x="14" y="3" width="7" height="18" rx="1"/>
        </svg>
      `;
    } else {
      toggleBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="7" rx="1"/>
          <rect x="3" y="14" width="18" height="7" rx="1"/>
        </svg>
      `;
      // Return to active tab state when switching back to tabbed mode
      switchMobileTab(state.activeMobileTab);
    }
  });

  // Handle bottom navigation tabs click
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.mobtab;
      switchMobileTab(tab);
    });
  });
}

function switchMobileTab(tab) {
  // Update state
  document.body.classList.remove(`tab-${state.activeMobileTab}-active`);
  state.activeMobileTab = tab;
  document.body.classList.add(`tab-${state.activeMobileTab}-active`);

  // Update active button state
  document.querySelectorAll('#mobileBottomNav .mobile-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mobtab === tab);
  });

  // Execute secondary panel view switches if code or preview tab is selected
  if (tab === 'code') {
    switchView('editor');
  } else if (tab === 'preview') {
    switchView('preview');
  }
}

// ===== Init =====
function init() {
  // Create editors for each language
  ['html', 'css', 'javascript'].forEach(lang => createEditor(lang));
  switchFile('html');

  initResizer();
  initEvents();
  initMobileLayout();
  loadModels();
}

document.addEventListener('DOMContentLoaded', init);
