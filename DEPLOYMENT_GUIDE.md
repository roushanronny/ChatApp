# Deployment Guide - ChatApp

यह guide आपको Railway (Backend) और Vercel (Frontend) पर deploy करने में मदद करेगा।

## 📋 Prerequisites

1. GitHub account (code already pushed)
2. Railway account - [railway.app](https://railway.app)
3. Vercel account - [vercel.com](https://vercel.com)
4. MongoDB Atlas account (already setup)

---

## 🚂 Step 1: Backend Deployment on Railway

### 1.1 Railway पर Project Create करें

1. [Railway.app](https://railway.app) पर जाएं और login करें
2. **"New Project"** पर click करें
3. **"Deploy from GitHub repo"** select करें
4. अपना `ChatApp` repository select करें
5. **Root Directory**: `Backend` select करें
6. **Deploy** button पर click करें

### 1.2 Environment Variables Add करें

Railway dashboard में **Variables** tab पर जाएं और ये variables add करें:

```
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_TOKEN=your_jwt_secret_key
PORT=5004
FRONTEND_URL=https://your-vercel-app.vercel.app
NODE_ENV=production
```

**Note:** 
- `MONGODB_URI`: MongoDB Atlas से connection string (IP 0.0.0.0/0 allow करें)
- `JWT_TOKEN`: कोई random secret key (जैसे: `openssl rand -hex 32`)
- `FRONTEND_URL`: Vercel deployment का URL (Step 2 के बाद add करें)

### 1.3 MongoDB Atlas IP Whitelist

1. MongoDB Atlas dashboard पर जाएं
2. **Network Access** → **IP Access List**
3. **Add IP Address** → **0.0.0.0/0** add करें (Railway dynamic IPs के लिए)

### 1.4 Deploy

Railway automatically deploy start कर देगा। Deployment complete होने पर आपको एक URL मिलेगा:
- Example: `https://your-app.up.railway.app`

**इस URL को save कर लें** - यह आपका backend URL है!

---

## ⚡ Step 2: Frontend Deployment on Vercel

### 2.1 Vercel पर Project Create करें

1. [Vercel.com](https://vercel.com) पर जाएं और login करें
2. **"Add New..."** → **"Project"** click करें
3. अपना `ChatApp` repository import करें
4. **Framework Preset**: `Vite` select करें
5. **Root Directory**: `Frontend` set करें
6. **Build Command**: `npm run build`
7. **Output Directory**: `dist`

### 2.2 Environment Variables Add करें

Vercel dashboard में **Environment Variables** section में add करें:

```
VITE_API_URL=https://your-railway-app.up.railway.app
VITE_SOCKET_URL=https://your-railway-app.up.railway.app
```

**Important:** 
- Railway का backend URL यहाँ add करें (Step 1.4 में मिला था)
- **HTTP नहीं, HTTPS URL use करें**
- URL के अंत में `/` (slash) नहीं होना चाहिए
- Example: `https://chat-app-production.up.railway.app` ✅
- Wrong: `http://chat-app-production.up.railway.app` ❌
- Wrong: `https://chat-app-production.up.railway.app/` ❌

### 2.3 Deploy

1. **Deploy** button पर click करें
2. Deployment complete होने पर आपको frontend URL मिलेगा:
   - Example: `https://your-app.vercel.app`

### 2.4 Railway में Frontend URL Update करें

1. Railway dashboard पर वापस जाएं
2. **Variables** tab में `FRONTEND_URL` को update करें:
   ```
   FRONTEND_URL=https://your-app.vercel.app
   ```
3. Railway automatically redeploy होगा

---

## ✅ Step 3: Final Testing

1. Frontend URL खोलें: `https://your-app.vercel.app`
2. Signup/Login करें
3. Check करें कि messages send/receive हो रहे हैं
4. Socket.io connections check करें (online status, typing indicators)

---

## 🔧 Troubleshooting

### Backend Issues

**Problem:** Railway deployment fail हो रहा है
- Check: `package.json` में `"start": "node index.js"` है
- Check: Environment variables सही से add हुए हैं

**Problem:** MongoDB connection error
- Check: MongoDB Atlas में IP `0.0.0.0/0` whitelist है
- Check: Connection string में password सही है

### Frontend Issues

**Problem:** API calls fail हो रहे हैं
- Check: `VITE_API_URL` Vercel में सही add है (HTTPS, no trailing slash)
- Check: Railway backend URL सही है और working है
- Check: Browser console में CORS errors - Railway CORS में frontend URL allow है
- Note: Development में Vite proxy use होता है, production में full backend URL चाहिए

**Problem:** Socket.io connection fail
- Check: `VITE_SOCKET_URL` environment variable set है
- Check: Backend CORS में frontend URL allow है

---

## 📝 Important Notes

1. **Environment Variables हमेशा production में सही रखें**
2. **MongoDB Atlas में production database use करें**
3. **HTTPS URLs हमेशा use करें (HTTP नहीं)**
4. **Railway और Vercel दोनों free tier पर available हैं**

---

## 🎉 Success!

अगर सब कुछ सही से setup हुआ है, तो आपका ChatApp अब live है! 🚀

**Backend URL:** `https://your-app.up.railway.app`  
**Frontend URL:** `https://your-app.vercel.app`

---

## 📞 Support

अगर कोई problem आए तो:
1. Railway logs check करें
2. Vercel logs check करें
3. Browser console में errors check करें

