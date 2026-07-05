# WebChat

自托管加密聊天应用，支持聊天室和私聊功能。

## 功能特性

- 🔐 **用户系统** — 注册/登录，设置昵称和头像
- 💬 **聊天室** — 创建、加入、退出聊天室
- 🔒 **私聊** — 用户间一对一私密对话
- 📜 **消息历史** — 服务器端永久存储所有聊天记录
- 🔒 **加密传输** — WebSocket over HTTPS，JWT 认证
- ⚡ **实时通信** — Socket.IO 实时消息推送
- 📱 **响应式设计** — 支持桌面和移动端

## 技术栈

- **后端:** Node.js + Express + Socket.IO + SQLite
- **前端:** React 18 + Vite + Tailwind CSS
- **认证:** JWT + bcrypt
- **数据库:** SQLite (better-sqlite3)

## 快速开始

### Docker 部署 (推荐)

```bash
git clone https://github.com/EuphonXD/webchat.git
cd webchat
docker compose up -d
```

访问 `http://localhost:3001`

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
| `JWT_SECRET` | (内置) | JWT 签名密钥，生产环境请修改 |
| `PORT` | 3001 | 服务端口 |

## 使用说明

1. 打开网页，注册一个账号
2. 加入已有聊天室，或创建新聊天室
3. 在聊天室中发送消息
4. 点击成员列表中的用户可发起私聊
5. 在个人设置中修改昵称和头像

## 项目结构

```
webchat/
├── server.js           # 服务端入口
├── src/
│   ├── db.js           # 数据库初始化
│   ├── middleware/
│   │   └── auth.js     # JWT 认证中间件
│   └── routes/
│       ├── auth.js     # 认证路由
│       ├── rooms.js    # 聊天室路由
│       └── messages.js # 消息路由
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── contexts/   # Auth & Socket contexts
│   │   ├── pages/      # Login & Chat pages
│   │   └── components/ # UI 组件
│   └── vite.config.js
├── Dockerfile
└── docker-compose.yml
```

## License

MIT
