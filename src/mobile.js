function checkViewport() {
  if (window.innerWidth > 768) {
    window.location.href = '/';
  }
}
checkViewport();
window.addEventListener('resize', checkViewport);

import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

// ===== State =====
const state = {
  currentView: 'chat',
  currentFile: 'index.html',
  currentMode: 'agent',
  currentModel: 'llama-3.3-70b-versatile',
  isGenerating: false,
  messages: [],
  models: [],
  attachedImage: null,
  files: {
    'index.html': `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My Project</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>Hello World!</h1>\n  <p>Start coding or ask the AI agent to generate code for you.</p>\n  <script src="script.js"><\/script>\n</body>\n</html>`,
    'style.css': `* {\n  margin: 0;\n  padding: 0;\n  box-sizing: border-box;\n}\n\nbody {\n  font-family: system-ui, sans-serif;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 100vh;\n  background: #0a0a0f;\n  color: #e8e8f0;\n}\n\nh1 {\n  font-size: 2.5rem;\n  margin-bottom: 0.5rem;\n}`,
    'script.js': `// Your JavaScript code here\nconsole.log('Hello from CodeAgent!');\n`,
  },
  currentSessionId: null
};

let editorView = null;

// ===== Escaping utility =====
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ===== Parse simple markdown rules (code blocks, inline code, bold, links) =====
function parseMessageContent(text) {
  if (!text) return '';
  let htmlText = escapeHtml(text);

  // Fenced Code blocks
  const codeBlockRegex = /```(\w*)\r?\n([\s\S]*?)```/g;
  htmlText = htmlText.replace(codeBlockRegex, (match, lang, code) => {
    return `<pre><code class="language-${lang || 'plaintext'}">${code}</code></pre>`;
  });

  // Inline code
  htmlText = htmlText.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  htmlText = htmlText.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Newlines to breaks
  htmlText = htmlText.replace(/\n/g, '<br/>');

  return htmlText;
}

// ===== CodeMirror Editor =====
function initEditor() {
  const container = document.getElementById('mobileEditorContainer');
  if (!container) return;

  const languageConf = {
    'index.html': html(),
    'style.css': css(),
    'script.js': javascript()
  };

  const stateObj = EditorState.create({
    doc: state.files[state.currentFile],
    extensions: [
      lineNumbers(),
      oneDark,
      languageConf[state.currentFile] || html(),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          state.files[state.currentFile] = update.state.doc.toString();
          saveCurrentSession();
        }
      })
    ]
  });

  editorView = new EditorView({
    state: stateObj,
    parent: container
  });
}

function switchFile(filename) {
  state.currentFile = filename;
  document.getElementById('mobileActiveFileName').textContent = filename;
  
  // Ensure the file exists in state
  if (state.files[filename] === undefined) {
    state.files[filename] = '';
  }

  // Sync selector dropdown
  const selector = document.getElementById('mobileFileSelector');
  if (selector) {
    // If filename is not in selector options, rebuild it
    let optionExists = false;
    for (let i = 0; i < selector.options.length; i++) {
      if (selector.options[i].value === filename) {
        optionExists = true;
        break;
      }
    }
    if (!optionExists) {
      renderFileSelector();
    }
    selector.value = filename;
  }

  if (editorView) {
    const ext = filename.split('.').pop()?.toLowerCase();
    let langSupport = html();
    if (ext === 'css') {
      langSupport = css();
    } else if (ext === 'js' || ext === 'jsx' || ext === 'ts' || ext === 'tsx') {
      langSupport = javascript();
    }

    editorView.setState(EditorState.create({
      doc: state.files[filename],
      extensions: [
        lineNumbers(),
        oneDark,
        langSupport,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            state.files[state.currentFile] = update.state.doc.toString();
            saveCurrentSession();
          }
        })
      ]
    }));
  }
}

// ===== Dynamic File Selector Populate =====
function renderFileSelector() {
  const selector = document.getElementById('mobileFileSelector');
  if (!selector) return;

  const currentSelection = state.currentFile;
  selector.innerHTML = '';

  Object.keys(state.files).forEach(filename => {
    const opt = document.createElement('option');
    opt.value = filename;
    opt.textContent = filename;
    selector.appendChild(opt);
  });

  selector.value = currentSelection;
}

