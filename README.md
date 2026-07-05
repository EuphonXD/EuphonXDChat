# EuphonXD Chat

自托管的隐私优先加密聊天应用。所有聊天室均为私密，不对外公开，支持密码保护和成员邀请机制。

## 功能特性

- 🔒 **完全私密** — 没有公开的聊天室，所有房间对外不可见
- 🛡️ **密码保护** — 创建聊天室时可设置访问密码
- ✉️ **成员邀请** — 只有聊天室成员可以邀请新用户加入
- 🔍 **精准加入** — 知道聊天室名称和密码即可加入
- 👤 **用户系统** — 注册/登录，设置昵称和头像
- 💬 **私聊** — 用户间一对一私密对话
- ⚡ **实时通信** — WebSocket 实时消息推送
- 📜 **消息历史** — 服务器端永久存储所有聊天记录
- 🌙 **暗色主题** — 现代化深色 UI 设计

## 隐私设计原则

本项目的核心设计原则是**隐私优先**：

1. **无公开房间列表** — 你无法浏览或搜索到你不属于的聊天室
2. **无探索功能** — 没有"发现"或"探索"页面
3. **名称 + 密码验证** — 加入房间需要知道精确名称和（可选的）密码
4. **仅成员可邀请** — 只有已加入的成员可以邀请其他人
5. **成员列表隔离** — 非成员无法查看房间的成员列表

## 技术栈

- **后端:** Node.js + Express + Socket.IO + SQLite
- **前端:** React 18 + Vite + Tailwind CSS
- **认证:** JWT + bcrypt
- **数据库:** SQLite (better-sqlite3)
- **部署:** Docker Compose

## 快速开始

### Docker 部署（推荐）

```bash
git clone https://github.com/EuphonXD/EuphonXDChat.git
cd EuphonXDChat
cp .env.example .env  # 修改 JWT_SECRET
docker compose up -d
```

访问 `http://localhost:23777`

### 手动部署

```bash
# 后端
npm install
cd client && npm install && npm run build && cd ..
npm start
```

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `JWT_SECRET` | (内置) | JWT 签名密钥，**生产环境必须修改** |
| `PORT` | 23777 | 服务端口 |

## 使用说明

1. **注册账号** — 打开网页，注册一个新账号
2. **创建聊天室** — 点击"创建"按钮，设置名称、描述和（可选的）密码
3. **邀请成员** — 在聊天室成员列表中搜索并邀请其他用户
4. **加入聊天室** — 点击"加入"按钮，输入聊天室名称和密码
5. **私聊** — 在成员列表中点击"私信"按钮发起一对一聊天

## 项目结构

```
EuphonXDChat/
├── server.js              # 服务端入口
├── src/
│   ├── db.js              # 数据库初始化与辅助函数
│   ├── middleware/
│   │   └── auth.js        # JWT 认证中间件
│   └── routes/
│       ├── auth.js        # 认证路由（注册/登录/资料）
│       ├── rooms.js       # 聊天室路由（创建/加入/邀请/退出）
│       └── messages.js    # 消息路由（房间消息/私聊消息）
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── contexts/      # 认证与 Socket 上下文
│   │   ├── pages/         # 登录页与聊天页
│   │   └── components/    # UI 组件
│   └── vite.config.js
├── Dockerfile
└── docker-compose.yml
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 |
| GET | `/api/auth/me` | 获取当前用户 |
| PUT | `/api/auth/profile` | 更新个人资料 |
| GET | `/api/rooms` | 获取我的聊天室列表 |
| POST | `/api/rooms` | 创建聊天室 |
| POST | `/api/rooms/join` | 通过名称+密码加入 |
| POST | `/api/rooms/:id/invite` | 邀请成员 |
| POST | `/api/rooms/:id/leave` | 退出聊天室 |
| GET | `/api/rooms/:id/members` | 获取成员列表 |

## License

MIT

---

> **AI 声明：** 本项目的代码、文档和设计由 AI 辅助生成。后端架构、前端界面、数据库设计、安全机制等均由 AI（OpenClaw / Claude）协助完成，人工审核与指导。项目经过功能测试和安全审查后部署使用。
