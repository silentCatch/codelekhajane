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
  }
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
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
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
  const selector = document.getElementById('mobileFileSelector');
  if (selector) selector.value = filename;

  if (editorView) {
    const languageConf = {
      'index.html': html(),
      'style.css': css(),
      'script.js': javascript()
    };

    editorView.setState(EditorState.create({
      doc: state.files[filename],
      extensions: [
        lineNumbers(),
        oneDark,
        languageConf[filename] || html(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            state.files[state.currentFile] = update.state.doc.toString();
          }
        })
      ]
    }));
  }
}

// ===== Interactive Preview (Self-Contained Blob Compilation) =====
function updatePreview() {
  const iframe = document.getElementById('mobilePreviewFrame');
  if (!iframe) return;

  const htmlContent = state.files['index.html'] || '';
  const cssContent = state.files['style.css'] || '';
  const jsContent = state.files['script.js'] || '';

  // Clean injection and dynamic compilation
  let parsed = htmlContent;

  const cssTag = `<style>${cssContent}</style>`;
  if (parsed.includes('</head>')) {
    parsed = parsed.replace('</head>', `${cssTag}</head>`);
  } else {
    parsed = cssTag + parsed;
  }

  const jsTag = `<script>${jsContent}<\/script>`;
  if (parsed.includes('</body>')) {
    parsed = parsed.replace('</body>', `${jsTag}</body>`);
  } else {
    parsed = parsed + jsTag;
  }

  const blob = new Blob([parsed], { type: 'text/html' });
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

function renderModelList() {
  const list = document.getElementById('modelListInline');
  const dropdownMenu = document.getElementById('modelDropdownInline');
  if (!list) return;
  const categories = { recommended: '⚡ Recommended', fast: '🚀 Fast', reasoning: '🧠 Reasoning' };
  let htmlText = '';

  Object.entries(categories).forEach(([cat, label]) => {
    const models = state.models.filter(m => m.category === cat);
    if (!models.length) return;
    htmlText += `<div class="dropdown-header">${label}</div>`;
    models.forEach(m => {
      const active = m.id === state.currentModel ? 'active' : '';
      htmlText += `<div class="model-item ${active}" data-model-id="${m.id}">
        <div class="model-item-title">${m.name}</div>
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
        if (model?.category === 'reasoning') iconSpan.textContent = '🧠';
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

  state.messages.forEach((msg) => {
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
  container.scrollTop = container.scrollHeight;
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
  } catch (error) {
    const thinkEl = document.getElementById('thinkingMsg');
    if (thinkEl) thinkEl.remove();
    addMessage('assistant', `**Error:** ${error.message}. Make sure the server is running.`);
  } finally {
    state.isGenerating = false;
    document.getElementById('sendBtn').disabled = false;
  }
}

// ===== Event Listeners =====
function initEvents() {
  // Topbar Switch Header Tab Buttons (Blue Highlight part)
  document.querySelectorAll('.mobile-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
    });
  });

  // Mobile File Selector Dropdown Select (Code Screen Toolbar)
  const mobileFileSelector = document.getElementById('mobileFileSelector');
  if (mobileFileSelector) {
    mobileFileSelector.addEventListener('change', (e) => {
      switchFile(e.target.value);
    });
  }

  // Mobile Preview Compile Run Button Trigger
  const mobileRunBtn = document.getElementById('mobileRunBtn');
  if (mobileRunBtn) {
    mobileRunBtn.addEventListener('click', () => {
      updatePreview();
    });
  }

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

  // Close dropdowns on body tap
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.model-selector-inline')) {
      document.getElementById('modelDropdownInline')?.classList.remove('open');
    }
    if (!e.target.closest('.mode-selector-inline')) {
      document.getElementById('modeDropdownInline')?.classList.remove('open');
    }
  });

  // Mode selections (Image 2 highlight updates)
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

  // Vision File Image attachment selectors
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

  // Textarea multi-line height adjustment limit of max 3 lines (4.2em)
  const chatInput = document.getElementById('chatInput');
  if (chatInput) {
    chatInput.addEventListener('input', () => {
      chatInput.style.height = 'auto';
      // Auto-grow height according to scrollHeight
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

  // Chat send trigger button
  const sendBtn = document.getElementById('sendBtn');
  if (sendBtn && chatInput) {
    sendBtn.addEventListener('click', () => {
      const text = chatInput.value;
      chatInput.value = '';
      chatInput.style.height = 'auto';
      sendMessage(text);
    });
  }

  // Quick Action card prompt clicks
  document.querySelectorAll('.quick-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.dataset.prompt;
      if (prompt) sendMessage(prompt);
    });
  });
}

// ===== Initializer =====
document.addEventListener('DOMContentLoaded', () => {
  initEvents();
  initEditor();
  loadModels();
  updatePreview();
  // Set initial tab indicator position
  updateTabIndicator('chat');
});
