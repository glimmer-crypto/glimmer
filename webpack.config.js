const path = require('path');

module.exports = {
  entry: path.resolve(__dirname, 'web/lib/webpack-entry.js'),
  output: {
    filename: 'coin-table.min.js',
    path: path.resolve(__dirname, 'web/lib'),
  },
  mode: 'production',
  devtool: 'source-map',
  optimization: {
    usedExports: true
  }
}