module.exports = {
  mode: 'production',
  entry: __dirname + "/src/cassava_menu.js",
  output: {
    path: __dirname +'/out/',
    filename: 'cassava_min.js'
  }
};
