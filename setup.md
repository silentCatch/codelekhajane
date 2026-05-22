# ⚡ CodeAgent — Deployment & Hosting Guide

This guide provides step-by-step instructions to host and deploy the **CodeAgent** application.

---

## 🚀 Option 1: Deploying to Render (Recommended & Free)

Render is a modern cloud platform that supports both static sites and Node.js backend web services. Because CodeAgent uses a Node Express backend to proxy the Groq API (preventing API Key leaks on the frontend), it must be deployed as a **Web Service** on Render.

### Easiest Deployment (Via GitHub Connection)
1. **Create a GitHub Repository**:
   * Create a free private or public repository on [GitHub](https://github.com).
   * Initialize git in your local project folder and push the code:
     ```bash
     git init
     git add .
     git commit -m "Initial commit"
     git branch -M main
     git remote add origin <YOUR_GITHUB_REPO_URL>
     git push -u origin main
     ```
2. **Connect to Render**:
   * Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** → **Web Service**.
   * Connect your GitHub account and select your `code-agent` repository.
3. **Configure Service Settings**:
   * **Name**: `code-agent`
   * **Language**: `Node`
   * **Build Command**: `npm install && npm run build`
   * **Start Command**: `npm start`
   * **Instance Type**: `Free`
4. **Configure Environment Variables**:
   * Click **Advanced** and add these variables:
     * `GROQ_API_KEY`: `<YOUR_GROQ_API_KEY>` (your Groq API developer key)
     * `NODE_ENV`: `production`
5. Click **Deploy Web Service**. Render will build and host your app on a free `https://code-agent.onrender.com` URL!

---

## 📦 Option 2: Deploying Without GitHub (Direct Local Upload)

If you explicitly want to host CodeAgent **without using GitHub**, Render has a CLI/API deploy method, but it is much easier to use alternative modern hosting platforms that specialize in **direct CLI directory uploads** (no Git repository required).

Here are the best three ways to deploy CodeAgent directly from your computer:

### Method A: Deploy to Railway (Easiest & Best Direct CLI Upload)
Railway is extremely fast and allows you to deploy any Node/Express project directly from your local terminal with a single command.

1. **Install the Railway CLI**:
   * On Windows (PowerShell), run:
     ```powershell
     npm i -g @railway/cli
     ```
2. **Login to Railway**:
   * Run the login command and authenticate in your browser:
     ```bash
     railway login
     ```
3. **Initialize and Deploy**:
   * Run the following commands in your project folder:
     ```bash
     railway init       # Create a new project on Railway
     railway up         # Upload files and deploy instantly!
     ```
4. **Add Environment Variables**:
   * In the Railway dashboard under your new service, go to **Variables** and add:
     * `GROQ_API_KEY` = `YOUR_API_KEY`
5. **Get URL**:
   * In the service settings, click **Generate Domain** to get a public URL!

---

### Method B: Deploy to Render via Render API (Without Git Sync)
Render allows you to trigger zip/tarball deployments directly via their REST API if you do not want to link a GitHub account.

1. **Create a Placeholders Repo/Web Service**:
   * Render requires a shell Web Service to exist first.
2. **Obtain Render API Key**:
   * Go to **Account Settings** on Render and generate an **API Key**.
3. **Deploy Tarball via Curl**:
   * Archive your project folder (excluding `node_modules` and `.env`):
     ```bash
     tar -czf project.tar.gz --exclude=node_modules --exclude=.env .
     ```
   * Push the tarball to Render's Deploy API endpoint:
     ```bash
     curl -X POST https://api.render.com/v1/services/<YOUR_SERVICE_ID>/deploys \
       -H "Authorization: Bearer <YOUR_RENDER_API_KEY>" \
       -H "Content-Type: application/json" \
       -d '{"imageUrl": "", "clearCache": "clear"}'
     ```

---

## 🛠️ Local Production Build & Run
To test the production build locally before hosting:
1. Build the frontend assets:
   ```bash
   npm run build
   ```
   *This compiles the HTML, CSS, and JS into a clean optimized `dist` folder.*
2. Start the production backend server:
   ```bash
   npm start
   ```
   *The backend Express server automatically serves the compiled frontend from the `dist` folder on http://localhost:3000.*