// ===== Interactive Preview (Dynamic Multi-File Blob Compilation) =====
function updatePreview() {
  const iframe = document.getElementById('mobilePreviewFrame');
  if (!iframe) return;

  const htmlContent = state.files['index.html'] || '';
  const cssContent = state.files['style.css'] || '';
  const jsContent = state.files['script.js'] || '';

  // Start with index.html as layout
  let fullHTML = htmlContent
    .replace(/<link[^>]*href=["']style\.css["'][^>]*>/i, `<style>${cssContent}</style>`)
    .replace(/<script[^>]*src=["']script\.js["'][^>]*><\/script>/i, `<script>${jsContent}<\/script>`);

  // Inject any other custom CSS/JS files
  Object.entries(state.files).forEach(([name, content]) => {
    if (name === 'index.html' || name === 'style.css' || name === 'script.js') return;
    if (name.endsWith('.css')) {
      const regex = new RegExp(`<link[^>]*href=["']${name}["'][^>]*>`, 'i');
      if (regex.test(fullHTML)) {
        fullHTML = fullHTML.replace(regex, `<style>${content}</style>`);
      } else {
        fullHTML = fullHTML.replace('</head>', `  <style data-file="${name}">\n${content}\n  </style>\n</head>`);
      }
    } else if (name.endsWith('.js')) {
      const regex = new RegExp(`<script[^>]*src=["']${name}["'][^>]*><\\/script>`, 'i');
      if (regex.test(fullHTML)) {
        fullHTML = fullHTML.replace(regex, `<script>${content}<\/script>`);
      } else {
        fullHTML = fullHTML.replace('</body>', `  <script data-file="${name}">\n${content}\n  <\/script>\n</body>`);
      }
    }
  });

  const blob = new Blob([fullHTML], { type: 'text/html' });
  iframe.src = URL.createObjectURL(blob);
}

// ===== View Switching Logic (Top-Right Icon Tabs) =====
function updateTabIndicator(viewName) {
  const tabs = document.querySelectorAll('.mobile-tab-btn');
  const indicator = document.getElementById('tabIndicator');
  if (!indicator || !tabs.length) return;

  let idx = 0;
  tabs.forEach((btn, i) => {
    if (btn.dataset.view === viewName) idx = i;
  });

  // Each tab is 34px wide + 2px gap, offset by 3px padding
  const offset = 3 + idx * (34 + 2);
  indicator.style.left = offset + 'px';
}

function switchView(viewName) {
  state.currentView = viewName;

  // Toggle active header buttons
  document.querySelectorAll('.mobile-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  // Animate pill indicator
  updateTabIndicator(viewName);

  // Toggle visible containers
  document.querySelectorAll('.mobile-view-panel').forEach(panel => {
    panel.classList.remove('active');
  });

  if (viewName === 'chat') {
    document.getElementById('chatPanel').classList.add('active');
  } else if (viewName === 'code') {
    document.getElementById('codePanel').classList.add('active');
    if (editorView) {
      editorView.requestMeasure();
    }
  } else if (viewName === 'preview') {
    document.getElementById('previewPanel').classList.add('active');
    updatePreview();
  }
}

// ===== Model Selector API Loader =====
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

function isDeepSeekModel(modelId) {
  return modelId && modelId.startsWith('deepseek-');
}

function renderModelList() {
  const list = document.getElementById('modelListInline');
  const dropdownMenu = document.getElementById('modelDropdownInline');
  if (!list) return;

  const categories = {
    recommended: '⚡ Recommended',
    fast: '🚀 Fast',
    reasoning: '🧠 Reasoning',
    deepseek: '🔮 DeepSeek'
  };
  let htmlText = '';

  Object.entries(categories).forEach(([cat, label]) => {
    const models = state.models.filter(m => m.category === cat);
    if (!models.length) return;
    htmlText += `<div class="dropdown-header ${cat === 'deepseek' ? 'deepseek-header' : ''}">${label}</div>`;
    models.forEach(m => {
      const active = m.id === state.currentModel ? 'active' : '';
      const isDS = m.category === 'deepseek';
      htmlText += `<div class="model-item ${active} ${isDS ? 'deepseek-model-item' : ''}" data-model-id="${m.id}">
        <div class="model-item-title">${m.name}${isDS ? '<span class="ds-badge">DS</span>' : ''}</div>
        <div class="model-item-desc">${m.description} · ${m.provider}</div>
      </div>`;
    });
  });

  list.innerHTML = htmlText;
  list.querySelectorAll('.model-item').forEach(opt => {
    opt.addEventListener('click', () => {
      state.currentModel = opt.dataset.modelId;
      const model = state.models.find(m => m.id === state.currentModel);
      
      // Update chip icon
      const iconSpan = document.getElementById('modelSelectBtnInline').querySelector('.chip-icon');
      if (iconSpan) {
        if (isDeepSeekModel(state.currentModel)) iconSpan.textContent = '🔮';
        else if (model?.category === 'reasoning') iconSpan.textContent = '🧠';
        else if (model?.category === 'fast') iconSpan.textContent = '🚀';
        else iconSpan.textContent = '⚡';
      }

      // Update chip label
      const labelSpan = document.getElementById('currentModelNameInline');
      if (labelSpan) labelSpan.textContent = model?.name || state.currentModel;

      if (dropdownMenu) dropdownMenu.classList.remove('open');
      renderModelList();
    });
  });
}

// ===== Project Stack Suggestion Templates =====
const PROJECT_STACKS = [
  {
    id: 'react',
    name: 'React',
    icon: `<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="2.5" fill="#61DAFB"/><ellipse cx="12" cy="12" rx="9" ry="3.5" stroke="#61DAFB" stroke-width="1" fill="none"/><ellipse cx="12" cy="12" rx="9" ry="3.5" stroke="#61DAFB" stroke-width="1" fill="none" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.5" stroke="#61DAFB" stroke-width="1" fill="none" transform="rotate(120 12 12)"/></svg>`,
    description: 'CDN React + App.jsx UI Component',
    color: '#61DAFB',
    prompt: `Generate a complete React-based project. You MUST output MULTIPLE separate code blocks. Make sure to put the exact filename comment on the first line of each code block (e.g., \`// App.jsx\` or \`<!-- index.html -->\`).\n1. \`\`\`html for index.html (include CDN links for React, ReactDOM, Babel, and import src="App.jsx" as text/html/babel)\n2. \`\`\`jsx for App.jsx (main React component with useState, useEffect)\n3. \`\`\`css for style.css (modern styling)\n4. \`\`\`json for package.json\nDo NOT write React code in script.js. Write it in App.jsx. Make it a complete, working React app.`,
  },
  {
    id: 'vue',
    name: 'Vue.js',
    icon: `<svg viewBox="0 0 24 24" width="24" height="24"><path d="M2 3h4l6 11L18 3h4L12 21 2 3z" fill="#41B883"/><path d="M6.5 3H12l0 0h5.5L12 14.5 6.5 3z" fill="#35495E"/></svg>`,
    description: 'CDN Vue.js core templates',
    color: '#41B883',
    prompt: `Generate a complete Vue.js-based project. You MUST output MULTIPLE separate code blocks. Make sure to put the exact filename comment on the first line of each code block (e.g., \`// main.js\` or \`<!-- index.html -->\`).\n1. \`\`\`html for index.html (include Vue CDN and load main.js)\n2. \`\`\`javascript for main.js (Vue app setup with reactive data)\n3. \`\`\`css for style.css (modern styling)\n4. \`\`\`json for package.json\nMake it a complete, working Vue.js app.`,
  },
  {
    id: 'node',
    name: 'Node.js',
    icon: `<svg viewBox="0 0 24 24" width="24" height="24"><path d="M12 2l8.5 5v10L12 22l-8.5-5V7L12 2z" fill="#68A063" opacity="0.2" stroke="#68A063" stroke-width="1.5"/><text x="12" y="14.5" text-anchor="middle" fill="#68A063" font-size="7" font-weight="bold" font-family="sans-serif">JS</text></svg>`,
    description: 'Express web server structure',
    color: '#68A063',
    prompt: `Generate a complete Node.js/Express-based full-stack project. You MUST output MULTIPLE separate code blocks. Make sure to put the exact filename comment on the first line of each code block (e.g., \`// server.js\` or \`<!-- index.html -->\`).\n1. \`\`\`javascript for server.js (Express server with routes)\n2. \`\`\`javascript for routes.js (API router)\n3. \`\`\`html for index.html (frontend UI client)\n4. \`\`\`css for style.css (modern styling)\n5. \`\`\`json for package.json (with express dependency)\nMake it a complete working Node.js server.`,
  },
  {
    id: 'python',
    name: 'Python Flask',
    icon: `<svg viewBox="0 0 24 24" width="24" height="24"><path d="M11.9 3C7.5 3 8 4.8 8 4.8v2h4v.6H6.5S3 7 3 11.5c0 4.5 3 4.3 3 4.3h1.8v-2.1s-.1-3 3-3h5.4s2.8.1 2.8-2.7V5.5S19.5 3 11.9 3zm-2 1.5a.9.9 0 110 1.8.9.9 0 010-1.8z" fill="#3776AB"/><path d="M12.1 21c4.4 0 3.9-1.8 3.9-1.8v-2h-4v-.6h5.5s3.5.4 3.5-4.1c0-4.5-3-4.3-3-4.3h-1.8v2.1s.1 3-3 3H8.8s-2.8-.1-2.8 2.7v2.5S5.5 21 12.1 21zm2-1.5a.9.9 0 110-1.8.9.9 0 010 1.8z" fill="#FFD43B"/></svg>`,
    description: 'Flask backend, template, static files',
    color: '#3776AB',
    prompt: `Generate a complete Python Flask-based full-stack project. You MUST output MULTIPLE separate code blocks. Make sure to put the exact filename comment on the first line of each code block (e.g., \`# app.py\` or \`<!-- templates/index.html -->\`).\n1. \`\`\`python for app.py (Flask app with routes)\n2. \`\`\`python for requirements.txt (flask)\n3. \`\`\`html for templates/index.html (Jinja HTML template)\n4. \`\`\`css for static/style.css (Flask static stylesheet)\nMake it a complete working Flask application.`,
  },
];

function showProjectSuggestionCards(userPrompt) {
  state.pendingStackSelection = true;
  state.pendingUserPrompt = userPrompt;

  const chatContainer = document.getElementById('chatMessages');

  // Create suggestion card container
  const suggestDiv = document.createElement('div');
  suggestDiv.className = 'message assistant';
  suggestDiv.id = 'projectSuggestionCards';
  suggestDiv.innerHTML = `
    <div class="message-avatar">🔮</div>
    <div class="message-body">
      <div class="message-header">
        <span class="message-sender" style="color:#7c6aef;">DeepSeek Agent</span>
      </div>
      <div class="message-content">
        <p class="suggestion-intro">Select your preferred tech stack for this full-stack project:</p>
        <div class="stack-cards-grid" style="display:flex; flex-direction:column; gap:8px; margin: 10px 0;">
          ${PROJECT_STACKS.map(stack => `
            <button class="stack-card" data-stack-id="${stack.id}" style="--stack-color:${stack.color}; display:flex; align-items:center; gap:10px; width:100%; text-align:left; background:rgba(255,255,255,0.02); border:1px solid var(--border); padding:10px; border-radius:var(--radius-md); color:#fff; cursor:pointer;">
              <div class="stack-card-icon" style="background:rgba(255,255,255,0.04); padding:4px; border-radius:4px;">${stack.icon}</div>
              <div class="stack-card-info" style="display:flex; flex-direction:column; flex:1;">
                <span class="stack-card-name" style="font-size:12px; font-weight:600;">${stack.name}</span>
                <span class="stack-card-desc" style="font-size:10px; color:var(--text-secondary);">${stack.description}</span>
              </div>
            </button>
          `).join('')}
        </div>
        <button class="skip-suggestion-btn" id="skipSuggestionBtn" style="width:100%; margin-top:4px;">Skip - Default HTML/CSS/JS</button>
      </div>
    </div>
  `;

  chatContainer.appendChild(suggestDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  // Attach event listeners to cards
  suggestDiv.querySelectorAll('.stack-card').forEach(card => {
    card.addEventListener('click', () => {
      const stackId = card.dataset.stackId;
      const stack = PROJECT_STACKS.find(s => s.id === stackId);
      if (!stack) return;

      suggestDiv.remove();
      state.pendingStackSelection = false;

      addMessage('user', `Build with ${stack.name}: ${state.pendingUserPrompt}`);

      const enhancedPrompt = `${state.pendingUserPrompt}\n\n${stack.prompt}`;
      sendMessageDirect(enhancedPrompt);
    });
  });

  // Skip button
  suggestDiv.querySelector('#skipSuggestionBtn')?.addEventListener('click', () => {
    suggestDiv.remove();
    state.pendingStackSelection = false;
    sendMessageDirect(state.pendingUserPrompt);
  });
}

// ===== Chat =====
function addMessage(role, content, image = null) {
  state.messages.push({ role, content, image });
  renderMessages();
  saveCurrentSession();
}

function renderMessages() {
  const container = document.getElementById('chatMessages');
  const welcome = container.querySelector('.welcome-message');
  if (welcome && state.messages.length > 0) welcome.remove();

  container.querySelectorAll('.message').forEach(m => m.remove());

  state.messages.forEach((msg) => {
    const div = document.createElement('div');
    const isDS = isDeepSeekModel(state.currentModel);
    div.className = `message ${msg.role === 'user' ? 'user' : 'assistant'}`;

    const avatar = msg.role === 'user' ? '👤' : (isDS ? '🔮' : '⚡');
    const sender = msg.role === 'user' ? 'You' : (isDS ? 'DeepSeek' : 'CodeAgent');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let contentHTML = msg.role === 'assistant' ? parseMessageContent(msg.content) : escapeHtml(msg.content);
    const attachmentHTML = msg.image ? `<div class="message-attachment"><img src="${msg.image}" alt="Attached Image" /></div>` : '';

    div.innerHTML = `
      <div class="message-avatar">${avatar}</div>
      <div class="message-body">
        <div class="message-header">
          <span class="message-sender">${sender}</span>
          <span class="message-time">${time}</span>
        </div>
        <div class="message-content">
          ${contentHTML}
          ${attachmentHTML}
        </div>
      </div>`;

    container.appendChild(div);
  });

  // Attach apply buttons on mobile chat code blocks
  container.querySelectorAll('pre code').forEach(codeBlock => {
    const pre = codeBlock.parentNode;
    const parentNode = pre.parentNode;
    if (parentNode && !parentNode.classList.contains('code-block-wrapper')) {
      const codeText = codeBlock.textContent;
      const classes = Array.from(codeBlock.classList);
      const langClass = classes.find(c => c.startsWith('language-'));
      const lang = langClass ? langClass.replace('language-', '') : 'html';
      const filename = extractFilename(codeText, lang);

      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';
      wrapper.innerHTML = `
        <div class="code-block-header" style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-tertiary); padding:4px 8px; font-size:10px; border-radius:var(--radius-sm) var(--radius-sm) 0 0; border: 1px solid var(--border); border-bottom:none;">
          <span class="code-lang" style="font-family:var(--font-mono); color:var(--text-secondary);">${filename}</span>
          <button class="apply-btn" style="background:transparent; border:none; color:var(--accent-cyan); font-size:10px; cursor:pointer;">▶ Apply</button>
        </div>
      `;
      
      parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);

      wrapper.querySelector('.apply-btn').addEventListener('click', () => {
        applyCodeToEditor(codeText, filename);
      });
    }
  });

  container.scrollTop = container.scrollHeight;
}

function extractFilename(blockCode, defaultLang) {
  const lines = blockCode.split('\n').map(l => l.trim());
  
  // Find the first few non-empty lines (up to 4)
  const nonEmptyLines = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]) {
      nonEmptyLines.push({ line: lines[i], index: i });
      if (nonEmptyLines.length >= 4) break;
    }
  }

  // Check each of these lines for any filename pattern
  for (const item of nonEmptyLines) {
    const line = item.line;
    
    // 1. Check for HTML comment: <!-- filename.ext --> or <!-- File: filename.ext -->
    const htmlMatch = line.match(/<!--\s*(?:file:\s*)?([\w\-./]+\.[\w]+)\s*-->/i);
    if (htmlMatch) return htmlMatch[1];
    
    // 2. Check for CSS/JS comment: /* filename.ext */, // filename.ext, or // File: filename.ext
    const cssMatch = line.match(/\/\*\s*(?:file:\s*)?([\w\-./]+\.[\w]+)\s*\*\//i);
    if (cssMatch) return cssMatch[1];
    
    const jsMatch = line.match(/\/\/\s*(?:file:\s*)?([\w\-./]+\.[\w]+)/i);
    if (jsMatch) return jsMatch[1];

    // 3. Check for Python/Config comment: # filename.ext or # File: filename.ext
    const pyMatch = line.match(/#\s*(?:file:\s*)?([\w\-./]+\.[\w]+)/i);
    if (pyMatch) return pyMatch[1];
    
    // 4. Check for bold markdown text or bullet pointing to a filename
    // e.g., "**App.jsx**" or "### App.jsx"
    const boldMatch = line.match(/\*\*(?:file:\s*)?([\w\-./]+\.[\w]+)\*\*/i);
    if (boldMatch) return boldMatch[1];
  }

  // Smart content-based analysis if comment fails
  const lowerCode = blockCode.toLowerCase();
  const lowerLang = (defaultLang || '').toLowerCase();

  // If language matches JavaScript/TypeScript/JSX
  if (['javascript', 'js', 'jsx', 'typescript', 'ts', 'tsx'].includes(lowerLang)) {
    // If it contains package.json structure
    if (blockCode.includes('"name":') && blockCode.includes('"dependencies":') && blockCode.includes('"version":')) {
      return 'package.json';
    }
    // If it contains React/JSX code
    if (blockCode.includes('React') || blockCode.includes('useState') || blockCode.includes('useEffect') || blockCode.includes('createRoot') || blockCode.includes('ReactDOM') || blockCode.includes('</') || blockCode.includes('import ')) {
      // If it looks like main entry point
      if (blockCode.includes('root.render') || blockCode.includes('ReactDOM.render')) {
        return 'script.js';
      }
      return 'App.jsx';
    }
  }

  // If language matches css
  if (['css', 'scss'].includes(lowerLang)) {
    if (blockCode.includes('static/') || blockCode.includes('assets/')) {
      return 'static/style.css';
    }
    return 'style.css';
  }

  // If language matches python
  if (lowerLang === 'python' || lowerLang === 'py') {
    if (blockCode.includes('flask') || blockCode.includes('Flask') || blockCode.includes('@app.route')) {
      return 'app.py';
    }
    if (blockCode.includes('pip ') || blockCode.includes('gunicorn')) {
      return 'requirements.txt';
    }
    return 'app.py';
  }

  return detectTargetLang(defaultLang);
}

function detectTargetLang(lang) {
  if (['html', 'htm'].includes(lang)) return 'index.html';
  if (['css'].includes(lang)) return 'style.css';
  if (['javascript', 'js'].includes(lang)) return 'script.js';
  if (['jsx', 'tsx'].includes(lang)) return 'App.jsx';
  if (['python', 'py'].includes(lang)) return 'app.py';
  if (['vue'].includes(lang)) return 'App.vue';
  if (['json'].includes(lang)) return 'package.json';
  return 'index.html';
}

function applyCodeToEditor(code, filename) {
  state.files[filename] = code;
  renderFileSelector();
  switchFile(filename);
  switchView('code');
}

// ===== Streaming Chat =====
// ===== AI Generating Overlay Utility =====
function toggleGeneratingOverlay(show, text = 'AI is scaffolding your project...') {
  const container = document.getElementById('codePanel');
  if (!container) return;

  let overlay = document.getElementById('editorGeneratingOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'editorGeneratingOverlay';
    overlay.className = 'editor-generating-overlay';
    overlay.innerHTML = `
      <div class="generating-content">
        <div class="generating-scanner">
          <span class="generating-scanner-icon">🔮</span>
        </div>
        <div class="generating-title" id="generatingOverlayTitle">AI is scaffolding your project...</div>
        <div class="generating-subtitle">Constructing complete stack folder structure & files...</div>
        <div class="generating-progress">
          <div class="generating-progress-bar"></div>
        </div>
      </div>
    `;
    container.appendChild(overlay);
  }

  const titleEl = overlay.querySelector('#generatingOverlayTitle');
  if (titleEl && text) {
    titleEl.textContent = text;
  }

  if (show) {
    overlay.classList.add('active');
  } else {
    overlay.classList.remove('active');
  }
}

// ===== Streaming Chat =====
async function sendMessage(text) {
  if (state.isGenerating || (!text.trim() && !state.attachedImage)) return;

  if (isDeepSeekModel(state.currentModel) && text.trim() && !state.pendingStackSelection) {
    const currentImage = state.attachedImage;
    state.attachedImage = null;
    const attachmentPreview = document.getElementById('attachmentPreview');
    if (attachmentPreview) attachmentPreview.style.display = 'none';

    addMessage('user', text, currentImage);
    showProjectSuggestionCards(text);
    return;
  }

  await sendMessageDirect(text);
}

async function sendMessageDirect(text) {
  if (state.isGenerating) return;

  const isDS = isDeepSeekModel(state.currentModel);
  if (state.currentMode !== 'chat') {
    const overlayText = isDS ? 'DeepSeek is scaffolding your full-stack project...' : 'CodeAgent is generating your code...';
    toggleGeneratingOverlay(true, overlayText);
  }

  const lastMsg = state.messages[state.messages.length - 1];
  const alreadyAdded = lastMsg && lastMsg.role === 'user' && (
    lastMsg.content === text ||
    lastMsg.content.includes(state.pendingUserPrompt)
  );

  if (!alreadyAdded) {
    const currentImage = state.attachedImage;
    state.attachedImage = null;
    const attachmentPreview = document.getElementById('attachmentPreview');
    if (attachmentPreview) attachmentPreview.style.display = 'none';
    addMessage('user', text, currentImage);
  }

  state.isGenerating = true;
  document.getElementById('sendBtn').disabled = true;

  const chatContainer = document.getElementById('chatMessages');
  const thinkingDiv = document.createElement('div');
  thinkingDiv.className = 'message assistant';
  thinkingDiv.id = 'thinkingMsg';
  thinkingDiv.innerHTML = `
    <div class="message-avatar">${isDS ? '🔮' : '⚡'}</div>
    <div class="message-body">
      <div class="message-header"><span class="message-sender">${isDS ? 'DeepSeek' : 'CodeAgent'}</span></div>
      <div class="thinking-indicator">
        <div class="thinking-dots"><span></span><span></span><span></span></div>
        <span class="thinking-text">${state.currentMode === 'auto' ? 'Analyzing intent...' : (isDS ? 'Reasoning...' : 'Thinking...')}</span>
      </div>
    </div>`;
  chatContainer.appendChild(thinkingDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  try {
    const apiMessages = state.messages.map(m => {
      const role = m.role === 'user' ? 'user' : 'assistant';
      if (m.image) {
        return {
          role,
          content: [
            { type: 'text', text: m.content || 'Attached Image' },
            { type: 'image_url', image_url: { url: m.image } }
          ]
        };
      }
      return { role, content: m.content };
    });

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: apiMessages, model: state.currentModel, mode: state.currentMode }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let assistantContent = '';
    let autoDetectedIntent = null;

    thinkingDiv.remove();

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
            if (parsed.intent) {
              autoDetectedIntent = parsed.intent;
            } else if (parsed.error) {
              assistantContent += `\n\n**Error:** ${parsed.error}`;
            } else if (parsed.content) {
              assistantContent += parsed.content;
            }
          } catch (e) { /* skip */ }
        }
      }

      state.messages[msgIndex].content = assistantContent;
      renderMessages();
    }
    saveCurrentSession();

    // Auto-apply on mobile for agent/auto-coding modes
    if (state.currentMode === 'agent' || (state.currentMode === 'auto' && autoDetectedIntent === 'code')) {
      autoApplyCode(assistantContent);
      saveCurrentSession();
    }
  } catch (error) {
    const thinkEl = document.getElementById('thinkingMsg');
    if (thinkEl) thinkEl.remove();
    addMessage('assistant', `**Error:** ${error.message}. Make sure the server is running.`);
  } finally {
    state.isGenerating = false;
    state.pendingUserPrompt = '';
    document.getElementById('sendBtn').disabled = false;
    toggleGeneratingOverlay(false);
  }
}

