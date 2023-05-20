module.exports = {
  mode: 'production',
  entry: __dirname + "/src/cassava_ui.js",
  output: {
    path: __dirname +'/out/',
    filename: 'cassava_min.js'
  }
};
