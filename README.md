# OpenClaw 可视化控制面板

一个功能完整的 OpenClaw 管理面板，提供 Web 界面用于 OpenClaw 的安装、配置、监控和用量统计。

## 功能特性

- 🚀 **一键安装 OpenClaw**：自动检测环境、下载、安装依赖、配置、启动
- ⚙️ **配置管理**：修改 gateway URL、API tokens、频道设置、模型配置
- 📊 **用量统计**：实时显示 tokens 使用情况（按会话、模型、时间范围）
- 📋 **会话管理**：查看活跃会话、历史记录、强制结束
- 🔍 **系统监控**：OpenClaw 状态、日志查看、服务控制
- 🔌 **插件管理**：安装/卸载 OpenClaw 插件

## 技术栈

- **前端**：Vue 3 + Vite + Element Plus + ECharts
- **后端**：Node.js + Express + SQLite
- **部署**：Docker Compose

## 快速开始

### 使用 Docker Compose（推荐）

```bash
git clone https://github.com/你的用户名/openclaw-webpanel
cd openclaw-webpanel
docker-compose up -d
```

访问 http://localhost:3000

### 手动安装

```bash
# 安装后端依赖
cd backend
npm install
npm start

# 安装前端依赖
cd ../frontend
npm install
npm run dev
```

## 配置说明

首次运行后，在面板中：
1. 设置 OpenClaw Gateway 地址（默认 ws://127.0.0.1:18789）
2. 配置 Admin Token（从 openclaw.json 获取）
3. 点击"安装 OpenClaw"或连接到已有实例

## 项目结构

```
openclaw-webpanel/
├── frontend/          # Vue 3 前端应用
├── backend/           # Node.js 后端 API
├── docker-compose.yml # Docker 部署配置
├── docker/
│   ├── backend/
│   └── frontend/
└── docs/              # 文档
```

## 安全说明

- 建议在生产环境使用 HTTPS
- 设置强密码保护面板访问
- 定期更新依赖

## License

MIT