module.exports = {
  mode: 'production',
  entry: __dirname + "/cms.js",
  output: {
    path: __dirname +'/out/',
    filename: 'cms_min.js'
  }
};
