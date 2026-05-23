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

// ===== File Icon SVGs =====
const FILE_ICONS = {
  html: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M4 3l1.8 17L12 22l6.2-2L20 3H4z" fill="#E44D26" opacity="0.9"/><path d="M12 4.5v15.3l5-1.6L18.4 4.5H12z" fill="#F16529" opacity="0.7"/><path d="M8.5 8h7l-.2 2H9l.2 2h5.6l-.4 4.5L12 17.5l-2.4-1L9.4 14H7.5l.4 4.5L12 20l4.1-1.5.6-7H8.3L8.5 8z" fill="#fff"/></svg>`,
  css: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M4 3l1.8 17L12 22l6.2-2L20 3H4z" fill="#1572B6" opacity="0.9"/><path d="M12 4.5v15.3l5-1.6L18.4 4.5H12z" fill="#33A9DC" opacity="0.7"/><path d="M15.5 8H8l.2 2h7l-.4 4.5L12 15.5l-2.8-1-.2-2h-2l.4 4L12 18l4.5-1.5L17 8h-1.5z" fill="#fff"/></svg>`,
  js: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" fill="#F7DF1E" opacity="0.9"/><path d="M13.5 16.5c.3.5.7.9 1.5.9.6 0 1-.3 1-.7 0-.5-.4-.7-1.1-1l-.4-.2c-1.1-.5-1.8-1-1.8-2.3 0-1.1.9-2 2.2-2 1 0 1.7.3 2.2 1.2l-1.2.8c-.3-.5-.5-.7-1-.7-.5 0-.7.3-.7.6 0 .5.3.6 1 .9l.4.2c1.3.5 2 1.1 2 2.4 0 1.4-1.1 2.1-2.5 2.1-1.4 0-2.3-.7-2.7-1.5l1.1-.7zM8 16.7c.2.4.4.7.9.7.4 0 .7-.2.7-.8V10h1.5v6.7c0 1.3-.8 1.9-1.9 1.9-1 0-1.6-.5-1.9-1.2L8 16.7z" fill="#333"/></svg>`,
  jsx: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" fill="#20232a"/><circle cx="12" cy="12" r="2" fill="#61DAFB"/><ellipse cx="12" cy="12" rx="8" ry="3" stroke="#61DAFB" stroke-width="1" fill="none" transform="rotate(0 12 12)"/><ellipse cx="12" cy="12" rx="8" ry="3" stroke="#61DAFB" stroke-width="1" fill="none" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="8" ry="3" stroke="#61DAFB" stroke-width="1" fill="none" transform="rotate(120 12 12)"/></svg>`,
  ts: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" fill="#3178C6" opacity="0.9"/><path d="M14.2 16.5c.3.5.8.9 1.5.9.6 0 1-.3 1-.7 0-.5-.4-.7-1.1-1l-.4-.2c-1.1-.5-1.8-1-1.8-2.3 0-1.1.9-2 2.2-2 1 0 1.7.3 2.2 1.2l-1.2.8c-.3-.5-.5-.7-1-.7-.5 0-.7.3-.7.6 0 .5.3.6 1 .9l.4.2c1.3.5 2 1.1 2 2.4 0 1.4-1.1 2.1-2.5 2.1-1.4 0-2.3-.7-2.7-1.5l1.1-.7zM7 10h5v1.3h-1.7V18H9V11.3H7V10z" fill="#fff"/></svg>`,
  py: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M11.9 3C7.5 3 8 4.8 8 4.8v2h4v.6H6.5S3 7 3 11.5c0 4.5 3 4.3 3 4.3h1.8v-2.1s-.1-3 3-3h5.4s2.8.1 2.8-2.7V5.5S19.5 3 11.9 3zm-2 1.5a.9.9 0 110 1.8.9.9 0 010-1.8z" fill="#3776AB"/><path d="M12.1 21c4.4 0 3.9-1.8 3.9-1.8v-2h-4v-.6h5.5s3.5.4 3.5-4.1c0-4.5-3-4.3-3-4.3h-1.8v2.1s.1 3-3 3H8.8s-2.8-.1-2.8 2.7v2.5S5.5 21 12.1 21zm2-1.5a.9.9 0 110-1.8.9.9 0 010 1.8z" fill="#FFD43B"/></svg>`,
  json: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M5 3h2c1 0 2 .5 2 2v3c0 1.5 1 2.5 2 3-1 .5-2 1.5-2 3v3c0 1.5-1 2-2 2H5" stroke="#F5C518" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M19 3h-2c-1 0-2 .5-2 2v3c0 1.5-1 2.5-2 3 1 .5 2 1.5 2 3v3c0 1.5 1 2 2 2h2" stroke="#F5C518" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>`,
  vue: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M2 3h4l6 10.5L18 3h4L12 21 2 3z" fill="#41B883"/><path d="M6.5 3H12l0 0h5.5L12 14 6.5 3z" fill="#35495E"/></svg>`,
  md: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><rect x="2" y="4" width="20" height="16" rx="2" stroke="#519ABA" stroke-width="1.5" fill="none"/><path d="M5 15V9l2.5 3L10 9v6M14 15v-4l2 2 2-2v4" stroke="#519ABA" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
  txt: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="#8888a8" stroke-width="1.5" fill="none"/><polyline points="14 2 14 8 20 8" stroke="#8888a8" stroke-width="1.5" fill="none"/><line x1="8" y1="13" x2="16" y2="13" stroke="#8888a8" stroke-width="1" opacity="0.5"/><line x1="8" y1="16" x2="14" y2="16" stroke="#8888a8" stroke-width="1" opacity="0.5"/></svg>`,
  xml: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="#E44D26" stroke-width="1.5" fill="none"/><polyline points="14 2 14 8 20 8" stroke="#E44D26" stroke-width="1.5" fill="none"/><path d="M9 13l-2 2 2 2M15 13l2 2-2 2" stroke="#E44D26" stroke-width="1.2" stroke-linecap="round" fill="none"/></svg>`,
  svg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#FFB13B" stroke-width="1.5" fill="none"/><circle cx="9" cy="9" r="2" stroke="#FFB13B" stroke-width="1" fill="none"/><path d="M3 16l5-5 4 4 3-3 6 6" stroke="#FFB13B" stroke-width="1" fill="none"/></svg>`,
  folder: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" fill="#56B6C2" opacity="0.2" stroke="#56B6C2" stroke-width="1.5"/></svg>`,
  folderOpen: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v1" stroke="#56B6C2" stroke-width="1.5" fill="none"/><path d="M2 10h20l-2 10H4L2 10z" fill="#56B6C2" opacity="0.25"/></svg>`,
  config: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><circle cx="12" cy="12" r="3" stroke="#8888a8" stroke-width="1.5" fill="none"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="#8888a8" stroke-width="1.2" fill="none"/></svg>`,
};

function getFileIcon(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const nameLC = filename.toLowerCase();

  // Config files
  if (['package.json', 'tsconfig.json', 'vite.config.js', 'webpack.config.js', '.env', '.gitignore', 'requirements.txt'].includes(nameLC)) {
    return FILE_ICONS.config;
  }

  // Extension-based
  const map = {
    html: FILE_ICONS.html, htm: FILE_ICONS.html,
    css: FILE_ICONS.css, scss: FILE_ICONS.css, sass: FILE_ICONS.css,
    js: FILE_ICONS.js,
    jsx: FILE_ICONS.jsx, tsx: FILE_ICONS.jsx,
    ts: FILE_ICONS.ts,
    py: FILE_ICONS.py,
    json: FILE_ICONS.json,
    vue: FILE_ICONS.vue,
    md: FILE_ICONS.md, markdown: FILE_ICONS.md,
    svg: FILE_ICONS.svg,
    xml: FILE_ICONS.xml,
  };

  return map[ext] || FILE_ICONS.txt;
}

// ===== Tech Stack Detection =====
function detectTechStack() {
  const files = Object.keys(state.files);
  const exts = files.map(f => f.split('.').pop()?.toLowerCase());
  const names = files.map(f => f.toLowerCase());

  if (names.some(n => n.endsWith('.jsx') || n.endsWith('.tsx') || n === 'app.jsx' || n === 'app.tsx'))
    return { name: 'React', icon: '⚛️', color: '#61DAFB' };
  if (names.some(n => n.endsWith('.vue') || n === 'app.vue'))
    return { name: 'Vue', icon: '💚', color: '#41B883' };
  if (names.some(n => n === 'app.py' || n === 'main.py' || n.endsWith('.py')))
    return { name: 'Python', icon: '🐍', color: '#3776AB' };
  if (names.some(n => n === 'server.js' || n === 'app.js') && names.includes('package.json'))
    return { name: 'Node.js', icon: '🟢', color: '#68A063' };
  if (names.includes('package.json'))
    return { name: 'JavaScript', icon: '⚡', color: '#F7DF1E' };

  return { name: 'Web', icon: '🌐', color: '#00f0ff' };
}

// ===== Project Stack Suggestion Templates =====
const PROJECT_STACKS = [
  {
    id: 'react',
    name: 'React',
    icon: `<svg viewBox="0 0 24 24" width="28" height="28"><circle cx="12" cy="12" r="2.5" fill="#61DAFB"/><ellipse cx="12" cy="12" rx="9" ry="3.5" stroke="#61DAFB" stroke-width="1" fill="none"/><ellipse cx="12" cy="12" rx="9" ry="3.5" stroke="#61DAFB" stroke-width="1" fill="none" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.5" stroke="#61DAFB" stroke-width="1" fill="none" transform="rotate(120 12 12)"/></svg>`,
    description: 'Component-based UI with JSX',
    color: '#61DAFB',
    prompt: `Generate a complete React-based project. You MUST output MULTIPLE separate code blocks. Make sure to put the exact filename comment on the first line of each code block (e.g., \`// App.jsx\` or \`<!-- index.html -->\`).\n1. \`\`\`html for index.html (include CDN links for React, ReactDOM, Babel, and import src="App.jsx" as text/html/babel)\n2. \`\`\`jsx for App.jsx (main React component with useState, useEffect)\n3. \`\`\`css for style.css (modern styling)\n4. \`\`\`json for package.json\nDo NOT write React code in script.js. Write it in App.jsx. Make it a complete, working React app.`,
  },
  {
    id: 'vue',
    name: 'Vue.js',
    icon: `<svg viewBox="0 0 24 24" width="28" height="28"><path d="M2 3h4l6 11L18 3h4L12 21 2 3z" fill="#41B883"/><path d="M6.5 3H12l0 0h5.5L12 14.5 6.5 3z" fill="#35495E"/></svg>`,
    description: 'Progressive framework for UIs',
    color: '#41B883',
    prompt: `Generate a complete Vue.js-based project. You MUST output MULTIPLE separate code blocks. Make sure to put the exact filename comment on the first line of each code block (e.g., \`// main.js\` or \`<!-- index.html -->\`).\n1. \`\`\`html for index.html (include Vue CDN and load main.js)\n2. \`\`\`javascript for main.js (Vue app setup with reactive data)\n3. \`\`\`css for style.css (modern styling)\n4. \`\`\`json for package.json\nMake it a complete, working Vue.js app.`,
  },
  {
    id: 'node',
    name: 'Node.js',
    icon: `<svg viewBox="0 0 24 24" width="28" height="28"><path d="M12 2l8.5 5v10L12 22l-8.5-5V7L12 2z" fill="#68A063" opacity="0.2" stroke="#68A063" stroke-width="1.5"/><text x="12" y="14.5" text-anchor="middle" fill="#68A063" font-size="7" font-weight="bold" font-family="sans-serif">JS</text></svg>`,
    description: 'Server-side with Express.js',
    color: '#68A063',
    prompt: `Generate a complete Node.js/Express-based full-stack project. You MUST output MULTIPLE separate code blocks. Make sure to put the exact filename comment on the first line of each code block (e.g., \`// server.js\` or \`<!-- index.html -->\`).\n1. \`\`\`javascript for server.js (Express server with routes, middleware)\n2. \`\`\`javascript for routes.js (API route handlers)\n3. \`\`\`html for index.html (frontend served by Express)\n4. \`\`\`css for style.css (modern styling)\n5. \`\`\`json for package.json (with express dependency)\nMake it a complete working Node.js server with a frontend.`,
  },
  {
    id: 'python',
    name: 'Python Flask',
    icon: `<svg viewBox="0 0 24 24" width="28" height="28"><path d="M11.9 3C7.5 3 8 4.8 8 4.8v2h4v.6H6.5S3 7 3 11.5c0 4.5 3 4.3 3 4.3h1.8v-2.1s-.1-3 3-3h5.4s2.8.1 2.8-2.7V5.5S19.5 3 11.9 3zm-2 1.5a.9.9 0 110 1.8.9.9 0 010-1.8z" fill="#3776AB"/><path d="M12.1 21c4.4 0 3.9-1.8 3.9-1.8v-2h-4v-.6h5.5s3.5.4 3.5-4.1c0-4.5-3-4.3-3-4.3h-1.8v2.1s.1 3-3 3H8.8s-2.8-.1-2.8 2.7v2.5S5.5 21 12.1 21zm2-1.5a.9.9 0 110-1.8.9.9 0 010 1.8z" fill="#FFD43B"/></svg>`,
    description: 'Python backend with Flask',
    color: '#3776AB',
    prompt: `Generate a complete Python Flask-based full-stack project. You MUST output MULTIPLE separate code blocks. Make sure to put the exact filename comment on the first line of each code block (e.g., \`# app.py\` or \`<!-- templates/index.html -->\`).\n1. \`\`\`python for app.py (Flask app with routes, templates)\n2. \`\`\`python for requirements.txt (flask and dependencies)\n3. \`\`\`html for templates/index.html (Jinja2 HTML template)\n4. \`\`\`css for static/style.css (modern styling)\nMake it a complete working Flask application.`,
  },
];

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
  currentSessionId: null,
  pendingStackSelection: false, // For DeepSeek suggestion flow
  pendingUserPrompt: '',        // Original user prompt before stack selection
  collapsedFolders: {},         // Track collapsed folder states
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
        saveCurrentSession();
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

