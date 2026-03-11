# 📄 PDF Maker — Secret Vault App

A professional-looking PDF tool website that secretly works as a private gallery vault.

## 🚀 Quick Setup

### Prerequisites
- Node.js v18+
- MongoDB (local or MongoDB Atlas)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
Edit `.env`:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/pdfmaker
SESSION_SECRET=change_this_to_random_string_xyz
NODE_ENV=development
```

### 3. Start MongoDB (if local)
```bash
mongod
```

### 4. Run the App
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

### 5. Open Browser
```
http://localhost:3000
```

---

## 📱 Android WebApp (APK)

Since you mentioned making an Android app later, follow these steps:

### Option A — Android Studio (WebView App)
1. Open Android Studio → New Project → Empty Activity
2. In `AndroidManifest.xml` add internet permission:
   ```xml
   <uses-permission android:name="android.permission.INTERNET"/>
   ```
3. Replace `MainActivity.java` content:
   ```java
   import android.webkit.WebView;
   import android.webkit.WebViewClient;
   import android.webkit.WebSettings;
   
   WebView webView = findViewById(R.id.webview);
   WebSettings settings = webView.getSettings();
   settings.setJavaScriptEnabled(true);
   settings.setDomStorageEnabled(true);
   settings.setMediaPlaybackRequiresUserGesture(false);
   webView.setWebViewClient(new WebViewClient());
   webView.loadUrl("https://YOUR_DEPLOYED_URL.com");
   ```
4. Add to `activity_main.xml`:
   ```xml
   <WebView android:id="@+id/webview" 
     android:layout_width="match_parent"
     android:layout_height="match_parent"/>
   ```

### Option B — PWA (Recommended, Easier)
Add to `<head>` in `index.html`:
```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#0a0a0f">
```
Create `public/manifest.json`:
```json
{
  "name": "PDF Maker",
  "short_name": "PDF Maker",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0f",
  "theme_color": "#6c63ff",
  "icons": [{ "src": "/icon.png", "sizes": "512x512", "type": "image/png" }]
}
```
Users can then "Add to Home Screen" from Chrome — it acts like a native app!

---

## 🌐 Deploy to Internet (Free)

### Railway.app (Recommended)
1. Push code to GitHub
2. Go to railway.app → New Project → GitHub repo
3. Add environment variables in Railway dashboard
4. For MongoDB: Add MongoDB plugin or use MongoDB Atlas free tier

### MongoDB Atlas (Free Cloud DB)
1. Create account at mongodb.com/atlas
2. Create free M0 cluster
3. Get connection string → paste in MONGODB_URI

---

## 🔒 Security Features
- Passwords hashed with bcrypt (12 rounds)
- Files stored in private server folders
- Session-based auth with MongoDB store
- Files only accessible by owner
- HttpOnly cookies

## 📁 Project Structure
```
pdf-maker/
├── server.js          # Main server
├── models/
│   ├── User.js        # User model
│   └── File.js        # File model
├── routes/
│   ├── auth.js        # Register/Login/Logout
│   ├── files.js       # Upload/View/Delete files
│   └── profile.js     # Profile management
├── middleware/
│   └── auth.js        # Auth guard
└── public/
    ├── index.html     # Full frontend (SPA)
    └── uploads/       # Private file storage
        ├── images/
        ├── videos/
        ├── songs/
        ├── files/
        └── profiles/
```
