const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// firebase's modular SDK ships some .cjs files and relies on package.json
// "exports" resolution in a way Metro's default resolver doesn't handle yet.
config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
