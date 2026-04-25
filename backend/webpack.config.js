module.exports = (config) => {
  config.watchOptions = {
    ...(config.watchOptions || {}),
    ignored: [
      '**/node_modules/**',
      '**/dist/**',
      '**/test/**',
      '**/coverage/**',
      '**/uploads/**',
      '**/.git/**',
      '**/.planning/**',
      '**/*.log',
    ],
  };

  return config;
};
