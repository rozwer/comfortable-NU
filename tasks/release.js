const archiver = require("archiver");
const fs = require("fs");
const packageJSON = require("../package.json");

if (process.argv.length !== 3) {
    console.error("error: ex) node release chrome");
    process.exit(1);
}
const browser = process.argv[2];
const version = packageJSON.version;

/**
 * -----------------------------------------------------------------
 * Modified by: roz
 * Date       : 2025-05-28
 * Changes    : リリースファイル名をcomfortable-sakaiからcomfortable-NUに変更
 * Category   : リリース設定
 * -----------------------------------------------------------------
 */
const output = fs.createWriteStream(`./dist/release/comfortable-NU-${browser}-v${version}.zip`);
const archive = archiver("zip", {
    zlib: { level: 9 }
});

fs.mkdir("./dist/release", { recursive: true }, (err) => {
    if (err) throw err;
});

archive.pipe(output);

switch (browser) {
    case "chrome":
        /**
         * -----------------------------------------------------------------
         * Modified by: roz
         * Date       : 2025-05-28
         * Changes    : Chromeリリース用ディレクトリ名をcomfortable-sakaiからcomfortable-NUに変更
         * Category   : リリース設定
         * -----------------------------------------------------------------
         */
        archive.directory(`./dist/source/${browser}`, `comfortable-NU-v${version}`);
        break;
    case "firefox":
        archive.directory(`./dist/source/${browser}`, ``);
        break;
    case "edge":
        archive.directory(`./dist/source/${browser}`, `comfortable-NU-v${version}`);
        break;
    case "safari":
        archive.directory(`./dist/source/${browser}`, `comfortable-NU-v${version}`);
        break;
}

archive.finalize();
