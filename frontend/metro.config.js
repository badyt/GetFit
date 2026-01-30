const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Workaround for packages that ship ESM with `import.meta`.
// Forces Metro to resolve CommonJS entrypoints instead of `exports`.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
