const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configure Metro to use port 8081 for React Native
config.server = {
  port: 8081,
};

// Add support for additional file extensions
config.resolver.assetExts.push('db', 'mp3', 'ttf', 'obj', 'png', 'jpg');

// Enable network inspector for debugging
config.resolver.platforms = ['native', 'android', 'ios', 'web'];

module.exports = config;