function checkViewport() {
  if (window.innerWidth <= 768) {
    window.location.href = '/mobile';
  }
}
checkViewport();
window.addEventListener('resize', checkViewport);

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
  currentFile: 'index.html',
  currentView: 'editor',
  currentMode: 'agent',
  currentModel: 'llama-3.3-70b-versatile',
  isGenerating: false,
  messages: [],
  files: {
    'index.html': `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My Project</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>Hello World!</h1>\n  <p>Start coding or ask the AI agent to generate code for you.</p>\n  <script src="script.js"><\/script>\n</body>\n</html>`,
    'style.css': `* {\n  margin: 0;\n  padding: 0;\n  box-sizing: border-box;\n}\n\nbody {\n  font-family: system-ui, sans-serif;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 100vh;\n  background: #0a0a0f;\n  color: #e8e8f0;\n}\n\nh1 {\n  font-size: 2.5rem;\n  margin-bottom: 0.5rem;\n}`,
    'script.js': `// Your JavaScript code here\nconsole.log('Hello from CodeAgent!');\n`,
  },
  editors: {},
  models: [],
  mobileLayout: 'tabbed',
  activeMobileTab: 'chat',
  sidebarOpen: true,
  attachedImage: null,
  chatOpen: true,
};

// Language map support based on extension
function getLanguageSupport(filename) {
  if (filename.endsWith('.html') || filename.endsWith('.htm')) return html();
  if (filename.endsWith('.css')) return css();
  if (filename.endsWith('.js') || filename.endsWith('.jsx') || filename.endsWith('.ts')) return javascript();
  return html(); // Fallback
}

// ===== Editor Setup =====
function createEditor(filename) {
  const extensions = [
    lineNumbers(), highlightActiveLineGutter(), highlightSpecialChars(),
    history(), foldGutter(), drawSelection(), indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(), closeBrackets(), autocompletion(),
    rectangularSelection(), crosshairCursor(), highlightActiveLine(),
    highlightSelectionMatches(), oneDark,
    keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, ...foldKeymap, ...completionKeymap, indentWithTab]),
    getLanguageSupport(filename),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        state.files[filename] = update.state.doc.toString();
        if (state.currentView === 'split' || state.currentView === 'preview') updatePreview();
      }
    }),
    EditorView.theme({
      '&': { height: '100%', fontSize: '13px' },
      '.cm-scroller': { fontFamily: "'JetBrains Mono', monospace" },
    }),
  ];

  const editorState = EditorState.create({ doc: state.files[filename] || '', extensions });
  const view = new EditorView({ state: editorState, parent: document.getElementById('editorContainer') });
  state.editors[filename] = view;
  return view;
}

function switchFile(filename) {
  state.currentFile = filename;
  
  // Ensure editor is initialized
  if (!state.editors[filename]) {
    createEditor(filename);
  }
  
  // Hide all editors, show selected using important property to override CodeMirror styles
  Object.entries(state.editors).forEach(([key, editor]) => {
    if (key === filename) {
      editor.dom.style.setProperty('display', 'flex', 'important');
    } else {
      editor.dom.style.setProperty('display', 'none', 'important');
    }
  });
  
  // Update sidebar active class
  document.querySelectorAll('.file-item').forEach(item => {
    item.classList.toggle('active', item.dataset.file === filename);
  });
}

function setEditorContent(filename, content) {
  state.files[filename] = content;
  const editor = state.editors[filename];
  if (editor) {
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: content } });
  }
}

// ===== Sidebar File Explorer =====
function renderSidebarFiles() {
  const container = document.getElementById('sidebarFileList');
  if (!container) return;

  container.innerHTML = '';
  
  const folderHeader = document.createElement('div');
  folderHeader.className = 'folder-header';
  folderHeader.innerHTML = `
    <svg class="folder-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
    <span>PROJECT</span>
  `;
  container.appendChild(folderHeader);

  const fileListContainer = document.createElement('div');
  fileListContainer.className = 'folder-contents';
  
  Object.keys(state.files).forEach(filename => {
    const fileItem = document.createElement('div');
    fileItem.className = `file-item ${state.currentFile === filename ? 'active' : ''}`;
    fileItem.dataset.file = filename;
    
    // Choose icon based on file extension
    let icon = '📄';
    let iconClass = 'file-txt-icon';
    if (filename.endsWith('.html') || filename.endsWith('.htm')) {
      icon = '◇';
      iconClass = 'html-icon';
    } else if (filename.endsWith('.css')) {
      icon = '◆';
      iconClass = 'css-icon';
    } else if (filename.endsWith('.js') || filename.endsWith('.jsx') || filename.endsWith('.ts')) {
      icon = '⬡';
      iconClass = 'js-icon';
    }

    fileItem.innerHTML = `
      <span class="tab-icon ${iconClass}">${icon}</span>
      <span class="file-name-text">${filename}</span>
      ${['index.html', 'style.css', 'script.js'].includes(filename) ? '' : `<button class="delete-file-btn" data-file="${filename}" title="Delete File">&times;</button>`}
    `;

    fileItem.addEventListener('click', (e) => {
      if (e.target.closest('.delete-file-btn')) {
        e.stopPropagation();
        deleteFile(filename);
      } else {
        switchFile(filename);
      }
    });

    fileListContainer.appendChild(fileItem);
  });

  container.appendChild(fileListContainer);
}

