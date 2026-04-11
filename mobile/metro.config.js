const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// shared-types is outside mobile/ — tell Metro to watch it
config.watchFolders = [
  ...(config.watchFolders || []),
  path.resolve(monorepoRoot, 'shared-types'),
];

// Resolve @endemigo/shared to the shared-types directory
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@endemigo/shared': path.resolve(monorepoRoot, 'shared-types'),
};

// Ensure node_modules resolve from mobile/ first
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

module.exports = config;
