# EVE Online SRP 军团补损系统

一个为 EVE Online 军团设计的 **Ship Replacement Program (SRP)** 补损管理系统。支持军团成员通过 EVE SSO 登录，提交损失记录申请补损，管理员审核处理申请。系统还提供军团公开展示页面，展示军团信息和战绩统计。

## 功能特性

### 公开首页
- 军团介绍与联系方式展示
- 从 zKillboard 获取并展示军团高价值击杀记录
- 战绩统计面板
- 响应式设计，适配各种设备

### 玩家端
- 使用 EVE Online 官方 SSO 登录，自动验证军团成员身份
- 自动从 zKillboard 获取最近的损失记录
- 一键提交补损申请，支持添加备注说明
- 查看个人申请历史和审核状态
- 个人补损统计（累计补损金额、批准次数等）

### 管理员端
- 独立的管理员认证系统
- 查看所有补损申请，支持状态筛选
- 批准或拒绝申请，可设置补损金额并添加审核备注
- 编辑已处理的申请（修改状态、金额、备注）
- 补损支出统计仪表盘（总支出、TOP 玩家排行）
- 超级管理员可管理其他管理员账号

### 安全特性
- EVE SSO OAuth 2.0 认证
- JWT Token 身份验证
- API 请求速率限制（通用限制 + 登录限制 + SRP 提交限制）
- Helmet 安全头保护
- CORS 跨域保护
- 密码强度验证（大小写、数字、特殊字符）
- 输入数据验证

### 国际化
- 支持中文和英文界面
- 可扩展的多语言架构

## 技术栈

### 前端
- **React 19** - 用户界面框架
- **Vite 7** - 构建工具
- **Ant Design 6** - UI 组件库
- **Tailwind CSS 3** - 原子化 CSS 框架
- **React Router 7** - 路由管理
- **Axios** - HTTP 客户端
- **Day.js** - 日期处理

### 后端
- **Node.js 18+** - 运行时环境
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
│   │   ├── App.jsx        # 主应用组件（路由、SRP系统页面）
│   │   ├── pages/
│   │   │   └── Home.jsx   # 公开首页
│   │   ├── components/
│   │   │   └── home/      # 首页组件（导航、英雄区、战绩卡片等）
│   │   ├── contexts/
│   │   │   └── ConfigContext.jsx  # 配置上下文
│   │   ├── i18n/
│   │   │   └── LanguageContext.jsx  # 多语言上下文
│   │   ├── locales/       # 语言文件
│   │   │   ├── en.js
│   │   │   └── zh.js
│   │   └── utils/         # 工具函数
│   ├── public/            # 静态资源
│   ├── package.json
│   └── vite.config.js
├── server/                 # 后端代码
│   ├── index.js           # API 服务器
│   ├── database.js        # 数据库模块
│   ├── env.example        # 环境变量示例
│   └── package.json
├── scripts/
│   ├── setup.js           # 初始化脚本
│   └── deploy.js          # 部署脚本
├── logs/                   # 日志目录 (运行时生成)
├── ecosystem.config.js     # PM2 部署配置
├── nginx.conf.example      # Nginx 配置示例
├── package.json           # 根目录包管理
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
| `JWT_SECRET` | JWT 签名密钥 (32位以上) | 使用命令生成（见下方） |
| `TARGET_CORP_ID` | 军团 ID | `98802528` |
| `CORP_NAME` | 军团名称 | `The Zephyr Brigade` |
| `CORP_TICKER` | 军团简称 | `T-ZB` |
| `CALLBACK_URL` | SSO 回调地址 | `http://localhost:5173/auth/callback` |
| `SUPER_ADMIN_USERNAME` | 超级管理员用户名 | `admin` |
| `SUPER_ADMIN_PASSWORD` | 超级管理员密码 | `YourSecurePassword123!` |

**生成 JWT 密钥:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. 前端配置

```bash
# 进入前端目录
cd client

# 安装依赖
npm install
```

前端会自动从后端 `/api/config` 接口获取配置，无需手动配置。

### 5. 启动开发环境

**方式一：使用根目录命令（推荐）**
```bash
# 在项目根目录
npm install
npm run dev
```

**方式二：分别启动**
```bash
# 启动后端 (终端1)
cd server
npm run dev

# 启动前端 (终端2)
cd client
npm run dev
```

访问 http://localhost:5173 即可使用系统。

### 6. 管理员登录

使用 `.env` 文件中配置的 `SUPER_ADMIN_USERNAME` 和 `SUPER_ADMIN_PASSWORD` 登录管理后台 `/admin`。

> 注意：超级管理员密码只能通过修改 `.env` 文件来更改，无法通过网页修改。

## 生产环境部署

### 方式一: PM2 部署 (推荐)

#### 1. 安装 PM2 和 serve

```bash
npm install -g pm2 serve
```

#### 2. 一键部署

