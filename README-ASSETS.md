# React Native Assets Guide

## Generated Assets

This project includes automatically generated assets for your Web Ripper React Native app:

### Main Assets
- `icon.png` - Main app icon (1024x1024)
- `adaptive-icon.png` - Android adaptive icon foreground
- `splash.png` - Splash screen
- `favicon.png` - Web favicon

### Asset Specifications

#### App Icon
- **Size**: 1024x1024px
- **Format**: PNG with transparency
- **Design**: Brutal design with black border, red accent, skull icon
- **Usage**: iOS App Store, Android Play Store

#### Adaptive Icon (Android)
- **Size**: 1024x1024px
- **Format**: PNG with transparency
- **Design**: Centered content for Android's adaptive icon system
- **Safe Area**: Content within 264x264px center area

#### Splash Screen
- **Size**: 1284x2778px (iPhone 14 Pro Max)
- **Format**: PNG
- **Design**: Centered logo with app title
- **Background**: Light gray (#f3f4f6)

### Platform Requirements

#### iOS
- App icon is automatically resized by Expo
- No additional sizes needed
- Supports iOS 13+ with dark mode compatibility

#### Android
- Adaptive icon automatically generates all required sizes
- Supports Android 8.0+ adaptive icons
- Fallback icon for older Android versions

### Customization

To customize the assets:

1. **Colors**: Edit the SVG files and regenerate
2. **Design**: Modify the `generate-assets.js` script
3. **Sizes**: Add new sizes to the `iconSizes` object

### Asset Generation Script

Run the asset generator:
```bash
node generate-assets.js
```

This creates:
- SVG source files
- Multiple icon sizes for different platforms
- Optimized assets for production

### Design System

The assets follow the app's brutal design system:
- **Primary Color**: Black (#000000)
- **Accent Color**: Red (#ef4444)
- **Secondary**: Yellow (#facc15), Green (#22c55e), Blue (#3b82f6)
- **Background**: Light Gray (#f3f4f6)
- **Typography**: Bold, uppercase, skewed text

### Best Practices

1. **Consistency**: All assets use the same color palette and design language
2. **Scalability**: Vector-based design scales to any size
3. **Platform Optimization**: Separate assets for iOS and Android requirements
4. **Performance**: Optimized file sizes for fast loading

### Expo Configuration

The assets are configured in `app.json`:
```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#f3f4f6"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#f3f4f6"
      }
    }
  }
}
```

### Testing Assets

1. **iOS Simulator**: Test icon appearance in various contexts
2. **Android Emulator**: Verify adaptive icon behavior
3. **Physical Devices**: Check real-world appearance
4. **App Stores**: Preview in store listings

### Asset Checklist

- [ ] App icon displays correctly on home screen
- [ ] Splash screen shows during app launch
- [ ] Adaptive icon works on Android 8.0+
- [ ] Assets are optimized for file size
- [ ] Colors match app design system
- [ ] Icons are readable at small sizes

### Troubleshooting

**Icon not updating?**
- Clear Expo cache: `expo start -c`
- Rebuild the app completely

**Splash screen issues?**
- Check image dimensions and format
- Verify backgroundColor matches design

**Android adaptive icon problems?**
- Ensure foreground content is within safe area
- Test on different Android launchers