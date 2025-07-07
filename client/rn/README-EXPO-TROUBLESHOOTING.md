# 🚨 Expo Troubleshooting Guide

## 🔧 **"Failed to download remote update" Error**

This error is common when starting with Expo. Here are the solutions:

### **🎯 Quick Fixes (Try in Order)**

#### **1. Clear Everything and Restart**
```bash
cd client/rn

# Clear all caches
npm run reset
# or
expo start --clear --reset-cache

# If that doesn't work, clear node modules
rm -rf node_modules
npm install
```

#### **2. Use Local Development Mode**
```bash
# Try local-only mode first
npm run dev-local

# If that works, then try LAN mode
npm run dev-lan
```

#### **3. Check Network Connection**
```bash
# Make sure your phone and computer are on the same WiFi
# Check your computer's IP address:

# Windows
ipconfig

# macOS/Linux
ifconfig
# or
hostname -I
```

#### **4. Use Tunnel Mode (Slower but More Reliable)**
```bash
npm run dev-tunnel
```

### **📱 Device-Specific Solutions**

#### **Android Device/Emulator**
```bash
# Start with Android-specific command
npm run android

# Or use ADB to check connection
adb devices
```

#### **iOS Device/Simulator**
```bash
# Start with iOS-specific command
npm run ios
```

### **🌐 Network Issues**

#### **Corporate/Restricted Networks**
If you're on a corporate network or have firewall restrictions:

```bash
# Use tunnel mode (bypasses local network issues)
npm run dev-tunnel
```

#### **WiFi Issues**
```bash
# Try connecting via USB (Android)
adb connect

# Or use your computer's IP directly
# Find your IP and manually enter in Expo Go:
# exp://YOUR_IP_ADDRESS:8081
```

### **🔍 Debugging Steps**

#### **1. Check Expo Doctor**
```bash
npm run doctor
```

#### **2. Verify Metro is Running**
```bash
# Should see Metro bundler at:
# http://localhost:8081
curl http://localhost:8081
```

#### **3. Check Expo Go App**
- Make sure Expo Go is updated to latest version
- Clear Expo Go app cache/data
- Restart Expo Go app

#### **4. Verify Project Configuration**
```bash
# Check if app.json is valid
cat app.json | jq .

# Verify package.json scripts
npm run --silent
```

### **🆘 Last Resort Solutions**

#### **1. Recreate Expo Project**
```bash
# Backup your src folder first!
cp -r src ../src-backup

# Create fresh Expo project
npx create-expo-app --template blank-typescript web-ripper-fresh
cd web-ripper-fresh

# Copy your source code back
cp -r ../src-backup/* src/
```

#### **2. Use Development Build**
```bash
# Create development build (more stable)
npx expo install expo-dev-client
npm run build:android-preview
```

#### **3. Web Preview (Fallback)**
```bash
# If mobile isn't working, use web preview
npm run web
# Opens at http://localhost:19006
```

### **📊 Common Error Messages & Solutions**

| Error | Solution |
|-------|----------|
| "Failed to download remote update" | Clear cache, use tunnel mode |
| "Network request failed" | Check WiFi, use same network |
| "Metro bundler not found" | Restart Metro: `npm run reset` |
| "Unable to resolve module" | Clear node_modules, reinstall |
| "Expo Go crashed" | Update Expo Go app, restart device |

### **✅ Success Checklist**

- [ ] Computer and phone on same WiFi network
- [ ] Expo Go app is latest version
- [ ] Metro bundler running on port 8081
- [ ] No firewall blocking port 8081
- [ ] Cleared all caches
- [ ] Project builds without errors

### **🔧 Development Commands Reference**

```bash
# Basic development
npm run dev              # Standard development mode
npm run dev-local        # Local-only (no network)
npm run dev-lan          # LAN mode (local network)
npm run dev-tunnel       # Tunnel mode (internet-based)

# Platform-specific
npm run android          # Android emulator/device
npm run ios              # iOS simulator/device
npm run web              # Web browser preview

# Debugging
npm run reset            # Clear all caches
npm run doctor           # Check configuration
```

### **📱 Manual Connection**

If QR code doesn't work, manually enter in Expo Go:

```
exp://YOUR_COMPUTER_IP:8081
```

Find your IP:
- **Windows**: `ipconfig` → look for IPv4 Address
- **macOS**: `ifconfig en0` → look for inet
- **Linux**: `hostname -I`

Example: `exp://192.168.1.100:8081`

---

**💡 Pro Tip**: Start with `npm run dev-tunnel` if you're having network issues. It's slower but more reliable for initial setup.