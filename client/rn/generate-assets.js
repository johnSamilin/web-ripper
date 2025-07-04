const fs = require('fs');
const path = require('path');

// Generate different sized icons for various platforms
const iconSizes = {
  // iOS sizes
  'ios-20': 20,
  'ios-29': 29,
  'ios-40': 40,
  'ios-58': 58,
  'ios-60': 60,
  'ios-76': 76,
  'ios-80': 80,
  'ios-87': 87,
  'ios-120': 120,
  'ios-152': 152,
  'ios-167': 167,
  'ios-180': 180,
  'ios-1024': 1024,
  
  // Android sizes
  'android-36': 36,
  'android-48': 48,
  'android-72': 72,
  'android-96': 96,
  'android-144': 144,
  'android-192': 192,
  'android-512': 512,
};

// Create a friendly document/web icon generator
function generateIconSVG(size, isAdaptive = false) {
  const scale = size / 1024;
  const strokeWidth = Math.max(1, 16 * scale);
  const iconScale = scale;
  
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="#f3f4f6"/>
  
  <!-- Main icon container -->
  <rect x="${128 * scale}" y="${128 * scale}" width="${768 * scale}" height="${768 * scale}" 
        fill="#000000" stroke="#ef4444" stroke-width="${strokeWidth}"/>
  
  <!-- Inner content -->
  <rect x="${192 * scale}" y="${192 * scale}" width="${640 * scale}" height="${640 * scale}" fill="#ffffff"/>
  
  <!-- Document/Web icon -->
  <g transform="translate(${size/2}, ${400 * scale})">
    <!-- Document outline -->
    <rect x="${-120 * iconScale}" y="${-140 * iconScale}" width="${240 * iconScale}" height="${280 * iconScale}" 
          fill="#000000" stroke="#ef4444" stroke-width="${Math.max(2, 8 * iconScale)}"/>
    <rect x="${-100 * iconScale}" y="${-120 * iconScale}" width="${200 * iconScale}" height="${240 * iconScale}" fill="#ffffff"/>
    
    <!-- Document lines -->
    <rect x="${-80 * iconScale}" y="${-80 * iconScale}" width="${160 * iconScale}" height="${8 * iconScale}" fill="#000000"/>
    <rect x="${-80 * iconScale}" y="${-50 * iconScale}" width="${120 * iconScale}" height="${8 * iconScale}" fill="#000000"/>
    <rect x="${-80 * iconScale}" y="${-20 * iconScale}" width="${140 * iconScale}" height="${8 * iconScale}" fill="#000000"/>
    <rect x="${-80 * iconScale}" y="${10 * iconScale}" width="${100 * iconScale}" height="${8 * iconScale}" fill="#000000"/>
    <rect x="${-80 * iconScale}" y="${40 * iconScale}" width="${130 * iconScale}" height="${8 * iconScale}" fill="#000000"/>
    
    <!-- Web globe -->
    <circle cx="0" cy="${70 * iconScale}" r="${35 * iconScale}" fill="#ef4444" stroke="#000000" stroke-width="${Math.max(1, 4 * iconScale)}"/>
    <circle cx="0" cy="${70 * iconScale}" r="${25 * iconScale}" fill="#ffffff"/>
    
    <!-- Globe lines -->
    <ellipse cx="0" cy="${70 * iconScale}" rx="${25 * iconScale}" ry="${15 * iconScale}" 
             fill="none" stroke="#ef4444" stroke-width="${Math.max(1, 3 * iconScale)}"/>
    <line x1="${-25 * iconScale}" y1="${70 * iconScale}" x2="${25 * iconScale}" y2="${70 * iconScale}" 
          stroke="#ef4444" stroke-width="${Math.max(1, 3 * iconScale)}"/>
    <line x1="0" y1="${45 * iconScale}" x2="0" y2="${95 * iconScale}" 
          stroke="#ef4444" stroke-width="${Math.max(1, 3 * iconScale)}"/>
  </g>
  
  ${!isAdaptive ? `
  <!-- Decorative elements -->
  <rect x="${200 * scale}" y="${200 * scale}" width="${40 * scale}" height="${40 * scale}" 
        fill="#ef4444" transform="rotate(45 ${220 * scale} ${220 * scale})"/>
  <rect x="${784 * scale}" y="${200 * scale}" width="${40 * scale}" height="${40 * scale}" 
        fill="#facc15" transform="rotate(45 ${804 * scale} ${220 * scale})"/>
  <rect x="${200 * scale}" y="${784 * scale}" width="${40 * scale}" height="${40 * scale}" 
        fill="#22c55e" transform="rotate(45 ${220 * scale} ${804 * scale})"/>
  <rect x="${784 * scale}" y="${784 * scale}" width="${40 * scale}" height="${40 * scale}" 
        fill="#3b82f6" transform="rotate(45 ${804 * scale} ${804 * scale})"/>
  ` : ''}
</svg>`;
}

// Generate splash screen SVG
function generateSplashSVG(width = 1284, height = 2778) {
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="#f3f4f6"/>
  
  <!-- Center content -->
  <g transform="translate(${width/2}, ${height/2})">
    <!-- Main logo container -->
    <rect x="-150" y="-150" width="300" height="300" fill="#000000" stroke="#ef4444" stroke-width="8" transform="rotate(12)"/>
    
    <!-- Inner content -->
    <rect x="-120" y="-120" width="240" height="240" fill="#ffffff" transform="rotate(12)"/>
    
    <!-- Document/Web icon -->
    <g transform="rotate(12)">
      <!-- Document -->
      <rect x="-60" y="-70" width="120" height="140" fill="#000000" stroke="#ef4444" stroke-width="3"/>
      <rect x="-50" y="-60" width="100" height="120" fill="#ffffff"/>
      
      <!-- Document lines -->
      <rect x="-40" y="-40" width="80" height="4" fill="#000000"/>
      <rect x="-40" y="-25" width="60" height="4" fill="#000000"/>
      <rect x="-40" y="-10" width="70" height="4" fill="#000000"/>
      <rect x="-40" y="5" width="50" height="4" fill="#000000"/>
      
      <!-- Web globe -->
      <circle cx="0" cy="35" r="18" fill="#ef4444"/>
      <circle cx="0" cy="35" r="12" fill="#ffffff"/>
      
      <!-- Globe lines -->
      <ellipse cx="0" cy="35" rx="12" ry="7" fill="none" stroke="#ef4444" stroke-width="2"/>
      <line x1="-12" y1="35" x2="12" y2="35" stroke="#ef4444" stroke-width="2"/>
      <line x1="0" y1="23" x2="0" y2="47" stroke="#ef4444" stroke-width="2"/>
    </g>
    
    <!-- App title -->
    <text x="0" y="250" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" font-weight="900" fill="#000000" transform="skewX(-5)">WEB RIPPER</text>
    <text x="0" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#dc2626">CONTENT EXTRACTOR</text>
  </g>
  
  <!-- Decorative elements -->
  <rect x="100" y="300" width="30" height="30" fill="#ef4444" transform="rotate(45 115 315)"/>
  <rect x="${width-130}" y="400" width="25" height="25" fill="#facc15" transform="rotate(45 ${width-117.5} 412.5)"/>
  <rect x="150" y="${height-578}" width="35" height="35" fill="#22c55e" transform="rotate(45 167.5 ${height-560.5})"/>
  <rect x="${width-184}" y="${height-678}" width="20" height="20" fill="#3b82f6" transform="rotate(45 ${width-174} ${height-668})"/>
</svg>`;
}

