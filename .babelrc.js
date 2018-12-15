const presets = [
  [
    '@babel/env',
    {
      targets: {
        edge: '17',
        firefox: '63',
        chrome: '69',
        safari: '12',
      },
      useBuiltIns: 'usage',
    },
  ],
];

const plugins = [
  '@babel/plugin-transform-object-assign',
  '@babel/plugin-transform-template-literals',
];

const ignore = [
  'dist/**',
];

module.exports = { presets, plugins, ignore };