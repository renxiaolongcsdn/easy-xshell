#!/bin/bash
# ============================================
#   EasyXShell — macOS 洁净构建脚本
#   
#   特点：
#   - Rust 装在项目目录内（.toolchain/），不装到系统
#   - 构建完可一键清理所有工具链
#   - 只装 brew 的 openssl/libssh2（系统级最小依赖）
# ============================================

set -e
cd "$(dirname "$0")"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

clear
echo ""
echo -e "  ${CYAN}⚡ EasyXShell — 洁净构建${NC}"
echo "  ============================"
echo ""

# ===== 1. 检查 Node =====
if ! command -v node &>/dev/null; then
  echo -e "${RED}❌ 需要 Node.js${NC}"
  echo "   安装方式（不污染系统）："
  echo "   brew install node"
  echo "   或者下载: https://nodejs.org/"
  exit 1
fi
echo -e "${GREEN}✅ Node $(node -v)${NC}"

# ===== 2. 检查/安装 Rust（项目内） =====
TOOLCHAIN_DIR="$(pwd)/.toolchain"
export RUSTUP_HOME="$TOOLCHAIN_DIR/rustup"
export CARGO_HOME="$TOOLCHAIN_DIR/cargo"
export PATH="$CARGO_HOME/bin:$PATH"

if [ ! -f "$CARGO_HOME/bin/rustc" ]; then
  echo ""
  echo -e "${YELLOW}📦 安装 Rust 到项目目录（不污染系统）...${NC}"
  echo "   位置: $TOOLCHAIN_DIR/"
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | \
    sh -s -- -y --default-toolchain stable --profile minimal 2>&1 | tail -3
  echo -e "${GREEN}✅ Rust 已安装到 .toolchain/${NC}"
else
  echo -e "${GREEN}✅ Rust $(rustc --version)${NC}"
fi

# ===== 3. 安装系统依赖（brew） =====
echo ""
echo -e "${YELLOW}📦 安装编译依赖（openssl/libssh2）...${NC}"
if ! command -v brew &>/dev/null; then
  echo -e "${RED}❌ 需要 Homebrew${NC}"
  echo "   安装: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
  exit 1
fi
brew install openssl libssh2 2>/dev/null
echo -e "${GREEN}✅ 编译依赖就绪${NC}"

# ===== 4. 环境变量 =====
export OPENSSL_DIR=$(brew --prefix openssl)
export LIBSSH2_SYS_USE_PKG_CONFIG=1
export PKG_CONFIG_PATH=$(brew --prefix openssl)/lib/pkgconfig

# ===== 5. npm install =====
echo ""
echo -e "${YELLOW}📦 安装前端依赖...${NC}"
npm install --registry https://registry.npmmirror.com 2>&1 | tail -3
echo -e "${GREEN}✅ 前端依赖完成${NC}"

# ===== 6. 构建 =====
echo ""
echo -e "${YELLOW}🔨 构建中（首次约 3-5 分钟）...${NC}"
echo ""
npm run tauri build

# ===== 7. 输出结果 =====
echo ""
echo "  ============================"
echo -e "  ${GREEN}✅ 构建完成！${NC}"
echo "  ============================"

DMG=$(find src-tauri/target/release/bundle/dmg -name "*.dmg" 2>/dev/null | head -1)
APP=$(find src-tauri/target/release/bundle/macos -name "*.app" 2>/dev/null | head -1)

if [ -n "$DMG" ]; then
  echo -e "  📀 ${GREEN}$DMG${NC}"
  open "$DMG"
elif [ -n "$APP" ]; then
  echo -e "  🍎 ${GREEN}$APP${NC}"
  open "$APP"
fi

echo ""
echo -e "  ${CYAN}💡 构建完成后可运行「清理工具链.command」释放空间${NC}"
echo ""
read -p "  按回车退出..."
