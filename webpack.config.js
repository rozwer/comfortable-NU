const path = require("path");
const fs = require("fs");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const webpack = require("webpack");

const MODE = process.env.NODE_ENV || "development";

// Minimal .env loader (avoid extra deps). Parses KEY=VALUE lines.
(() => {
  try {
    const envPath = path.resolve(__dirname, ".env");
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
      for (const line of lines) {
        if (!line || line.trim().startsWith("#")) continue;
        const eq = line.indexOf("=");
        if (eq === -1) continue;
        const key = line.slice(0, eq).trim();
        const val = line.slice(eq + 1).trim();
        if (!(key in process.env)) process.env[key] = val;
      }
    }
  } catch (_) {
    // ignore .env loading errors
  }
})();

// Whitelist env vars for frontend replacement
const ENV_KEYS = [
  "FIREBASE_API_KEY",
  "FIREBASE_AUTH_DOMAIN",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_STORAGE_BUCKET",
  "FIREBASE_MESSAGING_SENDER_ID",
  "FIREBASE_APP_ID",
  "APP_CHECK_SITE_KEY",
  "FUNCTIONS_REGION",
  "WEB_OAUTH_CLIENT_ID",
  "HOSTED_DOMAIN_HINT",
  "MANIFEST_OAUTH_CLIENT_ID",
  "HOSTING_ORIGIN"
];
const defineEnv = {};
for (const k of ENV_KEYS) defineEnv[`process.env.${k}`] = JSON.stringify(process.env[k] || "");

// Validate required env vars on production builds
if (MODE === 'production') {
  const required = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_APP_ID'
  ];
  const missing = [];
  for (const k of required) {
    if (!process.env[k] || String(process.env[k]).trim().length === 0) missing.push(k);
  }
  // At least one OAuth client id must be present
  const hasWebClient = !!(process.env.WEB_OAUTH_CLIENT_ID && process.env.WEB_OAUTH_CLIENT_ID.trim());
  const hasManifestClient = !!(process.env.MANIFEST_OAUTH_CLIENT_ID && process.env.MANIFEST_OAUTH_CLIENT_ID.trim());
  if (!hasWebClient && !hasManifestClient) {
    missing.push('WEB_OAUTH_CLIENT_ID or MANIFEST_OAUTH_CLIENT_ID');
  }
  if (missing.length > 0) {
    const hint = [
      'Ensure .env is present at repo root and includes values for the above keys.',
      'Example keys are documented in .env.example.',
      'Note: Values are bundled at build time; re-run the build after editing .env.'
    ].join('\n');
    throw new Error(`Missing required environment variables:\n- ${missing.join('\n- ')}\n\n${hint}`);
  }
}

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
        // Prefer TSX first to ensure TS sources override same-named JS files
        extensions: [".tsx", ".ts", ".js"]
    },
    plugins: [
        new CleanWebpackPlugin(),
        new CopyPlugin({
            patterns: [
                { from: "./public", to: "./" },
                { from: "./_locales", to: "./_locales" }
            ]
        }),
        new webpack.DefinePlugin(defineEnv)
    ]
};

if (MODE === "production") {
    module.exports.optimization = {
        minimize: true,
        minimizer: [new TerserPlugin()]
    };
}
