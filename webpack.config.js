const ESBuildWebpackPlugin = require('./esbuild-webpack-plugin/index').default;
const HtmlWebpackPlugin = require('html-webpack-plugin');
module.exports = {
  "mode": "production",
  entry: {
    'app': './src/index.js'
  },
  module: {
    rules: [
      {
        test: /\.svg$/,
        use: ['@svgr/webpack', 'url-loader'],
        type: 'javascript/auto'
      }
    ]
  },
  optimization: {
    minimize: true,
    minimizer: [
      new ESBuildWebpackPlugin({})
    ],
    runtimeChunk: {
      name: entrypoint => `runtime~${entrypoint.name}`
    }
    
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: './index.html'
    })
  ]
}