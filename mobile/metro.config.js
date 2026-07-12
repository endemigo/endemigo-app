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

// '@endemigo/shared' bir node_modules symlink'i ile çözülür
// (node_modules/@endemigo/shared -> ../../../shared-types). Symlink
// package.json'daki `link-shared` postinstall script'i tarafından kurulur;
// böylece EAS'ta `npm ci` çalıştıktan sonra da mevcut olur. file:../
// bağımlılığı npm ci'yi, babel alias ise production bundle'ı bozduğu için
// symlink yöntemi tercih edildi.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@endemigo/shared': path.resolve(monorepoRoot, 'shared-types'),
};

// Ensure node_modules resolve from mobile/ first
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

module.exports = config;
