// PM2 生态系统配置文件
// 使用命令：pm2 start ecosystem.config.js

module.exports = {
  apps: [{
    name: 'eve-srp-api',
    script: 'index.js',
    cwd: 'C:\\Users\\user\\EVE\\EVE-SRP\\server',
    exec_mode: 'fork',  // 使用 fork 模式
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    // 日志配置
    error_file: '../logs/pm2-error.log',
    out_file: '../logs/pm2-out.log',
    log_file: '../logs/pm2-combined.log',
    time: true
  }]
};
