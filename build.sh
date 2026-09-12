#!/bin/bash
# ============================================
#   EasyXShell — 一键构建 Portable App
#   
#   用法：复制下面这行到终端执行
#   curl -fsSL <url>/build.sh | bash
#   
#   或者: bash build.sh
#   
#   特点：
#   - Rust 装在临时目录，构建完自动删除
#   - npm 装在项目目录，构建完自动删除
#   - 只留下一个 EasyXShell.app
# ============================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

WORK_DIR=$(mktemp -d -t easy-xshell)
trap "rm -rf $WORK_DIR" EXIT

clear
echo ""
echo -e "  ${CYAN}⚡ EasyXShell — 一键构建${NC}"
echo "  ============================"
echo ""
echo "  临时目录: $WORK_DIR"
echo ""

# 检查环境
for cmd in brew node; do
  command -v $cmd &>/dev/null || { echo -e "${RED}❌ 需要 $cmd${NC}"; exit 1; }
done
echo -e "${GREEN}✅ 环境检查通过${NC}"

# 安装系统依赖
echo ""
echo -e "${YELLOW}📦 安装编译依赖...${NC}"
brew install openssl libssh2 2>/dev/null

# 下载源码
echo ""
echo -e "${YELLOW}📦 下载源码...${NC}"
cd "$WORK_DIR"
# 这里替换为实际的下载地址
# curl -fsSL https://xxx/easy-xshell.tar.gz | tar xz
# 或者从本地复制
if [ -d "$OLDPWD/easy-xshell" ]; then
  cp -r "$OLDPWD/easy-xshell" src
else
  echo -e "${RED}❌ 未找到源码${NC}"
  exit 1
fi
cd src

# 安装 Rust 到临时目录
echo ""
echo -e "${YELLOW}📦 安装 Rust（临时，构建完自动删除）...${NC}"
export RUSTUP_HOME="$WORK_DIR/.rustup"
export CARGO_HOME="$WORK_DIR/.cargo"
export PATH="$CARGO_HOME/bin:$PATH"
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | \
  sh -s -- -y --default-toolchain stable --profile minimal 2>&1 | tail -2

# 环境变量
export OPENSSL_DIR=$(brew --prefix openssl)
export LIBSSH2_SYS_USE_PKG_CONFIG=1
export PKG_CONFIG_PATH=$(brew --prefix openssl)/lib/pkgconfig

# npm install
echo ""
echo -e "${YELLOW}📦 安装前端依赖...${NC}"
npm install --registry https://registry.npmmirror.com 2>&1 | tail -2

# 构建
echo ""
echo -e "${YELLOW}🔨 构建中（首次约 5 分钟）...${NC}"
echo ""
npm run tauri build

# 提取产物
APP_PATH=$(find src-tauri/target/release/bundle/macos -name "*.app" 2>/dev/null | head -1)
DMG_PATH=$(find src-tauri/target/release/bundle/dmg -name "*.dmg" 2>/dev/null | head -1)

DEST_DIR="$HOME/Desktop/EasyXShell"
mkdir -p "$DEST_DIR"

if [ -n "$APP_PATH" ]; then
  cp -R "$APP_PATH" "$DEST_DIR/"
  echo ""
  echo "  ============================"
  echo -e "  ${GREEN}✅ 构建完成！${NC}"
  echo "  ============================"
  echo ""
  echo -e "  🍎 ${GREEN}$DEST_DIR/EasyXShell.app${NC}"
  echo ""
  echo "  直接双击运行，或拖到 Applications 文件夹"
  open "$DEST_DIR"
fi

if [ -n "$DMG_PATH" ]; then
  cp "$DMG_PATH" "$DEST_DIR/"
  echo -e "  📀 ${GREEN}$DEST_DIR/$(basename $DMG_PATH)${NC}"
fi

echo ""
echo -e "  ${CYAN}临时文件将在脚本退出后自动清理${NC}"
echo ""
