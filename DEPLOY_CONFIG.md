# EVE SRP 生产环境部署指南

## 已完成的自动化步骤

- [x] 前端代码已修改，支持自动切换开发/生产环境
- [x] 前端已构建到 `client/dist` 目录
- [x] PM2 已安装并启动后端服务
- [x] 创建了 `Caddyfile` 模板和 `ecosystem.config.js`

---

## 你需要手动完成的步骤

### 步骤 1：配置后端环境变量

编辑 `server/.env` 文件，添加/修改以下配置：

```env
NODE_ENV=production
PORT=3001

# EVE SSO 配置（从 https://developers.eveonline.com/ 获取）
CLIENT_ID=你的EVE应用ClientID
SECRET_KEY=你的EVE应用SecretKey
CALLBACK_URL=https://你的域名/auth/callback

# 军团ID
TARGET_CORP_ID=98802528

# JWT 密钥（已为你生成，可直接使用）
JWT_SECRET=da7f62f602a7025fc7999dbf7d52cb35999cbb6baa9d10b84916c47abe591a8556de6dc3a06c8934cd2b6f31f815c3cdc371c9e95bd87bff1778cd6afcffe05b

# 前端地址（用于 CORS）
FRONTEND_URL=https://你的域名
```

### 步骤 2：配置 DNS 和路由器

1. 将域名 A 记录指向你家的公网 IP
2. 在路由器中设置端口转发：
   - 80 端口 -> 服务器内网IP:80
   - 443 端口 -> 服务器内网IP:443

### 步骤 3：安装和配置 Caddy

1. 下载 Caddy：https://caddyserver.com/download（选择 Windows amd64）
2. 创建目录 `C:\Caddy`，将 `caddy.exe` 放入
3. 编辑项目根目录的 `Caddyfile`，将 `your-domain.com` 替换为你的实际域名
4. 复制 `Caddyfile` 到 `C:\Caddy\Caddyfile`
5. 创建 `C:\Caddy\logs` 目录
6. 以管理员身份运行 PowerShell：

```powershell
# 测试配置
cd C:\Caddy
.\caddy.exe run --config Caddyfile

# 确认无误后，注册为 Windows 服务
sc.exe create caddy start= auto binPath= "C:\Caddy\caddy.exe run --config C:\Caddy\Caddyfile"
sc.exe start caddy
```

### 步骤 4：更新 EVE 开发者门户

1. 访问 https://developers.eveonline.com/
2. 找到你的应用，修改 Callback URL 为：`https://你的域名/auth/callback`

### 步骤 5：重启后端服务

```powershell
pm2 restart eve-srp-api
pm2 save
```

---

## 常用命令

```powershell
# 查看后端状态
pm2 status

# 查看后端日志
pm2 logs eve-srp-api

# 重启后端
pm2 restart eve-srp-api

# 重新构建前端
cd client && npm run build

# 重启 Caddy
sc.exe stop caddy && sc.exe start caddy
```

---

## 验证部署

1. 访问 `https://你的域名` 确认前端正常加载
2. 检查浏览器显示 HTTPS 锁图标
3. 尝试 EVE SSO 登录
4. 访问 `https://你的域名/admin` 管理员登录
