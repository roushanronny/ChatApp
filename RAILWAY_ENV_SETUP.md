# Railway Environment Variables Setup

## ⚠️ Important: Environment Variables Add करें

Railway dashboard में ये environment variables **जरूर** add करें:

### Railway Dashboard में जाना है:
1. Railway.app पर login करें
2. अपने project (`chatapp-production`) को open करें
3. **Variables** tab पर click करें
4. **"New Variable"** button पर click करें
5. नीचे दिए गए variables add करें:

---

## 📝 Required Environment Variables:

### 1. MONGODB_URI
```
Name: MONGODB_URI
Value: mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/chatapp?retryWrites=true&w=majority
```
**कहाँ से मिलेगा:**
- MongoDB Atlas dashboard पर जाएं
- **Connect** → **Connect your application** → Connection string copy करें
- `username` और `password` replace करें

### 2. JWT_TOKEN
```
Name: JWT_TOKEN
Value: your-random-secret-key-here
```
**कैसे बनाएं:**
- कोई random string use करें (जैसे: `mySuperSecretJWTKey123!@#`)
- या terminal में run करें: `openssl rand -hex 32`

### 3. PORT (Optional)
```
Name: PORT
Value: 8080
```
**Note:** Railway automatically PORT provide करता है, लेकिन manually भी set कर सकते हैं

### 4. FRONTEND_URL (Vercel deployment के बाद)
```
Name: FRONTEND_URL
Value: https://your-app.vercel.app
```
**Note:** Vercel deployment complete होने के बाद यह add करें

### 5. NODE_ENV (Optional)
```
Name: NODE_ENV
Value: production
```

---

## ✅ After Adding Variables:

1. **Save** करें
2. Railway automatically **redeploy** start कर देगा
3. Deployment logs check करें
4. MongoDB connection successful message दिखना चाहिए

---

## 🔍 How to Check:

Deployment logs में देखें:
```
✅ Connected to MongoDB  ← यह message दिखना चाहिए
✅ Server is Running on port 8080
```

अगर अभी भी error आए:
- Check करें: MongoDB Atlas में IP `0.0.0.0/0` whitelist है
- Check करें: MongoDB connection string सही है
- Check करें: Username और password सही हैं

---

## 📋 Quick Checklist:

- [ ] MONGODB_URI added
- [ ] JWT_TOKEN added
- [ ] PORT added (optional)
- [ ] FRONTEND_URL added (after Vercel deployment)
- [ ] Deployment logs में "Connected to MongoDB" दिख रहा है
- [ ] Server successfully running है

