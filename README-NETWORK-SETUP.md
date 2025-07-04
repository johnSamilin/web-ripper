# 🌐 Network Setup Guide for Web Ripper

## 🔧 Common Network Issues & Solutions

### **Issue: "Network request failed" when connecting React Native app to server**

This happens because mobile apps/emulators can't connect to `localhost` the same way web browsers can.

## 📱 **Platform-Specific Solutions**

### **1. Android Emulator**
- **Use**: `http://10.0.2.2:3001`
- **Why**: Android emulator maps `10.0.2.2` to host machine's `localhost`

### **2. iOS Simulator**
- **Use**: `http://localhost:3001` or `http://127.0.0.1:3001`
- **Why**: iOS simulator shares network with host machine

### **3. Physical Device (Android/iOS)**
- **Use**: `http://YOUR_COMPUTER_IP:3001`
- **Find your IP**:
  ```bash
  # Windows
  ipconfig
  
  # macOS/Linux
  ifconfig
  
  # Or use this command
  hostname -I
  ```
- **Example**: `http://192.168.1.100:3001`

### **4. Expo Web**
- **Use**: `http://localhost:3001`
- **Why**: Runs in browser, same as regular web app

## 🚀 **Quick Setup Steps**

### **Step 1: Start the server on correct port**
```bash
# Edit .env file
PORT=3001  # NOT 80 for development

# Start server
npm run server
```

### **Step 2: Find your network setup**
```bash
# Check what's running
netstat -an | grep 3001

# Test server is working
curl http://localhost:3001/api/health
```

### **Step 3: Configure React Native app**
1. Open the app
2. Go to Settings
3. Set Backend URL based on your platform:
   - **Android Emulator**: `http://10.0.2.2:3001`
   - **iOS Simulator**: `http://localhost:3001`
   - **Physical Device**: `http://YOUR_IP:3001`

### **Step 4: Test connection**
- Tap "TEST" button in settings
- Should show "Connection Successful"

## 🔍 **Debugging Network Issues**

### **Check if server is running**
```bash
curl http://localhost:3001/api/health
# Should return: {"status":"OK","timestamp":"..."}
```

### **Check if port is accessible**
```bash
# Test from another terminal
telnet localhost 3001
```

### **Common Error Messages**

| Error | Cause | Solution |
|-------|-------|----------|
| "Network request failed" | Wrong URL/IP | Use platform-specific URL |
| "Connection refused" | Server not running | Start server with `npm run server` |
| "Timeout" | Firewall/network issue | Check firewall, use correct IP |
| "CORS error" | Cross-origin blocked | Server already configured for this |

## 🛠️ **Development vs Production**

### **Development (Local)**
- **Server Port**: `3001`
- **Android**: `http://10.0.2.2:3001`
- **iOS**: `http://localhost:3001`
- **Physical**: `http://YOUR_IP:3001`

### **Production (Deployed)**
- **Server**: Your deployed URL (e.g., `https://your-app.herokuapp.com`)
- **All Platforms**: Same URL works for all

## 🔧 **Advanced Troubleshooting**

### **1. Check React Native Metro logs**
```bash
# In the React Native project
npx expo start
# Look for network-related errors in the console
```

### **2. Test with curl from different locations**
```bash
# From host machine
curl http://localhost:3001/api/health

# From inside Docker (if using)
curl http://host.docker.internal:3001/api/health
```

### **3. Verify CORS configuration**
The server is already configured to accept requests from:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:8081` (Expo dev server)
- `http://localhost:19000` (Expo classic)
- `http://localhost:19006` (Expo web)

### **4. Network Security**
If using a physical device:
- Ensure both device and computer are on same WiFi network
- Check if computer firewall is blocking port 3001
- Some corporate networks block custom ports

## 📋 **Quick Reference**

| Platform | Backend URL |
|----------|-------------|
| Android Emulator | `http://10.0.2.2:3001` |
| iOS Simulator | `http://localhost:3001` |
| Physical Device | `http://YOUR_COMPUTER_IP:3001` |
| Expo Web | `http://localhost:3001` |
| Production | `https://your-deployed-url.com` |

## 🆘 **Still Having Issues?**

1. **Restart everything**:
   ```bash
   # Stop server (Ctrl+C)
   # Restart server
   npm run server
   
   # Restart React Native
   npx expo start --clear
   ```

2. **Check logs**:
   - Server logs in terminal
   - React Native logs in Expo dev tools
   - Device logs in browser dev tools (for Expo web)

3. **Test step by step**:
   - ✅ Server responds to `curl http://localhost:3001/api/health`
   - ✅ Correct URL format for your platform
   - ✅ No firewall blocking the connection
   - ✅ Device and computer on same network (for physical devices)