function autoApplyCode(content) {
  const codeBlockRegex = /```(\w+)?\r?\n([\s\S]*?)```/g;
  let match;
  const blocks = [];
  while ((match = codeBlockRegex.exec(content)) !== null) {
    blocks.push({ lang: match[1] || 'html', code: match[2].trim() });
  }

  if (blocks.length === 1) {
    const block = blocks[0];
    const filename = extractFilename(block.code, block.lang);
    state.files[filename] = block.code;
    
    renderFileSelector();
    switchFile(filename);
    switchView('code');
  } else if (blocks.length > 1) {
    blocks.forEach(block => {
      const filename = extractFilename(block.code, block.lang);
      state.files[filename] = block.code;
    });
    
    renderFileSelector();
    
    const firstFilename = extractFilename(blocks[0].code, blocks[0].lang);
    switchFile(firstFilename);
    switchView('code');
  }
}

// ===== Event Listeners =====
function initEvents() {
  document.querySelectorAll('.mobile-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
    });
  });

  const mobileFileSelector = document.getElementById('mobileFileSelector');
  if (mobileFileSelector) {
    mobileFileSelector.addEventListener('change', (e) => {
      switchFile(e.target.value);
    });
  }

  const mobileRunBtn = document.getElementById('mobileRunBtn');
  if (mobileRunBtn) {
    mobileRunBtn.addEventListener('click', () => {
      updatePreview();
    });
  }

  // Model select dropdown toggler
  const modelSelectBtnInline = document.getElementById('modelSelectBtnInline');
  const modelDropdownInline = document.getElementById('modelDropdownInline');
  if (modelSelectBtnInline && modelDropdownInline) {
    modelSelectBtnInline.addEventListener('click', (e) => {
      e.stopPropagation();
      modelDropdownInline.classList.toggle('open');
      document.getElementById('modeDropdownInline')?.classList.remove('open');
    });
  }

  // Mode select dropdown toggler
  const modeSelectBtnInline = document.getElementById('modeSelectBtnInline');
  const modeDropdownInline = document.getElementById('modeDropdownInline');
  if (modeSelectBtnInline && modeDropdownInline) {
    modeSelectBtnInline.addEventListener('click', (e) => {
      e.stopPropagation();
      modeDropdownInline.classList.toggle('open');
      document.getElementById('modelDropdownInline')?.classList.remove('open');
    });
  }

  document.addEventListener('click', () => {
    document.getElementById('modelDropdownInline')?.classList.remove('open');
    document.getElementById('modeDropdownInline')?.classList.remove('open');
  });

  // Mode select option items
  document.querySelectorAll('#modeDropdownInline .mode-option-item').forEach(item => {
    item.addEventListener('click', () => {
      state.currentMode = item.dataset.mode;
      
      let icon = '🤖';
      if (state.currentMode === 'chat') icon = '💬';
      else if (state.currentMode === 'auto') icon = '⚡';
      
      const iconSpan = modeSelectBtnInline.querySelector('.mode-icon');
      if (iconSpan) iconSpan.textContent = icon;

      document.querySelectorAll('#modeDropdownInline .mode-option-item').forEach(el => {
        el.classList.toggle('active', el.dataset.mode === state.currentMode);
      });

      modeDropdownInline.classList.remove('open');
    });
  });

  // Vision image upload attachments
  const attachBtn = document.getElementById('attachBtn');
  const imageAttachmentInput = document.getElementById('imageAttachmentInput');
  const attachmentPreview = document.getElementById('attachmentPreview');
  const attachmentImg = document.getElementById('attachmentImg');
  const removeAttachmentBtn = document.getElementById('removeAttachmentBtn');

  if (attachBtn && imageAttachmentInput) {
    attachBtn.addEventListener('click', () => {
      imageAttachmentInput.click();
    });

    imageAttachmentInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          state.attachedImage = event.target.result;
          if (attachmentImg) attachmentImg.src = event.target.result;
          if (attachmentPreview) attachmentPreview.style.display = 'flex';
        };
        reader.readAsDataURL(file);
      }
      imageAttachmentInput.value = '';
    });
  }

  if (removeAttachmentBtn) {
    removeAttachmentBtn.addEventListener('click', () => {
      state.attachedImage = null;
      if (attachmentPreview) attachmentPreview.style.display = 'none';
      if (attachmentImg) attachmentImg.src = '';
    });
  }

  const chatInput = document.getElementById('chatInput');
  if (chatInput) {
    chatInput.addEventListener('input', () => {
      chatInput.style.height = 'auto';
      chatInput.style.height = `${chatInput.scrollHeight}px`;
    });

    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = chatInput.value;
        chatInput.value = '';
        chatInput.style.height = 'auto';
        sendMessage(text);
      }
    });
  }

  const sendBtn = document.getElementById('sendBtn');
  if (sendBtn && chatInput) {
    sendBtn.addEventListener('click', () => {
      const text = chatInput.value;
      chatInput.value = '';
      chatInput.style.height = 'auto';
      sendMessage(text);
    });
  }

  document.querySelectorAll('.quick-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.dataset.prompt;
      if (prompt) sendMessage(prompt);
    });
  });

  document.getElementById('newChatBtn')?.addEventListener('click', () => {
    startNewChat();
  });

  document.getElementById('historyToggleBtn')?.addEventListener('click', () => {
    const historyPanel = document.getElementById('chatHistoryPanel');
    if (historyPanel) {
      const isOpen = historyPanel.style.display === 'flex';
      historyPanel.style.display = isOpen ? 'none' : 'flex';
      if (!isOpen) {
        renderHistoryList();
      }
    }
  });

  document.getElementById('closeHistoryBtn')?.addEventListener('click', () => {
    const historyPanel = document.getElementById('chatHistoryPanel');
    if (historyPanel) {
      historyPanel.style.display = 'none';
    }
  });
}

