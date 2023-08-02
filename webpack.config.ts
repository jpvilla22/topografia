import * as path from 'path';
import fs from 'fs';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCSSExtractPlugin from 'mini-css-extract-plugin';
import { WebpackConfiguration } from 'webpack-cli';
import Server from 'webpack-dev-server';
import { setup as setupServer } from './src/server/setup';

// Definimos la ruta a la carpeta que contiene tus archivos estáticos
const publicPath = path.resolve(__dirname, 'public');

// Now we need to build the testbench entries (script files) and the pages (URL)
const testbenchDirs = fs
  .readdirSync(path.resolve(__dirname, './testbenches')) // Read files and folders in testbench folder
  .map((dir) => path.resolve(__dirname, './testbenches', dir)) // Get absolute path
  .filter((dir) => fs.lstatSync(dir).isDirectory()); // Filter directories

const testbenchEntries = testbenchDirs.reduce((entries: any, entryDir) => {
  const entryName = path.parse(entryDir).base;
  return {
    ...entries,
    [entryName]: path.resolve(entryDir, './main.ts'),
  };
}, {});

const config: WebpackConfiguration = {
  // aca listamos todos los entry points de las distintas apps que queremos que se compilen
  // por ejemplo cuando se levante el dev server
  entry: {
    app: path.resolve(__dirname, './src/main.ts'),
    ...testbenchEntries,
  },
  mode: 'development',
  /*
    para cada entry point el dev server genera un bundle en el momento
    por ejemplo si la entrada es "app" se genera
    localhost:8080/app.bundle.js
  */
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, './dist'), // esta es la ruta para el build
  },
  devtool: 'source-map',
  plugins: [
    new MiniCSSExtractPlugin(),

    // Esta seccion esta comentada porque no queremos que los .html de src se compilen
    // directamente se toman de /public/

    // Main app (publica el /src/index.html en la ruta localhost:8080/index.html)
    /*
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, './src/index.html'),
      chunks: ['app'],
      minify: true,
    }),
    */

    // Testbenches
    //...testbenchesPages,
  ],
  module: {
    rules: [
      // HTML
      {
        test: /\.(html)$/,
        use: ['html-loader'],
      },

      // JS
      {
        test: /\.js$/,
        exclude: /node_modules|public/,
        use: ['babel-loader'],
      },

      // TS
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: ['ts-loader'],
      },

      // CSS
      {
        test: /\.css$/,
        exclude: /public/, // no queremos que procese los CSS de public
        use: [MiniCSSExtractPlugin.loader, 'css-loader'],
      },

      // Images
      {
        test: /\.(jpg|png|gif|svg)$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/images/[hash][ext]',
        },
      },

      // Fonts
      {
        test: /\.(ttf|eot|woff|woff2)$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/fonts/[hash][ext]',
        },
      },

      // To import any file (e.g. shaders) as text. Remember to update `./src/types/global.d.ts`
      {
        test: /\.(frag|vert|glsl)$/,
        loader: 'raw-loader',
        options: {
          esModule: false,
        },
      },
    ],
  },

  devServer: {
    static: {
      directory: publicPath,
      publicPath: '/',
    },

    // Setup server endpoints
    setupMiddlewares: (middlewares: any, devServer: Server) => {
      setupServer(devServer);
      return middlewares;
    },
  },

  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      fs: false,
    },
  },
};

export default config;
