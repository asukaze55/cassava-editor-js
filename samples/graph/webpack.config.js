const AsukazePlugin = require('../../pack/asukaze_plugin.js');
const path = require('path');

const now = new Date();
const date = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
const finalFileName = `graph_${date}.js`;

module.exports = {
  mode: 'production',
  entry: path.resolve(__dirname, 'graph.js'),
  plugins: [new AsukazePlugin()],
  output: {
    path: path.resolve(__dirname, 'out/'),
    filename: finalFileName
  }
};
