#!/usr/bin/env node
/**
 * EVE SRP 生产环境部署脚本
 * 
 * 功能:
 * - 构建前端
 * - 启动/重启 PM2 服务
 * 
 * 使用方法: node scripts/deploy.js [options]
 * 
 * 选项:
 *   --build    仅构建前端
 *   --start    启动 PM2 服务
 *   --restart  重启 PM2 服务
 *   --stop     停止 PM2 服务
 *   --logs     查看日志
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');
const CLIENT_DIR = path.join(ROOT_DIR, 'client');
const LOGS_DIR = path.join(ROOT_DIR, 'logs');

const args = process.argv.slice(2);
const command = args[0] || '--help';

function runCommand(cmd, cwd = ROOT_DIR) {
    console.log(`\n> ${cmd}\n`);
    try {
        execSync(cmd, { stdio: 'inherit', cwd });
        return true;
    } catch (error) {
        return false;
    }
}

function ensureLogsDir() {
    if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
        console.log('✓ 已创建日志目录');
    }
}

function buildFrontend() {
    console.log('\n========================================');
    console.log('  构建前端...');
    console.log('========================================');
    
    if (!runCommand('npm run build', CLIENT_DIR)) {
        console.error('✗ 前端构建失败');
        process.exit(1);
    }
    console.log('✓ 前端构建完成');
}

function startServices() {
    console.log('\n========================================');
    console.log('  启动服务...');
    console.log('========================================');
    
    ensureLogsDir();
    
    if (!runCommand('pm2 start ecosystem.config.js --env production')) {
        console.error('✗ 服务启动失败');
        process.exit(1);
    }
    
    runCommand('pm2 save');
    console.log('✓ 服务已启动');
    runCommand('pm2 list');
}

function restartServices() {
    console.log('\n========================================');
    console.log('  重启服务...');
    console.log('========================================');
    
    if (!runCommand('pm2 restart all --env production')) {
        console.error('✗ 服务重启失败');
        process.exit(1);
    }
    console.log('✓ 服务已重启');
    runCommand('pm2 list');
}

function stopServices() {
    console.log('\n========================================');
    console.log('  停止服务...');
    console.log('========================================');
    
    runCommand('pm2 stop all');
    console.log('✓ 服务已停止');
}

function showLogs() {
    console.log('\n========================================');
    console.log('  查看日志 (Ctrl+C 退出)');
    console.log('========================================\n');
    
    const logs = spawn('pm2', ['logs'], { stdio: 'inherit', shell: true });
    logs.on('error', (error) => {
        console.error('无法启动日志查看器:', error.message);
    });
}

function showHelp() {
    console.log(`
EVE SRP 部署脚本

使用方法: node scripts/deploy.js [command]

命令:
  --build     仅构建前端
  --start     启动 PM2 服务
  --restart   重启 PM2 服务
  --stop      停止 PM2 服务
  --logs      查看日志
  --full      完整部署 (构建 + 启动)
  --help      显示帮助

示例:
  node scripts/deploy.js --full     # 完整部署
  node scripts/deploy.js --restart  # 代码更新后重启
  node scripts/deploy.js --logs     # 查看运行日志
`);
}

// 主逻辑
switch (command) {
    case '--build':
        buildFrontend();
        break;
    case '--start':
        startServices();
        break;
    case '--restart':
        restartServices();
        break;
    case '--stop':
        stopServices();
        break;
    case '--logs':
        showLogs();
        break;
    case '--full':
        buildFrontend();
        startServices();
        break;
    case '--help':
    default:
        showHelp();
        break;
}
