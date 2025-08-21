const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable the new architecture
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;
