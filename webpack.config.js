// Import path for resolving file paths
var path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
module.exports = {
    // Specify the entry point for our app
    entry: {
        "./apihandler": "./handler/apihandler.js",
        // "./firebaseValidator": "./controllers/validator.js"
        "./updateUser": "./controllers/updateUser.js",
    },
    // Let webpack know to generate a Node.js bundle
    target: "node",
    mode: "production",
    // Used to avoid from "Cannot read property 'fromPacket' of undefined" error on lambda.
    optimization: {
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    keep_fnames: true
                }
            })
        ]
    },
    // Specify the output file containing our bundled code
    output: {
        filename: '[name].js',
        path: __dirname + '/dist',
        pathinfo: false,
        libraryTarget: "commonjs"
    },
    module: {
        /**
          * When webpack encounters a 'require()' statement
          * where a JSON file is being imported, it will use
          * the json-loader
          */
        rules: [
            {
                test: /\.txt$/i,
                use: 'raw-loader',
            },
            {
                test: /\.js$/,
                loader: 'babel-loader',
                options: {
                    compact: true,
                    sourceType: "unambiguous",
                    "plugins": [
                        "@babel/plugin-proposal-class-properties"
                    ]
                }
            },
            {
                test: /\.jsx$/,
                loader: 'babel-loader',
                options: {
                    sourceType: "unambiguous",
                    compact: true,
                    "plugins": [
                        "@babel/plugin-proposal-class-properties"
                    ]
                }
            }
        ]
    }
}