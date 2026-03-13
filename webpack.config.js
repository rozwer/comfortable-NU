const path = require("path");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

const MODE = process.env.NODE_ENV || "development"

module.exports = {
    mode: MODE,
    devtool: "inline-source-map",
    entry: {
        background: `${__dirname}/src/background.ts`,
        content_script: `${__dirname}/src/content_script.ts`,
        subsakai: `${__dirname}/src/subsakai.tsx`
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/
            }
        ]
    },
    output: {
        path: path.join(__dirname, "dist"),
        filename: "[name].js"
    },
    resolve: {
        extensions: [".ts", ".js", ".tsx"]
    },
    performance: {
        // ブラウザ拡張機能ではコードスプリッティングが不要なためサイズ警告を無効化
        hints: false
    },
    plugins: [
        new CleanWebpackPlugin(),
        new CopyPlugin({
            patterns: [
                { from: "./public", to: "./" },
                { from: "./_locales", to: "./_locales" }
            ]
        })
    ]
};

if (MODE === "production") {
    module.exports.optimization = {
        minimize: true,
        minimizer: [new TerserPlugin()]
    };
}