// ===== Chat History Management =====
function getHistoryList() {
  try {
    const list = localStorage.getItem('codeagent_history');
    return list ? JSON.parse(list) : [];
  } catch (e) {
    console.error('Failed to parse history:', e);
    return [];
  }
}

function saveHistoryList(list) {
  try {
    localStorage.setItem('codeagent_history', JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save history:', e);
  }
}

function saveCurrentSession() {
  if (state.messages.length === 0) return;

  if (!state.currentSessionId) {
    state.currentSessionId = Date.now().toString();
  }

  const list = getHistoryList();
  let session = list.find(s => s.id === state.currentSessionId);
  if (!session) {
    session = {
      id: state.currentSessionId,
      title: state.messages[0]?.content?.slice(0, 30) || 'New Chat',
      timestamp: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      messages: [],
      files: {}
    };
    list.unshift(session);
  } else {
    const index = list.indexOf(session);
    if (index > -1) {
      list.splice(index, 1);
      list.unshift(session);
    }
  }

  session.messages = [...state.messages];
  session.files = { ...state.files };
  session.currentFile = state.currentFile;
  saveHistoryList(list);
}

function loadSession(sessionId) {
  const list = getHistoryList();
  const session = list.find(s => s.id === sessionId);
  if (!session) return;

  state.currentSessionId = session.id;
  state.messages = [...session.messages];
  state.files = { ...session.files };
  
  renderMessages();
  
  if (session.currentFile && state.files[session.currentFile]) {
    state.currentFile = session.currentFile;
  } else {
    state.currentFile = Object.keys(state.files)[0] || 'index.html';
  }

  renderFileSelector();
  switchFile(state.currentFile);
  updatePreview();
  
  document.getElementById('chatHistoryPanel').style.display = 'none';
}

function deleteSession(sessionId, event) {
  if (event) event.stopPropagation();

  const list = getHistoryList();
  const newList = list.filter(s => s.id !== sessionId);
  saveHistoryList(newList);

  if (state.currentSessionId === sessionId) {
    startNewChat();
  } else {
    renderHistoryList();
  }
}

function startNewChat() {
  state.currentSessionId = null;
  state.messages = [];
  state.files = {
    'index.html': `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My Project</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>Hello World!</h1>\n  <p>Start coding or ask the AI agent to generate code for you.</p>\n  <script src="script.js"><\/script>\n</body>\n</html>`,
    'style.css': `* {\n  margin: 0;\n  padding: 0;\n  box-sizing: border-box;\n}\n\nbody {\n  font-family: system-ui, sans-serif;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 100vh;\n  background: #0a0a0f;\n  color: #e8e8f0;\n}\n\nh1 {\n  font-size: 2.5rem;\n  margin-bottom: 0.5rem;\n}`,
    'script.js': `// Your JavaScript code here\nconsole.log('Hello from CodeAgent!');\n`
  };
  state.currentFile = 'index.html';

  const container = document.getElementById('chatMessages');
  container.innerHTML = '';
  container.innerHTML = `<div class="welcome-message">
    <div class="welcome-orb">
      <div class="orb-ring"></div>
      <div class="orb-core">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="url(#orb-grad)" opacity="0.9"/>
          <defs>
            <linearGradient id="orb-grad" x1="3" y1="2" x2="21" y2="22">
              <stop stop-color="#00f0ff"/>
              <stop offset="1" stop-color="#b400ff"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
    <h3>Hey there! 👋</h3>
    <p>I'm your AI coding assistant. Let's build something amazing together.</p>
    
    <div class="quick-actions">
      <button class="quick-action-btn" data-prompt="Create a beautiful landing page with animated gradients and modern design">
        <div class="qa-icon">✨</div>
        <div class="qa-content">
          <span class="qa-title">Landing Page</span>
          <span class="qa-desc">Animated gradients & modern design</span>
        </div>
        <svg class="qa-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <button class="quick-action-btn" data-prompt="Build a todo app with local storage, animations, and a sleek dark theme">
        <div class="qa-icon">📋</div>
        <div class="qa-content">
          <span class="qa-title">Todo App</span>
          <span class="qa-desc">Storage, animations & dark theme</span>
        </div>
        <svg class="qa-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  </div>`;

  container.querySelectorAll('.quick-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.dataset.prompt;
      if (prompt) sendMessage(prompt);
    });
  });

  renderFileSelector();
  switchFile('index.html');
  updatePreview();
  
  document.getElementById('chatHistoryPanel').style.display = 'none';
  switchView('chat');
}

function renderHistoryList() {
  const container = document.getElementById('historyListContainer');
  if (!container) return;

  container.innerHTML = '';
  const list = getHistoryList();

  if (list.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); font-size: 12px; margin-top: 40px;">No conversation history yet.</div>';
    return;
  }

  list.forEach(session => {
    const activeClass = session.id === state.currentSessionId ? 'active' : '';
    const item = document.createElement('div');
    item.className = `history-item ${activeClass}`;
    item.innerHTML = `
      <div class="history-item-details">
        <span class="history-item-title">${escapeHtml(session.title)}</span>
        <span class="history-item-date">${session.timestamp}</span>
      </div>
      <button class="history-item-delete" title="Delete conversation">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    `;

    item.addEventListener('click', () => loadSession(session.id));
    item.querySelector('.history-item-delete').addEventListener('click', (e) => deleteSession(session.id, e));

    container.appendChild(item);
  });
}

// ===== Initializer =====
document.addEventListener('DOMContentLoaded', () => {
  initEvents();
  renderFileSelector();
  initEditor();
  loadModels();
  updatePreview();
  updateTabIndicator('chat');
});
