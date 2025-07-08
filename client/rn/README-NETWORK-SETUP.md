# 📱 React Native Network Setup Guide

## 🚀 **Port Configuration**

The React Native app now uses dedicated ports to avoid conflicts:

- **Metro Bundler**: Port 8081 (React Native)
- **Expo Web**: Port 19006 (when using `expo start --web`)
- **Backend Server**: Port 3001

## 📱 **Platform-Specific Backend URLs**

### **Android Emulator**
```
Backend URL: http://10.0.2.2:3001
```
- Android emulator maps `10.0.2.2` to host machine's `localhost`
- Metro runs on port 8081

### **iOS Simulator**
```
Backend URL: http://localhost:3001
```
- iOS simulator shares network with host machine
- Metro runs on port 8081

### **Physical Device**
```
Backend URL: http://YOUR_COMPUTER_IP:3001
```
- Find your IP with `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
- Example: `http://192.168.1.100:3001`

### **Expo Web (Browser)**
```
Backend URL: http://localhost:3001
Web Port: 19006
```
- Runs in browser like a regular web app
- Access at `http://localhost:19006`

## 🔧 **Development Commands**

### **Start React Native (Android/iOS)**
```bash
cd client/rn
npm run dev
# or
expo start --port 8081
```

### **Start Web Version**
```bash
cd client/rn
npm run web
# or
expo start --web --port 19006
```

### **Start Backend Server**
```bash
npm run server
# Server runs on port 3001
```

## 🐛 **Troubleshooting Port Conflicts**

### **If Metro won't start on 8081:**
```bash
# Kill any process using port 8081
npx kill-port 8081

# Or use a different port
expo start --port 8082
```

### **If Expo Web won't start on 19006:**
```bash
# Kill any process using port 19006
npx kill-port 19006

# Or use a different port
expo start --web --port 19007
```

### **Check what's running on ports:**
```bash
# Check port 8081 (Metro)
lsof -i :8081

# Check port 19006 (Expo Web)
lsof -i :19006

# Check port 3001 (Backend)
lsof -i :3001
```

## 📊 **Port Summary**

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| Backend API | 3001 | `http://localhost:3001` | Web Ripper server |
| Metro Bundler | 8081 | N/A | React Native bundler |
| Expo Web | 19006 | `http://localhost:19006` | Web preview |
| Vite Dev (main) | 5173 | `http://localhost:5173` | Main web app |

## 🔍 **Testing Connections**

### **Test Backend from Browser**
```
http://localhost:3001/api/health
```
Should return: `{"status":"OK",...}`

### **Test Expo Web**
```
http://localhost:19006
```
Should show the React Native app in browser

### **Test Metro Bundler**
```
http://localhost:8081
```
Should show Metro bundler interface

## 🚀 **Quick Start Checklist**

1. ✅ **Start backend**: `npm run server` (port 3001)
2. ✅ **Start React Native**: `cd client/rn && npm run dev` (port 8081)
3. ✅ **Open Android emulator** or connect physical device
4. ✅ **Configure backend URL** in app settings:
   - Android: `http://10.0.2.2:3001`
   - iOS: `http://localhost:3001`
   - Physical: `http://YOUR_IP:3001`
5. ✅ **Test connection** using the TEST button in settings

## 🌐 **Web Preview (Optional)**

To preview the React Native app in a browser:

```bash
cd client/rn
npm run web
```

Then open: `http://localhost:19006`

**Note**: Web preview uses the same backend URL as the main web app (`http://localhost:3001`)

### **Android Permissions**

The following permissions are automatically added to `app.json`:

```json
"permissions": [
  "android.permission.INTERNET",
  "android.permission.ACCESS_NETWORK_STATE", 
  "android.permission.ACCESS_WIFI_STATE"
],
"usesCleartextTraffic": true
```

#### **What each permission does:**

- **`INTERNET`**: Required for making HTTP requests to the backend server
- **`ACCESS_NETWORK_STATE`**: Allows checking if device has internet connection
- **`ACCESS_WIFI_STATE`**: Allows checking WiFi connection status
- **`usesCleartextTraffic`**: Allows HTTP (non-HTTPS) connections for development

## 🔧 **Advanced Configuration**

### **Custom Ports**
If you need different ports, update these files:

1. **Metro port**: `client/rn/metro.config.js`
2. **Expo web port**: `client/rn/package.json` scripts
3. **CORS origins**: `server/index.js`

### **Network Interface**
For development on local network:

```bash
# Start Expo with LAN access
expo start --lan

# Or specify host
expo start --host 192.168.1.100
```

This allows testing on physical devices connected to the same WiFi network.