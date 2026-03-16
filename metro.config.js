const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure .web.ts / .web.tsx platform extensions are resolved before .ts / .tsx
// Metro already handles this by default for Expo web, but making it explicit.
config.resolver.platforms = ['web', 'android', 'ios', 'native'];

module.exports = config;
