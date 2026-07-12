module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            // '@endemigo/shared' Metro extraNodeModules ile çözülür
            // (metro.config.js); babel'de göreli yola çevirmek expo-router
            // require.context altında prod bundle'ı kırıyor.
            '@': '.',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