function handleCreateNewFile() {
  const filename = prompt("Enter file name (e.g., about.html, utils.js):");
  if (!filename) return;
  
  const cleanName = filename.trim();
  if (!cleanName) return;

  if (state.files[cleanName]) {
    alert("File already exists!");
    return;
  }

  // Create empty file content
  let defaultContent = '';
  if (cleanName.endsWith('.html') || cleanName.endsWith('.htm')) {
    defaultContent = `<!-- ${cleanName} -->\n`;
  } else if (cleanName.endsWith('.css')) {
    defaultContent = `/* ${cleanName} styling */\n`;
  } else if (cleanName.endsWith('.js')) {
    defaultContent = `// ${cleanName} code\n`;
  }

  state.files[cleanName] = defaultContent;
  renderSidebarFiles();
  switchFile(cleanName);
}

function deleteFile(filename) {
  if (['index.html', 'style.css', 'script.js'].includes(filename)) return;
  
  if (confirm(`Are you sure you want to delete ${filename}?`)) {
    if (state.currentFile === filename) {
      switchFile('index.html');
    }
    
    const view = state.editors[filename];
    if (view) {
      view.destroy();
      delete state.editors[filename];
    }
    delete state.files[filename];
    
    renderSidebarFiles();
  }
}

// ===== Preview =====
function updatePreview() {
  const frame = document.getElementById('previewFrame');
  const htmlContent = state.files['index.html'] || '';
  const cssContent = state.files['style.css'] || '';
  const jsContent = state.files['script.js'] || '';

  // Start with index.html as layout
  let fullHTML = htmlContent
    .replace(/<link[^>]*href=["']style\.css["'][^>]*>/i, `<style>${cssContent}</style>`)
    .replace(/<script[^>]*src=["']script\.js["'][^>]*><\/script>/i, `<script>${jsContent}<\/script>`);

  // Inject any other custom CSS/JS files created by the user or agent
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
  const list = document.getElementById('modelListInline');
  if (!list) return;
  const categories = { recommended: '⚡ Recommended', fast: '🚀 Fast', reasoning: '🧠 Reasoning' };
  let html = '';

  Object.entries(categories).forEach(([cat, label]) => {
    const models = state.models.filter(m => m.category === cat);
    if (!models.length) return;
    html += `<div class="dropdown-header">${label}</div>`;
    models.forEach(m => {
      const active = m.id === state.currentModel ? 'active' : '';
      html += `<div class="model-item ${active}" data-model-id="${m.id}">
        <div class="model-item-title">${m.name}</div>
        <div class="model-item-desc">${m.description} · ${m.provider}</div>
      </div>`;
    });
  });

  list.innerHTML = html;
  list.querySelectorAll('.model-item').forEach(opt => {
    opt.addEventListener('click', () => {
      state.currentModel = opt.dataset.modelId;
      const model = state.models.find(m => m.id === state.currentModel);
      document.getElementById('currentModelNameInline').textContent = model?.name || state.currentModel;
      document.getElementById('modelDropdownInline').classList.remove('open');
      renderModelList();
    });
  });
}

// ===== Chat =====
function addMessage(role, content, image = null) {
  state.messages.push({ role, content, image });
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
    
    // Add image attachment bubble if present
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

  // Add apply buttons to code blocks
  container.querySelectorAll('.code-block-wrapper').forEach(wrapper => {
    wrapper.querySelectorAll('.apply-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = wrapper.querySelector('code').textContent;
        const lang = btn.dataset.lang || 'html';
        const filename = extractFilename(code, lang);
        
        applyCodeToEditor(code, filename);
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
    const filename = extractFilename(text, language);
    return `<div class="code-block-wrapper">
      <div class="code-block-header">
        <span class="code-lang">${filename}</span>
        <div class="code-actions">
          <button class="code-action-btn copy-code-btn">Copy</button>
          <button class="code-action-btn apply-btn" data-lang="${language}">▶ Apply to Editor</button>
        </div>
      </div>
      <pre><code class="language-${language}">${escapedCode}</code></pre>
    </div>`;
  };

  marked.setOptions({ renderer, breaks: true, gfm: true });
  return marked.parse(content);
}

function extractFilename(blockCode, defaultLang) {
  const firstLine = blockCode.split('\n')[0].trim();
  
  // 1. Check for HTML comment: <!-- filename.ext -->
  const htmlMatch = firstLine.match(/<!--\s*([\w\-.]+\.[\w]+)\s*-->/i);
  if (htmlMatch) return htmlMatch[1];
  
  // 2. Check for CSS/JS comment: /* filename.ext */ or // filename.ext
  const cssMatch = firstLine.match(/\/\*\s*([\w\-.]+\.[\w]+)\s*\*\//i);
  if (cssMatch) return cssMatch[1];
  
  const jsMatch = firstLine.match(/\/\/\s*([\w\-.]+\.[\w]+)/i);
  if (jsMatch) return jsMatch[1];

  // 3. Fallback to standard names based on language
  return detectTargetLang(defaultLang);
}

function detectTargetLang(lang) {
  if (['html', 'htm'].includes(lang)) return 'index.html';
  if (['css', 'scss', 'sass'].includes(lang)) return 'style.css';
  if (['javascript', 'js', 'jsx', 'ts', 'typescript'].includes(lang)) return 'script.js';
  return 'index.html'; // default
}

function applyCodeToEditor(code, filename) {
  if (!state.files[filename]) {
    state.files[filename] = '';
  }
  setEditorContent(filename, code);
  renderSidebarFiles();
  switchFile(filename);
  switchView('editor');

  // Flash status
  const status = document.getElementById('statusIndicator');
  status.querySelector('.status-text').textContent = `Applied to ${filename}`;
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
  if (state.isGenerating || (!text.trim() && !state.attachedImage)) return;

  const currentImage = state.attachedImage;
  
  // Reset attachment UI
  state.attachedImage = null;
  const attachmentPreview = document.getElementById('attachmentPreview');
  if (attachmentPreview) attachmentPreview.style.display = 'none';

  addMessage('user', text, currentImage);
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
    // Map messages supporting multimodal base64 image objects when vision models are active
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
    const filename = extractFilename(block.code, block.lang);

    if (!state.files[filename]) {
      state.files[filename] = '';
    }

    // Check if it's a complete HTML with embedded styles/scripts
    if (filename === 'index.html' && (block.code.includes('<!DOCTYPE') || block.code.includes('<html'))) {
      setEditorContent('index.html', block.code);
    } else {
      setEditorContent(filename, block.code);
    }
    
    renderSidebarFiles();
    switchFile(filename);
    if (state.currentView === 'editor') switchView('split');
    updatePreview();
  } else if (blocks.length > 1) {
    // Multiple blocks - apply each to its target
    blocks.forEach(block => {
      const filename = extractFilename(block.code, block.lang);
      if (!state.files[filename]) {
        state.files[filename] = '';
      }
      setEditorContent(filename, block.code);
    });
    
    renderSidebarFiles();
    
    // Switch to the first block's file
    const firstFilename = extractFilename(blocks[0].code, blocks[0].lang);
    switchFile(firstFilename);
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
  // Sidebar toggler
  const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
  const fileExplorer = document.getElementById('fileExplorer');
  
  if (toggleSidebarBtn && fileExplorer) {
    // Set initial active/collapsed states depending on viewport width
    if (window.innerWidth <= 768) {
      state.sidebarOpen = false;
      fileExplorer.classList.add('collapsed');
      toggleSidebarBtn.classList.remove('active');
    } else {
      state.sidebarOpen = true;
      fileExplorer.classList.remove('collapsed');
      toggleSidebarBtn.classList.add('active');
    }

    toggleSidebarBtn.addEventListener('click', () => {
      state.sidebarOpen = !state.sidebarOpen;
      if (state.sidebarOpen) {
        fileExplorer.classList.remove('collapsed');
        toggleSidebarBtn.classList.add('active');
      } else {
        fileExplorer.classList.add('collapsed');
        toggleSidebarBtn.classList.remove('active');
      }
    });
  }

  // Chat toggler
  const toggleChatBtn = document.getElementById('toggleChatBtn');
  const closeChatBtn = document.getElementById('closeChatBtn');
  const chatPanel = document.getElementById('chatPanel');
  const panelResizer = document.getElementById('panelResizer');

  // Set initial state
  state.chatOpen = true;
  if (toggleChatBtn) {
    toggleChatBtn.classList.add('active');
  }

  function setChatVisibility(isOpen) {
    state.chatOpen = isOpen;
    if (state.chatOpen) {
      chatPanel?.classList.remove('collapsed');
      panelResizer?.classList.remove('collapsed');
      toggleChatBtn?.classList.add('active');
    } else {
      chatPanel?.classList.add('collapsed');
      panelResizer?.classList.add('collapsed');
      toggleChatBtn?.classList.remove('active');
    }
  }

  if (toggleChatBtn) {
    toggleChatBtn.addEventListener('click', () => {
      setChatVisibility(!state.chatOpen);
    });
  }

  if (closeChatBtn) {
    closeChatBtn.addEventListener('click', () => {
      setChatVisibility(false);
    });
  }

  // Sidebar new file button
  const sidebarNewFileBtn = document.getElementById('sidebarNewFileBtn');
  if (sidebarNewFileBtn) {
    sidebarNewFileBtn.addEventListener('click', handleCreateNewFile);
  }

  // View tabs
  document.querySelectorAll('.view-tab').forEach(tab => {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  });

  // Model select inline dropdown toggle
  const modelSelectBtnInline = document.getElementById('modelSelectBtnInline');
  const modelDropdownInline = document.getElementById('modelDropdownInline');
  if (modelSelectBtnInline && modelDropdownInline) {
    modelSelectBtnInline.addEventListener('click', (e) => {
      e.stopPropagation();
      modelDropdownInline.classList.toggle('open');
      document.getElementById('modeDropdownInline')?.classList.remove('open');
    });
  }

  // Mode select inline dropdown toggle
  const modeSelectBtnInline = document.getElementById('modeSelectBtnInline');
  const modeDropdownInline = document.getElementById('modeDropdownInline');
  if (modeSelectBtnInline && modeDropdownInline) {
    modeSelectBtnInline.addEventListener('click', (e) => {
      e.stopPropagation();
      modeDropdownInline.classList.toggle('open');
      document.getElementById('modelDropdownInline')?.classList.remove('open');
    });
  }

  // Close all inline dropdowns when clicking anywhere outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.model-selector-inline')) {
      document.getElementById('modelDropdownInline')?.classList.remove('open');
    }
    if (!e.target.closest('.mode-selector-inline')) {
      document.getElementById('modeDropdownInline')?.classList.remove('open');
    }
  });

  // Inline Mode option selectors
  document.querySelectorAll('#modeDropdownInline .mode-option-item').forEach(item => {
    item.addEventListener('click', () => {
      state.currentMode = item.dataset.mode;
      
      // Update inline dropdown title and icons
      let icon = '🤖';
      let label = 'Agent';
      if (state.currentMode === 'chat') {
        icon = '💬';
        label = 'Chat';
      } else if (state.currentMode === 'auto') {
        icon = '⚡';
        label = 'Auto';
      }
      
      const iconSpan = modeSelectBtnInline.querySelector('.mode-icon');
      const textSpan = modeSelectBtnInline.querySelector('.mode-name');
      if (iconSpan) iconSpan.textContent = icon;
      if (textSpan) textSpan.textContent = label;

      // Update active list selection class
      document.querySelectorAll('#modeDropdownInline .mode-option-item').forEach(el => {
        el.classList.toggle('active', el.dataset.mode === state.currentMode);
      });

      modeDropdownInline.classList.remove('open');
    });
  });

  // Image Attachment Upload Trigger
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
      // Reset input value to allow selecting same file again
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
  const htmlContent = state.files['index.html'] || '';
  const cssContent = state.files['style.css'] || '';
  const jsContent = state.files['script.js'] || '';

  // Create a single HTML file with embedded CSS/JS
  let fullHTML = htmlContent;
  if (!fullHTML.includes('<style') && cssContent.trim()) {
    fullHTML = fullHTML.replace('</head>', `  <style>\n${cssContent}\n  </style>\n</head>`);
  }
  if (!fullHTML.includes('<script') && jsContent.trim()) {
    fullHTML = fullHTML.replace('</body>', `  <script>\n${jsContent}\n  <\/script>\n</body>`);
  }

  // Inject any other files into download
  Object.entries(state.files).forEach(([name, content]) => {
    if (name === 'index.html' || name === 'style.css' || name === 'script.js') return;
    if (name.endsWith('.css')) {
      fullHTML = fullHTML.replace('</head>', `  <style data-file="${name}">\n${content}\n  </style>\n</head>`);
    } else if (name.endsWith('.js')) {
      fullHTML = fullHTML.replace('</body>', `  <script data-file="${name}">\n${content}\n  <\/script>\n</body>`);
    }
  });

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
  // Create editors for core files
  ['index.html', 'style.css', 'script.js'].forEach(filename => createEditor(filename));
  switchFile('index.html');
  renderSidebarFiles();

  initResizer();
  initEvents();
  initMobileLayout();
  loadModels();
}

document.addEventListener('DOMContentLoaded', init);
