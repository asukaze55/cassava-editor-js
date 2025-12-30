const AsukazePlugin = require('../../pack/asukaze_plugin.js');
const path = require('path');

const now = new Date();
const date = `${now.getFullYear()}${now.getMonth() + 1}${now.getDate()}`;
const finalFileName = `cms_${date}.js`;

module.exports = {
  mode: 'production',
  entry: path.resolve(__dirname, 'cms.js'),
  plugins: [new AsukazePlugin()],
  output: {
    path: path.resolve(__dirname, 'out/'),
    filename: finalFileName
  }
};
