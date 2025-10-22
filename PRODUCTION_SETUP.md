# 🚀 Production Environment Setup

## 📋 Overview

This guide will help you configure the frontend to connect to your production backend at `https://opencoderbackend.onrender.com/`

---

## 📝 Step 1: Create Environment Files

### 📌 Important: Port Numbers

- **Development** (`npm run dev`): Runs on port **5173**
- **Production Preview** (`npm run preview`): Runs on port **4173**
- **Actual Production**: Uses your real domain

### For Local Development

Create a file named `.env` in the root directory:

```bash
# .env (Development environment)
VITE_API_BASE_URL=http://localhost:8000
VITE_AUTH_CALLBACK=http://localhost:5173/auth/callback
```

### For Production Deployment

Create a file named `.env.production` in the root directory:

```bash
# .env.production (Real production deployment)
VITE_API_BASE_URL=https://opencoderbackend.onrender.com
VITE_AUTH_CALLBACK=https://YOUR_PRODUCTION_DOMAIN.com/auth/callback
```

**Example** (if your frontend is deployed at `https://yourapp.vercel.app`):
```bash
VITE_API_BASE_URL=https://opencoderbackend.onrender.com
VITE_AUTH_CALLBACK=https://yourapp.vercel.app/auth/callback
```

### For Local Production Testing (Optional)

Create a file named `.env.production.local` in the root directory:

```bash
# .env.production.local (Test production build locally)
VITE_API_BASE_URL=https://opencoderbackend.onrender.com
VITE_AUTH_CALLBACK=http://localhost:4173/auth/callback
```

⚠️ **Note**: `.env.production.local` has higher priority than `.env.production`, so it will be used when running `npm run preview`.

---

## 🔧 Step 2: Build for Production

Run the following command to build your frontend:

```bash
npm run build
```

This will:
- Read variables from `.env.production`
- Bundle your application
- Create optimized files in the `dist/` folder

---

## 🌐 Step 3: Deploy

### Option A: Deploy to Vercel

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   vercel --prod
   ```

3. Set environment variables in Vercel Dashboard:
   - Go to: Project Settings → Environment Variables
   - Add:
     - `VITE_API_BASE_URL` = `https://opencoderbackend.onrender.com`
     - `VITE_AUTH_CALLBACK` = `https://YOUR_VERCEL_DOMAIN.vercel.app/auth/callback`

### Option B: Deploy to Netlify

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Deploy:
   ```bash
   netlify deploy --prod
   ```

3. Set environment variables in Netlify Dashboard:
   - Go to: Site Settings → Environment Variables
   - Add the same variables as above

### Option C: Deploy to Any Static Host

1. Build the project:
   ```bash
   npm run build
   ```

2. Upload the `dist/` folder to your hosting provider (e.g., AWS S3, Cloudflare Pages, GitHub Pages)

---

## ⚙️ Step 4: Update Backend Configuration

Your backend at `https://opencoderbackend.onrender.com/` needs to:

### 1. Allow CORS from your frontend domain

```python
# In your FastAPI backend
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Development
        "https://yourapp.vercel.app",  # Production - UPDATE THIS
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 2. Update Google OAuth Redirect URIs

In your [Google Cloud Console](https://console.cloud.google.com/):

1. Go to: APIs & Services → Credentials
2. Select your OAuth 2.0 Client ID
3. Add your production frontend URL to **Authorized redirect URIs**:
   - Development: `http://localhost:5173/auth/callback`
   - Production: `https://yourapp.vercel.app/auth/callback`

---

## 🧪 Step 5: Test Production Build Locally

Before deploying, test your production build locally:

```bash
# Build with production environment
npm run build

# Preview the build
npm run preview
```

Then open `http://localhost:4173` and test:
- ✅ Login with Google
- ✅ Role selection
- ✅ Manager dashboard
- ✅ Coder interface
- ✅ All API calls

---

## 🔍 Troubleshooting

### Issue 1: CORS Errors

**Symptom**: Console shows "No 'Access-Control-Allow-Origin' header"

**Solution**:
- Ensure backend CORS middleware includes your frontend domain
- Check that backend is deployed and running
- Verify the API URL is correct in `.env.production`

### Issue 2: Google OAuth Fails

**Symptom**: "redirect_uri_mismatch" error

**Solution**:
- Add your production callback URL to Google Cloud Console
- Update `VITE_AUTH_CALLBACK` to match exactly
- Format: `https://yourdomain.com/auth/callback` (no trailing slash)

### Issue 3: API Calls Return 404

**Symptom**: API endpoints not found

**Solution**:
- Verify backend is deployed: visit `https://opencoderbackend.onrender.com/`
- Should return: `{"message":"MongoDB Annotation Platform API","version":"1.0.0"}`
- Check API endpoints at: `https://opencoderbackend.onrender.com/docs`

### Issue 4: Environment Variables Not Working

**Symptom**: Application still connects to localhost

**Solution**:
- Ensure `.env.production` is in the root directory (same level as `package.json`)
- Rebuild the application: `npm run build`
- Environment variables are embedded at build time, not runtime
- Clear browser cache after rebuilding

---

## 📋 Quick Checklist

Before going live, verify:

- [ ] `.env.production` created with correct API URL
- [ ] Backend CORS configured for your frontend domain
- [ ] Google OAuth redirect URI includes production callback URL
- [ ] Production build tested locally (`npm run preview`)
- [ ] Backend API is accessible and returns correct response
- [ ] SSL certificate valid (HTTPS) for both frontend and backend

---

## 🎯 Environment Variables Reference

| Variable | Development | Production |
|----------|-------------|------------|
| `VITE_API_BASE_URL` | `http://localhost:8000` | `https://opencoderbackend.onrender.com` |
| `VITE_AUTH_CALLBACK` | `http://localhost:5173/auth/callback` | `https://YOUR_DOMAIN/auth/callback` |

**Note**: All environment variables must be prefixed with `VITE_` to be accessible in the frontend code.

---

## 📚 Additional Resources

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Vercel Deployment](https://vercel.com/docs)
- [Netlify Deployment](https://docs.netlify.com/)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)

---

**Last Updated**: 2025-10-22  
**Backend**: https://opencoderbackend.onrender.com/

