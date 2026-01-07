# Render पर Backend Deploy करने की Step-by-Step Guide

यह guide आपको Render.com पर backend deploy करने में मदद करेगा।

---

## 📋 Prerequisites (जरूरी चीजें)

1. ✅ GitHub account (code already pushed होना चाहिए)
2. ✅ Render account - [render.com](https://render.com) (free signup)
3. ✅ MongoDB Atlas account (already setup होना चाहिए)
4. ✅ Backend code GitHub पर push होना चाहिए

---

## 🚀 Step 1: Render Account बनाएं

1. [render.com](https://render.com) पर जाएं
2. **"Get Started for Free"** पर click करें
3. GitHub के साथ **Sign Up** करें (recommended)
   - या Email से sign up करें

---

## 📦 Step 2: Render Dashboard में New Service Create करें

1. Render dashboard में **"New +"** button पर click करें
2. **"Web Service"** select करें

---

## 🔗 Step 3: GitHub Repository Connect करें

1. **"Connect account"** section में:
   - अगर GitHub already connected है, तो repository दिखेगा
   - अगर नहीं है, तो **"Configure GitHub App"** पर click करें
   - अपने GitHub account को authorize करें

2. **Repository** select करें:
   - अपना `ChatApp` repository select करें
   - **"Connect"** button पर click करें

---

## ⚙️ Step 4: Service Configuration

अब आपको service configure करना है:

### 4.1 Basic Settings

```
Name: chatapp-backend
Region: Singapore (या closest region)
Branch: main
Root Directory: Backend
```

**Important:**
- **Name**: कोई भी name दे सकते हैं (जैसे: `chatapp-backend`)
- **Region**: आपके closest region select करें (Singapore recommended)
- **Branch**: `main` (या आपकी main branch का नाम)
- **Root Directory**: **`Backend`** (यह बहुत जरूरी है!)

### 4.2 Build & Start Settings

```
Build Command: npm install
Start Command: node index.js
```

या:

```
Build Command: cd Backend && npm install
Start Command: cd Backend && node index.js
```

**Note:** अगर Root Directory `Backend` set किया है, तो `cd Backend` की जरूरत नहीं।

---

## 🔐 Step 5: Environment Variables Add करें

**Environment Variables** section में ये variables add करें:

### 5.1 Required Variables

```
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/chatapp?retryWrites=true&w=majority
```

**MongoDB URI कैसे बनाएं:**
1. MongoDB Atlas dashboard पर जाएं
2. **"Connect"** button पर click करें
3. **"Connect your application"** select करें
4. Connection string copy करें
5. `<password>` को अपने actual password से replace करें
6. Database name (`chatapp`) add करें

**Example:**
```
mongodb+srv://myuser:mypassword123@cluster0.abc123.mongodb.net/chatapp?retryWrites=true&w=majority
```

### 5.2 JWT Secret Key

```
JWT_TOKEN=your_random_secret_key_here
```

**JWT Token generate करने के लिए:**
- Terminal में run करें: `openssl rand -hex 32`
- या कोई random string use करें (minimum 32 characters)

### 5.3 Port (Optional - Render automatically set करता है)

```
PORT=10000
```

**Note:** Render automatically `PORT` environment variable provide करता है, लेकिन आप explicitly set कर सकते हैं।

### 5.4 Frontend URL (Temporary - बाद में update करेंगे)

```
FRONTEND_URL=http://localhost:3001
```

**Note:** जब frontend deploy हो जाएगा, तो इसे Vercel URL से replace करेंगे।

### 5.5 Node Environment

```
NODE_ENV=production
```

---

## 🌐 Step 6: MongoDB Atlas IP Whitelist

Render के लिए MongoDB Atlas में IP whitelist करें:

1. MongoDB Atlas dashboard पर जाएं
2. **Network Access** → **IP Access List**
3. **"Add IP Address"** button पर click करें
4. **"ALLOW ACCESS FROM ANYWHERE"** select करें
   - या manually: `0.0.0.0/0` add करें
5. **"Confirm"** button पर click करें

**Important:** यह सभी IPs को allow करता है, जो production के लिए safe है क्योंकि MongoDB username/password protect होता है।

---

## 🚀 Step 7: Deploy करें

1. सभी settings check करें:
   - ✅ Root Directory: `Backend`
   - ✅ Build Command: `npm install`
   - ✅ Start Command: `node index.js`
   - ✅ Environment Variables add किए गए हैं

2. **"Create Web Service"** button पर click करें

3. Render automatically:
   - Code clone करेगा
   - Dependencies install करेगा (`npm install`)
   - Service start करेगा (`node index.js`)

4. Deployment process देखें:
   - **"Logs"** tab में live logs देख सकते हैं
   - पहली बार deploy होने में 2-3 minutes लग सकते हैं

---

## ✅ Step 8: Deployment Success Check

### 8.1 Service Status

Deployment complete होने पर:
- Status: **"Live"** (green) होना चाहिए
- आपको एक **URL** मिलेगा: `https://chatapp-backend.onrender.com`
   (या आपके द्वारा दिया गया name के अनुसार)

### 8.2 Logs Check करें

**Logs** tab में check करें:
```
✅ Connected to MongoDB successfully
✅ Server is running on port 10000
```

अगर error आ रहा है:
- MongoDB connection error → MongoDB URI और IP whitelist check करें
- Port error → `PORT` environment variable check करें
- Build error → `package.json` और dependencies check करें

### 8.3 Backend URL Test करें

Browser में या Postman में test करें:

```
GET https://your-backend-url.onrender.com/api/user/health
```

(अगर health endpoint है तो)

या:

```
GET https://your-backend-url.onrender.com
```

---

## 🔄 Step 9: Frontend URL Update करें (बाद में)

जब frontend deploy हो जाएगा (Vercel पर), तो:

1. Render dashboard में अपने service पर जाएं
2. **"Environment"** tab पर जाएं
3. `FRONTEND_URL` variable को update करें:
   ```
   FRONTEND_URL=https://your-frontend.vercel.app
   ```
4. **"Save Changes"** button पर click करें
5. Render automatically redeploy करेगा

---

## 📝 Complete Environment Variables List

Render में add करने वाले सभी variables:

```
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/chatapp?retryWrites=true&w=majority
JWT_TOKEN=your_random_secret_key_minimum_32_characters
PORT=10000
FRONTEND_URL=https://your-frontend.vercel.app
NODE_ENV=production
```

---

## 🎯 Step 10: Auto-Deploy Setup (Optional)

Render by default **auto-deploy** enable होता है:

1. **"Settings"** tab में जाएं
2. **"Auto-Deploy"** section में:
   - ✅ **"Auto-Deploy"** enabled होना चाहिए
   - जब भी `main` branch में push होगा, automatically deploy होगा

---

## 🔧 Troubleshooting (समस्याएं और समाधान)

### Problem 1: Build Failed

**Error:** `npm install` fail हो रहा है

**Solution:**
- `package.json` में dependencies check करें
- Logs में specific error देखें
- Root Directory `Backend` set किया है या नहीं check करें

### Problem 2: MongoDB Connection Error

**Error:** `MongoDB connection error`

**Solution:**
1. MongoDB Atlas में IP `0.0.0.0/0` whitelist है या नहीं
2. `MONGODB_URI` में password सही है या नहीं
3. Connection string में special characters properly encoded हैं (`@` → `%40`)

### Problem 3: Service Crashes on Start

**Error:** Service start होते ही crash हो जाता है

**Solution:**
1. Logs check करें
2. `PORT` environment variable check करें
3. `index.js` में error handling check करें
4. `node index.js` start command सही है या नहीं

### Problem 4: CORS Errors

**Error:** Frontend से API calls fail हो रहे हैं

**Solution:**
1. `FRONTEND_URL` environment variable set है या नहीं
2. Backend `index.js` में CORS configuration check करें:
   ```javascript
   origin: process.env.FRONTEND_URL || "http://localhost:3001"
   ```

### Problem 5: Service Stops After Some Time

**Render Free Tier Limitation:**
- Free tier services 15 minutes inactivity के बाद sleep हो जाते हैं
- पहला request slow हो सकता है (wake up time)

**Solution:**
- Paid plan लें (अगर production use कर रहे हैं)
- या free tier के साथ continue करें (slow first request acceptable है)

---

## 📊 Render Dashboard Features

### Logs
- **Logs** tab: Real-time logs देख सकते हैं
- **Metrics** tab: CPU, Memory usage देख सकते हैं

### Settings
- **Environment**: Variables add/edit/delete कर सकते हैं
- **Manual Deploy**: Manually deploy trigger कर सकते हैं
- **Destroy**: Service delete कर सकते हैं

---

## ✅ Success Checklist

Deployment successful है अगर:

- [ ] Service status **"Live"** (green) है
- [ ] Logs में `✅ Connected to MongoDB successfully` दिख रहा है
- [ ] Logs में `✅ Server is running on port XXXX` दिख रहा है
- [ ] Backend URL accessible है (browser में open हो रहा है)
- [ ] Environment variables सभी add किए गए हैं
- [ ] MongoDB Atlas में IP whitelist किया गया है

---

## 🎉 Congratulations!

अगर सभी steps successful हैं, तो आपका backend अब Render पर live है! 🚀

**Backend URL:** `https://your-backend-name.onrender.com`

इस URL को save कर लें - आपको frontend deployment में इसकी जरूरत होगी!

---

## 📞 Next Steps

1. ✅ Backend deployed on Render
2. ⏭️ Frontend deploy करें (Vercel पर - `DEPLOYMENT_GUIDE.md` देखें)
3. ⏭️ `FRONTEND_URL` environment variable update करें
4. ⏭️ Final testing करें

---

## 📝 Important Notes

1. **Free Tier Limitations:**
   - Service 15 minutes inactivity के बाद sleep होता है
   - Wake up time: ~30-60 seconds
   - Monthly usage limit: 750 hours

2. **Environment Variables:**
   - Sensitive data (passwords, tokens) environment variables में रखें
   - Code में hardcode न करें

3. **HTTPS:**
   - Render automatically HTTPS provide करता है
   - No additional setup needed

4. **Custom Domain:**
   - Paid plan में custom domain add कर सकते हैं
   - Free tier में `.onrender.com` domain use करें

---

**Happy Deploying! 🚀**

