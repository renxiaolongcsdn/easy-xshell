# EasyXShell — 轻量级 SSH 客户端 for macOS

基于 **Tauri 2.0 + Rust + React** 构建，安装包仅约 **10MB**。

## ✨ 功能

| 功能 | 说明 |
|------|------|
| 🔑 SSH 连接 | 密码 / 密钥（RSA / ED25519）认证 |
| 🖥 终端模拟 | xterm.js，256色，Unicode，自适应大小 |
| 💾 会话管理 | 保存 / 编辑 / 删除 / 分组 / 搜索 |
| 📑 多标签页 | 同时连接多台服务器，快速切换 |
| 📁 SFTP | 远程文件浏览 / 下载 / 上传 / 删除 / 新建目录 |
| 🎨 暗色主题 | Tokyo Night 配色，长时间使用不伤眼 |

## 🛠 环境要求

- macOS 10.15+
- [Homebrew](https://brew.sh/)
- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install)

## 📦 安装依赖

```bash
# 安装 Rust（如果没有）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 安装 SSH 依赖
brew install openssl libssh2

# 设置环境变量（加到 ~/.zshrc）
export OPENSSL_DIR=$(brew --prefix openssl)
export LIBSSH2_SYS_USE_PKG_CONFIG=1
export PKG_CONFIG_PATH=$(brew --prefix openssl)/lib/pkgconfig

# 安装前端依赖
cd easy-xshell
npm install
```

## 🚀 开发调试

```bash
npm run tauri dev
```

## 📦 构建发布

```bash
npm run tauri build
```

产出物：
```
src-tauri/target/release/bundle/
├── dmg/EasyXShell_1.0.0_aarch64.dmg   ← DMG 安装包
└── macos/EasyXShell.app                ← 直接运行
```

## 📂 项目结构

```
easy-xshell/
├── src-tauri/                   # Rust 后端
│   ├── src/main.rs              # 入口
│   ├── src/lib.rs               # Tauri 配置
│   ├── src/ssh.rs               # SSH 连接（读写线程）
│   ├── src/sftp.rs              # SFTP 文件操作
│   ├── src/session.rs           # 会话持久化
│   ├── src/commands.rs          # Tauri 命令（16个）
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                         # React 前端
│   ├── components/
│   │   ├── Sidebar.tsx          # 会话列表
│   │   ├── TerminalView.tsx     # 终端视图
│   │   ├── TabBar.tsx           # 标签栏
│   │   ├── SessionDialog.tsx    # 新建/编辑会话
│   │   ├── SftpPanel.tsx        # SFTP 文件管理
│   │   └── StatusBar.tsx        # 状态栏
│   ├── store/useStore.ts        # Zustand 状态管理
│   ├── App.tsx / App.css        # 布局 + 样式
│   └── types/index.ts           # 类型定义
├── package.json
└── README.md
```

## 🗂 数据存储

```
~/Library/Application Support/easy-xshell/sessions.json
```

## ⌨️ 使用

1. 点击左侧 **+** 按钮新建会话
2. 填写主机、端口、用户名和认证信息
3. 双击会话或点击 **▶** 连接
4. 底部点击 **📁 SFTP** 打开文件管理
5. 支持多标签同时连接

## 🐛 FAQ

### 找不到 OpenSSL
```bash
export OPENSSL_DIR=$(brew --prefix openssl)
export LIBSSH2_SYS_USE_PKG_CONFIG=1
```

### Apple Silicon 构建
```bash
arch -arm64 brew install openssl libssh2
```

## License

MIT
