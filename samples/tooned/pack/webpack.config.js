module.exports = {
  mode: 'production',
  entry: __dirname + "/src/tooned.js",
  output: {
    path: __dirname +'/out/',
    filename: 'tooned_min.js'
  }
};
