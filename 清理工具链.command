#!/bin/bash
# ============================================
#   EasyXShell — 清理工具链
#   
#   删除构建时安装的 Rust 工具链和 npm 依赖
#   释放约 2-3GB 空间
#   不影响最终的 .app / .dmg 产物
# ============================================

set -e
cd "$(dirname "$0")"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

clear
echo ""
echo -e "  ${CYAN}🧹 EasyXShell — 清理工具链${NC}"
echo "  ============================"
echo ""

# 计算大小
calc_size() {
  if [ -d "$1" ]; then
    du -sh "$1" 2>/dev/null | cut -f1
  else
    echo "0B"
  fi
}

TOOLCHAIN_SIZE=$(calc_size ".toolchain")
NODE_MODULES_SIZE=$(calc_size "node_modules")
TARGET_SIZE=$(calc_size "src-tauri/target")

echo "  将要清理："
echo "  ├── .toolchain/     (Rust 工具链)    $TOOLCHAIN_SIZE"
echo "  ├── node_modules/   (前端依赖)       $NODE_MODULES_SIZE"
echo "  └── src-tauri/target/(编译缓存)      $TARGET_SIZE"
echo ""
echo -e "  ${YELLOW}⚠ 不会删除：源码、dist/、.app、.dmg${NC}"
echo ""

read -p "  确认清理？(y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "  已取消"
  exit 0
fi

echo ""
rm -rf .toolchain && echo -e "  ${GREEN}✅ .toolchain/${NC}"
rm -rf node_modules && echo -e "  ${GREEN}✅ node_modules/${NC}"
rm -rf src-tauri/target && echo -e "  ${GREEN}✅ src-tauri/target/${NC}"

echo ""
echo "  ============================"
echo -e "  ${GREEN}✅ 清理完成！${NC}"
echo "  ============================"
echo ""
echo "  产物仍在："
ls -lh src-tauri/target/release/bundle/dmg/*.dmg 2>/dev/null || echo "  （无 DMG）"
ls -d src-tauri/target/release/bundle/macos/*.app 2>/dev/null || echo "  （无 APP）"
echo ""
echo "  如需重新构建，运行「一键构建.command」即可"
echo ""
read -p "  按回车退出..."
