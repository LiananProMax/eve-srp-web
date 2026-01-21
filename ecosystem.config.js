/**
 * PM2 生态系统配置文件
 * 
 * 使用方法:
 *   开发环境: pm2 start ecosystem.config.js --env development
 *   生产环境: pm2 start ecosystem.config.js --env production
 * 
 * 常用命令:
 *   pm2 start ecosystem.config.js    - 启动所有应用
 *   pm2 stop all                     - 停止所有应用
 *   pm2 restart all                  - 重启所有应用
 *   pm2 logs                         - 查看日志
 *   pm2 monit                        - 监控面板
 *   pm2 save                         - 保存当前进程列表
 *   pm2 startup                      - 设置开机自启
 */

const path = require('path');

// 获取项目根目录（支持跨平台）
const ROOT_DIR = __dirname;
const SERVER_DIR = path.join(ROOT_DIR, 'server');
const CLIENT_DIR = path.join(ROOT_DIR, 'client');
const LOGS_DIR = path.join(ROOT_DIR, 'logs');

module.exports = {
  apps: [
    // ============================================
    // 后端 API 服务器
    // ============================================
    {
      name: 'eve-srp-api',
      script: 'index.js',
      cwd: SERVER_DIR,
      
      // 运行模式
      exec_mode: 'fork',      // 单进程模式，适合 SQLite
      instances: 1,           // 实例数量
      
      // 自动重启配置
      autorestart: true,
      watch: false,           // 生产环境关闭文件监听
      max_memory_restart: '500M',
      
      // 重启策略
      exp_backoff_restart_delay: 100,  // 指数退避重启延迟
      max_restarts: 10,                // 最大重启次数
      min_uptime: '10s',               // 最小运行时间
      
      // 生产环境变量
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      
      // 开发环境变量
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      
      // 日志配置
      error_file: path.join(LOGS_DIR, 'api-error.log'),
      out_file: path.join(LOGS_DIR, 'api-out.log'),
      log_file: path.join(LOGS_DIR, 'api-combined.log'),
      time: true,                    // 日志添加时间戳
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,              // 合并集群模式日志
      
      // 优雅关闭
      kill_timeout: 5000,            // 等待5秒后强制关闭
      listen_timeout: 8000,          // 监听超时
      shutdown_with_message: true,   // 发送关闭消息
    },
    
    // ============================================
    // 前端静态文件服务器 (生产环境)
    // 需要先运行: cd client && npm run build
    // 使用 serve 包提供静态文件服务
    // ============================================
    {
      name: 'eve-srp-web',
      script: 'npx',
      args: 'serve -s dist -l 5173',
      cwd: CLIENT_DIR,
      
      // 运行模式
      exec_mode: 'fork',
      instances: 1,
      
      // 自动重启配置
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      
      // 环境变量
      env_production: {
        NODE_ENV: 'production',
      },
      
      env_development: {
        NODE_ENV: 'development',
      },
      
      // 日志配置
      error_file: path.join(LOGS_DIR, 'web-error.log'),
      out_file: path.join(LOGS_DIR, 'web-out.log'),
      log_file: path.join(LOGS_DIR, 'web-combined.log'),
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // 优雅关闭
      kill_timeout: 3000,
    },
  ],
  
  // ============================================
  // 部署配置 (可选，用于远程部署)
  // ============================================
  deploy: {
    production: {
      // SSH 用户
      user: 'deploy',
      // 目标服务器
      host: ['your-server.com'],
      // Git 分支
      ref: 'origin/main',
      // Git 仓库
      repo: 'git@github.com:your-username/EVE-SRP.git',
      // 部署路径
      path: '/var/www/eve-srp',
      // 部署前执行的命令
      'pre-deploy-local': '',
      // 部署后执行的命令
      'post-deploy': 'npm install && cd client && npm install && npm run build && cd .. && pm2 reload ecosystem.config.js --env production',
      // 环境变量
      env: {
        NODE_ENV: 'production',
      },
    },
  },
};
