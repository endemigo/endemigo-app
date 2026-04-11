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
            '@endemigo/shared': '../shared-types',
            '@': '.',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
