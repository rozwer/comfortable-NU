#!/bin/bash
# Windows環境への拡張機能同期スクリプト
# Linux開発環境からWindows環境への拡張機能同期自動化
#!/bin/bash
# Windows環境への拡張機能同期スクリプト
# ビルド後の拡張機能をWindows側のフォルダに同期

# ビルドを実行
npm run build:chrome

# TypeScript background script build
npx tsc src/background.ts --outDir . --target es2020 --module commonjs --lib es2020,dom

# Windowsのフォルダパス
WINDOWS_PATH="/mnt/c/Users/rozwe/デスクトップ/拡張機能"

# 同期先のフォルダが存在することを確認
if [ -d "$WINDOWS_PATH" ]; then
    echo "指定されたWindowsフォルダが見つかりました: $WINDOWS_PATH"
    
    # 古いファイルを削除
    echo "古いファイルを削除中..."
    rm -rf "$WINDOWS_PATH"/*
    
    # 新しいファイルをコピー
    echo "新しいファイルをコピー中..."
    cp -r dist/source/chrome/* "$WINDOWS_PATH/"
    
    # ZIPファイルもコピー
    echo "リリース用ZIPファイルをコピー中..."
    cp dist/release/comfortable-sakai-chrome-v2.0.1.zip "$WINDOWS_PATH/"

    # comfortable-NU-chrome-v1.0.2.zipもリリース用フォルダにコピー
    RELEASE_PATH="/mnt/c/Users/rozwe/デスクトップ/拡張機能リリース用"
    if [ -d "$RELEASE_PATH" ]; then
        echo "comfortable-NU-chrome-v1.0.3.zipをリリース用フォルダにコピー中..."
        cp dist/release/comfortable-NU-chrome-v1.0.3.zip "$RELEASE_PATH/"
    else
        echo "エラー: リリース用フォルダが見つかりません: $RELEASE_PATH"
    fi
    
    echo "同期が完了しました！"
else
    echo "エラー: 指定されたWindowsフォルダが見つかりません: $WINDOWS_PATH"
    exit 1
fi