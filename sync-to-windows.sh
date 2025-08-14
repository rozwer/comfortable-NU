#!/bin/bash
# Windows環境への拡張機能同期スクリプト
# - Chrome向けビルドを実行し、Windows側フォルダへ成果物を同期します
# - ローカル検証は dist/source/chrome をそのまま読み込むのが最短です

set -euo pipefail

# 設定（必要に応じて変更）
WINDOWS_PATH="/mnt/c/Users/rozwe/デスクトップ/拡張機能"
RELEASE_PATH="/mnt/c/Users/rozwe/デスクトップ/拡張機能リリース用"

echo "[1/4] Chrome向けビルドを開始します..."
npm run build:chrome

# バージョンを取得（release ZIP名に使用）
VERSION=$(node -p "require('./package.json').version")
ZIP_NAME="comfortable-NU-chrome-v${VERSION}.zip"

echo "[2/4] 同期先の存在を確認: $WINDOWS_PATH"
if [ ! -d "$WINDOWS_PATH" ]; then
  echo "エラー: 指定されたWindowsフォルダが見つかりません: $WINDOWS_PATH" >&2
  exit 1
fi

echo "[3/4] 旧ファイルを削除し、ソース成果物を同期します..."
rm -rf "$WINDOWS_PATH"/*
cp -r dist/source/chrome/* "$WINDOWS_PATH/"

echo "[4/4] リリースZIPを同期します..."
if [ -f "dist/release/${ZIP_NAME}" ]; then
  cp "dist/release/${ZIP_NAME}" "$WINDOWS_PATH/" || true
  if [ -d "$RELEASE_PATH" ]; then
    cp "dist/release/${ZIP_NAME}" "$RELEASE_PATH/" || true
  else
    echo "注意: リリース用フォルダが見つかりません: $RELEASE_PATH"
  fi
else
  echo "注意: リリースZIPが見つかりませんでした: dist/release/${ZIP_NAME}"
fi

echo "同期が完了しました！ → $WINDOWS_PATH"
