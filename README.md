# Hermes Provider Switcher

<p align="center">
  <img src="public/icon.png" width="120" alt="Hermes Provider Switcher Logo">
</p>

<p align="center">
  <b>一键切换 Hermes Agent 的 AI Provider</b>
</p>

<p align="center">
  <a href="#功能特性">功能</a> •
  <a href="#安装">安装</a> •
  <a href="#使用方法">使用</a> •
  <a href="#支持的-provider">Provider</a> •
  <a href="#开发">开发</a>
</p>

---

## 简介

**Hermes Provider Switcher** 是一个为 [Hermes Agent](https://github.com/snail/hermes) 打造的桌面配置工具。它让你可以：

- 预配置多个 AI Provider（OpenAI、Anthropic、Gemini、DeepSeek 等）
- 通过点击按钮快速切换当前使用的 Provider
- 管理 API Key，无需每次手动编辑配置文件
- 测试连接确保配置正确

当你当前 Provider 的 token 用完时，只需打开此应用，点击另一个 Provider 的「激活」按钮，下次启动 Hermes 时就会自动使用新的配置。

## 功能特性

- **14+ 内置 Provider 模板** — 一键从模板创建，自动填入 API 地址和推荐模型
- **一键切换** — 选择 Provider 点击激活，立即写入 Hermes 配置
- **双击快速激活** — 双击列表中的 Provider 直接切换
- **连接测试** — 实时测试 API 连接是否正常
- **API Key 管理** — 显示/隐藏/复制 API Key，安全便捷
- **配置持久化** — 所有配置保存在 `~/.hermes/config.yaml` 中
- **跨平台** — 支持 macOS、Windows、Linux

## 支持的 Provider

| Provider | 类型 | 说明 |
|---------|------|------|
| OpenAI | 官方 | GPT-4o、GPT-4 系列 |
| Anthropic | 官方 | Claude Sonnet、Opus 系列 |
| Google Gemini | 官方 | Gemini 2.5 Pro/Flash |
| DeepSeek | 官方 | DeepSeek-V3、R1 |
| SiliconFlow | 聚合 | 多种模型统一接口 |
| OpenRouter | 聚合 | 统一路由多平台模型 |
| Moonshot (Kimi) | 官方 | 月之暗面 |
| 智谱 AI (GLM) | 官方 | GLM-4 系列 |
| 通义千问 | 官方 | 阿里云 Qwen |
| 百度千帆 | 官方 | 文心一言 |
| xAI (Grok) | 官方 | Grok 系列 |
| Azure OpenAI | 官方 | 微软 Azure |
| Ollama | 本地 | 本地模型部署 |
| LM Studio | 本地 | 本地模型管理 |

## 安装

### 下载预构建版本

前往 [Releases](https://github.com/snail/hermes-provider-switcher/releases) 页面下载对应平台的安装包：

- **macOS**: `Hermes-Provider-Switcher_1.0.0_x64.dmg` (Intel) 或 `_aarch64.dmg` (Apple Silicon)
- **Windows**: `Hermes-Provider-Switcher_1.0.0_x64-setup.exe`
- **Linux**: `Hermes-Provider-Switcher_1.0.0_amd64.AppImage` 或 `.deb`

### 从源码构建

**前置要求：**
- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) 1.70+
- macOS/Linux 需要 Xcode/Clang 或 GCC

```bash
# 克隆仓库
git clone https://github.com/snail/hermes-provider-switcher.git
cd hermes-provider-switcher

# 安装依赖
npm install

# 开发模式运行
npm run tauri dev

# 构建生产版本
npm run tauri build
```

构建完成后，安装包位于 `src-tauri/target/release/bundle/` 目录。

## 使用方法

### 首次使用

1. 打开 Hermes Provider Switcher
2. 点击「模板」按钮，选择一个 Provider 模板（如 OpenAI）
3. 填入你的 API Key
4. 点击「保存」
5. 点击「激活」将该 Provider 设为当前配置

### 切换 Provider

1. 在列表中点击选择要使用的 Provider
2. 点击「激活」按钮
3. 或**双击**列表中的 Provider 直接激活

### 添加自定义 Provider

1. 点击「添加」按钮
2. 填写名称、API 地址、API Key
3. 可选填写模型名称和 API 模式
4. 点击「保存」

### 测试连接

点击 Provider 列表右侧的「测试连接」按钮（信号图标），验证 API 配置是否正确。

## 配置说明

应用直接读写 Hermes 的配置文件 `~/.hermes/config.yaml`：

```yaml
model:
  provider: custom
  base_url: https://api.openai.com/v1
  api_key: sk-...
  default: gpt-4o
  api_mode: openai
custom_providers:
  - name: openai
    base_url: https://api.openai.com/v1
    api_key: sk-...
    model: gpt-4o
    api_mode: openai
  - name: deepseek
    base_url: https://api.deepseek.com
    api_key: sk-...
    model: deepseek-chat
```

**注意：** 配置修改后，需要**重新启动 Hermes 会话**才能生效。

## 开发

### 技术栈

- **前端**: React 19 + TypeScript + Tailwind CSS
- **桌面框架**: Tauri 2 (Rust)
- **构建工具**: Vite

### 项目结构

```
hermes-provider-switcher/
├── src/                    # 前端代码
│   ├── App.tsx            # 主应用组件
│   ├── main.tsx           # 入口
│   └── styles.css         # 样式
├── src-tauri/             # Rust 后端
│   ├── src/
│   │   └── lib.rs         # 核心逻辑
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
└── README.md
```

### 添加新的 Provider 模板

编辑 `src-tauri/src/lib.rs` 中的 `get_provider_templates` 函数，添加新的 Provider 信息：

```rust
ProviderTemplate {
    name: "my-provider".to_string(),
    display_name: "My Provider".to_string(),
    base_url: "https://api.my-provider.com/v1".to_string(),
    default_model: "model-name".to_string(),
    description: "描述".to_string(),
    api_mode: Some("openai".to_string()),
}
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License © 2025 snail
