module.exports = {
  mode: 'production',
  entry: __dirname + "/src/cassava_grid.js",
  output: {
    path: __dirname +'/out/',
    filename: 'cassava_min.js'
  }
};
