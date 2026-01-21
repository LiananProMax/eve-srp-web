# EVE Online SRP 军团补损系统

一个为 EVE Online 军团设计的 **Ship Replacement Program (SRP)** 补损管理系统。支持军团成员通过 EVE SSO 登录，提交损失记录申请补损，管理员审核处理申请。

## 功能特性

### 玩家端
- 使用 EVE Online 官方 SSO 登录，自动验证军团成员身份
- 自动从 zKillboard 获取最近的损失记录
- 一键提交补损申请，支持添加备注说明
- 查看个人申请历史和审核状态

### 管理员端
- 独立的管理员认证系统
- 查看所有补损申请，支持状态筛选
- 批准或拒绝申请，可添加审核备注
- 申请数据统计仪表盘
- 超级管理员可管理其他管理员账号

### 安全特性
- EVE SSO OAuth 2.0 认证
- JWT Token 身份验证
- API 请求速率限制
- Helmet 安全头保护
- CORS 跨域保护
- 密码强度验证
- 输入数据验证

## 技术栈

### 前端
- **React 19** - 用户界面框架
- **Vite 7** - 构建工具
- **Ant Design 6** - UI 组件库
- **React Router 7** - 路由管理
- **Axios** - HTTP 客户端

### 后端
- **Node.js** - 运行时环境
- **Express 5** - Web 框架
- **better-sqlite3** - SQLite 数据库
- **jsonwebtoken** - JWT 认证
- **bcryptjs** - 密码加密
- **helmet** - 安全中间件
- **express-rate-limit** - 速率限制
- **express-validator** - 请求验证

## 项目结构

```
EVE-SRP/
├── client/                 # 前端代码
│   ├── src/
│   │   ├── App.jsx        # 主应用组件
│   │   ├── App.css        # 样式文件
│   │   └── main.jsx       # 入口文件
│   ├── public/            # 静态资源
│   ├── package.json
│   └── vite.config.js
├── server/                 # 后端代码
│   ├── index.js           # API 服务器
│   ├── database.js        # 数据库模块
│   ├── env.example        # 环境变量示例
│   └── package.json
├── logs/                   # 日志目录 (运行时生成)
├── ecosystem.config.js     # PM2 部署配置
├── .gitignore
└── README.md
```

## 快速开始

### 环境要求

- Node.js 18.x 或更高版本
- npm 9.x 或更高版本
- PM2 (用于生产环境部署)

### 1. 克隆项目

```bash
git clone https://github.com/your-username/EVE-SRP.git
cd EVE-SRP
```

### 2. 配置 EVE 开发者应用

