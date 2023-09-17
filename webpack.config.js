const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
    mode: "production",
    entry: "./bundle.ts",
    devtool: "source-map",
    target: "node",
    // node: {
    //     process: false
    // },
    output: {
        path: __dirname + "/bundle",
        filename: "index.js",
        library: "@ayonli/jsext",
        libraryTarget: "umd",
        globalObject: "this",
    },
    resolve: {
        extensions: [".ts", ".js"]
    },
    module: {
        rules: [
            {
                test: /\.ts?$/,
                loader: "ts-loader",
                options: {
                    configFile: __dirname + "/tsconfig.json"
                }
            }
        ]
    },
    optimization: {
        minimizer: [
            new TerserPlugin({
                parallel: true,
                terserOptions: {
                    keep_classnames: true,
                    keep_fnames: true,
                },
            }),
        ],
    },
};
