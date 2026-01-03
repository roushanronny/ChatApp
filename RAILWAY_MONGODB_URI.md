# Railway MongoDB URI Configuration

## ⚠️ Important: Password में @ character है

आपके MongoDB password में `@` character है (`Ronny@0112`), इसलिए इसे **URL encode** करना होगा।

## ✅ Correct Connection String:

Railway में `MONGODB_URI` variable में यह value add करें:

```
mongodb+srv://roushanydv2003_db_user:Ronny%400112@cluster0.jik2c4j.mongodb.net/chatapp?retryWrites=true&w=majority
```

### Changes Made:
1. `@` को `%40` में convert किया (URL encoding)
2. Database name `chatapp` add किया
3. Connection options add किए

---

## 📋 Railway Variables Setup:

### 1. MONGODB_URI
```
Name: MONGODB_URI
Value: mongodb+srv://roushanydv2003_db_user:Ronny%400112@cluster0.jik2c4j.mongodb.net/chatapp?retryWrites=true&w=majority
```

### 2. JWT_TOKEN
```
Name: JWT_TOKEN
Value: your-random-secret-key-here
```
Example: `ChatAppJWTSecretKey2024!@#$%^&*()`

### 3. FRONTEND_URL (अभी के लिए)
```
Name: FRONTEND_URL
Value: http://localhost:3001
```
Note: Vercel deployment के बाद update करेंगे

---

## 🚀 Steps:

1. Railway dashboard → Variables tab
2. `MONGODB_URI` variable add करें (value ऊपर दिया है)
3. `JWT_TOKEN` variable add करें
4. `FRONTEND_URL` variable add करें
5. Save करें - Railway auto-redeploy होगा

---

## ✅ Verification:

Deployment logs में देखें:
```
✅ Connected to MongoDB successfully
✅ Server is Running on port 8080
```

---

## 🔐 Security Note:

- Password में special characters (@, #, $, etc.) को URL encode करें:
  - `@` → `%40`
  - `#` → `%23`
  - `$` → `%24`
  - `%` → `%25`
  - Space → `%20`

