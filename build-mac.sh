#!/bin/bash
set -e

echo "========================================="
echo "  EasyXShell — macOS 一键构建脚本"
echo "========================================="

# 检查依赖
check() {
  command -v "$1" >/dev/null 2>&1 || { echo "❌ 未找到 $1，请先安装"; exit 1; }
}

check brew
check node
check cargo

echo ""
echo "📦 安装系统依赖..."
brew install openssl libssh2 2>/dev/null || true

echo ""
echo "📦 设置环境变量..."
export OPENSSL_DIR=$(brew --prefix openssl)
export LIBSSH2_SYS_USE_PKG_CONFIG=1
export PKG_CONFIG_PATH=$(brew --prefix openssl)/lib/pkgconfig

echo ""
echo "📦 安装前端依赖..."
npm install

echo ""
echo "🔨 开始构建..."
npm run tauri build

echo ""
echo "========================================="
echo "  ✅ 构建完成！"
echo "========================================="
echo ""
echo "产出物："
DMG=$(find src-tauri/target/release/bundle/dmg -name "*.dmg" 2>/dev/null | head -1)
APP=$(find src-tauri/target/release/bundle/macos -name "*.app" 2>/dev/null | head -1)
[ -n "$DMG" ] && echo "  📀 DMG: $DMG"
[ -n "$APP" ] && echo "  🍎 APP: $APP"
echo ""
