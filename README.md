# EVE Online 军团综合管理系统

一个为 EVE Online 军团设计的综合管理平台。提供军团公开展示页面、成员服务系统等功能，帮助军团更高效地运营管理。

## 当前功能模块

### 🏠 军团门户首页
- 军团介绍与联系方式展示
- 从 zKillboard 实时获取军团高价值击杀记录
- 战绩统计面板
- 响应式设计，适配各种设备

### 💰 SRP 补损系统
玩家端：
- 使用 EVE Online 官方 SSO 登录，自动验证军团成员身份
- 自动从 zKillboard 获取最近的损失记录
- 一键提交补损申请，支持添加备注说明
- 查看个人申请历史和审核状态
- 个人补损统计（累计补损金额、批准次数等）

管理端：
- 独立的管理员认证系统
- 查看所有补损申请，支持状态筛选
- 批准或拒绝申请，可设置补损金额并添加审核备注
- 编辑已处理的申请（修改状态、金额、备注）
- 补损支出统计仪表盘（总支出、TOP 玩家排行）
- 超级管理员可管理其他管理员账号

### 🔮 规划中的功能
- PAP 积分系统
- 军团资产管理
- 成员管理与权限系统
- 更多...

## 技术特性

### 安全
- EVE SSO OAuth 2.0 认证
- JWT Token 身份验证
- API 请求速率限制（通用限制 + 登录限制 + 业务限制）
- Helmet 安全头保护
- CORS 跨域保护
- 密码强度验证
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

### 后端
- **Node.js 18+** - 运行时环境
- **Express 5** - Web 框架
- **better-sqlite3** - SQLite 数据库
- **jsonwebtoken** - JWT 认证
- **bcryptjs** - 密码加密
- **helmet** - 安全中间件

## 项目结构

```
EVE-SRP/
├── client/                 # 前端代码
│   ├── src/
│   │   ├── App.jsx        # 主应用组件（路由、SRP系统页面）
│   │   ├── pages/         # 页面组件
│   │   │   └── Home.jsx   # 军团门户首页
│   │   ├── components/    # 可复用组件
│   │   │   └── home/      # 首页组件
│   │   ├── contexts/      # React 上下文
│   │   ├── i18n/          # 国际化
│   │   ├── locales/       # 语言文件
│   │   └── utils/         # 工具函数
│   ├── public/            # 静态资源
│   └── package.json
├── server/                 # 后端代码
│   ├── index.js           # API 服务器
│   ├── database.js        # 数据库模块
│   ├── env.example        # 环境变量示例
│   └── package.json
├── scripts/               # 脚本工具
│   ├── setup.js           # 初始化脚本
│   └── deploy.js          # 部署脚本
├── logs/                  # 日志目录 (运行时生成)
├── ecosystem.config.js    # PM2 部署配置
├── nginx.conf.example     # Nginx 配置示例
└── package.json           # 根目录包管理
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
cd server
npm install
cp env.example .env
# 编辑 .env 文件，填入配置
```

**关键配置项:**

| 配置项 | 说明 |
|--------|------|
| `CLIENT_ID` | EVE 应用 Client ID |
| `SECRET_KEY` | EVE 应用 Secret Key |
| `JWT_SECRET` | JWT 签名密钥 (32位以上随机字符串) |
| `TARGET_CORP_ID` | 军团 ID |
| `CORP_NAME` | 军团名称 |
| `CORP_TICKER` | 军团简称 |
| `CALLBACK_URL` | SSO 回调地址 |
| `SUPER_ADMIN_USERNAME` | 超级管理员用户名 |
| `SUPER_ADMIN_PASSWORD` | 超级管理员密码 |

**生成 JWT 密钥:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. 前端配置

```bash
cd client
npm install
```

前端会自动从后端 `/api/config` 接口获取配置，无需手动配置。

### 5. 启动开发环境

```bash
# 在项目根目录
npm install
npm run dev
```

访问 http://localhost:5173

### 6. 管理员登录

使用 `.env` 文件中配置的管理员账号密码登录 `/admin`。

## 生产环境部署

### PM2 部署 (推荐)

```bash
# 安装依赖
npm install -g pm2 serve

# 一键部署（构建 + 启动）
npm run deploy
```

**常用命令:**
```bash
npm run deploy:build    # 仅构建前端
npm run deploy:start    # 启动服务
npm run deploy:restart  # 重启服务
npm run logs            # 查看日志
npm run stop            # 停止服务
```

### Nginx 反向代理

```bash
# 构建前端
npm run build

# 只启动后端 API
npm run start:api
```

参考 `nginx.conf.example` 配置 Nginx。

## 页面路由

| 路径 | 说明 |
|------|------|
| `/` | 军团门户首页 |
| `/srp` | SRP 登录页 |
| `/auth/callback` | EVE SSO 回调 |
| `/dashboard` | SRP 申请面板 |
| `/my-requests` | 我的补损申请 |
| `/admin` | 管理员后台 |

## API 概览

### 公开接口
- `GET /api/config` - 获取公开配置
- `POST /api/auth/eve` - EVE SSO 登录

### SRP 用户接口
- `GET /api/losses/:charId` - 获取角色损失记录
- `POST /api/srp` - 提交补损申请
- `GET /api/srp/my/:charId` - 获取个人申请列表
- `GET /api/srp/stats/:charId` - 获取个人补损统计

### 管理员接口
- `POST /api/admin/login` - 管理员登录
- `GET /api/admin/requests` - 获取所有申请
- `POST /api/admin/review` - 审核申请
- `PUT /api/admin/request/:id` - 编辑申请
- `GET /api/admin/payout-stats` - 补损支出统计
- `GET/POST/DELETE /api/admin/admins` - 管理员管理

## 常见问题

### Q: 登录时提示"非本军团成员"？
A: 检查 `.env` 中的 `TARGET_CORP_ID` 是否正确，并确认登录角色属于该军团。

### Q: 如何查询军团 ID？
A: 访问 [EVE Who](https://evewho.com/)，搜索军团名称，URL 中的数字即为军团 ID。

### Q: 如何重置管理员密码？
A: 超级管理员密码修改 `.env` 后重启服务；普通管理员由超级管理员删除后重新创建。

### Q: 如何备份数据？
A: 备份 `server/srp_data.db` 文件即可。

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
