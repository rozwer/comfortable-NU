const commonConfig = require("../webpack.config.js");
const CopyPlugin = require("copy-webpack-plugin");
const MergeManifestPlugin = require("./manifest-webpack-plugin");
const path = require("path");

const specificConfig = Object.assign({}, commonConfig);

specificConfig.output = {
    path: path.resolve(__dirname, "..") + "/dist/source/edge"
};

specificConfig.plugins.push(
    new CopyPlugin({
        patterns: [{ from: "./manifest.json" }]
    }),
    new MergeManifestPlugin({
        browser: "edge"
    })
);

module.exports = specificConfig;
