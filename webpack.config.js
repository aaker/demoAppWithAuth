const HtmlWebpackPlugin = require('html-webpack-plugin');
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const path = require('path');

module.exports = (_env, argv) => ({
  mode: argv.mode || 'development',
  entry: './src/App.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    publicPath: argv.mode === 'production' ? 'auto' : 'http://localhost:5007/',
    filename: argv.mode === 'production' ? '[name].[contenthash].js' : '[name].js',
    chunkFilename: argv.mode === 'production' ? '[id].[contenthash].js' : '[id].js',
    clean: true,
  },
  resolve: { extensions: ['.tsx', '.ts', '.js', '.jsx'] },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              ['@babel/preset-react', { runtime: 'automatic' }],
              '@babel/preset-typescript',
            ],
          },
        },
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'demoAppWithAuth',
      filename: 'remoteEntry.js',
      exposes: { './App': './src/App' },
      shared: {
        react: { singleton: true, requiredVersion: '^19.2.0', eager: false },
        'react-dom': { singleton: true, requiredVersion: '^19.2.0', eager: false },
        loglevel: { singleton: true, requiredVersion: '^1.9.2', eager: false },
        '@netsapiens/horizon-sdk': { singleton: true, requiredVersion: '^1.0.0', eager: false },
      },
    }),
    new HtmlWebpackPlugin({ template: './index.html' }),
  ],
  devServer: { port: 5007, headers: { 'Access-Control-Allow-Origin': '*' } },
});
