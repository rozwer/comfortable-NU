#!/bin/bash

# ビルドを実行
npm run build:chrome

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
    
    echo "同期が完了しました！"
else
    echo "エラー: 指定されたWindowsフォルダが見つかりません: $WINDOWS_PATH"
    exit 1
fi 