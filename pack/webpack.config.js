const AsukazePlugin = require('./asukaze_plugin.js');
const path = require('path');

const now = new Date();
const date = `${now.getFullYear()}${now.getMonth() + 1}${now.getDate()}`;
const finalFileName = `cassava_min_${date}.js`;

module.exports = {
  mode: 'production',
  entry: path.resolve(__dirname, '../cassava_menu.js'),
  module: {
    rules: [{
      test: /.js$/,
      loader: path.resolve(__dirname, 'asukaze_loader.js'),
    }],
  },
  plugins: [new AsukazePlugin({
    decl: {
      module: 'cassava_grid',
      output: `cassava_min_${date}.d.ts`,
      strip: 'cassava_macro.js',
    },
    extraJs: ['sample_macros.js', 'test_macros.js'],
    strict: false
  })],
  output: {
    path: path.resolve(__dirname, 'out/'),
    filename: finalFileName
  }
};