```bash
# 完整部署（构建前端 + 启动服务）
npm run deploy

# 或使用部署脚本
node scripts/deploy.js --full
```

#### 3. 常用部署命令

```bash
npm run deploy:build    # 仅构建前端
npm run deploy:start    # 启动服务
npm run deploy:restart  # 重启服务
npm run logs            # 查看日志
npm run stop            # 停止服务
```

#### 4. PM2 常用命令

```bash
pm2 list              # 查看进程列表
pm2 logs              # 查看日志
pm2 logs eve-srp-api  # 查看指定服务日志
pm2 monit             # 监控面板
pm2 restart all       # 重启所有服务
pm2 stop all          # 停止所有服务
pm2 delete all        # 删除所有服务
pm2 save              # 保存进程列表
pm2 startup           # 设置开机自启
```

### 方式二: Nginx 反向代理 (生产推荐)

#### 1. 构建前端

```bash
npm run build
```

#### 2. 只启动后端 API

```bash
npm run start:api
```

#### 3. 配置 Nginx

参考 `nginx.conf.example` 或使用以下配置：

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
| GET | `/api/config` | 获取公开配置（EVE Client ID、军团信息等） |
| POST | `/api/auth/eve` | EVE SSO 登录认证 |

### 用户接口 (需要用户 Token)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/losses/:charId` | 获取角色损失记录 |
| POST | `/api/srp` | 提交补损申请 |
| GET | `/api/srp/my/:charId` | 获取个人申请列表 |
| GET | `/api/srp/stats/:charId` | 获取个人补损统计 |

### 管理员接口 (需要管理员 Token)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin/login` | 管理员登录 |
| GET | `/api/admin/requests` | 获取所有申请（支持状态筛选） |
| POST | `/api/admin/review` | 审核申请（批准/拒绝） |
| GET | `/api/admin/request/:id` | 获取申请详情 |
| PUT | `/api/admin/request/:id` | 编辑申请（修改状态、金额、备注） |
| GET | `/api/admin/stats` | 获取申请统计 |
| GET | `/api/admin/payout-stats` | 获取补损支出统计 |

### 超级管理员接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/admins` | 获取管理员列表 |
| POST | `/api/admin/admins` | 添加管理员 |
| DELETE | `/api/admin/admins/:id` | 删除管理员 |
| POST | `/api/admin/change-password` | 修改密码（仅限普通管理员） |

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
| payout_amount | REAL | 补损金额 |
| admin_comment | TEXT | 管理员备注 |
| reviewed_by | TEXT | 审核人 |
| reviewed_at | DATETIME | 审核时间 |
| created_at | DATETIME | 创建时间 |

## 页面路由

| 路径 | 说明 |
|------|------|
| `/` | 公开首页（军团展示、战绩统计） |
| `/srp` | SRP 登录页 |
| `/auth/callback` | EVE SSO 回调处理 |
| `/dashboard` | 用户面板（申请补损） |
| `/my-requests` | 我的申请记录 |
| `/admin` | 管理员后台 |

## 常见问题

### Q: 登录时提示"非本军团成员"？
A: 系统会验证登录角色是否属于配置的目标军团。请确认:
1. `.env` 中的 `TARGET_CORP_ID` 设置正确
2. 登录角色确实属于该军团

### Q: 如何查询军团 ID？
A: 访问 [EVE Who](https://evewho.com/)，搜索军团名称，URL 中的数字即为军团 ID。

### Q: 如何重置管理员密码？
A: 
- **超级管理员**: 修改 `.env` 文件中的 `SUPER_ADMIN_PASSWORD`，然后重启服务
- **普通管理员**: 由超级管理员删除该管理员账号后重新创建

### Q: 如何备份数据？
A: 备份 `server/srp_data.db` 文件即可，这是 SQLite 数据库文件。

### Q: 首页战绩不显示？
A: 
1. 检查网络是否能访问 zKillboard 和 ESI API
2. 确认军团 ID 配置正确
3. 查看浏览器控制台是否有错误信息

### Q: 生产环境如何配置？
A: 
1. 设置 `NODE_ENV=production`
2. 配置强密码的 `JWT_SECRET`
3. 使用 HTTPS
4. 配置正确的 `CALLBACK_URL` 和 `ALLOWED_ORIGINS`
5. 设置 `ALLOW_ALL_LOCALHOST=false`

## 开发指南

### 添加新的 API 端点

1. 在 `server/index.js` 中添加路由
2. 使用 `authenticateUser` 或 `authenticateAdmin` 中间件保护路由
3. 使用 `express-validator` 验证输入

### 添加新的前端页面

1. 在 `client/src/pages/` 中创建页面组件
2. 在 `client/src/App.jsx` 的路由中添加新路由
3. 使用 `userApi` 或 `adminApi` 实例发起 API 请求

### 添加新的语言

1. 在 `client/src/locales/` 中创建新的语言文件
2. 在 `client/src/i18n/LanguageContext.jsx` 中导入并注册

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