1. 访问 [EVE Developers](https://developers.eveonline.com/)
2. 创建新应用或使用现有应用
3. 设置回调 URL:
   - 开发环境: `http://localhost:5173/auth/callback`
   - 生产环境: `https://your-domain.com/auth/callback`
4. 记录 Client ID 和 Secret Key

### 3. 后端配置

```bash
# 进入后端目录
cd server

# 安装依赖
npm install

# 复制环境变量配置文件
cp env.example .env

# 编辑 .env 文件，填入配置
```

**关键配置项说明:**

| 配置项 | 说明 | 示例值 |
|--------|------|--------|
| `PORT` | 服务器端口 | `3001` |
| `CLIENT_ID` | EVE 应用 Client ID | `abc123...` |
| `SECRET_KEY` | EVE 应用 Secret Key | `xyz789...` |
| `JWT_SECRET` | JWT 签名密钥 (32位以上) | 使用 `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` 生成 |
| `TARGET_CORP_ID` | 军团 ID | `98802528` |
| `CALLBACK_URL` | SSO 回调地址 | `http://localhost:5173/auth/callback` |
| `FRONTEND_URL` | 前端访问地址 | `http://localhost:5173` |

### 4. 前端配置

```bash
# 进入前端目录
cd client

# 安装依赖
npm install
```

如需修改 EVE Client ID，编辑 `src/App.jsx` 中的 `EVE_CLIENT_ID` 常量。

### 5. 启动开发环境

**启动后端:**
```bash
cd server
npm run dev
```

**启动前端 (新终端窗口):**
```bash
cd client
npm run dev
```

访问 http://localhost:5173 即可使用系统。

### 6. 首次登录

系统首次启动时会自动创建默认超级管理员账号，密码会在控制台输出（只显示一次）：

```
============================================================
⚠️  首次启动 - 已创建默认超级管理员账号
============================================================
   用户名: admin
   密码: [随机生成的强密码]
============================================================
⚠️  请立即登录并修改密码！此密码只显示一次！
============================================================
```

请保存此密码并尽快登录修改。

## 生产环境部署

### 方式一: PM2 部署 (推荐)

#### 1. 安装 PM2 和 serve

```bash
npm install -g pm2 serve
```

#### 2. 构建前端

```bash
cd client
npm run build
```

#### 3. 创建日志目录

```bash
mkdir -p logs
```

#### 4. 启动服务

```bash
# 生产环境启动
pm2 start ecosystem.config.js --env production

# 保存进程列表
pm2 save

# 设置开机自启
pm2 startup
```

#### 5. 常用 PM2 命令

```bash
pm2 list              # 查看进程列表
pm2 logs              # 查看日志
pm2 logs eve-srp-api  # 查看指定服务日志
pm2 monit             # 监控面板
pm2 restart all       # 重启所有服务
pm2 stop all          # 停止所有服务
pm2 delete all        # 删除所有服务
```

### 方式二: Nginx 反向代理 (生产推荐)

#### 1. 构建前端

```bash
cd client
npm run build
```

#### 2. 只启动后端 API

```bash
pm2 start ecosystem.config.js --only eve-srp-api --env production
```

#### 3. 配置 Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/EVE-SRP/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 4. 配置 HTTPS (推荐)

使用 Let's Encrypt 免费证书:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## API 文档

### 公开接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/eve` | EVE SSO 登录认证 |

### 用户接口 (需要用户 Token)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/losses/:charId` | 获取角色损失记录 |
| POST | `/api/srp` | 提交补损申请 |
| GET | `/api/srp/my/:charId` | 获取个人申请列表 |

### 管理员接口 (需要管理员 Token)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin/login` | 管理员登录 |
| GET | `/api/admin/requests` | 获取所有申请 |
| POST | `/api/admin/review` | 审核申请 |
| GET | `/api/admin/request/:id` | 获取申请详情 |
| GET | `/api/admin/stats` | 获取统计信息 |

### 超级管理员接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/admins` | 获取管理员列表 |
| POST | `/api/admin/admins` | 添加管理员 |
| DELETE | `/api/admin/admins/:id` | 删除管理员 |
| POST | `/api/admin/change-password` | 修改密码 |

## 数据库结构

### admins 表 (管理员)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| username | TEXT | 用户名 (唯一) |
| password_hash | TEXT | 密码哈希 |
| role | TEXT | 角色 (admin/super_admin) |
| created_at | DATETIME | 创建时间 |

### srp_requests 表 (补损申请)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| char_id | INTEGER | 角色 ID |
| char_name | TEXT | 角色名称 |
| killmail_id | INTEGER | 击杀邮件 ID (唯一) |
| ship_type_id | INTEGER | 船只类型 ID |
| zkill_url | TEXT | zKillboard 链接 |
| player_comment | TEXT | 玩家备注 |
| status | TEXT | 状态 (pending/approved/rejected) |
| admin_comment | TEXT | 管理员备注 |
| reviewed_by | TEXT | 审核人 |
| reviewed_at | DATETIME | 审核时间 |
| created_at | DATETIME | 创建时间 |

## 常见问题

### Q: 登录时提示"非本军团成员"？
A: 系统会验证登录角色是否属于配置的目标军团。请确认:
1. `.env` 中的 `TARGET_CORP_ID` 设置正确
2. 登录角色确实属于该军团

### Q: 如何查询军团 ID？
A: 访问 [EVE Who](https://evewho.com/)，搜索军团名称，URL 中的数字即为军团 ID。

### Q: 忘记管理员密码怎么办？
A: 删除 `server/srp_data.db` 数据库文件，重启服务会自动创建新的默认管理员账号。注意：这会清空所有数据。

### Q: 如何备份数据？
A: 备份 `server/srp_data.db` 文件即可，这是 SQLite 数据库文件。

### Q: 生产环境如何配置？
A: 
1. 设置 `NODE_ENV=production`
2. 配置强密码的 `JWT_SECRET`
3. 使用 HTTPS
4. 配置正确的 `FRONTEND_URL` 和 `CALLBACK_URL`

## 开发指南

### 添加新的 API 端点

1. 在 `server/index.js` 中添加路由
2. 使用 `authenticateUser` 或 `authenticateAdmin` 中间件保护路由
3. 使用 `express-validator` 验证输入

### 添加新的前端页面

1. 在 `client/src/App.jsx` 中添加组件
2. 在 `BrowserRouter` 中添加路由
3. 使用 `userApi` 或 `adminApi` 实例发起 API 请求

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