console.log('🎨 Generating React Native assets with friendly design...');

// Create assets directory if it doesn't exist
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Generate main icon (1024x1024)
fs.writeFileSync(path.join(assetsDir, 'icon.svg'), generateIconSVG(1024));

// Generate adaptive icon (1024x1024)
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.svg'), generateIconSVG(1024, true));

// Generate splash screen
fs.writeFileSync(path.join(assetsDir, 'splash.svg'), generateSplashSVG());

// Generate favicon
fs.writeFileSync(path.join(assetsDir, 'favicon.svg'), generateIconSVG(32));

// Generate different sized icons
Object.entries(iconSizes).forEach(([name, size]) => {
  const svg = generateIconSVG(size);
  fs.writeFileSync(path.join(assetsDir, `icon-${name}.svg`), svg);
});

console.log('✅ Friendly assets generated successfully!');
console.log('📁 Generated files:');
console.log('   • icon.svg (main app icon with document/web theme)');
console.log('   • adaptive-icon.svg (Android adaptive icon)');
console.log('   • splash.svg (splash screen with friendly branding)');
console.log('   • favicon.svg (web favicon)');
console.log(`   • ${Object.keys(iconSizes).length} additional icon sizes`);
console.log('\n🎨 Design features:');
console.log('   • Document with web globe icon (represents content extraction)');
console.log('   • Professional and friendly appearance');
console.log('   • Maintains brutal design aesthetic without scary elements');
console.log('   • Updated subtitle: "CONTENT EXTRACTOR" instead of "CONTENT DESTROYER"');