# 📱 React Native Permissions Guide

## 🔐 Required Permissions

The Web Ripper React Native app requires the following permissions to function properly:

### **Android Permissions**

The following permissions are automatically added to `app.json`:

```json
"permissions": [
  "android.permission.INTERNET",
  "android.permission.ACCESS_NETWORK_STATE", 
  "android.permission.ACCESS_WIFI_STATE"
]
```

#### **What each permission does:**

- **`INTERNET`**: Required for making HTTP requests to the backend server
- **`ACCESS_NETWORK_STATE`**: Allows checking if device has internet connection
- **`ACCESS_WIFI_STATE`**: Allows checking WiFi connection status

### **iOS Permissions**

iOS automatically grants internet access to apps, but you may need to configure:

#### **App Transport Security (ATS)**

If connecting to HTTP (non-HTTPS) servers in development:

```xml
<!-- This is handled automatically by Expo for development -->
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <true/>
</dict>
```

## 🚀 **Setup Instructions**

### **For Development (Expo)**

1. **Permissions are automatically handled** by Expo during development
2. **No manual setup required** for basic internet access
3. **Rebuild the app** if you added permissions manually:
   ```bash
   cd client/rn
   npx expo start --clear
   ```

### **For Production Builds**

1. **Android**: Permissions in `app.json` are automatically included in APK
2. **iOS**: Submit to App Store with network usage description

## 🔍 **Troubleshooting Permission Issues**

### **"Network request failed" Error**

This usually means:

1. **Missing internet permission** (now fixed)
2. **Wrong backend URL** (see Network Setup Guide)
3. **Server not running**
4. **Firewall blocking connection**

### **Check if permissions are applied:**

#### **Android (via ADB)**
```bash
# Check if app has internet permission
adb shell dumpsys package com.webritper.app | grep permission
```

#### **iOS Simulator**
- Permissions are automatically granted in simulator
- Check Console app for network-related errors

### **Debug Network Issues**

1. **Enable network logging**:
   ```javascript
   // Already added to the app - check console logs
   console.log('🔍 Testing connection to:', backendUrl);
   ```

2. **Check device logs**:
   - **Android**: `adb logcat | grep WebRipper`
   - **iOS**: Xcode Console or React Native debugger

3. **Test with simple request**:
   ```javascript
   // Test basic connectivity
   fetch('https://httpbin.org/get')
     .then(response => response.json())
     .then(data => console.log('✅ Internet works:', data))
     .catch(error => console.error('❌ No internet:', error));
   ```

## 📋 **Permission Checklist**

- ✅ **Internet permission** added to `app.json`
- ✅ **Network state permission** added for connection checking
- ✅ **WiFi state permission** added for network diagnostics
- ✅ **Console logging** added for debugging
- ✅ **Error handling** improved with detailed logs

## 🔧 **Advanced Configuration**

### **Custom Network Security (Android)**

For production apps connecting to specific domains:

```xml
<!-- Add to android/app/src/main/res/xml/network_security_config.xml -->
<network-security-config>
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">your-backend-domain.com</domain>
  </domain-config>
</network-security-config>
```

### **Background Network Access**

If you need background sync (future feature):

```json
// Add to app.json android permissions
"android.permission.ACCESS_BACKGROUND_LOCATION"
```

## 🆘 **Still Having Issues?**

### **Quick Fixes**

1. **Restart Metro bundler**:
   ```bash
   npx expo start --clear
   ```

2. **Rebuild the app**:
   ```bash
   # For development
   npx expo run:android
   npx expo run:ios
   ```

3. **Check Expo logs**:
   ```bash
   npx expo logs --platform android
   npx expo logs --platform ios
   ```

### **Common Solutions**

| Issue | Solution |
|-------|----------|
| "Network request failed" | Check backend URL and server status |
| "Permission denied" | Restart app after adding permissions |
| "Connection refused" | Verify server is running on correct port |
| "Timeout" | Check firewall and network connectivity |

### **Test Network Step by Step**

1. **Test internet connectivity**:
   ```bash
   # From device browser, visit:
   https://httpbin.org/get
   ```

2. **Test server accessibility**:
   ```bash
   # From device browser, visit:
   http://YOUR_BACKEND_URL/api/health
   ```

3. **Test app connectivity**:
   - Use the "TEST" button in app settings
   - Check console logs for detailed error messages

## 📱 **Platform-Specific Notes**

### **Android**
- Permissions are granted at install time
- No user prompts for basic internet access
- Network security config may be needed for HTTP in production

### **iOS**
- Internet access is automatic
- ATS may block HTTP connections
- User privacy descriptions required for App Store

### **Expo Web**
- Runs in browser, no special permissions needed
- Same-origin policy applies
- CORS must be configured on server (already done)

---

**The app now has proper internet permissions and enhanced logging for debugging network issues!**