// ===== Advanced Sidebar File Explorer =====
function renderSidebarFiles() {
  const container = document.getElementById('sidebarFileList');
  if (!container) return;

  container.innerHTML = '';

  // Detect tech stack
  const stack = detectTechStack();

  // Tech stack badge
  const stackBadge = document.createElement('div');
  stackBadge.className = 'tech-stack-badge';
  stackBadge.innerHTML = `
    <span class="stack-icon">${stack.icon}</span>
    <span class="stack-name" style="color:${stack.color}">${stack.name}</span>
    <span class="stack-file-count">${Object.keys(state.files).length} files</span>
  `;
  container.appendChild(stackBadge);

  // Group files by directory
  const fileTree = {};
  Object.keys(state.files).forEach(filename => {
    const parts = filename.split('/');
    if (parts.length > 1) {
      const folder = parts.slice(0, -1).join('/');
      if (!fileTree[folder]) fileTree[folder] = [];
      fileTree[folder].push(filename);
    } else {
      if (!fileTree['__root__']) fileTree['__root__'] = [];
      fileTree['__root__'].push(filename);
    }
  });

  // Render root files first
  if (fileTree['__root__']) {
    const rootContainer = document.createElement('div');
    rootContainer.className = 'folder-contents';
    
    fileTree['__root__'].forEach(filename => {
      rootContainer.appendChild(createFileItem(filename, filename));
    });
    
    container.appendChild(rootContainer);
  }

  // Render folders
  Object.keys(fileTree).filter(k => k !== '__root__').sort().forEach(folder => {
    const isCollapsed = state.collapsedFolders[folder] || false;
    
    const folderDiv = document.createElement('div');
    folderDiv.className = 'folder-group';

    const folderHeader = document.createElement('div');
    folderHeader.className = `folder-header ${isCollapsed ? 'collapsed' : ''}`;
    folderHeader.innerHTML = `
      <svg class="folder-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      <span class="folder-icon-svg">${isCollapsed ? FILE_ICONS.folder : FILE_ICONS.folderOpen}</span>
      <span class="folder-name-text">${folder}</span>
      <span class="folder-count-badge">${fileTree[folder].length}</span>
    `;
    
    folderHeader.addEventListener('click', () => {
      state.collapsedFolders[folder] = !state.collapsedFolders[folder];
      renderSidebarFiles();
    });

    folderDiv.appendChild(folderHeader);

    if (!isCollapsed) {
      const folderContents = document.createElement('div');
      folderContents.className = 'folder-contents folder-nested';

      fileTree[folder].forEach(fullPath => {
        const displayName = fullPath.split('/').pop();
        folderContents.appendChild(createFileItem(fullPath, displayName));
      });

      folderDiv.appendChild(folderContents);
    }

    container.appendChild(folderDiv);
  });
}

