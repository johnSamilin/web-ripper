# 📱 Android Share Integration Guide

## 🎯 **Making Web Ripper Appear in Share Dialog**

Your Web Ripper app should now appear in Android's share dialog when sharing URLs or text. Here's what was configured and how to test it.

## 🔧 **What Was Fixed**

### **1. Enhanced Intent Filters**
Added multiple intent filters to catch different types of shared content:

```json
{
  "action": "android.intent.action.SEND",
  "category": ["android.intent.category.DEFAULT"],
  "data": { "mimeType": "text/plain" }
},
{
  "action": "android.intent.action.SEND", 
  "category": ["android.intent.category.DEFAULT"],
  "data": { "mimeType": "text/*" }
},
{
  "action": "android.intent.action.SEND",
  "category": ["android.intent.category.DEFAULT"], 
  "data": { "mimeType": "*/*" }
}
```

### **2. Improved URL Handling**
Enhanced the app to better handle shared URLs and text content from other apps.

## 📱 **How to Test**

### **Step 1: Rebuild the App**
Since intent filters are part of the Android manifest, you need to rebuild:

```bash
cd client/rn

# Clear everything first
npm run reset

# Rebuild for Android
npm run android
# or
expo run:android
```

### **Step 2: Test Share Integration**

#### **From Browser (Chrome, Firefox, etc.)**
1. Open any webpage
2. Tap the **Share** button
3. Look for **"Web Ripper"** in the share options
4. Tap it - the URL should open in Web Ripper

#### **From Other Apps**
1. Copy a URL to clipboard
2. Open any app that can share text (Notes, Messages, etc.)
3. Paste the URL and tap **Share**
4. **"Web Ripper"** should appear in the list

#### **Direct URL Share**
1. Long-press any link in an app
2. Select **Share**
3. Choose **"Web Ripper"**

## 🔍 **Troubleshooting**

### **App Not Appearing in Share Dialog**

#### **1. Rebuild Required**
Intent filters are compiled into the APK, so you must rebuild:
```bash
# Stop current development
# Then rebuild
npm run android
```

#### **2. Check Android Version**
Some Android versions cache share targets. Try:
- Restart your device
- Clear Android System UI cache
- Force-stop and restart the Web Ripper app

#### **3. Verify Installation**
```bash
# Check if app is properly installed
adb shell pm list packages | grep webritper

# Should show: package:com.webritper.app
```

#### **4. Test with ADB**
```bash
# Test share intent manually
adb shell am start \
  -a android.intent.action.SEND \
  -t text/plain \
  --es android.intent.extra.TEXT "https://example.com" \
  com.webritper.app
```

### **App Opens But URL Not Detected**

#### **Check Logs**
```bash
# Monitor app logs
adb logcat | grep WebRipper
```

#### **Test URL Formats**
The app should handle:
- `https://example.com`
- `http://example.com` 
- `Check out this link: https://example.com`
- Plain text with URLs

## 🎯 **Expected Behavior**

### **When Share Works Correctly**
1. **Share dialog shows "Web Ripper"** alongside other apps
2. **Tapping Web Ripper opens the app**
3. **URL appears in the extraction field**
4. **App logs show**: `📱 Received URL: https://...`

### **Supported Share Sources**
- ✅ **Chrome browser** - Share button
- ✅ **Firefox browser** - Share button  
- ✅ **Twitter/X** - Share tweet links
- ✅ **Reddit** - Share post links
- ✅ **YouTube** - Share video links
- ✅ **Any app** - Share text containing URLs
- ✅ **Clipboard** - Paste URL and share

## 🔧 **Advanced Configuration**

### **Custom URL Schemes**
The app also responds to custom schemes:
```
web-ripper://extract?url=https://example.com
```

### **Deep Link Testing**
```bash
# Test custom scheme
adb shell am start \
  -a android.intent.action.VIEW \
  -d "web-ripper://extract?url=https://example.com" \
  com.webritper.app
```

## 📊 **Share Integration Checklist**

- [ ] App rebuilt after intent filter changes
- [ ] Device restarted (if needed)
- [ ] Tested from multiple apps (Chrome, Twitter, etc.)
- [ ] URLs appear in extraction field
- [ ] App logs show received URLs
- [ ] Share dialog shows "Web Ripper" option

## 🆘 **Still Not Working?**

### **Nuclear Option - Fresh Install**
```bash
# Uninstall completely
adb uninstall com.webritper.app

# Clear Metro cache
npm run reset

# Rebuild and install
npm run android
```

### **Check Android Settings**
1. Go to **Settings > Apps > Web Ripper**
2. Check **"Open by default"** or **"Set as default"**
3. Ensure app has proper permissions

### **Alternative Testing**
If share dialog still doesn't work, test direct URL handling:
```bash
# Test if app can handle URLs directly
adb shell am start \
  -a android.intent.action.VIEW \
  -d "https://example.com" \
  com.webritper.app
```

---

**💡 Pro Tip**: After rebuilding, test sharing from Chrome first - it's the most reliable test case. If it works there, it should work everywhere!