function createFileItem(fullPath, displayName) {
  const fileItem = document.createElement('div');
  fileItem.className = `file-item ${state.currentFile === fullPath ? 'active' : ''}`;
  fileItem.dataset.file = fullPath;

  const isProtected = ['index.html', 'style.css', 'script.js'].includes(fullPath);

  fileItem.innerHTML = `
    <span class="file-icon-svg">${getFileIcon(displayName)}</span>
    <span class="file-name-text">${displayName}</span>
    ${isProtected ? '' : `<button class="delete-file-btn" data-file="${fullPath}" title="Delete File">&times;</button>`}
  `;

  fileItem.addEventListener('click', (e) => {
    if (e.target.closest('.delete-file-btn')) {
      e.stopPropagation();
      deleteFile(fullPath);
    } else {
      switchFile(fullPath);
    }
  });

  return fileItem;
}

function handleCreateNewFile() {
  const filename = prompt("Enter file name (e.g., about.html, utils.js, src/components/App.jsx):");
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
  } else if (cleanName.endsWith('.js') || cleanName.endsWith('.jsx')) {
    defaultContent = `// ${cleanName} code\n`;
  } else if (cleanName.endsWith('.py')) {
    defaultContent = `# ${cleanName}\n`;
  } else if (cleanName.endsWith('.vue')) {
    defaultContent = `<template>\n  <div>\n    <!-- ${cleanName} -->\n  </div>\n</template>\n\n<script>\nexport default {\n  name: '${cleanName.replace('.vue', '')}'\n}\n</script>\n\n<style scoped>\n</style>\n`;
  } else if (cleanName.endsWith('.json')) {
    defaultContent = `{\n  \n}\n`;
  } else {
    defaultContent = ``;
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
  const categories = {
    recommended: '⚡ Recommended',
    fast: '🚀 Fast',
    reasoning: '🧠 Reasoning',
    deepseek: '🔮 DeepSeek',
  };
  let html = '';

  Object.entries(categories).forEach(([cat, label]) => {
    const models = state.models.filter(m => m.category === cat);
    if (!models.length) return;
    html += `<div class="dropdown-header ${cat === 'deepseek' ? 'deepseek-header' : ''}">${label}</div>`;
    models.forEach(m => {
      const active = m.id === state.currentModel ? 'active' : '';
      const isDeepSeek = m.category === 'deepseek';
      html += `<div class="model-item ${active} ${isDeepSeek ? 'deepseek-model-item' : ''}" data-model-id="${m.id}">
        <div class="model-item-title">${m.name}${isDeepSeek ? '<span class="ds-badge">DS</span>' : ''}</div>
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
      
      // Update model icon for DeepSeek
      const iconSpan = document.querySelector('#modelSelectBtnInline .model-icon');
      if (iconSpan) {
        iconSpan.textContent = isDeepSeekModel(state.currentModel) ? '🔮' : '⚡';
      }
      
      renderModelList();
    });
  });
}

function isDeepSeekModel(modelId) {
  return modelId && modelId.startsWith('deepseek-');
}

// ===== DeepSeek Project Suggestion Cards =====
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
        <p class="suggestion-intro">I can build a <strong>full-stack project</strong> for you. Choose your preferred tech stack:</p>
        <div class="stack-cards-grid">
          ${PROJECT_STACKS.map(stack => `
            <button class="stack-card" data-stack-id="${stack.id}" style="--stack-color:${stack.color}">
              <div class="stack-card-icon">${stack.icon}</div>
              <div class="stack-card-info">
                <span class="stack-card-name">${stack.name}</span>
                <span class="stack-card-desc">${stack.description}</span>
              </div>
              <div class="stack-card-arrow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </button>
          `).join('')}
        </div>
        <button class="skip-suggestion-btn" id="skipSuggestionBtn">Skip — use default HTML/CSS/JS</button>
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

      // Remove suggestion cards
      suggestDiv.remove();
      state.pendingStackSelection = false;

      // Add user selection message
      addMessage('user', `Build with ${stack.name}: ${state.pendingUserPrompt}`);

      // Enhance prompt with stack template and send
      const enhancedPrompt = `${state.pendingUserPrompt}\n\n${stack.prompt}`;
      sendMessageDirect(enhancedPrompt);
    });
  });

  // Skip button
  suggestDiv.querySelector('#skipSuggestionBtn')?.addEventListener('click', () => {
    suggestDiv.remove();
    state.pendingStackSelection = false;
    // Send original prompt without stack enhancement
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

  // Clear only message elements (keep welcome if no messages)
  container.querySelectorAll('.message').forEach(m => m.remove());

  state.messages.forEach((msg, i) => {
    const div = document.createElement('div');
    div.className = `message ${msg.role === 'user' ? 'user' : 'assistant'}`;

    const avatar = msg.role === 'user' ? '👤' : (isDeepSeekModel(state.currentModel) ? '🔮' : '⚡');
    const sender = msg.role === 'user' ? 'You' : (isDeepSeekModel(state.currentModel) ? 'DeepSeek' : 'CodeAgent');
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
  if (['css', 'scss', 'sass'].includes(lang)) return 'style.css';
  if (['javascript', 'js'].includes(lang)) return 'script.js';
  if (['jsx', 'tsx'].includes(lang)) return 'App.jsx';
  if (['python', 'py'].includes(lang)) return 'app.py';
  if (['vue'].includes(lang)) return 'App.vue';
  if (['json'].includes(lang)) return 'package.json';
  if (['typescript', 'ts'].includes(lang)) return 'index.ts';
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
// ===== AI Generating Overlay Utility =====
function toggleGeneratingOverlay(show, text = 'AI is scaffolding your project...') {
  const container = document.getElementById('editorPanel');
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
    // Small timeout to allow fade out transition
    overlay.classList.remove('active');
  }
}

// ===== Streaming Chat =====
async function sendMessage(text) {
  if (state.isGenerating || (!text.trim() && !state.attachedImage)) return;

  // If DeepSeek model is selected, show suggestion cards for code-intent prompts
  if (isDeepSeekModel(state.currentModel) && text.trim() && !state.pendingStackSelection) {
    const currentImage = state.attachedImage;
    state.attachedImage = null;
    const attachmentPreview = document.getElementById('attachmentPreview');
    if (attachmentPreview) attachmentPreview.style.display = 'none';

    addMessage('user', text, currentImage);
    showProjectSuggestionCards(text);
    return;
  }

  // Normal flow for non-DeepSeek models
  await sendMessageDirect(text);
}

async function sendMessageDirect(text) {
  if (state.isGenerating) return;

  if (state.currentMode !== 'chat') {
    setEditorVisibility(true);
    const isDS = isDeepSeekModel(state.currentModel);
    const overlayText = isDS ? 'DeepSeek is scaffolding your full-stack project...' : 'CodeAgent is generating your code...';
    toggleGeneratingOverlay(true, overlayText);
  }

  // Only add user message if not already added (DeepSeek flow adds it before)
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

  const statusEl = document.getElementById('statusIndicator');
  statusEl.classList.add('generating');
  const isDS = isDeepSeekModel(state.currentModel);
  statusEl.querySelector('.status-text').textContent = state.currentMode === 'auto' ? 'Classifying...' : (isDS ? 'DeepSeek thinking...' : 'Generating...');

  // Add thinking indicator
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
    let autoDetectedIntent = null; // Track intent for Auto mode

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
            if (parsed.intent) {
              // Auto mode intent classification event from server
              autoDetectedIntent = parsed.intent;
              // Update status to show detected sub-mode
              if (autoDetectedIntent === 'question') {
                statusEl.querySelector('.status-text').textContent = 'Auto → Answering...';
              } else {
                statusEl.querySelector('.status-text').textContent = 'Auto → Coding...';
              }
            } else if (parsed.error) {
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

    saveCurrentSession();

    // Smart auto-apply logic:
    // - Agent mode: always auto-apply code blocks
    // - Auto mode: only auto-apply if intent was detected as 'code'
    // - Chat mode: never auto-apply
    if (state.currentMode === 'agent') {
      autoApplyCode(assistantContent);
      saveCurrentSession();
    } else if (state.currentMode === 'auto' && autoDetectedIntent === 'code') {
      autoApplyCode(assistantContent);
      saveCurrentSession();
    }
    // Auto mode with intent === 'question' → no auto-apply (just chat response)
  } catch (error) {
    const thinkEl = document.getElementById('thinkingMsg');
    if (thinkEl) thinkEl.remove();
    addMessage('assistant', `**Error:** ${error.message}. Make sure the server is running.`);
  } finally {
    state.isGenerating = false;
    state.pendingUserPrompt = '';
    document.getElementById('sendBtn').disabled = false;
    statusEl.classList.remove('generating');
    statusEl.querySelector('.status-text').textContent = 'Ready';
    statusEl.querySelector('.status-dot').style.background = '#00e676';
    toggleGeneratingOverlay(false);
  }
}

function autoApplyCode(content) {
  // Extract code blocks and auto-apply to relevant editors
  const codeBlockRegex = /```(\w+)?\r?\n([\s\S]*?)```/g;
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
  setEditorVisibility(true);
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

  Object.keys(state.files).forEach(filename => {
    const content = state.files[filename];
    if (state.editors[filename]) {
      const editor = state.editors[filename];
      editor.dispatch({
        changes: { from: 0, to: editor.state.doc.length, insert: content }
      });
    }
  });

  switchFile(state.currentFile);
  renderSidebarFiles();
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
  state.pendingStackSelection = false;
  state.pendingUserPrompt = '';
  setEditorVisibility(false);
  // Clean up any extra editor views not in the default state
  Object.keys(state.editors).forEach(filename => {
    if (filename !== 'index.html' && filename !== 'style.css' && filename !== 'script.js') {
      state.editors[filename].destroy();
      delete state.editors[filename];
    }
  });
  state.files = {
    'index.html': `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My Project</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>Hello World!</h1>\n  <p>Start coding or ask the AI agent to generate code for you.</p>\n  <script src="script.js"><\/script>\n</body>\n</html>`,
    'style.css': `* {\n  margin: 0;\n  padding: 0;\n  box-sizing: border-box;\n}\n\nbody {\n  font-family: system-ui, sans-serif;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 100vh;\n  background: #0a0a0f;\n  color: #e8e8f0;\n}\n\nh1 {\n  font-size: 2.5rem;\n  margin-bottom: 0.5rem;\n}`,
    'script.js': `// Your JavaScript code here\nconsole.log('Hello from CodeAgent!');\n`
  };
  state.currentFile = 'index.html';
  state.collapsedFolders = {};

  const container = document.getElementById('chatMessages');
  container.innerHTML = '';
  container.innerHTML = `<div class="welcome-message">
    <div class="welcome-icon">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="url(#welcome-grad)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <defs>
          <linearGradient id="welcome-grad" x1="3" y1="2" x2="21" y2="22">
            <stop stop-color="#00f0ff"/>
            <stop offset="1" stop-color="#b400ff"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
    <h3>Welcome to CodeAgent</h3>
    <p>I can help you write, debug, and improve code in real-time. Try asking me to:</p>
    <div class="quick-actions">
      <button class="quick-action-btn" data-prompt="Create a beautiful landing page with animated gradients and modern design">
        <span class="quick-action-icon">✨</span>
        <div class="quick-action-info">
          <span class="quick-action-title">Create a landing page</span>
          <span class="quick-action-desc">Beautiful page with animated gradients</span>
        </div>
      </button>
      <button class="quick-action-btn" data-prompt="Build a todo app with local storage, animations, and a sleek dark theme">
        <span class="quick-action-icon">📋</span>
        <div class="quick-action-info">
          <span class="quick-action-title">Build a todo app</span>
          <span class="quick-action-desc">Local storage, animations, dark theme</span>
        </div>
      </button>
      <button class="quick-action-btn" data-prompt="Create an interactive animated particle background using canvas">
        <span class="quick-action-icon">🎨</span>
        <div class="quick-action-info">
          <span class="quick-action-title">Particle animation</span>
          <span class="quick-action-desc">Interactive canvas background</span>
        </div>
      </button>
      <button class="quick-action-btn" data-prompt="Build a real-time clock with analog and digital display, dark theme">
        <span class="quick-action-icon">⏰</span>
        <div class="quick-action-info">
          <span class="quick-action-title">Animated clock</span>
          <span class="quick-action-desc">Real-time analog & digital clock</span>
        </div>
      </button>
    </div>
  </div>`;

  container.querySelectorAll('.quick-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const chatInput = document.getElementById('chatInput');
      chatInput.value = btn.dataset.prompt;
      sendMessage(btn.dataset.prompt);
      chatInput.value = '';
    });
  });

  Object.keys(state.files).forEach(filename => {
    const content = state.files[filename];
    if (state.editors[filename]) {
      const editor = state.editors[filename];
      editor.dispatch({
        changes: { from: 0, to: editor.state.doc.length, insert: content }
      });
    }
  });

  switchFile('index.html');
  renderSidebarFiles();
  updatePreview();
  
  document.getElementById('chatHistoryPanel').style.display = 'none';
}

function renderHistoryList() {
  const container = document.getElementById('historyListContainer');
  if (!container) return;

  container.innerHTML = '';
  const list = getHistoryList();

  if (list.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 13px; margin-top: 40px;">No conversation history yet.</div>';
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

function setEditorVisibility(isOpen) {
  const mainLayout = document.getElementById('mainLayout');
  const toggleEditorBtn = document.getElementById('toggleEditorBtn');
  
  if (isOpen) {
    mainLayout.classList.remove('editor-collapsed');
    toggleEditorBtn?.classList.add('active');
    state.editors[state.currentFile]?.requestMeasure();
  } else {
    mainLayout.classList.add('editor-collapsed');
    toggleEditorBtn?.classList.remove('active');
  }
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

  // Editor toggler from chat header
  const toggleEditorBtn = document.getElementById('toggleEditorBtn');
  if (toggleEditorBtn) {
    toggleEditorBtn.addEventListener('click', () => {
      const mainLayout = document.getElementById('mainLayout');
      const isCurrentlyCollapsed = mainLayout.classList.contains('editor-collapsed');
      setEditorVisibility(isCurrentlyCollapsed);
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

      // Collapses editor panel when switching to Chat mode, and opens it when switching to Agent/Auto modes (if messages exist)
      if (state.currentMode === 'chat') {
        setEditorVisibility(false);
      } else {
        if (state.messages.length > 0) {
          setEditorVisibility(true);
        }
      }

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

  // New Chat
  document.getElementById('newChatBtn')?.addEventListener('click', () => {
    startNewChat();
  });

  // History Toggle
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

  // Close History
  document.getElementById('closeHistoryBtn')?.addEventListener('click', () => {
    const historyPanel = document.getElementById('chatHistoryPanel');
    if (historyPanel) {
      historyPanel.style.display = 'none';
    }
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

  if (state.messages.length === 0) {
    setEditorVisibility(false);
  } else {
    setEditorVisibility(true);
  }
}

document.addEventListener('DOMContentLoaded', init);
